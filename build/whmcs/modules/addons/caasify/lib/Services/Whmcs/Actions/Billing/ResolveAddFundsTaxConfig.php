<?php

declare(strict_types=1);

namespace Caasify\Services\Whmcs\Actions\Billing;

use WHMCS\Database\Capsule;

final class ResolveAddFundsTaxConfig
{
    public function execute(int $clientId): array
    {
        if ($clientId <= 0 || !$this->tableExists('tblclients') || !$this->tableExists('tbltax')) {
            return $this->defaultConfig();
        }

        $client = Capsule::table('tblclients')
            ->where('id', $clientId)
            ->first();

        if (!is_object($client)) {
            return $this->defaultConfig();
        }

        $clientRecord = get_object_vars($client);
        $clientCountry = $this->normalizeToken($clientRecord['country'] ?? null);
        $clientState = $this->normalizeToken($clientRecord['state'] ?? null);
        $taxExempt = $this->isEnabledFlag($clientRecord['taxexempt'] ?? null);
        $taxEnabled = $this->isEnabledFlag($this->readConfigurationValue('TaxEnabled'));
        $inclusive = $this->normalizeToken($this->readConfigurationValue('TaxType')) === 'INCLUSIVE';
        $compound = $this->isEnabledFlag($this->readConfigurationValue('TaxL2Compound'));
        $levelOneRate = $taxEnabled && !$taxExempt
            ? $this->findApplicableRate(1, $clientCountry, $clientState)
            : 0.0;
        $levelTwoRate = $taxEnabled && !$taxExempt
            ? $this->findApplicableRate(2, $clientCountry, $clientState)
            : 0.0;

        return [
            'enabled' => $taxEnabled && !$taxExempt && ($levelOneRate > 0 || $levelTwoRate > 0),
            'inclusive' => $inclusive,
            'compound' => $compound,
            'level1Rate' => round($levelOneRate, 4),
            'level2Rate' => round($levelTwoRate, 4),
        ];
    }

    /**
     * @return array{enabled:bool, inclusive:bool, compound:bool, level1Rate:float, level2Rate:float}
     */
    private function defaultConfig(): array
    {
        return [
            'enabled' => false,
            'inclusive' => false,
            'compound' => false,
            'level1Rate' => 0.0,
            'level2Rate' => 0.0,
        ];
    }

    private function tableExists(string $table): bool
    {
        try {
            return Capsule::schema()->hasTable($table);
        } catch (\Throwable) {
            return false;
        }
    }

    private function readConfigurationValue(string $setting): ?string
    {
        if (!$this->tableExists('tblconfiguration')) {
            return null;
        }

        $value = Capsule::table('tblconfiguration')
            ->where('setting', $setting)
            ->value('value');

        return is_scalar($value) ? trim((string) $value) : null;
    }

    private function findApplicableRate(int $level, string $country, string $state): float
    {
        $rows = Capsule::table('tbltax')
            ->where('level', $level)
            ->orderBy('id')
            ->get();
        $bestRate = 0.0;
        $bestScore = -1;

        foreach ($rows as $row) {
            if (!is_object($row)) {
                continue;
            }

            $record = get_object_vars($row);
            $countryScore = $this->matchSpecificity($record['country'] ?? null, $country, true);
            $stateScore = $this->matchSpecificity($record['state'] ?? null, $state, false);

            if ($countryScore < 0 || $stateScore < 0) {
                continue;
            }

            $rate = $this->normalizeRate($record);
            $score = ($countryScore * 10) + $stateScore;

            if ($score > $bestScore) {
                $bestScore = $score;
                $bestRate = $rate;
            }
        }

        return $bestRate;
    }

    /**
     * @param array<string, mixed> $record
     */
    private function normalizeRate(array $record): float
    {
        $candidates = [
            $record['taxrate'] ?? null,
            $record['tax'] ?? null,
            $record['rate'] ?? null,
        ];

        foreach ($candidates as $candidate) {
            if (is_string($candidate)) {
                $candidate = str_replace(',', '', trim($candidate));
            }

            if (is_numeric($candidate)) {
                return max(0.0, (float) $candidate);
            }
        }

        return 0.0;
    }

    private function matchSpecificity(mixed $ruleValue, string $clientValue, bool $isCountry): int
    {
        $normalizedRuleValue = $this->normalizeToken($ruleValue);

        if ($normalizedRuleValue === '' || $this->isWildcardRule($normalizedRuleValue, $isCountry)) {
            return 0;
        }

        if ($clientValue !== '' && $normalizedRuleValue === $clientValue) {
            return 1;
        }

        return -1;
    }

    private function isWildcardRule(string $value, bool $isCountry): bool
    {
        if ($value === '') {
            return true;
        }

        if ($isCountry) {
            return in_array($value, ['ALL', 'ALL COUNTRIES'], true);
        }

        return in_array($value, ['ALL', 'ALL STATES', 'APPLY RULE TO ALL STATES'], true);
    }

    private function normalizeToken(mixed $value): string
    {
        return strtoupper(trim((string) $value));
    }

    private function isEnabledFlag(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        $normalized = strtolower(trim((string) $value));

        return in_array($normalized, ['1', 'on', 'true', 'yes'], true);
    }
}
