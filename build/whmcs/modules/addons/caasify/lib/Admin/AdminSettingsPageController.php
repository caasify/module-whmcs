<?php

declare(strict_types=1);

namespace Caasify\Admin;

use Caasify\Core\Auth\AdminSession;
use Caasify\Core\Auth\AdminSettingsCsrf;
use Caasify\Core\Config\DashboardSettings;
use Caasify\Core\Support\JsonResponse;
use Caasify\Repositories\AddFundsInvoiceRepository;
use Caasify\Repositories\WhmcsCurrencyRepository;
use Caasify\Services\Caasify\Server\Actions\FetchCloudVpsConfigCatalog;
use Caasify\Services\Caasify\Server\Actions\SyncEmailTemplateSettings;

final class AdminSettingsPageController
{
    private const INVOICE_PAGE_SIZE = 10;
    private const BRAND_NAME = 'Caasify';

    public function __construct(
        private readonly DashboardSettings $settings = new DashboardSettings(),
        private readonly AdminSettingsPageRenderer $renderer = new AdminSettingsPageRenderer(),
        private readonly AdminSession $adminSession = new AdminSession(),
        private readonly AddFundsInvoiceRepository $addFundsInvoices = new AddFundsInvoiceRepository(),
        private readonly WhmcsCurrencyRepository $whmcsCurrencies = new WhmcsCurrencyRepository(),
        private readonly FetchCloudVpsConfigCatalog $cloudVpsCatalog = new FetchCloudVpsConfigCatalog(),
        private readonly SyncEmailTemplateSettings $syncEmailTemplateSettings = new SyncEmailTemplateSettings()
    ) {
    }

    public function render(array $vars): void
    {
        $language = is_array($vars['_lang'] ?? null) ? $vars['_lang'] : [];
        $language = $this->applyBrandName($language);
        $brandName = self::BRAND_NAME;

        if ($this->isLazyTabRequest()) {
            $this->handleLazyTabRequest($language);

            return;
        }

        $notice = null;
        $csrfToken = AdminSettingsCsrf::issueToken();
        $activeTab = AdminSettingsPageRenderer::resolveActiveTab(
            isset($_GET['tab']) && is_string($_GET['tab']) ? $_GET['tab'] : null
        );

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
            $activeTab = AdminSettingsPageRenderer::resolveActiveTab(
                isset($_POST['caasify']['activeTab']) && is_string($_POST['caasify']['activeTab'])
                    ? $_POST['caasify']['activeTab']
                    : $activeTab
            );
            $submittedToken = isset($_POST['caasify']['adminCsrfToken']) && is_string($_POST['caasify']['adminCsrfToken'])
                ? $_POST['caasify']['adminCsrfToken']
                : null;

            if (!AdminSettingsCsrf::isValid($submittedToken)) {
                $notice = [
                    'type' => 'error',
                    'message' => $language['admin_settings_save_error'] ?? 'Unable to save ' . $brandName . ' settings.',
                ];
            } else {
                try {
                    $input = isset($_POST['caasify']) && is_array($_POST['caasify']) ? $_POST['caasify'] : [];
                    $currentSettings = $this->settings->getAdminSettings();
                    $resolvedSettings = $this->settings->prepareAdminSettingsForSave($input, $currentSettings);
                    $emailSettingsChanged = DashboardSettings::normalizeEmailSettings(
                        is_array($currentSettings['emailSettings'] ?? null) ? $currentSettings['emailSettings'] : []
                    ) !== DashboardSettings::normalizeEmailSettings(
                        is_array($resolvedSettings['emailSettings'] ?? null) ? $resolvedSettings['emailSettings'] : []
                    );

                    $this->settings->saveAdminSettings($resolvedSettings);

                    if ($emailSettingsChanged) {
                        try {
                            $this->syncEmailTemplateSettings->handle($resolvedSettings);
                            $notice = [
                                'type' => 'success',
                                'message' => $language['admin_settings_saved'] ?? $brandName . ' settings saved successfully.',
                            ];
                        } catch (\Throwable $exception) {
                            $notice = [
                                'type' => 'error',
                                'message' => ($language['admin_settings_email_sync_error'] ?? 'Email settings were saved locally, but the sync failed.')
                                    . ' '
                                    . $exception->getMessage(),
                            ];
                        }
                    } else {
                        $notice = [
                            'type' => 'success',
                            'message' => $language['admin_settings_saved'] ?? $brandName . ' settings saved successfully.',
                        ];
                    }
                } catch (\Throwable $exception) {
                    $notice = [
                        'type' => 'error',
                        'message' => ($language['admin_settings_save_error'] ?? 'Unable to save ' . $brandName . ' settings.')
                            . ' '
                            . $exception->getMessage(),
                    ];
                }
            }
        }

