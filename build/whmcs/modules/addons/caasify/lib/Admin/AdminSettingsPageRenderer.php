<?php

declare(strict_types=1);

namespace Caasify\Admin;

use Caasify\Core\Config\DashboardSettings;

final class AdminSettingsPageRenderer
{
    private const BRAND_NAME = 'Caasify';
    private const TAB_GENERAL = 'general';
    private const TAB_CLOUD_VPS = 'cloud-vps';
    private const TAB_INTERFACE = 'interface';
    private const TAB_INVOICES = 'invoices';
    private const TAB_EMAIL = 'email';
    private const DEFAULT_TAB = self::TAB_GENERAL;
    private const THEME_PREVIEW_COLOR_DEFAULTS = [
        'light' => [
            'background' => '#f6f8ff',
            'surface' => '#ffffff',
            'copy' => '#343f5e',
            'primary' => '#1d54d6',
            'secondary' => '#5368e8',
            'buttonPrimaryBg' => '#1d54d6',
            'buttonPrimaryText' => '#ffffff',
            'buttonSecondaryBg' => '#ffffff',
            'buttonSecondaryText' => '#141a2b',
        ],
        'dark' => [
            'background' => '#0b1220',
            'surface' => '#111b31',
            'copy' => '#c2cbea',
            'primary' => '#78a2ff',
            'secondary' => '#9aa7ff',
            'buttonPrimaryBg' => '#78a2ff',
            'buttonPrimaryText' => '#071126',
            'buttonSecondaryBg' => '#182642',
            'buttonSecondaryText' => '#eef7f4',
        ],
    ];

    public static function resolveActiveTab(?string $value): string
    {
        return in_array($value, self::getAvailableTabs(), true) ? (string) $value : self::DEFAULT_TAB;
    }

