<?php

declare(strict_types=1);

namespace Caasify\Controllers;

use Caasify\Core\Auth\CurrentClient;
use Caasify\Core\Auth\DashboardCsrf;
use Caasify\Core\Auth\WhmcsClientAreaAccess;
use Caasify\Core\Config\CaasifyServiceEndpoints;
use Caasify\Core\Config\CloudVpsConfig;
use Caasify\Core\Config\DashboardSettings;
use Caasify\Core\Config\WhmcsClientAreaUrl;
use Caasify\Core\Config\WhmcsCompanyProfile;
use Caasify\Core\Pricing\ClientPricingService;

final class DashboardBootstrapController
{
    public function __construct(
        private readonly DashboardSettings $settings = new DashboardSettings(),
        private readonly CurrentClient $currentClient = new CurrentClient(),
        private readonly WhmcsClientAreaAccess $whmcsClientAreaAccess = new WhmcsClientAreaAccess(),
        private readonly ClientPricingService $pricing = new ClientPricingService()
    ) {
    }

    public function buildPayloadForClient(int $clientId): array
    {
        $adminSettings = $this->settings->getAdminSettings();
        $defaultLocale = $adminSettings['defaultDashboardLanguage'];
        $cookieLocale = DashboardSettings::readLocaleFromCookie();
        $resolvedLocale = DashboardSettings::resolveLocale($cookieLocale ?? $defaultLocale);
        $cloudVpsSettings = is_array($adminSettings['cloudVpsSettings'] ?? null)
            ? $adminSettings['cloudVpsSettings']
            : [];
        $cloudVpsConfig = [
            ...CloudVpsConfig::normalizeSettings($cloudVpsSettings),
            'visibleCountryCodes' => [],
            'hasResolvedVisibility' => false,
        ];

        $payload = [
            'apiUrl' => 'cloudhub.php',
            'csrfToken' => DashboardCsrf::issueToken(),
            'defaultLocale' => $defaultLocale,
            'loginUrl' => '/index.php?rp=/login',
            'locale' => $resolvedLocale,
            'supportedLocales' => DashboardSettings::getSupportedLocales(),
            'uiSettings' => $adminSettings['uiSettings'],
            'featureFlags' => $adminSettings['featureSettings'] ?? DashboardSettings::getDefaultFeatureSettings(),
            'cloudVpsConfig' => $cloudVpsConfig,
            'services' => CaasifyServiceEndpoints::getPublicConfig($adminSettings['hubBaseUrl']),
            'companyProfile' => WhmcsCompanyProfile::get(),
            'currentClient' => $this->currentClient->getProfile(),
            'nativeRoutes' => WhmcsClientAreaUrl::getPublicRoutes(),
            'pricingContext' => $this->pricing->buildClientPricingContext($clientId),
            'whmcsAccess' => [
                'canUseCustomTicketsAndInvoices' => $this->whmcsClientAreaAccess->canUseCustomTicketsAndInvoices(),
            ],
        ];

        return $payload;
    }
}
