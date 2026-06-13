<?php

declare(strict_types=1);

namespace Caasify\Services\Caasify\Server\Actions;

use Caasify\Core\Config\WhmcsCompanyProfile;
use Caasify\Repositories\AddFundsInvoiceRepository;
use Caasify\Repositories\AddonModuleSettingsRepository;
use Caasify\Repositories\CaasifySettingsRepository;
use Caasify\Services\Caasify\Server\Client\CaasifyApiClient;
use Caasify\Services\Caasify\Server\Exceptions\CaasifyApiException;
use Caasify\Services\Whmcs\Client\LocalApiClient;

final class ProcessPaidAddFundsInvoice
{
    public function __construct(
        private readonly AddFundsInvoiceRepository $addFundsInvoices = new AddFundsInvoiceRepository(),
        private readonly AddonModuleSettingsRepository $moduleSettings = new AddonModuleSettingsRepository(),
        private readonly CaasifySettingsRepository $settings = new CaasifySettingsRepository(),
        private readonly LocalApiClient $localApiClient = new LocalApiClient(),
        private readonly ResolveClientAuthToken $resolveClientAuthToken = new ResolveClientAuthToken()
    ) {
    }

    public function handle(int $invoiceId): void
    {
        $brandName = WhmcsCompanyProfile::getName('Company');

        if ($invoiceId <= 0) {
            return;
        }

        $record = $this->addFundsInvoices->findByInvoiceId($invoiceId);

        if ($record === null) {
            return;
        }

        if (($record['status'] ?? null) === AddFundsInvoiceRepository::STATUS_CREDITED) {
            return;
        }

        if (!$this->addFundsInvoices->markProcessing($invoiceId)) {
            return;
        }

        try {
            $invoice = $this->localApiClient->call('GetInvoice', [
                'invoiceid' => $invoiceId,
            ]);
            $validatedInvoice = $this->validateInvoice($invoice, $record);
            $adminToken = $this->moduleSettings->getAdminApiToken();

            if ($adminToken === null) {
                throw new CaasifyApiException('Admin API token is missing.');
            }

            $settings = $this->settings->getSettings();
            $hubBaseUrl = isset($settings['hubBaseUrl']) && is_string($settings['hubBaseUrl'])
                ? trim($settings['hubBaseUrl'])
                : '';
            $hubClient = $hubBaseUrl !== ''
                ? new CaasifyApiClient($hubBaseUrl)
                : new CaasifyApiClient();
            $clientToken = $this->resolveClientAuthToken->handle($validatedInvoice['clientId'], $adminToken);
            $profile = $hubClient->getProfile($clientToken);
            $caasifyUserId = $this->extractString($profile, ['data', 'id'])
                ?? $this->extractString($profile, ['id']);

            if ($caasifyUserId === null) {
                throw new CaasifyApiException($brandName . ' client profile did not include a user id.');
            }

            $response = $hubClient->increaseUserBalance(
                $adminToken,
                $caasifyUserId,
                $validatedInvoice['creditedEurAmount'],
                (string) $invoiceId
            );

            $transactionId = $this->extractString($response, ['data', 'id'])
                ?? $this->extractString($response, ['id']);

            $this->addFundsInvoices->markCredited($invoiceId, $transactionId);
            $this->logActivity($brandName . ' credited the account balance for paid add funds invoice #' . $invoiceId . '.');
        } catch (\Throwable $exception) {
            $this->addFundsInvoices->markFailed($invoiceId, $exception->getMessage());
            $this->logActivity(
                $brandName . ' failed to credit the account balance for add funds invoice #'
                . $invoiceId
                . ': '
                . $exception->getMessage()
            );
        }
    }