    public function render(
        array $language,
        array $settings,
        array $availableCurrencies = [],
        ?array $notice = null,
        string $csrfToken = '',
        string $activeTab = self::DEFAULT_TAB,
        array $cloudVpsTab = [],
        array $invoiceTab = []
    ): string {
        $activeTab = self::resolveActiveTab($activeTab);
        $brandName = self::BRAND_NAME;
        $launchCopy = $language['admin_launch_copy'] ?? 'Customize the ' . $brandName . ' WHMCS reselling module';
        $uiSettings = is_array($settings['uiSettings'] ?? null) ? $settings['uiSettings'] : [];
        $featureSettings = DashboardSettings::normalizeFeatureSettings(
            is_array($settings['featureSettings'] ?? null) ? $settings['featureSettings'] : []
        );
        $cloudVpsSettings = DashboardSettings::normalizeCloudVpsSettings(
            is_array($settings['cloudVpsSettings'] ?? null) ? $settings['cloudVpsSettings'] : []
        );
        $clientMenuSettings = DashboardSettings::normalizeClientMenuSettings(
            is_array($uiSettings['clientMenu'] ?? null) ? $uiSettings['clientMenu'] : []
        );
        $publicPricingMenuSettings = DashboardSettings::normalizePublicPricingMenuSettings(
            is_array($uiSettings['publicPricingMenu'] ?? null) ? $uiSettings['publicPricingMenu'] : []
        );
        $colorSettings = is_array($uiSettings['colors'] ?? null) ? $uiSettings['colors'] : [];
        $fontSettings = is_array($uiSettings['fonts'] ?? null) ? $uiSettings['fonts'] : [];
        $themeMode = DashboardSettings::resolveThemeMode($uiSettings['themeMode'] ?? DashboardSettings::DEFAULT_THEME_MODE);
        $themePreviewDefaults = $this->getThemePreviewColorDefaults($themeMode);
        $languageOptions = DashboardSettings::getAdminLanguageOptions();
        $clientMenuPlacementOptions = DashboardSettings::getClientMenuPlacementOptions();
        $storedAdminApiToken = is_string($settings['adminApiToken'] ?? null) ? $settings['adminApiToken'] : null;
        $hasStoredToken = $storedAdminApiToken !== null && $storedAdminApiToken !== '';
        $pricingSettings = is_array($settings['pricingSettings'] ?? null)
            ? $settings['pricingSettings']
            : DashboardSettings::getDefaultPricingSettings();
        $emailSettings = is_array($settings['emailSettings'] ?? null)
            ? $settings['emailSettings']
            : DashboardSettings::getDefaultEmailSettings();
        $tabs = [
            self::TAB_GENERAL => $language['admin_tab_general'] ?? 'General Settings',
            self::TAB_CLOUD_VPS => $language['admin_tab_cloud_vps'] ?? 'Cloud VPS Config',
            self::TAB_INTERFACE => $language['admin_tab_interface'] ?? 'Interface Customisation',
            self::TAB_INVOICES => $language['admin_tab_invoices'] ?? 'Invoices',
            self::TAB_EMAIL => $language['admin_tab_email'] ?? 'Email Config',
        ];

        ob_start();
        echo $this->renderPageStyles();
        echo '<div data-caasify-shell-wrap>';
        echo '<div data-caasify-shell>';
        echo '<div data-caasify-header>';
        echo '<p data-caasify-copy>' . $launchCopy . '</p>';
        echo '</div>';

        if (is_array($notice)) {
            $this->renderNotice($notice);
        }

        echo '<form method="post" action="" data-caasify-form data-caasify-admin-tabs>';
        echo '<input type="hidden" name="caasify[activeTab]" value="' . $this->escape($activeTab) . '" data-caasify-active-tab>';

        if ($csrfToken !== '') {
            echo '<input type="hidden" name="caasify[adminCsrfToken]" value="' . $this->escape($csrfToken) . '">';
        }

        echo '<div data-caasify-sticky-nav-wrap>';
        echo '<div data-caasify-tab-list role="tablist" aria-label="' . $this->escape($language['admin_tab_group_label'] ?? $brandName . ' settings sections') . '">';

        foreach ($tabs as $tabId => $tabLabel) {
            echo $this->renderTabButton($tabId, $tabLabel, $activeTab === $tabId);
        }

        echo '</div>';
        echo '</div>';
        echo '<div data-caasify-sections>';

        echo '<section data-caasify-section="' . $this->escape(self::TAB_GENERAL) . '" data-caasify-tab-panel="' . $this->escape(self::TAB_GENERAL) . '" data-visible="' . ($activeTab === self::TAB_GENERAL ? 'true' : 'false') . '" id="caasify-tab-' . $this->escape(self::TAB_GENERAL) . '"' . ($activeTab === self::TAB_GENERAL ? '' : ' hidden') . '>';
        echo $this->renderPanelIntro(
            self::TAB_GENERAL,
            $tabs[self::TAB_GENERAL],
            $language['admin_tab_general_copy'] ?? ''
        );
        echo '<div data-caasify-section-stack>';
        echo '<section data-caasify-card>';
        echo $this->renderSectionHeader(
            $language['admin_settings_connection_title'] ?? 'Connection',
            $language['admin_settings_connection_copy'] ?? 'Register in https://caasify.com to get the admin token'
        );
        echo '<div data-caasify-grid="connection">';
        echo $this->renderTextField(
            'Hub Base URL',
            'caasify[hubBaseUrl]',
            (string) ($settings['hubBaseUrl'] ?? ''),
            'https://hub.caasify.com',
            $language['admin_settings_connection_hub_base_url_help'] ?? 'Important: Please do not change this URL unless instructed by support.',
            'warning'
        );
        echo $this->renderPasswordField(
            'Admin API Token',
            'caasify[adminApiToken]',
            '',
            '',
            $hasStoredToken ? $this->maskToken($storedAdminApiToken) : ''
        );
        echo '</div>';
        echo '</section>';
        echo '<section data-caasify-card>';
        echo $this->renderSectionHeader(
            $language['admin_settings_pricing_title'] ?? 'Billing & Pricing',
            $language['admin_settings_pricing_copy'] ?? ''
        );
        echo '<div data-caasify-grid="pricing-meta">';
        echo $this->renderTextField(
            $language['admin_settings_pricing_commission_label'] ?? 'Global Commission (%)',
            'caasify[pricingSettings][commissionPercent]',
            $this->formatNumberInputValue($pricingSettings['commissionPercent'] ?? 0.0, 4),
            '10.00',
            $language['admin_settings_pricing_commission_help'] ?? ''
        );
        echo $this->renderTextField(
            $language['admin_settings_pricing_minimum_add_funds_label'] ?? 'Minimum Add Funds (EUR)',
            'caasify[pricingSettings][minimumAddFundsEurAmount]',
            $this->formatNumberInputValue($pricingSettings['minimumAddFundsEurAmount'] ?? 0.0, 2),
            '0.00',
            $language['admin_settings_pricing_minimum_add_funds_help'] ?? ''
        );
        echo '</div>';
        echo $this->renderPricingCurrenciesTable($language, $pricingSettings, $availableCurrencies);
        echo '</section>';
        echo '<section data-caasify-card>';
        echo $this->renderSectionHeader(
            $language['admin_settings_features_title'] ?? 'Product Features',
            $language['admin_settings_features_copy'] ?? 'Control which product lines customers can browse and purchase.'
        );
        echo '<div data-caasify-grid="connection">';
        echo $this->renderCheckboxField(
            $language['admin_settings_enable_vpn_label'] ?? 'Enable VPN',
            'caasify[featureSettings][enableVpn]',
            (bool) ($featureSettings['enableVpn'] ?? DashboardSettings::DEFAULT_ENABLE_VPN),
            $language['admin_settings_enable_vpn_help'] ?? 'When disabled, VPN purchase flows are hidden and Trojan templates are removed from VPS operating system choices.'
        );
        echo '</div>';
        echo '</section>';
        echo '</div>';
        echo '</section>';

        echo '<section data-caasify-section="' . $this->escape(self::TAB_CLOUD_VPS) . '" data-caasify-tab-panel="' . $this->escape(self::TAB_CLOUD_VPS) . '" data-visible="' . ($activeTab === self::TAB_CLOUD_VPS ? 'true' : 'false') . '" id="caasify-tab-' . $this->escape(self::TAB_CLOUD_VPS) . '"' . ($activeTab === self::TAB_CLOUD_VPS ? '' : ' hidden') . '>';
        echo $this->renderPanelIntro(
            self::TAB_CLOUD_VPS,
            $tabs[self::TAB_CLOUD_VPS],
            $language['admin_tab_cloud_vps_copy'] ?? ''
        );
        echo $this->renderLazyTabShell(
            self::TAB_CLOUD_VPS,
            $csrfToken,
            $language['admin_lazy_cloud_vps_loading'] ?? 'Loading Cloud VPS configuration...',
            $language['admin_lazy_cloud_vps_loading_copy'] ?? 'The latest countries and datacenters will appear here in a moment.'
        );
        echo '</section>';

        echo '<section data-caasify-section="' . $this->escape(self::TAB_INTERFACE) . '" data-caasify-tab-panel="' . $this->escape(self::TAB_INTERFACE) . '" data-visible="' . ($activeTab === self::TAB_INTERFACE ? 'true' : 'false') . '" id="caasify-tab-' . $this->escape(self::TAB_INTERFACE) . '"' . ($activeTab === self::TAB_INTERFACE ? '' : ' hidden') . '>';
        echo $this->renderPanelIntro(
            self::TAB_INTERFACE,
            $tabs[self::TAB_INTERFACE],
            $language['admin_tab_interface_copy'] ?? ''
        );
        echo '<div data-caasify-section-stack>';
        echo '<section data-caasify-card>';
        echo $this->renderSectionHeader(
            $language['admin_settings_dashboard_title'] ?? 'Dashboard Defaults',
            $language['admin_settings_dashboard_copy'] ?? ''
        );
        echo '<div data-caasify-grid="dashboard">';
        echo $this->renderSelectField(
            'Default Dashboard Language',
            'caasify[defaultDashboardLanguage]',
            $languageOptions,
            (string) ($settings['defaultDashboardLanguage'] ?? '')
        );
        echo $this->renderSelectField(
            'Default Theme Mode',
            'caasify[uiSettings][themeMode]',
            [
                'light' => $language['admin_settings_theme_mode_light'] ?? 'Light',
                'dark' => $language['admin_settings_theme_mode_dark'] ?? 'Dark',
            ],
            (string) ($uiSettings['themeMode'] ?? DashboardSettings::DEFAULT_THEME_MODE)
        );
        echo $this->renderTextField(
            'Font / Layout Scale',
            'caasify[uiSettings][appScale]',
            (string) ($uiSettings['appScale'] ?? DashboardSettings::DEFAULT_APP_SCALE),
            '0.70 - 1.25'
        );
        echo '</div>';
        echo '</section>';

        echo '<section data-caasify-card>';
        echo $this->renderSectionHeader(
            $language['admin_settings_client_menu_title'] ?? 'Client Menu',
            $language['admin_settings_client_menu_copy'] ?? 'Choose how the logged-in ' . $brandName . ' link appears in the WHMCS client navigation.'
        );
        echo '<div data-caasify-grid="connection">';
        echo $this->renderTextField(
            $language['admin_settings_client_menu_label'] ?? 'Menu Title',
            'caasify[uiSettings][clientMenu][title]',
            (string) ($clientMenuSettings['title'] ?? DashboardSettings::getDefaultClientMenuTitle()),
            DashboardSettings::getDefaultClientMenuTitle(),
            $language['admin_settings_client_menu_label_help'] ?? 'Shown as the navigation label for the main ' . $brandName . ' client menu link.'
        );
        echo $this->renderSelectField(
            $language['admin_settings_client_menu_place_label'] ?? 'Menu Place',
            'caasify[uiSettings][clientMenu][placement]',
            $clientMenuPlacementOptions,
            (string) ($clientMenuSettings['placement'] ?? DashboardSettings::CLIENT_MENU_PLACEMENT_MAIN_MENU),
            $language['admin_settings_client_menu_place_help'] ?? 'Show the ' . $brandName . ' link in the main menu, inside Services, or hide it completely.'
        );
        echo '</div>';
        echo '</section>';

        echo '<section data-caasify-card>';
        echo $this->renderSectionHeader(
            $language['admin_settings_public_pricing_menu_title'] ?? 'Public Pricing Menu',
            $language['admin_settings_public_pricing_menu_copy'] ?? 'Choose how the public pricing page appears in the WHMCS client navigation for guests and logged-in visitors.'
        );
        echo '<div data-caasify-grid="connection">';
        echo $this->renderTextField(
            $language['admin_settings_public_pricing_menu_label'] ?? 'Menu Title',
            'caasify[uiSettings][publicPricingMenu][title]',
            (string) ($publicPricingMenuSettings['title'] ?? DashboardSettings::DEFAULT_PUBLIC_PRICING_MENU_TITLE),
            DashboardSettings::DEFAULT_PUBLIC_PRICING_MENU_TITLE,
            $language['admin_settings_public_pricing_menu_label_help'] ?? 'Shown as the navigation label for the public pricing page link.'
        );
        echo $this->renderSelectField(
            $language['admin_settings_public_pricing_menu_place_label'] ?? 'Menu Place',
            'caasify[uiSettings][publicPricingMenu][placement]',
            $clientMenuPlacementOptions,
            (string) ($publicPricingMenuSettings['placement'] ?? DashboardSettings::CLIENT_MENU_PLACEMENT_MAIN_MENU),
            $language['admin_settings_public_pricing_menu_place_help'] ?? 'Show the public pricing link in the main menu, inside Services, or hide it completely.'
        );
        echo '</div>';
        echo '</section>';

        echo '<section data-caasify-card>';
        echo $this->renderSectionHeader(
            $language['admin_settings_fonts_title'] ?? 'Fonts',
            $language['admin_settings_fonts_copy'] ?? 'Optional font family overrides. Leave a field empty to keep the built-in dashboard fonts.'
        );
        echo '<div data-caasify-grid="fonts">';
        echo $this->renderTextField('Primary Font Family', 'caasify[uiSettings][fonts][primary]', (string) ($fontSettings['primary'] ?? ''), 'Example: Manrope, sans-serif');
        echo $this->renderTextField('Secondary Font Family', 'caasify[uiSettings][fonts][secondary]', (string) ($fontSettings['secondary'] ?? ''), 'Example: Plus Jakarta Sans, sans-serif');
        echo $this->renderTextField('Mono Font Family', 'caasify[uiSettings][fonts][mono]', (string) ($fontSettings['mono'] ?? ''), 'Example: JetBrains Mono, monospace');
        echo '</div>';
        echo '</section>';

        echo '<section data-caasify-card>';
        echo $this->renderSectionHeader(
            $language['admin_settings_colors_title'] ?? 'Colors',
            $language['admin_settings_colors_copy'] ?? 'Optional color overrides for the dashboard theme. Leave fields empty to keep the default palette.'
        );
        echo '<div data-caasify-grid="colors">';
        echo $this->renderColorField('Background Color', 'caasify[uiSettings][colors][background]', 'background', (string) ($colorSettings['background'] ?? ''), $themePreviewDefaults['background']);
        echo $this->renderColorField('Surface Color', 'caasify[uiSettings][colors][surface]', 'surface', (string) ($colorSettings['surface'] ?? ''), $themePreviewDefaults['surface']);
        echo $this->renderColorField('Copy Color', 'caasify[uiSettings][colors][copy]', 'copy', (string) ($colorSettings['copy'] ?? ''), $themePreviewDefaults['copy']);
        echo $this->renderColorField('Primary Color', 'caasify[uiSettings][colors][primary]', 'primary', (string) ($colorSettings['primary'] ?? ''), $themePreviewDefaults['primary']);
        echo $this->renderColorField('Secondary Color', 'caasify[uiSettings][colors][secondary]', 'secondary', (string) ($colorSettings['secondary'] ?? ''), $themePreviewDefaults['secondary']);
        echo $this->renderColorField('Primary Button Background', 'caasify[uiSettings][colors][buttonPrimaryBg]', 'buttonPrimaryBg', (string) ($colorSettings['buttonPrimaryBg'] ?? ''), $themePreviewDefaults['buttonPrimaryBg']);
        echo $this->renderColorField('Primary Button Text', 'caasify[uiSettings][colors][buttonPrimaryText]', 'buttonPrimaryText', (string) ($colorSettings['buttonPrimaryText'] ?? ''), $themePreviewDefaults['buttonPrimaryText']);
        echo $this->renderColorField('Secondary Button Background', 'caasify[uiSettings][colors][buttonSecondaryBg]', 'buttonSecondaryBg', (string) ($colorSettings['buttonSecondaryBg'] ?? ''), $themePreviewDefaults['buttonSecondaryBg']);
        echo $this->renderColorField('Secondary Button Text', 'caasify[uiSettings][colors][buttonSecondaryText]', 'buttonSecondaryText', (string) ($colorSettings['buttonSecondaryText'] ?? ''), $themePreviewDefaults['buttonSecondaryText']);
        echo '</div>';
        echo '</section>';
        echo '</div>';
        echo '</section>';

        echo '<section data-caasify-section="' . $this->escape(self::TAB_INVOICES) . '" data-caasify-tab-panel="' . $this->escape(self::TAB_INVOICES) . '" data-visible="' . ($activeTab === self::TAB_INVOICES ? 'true' : 'false') . '" id="caasify-tab-' . $this->escape(self::TAB_INVOICES) . '"' . ($activeTab === self::TAB_INVOICES ? '' : ' hidden') . '>';
        echo $this->renderPanelIntro(
            self::TAB_INVOICES,
            $tabs[self::TAB_INVOICES],
            $language['admin_tab_invoices_copy'] ?? 'Review top-up invoices, payment status, and whether the balance was charged successfully.'
        );
        echo $this->renderLazyTabShell(
            self::TAB_INVOICES,
            $csrfToken,
            $language['admin_lazy_invoices_loading'] ?? 'Loading invoice history...',
            $language['admin_lazy_invoices_loading_copy'] ?? 'The latest addon invoice records will appear here in a moment.'
        );
        echo '</section>';

        echo '<section data-caasify-section="' . $this->escape(self::TAB_EMAIL) . '" data-caasify-tab-panel="' . $this->escape(self::TAB_EMAIL) . '" data-visible="' . ($activeTab === self::TAB_EMAIL ? 'true' : 'false') . '" id="caasify-tab-' . $this->escape(self::TAB_EMAIL) . '"' . ($activeTab === self::TAB_EMAIL ? '' : ' hidden') . '>';
        echo $this->renderPanelIntro(
            self::TAB_EMAIL,
            $tabs[self::TAB_EMAIL],
            $language['admin_tab_email_copy'] ?? ''
        );
        echo '<div data-caasify-section-stack>';
        echo '<section data-caasify-card>';
        echo $this->renderSectionHeader(
            $language['admin_settings_email_title'] ?? $brandName . ' Template',
            $language['admin_settings_email_copy'] ?? ''
        );
        echo '<div data-caasify-grid="connection">';
        echo $this->renderTextField(
            $language['admin_settings_email_subject_label'] ?? 'Email Subject',
            'caasify[emailSettings][subject]',
            (string) ($emailSettings['subject'] ?? ''),
            'Welcome to ' . $brandName,
            $language['admin_settings_email_subject_help'] ?? ''
        );
        echo $this->renderTextField(
            $language['admin_settings_email_from_name_label'] ?? 'Email From Name',
            'caasify[emailSettings][fromName]',
            (string) ($emailSettings['fromName'] ?? ''),
            $brandName . ' Team',
            $language['admin_settings_email_from_name_help'] ?? ''
        );
        echo '</div>';
        echo $this->renderTextAreaField(
            $language['admin_settings_email_content_label'] ?? 'Email Content',
            'caasify[emailSettings][content]',
            (string) ($emailSettings['content'] ?? ''),
            'Write the email content that ' . $brandName . ' should send.',
            $language['admin_settings_email_content_help'] ?? ''
        );
        echo '</section>';
        echo '</div>';
        echo '</section>';

        echo '</div>';
        echo '<div data-caasify-actions' . ($this->tabHasSaveAction($activeTab) ? '' : ' hidden') . '>';
        echo '<button type="submit" data-caasify-save>';
        echo $this->escape($language['admin_settings_save_action'] ?? 'Save Settings');
        echo '</button>';
        echo '</div>';
        echo '</form>';
        echo $this->renderTabsScript();
        echo '</div>';
        echo '</div>';

        return (string) ob_get_clean();
    }

