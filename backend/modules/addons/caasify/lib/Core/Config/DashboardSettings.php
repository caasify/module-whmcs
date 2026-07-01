<?php

declare(strict_types=1);

namespace Caasify\Core\Config;

use Caasify\Repositories\AddonModuleSettingsRepository;
use Caasify\Repositories\CaasifySettingsRepository;
use Caasify\Repositories\WhmcsCurrencyRepository;
use Caasify\Core\Support\ValidationException;

final class DashboardSettings
{
    public const DEFAULT_LOCALE = 'fa';
    public const DEFAULT_HUB_BASE_URL = 'https://hub.caasify.com';
    public const DEFAULT_THEME_MODE = 'light';
    public const DEFAULT_APP_SCALE = 0.7;
    public const DEFAULT_COMMISSION_PERCENT = 0.0;
    public const DEFAULT_ENABLE_VPN = true;
    public const DEFAULT_CLIENT_MENU_TITLE = 'Company';
    public const DEFAULT_PUBLIC_PRICING_MENU_TITLE = 'Pricing';
    public const CLIENT_MENU_PLACEMENT_MAIN_MENU = 'MainMenu';
    public const CLIENT_MENU_PLACEMENT_INSIDE_SERVICES = 'InsideServices';
    public const CLIENT_MENU_PLACEMENT_HIDDEN = 'Hidden';
    public const LANGUAGE_COOKIE_NAME = 'caasify_dashboard_language';
    private const LANGUAGE_COOKIE_TTL = 31536000;
    private const SUPPORTED_LOCALE_OPTIONS = [
        'en' => 'English',
        'fa' => 'Persian (فارسی)',
        'es' => 'Spanish (Español)',
        'ru' => 'Russian (Русский)',
    ];
    private const CLIENT_MENU_PLACEMENT_OPTIONS = [
        self::CLIENT_MENU_PLACEMENT_MAIN_MENU => 'Main Menu',
        self::CLIENT_MENU_PLACEMENT_INSIDE_SERVICES => 'Inside Services',
        self::CLIENT_MENU_PLACEMENT_HIDDEN => 'Hidden',
    ];

    public function __construct(
        private readonly DashboardSettingsBootstrapper $bootstrapper = new DashboardSettingsBootstrapper(),
        private readonly CaasifySettingsRepository $settingsRepository = new CaasifySettingsRepository(),
        private readonly AddonModuleSettingsRepository $addonModuleSettingsRepository = new AddonModuleSettingsRepository(),
        private readonly WhmcsCurrencyRepository $whmcsCurrencies = new WhmcsCurrencyRepository()
    ) {
    }

    public static function getSupportedLocales(): array
    {
        return array_keys(self::SUPPORTED_LOCALE_OPTIONS);
    }

    public static function getAdminLanguageOptions(): array
    {
        return self::SUPPORTED_LOCALE_OPTIONS;
    }

    public static function getClientMenuPlacementOptions(): array
    {
        return self::CLIENT_MENU_PLACEMENT_OPTIONS;
    }

    public static function isSupportedLocale(?string $locale): bool
    {
        return is_string($locale) && array_key_exists(strtolower($locale), self::SUPPORTED_LOCALE_OPTIONS);
    }

    public static function resolveLocale(?string $locale): string
    {
        return self::isSupportedLocale($locale) ? strtolower((string) $locale) : self::DEFAULT_LOCALE;
    }

    public static function readLocaleFromCookie(): ?string
    {
        $cookieLocale = $_COOKIE[self::LANGUAGE_COOKIE_NAME] ?? null;

        return self::isSupportedLocale($cookieLocale) ? strtolower((string) $cookieLocale) : null;
    }

    public static function persistLocaleCookie(string $locale): bool
    {
        $resolvedLocale = self::resolveLocale($locale);

        return setcookie(self::LANGUAGE_COOKIE_NAME, $resolvedLocale, [
            'expires' => time() + self::LANGUAGE_COOKIE_TTL,
            'path' => '/',
            'secure' => self::isSecureRequest(),
            'httponly' => false,
            'samesite' => 'Lax',
        ]);
    }