    /**
     * @param array<string, mixed> $invoice
     * @param array<string, mixed> $record
     * @return array{clientId:int, amount:float, creditedEurAmount:float}
     */
    private function validateInvoice(array $invoice, array $record): array
    {
        $clientId = $this->extractPositiveInt($invoice['userid'] ?? null);
        $expectedClientId = $this->extractPositiveInt($record['wh_user_id'] ?? null);

        if ($clientId === null || $expectedClientId === null || $clientId !== $expectedClientId) {
            throw new CaasifyApiException('The paid invoice does not belong to the expected client.');
        }

        $status = strtolower((string) ($invoice['status'] ?? ''));

        if ($status !== 'paid') {
            throw new CaasifyApiException('The add funds invoice is not marked as paid.');
        }

        $notes = strtolower((string) ($invoice['notes'] ?? ''));

        if (!str_contains($notes, AddFundsInvoiceRepository::INVOICE_MARKER)) {
            throw new CaasifyApiException('The paid invoice is not a valid add funds invoice.');
        }

        $expectedAmount = $this->extractAmount($record['amount'] ?? null);
        $creditedEurAmount = $this->extractAmount($record['credited_eur_amount'] ?? null);
        $invoiceAmount = $this->findAddFundsLineAmount($invoice, $expectedAmount);
        $expectedCurrencyCode = strtolower(trim((string) ($record['client_currency_code'] ?? '')));
        $invoiceCurrencyCode = strtolower(trim((string) ($invoice['currencycode'] ?? '')));

        if ($invoiceAmount === null || $expectedAmount === null || $creditedEurAmount === null) {
            throw new CaasifyApiException('The add funds invoice amount could not be verified.');
        }

        if (abs($invoiceAmount - $expectedAmount) > 0.01) {
            throw new CaasifyApiException('The paid invoice amount did not match the pending add funds request.');
        }

        if ($expectedCurrencyCode !== '' && $invoiceCurrencyCode !== '' && $expectedCurrencyCode !== $invoiceCurrencyCode) {
            throw new CaasifyApiException('The paid invoice currency did not match the pending add funds request.');
        }

        return [
            'clientId' => $clientId,
            'amount' => $expectedAmount,
            'creditedEurAmount' => $creditedEurAmount,
        ];
    }

    /**
     * @param array<string, mixed> $invoice
     */
    private function findAddFundsLineAmount(array $invoice, ?float $expectedAmount): ?float
    {
        $items = $invoice['items']['item'] ?? null;

        if (!is_array($items)) {
            return null;
        }

        if (array_key_exists('description', $items)) {
            $items = [$items];
        }

        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }

            if ($this->isMarkedAddFundsLineItem($item)) {
                return $this->extractAmount($item['amount'] ?? null);
            }
        }

        if ($expectedAmount !== null) {
            foreach ($items as $item) {
                if (!is_array($item)) {
                    continue;
                }

                $itemAmount = $this->extractAmount($item['amount'] ?? null);

                if ($itemAmount !== null && abs($itemAmount - $expectedAmount) <= 0.01) {
                    return $itemAmount;
                }
            }
        }

        if (count($items) === 1 && is_array($items[0])) {
            return $this->extractAmount($items[0]['amount'] ?? null);
        }

        return null;
    }

    /**
     * @param array<string, mixed> $item
     */
    private function isMarkedAddFundsLineItem(array $item): bool
    {
        $description = strtolower(trim((string) ($item['description'] ?? '')));

        if ($description === '') {
            return false;
        }

        if (str_contains($description, AddFundsInvoiceRepository::INVOICE_MARKER)) {
            return true;
        }

        return $description === strtolower(WhmcsCompanyProfile::getName('Company') . ' account top-up / pre-payment');
    }

    private function extractString(array $payload, array $path): ?string
    {
        $value = $payload;

        foreach ($path as $segment) {
            if (!is_array($value) || !array_key_exists($segment, $value)) {
                return null;
            }

            $value = $value[$segment];
        }

        if (!is_scalar($value)) {
            return null;
        }

        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }

    private function extractPositiveInt(mixed $value): ?int
    {
        if (is_string($value)) {
            $value = trim($value);
        }

        if (!is_numeric($value)) {
            return null;
        }

        $normalized = (int) $value;

        return $normalized > 0 ? $normalized : null;
    }

    private function extractAmount(mixed $value): ?float
    {
        if (is_string($value)) {
            $value = str_replace(',', '', trim($value));
        }

        if (!is_numeric($value)) {
            return null;
        }

        $amount = round((float) $value, 2);

        return $amount > 0 ? $amount : null;
    }

    private function logActivity(string $message): void
    {
        if (function_exists('logActivity')) {
            \logActivity($message);
        }
    }
}