    public function renderLazyTabContent(
        string $tabId,
        array $language,
        array $settings,
        array $cloudVpsTab = [],
        array $invoiceTab = []
    ): string {
        $tabId = self::resolveActiveTab($tabId);
        if ($tabId === self::TAB_CLOUD_VPS) {
            $cloudVpsSettings = DashboardSettings::normalizeCloudVpsSettings(
                is_array($settings['cloudVpsSettings'] ?? null) ? $settings['cloudVpsSettings'] : []
            );
            $cloudVpsTab = $this->normalizeCloudVpsTabData($cloudVpsTab);
            $html = '';

            if ($cloudVpsTab['errorMessage'] !== '') {
                return $html . $this->renderEmptyTabState($cloudVpsTab['errorMessage']);
            }

            $html .= '<section data-caasify-card>';
            $html .= $this->renderSectionHeader(
                $language['admin_settings_cloud_vps_display_title'] ?? '',
                $language['admin_settings_cloud_vps_display_copy'] ?? ''
            );
            $html .= $this->renderCheckboxField(
                $language['admin_settings_cloud_vps_display_label'] ?? 'Display Datacenter name',
                'caasify[cloudVpsSettings][displayDatacenterName]',
                $cloudVpsSettings['displayDatacenterName'] === true,
                $language['admin_settings_cloud_vps_display_help'] ?? 'When enabled, customers can see the datacenter name on pricing, deployment, and server management pages.'
            );
            $html .= '</section>';

            $html .= '<section data-caasify-card>';
            $html .= $this->renderSectionHeader(
                $language['admin_settings_cloud_vps_locations_title'] ?? 'Countries',
                $language['admin_settings_cloud_vps_locations_copy'] ?? 'Uncheck the country that you want to stop selling'
            );
            $html .= $this->renderCloudVpsChecklist(
                'caasify[cloudVpsSettings][availableCountryCodes][]',
                'caasify[cloudVpsSettings][enabledCountryCodes][]',
                $cloudVpsTab['countries'],
                $cloudVpsSettings['hiddenCountryCodes'],
                $language['admin_settings_cloud_vps_locations_empty'] ?? 'No countries are available from the API right now.',
                static fn (array $country): string => (string) ($country['code'] ?? ''),
                static fn (array $country): string => (string) ($country['name'] ?? 'Unknown'),
                static fn (array $country): string => ''
            );
            $html .= '</section>';

            $html .= '<section data-caasify-card>';
            $html .= $this->renderSectionHeader(
                $language['admin_settings_cloud_vps_datacenters_title'] ?? 'Datacenters',
                $language['admin_settings_cloud_vps_datacenters_copy'] ?? 'Uncheck the datacenter that you want to stop selling'
            );
            $html .= $this->renderCloudVpsChecklist(
                'caasify[cloudVpsSettings][availableDatacenterKeys][]',
                'caasify[cloudVpsSettings][enabledDatacenterKeys][]',
                $cloudVpsTab['datacenters'],
                $cloudVpsSettings['hiddenDatacenterKeys'],
                $language['admin_settings_cloud_vps_datacenters_empty'] ?? 'No datacenters are available from the API right now.',
                static fn (array $datacenter): string => (string) ($datacenter['key'] ?? ''),
                static fn (array $datacenter): string => (string) ($datacenter['name'] ?? 'Unknown datacenter'),
                static fn (array $datacenter): string => (string) ($datacenter['countryLabel'] ?? '')
            );
            $html .= '</section>';

            return $html;
        }

        if ($tabId === self::TAB_INVOICES) {
            return $this->renderInvoicesPanel(
                $language,
                $this->normalizeInvoiceTabData($invoiceTab)
            );
        }

        return '';
    }

    public static function isLazyTab(string $tabId): bool
    {
        return in_array($tabId, [self::TAB_CLOUD_VPS, self::TAB_INVOICES], true);
    }

    private function renderNotice(array $notice): void
    {
        $isSuccess = ($notice['type'] ?? '') === 'success';

        echo '<div data-caasify-notice="' . ($isSuccess ? 'success' : 'error') . '">';
        echo $this->escape((string) ($notice['message'] ?? ''));
        echo '</div>';
    }

