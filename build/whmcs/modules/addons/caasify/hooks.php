<?php

declare(strict_types=1);

if (!defined('WHMCS')) {
    exit('This file cannot be accessed directly');
}

require_once __DIR__ . '/lib/bootstrap.php';

add_hook('InvoicePaid', 1, static function (array $vars): void {
    $invoiceId = isset($vars['invoiceid']) && is_numeric($vars['invoiceid'])
        ? (int) $vars['invoiceid']
        : 0;

    if ($invoiceId <= 0) {
        return;
    }

    (new \Caasify\Services\Caasify\Server\Actions\ProcessPaidAddFundsInvoice())->handle($invoiceId);
});

add_hook('ClientAreaPrimaryNavbar', 1, static function ($primaryNavbar): void {
    if (!is_object($primaryNavbar) || !method_exists($primaryNavbar, 'addChild')) {
        return;
    }

    $settings = new \Caasify\Core\Config\DashboardSettings();
    $currentClientId = (new \Caasify\Core\Auth\CurrentClient())->getId();
    $publicPricingMenuSettings = $settings->getPublicPricingMenuSettings();
    $publicPricingMenuTitle = is_string($publicPricingMenuSettings['title'] ?? null) && trim((string) $publicPricingMenuSettings['title']) !== ''
        ? trim((string) $publicPricingMenuSettings['title'])
        : \Caasify\Core\Config\DashboardSettings::DEFAULT_PUBLIC_PRICING_MENU_TITLE;
    $publicPricingMenuPlacement = \Caasify\Core\Config\DashboardSettings::normalizeClientMenuPlacement(
        $publicPricingMenuSettings['placement'] ?? null
    );

    if (
        $currentClientId === null
        && $publicPricingMenuPlacement !== \Caasify\Core\Config\DashboardSettings::CLIENT_MENU_PLACEMENT_HIDDEN
    ) {
        caasify_add_navbar_child(
            $primaryNavbar,
            'caasify-public-pricing-client-menu',
            [
                'name' => 'CloudHubPricing',
                'label' => $publicPricingMenuTitle,
                'uri' => 'cloudhub.php?view=pricing#/pricing',
                'order' => 98,
                'icon' => '',
            ],
            $publicPricingMenuPlacement
        );
    }

    if ($currentClientId === null) {
        return;
    }

    $menuSettings = $settings->getClientMenuSettings();
    $menuTitle = is_string($menuSettings['title'] ?? null) && trim((string) $menuSettings['title']) !== ''
        ? trim((string) $menuSettings['title'])
        : \Caasify\Core\Config\DashboardSettings::getDefaultClientMenuTitle();
    $menuPlacement = \Caasify\Core\Config\DashboardSettings::normalizeClientMenuPlacement(
        $menuSettings['placement'] ?? null
    );

    if ($menuPlacement === \Caasify\Core\Config\DashboardSettings::CLIENT_MENU_PLACEMENT_HIDDEN) {
        return;
    }

    caasify_add_navbar_child(
        $primaryNavbar,
        'caasify-cloudhub-client-menu',
        [
            'name' => 'CloudHub',
            'label' => $menuTitle,
            'uri' => 'cloudhub.php',
            'order' => 99,
            'icon' => '',
        ],
        $menuPlacement
    );
});

add_hook('ClientAreaPrimarySidebar', 1, static function (\WHMCS\View\Menu\Item $primarySidebar): void {
    if (!caasify_is_public_pricing_clientarea_request()) {
        return;
    }

    caasify_remove_all_sidebar_children($primarySidebar);
});

add_hook('ClientAreaSecondarySidebar', 1, static function (\WHMCS\View\Menu\Item $secondarySidebar): void {
    if (!caasify_is_public_pricing_clientarea_request()) {
        return;
    }

    caasify_remove_all_sidebar_children($secondarySidebar);
});

