<?php

declare(strict_types=1);

namespace Caasify\Core\Pricing;

use Caasify\Core\Config\DashboardSettings;
use Caasify\Repositories\CaasifySettingsRepository;
use Caasify\Repositories\WhmcsCurrencyRepository;

final class ClientPricingService
{
    public function __construct(
        private readonly CaasifySettingsRepository $settingsRepository = new CaasifySettingsRepository(),
        private readonly WhmcsCurrencyRepository $currencies = new WhmcsCurrencyRepository()
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function getAdminPricingSettings(): array
    {
        $settings = $this->settingsRepository->getSettings();

        return DashboardSettings::normalizePricingSettings(
            is_array($settings['pricingSettings'] ?? null) ? $settings['pricingSettings'] : [],
            $this->currencies->getCurrencies()
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function buildClientPricingContext(int $clientId): array
    {
        $pricingSettings = $this->getAdminPricingSettings();
        $clientCurrency = $this->currencies->findClientCurrencyByClientId($clientId);
        $commissionPercent = (float) ($pricingSettings['commissionPercent'] ?? 0.0);
        $defaultDisplayCurrency = $this->buildEuroCurrencyMetadata();

        if ($clientCurrency === null) {
            return $this->createContext(
                null,
                $defaultDisplayCurrency,
                null,
                $commissionPercent,
                'raw_eur_fallback',
                true,
                'missing_client_currency'
            );
        }

        $clientCurrencyMeta = $this->normalizeCurrencyMetadata($clientCurrency);
        $clientCode = strtoupper((string) ($clientCurrencyMeta['code'] ?? ''));

        if ($clientCode === 'EUR') {
            return $this->createContext(
                $clientCurrencyMeta,
                $clientCurrencyMeta,
                1.0,
                $commissionPercent,
                'converted',
                false,
                null
            );
        }

        $configuredCurrency = $pricingSettings['currencies'][(string) ($clientCurrencyMeta['id'] ?? '')] ?? null;
        $isEnabled = is_array($configuredCurrency) && ($configuredCurrency['enabled'] ?? false) === true;
        $eurRate = is_array($configuredCurrency) && is_numeric($configuredCurrency['eurRate'] ?? null)
            ? (float) $configuredCurrency['eurRate']
            : null;

        if ($isEnabled && $eurRate !== null && $eurRate > 0) {
            return $this->createContext(
                $clientCurrencyMeta,
                $clientCurrencyMeta,
                $eurRate,
                $commissionPercent,
                'converted',
                false,
                null
            );
        }

        return $this->createContext(
            $clientCurrencyMeta,
            $defaultDisplayCurrency,
            null,
            $commissionPercent,
            'raw_eur_fallback',
            true,
            !$isEnabled ? 'currency_disabled' : 'missing_eur_rate'
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function buildPublicPricingContext(): array
    {
        $pricingSettings = $this->getAdminPricingSettings();
        $defaultCurrency = $this->currencies->findDefaultCurrency();
        $commissionPercent = (float) ($pricingSettings['commissionPercent'] ?? 0.0);
        $defaultDisplayCurrency = $this->buildEuroCurrencyMetadata();

        if ($defaultCurrency === null) {
            return $this->createContext(
                null,
                $defaultDisplayCurrency,
                1.0,
                $commissionPercent,
                'converted',
                false,
                'missing_default_currency'
            );
        }

        $defaultCurrencyMeta = $this->normalizeCurrencyMetadata($defaultCurrency);
        $defaultCode = strtoupper((string) ($defaultCurrencyMeta['code'] ?? ''));

        if ($defaultCode === 'EUR') {
            return $this->createContext(
                $defaultCurrencyMeta,
                $defaultCurrencyMeta,
                1.0,
                $commissionPercent,
                'converted',
                false,
                null
            );
        }

        $configuredCurrency = $pricingSettings['currencies'][(string) ($defaultCurrencyMeta['id'] ?? '')] ?? null;
        $isEnabled = is_array($configuredCurrency) && ($configuredCurrency['enabled'] ?? false) === true;
        $eurRate = is_array($configuredCurrency) && is_numeric($configuredCurrency['eurRate'] ?? null)
            ? (float) $configuredCurrency['eurRate']
            : null;

        if ($isEnabled && $eurRate !== null && $eurRate > 0) {
            return $this->createContext(
                $defaultCurrencyMeta,
                $defaultCurrencyMeta,
                $eurRate,
                $commissionPercent,
                'converted',
                false,
                null
            );
        }

        return $this->createContext(
            $defaultCurrencyMeta,
            $defaultDisplayCurrency,
            1.0,
            $commissionPercent,
            'converted',
            false,
            !$isEnabled ? 'currency_disabled' : 'missing_eur_rate'
        );
    }

    /**
     * @param array<string, mixed> $pricingContext
     */
    public function convertHubEuroToDisplay(float $amount, array $pricingContext, int $precision = 2): float
    {
        if (($pricingContext['displayMode'] ?? 'raw_eur_fallback') !== 'converted') {
            return round($amount, $precision);
        }

        $eurRate = is_numeric($pricingContext['eurRate'] ?? null) ? (float) $pricingContext['eurRate'] : 0.0;
        $commissionPercent = is_numeric($pricingContext['commissionPercent'] ?? null)
            ? (float) $pricingContext['commissionPercent']
            : 0.0;

        if ($eurRate <= 0) {
            return round($amount, $precision);
        }

        $converted = $amount * $eurRate * (1 + ($commissionPercent / 100));

        return round($converted, $precision);
    }

    /**
     * @param array<string, mixed> $pricingContext
     */
    public function convertClientAmountToHubEuro(float $amount, array $pricingContext, int $precision = 2): ?float
    {
        if (($pricingContext['displayMode'] ?? 'raw_eur_fallback') !== 'converted') {
            return null;
        }

        $eurRate = is_numeric($pricingContext['eurRate'] ?? null) ? (float) $pricingContext['eurRate'] : 0.0;
        $commissionPercent = is_numeric($pricingContext['commissionPercent'] ?? null)
            ? (float) $pricingContext['commissionPercent']
            : 0.0;
        $markupMultiplier = 1 + ($commissionPercent / 100);

        if ($eurRate <= 0 || $markupMultiplier <= 0) {
            return null;
        }

        return round($amount / $eurRate / $markupMultiplier, $precision);
    }

    /**
     * @param array<string, mixed>|null $clientCurrency
     * @param array<string, mixed> $displayCurrency
     * @return array<string, mixed>
     */
    private function createContext(
        ?array $clientCurrency,
        array $displayCurrency,
        ?float $eurRate,
        float $commissionPercent,
        string $displayMode,
        bool $moneyActionsBlocked,
        ?string $moneyActionsBlockedReason
    ): array {
        $clientCurrencyMeta = $clientCurrency ?? $displayCurrency;

        return [
            'clientCurrency' => $clientCurrencyMeta,
            'clientCurrencyId' => $clientCurrencyMeta['id'] ?? null,
            'clientCurrencyCode' => $clientCurrencyMeta['code'] ?? 'EUR',
            'displayCurrency' => $displayCurrency,
            'displayCurrencyId' => $displayCurrency['id'] ?? null,
            'displayCurrencyCode' => $displayCurrency['code'] ?? 'EUR',
            'eurRate' => $eurRate !== null ? round($eurRate, 6) : null,
            'commissionPercent' => round($commissionPercent, 4),
            'displayMode' => $displayMode,
            'moneyActionsBlocked' => $moneyActionsBlocked,
            'moneyActionsBlockedReason' => $moneyActionsBlockedReason,
        ];
    }

    /**
     * @param array<string, mixed> $currency
     * @return array<string, mixed>
     */
    private function normalizeCurrencyMetadata(array $currency): array
    {
        return [
            'id' => isset($currency['id']) && is_numeric($currency['id']) ? (int) $currency['id'] : null,
            'code' => strtoupper(trim((string) ($currency['code'] ?? 'EUR'))) ?: 'EUR',
            'prefix' => trim((string) ($currency['prefix'] ?? '')),
            'suffix' => trim((string) ($currency['suffix'] ?? '')),
            'format' => trim((string) ($currency['format'] ?? '')),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function buildEuroCurrencyMetadata(): array
    {
        $currency = $this->currencies->findCurrencyByCode('EUR');

        if (is_array($currency)) {
            return $this->normalizeCurrencyMetadata($currency);
        }

        return [
            'id' => null,
            'code' => 'EUR',
            'prefix' => '€',
            'suffix' => '',
            'format' => '1,234.56',
        ];
    }
}