    private function renderPageStyles(): string
    {
        return '<style>'
            . '[data-caasify-shell-wrap]{padding:18px 0 42px;}'
            . '[data-caasify-shell],[data-caasify-shell] *{box-sizing:border-box;}'
            . '[data-caasify-shell]{width:100%;max-width:none;min-width:0;padding:32px 36px 30px;border:1px solid #dbe3f0;border-radius:30px;background:linear-gradient(180deg,#f8fafc 0%,#f4f7fb 100%);box-shadow:0 1px 3px rgba(15,23,42,.05),0 24px 48px rgba(15,23,42,.08);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}'
            . '[data-caasify-header]{display:grid;gap:10px;margin-bottom:12px;}'
            . '[data-caasify-copy]{margin:0;max-width:720px;font-size:16px;line-height:1.7;color:#546274;}'
            . '[data-caasify-form]{display:grid;gap:28px;min-width:0;}'
            . '[data-caasify-sticky-nav-wrap]{position:sticky;top:18px;z-index:30;padding-top:4px;}'
            . '[data-caasify-tab-list]{display:flex;flex-wrap:wrap;gap:8px;width:fit-content;max-width:100%;padding:8px;border:1px solid rgba(191,200,214,.7);border-radius:999px;background:rgba(255,255,255,.82);backdrop-filter:blur(16px);box-shadow:0 18px 40px rgba(148,163,184,.16);}'
            . '[data-caasify-tab]{appearance:none;display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 18px;border:0;border-radius:999px;background:transparent;color:#64748b;font-size:13px;line-height:1.2;font-weight:700;letter-spacing:.03em;cursor:pointer;transition:background-color .18s ease,color .18s ease,box-shadow .18s ease;}'
            . '[data-caasify-tab][aria-selected="true"]{background:#ffffff;color:#1d4ed8;box-shadow:0 8px 18px rgba(148,163,184,.24);}'
            . '[data-caasify-sections]{display:grid;gap:26px;min-width:0;}'
            . '[data-caasify-section]{gap:16px;min-width:0;}'
            . '[data-caasify-section-stack]{display:grid;gap:18px;min-width:0;}'
            . '[data-caasify-tab-panel]{display:none;gap:18px;min-width:0;}'
            . '[data-caasify-tab-panel][data-visible="true"]{display:grid;}'
            . '[data-caasify-panel-intro]{display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;align-items:start;padding:2px 2px 0;}'
            . '[data-caasify-panel-icon]{display:grid;place-items:center;width:46px;height:46px;border-radius:16px;background:linear-gradient(180deg,#dbeafe 0%,#eff6ff 100%);color:#2563eb;border:1px solid #bfdbfe;box-shadow:inset 0 1px 0 rgba(255,255,255,.6);}'
            . '[data-caasify-panel-icon] svg{width:20px;height:20px;display:block;}'
            . '[data-caasify-panel-meta]{display:grid;gap:5px;min-width:0;}'
            . '[data-caasify-panel-kicker]{margin:0;font-size:11px;line-height:1.4;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#64748b;}'
            . '[data-caasify-panel-title]{margin:0;font-size:27px;line-height:1.08;letter-spacing:-.03em;font-weight:700;color:#0f172a;}'
            . '[data-caasify-panel-copy]{margin:0;max-width:760px;font-size:15px;line-height:1.7;color:#64748b;}'
            . '[data-caasify-card]{padding:26px;border:1px solid #dbe3f0;border-radius:24px;background:#ffffff;box-shadow:0 16px 38px rgba(148,163,184,.08);}'
            . '[data-caasify-section-header]{display:grid;gap:6px;margin-bottom:20px;}'
            . '[data-caasify-section-title]{margin:0;font-size:20px;line-height:1.2;letter-spacing:-.02em;font-weight:700;color:#0f172a;}'
            . '[data-caasify-section-copy]{margin:0;font-size:14px;line-height:1.65;color:#64748b;}'
            . '[data-caasify-grid]{display:grid;gap:18px;}'
            . '[data-caasify-grid="connection"]{grid-template-columns:repeat(auto-fit,minmax(280px,1fr));}'
            . '[data-caasify-grid="dashboard"]{grid-template-columns:repeat(auto-fit,minmax(220px,1fr));}'
            . '[data-caasify-grid="fonts"]{grid-template-columns:repeat(auto-fit,minmax(220px,1fr));}'
            . '[data-caasify-grid="colors"]{grid-template-columns:repeat(auto-fit,minmax(220px,1fr));}'
            . '[data-caasify-grid="pricing-meta"]{grid-template-columns:repeat(auto-fit,minmax(240px,360px));}'
            . '[data-caasify-field]{display:grid;gap:10px;color:#0f172a;min-width:0;}'
            . '[data-caasify-label]{font-size:11px;line-height:1.4;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#64748b;}'
            . '[data-caasify-input],[data-caasify-select]{width:100%;height:48px;padding:0 15px;border:1px solid #cbd5e1;border-radius:14px;background:#f8fafc;color:#0f172a;font-size:14px;transition:border-color .16s ease,box-shadow .16s ease,background-color .16s ease;box-sizing:border-box;}'
            . '[data-caasify-textarea]{width:100%;min-height:220px;padding:16px 18px;border:1px solid #cbd5e1;border-radius:18px;background:#f8fafc;color:#0f172a;font-size:14px;line-height:1.7;transition:border-color .16s ease,box-shadow .16s ease,background-color .16s ease;box-sizing:border-box;resize:vertical;font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,monospace;}'
            . '[data-caasify-input]::placeholder,[data-caasify-textarea]::placeholder{color:#94a3b8;}'
            . '[data-caasify-input]:focus,[data-caasify-select]:focus,[data-caasify-textarea]:focus{outline:none;border-color:#2563eb;background:#ffffff;box-shadow:0 0 0 4px rgba(37,99,235,.12);}'
            . '[data-caasify-help]{font-size:12px;line-height:1.6;color:#64748b;}'
            . '[data-caasify-help-tone="warning"]{color:#dc2626;font-weight:600;}'
            . '[data-caasify-pricing-table-wrap],[data-caasify-table-wrap]{overflow:auto;border:1px solid #dbe3f0;border-radius:20px;background:#f8fafc;}'
            . '[data-caasify-pricing-table],[data-caasify-table]{width:100%;border-collapse:separate;border-spacing:0;min-width:760px;}'
            . '[data-caasify-table]{min-width:980px;}'
            . '[data-caasify-pricing-table] th,[data-caasify-table] thead th{padding:16px 18px;border-bottom:1px solid #dbe3f0;background:#eff4fb;text-align:left;font-size:11px;line-height:1.4;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#64748b;}'
            . '[data-caasify-pricing-table] td,[data-caasify-table] tbody td{padding:18px;border-bottom:1px solid #e2e8f0;font-size:14px;line-height:1.6;color:#1e293b;vertical-align:top;background:#ffffff;}'
            . '[data-caasify-pricing-table] tbody tr:last-child td,[data-caasify-table] tbody tr:last-child td{border-bottom:0;}'
            . '[data-caasify-pricing-table] tbody tr:nth-child(even) td,[data-caasify-table] tbody tr:nth-child(even) td{background:#f8fafc;}'
            . '[data-caasify-checkbox]{display:inline-flex;align-items:flex-start;gap:10px;font-size:14px;line-height:1.5;color:#0f172a;font-weight:600;}'
            . '[data-caasify-checkbox] input{width:18px;height:18px;margin:1px 0 0;accent-color:#2563eb;}'
            . '[data-caasify-checklist]{display:grid;gap:14px;}'
            . '[data-caasify-checklist-grid]{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));}'
            . '[data-caasify-check-item]{display:grid;gap:10px;padding:14px 16px;border:1px solid #dbe3f0;border-radius:18px;background:#f8fafc;}'
            . '[data-caasify-check-item-copy]{margin:0;font-size:12px;line-height:1.6;color:#64748b;}'
            . '[data-caasify-color-row]{display:flex;align-items:center;gap:12px;min-width:0;}'
            . '[data-caasify-swatch]{width:24px;height:24px;flex:0 0 24px;border-radius:999px;border:1px solid #cbd5e1;box-shadow:inset 0 1px 0 rgba(255,255,255,.8);}'
            . '[data-caasify-swatch][data-empty="true"]{background-image:linear-gradient(135deg,rgba(37,99,235,.08) 25%,transparent 25%,transparent 50%,rgba(37,99,235,.08) 50%,rgba(37,99,235,.08) 75%,transparent 75%,transparent);background-size:8px 8px;}'
            . '[data-caasify-toolbar]{display:flex;flex-wrap:wrap;align-items:end;justify-content:space-between;gap:18px;}'
            . '[data-caasify-toolbar-meta]{display:grid;gap:6px;}'
            . '[data-caasify-toolbar-title]{margin:0;font-size:15px;line-height:1.5;font-weight:700;color:#0f172a;}'
            . '[data-caasify-toolbar-copy],[data-caasify-summary]{margin:0;font-size:14px;line-height:1.65;color:#64748b;}'
            . '[data-caasify-toolbar-controls]{display:flex;flex-wrap:wrap;align-items:end;gap:12px;}'
            . '[data-caasify-toolbar-field]{display:grid;gap:8px;min-width:220px;}'
            . '[data-caasify-toolbar-label]{font-size:11px;line-height:1.4;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#64748b;}'
            . '[data-caasify-toolbar-button],[data-caasify-toolbar-link]{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:0 18px;border-radius:14px;font-size:14px;font-weight:700;text-decoration:none;cursor:pointer;box-sizing:border-box;transition:transform .18s ease,box-shadow .18s ease,background-color .18s ease;}'
            . '[data-caasify-toolbar-button]{border:0;background:#0f172a;color:#ffffff;box-shadow:0 16px 34px rgba(15,23,42,.18);}'
            . '[data-caasify-toolbar-link]{border:1px solid #cbd5e1;background:#ffffff;color:#0f172a;}'
            . '[data-caasify-table-empty]{display:grid;place-items:center;min-height:160px;padding:24px;text-align:center;font-size:15px;line-height:1.7;color:#64748b;}'
            . '[data-caasify-badge-stack]{display:flex;flex-wrap:wrap;gap:8px;}'
            . '[data-caasify-badge]{display:inline-flex;align-items:center;justify-content:center;min-height:28px;padding:0 12px;border-radius:999px;font-size:12px;line-height:1;font-weight:800;white-space:nowrap;}'
            . '[data-caasify-badge="paid"]{background:#dbeafe;color:#1d4ed8;}'
            . '[data-caasify-badge="unpaid"]{background:#fee2e2;color:#b91c1c;}'
            . '[data-caasify-badge="charged"]{background:#dcfce7;color:#15803d;}'
            . '[data-caasify-badge="not-charged"]{background:#fee2e2;color:#b91c1c;}'
            . '[data-caasify-badge="neutral"]{background:#e2e8f0;color:#475569;}'
            . '[data-caasify-pagination]{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px;margin-top:18px;}'
            . '[data-caasify-pagination-pages]{display:flex;flex-wrap:wrap;gap:8px;}'
            . '[data-caasify-page-link]{display:inline-flex;align-items:center;justify-content:center;min-width:42px;min-height:42px;padding:0 14px;border:1px solid #cbd5e1;border-radius:12px;background:#ffffff;color:#0f172a;font-size:14px;font-weight:700;text-decoration:none;}'
            . '[data-caasify-page-link][aria-current="page"]{border-color:#2563eb;background:#2563eb;color:#ffffff;}'
            . '[data-caasify-page-link][data-disabled="true"]{pointer-events:none;opacity:.45;}'
            . '[data-caasify-actions]{position:sticky;bottom:12px;z-index:25;display:flex;justify-content:flex-end;padding-top:4px;}'
            . '[data-caasify-save]{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 22px;border:0;border-radius:16px;background:#2563eb;color:#ffffff;font-size:14px;font-weight:800;letter-spacing:.02em;cursor:pointer;box-shadow:0 18px 36px rgba(37,99,235,.28);}'
            . '[data-caasify-notice]{margin-bottom:8px;padding:16px 18px;border-radius:18px;border:1px solid transparent;font-size:14px;line-height:1.6;}'
            . '[data-caasify-notice="success"]{background:#effdf5;border-color:#bbf7d0;color:#166534;}'
            . '[data-caasify-notice="error"]{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}'
            . '[data-caasify-empty]{min-height:200px;display:grid;place-items:center;padding:24px;border:1px dashed #cbd5e1;border-radius:22px;background:#ffffff;}'
            . '[data-caasify-empty-copy]{max-width:420px;margin:0;text-align:center;font-size:15px;line-height:1.7;color:#64748b;}'
            . '[data-caasify-lazy-placeholder]{min-height:220px;display:grid;place-items:center;grid-template-columns:auto minmax(0,420px);gap:18px;padding:28px;border:1px dashed #cbd5e1;border-radius:22px;background:rgba(255,255,255,.74);}'
            . '[data-caasify-lazy-placeholder="error"]{border-style:solid;border-color:#fed7aa;background:#fff7ed;}'
            . '[data-caasify-lazy-icon]{width:40px;height:40px;border-radius:999px;position:relative;box-sizing:border-box;}'
            . '[data-caasify-lazy-icon="loading"]{border:3px solid #bfdbfe;border-top-color:#2563eb;animation:caasify-lazy-spin .85s linear infinite;}'
            . '[data-caasify-lazy-icon="error"]{background:#fee2e2;}'
            . '[data-caasify-lazy-icon="error"]::before,[data-caasify-lazy-icon="error"]::after{content:"";position:absolute;top:50%;left:50%;width:18px;height:2px;background:#b91c1c;border-radius:999px;}'
            . '[data-caasify-lazy-icon="error"]::before{transform:translate(-50%,-50%) rotate(45deg);}'
            . '[data-caasify-lazy-icon="error"]::after{transform:translate(-50%,-50%) rotate(-45deg);}'
            . '[data-caasify-lazy-copy]{display:grid;gap:8px;justify-items:start;}'
            . '[data-caasify-lazy-title]{margin:0;font-size:18px;line-height:1.35;font-weight:700;color:#0f172a;}'
            . '[data-caasify-lazy-text]{margin:0;font-size:14px;line-height:1.65;color:#64748b;}'
            . '[data-caasify-lazy-retry]{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 16px;border:1px solid #cbd5e1;border-radius:14px;background:#ffffff;color:#0f172a;font-size:14px;font-weight:700;cursor:pointer;}'
            . '@keyframes caasify-lazy-spin{to{transform:rotate(360deg);}}'
            . '@media (max-width: 900px){'
            . '[data-caasify-shell]{padding:24px 20px 24px;border-radius:24px;}'
            . '[data-caasify-tab-list]{width:100%;}'
            . '[data-caasify-tab]{flex:1 1 auto;}'
            . '[data-caasify-toolbar]{align-items:stretch;}'
            . '[data-caasify-toolbar-meta],[data-caasify-toolbar-controls]{width:100%;}'
            . '[data-caasify-toolbar-field]{min-width:100%;}'
            . '[data-caasify-lazy-placeholder]{grid-template-columns:1fr;justify-items:center;text-align:center;}'
            . '[data-caasify-lazy-copy]{justify-items:center;}'
            . '}'
            . '@media (max-width: 720px){'
            . '[data-caasify-shell-wrap]{padding:10px 0 26px;}'
            . '[data-caasify-shell]{padding:18px 14px 18px;border-radius:20px;}'
            . '[data-caasify-form]{gap:22px;}'
            . '[data-caasify-sticky-nav-wrap]{top:10px;}'
            . '[data-caasify-tab-list]{gap:6px;padding:6px;border-radius:24px;}'
            . '[data-caasify-tab]{width:100%;}'
            . '[data-caasify-panel-intro]{grid-template-columns:1fr;}'
            . '[data-caasify-panel-title]{font-size:23px;}'
            . '[data-caasify-card]{padding:18px;border-radius:18px;}'
            . '[data-caasify-grid="connection"],[data-caasify-grid="dashboard"],[data-caasify-grid="fonts"],[data-caasify-grid="colors"],[data-caasify-grid="pricing-meta"],[data-caasify-checklist-grid]{grid-template-columns:minmax(0,1fr);}'
            . '[data-caasify-color-row]{flex-wrap:wrap;align-items:flex-start;}'
            . '[data-caasify-toolbar-controls]{flex-direction:column;align-items:stretch;}'
            . '[data-caasify-toolbar-button],[data-caasify-toolbar-link]{width:100%;}'
            . '[data-caasify-pagination]{flex-direction:column;align-items:stretch;}'
            . '[data-caasify-pagination-pages]{width:100%;}'
            . '[data-caasify-page-link]{flex:1 1 0;}'
            . '[data-caasify-actions]{justify-content:stretch;}'
            . '[data-caasify-save]{width:100%;}'
            . '[data-caasify-pricing-table-wrap],[data-caasify-table-wrap]{overflow:visible;border:0;background:transparent;}'
            . '[data-caasify-pricing-table],[data-caasify-pricing-table] tbody,[data-caasify-pricing-table] tr,[data-caasify-table],[data-caasify-table] tbody,[data-caasify-table] tr{display:block;width:100%;min-width:0;}'
            . '[data-caasify-pricing-table] thead,[data-caasify-table] thead{display:none;}'
            . '[data-caasify-pricing-table] tbody,[data-caasify-table] tbody{display:grid;gap:14px;}'
            . '[data-caasify-pricing-table] tr,[data-caasify-table] tr{display:grid;gap:12px;padding:16px;border:1px solid #dbe3f0;border-radius:18px;background:#ffffff;box-shadow:0 10px 24px rgba(148,163,184,.08);}'
            . '[data-caasify-pricing-table] td,[data-caasify-table] tbody td{display:grid;gap:6px;padding:0;border:0;background:transparent !important;}'
            . '[data-caasify-pricing-table] td::before,[data-caasify-table] tbody td::before{content:attr(data-label);font-size:11px;line-height:1.4;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#64748b;}'
            . '}'
            . '</style>';
    }

