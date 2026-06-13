<?php

declare(strict_types=1);

namespace Caasify\Core\Support;

final class CurrencyFormat
{
    private const DEFAULT_FORMAT = '1,234.56';

    public static function normalizeFormat(mixed $format): string
    {
        $normalizedFormat = trim((string) $format);

        return match ($normalizedFormat) {
            '1' => '1234.56',
            '2' => '1,234.56',
            '3' => '1.234,56',
            '4' => '1,234',
            default => $normalizedFormat,
        };
    }

    /**
     * @return array{fractionDigits:int,decimalSeparator:string,groupSeparator:string,useGrouping:bool}
     */
    public static function describe(mixed $format): array
    {
        $normalizedFormat = self::normalizeFormat($format);
        $sample = $normalizedFormat !== '' ? $normalizedFormat : self::DEFAULT_FORMAT;
        $sample = preg_replace('/[^0-9.,]/', '', $sample) ?? '';

        if ($sample === '') {
            return self::defaultFormat();
        }

        $exactMatch = match ($normalizedFormat) {
            '1,234.56' => [2, '.', ',', true],
            '1.234,56' => [2, ',', '.', true],
            '1234.56' => [2, '.', '', false],
            '1,234' => [0, '.', ',', true],
            '1.234' => [0, '.', '.', true],
            '1234' => [0, '.', '', false],
            default => null,
        };

        if (is_array($exactMatch)) {
            return [
                'fractionDigits' => $exactMatch[0],
                'decimalSeparator' => $exactMatch[1],
                'groupSeparator' => $exactMatch[2],
                'useGrouping' => $exactMatch[3],
            ];
        }

        $lastDot = strrpos($sample, '.');
        $lastComma = strrpos($sample, ',');

        if ($lastDot !== false && $lastComma !== false) {
            $decimalSeparator = $lastDot > $lastComma ? '.' : ',';
            $groupSeparator = $decimalSeparator === '.' ? ',' : '.';
            $decimalIndex = strrpos($sample, $decimalSeparator);

            return [
                'fractionDigits' => max(strlen(substr($sample, $decimalIndex + 1)), 0),
                'decimalSeparator' => $decimalSeparator,
                'groupSeparator' => $groupSeparator,
                'useGrouping' => str_contains($sample, $groupSeparator),
            ];
        }

        if ($lastDot !== false || $lastComma !== false) {
            $separator = $lastDot !== false ? '.' : ',';
            $separatorIndex = strrpos($sample, $separator);
            $digitsAfter = strlen(substr($sample, $separatorIndex + 1));
            $groupOnlyPattern = sprintf('/^\d{1,3}(%s\d{3})+$/', preg_quote($separator, '/'));

            if (preg_match($groupOnlyPattern, $sample) === 1) {
                return [
                    'fractionDigits' => 0,
                    'decimalSeparator' => '.',
                    'groupSeparator' => $separator,
                    'useGrouping' => true,
                ];
            }

            return [
                'fractionDigits' => max($digitsAfter, 0),
                'decimalSeparator' => $separator,
                'groupSeparator' => $separator === ',' ? '.' : ',',
                'useGrouping' => str_contains(substr($sample, 0, $separatorIndex), $separator),
            ];
        }

        return self::defaultFormat();
    }

    public static function formatNumber(mixed $value, mixed $format = null): string
    {
        $numericValue = self::normalizeNumericValue($value);
        $config = self::describe($format);

        return number_format(
            $numericValue,
            $config['fractionDigits'],
            $config['decimalSeparator'],
            $config['groupSeparator']
        );
    }

    /**
     * @param array<string, mixed>|null $currency
     */
    public static function formatCurrency(mixed $value, ?array $currency = null): string
    {
        $resolvedCurrency = is_array($currency) ? $currency : [];
        $formattedValue = self::formatNumber($value, $resolvedCurrency['format'] ?? null);
        $prefix = self::normalizeString($resolvedCurrency['prefix'] ?? null);
        $suffix = self::normalizeString($resolvedCurrency['suffix'] ?? null);

        if ($prefix !== '') {
            return trim($prefix . $formattedValue);
        }

        if ($suffix !== '') {
            return trim($formattedValue . ' ' . $suffix);
        }

        return $formattedValue;
    }

    /**
     * @param array<string, mixed>|null $currency
     */
    public static function resolveCurrencyMarker(?array $currency = null): string
    {
        $resolvedCurrency = is_array($currency) ? $currency : [];
        $prefix = self::normalizeString($resolvedCurrency['prefix'] ?? null);

        if ($prefix !== '') {
            return $prefix;
        }

        return self::normalizeString($resolvedCurrency['suffix'] ?? null);
    }

    private static function normalizeNumericValue(mixed $value): float
    {
        if (is_string($value)) {
            $value = str_replace(',', '', trim($value));
        }

        if (!is_numeric($value)) {
            return 0.0;
        }

        return (float) $value;
    }

    private static function normalizeString(mixed $value): string
    {
        return is_scalar($value) ? trim((string) $value) : '';
    }

    /**
     * @return array{fractionDigits:int,decimalSeparator:string,groupSeparator:string,useGrouping:bool}
     */
    private static function defaultFormat(): array
    {
        return [
            'fractionDigits' => 2,
            'decimalSeparator' => '.',
            'groupSeparator' => ',',
            'useGrouping' => true,
        ];
    }
}
