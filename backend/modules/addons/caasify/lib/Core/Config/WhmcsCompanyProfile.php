<?php

declare(strict_types=1);

namespace Caasify\Core\Config;

use WHMCS\Database\Capsule;

final class WhmcsCompanyProfile
{
    private static ?array $cachedProfile = null;

    public static function get(): array
    {
        if (self::$cachedProfile !== null) {
            return self::$cachedProfile;
        }

        $settings = Capsule::table('tblconfiguration')
            ->whereIn('setting', [
                'CompanyName',
                'Email',
                'Address1',
                'Address2',
                'City',
                'State',
                'Postcode',
                'Country',
                'LogoURL',
            ])
            ->pluck('value', 'setting');

        $data = is_object($settings) && method_exists($settings, 'all')
            ? $settings->all()
            : (is_array($settings) ? $settings : []);

        self::$cachedProfile = [
            'name' => self::readValue($data, 'CompanyName') ?: 'Company',
            'email' => self::readValue($data, 'Email'),
            'logoUrl' => self::readValue($data, 'LogoURL'),
            'address' => array_values(array_filter([
                self::readValue($data, 'Address1'),
                self::readValue($data, 'Address2'),
                trim(implode(', ', array_filter([
                    self::readValue($data, 'City'),
                    self::readValue($data, 'State'),
                    self::readValue($data, 'Postcode'),
                ]))),
                self::readValue($data, 'Country'),
            ])),
        ];

        return self::$cachedProfile;
    }

    public static function getName(string $fallback = 'Company'): string
    {
        $name = self::readValue(self::get(), 'name');

        return $name !== '' ? $name : $fallback;
    }

    private static function readValue(array $settings, string $key): string
    {
        $value = $settings[$key] ?? '';

        return is_string($value) ? trim($value) : '';
    }
}