    private function renderTabButton(string $tabId, string $tabLabel, bool $isActive): string
    {
        return '<button type="button" data-caasify-tab="' . $this->escape($tabId) . '" role="tab" aria-selected="' . ($isActive ? 'true' : 'false') . '">'
            . $this->escape($tabLabel)
            . '</button>';
    }

    private function renderPanelIntro(string $tabId, string $title, string $copy): string
    {
        $html = '<div data-caasify-panel-intro>';
        $html .= '<div data-caasify-panel-icon>' . $this->renderSectionIcon($tabId) . '</div>';
        $html .= '<div data-caasify-panel-meta>';
        $html .= '<p data-caasify-panel-kicker>' . $this->escape($this->resolveSectionEyebrow($tabId)) . '</p>';

        if ($title !== '') {
            $html .= '<h3 data-caasify-panel-title>' . $this->escape($title) . '</h3>';
        }

        if ($copy !== '') {
            $html .= '<p data-caasify-panel-copy>' . $this->escape($copy) . '</p>';
        }

        $html .= '</div>';
        $html .= '</div>';

        return $html;
    }

    private function resolveSectionEyebrow(string $tabId): string
    {
        return match ($tabId) {
            self::TAB_GENERAL => 'Setup',
            self::TAB_CLOUD_VPS => 'Availability',
            self::TAB_INTERFACE => 'Branding',
            self::TAB_INVOICES => 'Ledger',
            self::TAB_EMAIL => 'Messaging',
            default => 'Settings',
        };
    }

    private function renderSectionIcon(string $tabId): string
    {
        return match ($tabId) {
            self::TAB_GENERAL => '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 6h10M4 6h2m4 12h10M4 18h2m8-6h6M4 12h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="8" cy="6" r="2" stroke="currentColor" stroke-width="1.8"/><circle cx="16" cy="18" r="2" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2" stroke="currentColor" stroke-width="1.8"/></svg>',
            self::TAB_CLOUD_VPS => '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="5" width="16" height="6" rx="2" stroke="currentColor" stroke-width="1.8"/><rect x="4" y="13" width="16" height="6" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 8h.01M8 16h.01M12 8h4M12 16h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
            self::TAB_INTERFACE => '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" stroke="currentColor" stroke-width="1.8"/><path d="M8 9h8M8 13h5M8 17h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
            self::TAB_INVOICES => '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 4h10a2 2 0 0 1 2 2v13l-2-1.4L15 19l-2-1.4L11 19l-2-1.4L7 19V6a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.5 9h5M9.5 12.5h5M9.5 16h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
            self::TAB_EMAIL => '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="6" width="16" height="12" rx="2.5" stroke="currentColor" stroke-width="1.8"/><path d="m6.5 8.5 4.9 4.1a1 1 0 0 0 1.3 0l4.8-4.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            default => '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="7" stroke="currentColor" stroke-width="1.8"/></svg>',
        };
    }

    private function renderLazyTabShell(
        string $tabId,
        string $csrfToken,
        string $loadingTitle,
        string $loadingCopy
    ): string {
        $attributes = ' data-caasify-lazy-panel="' . $this->escape($tabId) . '"'
            . ' data-caasify-lazy-loaded="false"'
            . ' data-caasify-loading-title="' . $this->escape($loadingTitle) . '"'
            . ' data-caasify-loading-copy="' . $this->escape($loadingCopy) . '"'
            . ' data-caasify-lazy-url="' . $this->escape($this->buildLazyTabPanelUrl($tabId, $csrfToken)) . '"';

        return '<div data-caasify-section-stack><div' . $attributes . '>'
            . $this->renderLazyPanelPlaceholder($loadingTitle, $loadingCopy)
            . '</div></div>';
    }

    private function renderSectionHeader(string $title, string $copy): string
    {
        if ($title === '' && $copy === '') {
            return '';
        }

        $html = '<div data-caasify-section-header>';

        if ($title !== '') {
            $html .= '<h4 data-caasify-section-title>' . $this->escape($title) . '</h4>';
        }

        if ($copy !== '') {
            $html .= '<p data-caasify-section-copy>' . $this->escape($copy) . '</p>';
        }

        $html .= '</div>';

        return $html;
    }

    private function renderLazyPanelPlaceholder(string $title, string $copy, bool $isError = false, string $retryTab = ''): string
    {
        $html = '<section data-caasify-lazy-placeholder="' . ($isError ? 'error' : 'loading') . '">';
        $html .= '<div data-caasify-lazy-icon="' . ($isError ? 'error' : 'loading') . '"></div>';
        $html .= '<div data-caasify-lazy-copy>';
        $html .= '<p data-caasify-lazy-title>' . $this->escape($title) . '</p>';
        $html .= '<p data-caasify-lazy-text>' . $this->escape($copy) . '</p>';

        if ($isError && $retryTab !== '') {
            $html .= '<button type="button" data-caasify-lazy-retry="' . $this->escape($retryTab) . '">'
                . $this->escape('Retry')
                . '</button>';
        }

        $html .= '</div>';
        $html .= '</section>';

        return $html;
    }

    private function buildLazyTabPanelUrl(string $tabId, string $csrfToken): string
    {
        return $this->buildAdminQueryUrl([
            'caasifyAction' => 'tab-panel',
            'requestToken' => $csrfToken !== '' ? $csrfToken : null,
            'tab' => $tabId,
        ]);
    }

    private function renderEmptyTabState(string $message): string
    {
        return '<section data-caasify-empty>'
            . '<p data-caasify-empty-copy>' . $this->escape($message) . '</p>'
            . '</section>';
    }

    private function renderInvoicesPanel(array $language, array $invoiceTab): string
    {
        $filterOptions = $this->getInvoiceFilterOptions($language);
        $currentFilter = $this->normalizeInvoiceFilter($invoiceTab['currentFilter'] ?? null);
        $currentSearch = $this->normalizeSearchTerm($invoiceTab['currentSearch'] ?? null);
        $totalItems = (int) ($invoiceTab['totalItems'] ?? 0);
        $currentPage = max(1, (int) ($invoiceTab['currentPage'] ?? 1));
        $pageSize = max(1, (int) ($invoiceTab['pageSize'] ?? 10));
        $totalPages = max(1, (int) ($invoiceTab['totalPages'] ?? 1));
        $items = is_array($invoiceTab['items'] ?? null) ? $invoiceTab['items'] : [];
        $rangeStart = $totalItems > 0 ? (($currentPage - 1) * $pageSize) + 1 : 0;
        $rangeEnd = $totalItems > 0 ? min($totalItems, $currentPage * $pageSize) : 0;
        $resetFilterUrl = $this->buildAdminQueryUrl([
            'tab' => self::TAB_INVOICES,
            'invoicePage' => 1,
            'invoiceStatus' => null,
            'invoiceSearch' => null,
        ]);

        $html = '<section data-caasify-card>';
        $html .= '<div data-caasify-toolbar>';
        $html .= '<div data-caasify-toolbar-meta>';
        $html .= '<p data-caasify-toolbar-title>' . $this->escape($language['admin_invoices_table_title'] ?? 'List of Invoices') . '</p>';
        $html .= '<p data-caasify-toolbar-copy>' . $this->escape($language['admin_invoices_table_copy'] ?? 'This list mirrors the module top-up invoice history stored by the addon.') . '</p>';
        $html .= '<p data-caasify-summary>' . $this->escape(
            $totalItems > 0
                ? sprintf(
                    $language['admin_invoices_showing_range'] ?? 'Showing %d-%d of %d transactions',
                    $rangeStart,
                    $rangeEnd,
                    $totalItems
                )
                : ($language['admin_invoices_showing_empty'] ?? 'No transactions found for the selected filter.')
        ) . '</p>';
        $html .= '</div>';
        $html .= '<div data-caasify-toolbar-controls>';
        $html .= '<label data-caasify-toolbar-field>';
        $html .= '<span data-caasify-toolbar-label>' . $this->escape($language['admin_invoices_search_label'] ?? 'Search') . '</span>';
        $html .= '<input type="search" data-caasify-input data-caasify-invoice-search value="' . $this->escape($currentSearch) . '" placeholder="' . $this->escape($language['admin_invoices_search_placeholder'] ?? 'Invoice ID or client email') . '">';
        $html .= '</label>';
        $html .= '<label data-caasify-toolbar-field>';
        $html .= '<span data-caasify-toolbar-label>' . $this->escape($language['admin_invoices_filter_label'] ?? 'Status') . '</span>';
        $html .= '<select data-caasify-select data-caasify-invoice-filter>';

        foreach ($filterOptions as $filterValue => $filterLabel) {
            $selected = $filterValue === $currentFilter ? ' selected' : '';
            $html .= '<option value="' . $this->escape($filterValue) . '"' . $selected . '>'
                . $this->escape($filterLabel)
                . '</option>';
        }

        $html .= '</select>';
        $html .= '</label>';
        $html .= '<button type="button" data-caasify-toolbar-button data-caasify-invoice-filter-apply>'
            . $this->escape($language['admin_invoices_filter_action'] ?? 'Filter')
            . '</button>';

        if ($currentFilter !== 'all' || $currentSearch !== '') {
            $html .= '<a href="' . $this->escape($resetFilterUrl) . '" data-caasify-toolbar-link>'
                . $this->escape($language['admin_invoices_filter_reset'] ?? 'Reset')
                . '</a>';
        }

        $html .= '</div>';
        $html .= '</div>';

        if ($items === []) {
            $html .= '<div data-caasify-table-empty>' . $this->escape(
                $currentSearch !== ''
                    ? ($language['admin_invoices_empty_search'] ?? 'No invoices found for that search.')
                    : ($language['admin_invoices_empty'] ?? 'No invoices found yet.')
            ) . '</div>';
            $html .= '</section>';

            return $html;
        }

        $html .= '<div data-caasify-table-wrap>';
        $html .= '<table data-caasify-table>';
        $invoiceIdLabel = $language['admin_invoices_col_invoice_id'] ?? 'Invoice ID';
        $clientLabel = $language['admin_invoices_col_client'] ?? 'Client';
        $paidAmountLabel = $language['admin_invoices_col_paid_amount'] ?? 'Paid Amount';
        $creditedEurLabel = $language['admin_invoices_col_credited_eur'] ?? 'Credited EUR';
        $eurRateLabel = $language['admin_invoices_col_eur_rate'] ?? 'EUR Rate';
        $commissionLabel = $language['admin_invoices_col_commission_percent'] ?? 'Commission %';
        $statusLabel = $language['admin_invoices_col_status'] ?? 'Status';

        $html .= '<thead><tr>';
        $html .= '<th>' . $this->escape($invoiceIdLabel) . '</th>';
        $html .= '<th>' . $this->escape($clientLabel) . '</th>';
        $html .= '<th>' . $this->escape($paidAmountLabel) . '</th>';
        $html .= '<th>' . $this->escape($creditedEurLabel) . '</th>';
        $html .= '<th>' . $this->escape($eurRateLabel) . '</th>';
        $html .= '<th>' . $this->escape($commissionLabel) . '</th>';
        $html .= '<th>' . $this->escape($statusLabel) . '</th>';
        $html .= '</tr></thead>';
        $html .= '<tbody>';

        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }

