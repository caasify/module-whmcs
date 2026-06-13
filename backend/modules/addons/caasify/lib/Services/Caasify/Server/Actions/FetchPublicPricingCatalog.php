<?php

declare(strict_types=1);

namespace Caasify\Services\Caasify\Server\Actions;

use Caasify\Core\Config\DashboardSettings;
use Caasify\Repositories\AddonModuleSettingsRepository;
use Caasify\Repositories\CaasifySettingsRepository;
use Caasify\Services\Caasify\Server\Client\CaasifyApiClient;
use Caasify\Services\Caasify\Server\Exceptions\CaasifyApiException;

final class FetchPublicPricingCatalog
{
    public function __construct(
        private readonly AddonModuleSettingsRepository $addonModuleSettings = new AddonModuleSettingsRepository(),
        private readonly CaasifySettingsRepository $settings = new CaasifySettingsRepository()
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function handle(?int $countryTermId = null, bool $includeProducts = true): array
    {
        $adminToken = DashboardSettings::sanitizeToken($this->addonModuleSettings->getAdminApiToken());

        if ($adminToken === null) {
            throw new CaasifyApiException('Admin API token is not configured.');
        }

        $client = $this->createApiClient();
        $commonTermsPayload = $client->getCountries($adminToken);
        $productsPayload = ['data' => []];

        if ($includeProducts) {
            $productsPayload = $countryTermId !== null && $countryTermId > 0
                ? $this->fetchProductsPayload($client, $adminToken, $countryTermId)
                : $this->fetchProductsPayload($client, $adminToken, null, $commonTermsPayload);
        }

        return [
            'countriesPayload' => $this->normalizePayload($commonTermsPayload),
            'commonTermsPayload' => $this->normalizePayload($commonTermsPayload),
            'productsPayload' => $this->normalizePayload($productsPayload),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function fetchCommonTerms(): array
    {
        $adminToken = DashboardSettings::sanitizeToken($this->addonModuleSettings->getAdminApiToken());

        if ($adminToken === null) {
            throw new CaasifyApiException('Admin API token is not configured.');
        }

        return $this->normalizePayload($this->createApiClient()->getCountries($adminToken));
    }

    /**
     * @return array<string, mixed>
     */
    public function fetchProductsForCountryTerm(int $countryTermId): array
    {
        if ($countryTermId <= 0) {
            throw new CaasifyApiException('A valid country filter is required.');
        }

        $adminToken = DashboardSettings::sanitizeToken($this->addonModuleSettings->getAdminApiToken());

        if ($adminToken === null) {
            throw new CaasifyApiException('Admin API token is not configured.');
        }

        return $this->normalizePayload(
            $this->fetchProductsPayload(
                $this->createApiClient(),
                $adminToken,
                $countryTermId
            )
        );
    }

    private function createApiClient(): CaasifyApiClient
    {
        $settings = $this->settings->getSettings();
        $baseUrl = $settings['hubBaseUrl'] ?? null;

        return is_string($baseUrl) && trim($baseUrl) !== ''
            ? new CaasifyApiClient(trim($baseUrl))
            : new CaasifyApiClient();
    }

    /**
     * @return array<string, mixed>
     */
    private function fetchProductsPayload(
        CaasifyApiClient $client,
        string $adminToken,
        ?int $countryId = null,
        ?array $countriesPayload = null
    ): array
    {
        if ($countryId !== null) {
            return $this->normalizePayload(
                $client->getCountryProducts($adminToken, $countryId)
            );
        }

        $countriesPayload = $countriesPayload !== null
            ? $this->normalizePayload($countriesPayload)
            : $this->normalizePayload($client->getCountries($adminToken));
        $productsById = [];

        foreach ($this->findCountries($countriesPayload) as $country) {
            $countryId = isset($country['id']) && is_numeric($country['id'])
                ? (int) $country['id']
                : 0;

            if ($countryId <= 0) {
                continue;
            }

            try {
                $countryProductsPayload = $this->normalizePayload(
                    $client->getCountryProducts($adminToken, $countryId)
                );
            } catch (\Throwable) {
                continue;
            }

            foreach ($countryProductsPayload['data'] ?? [] as $product) {
                if (!is_array($product)) {
                    continue;
                }

                $productId = isset($product['id']) && is_numeric($product['id'])
                    ? (string) (int) $product['id']
                    : null;

                if ($productId === null) {
                    continue;
                }

                $productsById[$productId] = $product;
            }
        }

        return [
            'data' => array_values($productsById),
        ];
    }

    /**
     * @param array<string, mixed> $countriesPayload
     * @return array<int, array<string, mixed>>
     */
    private function findCountries(array $countriesPayload): array
    {
        $countries = [];

        foreach ($countriesPayload['data'] ?? [] as $group) {
            if (!is_array($group)) {
                continue;
            }

            if (is_array($group['countries'] ?? null)) {
                foreach ($group['countries'] as $country) {
                    if (is_array($country)) {
                        $countries[] = $country;
                    }
                }
            }
        }

        return $countries;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function normalizePayload(array $payload): array
    {
        return [
            ...$payload,
            'data' => is_array($payload['data'] ?? null) ? $payload['data'] : [],
        ];
    }
}
