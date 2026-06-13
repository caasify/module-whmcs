<?php

declare(strict_types=1);

namespace Caasify\Repositories;

use Caasify\Core\Config\DashboardSettings;
use Illuminate\Database\Schema\Blueprint;
use WHMCS\Database\Capsule;

final class CaasifySettingsRepository
{
    public const TABLE = 'caasify_settings';
    public const PRIMARY_ROW_ID = 1;

    public static function ensureTable(): void
    {
        $schema = Capsule::schema();

        if (!$schema->hasTable(self::TABLE)) {
            $schema->create(self::TABLE, function (Blueprint $table): void {
                $table->increments('id');
                $table->string('hub_base_url', 255);
                $table->string('default_dashboard_language', 8);
                $table->longText('ui_settings_json')->nullable();
                $table->longText('cloud_vps_settings_json')->nullable();
                $table->longText('email_settings_json')->nullable();
                $table->longText('pricing_settings_json')->nullable();
                $table->timestamp('created_at')->nullable();
                $table->timestamp('updated_at')->nullable();
            });
        }

        self::ensureCurrentColumns();
        self::ensureDefaultRow();
    }

    public function getSettings(): array
    {
        self::ensureTable();

        $row = Capsule::table(self::TABLE)
            ->where('id', self::PRIMARY_ROW_ID)
            ->first();

        $data = is_object($row) ? get_object_vars($row) : [];
        $uiSettings = DashboardSettings::normalizeUiSettings(
            $this->decodeUiSettings($data['ui_settings_json'] ?? null)
        );
        $emailSettings = DashboardSettings::normalizeEmailSettings(
            $this->decodeSettingsJson($data['email_settings_json'] ?? null)
        );
        $cloudVpsSettings = DashboardSettings::normalizeCloudVpsSettings(
            $this->decodeSettingsJson($data['cloud_vps_settings_json'] ?? null)
        );

        if ($this->isEmailSettingsUnconfigured($emailSettings)) {
            $emailSettings = DashboardSettings::getDefaultEmailSettings();
        }

        return [
            'hubBaseUrl' => DashboardSettings::normalizeHubBaseUrl($data['hub_base_url'] ?? null),
            'defaultDashboardLanguage' => DashboardSettings::resolveLocale($data['default_dashboard_language'] ?? null),
            'uiSettings' => $uiSettings,
            'cloudVpsSettings' => $cloudVpsSettings,
            'emailSettings' => $emailSettings,
            'pricingSettings' => $this->decodeSettingsJson($data['pricing_settings_json'] ?? null),
        ];
    }

    public function saveSettings(array $settings): void
    {
        self::ensureTable();

        $payload = [
            'hub_base_url' => DashboardSettings::normalizeHubBaseUrl($settings['hubBaseUrl'] ?? null),
            'default_dashboard_language' => DashboardSettings::resolveLocale(
                $settings['defaultDashboardLanguage'] ?? null
            ),
            'ui_settings_json' => json_encode(
                DashboardSettings::normalizeUiSettings($settings['uiSettings'] ?? []),
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            ),
            'cloud_vps_settings_json' => json_encode(
                DashboardSettings::normalizeCloudVpsSettings($settings['cloudVpsSettings'] ?? []),
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            ),
            'email_settings_json' => json_encode(
                DashboardSettings::normalizeEmailSettings($settings['emailSettings'] ?? []),
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            ),
            'pricing_settings_json' => json_encode(
                is_array($settings['pricingSettings'] ?? null)
                    ? $settings['pricingSettings']
                    : DashboardSettings::getDefaultPricingSettings(),
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            ),
            'updated_at' => date('Y-m-d H:i:s'),
        ];

        if (!$this->hasPrimaryRow()) {
            $payload['id'] = self::PRIMARY_ROW_ID;
            $payload['created_at'] = $payload['updated_at'];

            Capsule::table(self::TABLE)->insert($payload);

            return;
        }

        Capsule::table(self::TABLE)
            ->where('id', self::PRIMARY_ROW_ID)
            ->update($payload);
    }

    private static function ensureDefaultRow(): void
    {
        if (Capsule::table(self::TABLE)->where('id', self::PRIMARY_ROW_ID)->exists()) {
            return;
        }

        $timestamp = date('Y-m-d H:i:s');

        Capsule::table(self::TABLE)->insert([
            'id' => self::PRIMARY_ROW_ID,
            'hub_base_url' => DashboardSettings::DEFAULT_HUB_BASE_URL,
            'default_dashboard_language' => DashboardSettings::DEFAULT_LOCALE,
            'ui_settings_json' => json_encode(
                DashboardSettings::getDefaultUiSettings(),
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            ),
            'cloud_vps_settings_json' => json_encode(
                DashboardSettings::getDefaultCloudVpsSettings(),
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            ),
            'email_settings_json' => json_encode(
                DashboardSettings::getDefaultEmailSettings(),
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            ),
            'pricing_settings_json' => json_encode(
                DashboardSettings::getDefaultPricingSettings(),
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            ),
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ]);
    }

    private static function ensureCurrentColumns(): void
    {
        $schema = Capsule::schema();
        $columns = [
            'cloud_vps_settings_json' => static function (Blueprint $table): void {
                $table->longText('cloud_vps_settings_json')->nullable();
            },
            'email_settings_json' => static function (Blueprint $table): void {
                $table->longText('email_settings_json')->nullable();
            },
            'pricing_settings_json' => static function (Blueprint $table): void {
                $table->longText('pricing_settings_json')->nullable();
            },
        ];

        foreach ($columns as $column => $definition) {
            if ($schema->hasColumn(self::TABLE, $column)) {
                continue;
            }

            $schema->table(self::TABLE, static function (Blueprint $table) use ($definition): void {
                $definition($table);
            });
        }
    }

    private function hasPrimaryRow(): bool
    {
        return Capsule::table(self::TABLE)->where('id', self::PRIMARY_ROW_ID)->exists();
    }

    private function decodeUiSettings(mixed $value): array
    {
        return $this->decodeSettingsJson($value);
    }

    private function decodeSettingsJson(mixed $value): array
    {
        if (!is_string($value) || $value === '') {
            return [];
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function isEmailSettingsUnconfigured(array $settings): bool
    {
        return ($settings['subject'] ?? null) === null
            && ($settings['content'] ?? null) === null
            && ($settings['fromName'] ?? null) === null;
    }
}