add_hook('AdminAreaClientSummaryPage', 1, static function (array $vars): string {
    $clientId = isset($vars['userid']) && is_numeric($vars['userid'])
        ? (int) $vars['userid']
        : 0;

    if ($clientId <= 0) {
        return '';
    }

    $frameId = 'caasify-admin-client-summary-frame-' . $clientId;
    $systemUrl = rtrim(\Caasify\Core\Config\WhmcsAdminUrl::getSystemUrl(), '/');
    $src = ($systemUrl !== '' ? $systemUrl : '')
        . '/modules/addons/caasify/admin-client-summary.php?userid='
        . $clientId
        . '&frameId='
        . rawurlencode($frameId);

    return '
        <div style="margin-top:16px;">
            <iframe
                id="' . htmlspecialchars($frameId, ENT_QUOTES, 'UTF-8') . '"
                src="' . htmlspecialchars($src, ENT_QUOTES, 'UTF-8') . '"
                style="width:100%;min-height:520px;border:0;display:block;background:transparent;"
                loading="lazy"
            ></iframe>
        </div>
        <script>
            (function () {
                if (window.__caasifyAdminClientSummaryListenerAttached) {
                    return;
                }

                window.__caasifyAdminClientSummaryListenerAttached = true;

                window.addEventListener("message", function (event) {
                    if (event.origin !== window.location.origin) {
                        return;
                    }

                    var payload = event.data || {};

                    if (payload.type !== "caasify-admin-client-summary:resize") {
                        return;
                    }

                    var frame = document.getElementById(payload.frameId);

                    if (!frame || !payload.height) {
                        return;
                    }

                    var nextHeight = Number(payload.height);

                    if (!Number.isFinite(nextHeight) || nextHeight <= 0) {
                        return;
                    }

                    var targetHeight = Math.max(520, Math.ceil(nextHeight));
                    var currentHeight = Number(frame.getAttribute("data-caasifyHeight") || 0);

                    if (Math.abs(currentHeight - targetHeight) < 2) {
                        return;
                    }

                    frame.style.height = targetHeight + "px";
                    frame.setAttribute("data-caasifyHeight", String(targetHeight));
                });
            }());
        </script>
    ';
});

function caasify_add_navbar_child(object $primaryNavbar, string $menuKey, array $menuItem, string $placement): void
{
    if (
        $placement === \Caasify\Core\Config\DashboardSettings::CLIENT_MENU_PLACEMENT_INSIDE_SERVICES
        && method_exists($primaryNavbar, 'getChild')
    ) {
        $servicesMenu = $primaryNavbar->getChild('Services');

        if ($servicesMenu !== null && method_exists($servicesMenu, 'addChild')) {
            if (!method_exists($servicesMenu, 'getChild') || $servicesMenu->getChild($menuKey) === null) {
                $servicesMenu->addChild($menuKey, $menuItem);
            }

            return;
        }
    }

    if (!method_exists($primaryNavbar, 'getChild') || $primaryNavbar->getChild($menuKey) === null) {
        $primaryNavbar->addChild($menuKey, $menuItem);
    }
}

function caasify_is_public_pricing_clientarea_request(): bool
{
    $module = isset($_GET['m']) && is_string($_GET['m']) ? strtolower(trim($_GET['m'])) : '';
    $view = isset($_GET['view']) && is_string($_GET['view']) ? strtolower(trim($_GET['view'])) : '';

    return $module === 'caasify' && $view === 'pricing';
}

function caasify_remove_all_sidebar_children(\WHMCS\View\Menu\Item $sidebar): void
{
    if (!method_exists($sidebar, 'getChildren') || !method_exists($sidebar, 'removeChild')) {
        return;
    }

    $childNames = [];

    foreach ($sidebar->getChildren() as $childItem) {
        if (!is_object($childItem) || !method_exists($childItem, 'getName')) {
            continue;
        }

        $childNames[] = (string) $childItem->getName();
    }

    foreach ($childNames as $childName) {
        $sidebar->removeChild($childName);
    }
}
