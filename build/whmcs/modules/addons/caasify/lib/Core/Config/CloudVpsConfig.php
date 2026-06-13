<?php

declare(strict_types=1);

namespace Caasify\Core\Config;

final class CloudVpsConfig
{
    /**
     * @return array{
     *   hiddenCountryCodes: array<int, string>,
     *   hiddenDatacenterKeys: array<int, string>,
     *   displayDatacenterName: bool
     * }
     */
    public static function getDefaultSettings(): array
    {
        return [
            'hiddenCountryCodes' => [],
            'hiddenDatacenterKeys' => [],
            'displayDatacenterName' => false,
        ];
    }

    /**
     * @param array<string, mixed> $settings
     * @return array{
     *   hiddenCountryCodes: array<int, string>,
     *   hiddenDatacenterKeys: array<int, string>,
     *   displayDatacenterName: bool
     * }
     */
    public static function normalizeSettings(array $settings): array
    {
        $hiddenCountryCodes = is_array($settings['hiddenCountryCodes'] ?? null)
            ? $settings['hiddenCountryCodes']
            : [];
        $hiddenDatacenterKeys = is_array($settings['hiddenDatacenterKeys'] ?? null)
            ? $settings['hiddenDatacenterKeys']
            : [];

        return [
            'hiddenCountryCodes' => self::normalizeStringList(
                $hiddenCountryCodes,
                static fn (mixed $value): ?string => self::normalizeCountryCode($value)
            ),
            'hiddenDatacenterKeys' => self::normalizeStringList(
                $hiddenDatacenterKeys,
                static fn (mixed $value): ?string => self::normalizeDatacenterKey($value)
            ),
            'displayDatacenterName' => self::normalizeCheckboxValue($settings['displayDatacenterName'] ?? false),
        ];
    }

    /**
     * @param array<string, mixed> $commonTermsPayload
     * @param array<string, mixed> $productsPayload
     * @param array<string, mixed> $settings
     * @return array{
     *   countries: array<int, array<string, mixed>>,
     *   datacenters: array<int, array<string, mixed>>,
     *   visibleCountryCodes: array<int, string>
     * }
     */
    public static function buildAvailabilityCatalog(
        array $commonTermsPayload,
        array $productsPayload,
        array $settings = []
    ): array {
        $normalizedSettings = self::normalizeSettings($settings);
        $hiddenCountryCodes = array_fill_keys($normalizedSettings['hiddenCountryCodes'], true);
        $hiddenDatacenterKeys = array_fill_keys($normalizedSettings['hiddenDatacenterKeys'], true);
        $countriesByCode = [];
        $datacentersByKey = [];
        $visibleCountryCodes = [];

        foreach (self::findCountryTerms($commonTermsPayload) as $term) {
            if (!is_array($term)) {
                continue;
            }

            $countryName = self::sanitizeString($term['name'] ?? null);
            $countryCode = self::normalizeCountryCode($countryName);

            if ($countryName === null || $countryCode === null) {
                continue;
            }

            $countriesByCode[$countryCode] = [
                'code' => $countryCode,
                'name' => $countryName,
                'enabled' => !isset($hiddenCountryCodes[$countryCode]),
            ];
        }

        foreach ($productsPayload['data'] ?? [] as $product) {
            if (!is_array($product)) {
                continue;
            }

            $detail = is_array($product['detail'] ?? null)
                ? $product['detail']
                : (is_array($product) ? $product : []);
            $countryName = self::sanitizeString($detail['dc_country'] ?? null);
            $countryCode = self::normalizeCountryCode($countryName);

            if ($countryName !== null && $countryCode !== null && !isset($countriesByCode[$countryCode])) {
                $countriesByCode[$countryCode] = [
                    'code' => $countryCode,
                    'name' => $countryName,
                    'enabled' => !isset($hiddenCountryCodes[$countryCode]),
                ];
            }

            $datacenterRawName = self::resolveRawDatacenterName($detail);
            $datacenterName = self::resolveDatacenterName($detail);
            $datacenterKey = self::normalizeDatacenterKey($datacenterRawName);

            if ($datacenterKey !== null) {
                if (!isset($datacentersByKey[$datacenterKey])) {
                    $datacentersByKey[$datacenterKey] = [
                        'key' => $datacenterKey,
                        'name' => $datacenterName ?? 'Unknown datacenter',
                        'countryCodes' => [],
                        'countryNames' => [],
                        'enabled' => !isset($hiddenDatacenterKeys[$datacenterKey]),
                    ];
                }

                if ($countryCode !== null && $countryName !== null) {
                    $datacentersByKey[$datacenterKey]['countryCodes'][$countryCode] = $countryCode;
                    $datacentersByKey[$datacenterKey]['countryNames'][$countryCode] = $countryName;
                }
            }

            if ($countryCode === null || isset($hiddenCountryCodes[$countryCode])) {
                continue;
            }

            if ($datacenterKey !== null && isset($hiddenDatacenterKeys[$datacenterKey])) {
                continue;
            }

            $visibleCountryCodes[$countryCode] = $countryCode;
        }

        $countries = array_values($countriesByCode);
        usort($countries, static function (array $left, array $right): int {
            return strcmp((string) ($left['name'] ?? ''), (string) ($right['name'] ?? ''));
        });

        $datacenters = array_map(static function (array $datacenter): array {
            $countryNames = array_values($datacenter['countryNames']);
            sort($countryNames);
            $countryCodes = array_values($datacenter['countryCodes']);
            sort($countryCodes);

            return [
                'key' => $datacenter['key'],
                'name' => $datacenter['name'],
                'countryCodes' => $countryCodes,
                'countryNames' => $countryNames,
                'countryLabel' => implode(', ', $countryNames),
                'enabled' => $datacenter['enabled'] === true,
            ];
        }, array_values($datacentersByKey));
        usort($datacenters, static function (array $left, array $right): int {
            $nameComparison = strcmp((string) ($left['name'] ?? ''), (string) ($right['name'] ?? ''));

            if ($nameComparison !== 0) {
                return $nameComparison;
            }

            return strcmp((string) ($left['countryLabel'] ?? ''), (string) ($right['countryLabel'] ?? ''));
        });

        return [
            'countries' => $countries,
            'datacenters' => $datacenters,
            'visibleCountryCodes' => array_values($visibleCountryCodes),
        ];
    }