            $html .= '<tr>';
            $html .= '<td data-label="' . $this->escape($invoiceIdLabel) . '">' . $this->escape((string) ($item['invoiceId'] ?? '')) . '</td>';
            $html .= '<td data-label="' . $this->escape($clientLabel) . '">' . $this->escape((string) ($item['client'] ?? '--')) . '</td>';
            $html .= '<td data-label="' . $this->escape($paidAmountLabel) . '">' . $this->escape((string) ($item['paidAmount'] ?? '')) . '</td>';
            $html .= '<td data-label="' . $this->escape($creditedEurLabel) . '">' . $this->escapeNullable((string) ($item['creditedEur'] ?? '')) . '</td>';
            $html .= '<td data-label="' . $this->escape($eurRateLabel) . '">' . $this->escapeNullable((string) ($item['eurRate'] ?? '')) . '</td>';
            $html .= '<td data-label="' . $this->escape($commissionLabel) . '">' . $this->escapeNullable((string) ($item['commissionPercent'] ?? '')) . '</td>';
            $html .= '<td data-label="' . $this->escape($statusLabel) . '"><div data-caasify-badge-stack>';
            $html .= $this->renderInvoiceStatusBadge(
                (string) ($item['invoiceStatus'] ?? 'Unpaid'),
                (($item['isPaid'] ?? false) === true) ? 'paid' : 'unpaid'
            );
            $html .= $this->renderInvoiceStatusBadge(
                (($item['isCharged'] ?? false) === true) ? 'Charged' : 'Not Charged',
                (($item['isCharged'] ?? false) === true) ? 'charged' : 'not-charged'
            );
            $html .= '</div></td>';
            $html .= '</tr>';
        }

        $html .= '</tbody></table>';
        $html .= '</div>';
        $html .= $this->renderInvoicePagination($currentPage, $totalPages, $totalItems, $currentFilter, $language);
        $html .= '</section>';

        return $html;
    }

    private function renderTabsScript(): string
    {
        $loadingErrorTitle = 'Unable to load this section.';
        $loadingErrorCopy = 'Please try again in a moment.';

        return '<script>'
            . '(function(){'
            . 'var root=document.querySelector("[data-caasify-admin-tabs]");'
            . 'if(!root){return;}'
            . 'var buttons=root.querySelectorAll("[data-caasify-tab]");'
            . 'var panels=root.querySelectorAll("[data-caasify-tab-panel]");'
            . 'var activeInput=root.querySelector("[data-caasify-active-tab]");'
            . 'var saveActions=root.querySelector("[data-caasify-actions]");'
            . 'var adminTokenInput=root.querySelector(\'input[name="caasify[adminCsrfToken]"]\');'
            . 'var themeModeSelect=root.querySelector(\'select[name="caasify[uiSettings][themeMode]"]\');'
            . 'var colorFields=root.querySelectorAll("[data-caasify-color-field]");'
            . 'var availableTabs={};'
            . 'var saveTabs={general:true,"cloud-vps":true,interface:true,email:true};'
            . 'var themeDefaults=' . $this->escapeForScript(json_encode(self::THEME_PREVIEW_COLOR_DEFAULTS, JSON_THROW_ON_ERROR)) . ';'
            . 'var lazyErrorTitle=' . $this->escapeForScript(json_encode($loadingErrorTitle, JSON_THROW_ON_ERROR)) . ';'
            . 'var lazyErrorCopy=' . $this->escapeForScript(json_encode($loadingErrorCopy, JSON_THROW_ON_ERROR)) . ';'
            . 'var i=0;'
            . 'for(i=0;i<panels.length;i+=1){availableTabs[panels[i].getAttribute("data-caasify-tab-panel")]=true;}'
            . 'function isHexColor(value){return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value||"");}'
            . 'function getThemeMode(){return themeModeSelect&&themeModeSelect.value==="dark"?"dark":"light";}'
            . 'function getPanel(tab){return root.querySelector(\'[data-caasify-tab-panel="\'+tab+\'"]\');}'
            . 'function getLazyPanel(tab){return root.querySelector(\'[data-caasify-lazy-panel="\'+tab+\'"]\');}'
            . 'function escapeHtml(value){return String(value||"").replace(/[&<>"\']/g,function(char){if(char==="&"){return"&amp;";}if(char==="<"){return"&lt;";}if(char===">"){return"&gt;";}if(char===String.fromCharCode(34)){return"&quot;";}return"&#39;";});}'
            . 'function buildLazyPlaceholder(title,copy,isError,tab){'
            . 'var retry=isError&&tab?\'<button type="button" data-caasify-lazy-retry="\'+escapeHtml(tab)+\'">Retry</button>\':"";'
            . 'var state=isError?"error":"loading";'
            . 'return \'<section data-caasify-lazy-placeholder="\'+state+\'"><div data-caasify-lazy-icon="\'+state+\'"></div><div data-caasify-lazy-copy><p data-caasify-lazy-title>\'+escapeHtml(title)+\'</p><p data-caasify-lazy-text>\'+escapeHtml(copy)+\'</p>\'+retry+\'</div></section>\';'
            . '}'
            . 'function updateSaveActions(selectedTab){if(saveActions){saveActions.hidden=!saveTabs[selectedTab];}}'
            . 'function syncColorField(field){'
            . 'var input=field.querySelector("[data-caasify-color-input]");'
            . 'var swatch=field.querySelector("[data-caasify-swatch]");'
            . 'var help=field.querySelector("[data-caasify-help]");'
            . 'var colorKey=field.getAttribute("data-caasify-color-field");'
            . 'var defaults=themeDefaults[getThemeMode()]||themeDefaults.light||{};'
            . 'var fallback=defaults[colorKey]||"#ffffff";'
            . 'var currentValue=input&&isHexColor(input.value.trim())?input.value.trim().toLowerCase():"";'
            . 'var effectiveColor=currentValue||fallback;'
            . 'if(input){input.placeholder=fallback;}'
            . 'if(swatch){'
            . 'swatch.style.backgroundColor=effectiveColor;'
            . 'swatch.setAttribute("data-empty",currentValue?"false":"true");'
            . 'swatch.setAttribute("title",currentValue?currentValue:"Default: "+fallback);'
            . '}'
            . 'if(help){help.textContent=currentValue?currentValue:"Default: "+fallback;}'
            . '}'
            . 'function syncAllColorFields(){for(i=0;i<colorFields.length;i+=1){syncColorField(colorFields[i]);}}'
            . 'function loadLazyPanel(tab,forceReload){'
            . 'var panel=getLazyPanel(tab);'
            . 'var requestToken=adminTokenInput&&adminTokenInput.value?adminTokenInput.value:"";'
            . 'var lazyUrl=panel?panel.getAttribute("data-caasify-lazy-url"):"";'
            . 'var requestUrl;'
            . 'if(!panel){return Promise.resolve();}'
            . 'if(panel.getAttribute("data-caasify-lazy-loading")==="true"){return Promise.resolve();}'
            . 'if(!forceReload&&panel.getAttribute("data-caasify-lazy-loaded")==="true"){return Promise.resolve();}'
            . 'panel.setAttribute("data-caasify-lazy-loading","true");'
            . 'panel.innerHTML=buildLazyPlaceholder(panel.getAttribute("data-caasify-loading-title")||"Loading...",panel.getAttribute("data-caasify-loading-copy")||"Please wait.",false,"");'
            . 'requestUrl=new URL(lazyUrl,window.location.href);'
            . 'if(requestToken){requestUrl.searchParams.set("requestToken",requestToken);}'
            . 'return fetch(requestUrl.toString(),{credentials:"same-origin",headers:{Accept:"application/json"}})'
            . '.then(function(response){return response.json().catch(function(){return null;}).then(function(payload){return{ok:response.ok,payload:payload};});})'
            . '.then(function(result){'
            . 'if(!result.ok||!result.payload||result.payload.success!==true||typeof result.payload.html!=="string"){throw new Error(result.payload&&result.payload.message?result.payload.message:lazyErrorTitle);}'
            . 'panel.innerHTML=result.payload.html;'
            . 'panel.setAttribute("data-caasify-lazy-loaded","true");'
            . '})'
            . '.catch(function(error){'
            . 'var message=error&&error.message?error.message:lazyErrorCopy;'
            . 'panel.innerHTML=buildLazyPlaceholder(lazyErrorTitle,message,true,tab);'
            . 'panel.setAttribute("data-caasify-lazy-loaded","false");'
            . '})'
            . '.finally(function(){panel.setAttribute("data-caasify-lazy-loading","false");});'
            . '}'
            . 'function setActiveTab(tab,updateHash){'
            . 'var selectedTab=availableTabs[tab]?tab:"' . self::DEFAULT_TAB . '";'
            . 'if(activeInput){activeInput.value=selectedTab;}'
            . 'updateSaveActions(selectedTab);'
            . 'for(i=0;i<buttons.length;i+=1){'
            . 'var button=buttons[i];'
            . 'button.setAttribute("aria-selected",button.getAttribute("data-caasify-tab")===selectedTab?"true":"false");'
            . '}'
            . 'for(i=0;i<panels.length;i+=1){'
            . 'var panel=panels[i];'
            . 'var isVisible=panel.getAttribute("data-caasify-tab-panel")===selectedTab;'
            . 'panel.setAttribute("data-visible",isVisible?"true":"false");'
            . 'panel.hidden=!isVisible;'
            . '}'
            . 'if(updateHash&&window.history&&typeof window.history.replaceState==="function"){'
            . 'window.history.replaceState(null,document.title,window.location.pathname+window.location.search+"#caasify-tab-"+selectedTab);'
            . '}'
            . 'loadLazyPanel(selectedTab,false);'
            . '}'
            . 'for(i=0;i<buttons.length;i+=1){'
            . 'buttons[i].addEventListener("click",function(event){'
            . 'setActiveTab(event.currentTarget.getAttribute("data-caasify-tab"),true);'
            . '});'
            . '}'
            . 'for(i=0;i<colorFields.length;i+=1){'
            . '(function(field){'
            . 'var input=field.querySelector("[data-caasify-color-input]");'
            . 'if(!input){return;}'
            . 'input.addEventListener("input",function(){syncColorField(field);});'
            . 'input.addEventListener("change",function(){syncColorField(field);});'
            . '})(colorFields[i]);'
            . '}'
            . 'if(themeModeSelect){themeModeSelect.addEventListener("change",syncAllColorFields);}'
            . 'function applyInvoiceFilters(){'
            . 'var invoiceFilterSelect=root.querySelector("[data-caasify-invoice-filter]");'
            . 'var invoiceSearchInput=root.querySelector("[data-caasify-invoice-search]");'
            . 'var url=new URL(window.location.href);'
            . 'var searchValue=invoiceSearchInput&&invoiceSearchInput.value?invoiceSearchInput.value.trim():"";'
            . 'if(!invoiceFilterSelect){return;}'
            . 'url.searchParams.set("tab","' . self::TAB_INVOICES . '");'
            . 'url.searchParams.set("invoicePage","1");'
            . 'if(invoiceFilterSelect.value&&invoiceFilterSelect.value!=="all"){'
            . 'url.searchParams.set("invoiceStatus",invoiceFilterSelect.value);'
            . '}else{'
            . 'url.searchParams.delete("invoiceStatus");'
            . '}'
            . 'if(searchValue){'
            . 'url.searchParams.set("invoiceSearch",searchValue);'
            . '}else{'
            . 'url.searchParams.delete("invoiceSearch");'
            . '}'
            . 'url.hash="caasify-tab-' . self::TAB_INVOICES . '";'
            . 'window.location.assign(url.toString());'
            . '}'
            . 'root.addEventListener("click",function(event){'
            . 'var invoiceFilterButton=event.target.closest("[data-caasify-invoice-filter-apply]");'
            . 'var retryButton=event.target.closest("[data-caasify-lazy-retry]");'
            . 'if(retryButton){'
            . 'loadLazyPanel(retryButton.getAttribute("data-caasify-lazy-retry"),true);'
            . 'return;'
            . '}'
            . 'if(invoiceFilterButton){'
            . 'applyInvoiceFilters();'
            . '}'
            . '});'
            . 'root.addEventListener("keydown",function(event){'
            . 'if(event.key==="Enter"&&event.target&&event.target.matches("[data-caasify-invoice-search]")){'
            . 'event.preventDefault();'
            . 'applyInvoiceFilters();'
            . '}'
            . '});'
            . 'var hash=window.location.hash||"";'
            . 'var hashTab=hash.indexOf("#caasify-tab-")===0?hash.replace("#caasify-tab-",""):(hash.indexOf("#caasify-section-")===0?hash.replace("#caasify-section-",""):"");'
            . 'var initialTab=hashTab||(activeInput&&activeInput.value?activeInput.value:"");'
            . 'syncAllColorFields();'
            . 'setActiveTab(initialTab||"' . self::DEFAULT_TAB . '",false);'
            . '})();'
            . '</script>';
    }

    private static function getAvailableTabs(): array
    {
        return [
            self::TAB_GENERAL,
            self::TAB_CLOUD_VPS,
            self::TAB_INTERFACE,
            self::TAB_INVOICES,
            self::TAB_EMAIL,
        ];
    }

    /**
     * @param array<string, mixed> $pricingSettings
     * @param array<int, array<string, mixed>> $availableCurrencies
     */
    private function renderPricingCurrenciesTable(array $language, array $pricingSettings, array $availableCurrencies): string
    {
        if ($availableCurrencies === []) {
            return '<div data-caasify-table-empty>'
                . $this->escape($language['admin_settings_pricing_empty'] ?? 'No WHMCS currencies were found.')
                . '</div>';
        }

        $rows = is_array($pricingSettings['currencies'] ?? null) ? $pricingSettings['currencies'] : [];
        $html = '<div data-caasify-pricing-table-wrap>';
        $html .= '<table data-caasify-pricing-table>';
        $currencyLabel = $language['admin_settings_pricing_col_currency'] ?? 'Currency';
        $formatLabel = $language['admin_settings_pricing_col_format'] ?? 'Display Format';
        $rateLabel = $language['admin_settings_pricing_col_rate'] ?? '1 EUR = X';

        $html .= '<thead><tr>';
        $html .= '<th>' . $this->escape($currencyLabel) . '</th>';
        $html .= '<th>' . $this->escape($formatLabel) . '</th>';
        $html .= '<th>' . $this->escape($rateLabel) . '</th>';
        $html .= '</tr></thead><tbody>';

        foreach ($availableCurrencies as $currency) {
            if (!is_array($currency)) {
                continue;
            }

            $currencyId = isset($currency['id']) && is_numeric($currency['id']) ? (int) $currency['id'] : 0;

            if ($currencyId <= 0) {
                continue;
            }

            $currencyCode = strtoupper(trim((string) ($currency['code'] ?? '')));
            $pricingRow = is_array($rows[(string) $currencyId] ?? null) ? $rows[(string) $currencyId] : [];
            $isEuro = $currencyCode === 'EUR';
            $eurRate = $isEuro ? '1.00' : $this->formatNumberInputValue($pricingRow['eurRate'] ?? null, 6);
            $formatPreview = $this->buildCurrencyFormatPreview($currency);

            $html .= '<tr>';
            $html .= '<td data-label="' . $this->escape($currencyLabel) . '"><strong>' . $this->escape($currencyCode !== '' ? $currencyCode : ('#' . $currencyId)) . '</strong></td>';
            $html .= '<td data-label="' . $this->escape($formatLabel) . '">' . $this->escape($formatPreview !== '' ? $formatPreview : '10.00') . '</td>';
            $html .= '<td data-label="' . $this->escape($rateLabel) . '">';
            $html .= '<input data-caasify-input type="text" name="caasify[pricingSettings][currencies][' . $currencyId . '][eurRate]" value="' . $this->escape($eurRate) . '" placeholder="53.20"' . ($isEuro ? ' readonly' : '') . '>';
            $html .= '</td>';
            $html .= '</tr>';
        }

        $html .= '</tbody></table></div>';
        $html .= '<p data-caasify-help style="margin-top:14px;">'
            . $this->escape($language['admin_settings_pricing_rate_help'] ?? 'Currencies with a valid EUR rate can be used for customer pricing and top-ups. EUR is always fixed at 1.00.')
            . '</p>';

        return $html;
    }

    /**
     * @param array<string, mixed> $currency
     */
    private function buildCurrencyFormatPreview(array $currency): string
    {
        $prefix = trim((string) ($currency['prefix'] ?? ''));
        $suffix = trim((string) ($currency['suffix'] ?? ''));
        $format = trim((string) ($currency['format'] ?? ''));
        $amount = $format !== '' ? $format : '10.00';

        if ($prefix !== '') {
            return $prefix . $amount;
        }

        if ($suffix !== '') {
            return $amount . ' ' . $suffix;
        }

        return $amount;
    }

    private function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    }

    private function maskToken(?string $token, int $visibleLength = 10): string
    {
        if (!is_string($token) || $token === '') {
            return '';
        }

        $prefix = function_exists('mb_substr')
            ? mb_substr($token, 0, $visibleLength)
            : substr($token, 0, $visibleLength);

        return $prefix . '*****';
    }

    private function renderTextField(
        string $label,
        string $name,
        string $value,
        string $placeholder = '',
        string $helpText = '',
        string $helpTone = ''
    ): string {
        $field = '<label data-caasify-field>';
        $field .= '<span data-caasify-label>' . $this->escape($label) . '</span>';
        $field .= '<input data-caasify-input type="text" name="' . $this->escape($name) . '" value="' . $this->escape($value) . '" placeholder="' . $this->escape($placeholder) . '">';

        if ($helpText !== '') {
            $field .= '<span data-caasify-help' . ($helpTone !== '' ? ' data-caasify-help-tone="' . $this->escape($helpTone) . '"' : '') . '>' . $this->escape($helpText) . '</span>';
        }

        $field .= '</label>';

        return $field;
    }

    private function renderTextAreaField(
        string $label,
        string $name,
        string $value,
        string $placeholder = '',
        string $helpText = ''
    ): string {
        $field = '<label data-caasify-field>';
        $field .= '<span data-caasify-label>' . $this->escape($label) . '</span>';
        $field .= '<textarea data-caasify-textarea name="' . $this->escape($name) . '" placeholder="' . $this->escape($placeholder) . '">' . $this->escape($value) . '</textarea>';

        if ($helpText !== '') {
            $field .= '<span data-caasify-help>' . $this->escape($helpText) . '</span>';
        }

        $field .= '</label>';

        return $field;
    }

    private function renderPasswordField(
        string $label,
        string $name,
        string $value,
        string $helpText = '',
        string $placeholder = ''
    ): string {
        $field = '<label data-caasify-field>';
        $field .= '<span data-caasify-label>' . $this->escape($label) . '</span>';
        $field .= '<input data-caasify-input type="password" name="' . $this->escape($name) . '" value="' . $this->escape($value) . '" placeholder="' . $this->escape($placeholder) . '">';

        if ($helpText !== '') {
            $field .= '<span data-caasify-help>' . $this->escape($helpText) . '</span>';
        }

        $field .= '</label>';

        return $field;
    }

    private function renderSelectField(
        string $label,
        string $name,
        array $options,
        string $selectedValue,
        string $helpText = ''
    ): string {
        $field = '<label data-caasify-field>';
        $field .= '<span data-caasify-label>' . $this->escape($label) . '</span>';
        $field .= '<select data-caasify-select name="' . $this->escape($name) . '">';

        foreach ($options as $value => $optionLabel) {
            $selected = (string) $value === $selectedValue ? ' selected' : '';
            $field .= '<option value="' . $this->escape((string) $value) . '"' . $selected . '>'
                . $this->escape((string) $optionLabel)
                . '</option>';
        }

        $field .= '</select>';

        if ($helpText !== '') {
            $field .= '<span data-caasify-help>' . $this->escape($helpText) . '</span>';
        }

        $field .= '</label>';

        return $field;
    }

    private function renderCheckboxField(
        string $label,
        string $name,
        bool $checked,
        string $helpText = ''
    ): string {
        $field = '<label data-caasify-field>';
        $field .= '<input type="hidden" name="' . $this->escape($name) . '" value="0">';
        $field .= '<span data-caasify-checkbox>';
        $field .= '<input type="checkbox" name="' . $this->escape($name) . '" value="1"' . ($checked ? ' checked' : '') . '>';
        $field .= '<span>' . $this->escape($label) . '</span>';
        $field .= '</span>';

        if ($helpText !== '') {
            $field .= '<span data-caasify-help>' . $this->escape($helpText) . '</span>';
        }

        $field .= '</label>';

        return $field;
    }

    private function renderColorField(
        string $label,
        string $name,
        string $colorKey,
        string $value,
        string $defaultColor
    ): string
    {
        $resolvedValue = preg_match('/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $value) === 1 ? $value : '';
        $effectiveColor = $resolvedValue !== '' ? $resolvedValue : $defaultColor;

        $field = '<label data-caasify-field data-caasify-color-field="' . $this->escape($colorKey) . '">';
        $field .= '<span data-caasify-label>' . $this->escape($label) . '</span>';
        $field .= '<div data-caasify-color-row>';
        $field .= '<span data-caasify-swatch data-empty="' . ($resolvedValue === '' ? 'true' : 'false') . '" title="' . $this->escape($resolvedValue !== '' ? $resolvedValue : 'Default: ' . $defaultColor) . '" style="background-color:' . $this->escape($effectiveColor) . ';"></span>';
        $field .= '<input data-caasify-input data-caasify-color-input type="text" name="' . $this->escape($name) . '" value="' . $this->escape($resolvedValue) . '" placeholder="' . $this->escape($defaultColor) . '">';
        $field .= '</div>';
        $field .= '<span data-caasify-help>' . $this->escape($resolvedValue !== '' ? $resolvedValue : 'Default: ' . $defaultColor) . '</span>';
        $field .= '</label>';

        return $field;
    }

    /**
     * @param array<int, array<string, mixed>> $items
     * @param array<int, string> $hiddenValues
     * @param callable(array<string, mixed>): string $resolveValue
     * @param callable(array<string, mixed>): string $resolveLabel
     * @param callable(array<string, mixed>): string $resolveHelpText
     */
    private function renderCloudVpsChecklist(
        string $availableName,
        string $enabledName,
        array $items,
        array $hiddenValues,
        string $emptyMessage,
        callable $resolveValue,
        callable $resolveLabel,
        callable $resolveHelpText
    ): string {
        if ($items === []) {
            return '<div data-caasify-table-empty>' . $this->escape($emptyMessage) . '</div>';
        }

        $hiddenLookup = array_fill_keys($hiddenValues, true);
        $html = '<div data-caasify-checklist>';
        $html .= '<div data-caasify-checklist-grid>';

        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }

            $value = trim($resolveValue($item));

            if ($value === '') {
                continue;
            }

            $label = trim($resolveLabel($item));
            $helpText = trim($resolveHelpText($item));
            $enabled = !isset($hiddenLookup[$value]);

            $html .= '<label data-caasify-check-item>';
            $html .= '<input type="hidden" name="' . $this->escape($availableName) . '" value="' . $this->escape($value) . '">';
            $html .= '<span data-caasify-checkbox>';
            $html .= '<input type="checkbox" name="' . $this->escape($enabledName) . '" value="' . $this->escape($value) . '"' . ($enabled ? ' checked' : '') . '>';
            $html .= '<span>' . $this->escape($label !== '' ? $label : $value) . '</span>';
            $html .= '</span>';

            if ($helpText !== '') {
                $html .= '<p data-caasify-check-item-copy>' . $this->escape($helpText) . '</p>';
            }

            $html .= '</label>';
        }

        $html .= '</div>';
        $html .= '</div>';

        return $html;
    }

    private function getThemePreviewColorDefaults(string $themeMode): array
    {
        return self::THEME_PREVIEW_COLOR_DEFAULTS[$themeMode] ?? self::THEME_PREVIEW_COLOR_DEFAULTS[DashboardSettings::DEFAULT_THEME_MODE];
    }

    private function normalizeInvoiceTabData(array $invoiceTab): array
    {
        return [
            'currentFilter' => $this->normalizeInvoiceFilter($invoiceTab['currentFilter'] ?? null),
            'currentSearch' => $this->normalizeSearchTerm($invoiceTab['currentSearch'] ?? null),
            'currentPage' => max(1, (int) ($invoiceTab['currentPage'] ?? 1)),
            'pageSize' => max(1, (int) ($invoiceTab['pageSize'] ?? 10)),
            'totalItems' => max(0, (int) ($invoiceTab['totalItems'] ?? 0)),
            'totalPages' => max(1, (int) ($invoiceTab['totalPages'] ?? 1)),
            'items' => is_array($invoiceTab['items'] ?? null) ? $invoiceTab['items'] : [],
        ];
    }

    private function normalizeCloudVpsTabData(array $cloudVpsTab): array
    {
        return [
            'countries' => is_array($cloudVpsTab['countries'] ?? null) ? $cloudVpsTab['countries'] : [],
            'datacenters' => is_array($cloudVpsTab['datacenters'] ?? null) ? $cloudVpsTab['datacenters'] : [],
            'errorMessage' => is_string($cloudVpsTab['errorMessage'] ?? null)
                ? trim((string) $cloudVpsTab['errorMessage'])
                : '',
        ];
    }

    /**
     * @return array<string, string>
     */
    private function getInvoiceFilterOptions(array $language): array
    {
        return [
            'all' => $language['admin_invoices_filter_all'] ?? 'All statuses',
            'paid' => $language['admin_invoices_filter_paid'] ?? 'Paid',
            'unpaid' => $language['admin_invoices_filter_unpaid'] ?? 'Unpaid',
            'charged' => $language['admin_invoices_filter_charged'] ?? 'Charged',
            'not_charged' => $language['admin_invoices_filter_not_charged'] ?? 'Not Charged',
        ];
    }

    private function normalizeInvoiceFilter(mixed $value): string
    {
        $normalized = is_string($value) ? strtolower(trim($value)) : '';

        return in_array($normalized, ['all', 'paid', 'unpaid', 'charged', 'not_charged'], true)
            ? $normalized
            : 'all';
    }

    private function normalizeSearchTerm(mixed $value): string
    {
        if (!is_scalar($value)) {
            return '';
        }

        $normalized = trim((string) $value);

        return function_exists('mb_substr')
            ? mb_substr($normalized, 0, 255)
            : substr($normalized, 0, 255);
    }

    private function renderInvoiceStatusBadge(string $label, string $tone): string
    {
        return '<span data-caasify-badge="' . $this->escape($tone) . '">'
            . $this->escape($label)
            . '</span>';
    }

    private function renderInvoicePagination(
        int $currentPage,
        int $totalPages,
        int $totalItems,
        string $currentFilter,
        array $language
    ): string {
        if ($totalItems <= 0) {
            return '';
        }

        $pages = $this->getVisiblePaginationPages($currentPage, $totalPages);
        $html = '<div data-caasify-pagination>';
        $html .= '<p data-caasify-summary>'
            . $this->escape(
                sprintf(
                    $language['admin_invoices_pagination_summary'] ?? 'Page %d of %d',
                    $currentPage,
                    $totalPages
                )
            )
            . '</p>';
        $html .= '<div data-caasify-pagination-pages>';
        $html .= $this->renderPaginationLink(
            $language['admin_invoices_prev'] ?? 'Previous',
            $currentPage > 1 ? $this->buildAdminQueryUrl([
                'tab' => self::TAB_INVOICES,
                'invoiceStatus' => $currentFilter !== 'all' ? $currentFilter : null,
                'invoicePage' => $currentPage - 1,
            ]) : null,
            false
        );

        foreach ($pages as $pageNumber) {
            $html .= $this->renderPaginationLink(
                (string) $pageNumber,
                $this->buildAdminQueryUrl([
                    'tab' => self::TAB_INVOICES,
                    'invoiceStatus' => $currentFilter !== 'all' ? $currentFilter : null,
                    'invoicePage' => $pageNumber,
                ]),
                $pageNumber === $currentPage
            );
        }

        $html .= $this->renderPaginationLink(
            $language['admin_invoices_next'] ?? 'Next',
            $currentPage < $totalPages ? $this->buildAdminQueryUrl([
                'tab' => self::TAB_INVOICES,
                'invoiceStatus' => $currentFilter !== 'all' ? $currentFilter : null,
                'invoicePage' => $currentPage + 1,
            ]) : null,
            false
        );
        $html .= '</div>';
        $html .= '</div>';

        return $html;
    }

    /**
     * @return int[]
     */
    private function getVisiblePaginationPages(int $currentPage, int $totalPages): array
    {
        if ($totalPages <= 5) {
            return range(1, $totalPages);
        }

        $start = max(1, $currentPage - 1);
        $end = min($totalPages, $currentPage + 1);

        if ($start === 1) {
            $end = min($totalPages, 3);
        }

        if ($end === $totalPages) {
            $start = max(1, $totalPages - 2);
        }

        return range($start, $end);
    }

    private function renderPaginationLink(string $label, ?string $url, bool $isCurrent): string
    {
        $disabled = $url === null;

        return '<a href="' . $this->escape($url ?? '#') . '" data-caasify-page-link'
            . ($isCurrent ? ' aria-current="page"' : '')
            . ($disabled ? ' data-disabled="true"' : '')
            . '>'
            . $this->escape($label)
            . '</a>';
    }

    private function buildAdminQueryUrl(array $overrides = []): string
    {
        $query = [];

        foreach ($_GET as $key => $value) {
            if (!is_string($key) || $key === '' || !is_scalar($value)) {
                continue;
            }

            if (in_array($key, ['caasifyAction', 'requestToken'], true)) {
                continue;
            }

            $query[$key] = (string) $value;
        }

        foreach ($overrides as $key => $value) {
            if (!is_string($key) || $key === '') {
                continue;
            }

            if ($value === null || $value === '') {
                unset($query[$key]);

                continue;
            }

            $query[$key] = (string) $value;
        }

        return '?' . http_build_query($query);
    }

    private function tabHasSaveAction(string $activeTab): bool
    {
        return in_array($activeTab, [self::TAB_GENERAL, self::TAB_CLOUD_VPS, self::TAB_INTERFACE, self::TAB_EMAIL], true);
    }

    private function formatNumberInputValue(mixed $value, int $scale): string
    {
        if (is_string($value)) {
            $value = str_replace(',', '', trim($value));
        }

        if (!is_numeric($value)) {
            return '';
        }

        $formatted = number_format((float) $value, $scale, '.', '');

        return rtrim(rtrim($formatted, '0'), '.');
    }

    private function escapeNullable(string $value): string
    {
        return $value !== '' ? $this->escape($value) : '';
    }

    private function escapeForScript(string $value): string
    {
        return str_replace(
            ['</', '\\'],
            ['<\/', '\\\\'],
            $value
        );
    }
}
