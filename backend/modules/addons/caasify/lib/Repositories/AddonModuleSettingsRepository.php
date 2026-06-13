<?php

declare(strict_types=1);

namespace Caasify\Repositories;

use Caasify\Core\Config\DashboardSettings;
use WHMCS\Database\Capsule;

final class AddonModuleSettingsRepository
{
    public const MODULE_NAME = 'caasify';
    public const ADMIN_TOKEN_SETTING = 'ResellerToken';

    public function getAdminApiToken(): ?string
    {
        return DashboardSettings::sanitizeToken($this->getSetting(self::ADMIN_TOKEN_SETTING));
    }

    public function saveAdminApiToken(?string $token): void
    {
        $this->saveSetting(self::ADMIN_TOKEN_SETTING, $token);
    }

    public function getSetting(string $setting): ?string
    {
        $value = Capsule::table('tbladdonmodules')
            ->where('module', self::MODULE_NAME)
            ->where('setting', $setting)
            ->value('value');

        if (!is_string($value)) {
            return null;
        }

        $normalizedValue = trim($value);

        return $normalizedValue === '' ? null : $normalizedValue;
    }

    public function saveSetting(string $setting, mixed $value): void
    {
        $normalizedValue = DashboardSettings::sanitizeToken($value);

        if ($normalizedValue === null) {
            $this->deleteSetting($setting);

            return;
        }

        $query = Capsule::table('tbladdonmodules')
            ->where('module', self::MODULE_NAME)
            ->where('setting', $setting);

        if ($query->exists()) {
            $query->update([
                'value' => $normalizedValue,
            ]);

            return;
        }

        Capsule::table('tbladdonmodules')->insert([
            'module' => self::MODULE_NAME,
            'setting' => $setting,
            'value' => $normalizedValue,
        ]);
    }

    public function deleteSetting(string $setting): void
    {
        Capsule::table('tbladdonmodules')
            ->where('module', self::MODULE_NAME)
            ->where('setting', $setting)
            ->delete();
    }

    public function deleteSettings(array $settings): void
    {
        if ($settings === []) {
            return;
        }

        Capsule::table('tbladdonmodules')
            ->where('module', self::MODULE_NAME)
            ->whereIn('setting', $settings)
            ->delete();
    }
}
