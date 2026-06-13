<?php

declare(strict_types=1);

namespace Caasify\Repositories;

use WHMCS\Database\Capsule;

final class WhmcsCurrencyRepository
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function getCurrencies(): array
    {
        $rows = Capsule::table('tblcurrencies')
            ->orderByDesc('default')
            ->orderBy('code')
            ->orderBy('id')
            ->get();

        $currencies = [];

        foreach ($rows as $row) {
            if (!is_object($row)) {
                continue;
            }

            $currency = $this->normalizeCurrencyRecord(get_object_vars($row));

            if ($currency !== null) {
                $currencies[] = $currency;
            }
        }

        return $currencies;
    }

    public function findCurrencyById(int $currencyId): ?array
    {
        if ($currencyId <= 0) {
            return null;
        }

        $row = Capsule::table('tblcurrencies')
            ->where('id', $currencyId)
            ->first();

        if (!is_object($row)) {
            return null;
        }

        return $this->normalizeCurrencyRecord(get_object_vars($row));
    }

    public function findCurrencyByCode(string $currencyCode): ?array
    {
        $normalizedCode = strtoupper(trim($currencyCode));

        if ($normalizedCode === '') {
            return null;
        }

        foreach ($this->getCurrencies() as $currency) {
            if (($currency['code'] ?? null) === $normalizedCode) {
                return $currency;
            }
        }

        return null;
    }

    public function findDefaultCurrency(): ?array
    {
        $row = Capsule::table('tblcurrencies')
            ->where('default', '1')
            ->orderBy('id')
            ->first();

        if (is_object($row)) {
            return $this->normalizeCurrencyRecord(get_object_vars($row));
        }

        $currencies = $this->getCurrencies();

        return $currencies[0] ?? null;
    }

    public function findClientCurrencyByClientId(int $clientId): ?array
    {
        if ($clientId <= 0) {
            return $this->findDefaultCurrency();
        }

        $currencyId = Capsule::table('tblclients')
            ->where('id', $clientId)
            ->value('currency');

        if (is_numeric($currencyId) && (int) $currencyId > 0) {
            $currency = $this->findCurrencyById((int) $currencyId);

            if ($currency !== null) {
                return $currency;
            }
        }

        return $this->findDefaultCurrency();
    }

    /**
     * @param array<string, mixed> $record
     * @return array<string, mixed>|null
     */
    private function normalizeCurrencyRecord(array $record): ?array
    {
        $id = isset($record['id']) && is_numeric($record['id']) ? (int) $record['id'] : 0;

        if ($id <= 0) {
            return null;
        }

        $code = strtoupper(trim((string) ($record['code'] ?? '')));
        $prefix = trim((string) ($record['prefix'] ?? ''));
        $suffix = trim((string) ($record['suffix'] ?? ''));
        $format = $this->normalizeCurrencyFormat($record['format'] ?? null);

        return [
            'id' => $id,
            'code' => $code !== '' ? $code : ('CUR' . $id),
            'prefix' => $prefix,
            'suffix' => $suffix,
            'format' => $format,
            'isDefault' => (string) ($record['default'] ?? '0') === '1',
        ];
    }

    private function normalizeCurrencyFormat(mixed $value): string
    {
        $format = trim((string) $value);

        return match ($format) {
            '1' => '1234.56',
            '2' => '1,234.56',
            '3' => '1.234,56',
            '4' => '1,234',
            default => $format,
        };
    }
}