    private static function isSecureRequest(): bool
    {
        if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
            return true;
        }

        $forwardedProto = $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? null;
        if (is_string($forwardedProto) && strtolower($forwardedProto) === 'https') {
            return true;
        }

        $forwardedSsl = $_SERVER['HTTP_X_FORWARDED_SSL'] ?? null;

        return is_string($forwardedSsl) && strtolower($forwardedSsl) === 'on';
    }

    public static function resolveThemeMode(mixed $value): string
    {
        return $value === 'dark' ? 'dark' : self::DEFAULT_THEME_MODE;
    }

    public static function normalizeHubBaseUrl(mixed $value): string
    {
        if (!is_string($value) || trim($value) === '') {
            return self::DEFAULT_HUB_BASE_URL;
        }

        $normalized = trim($value);

        if (!preg_match('#^https?://#i', $normalized)) {
            $normalized = 'https://' . ltrim($normalized, '/');
        }

        $normalized = rtrim($normalized, '/');

        return filter_var($normalized, FILTER_VALIDATE_URL) ? $normalized : self::DEFAULT_HUB_BASE_URL;
    }

    public static function sanitizeToken(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }

    public static function sanitizeOptionalText(mixed $value, int $maxLength = 255): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        if ($trimmed === '') {
            return null;
        }

        return function_exists('mb_substr')
            ? mb_substr($trimmed, 0, $maxLength)
            : substr($trimmed, 0, $maxLength);
    }

    public static function sanitizeOptionalMultilineText(mixed $value, int $maxLength = 20000): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $normalized = str_replace(["\r\n", "\r"], "\n", trim($value));

        if ($normalized === '') {
            return null;
        }

        return function_exists('mb_substr')
            ? mb_substr($normalized, 0, $maxLength)
            : substr($normalized, 0, $maxLength);
    }

    public static function sanitizeHexColor(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        if ($trimmed === '') {
            return null;
        }

        return preg_match('/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $trimmed) === 1
            ? strtolower($trimmed)
            : null;
    }

    public static function sanitizeAppScale(mixed $value): float
    {
        if (is_string($value)) {
            $value = trim($value);
        }

        if (!is_numeric($value)) {
            return self::DEFAULT_APP_SCALE;
        }

        $numericValue = (float) $value;

        if ($numericValue < 0.5) {
            return 0.5;
        }

        if ($numericValue > 1.25) {
            return 1.25;
        }

        return round($numericValue, 2);
    }

    public static function normalizeClientMenuPlacement(mixed $value): string
    {
        if (!is_string($value)) {
            return self::CLIENT_MENU_PLACEMENT_MAIN_MENU;
        }

        $normalized = trim($value);

        return array_key_exists($normalized, self::CLIENT_MENU_PLACEMENT_OPTIONS)
            ? $normalized
            : self::CLIENT_MENU_PLACEMENT_MAIN_MENU;
    }

    public static function getDefaultClientMenuSettings(): array
    {
        return [
            'title' => self::getDefaultClientMenuTitle(),
            'placement' => self::CLIENT_MENU_PLACEMENT_MAIN_MENU,
        ];
    }

    public static function normalizeClientMenuSettings(array $settings): array
    {
        return [
            'title' => self::sanitizeOptionalText($settings['title'] ?? null, 80) ?? self::getDefaultClientMenuTitle(),
            'placement' => self::normalizeClientMenuPlacement($settings['placement'] ?? null),
        ];
    }

    public static function getDefaultClientMenuTitle(): string
    {
        return WhmcsCompanyProfile::getName(self::DEFAULT_CLIENT_MENU_TITLE);
    }

    public static function getDefaultPublicPricingMenuSettings(): array
    {
        return [
            'title' => self::DEFAULT_PUBLIC_PRICING_MENU_TITLE,
            'placement' => self::CLIENT_MENU_PLACEMENT_MAIN_MENU,
        ];
    }

    public static function normalizePublicPricingMenuSettings(array $settings): array
    {
        return [
            'title' => self::sanitizeOptionalText($settings['title'] ?? null, 80) ?? self::DEFAULT_PUBLIC_PRICING_MENU_TITLE,
            'placement' => self::normalizeClientMenuPlacement($settings['placement'] ?? null),
        ];
    }

    public static function getDefaultUiSettings(): array
    {
        return [
            'themeMode' => self::DEFAULT_THEME_MODE,
            'appScale' => self::DEFAULT_APP_SCALE,
            'clientMenu' => self::getDefaultClientMenuSettings(),
            'publicPricingMenu' => self::getDefaultPublicPricingMenuSettings(),
            'fonts' => [
                'primary' => null,
                'secondary' => null,
                'mono' => null,
            ],
            'colors' => [
                'background' => null,
                'surface' => null,
                'copy' => null,
                'primary' => null,
                'secondary' => null,
                'buttonPrimaryBg' => null,
                'buttonPrimaryText' => null,
                'buttonSecondaryBg' => null,
                'buttonSecondaryText' => null,
            ],
        ];
    }

    public static function getDefaultFeatureSettings(): array
    {
        return [
            'enableVpn' => self::DEFAULT_ENABLE_VPN,
        ];
    }

    public static function normalizeFeatureSettings(array $settings): array
    {
        return [
            'enableVpn' => array_key_exists('enableVpn', $settings)
                ? self::normalizeCheckboxValue($settings['enableVpn'])
                : self::DEFAULT_ENABLE_VPN,
        ];
    }

    /**
     * @return array{
     *   hiddenCountryCodes: array<int, string>,
     *   hiddenDatacenterKeys: array<int, string>,
     *   displayDatacenterName: bool
     * }
     */
    public static function getDefaultCloudVpsSettings(): array
    {
        return CloudVpsConfig::getDefaultSettings();
    }

    /**
     * @param array<string, mixed> $settings
     * @return array{
     *   hiddenCountryCodes: array<int, string>,
     *   hiddenDatacenterKeys: array<int, string>,
     *   displayDatacenterName: bool
     * }
     */
    public static function normalizeCloudVpsSettings(array $settings): array
    {
        return CloudVpsConfig::normalizeSettings($settings);
    }

    public static function normalizeUiSettings(array $settings): array
    {
        $clientMenu = is_array($settings['clientMenu'] ?? null) ? $settings['clientMenu'] : [];
        $publicPricingMenu = is_array($settings['publicPricingMenu'] ?? null) ? $settings['publicPricingMenu'] : [];
        $fonts = is_array($settings['fonts'] ?? null) ? $settings['fonts'] : [];
        $colors = is_array($settings['colors'] ?? null) ? $settings['colors'] : [];

        return [
            'themeMode' => self::resolveThemeMode($settings['themeMode'] ?? null),
            'appScale' => self::sanitizeAppScale($settings['appScale'] ?? null),
            'clientMenu' => self::normalizeClientMenuSettings($clientMenu),
            'publicPricingMenu' => self::normalizePublicPricingMenuSettings($publicPricingMenu),
            'fonts' => [
                'primary' => self::sanitizeOptionalText($fonts['primary'] ?? null),
                'secondary' => self::sanitizeOptionalText($fonts['secondary'] ?? null),
                'mono' => self::sanitizeOptionalText($fonts['mono'] ?? null),
            ],
            'colors' => [
                'background' => self::sanitizeHexColor($colors['background'] ?? null),
                'surface' => self::sanitizeHexColor($colors['surface'] ?? null),
                'copy' => self::sanitizeHexColor($colors['copy'] ?? null),
                'primary' => self::sanitizeHexColor($colors['primary'] ?? null),
                'secondary' => self::sanitizeHexColor($colors['secondary'] ?? null),
                'buttonPrimaryBg' => self::sanitizeHexColor($colors['buttonPrimaryBg'] ?? null),
                'buttonPrimaryText' => self::sanitizeHexColor($colors['buttonPrimaryText'] ?? null),
                'buttonSecondaryBg' => self::sanitizeHexColor($colors['buttonSecondaryBg'] ?? null),
                'buttonSecondaryText' => self::sanitizeHexColor($colors['buttonSecondaryText'] ?? null),
            ],
        ];
    }

    public static function getDefaultEmailSettings(): array
    {
        $brandName = WhmcsCompanyProfile::getName(self::DEFAULT_CLIENT_MENU_TITLE);
        $addFundsUrl = WhmcsClientAreaUrl::getAddFundsUrl();

        return [
            'subject' => 'Action required: Low balance',
            'content' => "Dear Customer,\n\nWe noticed that your account balance is running low. To ensure your services remain active, please top up your balance as soon as possible.\n\nYou can add credit through your client area at:\n"
                . $addFundsUrl
                . "\n\nImportant:\nIf your balance reaches zero, your services will be automatically suspended and all related data will be permanently deleted without further notice.\n\nWe strongly recommend adding funds now to avoid any data loss or interruption.\n\nIf you need assistance, our support team is here to help.\n\nBest regards,\n"
                . $brandName
                . "\nBilling Department",
            'fromName' => $brandName,
        ];
    }

    public static function normalizeEmailSettings(array $settings): array
    {
        return [
            'subject' => self::sanitizeOptionalText($settings['subject'] ?? null, 255),
            'content' => self::sanitizeOptionalMultilineText($settings['content'] ?? null, 20000),
            'fromName' => self::sanitizeOptionalText($settings['fromName'] ?? null, 255),
        ];
    }

    public static function getDefaultPricingSettings(): array
    {
        return [
            'commissionPercent' => self::DEFAULT_COMMISSION_PERCENT,
            'currencies' => [],
        ];
    }

    public static function sanitizeCommissionPercent(mixed $value): float
    {
        if (is_string($value)) {
            $value = trim($value);
        }

        if (!is_numeric($value)) {
            return self::DEFAULT_COMMISSION_PERCENT;
        }

        $numericValue = (float) $value;

        if ($numericValue < 0) {
            return self::DEFAULT_COMMISSION_PERCENT;
        }

        if ($numericValue > 1000) {
            $numericValue = 1000;
        }

        return round($numericValue, 4);
    }

    public static function sanitizeEurRate(mixed $value): ?float
    {
        if (is_string($value)) {
            $value = trim($value);
        }

        if (!is_numeric($value)) {
            return null;
        }

        $numericValue = (float) $value;

        if ($numericValue <= 0) {
            return null;
        }

        return round($numericValue, 6);
    }

    /**
     * @param array<int, array<string, mixed>> $availableCurrencies
     * @return array<string, mixed>
     */
    public static function normalizePricingSettings(array $settings, array $availableCurrencies = []): array
    {
        $storedCurrencies = is_array($settings['currencies'] ?? null) ? $settings['currencies'] : [];
        $normalizedCurrencies = [];

        foreach ($availableCurrencies as $currency) {
            if (!is_array($currency)) {
                continue;
            }

            $currencyId = isset($currency['id']) && is_numeric($currency['id']) ? (int) $currency['id'] : 0;

            if ($currencyId <= 0) {
                continue;
            }

            $currencyCode = strtoupper(trim((string) ($currency['code'] ?? '')));
            $storedRow = is_array($storedCurrencies[(string) $currencyId] ?? null)
                ? $storedCurrencies[(string) $currencyId]
                : [];
            $isEuro = $currencyCode === 'EUR';
            $eurRate = $isEuro
                ? 1.0
                : self::sanitizeEurRate($storedRow['eurRate'] ?? null);

            $normalizedCurrencies[(string) $currencyId] = [
                'enabled' => $isEuro ? true : ($eurRate !== null),
                'eurRate' => $eurRate,
                'code' => $currencyCode !== '' ? $currencyCode : ('CUR' . $currencyId),
                'prefix' => trim((string) ($currency['prefix'] ?? '')),
                'suffix' => trim((string) ($currency['suffix'] ?? '')),
                'format' => trim((string) ($currency['format'] ?? '')),
            ];
        }

        return [
            'commissionPercent' => self::sanitizeCommissionPercent($settings['commissionPercent'] ?? null),
            'currencies' => $normalizedCurrencies,
        ];
    }

    public function getAdminSettings(): array
    {
        $this->bootstrapper->ensureReady();
        $settings = $this->settingsRepository->getSettings();
        $availableCurrencies = $this->whmcsCurrencies->getCurrencies();
        $emailSettings = self::normalizeEmailSettings(
            is_array($settings['emailSettings'] ?? null) ? $settings['emailSettings'] : []
        );

        return [
            ...$settings,
            'emailSettings' => $emailSettings,
            'adminApiToken' => $this->addonModuleSettingsRepository->getAdminApiToken(),
            'featureSettings' => self::normalizeFeatureSettings(
                is_array($settings['featureSettings'] ?? null) ? $settings['featureSettings'] : []
            ),
            'cloudVpsSettings' => self::normalizeCloudVpsSettings(
                is_array($settings['cloudVpsSettings'] ?? null) ? $settings['cloudVpsSettings'] : []
            ),
            'pricingSettings' => self::normalizePricingSettings(
                is_array($settings['pricingSettings'] ?? null) ? $settings['pricingSettings'] : [],
                $availableCurrencies
            ),
        ];
    }

    public function saveAdminSettings(array $settings): void
    {
        $this->bootstrapper->ensureReady();
        $this->settingsRepository->saveSettings($settings);
        $this->addonModuleSettingsRepository->saveAdminApiToken($settings['adminApiToken'] ?? null);
    }

    public function getDefaultDashboardLanguage(): string
    {
        return $this->getAdminSettings()['defaultDashboardLanguage'];
    }

    public function getPublicUiSettings(): array
    {
        return $this->getAdminSettings()['uiSettings'];
    }

    public function getFeatureSettings(): array
    {
        return self::normalizeFeatureSettings($this->getAdminSettings()['featureSettings'] ?? []);
    }

    public function getClientMenuSettings(): array
    {
        return self::normalizeClientMenuSettings($this->getPublicUiSettings()['clientMenu'] ?? []);
    }

    public function getPublicPricingMenuSettings(): array
    {
        return self::normalizePublicPricingMenuSettings($this->getPublicUiSettings()['publicPricingMenu'] ?? []);
    }

    public function prepareAdminSettingsForSave(array $input, array $existingSettings): array
    {
        $existingUiSettings = self::normalizeUiSettings($existingSettings['uiSettings'] ?? []);
        $uiInput = is_array($input['uiSettings'] ?? null) ? $input['uiSettings'] : [];
        $clientMenuInput = is_array($uiInput['clientMenu'] ?? null) ? $uiInput['clientMenu'] : [];
        $publicPricingMenuInput = is_array($uiInput['publicPricingMenu'] ?? null) ? $uiInput['publicPricingMenu'] : [];
        $fontInput = is_array($uiInput['fonts'] ?? null) ? $uiInput['fonts'] : [];
        $colorInput = is_array($uiInput['colors'] ?? null) ? $uiInput['colors'] : [];
        $emailInput = is_array($input['emailSettings'] ?? null) ? $input['emailSettings'] : [];
        $featureInput = is_array($input['featureSettings'] ?? null) ? $input['featureSettings'] : [];
        $cloudVpsInput = is_array($input['cloudVpsSettings'] ?? null) ? $input['cloudVpsSettings'] : [];
        $pricingInput = is_array($input['pricingSettings'] ?? null) ? $input['pricingSettings'] : [];
        $existingToken = self::sanitizeToken($existingSettings['adminApiToken'] ?? null);
        $submittedToken = self::sanitizeToken($input['adminApiToken'] ?? null);
        $availableCurrencies = $this->whmcsCurrencies->getCurrencies();
        $existingEmailSettings = self::normalizeEmailSettings(
            is_array($existingSettings['emailSettings'] ?? null) ? $existingSettings['emailSettings'] : []
        );
        $existingFeatureSettings = self::normalizeFeatureSettings(
            is_array($existingSettings['featureSettings'] ?? null) ? $existingSettings['featureSettings'] : []
        );
        $existingCloudVpsSettings = self::normalizeCloudVpsSettings(
            is_array($existingSettings['cloudVpsSettings'] ?? null) ? $existingSettings['cloudVpsSettings'] : []
        );
        $existingPricingSettings = self::normalizePricingSettings(
            is_array($existingSettings['pricingSettings'] ?? null) ? $existingSettings['pricingSettings'] : [],
            $availableCurrencies
        );

        return [
            'hubBaseUrl' => self::normalizeHubBaseUrl($input['hubBaseUrl'] ?? null),
            'adminApiToken' => $submittedToken ?? $existingToken,
            'defaultDashboardLanguage' => self::resolveLocale($input['defaultDashboardLanguage'] ?? null),
            'uiSettings' => self::normalizeUiSettings([
                'themeMode' => $uiInput['themeMode'] ?? $existingUiSettings['themeMode'],
                'appScale' => $uiInput['appScale'] ?? $existingUiSettings['appScale'],
                'clientMenu' => [
                    'title' => array_key_exists('title', $clientMenuInput)
                        ? $clientMenuInput['title']
                        : $existingUiSettings['clientMenu']['title'],
                    'placement' => array_key_exists('placement', $clientMenuInput)
                        ? $clientMenuInput['placement']
                        : $existingUiSettings['clientMenu']['placement'],
                ],
                'publicPricingMenu' => [
                    'title' => array_key_exists('title', $publicPricingMenuInput)
                        ? $publicPricingMenuInput['title']
                        : $existingUiSettings['publicPricingMenu']['title'],
                    'placement' => array_key_exists('placement', $publicPricingMenuInput)
                        ? $publicPricingMenuInput['placement']
                        : $existingUiSettings['publicPricingMenu']['placement'],
                ],
                'fonts' => [
                    'primary' => array_key_exists('primary', $fontInput)
                        ? $fontInput['primary']
                        : $existingUiSettings['fonts']['primary'],
                    'secondary' => array_key_exists('secondary', $fontInput)
                        ? $fontInput['secondary']
                        : $existingUiSettings['fonts']['secondary'],
                    'mono' => array_key_exists('mono', $fontInput)
                        ? $fontInput['mono']
                        : $existingUiSettings['fonts']['mono'],
                ],
                'colors' => [
                    'background' => array_key_exists('background', $colorInput)
                        ? $colorInput['background']
                        : $existingUiSettings['colors']['background'],
                    'surface' => array_key_exists('surface', $colorInput)
                        ? $colorInput['surface']
                        : $existingUiSettings['colors']['surface'],
                    'copy' => array_key_exists('copy', $colorInput)
                        ? $colorInput['copy']
                        : $existingUiSettings['colors']['copy'],
                    'primary' => array_key_exists('primary', $colorInput)
                        ? $colorInput['primary']
                        : $existingUiSettings['colors']['primary'],
                    'secondary' => array_key_exists('secondary', $colorInput)
                        ? $colorInput['secondary']
                        : $existingUiSettings['colors']['secondary'],
                    'buttonPrimaryBg' => array_key_exists('buttonPrimaryBg', $colorInput)
                        ? $colorInput['buttonPrimaryBg']
                        : $existingUiSettings['colors']['buttonPrimaryBg'],
                    'buttonPrimaryText' => array_key_exists('buttonPrimaryText', $colorInput)
                        ? $colorInput['buttonPrimaryText']
                        : $existingUiSettings['colors']['buttonPrimaryText'],
                    'buttonSecondaryBg' => array_key_exists('buttonSecondaryBg', $colorInput)
                        ? $colorInput['buttonSecondaryBg']
                        : $existingUiSettings['colors']['buttonSecondaryBg'],
                    'buttonSecondaryText' => array_key_exists('buttonSecondaryText', $colorInput)
                        ? $colorInput['buttonSecondaryText']
                        : $existingUiSettings['colors']['buttonSecondaryText'],
                ],
            ]),
            'emailSettings' => self::normalizeEmailSettings([
                'subject' => array_key_exists('subject', $emailInput)
                    ? $emailInput['subject']
                    : $existingEmailSettings['subject'],
                'content' => array_key_exists('content', $emailInput)
                    ? $emailInput['content']
                    : $existingEmailSettings['content'],
                'fromName' => array_key_exists('fromName', $emailInput)
                    ? $emailInput['fromName']
                    : $existingEmailSettings['fromName'],
            ]),
            'featureSettings' => self::normalizeFeatureSettings([
                'enableVpn' => array_key_exists('enableVpn', $featureInput)
                    ? $featureInput['enableVpn']
                    : $existingFeatureSettings['enableVpn'],
            ]),
            'cloudVpsSettings' => $this->prepareCloudVpsSettingsForSave(
                $cloudVpsInput,
                $existingCloudVpsSettings
            ),
            'pricingSettings' => $this->preparePricingSettingsForSave(
                $pricingInput,
                $existingPricingSettings,
                $availableCurrencies
            ),
        ];
    }

    /**
     * @param array<string, mixed> $pricingInput
     * @param array<string, mixed> $existingPricingSettings
     * @param array<int, array<string, mixed>> $availableCurrencies
     * @return array<string, mixed>
     */
    private function preparePricingSettingsForSave(
        array $pricingInput,
        array $existingPricingSettings,
        array $availableCurrencies
    ): array {
        $commissionRaw = $pricingInput['commissionPercent'] ?? $existingPricingSettings['commissionPercent'] ?? 0;

        if ($commissionRaw === '' || !is_numeric($commissionRaw) || (float) $commissionRaw < 0) {
            throw new ValidationException('Commission percent must be 0 or greater.');
        }

        $inputCurrencies = is_array($pricingInput['currencies'] ?? null) ? $pricingInput['currencies'] : [];
        $currencies = [];

        foreach ($availableCurrencies as $currency) {
            if (!is_array($currency)) {
                continue;
            }

            $currencyId = isset($currency['id']) && is_numeric($currency['id']) ? (int) $currency['id'] : 0;

            if ($currencyId <= 0) {
                continue;
            }

            $currencyCode = strtoupper(trim((string) ($currency['code'] ?? '')));
            $existingCurrency = is_array($existingPricingSettings['currencies'][(string) $currencyId] ?? null)
                ? $existingPricingSettings['currencies'][(string) $currencyId]
                : [];
            $submittedCurrency = is_array($inputCurrencies[(string) $currencyId] ?? null)
                ? $inputCurrencies[(string) $currencyId]
                : [];
            $isEuro = $currencyCode === 'EUR';
            $eurRateRaw = array_key_exists('eurRate', $submittedCurrency)
                ? $submittedCurrency['eurRate']
                : ($existingCurrency['eurRate'] ?? null);
            $eurRate = $isEuro ? 1.0 : self::sanitizeEurRate($eurRateRaw);
            $enabled = $isEuro ? true : ($eurRate !== null);

            if ($enabled && !$isEuro && $eurRate === null) {
                throw new ValidationException(
                    sprintf('Please enter a valid EUR rate for %s.', $currencyCode !== '' ? $currencyCode : ('#' . $currencyId))
                );
            }

            $currencies[(string) $currencyId] = [
                'enabled' => $enabled,
                'eurRate' => $eurRate,
                'code' => $currencyCode !== '' ? $currencyCode : ('CUR' . $currencyId),
                'prefix' => trim((string) ($currency['prefix'] ?? '')),
                'suffix' => trim((string) ($currency['suffix'] ?? '')),
                'format' => trim((string) ($currency['format'] ?? '')),
            ];
        }

        return [
            'commissionPercent' => self::sanitizeCommissionPercent($commissionRaw),
            'currencies' => $currencies,
        ];
    }

    /**
     * @param array<string, mixed> $cloudVpsInput
     * @param array{
     *   hiddenCountryCodes: array<int, string>,
     *   hiddenDatacenterKeys: array<int, string>,
     *   displayDatacenterName: bool
     * } $existingCloudVpsSettings
     * @return array{
     *   hiddenCountryCodes: array<int, string>,
     *   hiddenDatacenterKeys: array<int, string>,
     *   displayDatacenterName: bool
     * }
     */
    private function prepareCloudVpsSettingsForSave(array $cloudVpsInput, array $existingCloudVpsSettings): array
    {
        $availableCountryCodes = is_array($cloudVpsInput['availableCountryCodes'] ?? null)
            ? $cloudVpsInput['availableCountryCodes']
            : [];
        $enabledCountryCodes = is_array($cloudVpsInput['enabledCountryCodes'] ?? null)
            ? $cloudVpsInput['enabledCountryCodes']
            : [];
        $availableDatacenterKeys = is_array($cloudVpsInput['availableDatacenterKeys'] ?? null)
            ? $cloudVpsInput['availableDatacenterKeys']
            : [];
        $enabledDatacenterKeys = is_array($cloudVpsInput['enabledDatacenterKeys'] ?? null)
            ? $cloudVpsInput['enabledDatacenterKeys']
            : [];
        $displayDatacenterName = array_key_exists('displayDatacenterName', $cloudVpsInput)
            ? self::normalizeCheckboxValue($cloudVpsInput['displayDatacenterName'])
            : (bool) ($existingCloudVpsSettings['displayDatacenterName'] ?? false);
        $normalizedAvailableCountryCodes = array_fill_keys(
            self::normalizeCloudVpsSettings(['hiddenCountryCodes' => $availableCountryCodes])['hiddenCountryCodes'],
            true
        );
        $normalizedEnabledCountryCodes = array_fill_keys(
            self::normalizeCloudVpsSettings(['hiddenCountryCodes' => $enabledCountryCodes])['hiddenCountryCodes'],
            true
        );
        $normalizedAvailableDatacenterKeys = array_fill_keys(
            self::normalizeCloudVpsSettings(['hiddenDatacenterKeys' => $availableDatacenterKeys])['hiddenDatacenterKeys'],
            true
        );
        $normalizedEnabledDatacenterKeys = array_fill_keys(
            self::normalizeCloudVpsSettings(['hiddenDatacenterKeys' => $enabledDatacenterKeys])['hiddenDatacenterKeys'],
            true
        );

        if ($normalizedAvailableCountryCodes === [] && $normalizedAvailableDatacenterKeys === []) {
            return self::normalizeCloudVpsSettings([
                ...$existingCloudVpsSettings,
                'displayDatacenterName' => $displayDatacenterName,
            ]);
        }

        $hiddenCountryCodes = [];
        foreach (array_keys($normalizedAvailableCountryCodes) as $countryCode) {
            if (!isset($normalizedEnabledCountryCodes[$countryCode])) {
                $hiddenCountryCodes[] = $countryCode;
            }
        }

        $hiddenDatacenterKeys = [];
        foreach (array_keys($normalizedAvailableDatacenterKeys) as $datacenterKey) {
            if (!isset($normalizedEnabledDatacenterKeys[$datacenterKey])) {
                $hiddenDatacenterKeys[] = $datacenterKey;
            }
        }

        return self::normalizeCloudVpsSettings([
            'hiddenCountryCodes' => $hiddenCountryCodes,
            'hiddenDatacenterKeys' => $hiddenDatacenterKeys,
            'displayDatacenterName' => $displayDatacenterName,
        ]);
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
}
