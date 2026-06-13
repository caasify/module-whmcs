<?php

declare(strict_types=1);

namespace Caasify\Controllers;

use Caasify\Core\Config\CaasifyServiceEndpoints;
use Caasify\Core\Config\CloudVpsConfig;
use Caasify\Core\Config\DashboardSettings;
use Caasify\Core\Config\WhmcsClientAreaUrl;
use Caasify\Core\Config\WhmcsCompanyProfile;
use Caasify\Core\Pricing\ClientPricingService;
use Caasify\Services\Caasify\Server\Actions\FetchPublicPricingCatalog;

final class PublicPricingBootstrapController
{
    public function __construct(
        private readonly DashboardSettings $settings = new DashboardSettings(),
        private readonly ClientPricingService $pricing = new ClientPricingService(),
        private readonly FetchPublicPricingCatalog $catalog = new FetchPublicPricingCatalog()
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function buildPayload(): array
    {
        $adminSettings = $this->settings->getAdminSettings();
        $defaultLocale = $adminSettings['defaultDashboardLanguage'];
        $resolvedLocale = DashboardSettings::resolveLocale($defaultLocale);
        $cloudVpsSettings = is_array($adminSettings['cloudVpsSettings'] ?? null)
            ? $adminSettings['cloudVpsSettings']
            : [];
        $catalogPayload = [
            'countriesPayload' => ['data' => []],
            'commonTermsPayload' => ['data' => []],
            'productsPayload' => ['data' => []],
            'errorMessage' => null,
        ];
        $cloudVpsConfig = [
            ...CloudVpsConfig::normalizeSettings($cloudVpsSettings),
            'visibleCountryCodes' => [],
            'hasResolvedVisibility' => false,
        ];

        try {
            $catalogPayload['countriesPayload'] = $this->catalog->fetchCommonTerms();
            $catalogPayload['commonTermsPayload'] = $catalogPayload['countriesPayload'];

            $countryCatalog = CloudVpsConfig::buildAvailabilityCatalog(
                is_array($catalogPayload['countriesPayload'] ?? null)
                    ? $catalogPayload['countriesPayload']
                    : ['data' => []],
                ['data' => []],
                $cloudVpsSettings
            );
            $cloudVpsConfig = [
                ...CloudVpsConfig::normalizeSettings($cloudVpsSettings),
                'visibleCountryCodes' => array_values(array_map(
                    static fn (array $country): string => (string) ($country['code'] ?? ''),
                    array_filter(
                        $countryCatalog['countries'],
                        static fn (array $country): bool => ($country['enabled'] ?? false) === true
                    )
                )),
                'hasResolvedVisibility' => true,
            ];
        } catch (\Throwable) {
            if (function_exists('logActivity')) {
                $brandName = WhmcsCompanyProfile::getName('Company');
                \logActivity(
                    $brandName . ' could not prepare the public pricing catalog. Check the admin token and API connectivity.'
                );
            }

            $catalogPayload['errorMessage'] = 'Offers are temporarily unavailable right now.';
        }

        return [
            'apiUrl' => 'cloudhub.php?view=pricing',
            'csrfToken' => '',
            'defaultLocale' => $defaultLocale,
            'locale' => $resolvedLocale,
            'loginUrl' => '/index.php?rp=/login',
            'supportedLocales' => DashboardSettings::getSupportedLocales(),
            'uiSettings' => $adminSettings['uiSettings'],
            'cloudVpsConfig' => $cloudVpsConfig,
            'services' => CaasifyServiceEndpoints::getPublicConfig($adminSettings['hubBaseUrl']),
            'companyProfile' => WhmcsCompanyProfile::get(),
            'nativeRoutes' => WhmcsClientAreaUrl::getPublicRoutes(),
            'pricingContext' => $this->pricing->buildPublicPricingContext(),
            'publicPricingCatalog' => $catalogPayload,
            'viewMode' => 'publicPricing',
            'whmcsAccess' => [
                'canUseCustomTicketsAndInvoices' => false,
            ],
        ];
    }
}