        $adminSettings = $this->settings->getAdminSettings();
        $availableCurrencies = $this->whmcsCurrencies->getCurrencies();

        echo $this->renderer->render(
            $language,
            $adminSettings,
            $availableCurrencies,
            $notice,
            $csrfToken,
            $activeTab,
            [
                'loaded' => false,
            ],
            [
                'loaded' => false,
            ]
        );
    }

    private function isLazyTabRequest(): bool
    {
        return isset($_GET['caasifyAction'])
            && is_string($_GET['caasifyAction'])
            && trim($_GET['caasifyAction']) === 'tab-panel';
    }

    private function handleLazyTabRequest(array $language): void
    {
        if (!$this->adminSession->isAuthenticated()) {
            JsonResponse::send([
                'success' => false,
                'message' => 'Admin authentication is required.',
            ], 403);
        }

        $requestToken = isset($_GET['requestToken']) && is_string($_GET['requestToken'])
            ? $_GET['requestToken']
            : null;

        if (!AdminSettingsCsrf::isValid($requestToken)) {
            JsonResponse::send([
                'success' => false,
                'message' => 'The admin request token is missing or invalid.',
            ], 403);
        }

        $requestedTab = isset($_GET['tab']) && is_string($_GET['tab']) ? $_GET['tab'] : null;
        $tab = AdminSettingsPageRenderer::resolveActiveTab($requestedTab);

        if (!AdminSettingsPageRenderer::isLazyTab($tab)) {
            JsonResponse::send([
                'success' => false,
                'message' => 'This admin panel does not support lazy loading.',
            ], 404);
        }

        $adminSettings = $this->settings->getAdminSettings();
        $cloudVpsTab = [];
        $invoiceTab = [];

        if ($tab === 'cloud-vps') {
            $cloudVpsTab = [
                'countries' => [],
                'datacenters' => [],
                'errorMessage' => '',
            ];

            try {
                $cloudVpsTab = [
                    ...$cloudVpsTab,
                    ...$this->cloudVpsCatalog->handle(
                        is_array($adminSettings['cloudVpsSettings'] ?? null) ? $adminSettings['cloudVpsSettings'] : []
                    ),
                ];
            } catch (\Throwable) {
                $cloudVpsTab['errorMessage'] = $language['admin_settings_cloud_vps_fetch_error']
                    ?? 'Cloud VPS locations are temporarily unavailable. Check the admin token and API connectivity.';
            }
        }

        if ($tab === 'invoices') {
            $invoiceFilter = AddFundsInvoiceRepository::normalizeAdminFilter(
                isset($_GET['invoiceStatus']) && is_string($_GET['invoiceStatus']) ? $_GET['invoiceStatus'] : null
            );
            $invoiceSearch = isset($_GET['invoiceSearch']) && is_string($_GET['invoiceSearch'])
                ? trim($_GET['invoiceSearch'])
                : '';
            $invoicePage = isset($_GET['invoicePage']) && is_numeric($_GET['invoicePage'])
                ? max(1, (int) $_GET['invoicePage'])
                : 1;
            $totalInvoiceCount = $this->addFundsInvoices->countAdminInvoices($invoiceFilter, $invoiceSearch);
            $totalInvoicePages = max(1, (int) ceil($totalInvoiceCount / self::INVOICE_PAGE_SIZE));
            $invoicePage = min($invoicePage, $totalInvoicePages);

            $invoiceTab = [
                'currentFilter' => $invoiceFilter,
                'currentSearch' => $invoiceSearch,
                'currentPage' => $invoicePage,
                'pageSize' => self::INVOICE_PAGE_SIZE,
                'totalItems' => $totalInvoiceCount,
                'totalPages' => $totalInvoicePages,
                'items' => $this->addFundsInvoices->getAdminInvoices(
                    $invoiceFilter,
                    $invoicePage,
                    self::INVOICE_PAGE_SIZE,
                    $invoiceSearch
                ),
            ];
        }

        JsonResponse::send([
            'success' => true,
            'html' => $this->renderer->renderLazyTabContent(
                $tab,
                $language,
                $adminSettings,
                $cloudVpsTab,
                $invoiceTab
            ),
        ]);
    }

    private function applyBrandName(array $language): array
    {
        $brandName = self::BRAND_NAME;

        foreach ($language as $key => $value) {
            if (!is_string($value)) {
                continue;
            }

            $language[$key] = str_replace('{brandName}', $brandName, $value);
        }

        return $language;
    }
}
