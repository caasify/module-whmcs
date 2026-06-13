<?php

declare(strict_types=1);

namespace Caasify\Core\Config;

use WHMCS\Database\Capsule;

final class WhmcsAdminUrl
{
    public static function getSystemUrl(): string
    {
        $systemUrl = self::readConfigurationValue('SystemURL');

        if ($systemUrl === '') {
            $systemUrl = self::readConfigurationValue('systemUrl');
        }

        return $systemUrl !== '' ? rtrim($systemUrl, '/') : '/';
    }

    public static function getAdminPath(): string
    {
        global $customadminpath;

        $adminPath = is_string($customadminpath ?? null) ? trim($customadminpath) : '';
        $adminPath = trim($adminPath, "/ \t\n\r\0\x0B");

        return $adminPath !== '' ? $adminPath : 'admin';
    }

    public static function getAdminUrl(string $script = '', array $query = []): string
    {
        $baseUrl = rtrim(self::getSystemUrl(), '/') . '/' . self::getAdminPath();
        $script = ltrim($script, '/');

        if ($script !== '') {
            $baseUrl .= '/' . $script;
        }

        if ($query !== []) {
            $baseUrl .= '?' . http_build_query($query);
        }

        return $baseUrl;
    }

    private static function readConfigurationValue(string $setting): string
    {
        $value = Capsule::table('tblconfiguration')
            ->where('setting', $setting)
            ->value('value');

        return is_string($value) ? trim($value) : '';
    }
}
