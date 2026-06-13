<?php

declare(strict_types=1);

$whmcsRoot = dirname(__DIR__, 3);

require_once $whmcsRoot . '/init.php';
require_once __DIR__ . '/lib/bootstrap.php';

$adminSession = new \Caasify\Core\Auth\AdminSession();
$brandName = \Caasify\Core\Config\WhmcsCompanyProfile::getName('Company');

header('Content-Type: text/html; charset=UTF-8');

if (!$adminSession->isAuthenticated()) {
    http_response_code(403);

    echo (new \Caasify\Admin\ClientSummaryPanelRenderer())->renderSimpleDocument(
        $brandName,
        'Admin authentication is required to view this panel.'
    );

    exit;
}

$clientId = isset($_GET['userid']) && is_numeric($_GET['userid']) ? (int) $_GET['userid'] : 0;

if ($clientId <= 0) {
    http_response_code(400);

    echo (new \Caasify\Admin\ClientSummaryPanelRenderer())->renderSimpleDocument(
        $brandName,
        'A valid client id is required.'
    );

    exit;
}

if (\WHMCS\User\Client::find($clientId) === null) {
    http_response_code(404);

    echo (new \Caasify\Admin\ClientSummaryPanelRenderer())->renderSimpleDocument(
        $brandName,
        'The requested client could not be found.'
    );

    exit;
}

$rawFrameId = isset($_GET['frameId']) && is_string($_GET['frameId']) ? $_GET['frameId'] : '';
$frameId = preg_replace('/[^a-zA-Z0-9_-]/', '', $rawFrameId) ?: 'caasify-admin-client-summary-frame';
$formAction = 'admin-client-summary.php?userid=' . $clientId . '&frameId=' . rawurlencode($frameId);
$requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$requestData = strtoupper($requestMethod) === 'POST' ? $_POST : $_GET;

echo (new \Caasify\Admin\ClientSummaryPanelController())->render(
    $clientId,
    $requestMethod,
    is_array($requestData) ? $requestData : [],
    $formAction,
    $frameId
);
