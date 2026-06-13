<?php

declare(strict_types=1);

if (!defined('WHMCS')) {
    exit('This file cannot be accessed directly');
}

require_once __DIR__ . '/lib/bootstrap.php';

function caasify_brand_name(): string
{
    return 'Caasify';
}

function caasify_config(): array
{
    $brandName = caasify_brand_name();

    return [
        'name' => $brandName,
        'description' => $brandName . ' client dashboard for WHMCS.',
        'version' => '1.0.0',
        'author' => $brandName,
        'language' => 'english',
        'fields' => [],
    ];
}

function caasify_activate(): array
{
    $brandName = caasify_brand_name();

    try {
        (new \Caasify\Core\Config\DashboardSettingsBootstrapper())->ensureReady();
        \Caasify\Repositories\CaasifyUserRepository::ensureTable();
        \Caasify\Repositories\AddFundsInvoiceRepository::ensureTable();

        return [
            'status' => 'success',
            'description' => $brandName . ' addon activated successfully.',
        ];
    } catch (\Throwable $exception) {
        return [
            'status' => 'error',
            'description' => $brandName . ' addon activation failed: ' . $exception->getMessage(),
        ];
    }
}

function caasify_deactivate(): array
{
    $brandName = caasify_brand_name();

    return [
        'status' => 'success',
        'description' => $brandName . ' addon deactivated successfully.',
    ];
}

function caasify_output(array $vars): void
{
    (new \Caasify\Admin\AdminSettingsPageController())->render($vars);
}

function caasify_clientarea(array $vars): array
{
    $brandName = caasify_brand_name();
    $requestedView = isset($_GET['view']) && is_string($_GET['view']) ? strtolower(trim($_GET['view'])) : '';
    $currentClientId = (new \Caasify\Core\Auth\CurrentClient())->getId();

    if ($requestedView === 'pricing' && $currentClientId === null) {
        $settings = new \Caasify\Core\Config\DashboardSettings();
        $publicPricingMenuSettings = $settings->getPublicPricingMenuSettings();
        $publicPricingTitle = is_string($publicPricingMenuSettings['title'] ?? null)
            && trim((string) $publicPricingMenuSettings['title']) !== ''
            ? trim((string) $publicPricingMenuSettings['title'])
            : \Caasify\Core\Config\DashboardSettings::DEFAULT_PUBLIC_PRICING_MENU_TITLE;

        return [
            'pagetitle' => $publicPricingTitle,
            'breadcrumb' => [
                'cloudhub.php?view=pricing#/pricing' => $publicPricingTitle,
            ],
            'templatefile' => 'clientarea',
            'requirelogin' => false,
            'forcessl' => false,
            'vars' => [
                'cloudhubMode' => 'launchDashboard',
                'cloudhubBrandName' => $publicPricingTitle,
                'cloudhubLaunchUrl' => 'cloudhub.php?view=pricing#/pricing',
            ],
        ];
    }

    return [
        'pagetitle' => $brandName,
        'breadcrumb' => [
            'cloudhub.php' => $brandName,
        ],
        'templatefile' => 'clientarea',
        'requirelogin' => true,
        'forcessl' => false,
        'vars' => [
            'cloudhubMode' => 'launchDashboard',
            'cloudhubBrandName' => $brandName,
            'cloudhubLaunchUrl' => 'cloudhub.php',
        ],
    ];
}