    /**
     * @param array<string, mixed> $commonTermsPayload
     * @param array<string, mixed> $productsPayload
     * @param array<string, mixed> $settings
     * @return array{
     *   hiddenCountryCodes: array<int, string>,
     *   hiddenDatacenterKeys: array<int, string>,
     *   visibleCountryCodes: array<int, string>,
     *   hasResolvedVisibility: bool
     * }
     */
    public static function buildBootstrapConfig(
        array $commonTermsPayload,
        array $productsPayload,
        array $settings = []
    ): array {
        $normalizedSettings = self::normalizeSettings($settings);
        $catalog = self::buildAvailabilityCatalog($commonTermsPayload, $productsPayload, $normalizedSettings);

        return [
            ...$normalizedSettings,
            'visibleCountryCodes' => $catalog['visibleCountryCodes'],
            'hasResolvedVisibility' => true,
        ];
    }

    public static function normalizeCountryCode(mixed $value): ?string
    {
        $normalized = self::slugify($value);

        return $normalized === 'unknown' ? null : $normalized;
    }

    public static function normalizeDatacenterKey(mixed $value): ?string
    {
        $normalized = self::sanitizeString($value);

        return $normalized === null ? null : strtolower($normalized);
    }

    /**
     * @param array<string, mixed> $detail
     */
    public static function resolveDatacenterName(array $detail): ?string
    {
        $rawName = self::resolveRawDatacenterName($detail);

        return $rawName === null ? null : self::resolveDatacenterDisplayName($rawName);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private static function findCountryTerms(array $commonTermsPayload): array
    {
        $termGroups = is_array($commonTermsPayload['data'] ?? null) ? $commonTermsPayload['data'] : [];
        $countries = [];

        foreach ($termGroups as $group) {
            if (!is_array($group)) {
                continue;
            }

            if (is_array($group['countries'] ?? null)) {
                foreach ($group['countries'] as $country) {
                    if (is_array($country)) {
                        $countries[] = $country;
                    }
                }

                continue;
            }

            $name = strtolower((string) ($group['name'] ?? ''));

            if (trim($name) !== 'country') {
                continue;
            }

            foreach (is_array($group['terms'] ?? null) ? $group['terms'] : [] as $term) {
                if (is_array($term)) {
                    $countries[] = $term;
                }
            }
        }

        return $countries;
    }

    private static function sanitizeString(mixed $value): ?string
    {
        if (!is_scalar($value)) {
            return null;
        }

        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }

    private static function resolveRawDatacenterName(array $detail): ?string
    {
        return self::sanitizeString($detail['dc_real_name'] ?? null)
            ?? self::sanitizeString($detail['dc_name'] ?? null);
    }

    public static function resolveDatacenterDisplayName(string $value): string
    {
        $normalized = strtolower(trim($value));
        $aliases = [
            'z1' => 'DigitalOcean',
            'z3' => 'Hetzner',
            'z5' => 'Linode',
            'z6' => 'Vultr',
            'htz' => 'Hetzner',
            'z2' => 'BigCore',
        ];

        return $aliases[$normalized] ?? $value;
    }

    private static function normalizeCheckboxValue(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_numeric($value)) {
            return (int) $value === 1;
        }

        if (!is_string($value)) {
            return false;
        }

        return in_array(strtolower(trim($value)), ['1', 'true', 'yes', 'on'], true);
    }

    private static function slugify(mixed $value): string
    {
        $normalized = preg_replace('/[^a-zA-Z0-9]+/', ' ', (string) $value);
        $cleaned = trim((string) $normalized);

        if ($cleaned === '') {
            return 'unknown';
        }

        $words = preg_split('/\s+/', $cleaned) ?: [];
        $slug = '';

        foreach ($words as $index => $word) {
            $lowerWord = strtolower($word);
            $slug .= $index === 0
                ? $lowerWord
                : ucfirst($lowerWord);
        }

        return $slug !== '' ? $slug : 'unknown';
    }

    /**
     * @param array<int, mixed> $values
     * @param callable(mixed): ?string $normalizer
     * @return array<int, string>
     */
    private static function normalizeStringList(array $values, callable $normalizer): array
    {
        $normalizedValues = [];

        foreach ($values as $value) {
            $normalizedValue = $normalizer($value);

            if ($normalizedValue === null) {
                continue;
            }

            $normalizedValues[$normalizedValue] = $normalizedValue;
        }

        return array_values($normalizedValues);
    }
}
