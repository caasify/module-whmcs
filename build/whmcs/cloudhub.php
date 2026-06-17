<?php

declare(strict_types=1);

define('CLIENTAREA', true);

require_once __DIR__ . '/init.php';
require_once __DIR__ . '/modules/addons/caasify/lib/bootstrap.php';

$action = isset($_GET['action']) && is_string($_GET['action']) ? $_GET['action'] : '';
$view = isset($_GET['view']) && is_string($_GET['view']) ? trim($_GET['view']) : '';
$isPublicPricingView = caasify_is_public_pricing_view($view);
$isEmbeddedPublicPricingView = caasify_is_embedded_public_pricing_view();

$clientArea = new WHMCS\ClientArea();
$companyProfile = \Caasify\Core\Config\WhmcsCompanyProfile::get();
$companyName = is_string($companyProfile['name'] ?? null) && trim((string) $companyProfile['name']) !== ''
    ? trim((string) $companyProfile['name'])
    : 'Company';
$clientArea->setPageTitle($companyName);
$clientArea->initPage();

(new \Caasify\Core\Config\DashboardSettingsBootstrapper())->ensureReady();

$currentClient = new \Caasify\Core\Auth\CurrentClient();
$clientId = $currentClient->getId();

if ($isPublicPricingView) {
    if ($clientId !== null) {
        if ($action !== '') {
            \Caasify\Core\Support\JsonResponse::send([
                'success' => false,
                'message' => 'Public pricing is available only for guests.',
            ], 403);
        }

        header('Location: cloudhub.php', true, 302);
        exit;
    }

    if ($action !== '') {
        $requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';

        try {
            switch ($action) {
                case 'public-pricing.catalog':
                    caasify_require_request_method('GET', $requestMethod);
                    (new \Caasify\Controllers\PublicPricingCatalogController())->handle($_GET);
                    break;

                default:
                    \Caasify\Core\Support\JsonResponse::send([
                        'success' => false,
                        'message' => 'Unknown public pricing action.',
                    ], 404);
            }
        } catch (\Caasify\Core\Support\ValidationException $exception) {
            \Caasify\Core\Support\JsonResponse::send([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        } catch (\Throwable $exception) {
            \Caasify\Core\Support\JsonResponse::send([
                'success' => false,
                'message' => 'The public pricing request could not be completed.',
            ], 500);
        }
    }

    $settings = new \Caasify\Core\Config\DashboardSettings();
    $publicPricingMenuSettings = $settings->getPublicPricingMenuSettings();
    $publicPricingTitle = is_string($publicPricingMenuSettings['title'] ?? null)
        && trim((string) $publicPricingMenuSettings['title']) !== ''
        ? trim((string) $publicPricingMenuSettings['title'])
        : \Caasify\Core\Config\DashboardSettings::DEFAULT_PUBLIC_PRICING_MENU_TITLE;

    if (!$isEmbeddedPublicPricingView) {
        $pricingFrameId = 'caasify-public-pricing-frame';
        $pricingFrameSrc = 'cloudhub.php?view=pricing&embedded=1&frameId='
            . rawurlencode($pricingFrameId)
            . '#/pricing';

        $clientArea->setPageTitle($publicPricingTitle);
        $clientArea->addToBreadCrumb('cloudhub.php?view=pricing#/pricing', $publicPricingTitle);
        $clientArea->setTemplate('../modules/addons/caasify/clientarea');
        $clientArea->setTemplateVariables([
            'cloudhubMode' => 'publicPricingFrame',
            'cloudhubPricingFrameId' => $pricingFrameId,
            'cloudhubPricingFrameSrc' => $pricingFrameSrc,
        ]);

        header('Content-Type: text/html; charset=UTF-8');
        echo $clientArea->getOutputContent();
        exit;
    }

    $bootstrapPayload = (new \Caasify\Controllers\PublicPricingBootstrapController())->buildPayload();
    $frontendAssets = new \Caasify\FrontendAssets(__DIR__ . '/modules/addons/caasify');
    $viewData = $frontendAssets->getStandalonePageViewData('modules/addons/caasify/dist', $bootstrapPayload);

    header('Content-Type: text/html; charset=UTF-8');

    if (!$viewData['ready']) {
        http_response_code(503);

        echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' . htmlspecialchars($companyName, ENT_QUOTES, 'UTF-8') . '</title></head><body style="margin:0;padding:24px;font-family:Arial,sans-serif;background:#f6f8ff;color:#141a2b;">';
        echo '<div style="max-width:640px;margin:64px auto;padding:24px;border:1px solid #dbe3ef;border-radius:16px;background:#fff;">';
        echo '<h1 style="margin:0 0 12px;">' . htmlspecialchars($companyName, ENT_QUOTES, 'UTF-8') . ' is not ready yet</h1>';
        echo '<p style="margin:0;color:#526277;">' . htmlspecialchars((string) ($viewData['errorMessage'] ?? 'Unknown error.'), ENT_QUOTES, 'UTF-8') . '</p>';
        echo '</div></body></html>';

        exit;
    }

    echo $isEmbeddedPublicPricingView
        ? caasify_inject_public_pricing_frame_resize_bridge($viewData['document'])
        : $viewData['document'];
    exit;
}

if ($clientId === null) {
    if ($action !== '') {
        \Caasify\Core\Support\JsonResponse::send([
            'success' => false,
            'message' => 'Authentication required.',
        ], 401);
    }

    caasify_redirect_to_login();
}

\Caasify\Repositories\CaasifyUserRepository::ensureTable();

if ($action !== '') {
    $requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $payload = json_decode((string) file_get_contents('php://input'), true);
    $input = is_array($payload) ? $payload : [];
    $dashboardSettings = new \Caasify\Core\Config\DashboardSettings();

    try {
        switch ($action) {
            case 'dashboard.direct-auth-token':
                caasify_require_request_method('GET', $requestMethod);
                $adminSettings = $dashboardSettings->getAdminSettings();
                (new \Caasify\Controllers\DashboardDirectAuthTokenController())->handle(
                    $clientId,
                    isset($adminSettings['adminApiToken']) && is_string($adminSettings['adminApiToken'])
                        ? $adminSettings['adminApiToken']
                        : null
                );
                break;

            case 'billing.gateways.list':
                caasify_require_request_method('GET', $requestMethod);
                (new \Caasify\Controllers\Billing\BillingGatewayController())->handle();
                break;

            case 'billing.invoices.list':
                caasify_require_request_method('GET', $requestMethod);
                (new \Caasify\Controllers\Billing\InvoicesController())->handle($clientId);
                break;

            case 'billing.invoices.detail':
                caasify_require_request_method('GET', $requestMethod);
                (new \Caasify\Controllers\Billing\InvoiceController())->handle($clientId, $input);
                break;

            case 'tickets.list':
                caasify_require_request_method('GET', $requestMethod);
                (new \Caasify\Controllers\Tickets\TicketsController())->handle($clientId);
                break;

            case 'billing.add-funds.create':
                caasify_require_request_method('POST', $requestMethod);
                (new \Caasify\Controllers\Billing\AddFundsController())->handle($clientId, $input);
                break;

            case 'language-preference':
                caasify_require_request_method('POST', $requestMethod);
                (new \Caasify\Controllers\LanguagePreferenceController())->handle($clientId, $input);
                break;

            default:
                \Caasify\Core\Support\JsonResponse::send([
                    'success' => false,
                    'message' => 'Unknown dashboard action.',
                ], 404);
        }
    } catch (\Caasify\Core\Support\ValidationException $exception) {
        \Caasify\Core\Support\JsonResponse::send([
            'success' => false,
            'message' => $exception->getMessage(),
        ], 422);
    } catch (\Throwable $exception) {
        \Caasify\Core\Support\JsonResponse::send([
            'success' => false,
            'message' => 'The dashboard request could not be completed.',
        ], 500);
    }
}

$bootstrapPayload = (new \Caasify\Controllers\DashboardBootstrapController())->buildPayloadForClient($clientId);
$frontendAssets = new \Caasify\FrontendAssets(__DIR__ . '/modules/addons/caasify');
$viewData = $frontendAssets->getStandalonePageViewData('modules/addons/caasify/dist', $bootstrapPayload);

header('Content-Type: text/html; charset=UTF-8');

if (!$viewData['ready']) {
    http_response_code(503);

    echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' . htmlspecialchars($companyName, ENT_QUOTES, 'UTF-8') . '</title></head><body style="margin:0;padding:24px;font-family:Arial,sans-serif;background:#f6f8ff;color:#141a2b;">';
    echo '<div style="max-width:640px;margin:64px auto;padding:24px;border:1px solid #dbe3ef;border-radius:16px;background:#fff;">';
    echo '<h1 style="margin:0 0 12px;">' . htmlspecialchars($companyName, ENT_QUOTES, 'UTF-8') . ' is not ready yet</h1>';
    echo '<p style="margin:0;color:#526277;">' . htmlspecialchars((string) ($viewData['errorMessage'] ?? 'Unknown error.'), ENT_QUOTES, 'UTF-8') . '</p>';
    echo '</div></body></html>';

    exit;
}

echo $viewData['document'];

function caasify_require_request_method(string $expectedMethod, string $requestMethod): void
{
    if (strtoupper($requestMethod) === strtoupper($expectedMethod)) {
        return;
    }

    \Caasify\Core\Support\JsonResponse::send([
        'success' => false,
        'message' => 'Method not allowed.',
    ], 405);
}

function caasify_redirect_to_login(): void
{
    header('Location: /index.php?rp=/login', true, 302);
    exit;
}

function caasify_is_public_pricing_view(string $view): bool
{
    return strtolower(trim($view)) === 'pricing';
}

function caasify_is_embedded_public_pricing_view(): bool
{
    $embedded = $_GET['embedded'] ?? null;

    if (!is_string($embedded) && !is_numeric($embedded)) {
        return false;
    }

    return in_array(strtolower(trim((string) $embedded)), ['1', 'true', 'yes', 'on'], true);
}

function caasify_inject_public_pricing_frame_resize_bridge(string $document): string
{
    $bridgeScript = <<<'HTML'
<script>
    (function () {
        if (!window.parent || window.parent === window) {
            return;
        }

        var searchParams = new URLSearchParams(window.location.search || '');
        var frameId = searchParams.get('frameId') || '';
        var lastSentHeight = 0;

        if (!frameId) {
            return;
        }

        function getDocumentHeight() {
            var root = document.getElementById('root');
            var body = document.body;
            var documentElement = document.documentElement;

            return Math.max(
                root ? root.scrollHeight : 0,
                root ? root.offsetHeight : 0,
                body ? body.scrollHeight : 0,
                body ? body.offsetHeight : 0,
                documentElement ? documentElement.scrollHeight : 0,
                documentElement ? documentElement.offsetHeight : 0
            );
        }

        function sendHeight(force) {
            var nextHeight = getDocumentHeight();

            if (!Number.isFinite(nextHeight) || nextHeight <= 0) {
                return;
            }

            if (!force && Math.abs(lastSentHeight - nextHeight) < 2) {
                return;
            }

            lastSentHeight = nextHeight;

            window.parent.postMessage({
                type: 'caasify-public-pricing:resize',
                frameId: frameId,
                height: Math.ceil(nextHeight)
            }, window.location.origin);
        }

        function scheduleSync() {
            [0, 120, 360, 900, 1800].forEach(function (delay) {
                window.setTimeout(function () {
                    sendHeight(delay === 0);
                }, delay);
            });
        }

        window.addEventListener('load', function () {
            sendHeight(true);
            scheduleSync();
        });

        window.addEventListener('resize', function () {
            sendHeight(false);
        });

        document.addEventListener('DOMContentLoaded', function () {
            sendHeight(true);
            scheduleSync();
        });

        if (typeof ResizeObserver === 'function') {
            var resizeObserver = new ResizeObserver(function () {
                sendHeight(false);
            });

            if (document.documentElement) {
                resizeObserver.observe(document.documentElement);
            }

            if (document.body) {
                resizeObserver.observe(document.body);
            }
        }

        if (typeof MutationObserver === 'function' && document.body) {
            var mutationObserver = new MutationObserver(function () {
                sendHeight(false);
            });

            mutationObserver.observe(document.body, {
                attributes: true,
                childList: true,
                characterData: true,
                subtree: true
            });
        }

        scheduleSync();
    }());
</script>
HTML;

    if (stripos($document, '</body>') !== false) {
        return preg_replace('/<\/body>/i', $bridgeScript . PHP_EOL . '</body>', $document, 1) ?: $document;
    }

    return $document . PHP_EOL . $bridgeScript;
}
