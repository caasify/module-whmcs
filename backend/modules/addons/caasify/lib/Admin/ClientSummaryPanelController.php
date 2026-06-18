<?php

declare(strict_types=1);

namespace Caasify\Admin;

use Caasify\Core\Auth\AdminClientSummaryCsrf;
use Caasify\Core\Config\DashboardSettings;
use Caasify\Core\Config\WhmcsAdminUrl;
use Caasify\Core\Config\WhmcsCompanyProfile;
use Caasify\Core\Pricing\ClientPricingService;
use Caasify\Repositories\WhmcsCurrencyRepository;
use Caasify\Services\Caasify\Server\Actions\ResolveClientAuthToken;
use Caasify\Services\Caasify\Server\Client\CaasifyApiClient;
use WHMCS\User\Client;

final class ClientSummaryPanelController
{
    private const ACTION_UPDATE_BALANCE = 'updateBalance';
    private const ACTION_TOGGLE_POWER = 'togglePower';
    private const ACTION_REBOOT = 'reboot';
    private const ACTION_OPEN_CONSOLE = 'openConsole';
    private const CONSOLE_POLL_ATTEMPTS = 12;
    private const CONSOLE_POLL_INTERVAL_SECONDS = 5;
    private const POWER_POLL_ATTEMPTS = 10;
    private const POWER_POLL_INTERVAL_SECONDS = 3;

    private DashboardSettings $settings;
    private ResolveClientAuthToken $authTokenResolver;
    private ClientSummaryOrderMapper $orderMapper;
    private ClientPricingService $pricing;
    private WhmcsCurrencyRepository $currencies;
    private ClientSummaryPanelRenderer $renderer;

    public function __construct(
        ?DashboardSettings $settings = null,
        ?ResolveClientAuthToken $authTokenResolver = null,
        ?ClientSummaryOrderMapper $orderMapper = null,
        ?ClientPricingService $pricing = null,
        ?WhmcsCurrencyRepository $currencies = null,
        ?ClientSummaryPanelRenderer $renderer = null
    ) {
        $this->settings = $settings ?? new DashboardSettings();
        $this->authTokenResolver = $authTokenResolver ?? new ResolveClientAuthToken();
        $this->orderMapper = $orderMapper ?? new ClientSummaryOrderMapper();
        $this->pricing = $pricing ?? new ClientPricingService();
        $this->currencies = $currencies ?? new WhmcsCurrencyRepository();
        $this->renderer = $renderer ?? new ClientSummaryPanelRenderer();
    }

    /**
     * @param array<string, mixed> $requestData
     */
    public function render(int $clientId, string $requestMethod, array $requestData, string $formAction, string $frameId): string
    {
        $brandName = WhmcsCompanyProfile::getName('Company');
        $csrfToken = AdminClientSummaryCsrf::issueToken();
        $chargeAmount = $this->normalizeChargeAmountInput($requestData['chargeAmount'] ?? null);
        $notice = null;
        $warnings = [];

        if (!$this->clientExists($clientId)) {
            return $this->renderer->renderSimpleDocument($brandName, 'The requested client could not be found.');
        }

        try {
            $adminSettings = $this->settings->getAdminSettings();
            $adminToken = DashboardSettings::sanitizeToken($adminSettings['adminApiToken'] ?? null);
            $pricingContext = $this->pricing->buildClientPricingContext($clientId);
            $realCurrency = $this->currencies->findCurrencyByCode('EUR') ?? [];

            if ($adminToken === null) {
                throw new \RuntimeException('Admin API token is not configured yet.');
            }

            $panelData = $this->applyPricingContext(
                $this->loadPanelData($clientId, $adminToken, $adminSettings['hubBaseUrl'] ?? null),
                $pricingContext
            );
            $warnings = is_array($panelData['warnings'] ?? null) ? $panelData['warnings'] : [];

            if (strtoupper($requestMethod) === 'POST') {
                $requestedAction = $this->resolveRequestedAction($requestData);
                $actionResult = $this->handlePostAction(
                    $requestedAction,
                    $requestData,
                    $panelData,
                    $adminToken,
                    $adminSettings['hubBaseUrl'] ?? null
                );

                if (is_string($actionResult)) {
                    return $actionResult;
                }

                $notice = $actionResult;

                if (($notice['type'] ?? '') === 'success') {
                    $panelData = $this->applyPricingContext(
                        $this->loadPanelData($clientId, $adminToken, $adminSettings['hubBaseUrl'] ?? null),
                        $pricingContext
                    );
                    $warnings = is_array($panelData['warnings'] ?? null) ? $panelData['warnings'] : [];
                }
            }

            return $this->renderer->render([
                ...$panelData,
                'chargeAmount' => $chargeAmount,
                'csrfToken' => $csrfToken,
                'formAction' => $formAction,
                'frameId' => $frameId,
                'notice' => $notice,
                'warnings' => $warnings,
                'panelError' => null,
                'realCurrency' => $realCurrency,
                'whmcsClientId' => $clientId,
            ]);
        } catch (\Throwable $exception) {
            return $this->renderer->render([
                'adminBalance' => 0.0,
                'adminRealBalance' => 0.0,
                'chargeAmount' => $chargeAmount,
                'commissionBalance' => 0.0,
                'commissionDebt' => 0.0,
                'commissionPercent' => 0.0,
                'commissionRemaining' => 0.0,
                'csrfToken' => $csrfToken,
                'formAction' => $formAction,
                'frameId' => $frameId,
                'notice' => $notice,
                'warnings' => [],
                'orders' => [],
                'panelError' => $exception->getMessage() !== '' ? $exception->getMessage() : 'Unable to load the ' . $brandName . ' admin panel right now.',
                'pricingContext' => [
                    'clientCurrencyCode' => 'EUR',
                    'commissionPercent' => 0.0,
                    'displayCurrencyCode' => 'EUR',
                    'displayMode' => 'raw_eur_fallback',
                    'eurRate' => null,
                    'moneyActionsBlocked' => true,
                ],
                'realBalance' => 0.0,
                'realDebt' => 0.0,
                'realRemaining' => 0.0,
                'realCurrency' => $this->currencies->findCurrencyByCode('EUR') ?? [],
                'whmcsClientId' => $clientId,
            ]);
        }
    }

    /**
     * @param array<string, mixed> $requestData
     * @param array<string, mixed> $panelData
     * @return array<string, string>|string
     */
    private function handlePostAction(
        string $requestedAction,
        array $requestData,
        array $panelData,
        string $adminToken,
        mixed $hubBaseUrl
    ): array|string {
        $brandName = WhmcsCompanyProfile::getName('Company');

        if (!$this->hasValidCsrfToken($requestData)) {
            if ($requestedAction === self::ACTION_OPEN_CONSOLE) {
                return $this->renderer->renderSimpleDocument($brandName . ' Console', 'Invalid request token.');
            }

            return [
                'type' => 'error',
                'message' => 'Invalid request token.',
            ];
        }

        return match ($requestedAction) {
            self::ACTION_UPDATE_BALANCE => $this->handleBalanceAction($requestData, $panelData, $adminToken, $hubBaseUrl),
            self::ACTION_TOGGLE_POWER => $this->handleTogglePowerAction($requestData, $panelData, $hubBaseUrl),
            self::ACTION_REBOOT => $this->handleRebootAction($requestData, $panelData, $hubBaseUrl),
            self::ACTION_OPEN_CONSOLE => $this->handleOpenConsoleAction($requestData, $panelData, $hubBaseUrl),
            default => [
                'type' => 'error',
                'message' => 'Unknown admin action requested.',
            ],
        };
    }

    /**
     * @param array<string, mixed> $requestData
     * @param array<string, mixed> $panelData
     * @return array<string, string>
     */
    private function handleBalanceAction(array $requestData, array $panelData, string $adminToken, mixed $hubBaseUrl): array
    {
        $brandName = WhmcsCompanyProfile::getName('Company');
        $chargeAmount = $this->extractSignedAmount($requestData['chargeAmount'] ?? null);

        if ($chargeAmount === null || abs($chargeAmount) < 0.01) {
            return [
                'type' => 'error',
                'message' => 'Please enter a valid amount.',
            ];
        }

        $caasifyUserId = $this->normalizeNullableString($panelData['caasifyUserId'] ?? null);

        if ($caasifyUserId === null) {
            return [
                'type' => 'error',
                'message' => $brandName . ' client account information is incomplete.',
            ];
        }

        try {
            $client = $this->createApiClient($hubBaseUrl);

            if ($chargeAmount > 0) {
                $client->increaseUserBalance($adminToken, $caasifyUserId, $chargeAmount, 'admin');

                return [
                    'type' => 'success',
                    'message' => 'User balance increased successfully.',
                ];
            }

            $client->decreaseUserBalance($adminToken, $caasifyUserId, abs($chargeAmount), 'admin');

            return [
                'type' => 'success',
                'message' => 'User balance decreased successfully.',
            ];
        } catch (\Throwable $exception) {
            return [
                'type' => 'error',
                'message' => $exception->getMessage() !== '' ? $exception->getMessage() : 'Unable to update the user balance right now.',
            ];
        }
    }

    /**
     * @param array<string, mixed> $requestData
     * @param array<string, mixed> $panelData
     * @return array<string, string>
     */
    private function handleTogglePowerAction(array $requestData, array $panelData, mixed $hubBaseUrl): array
    {
        $order = $this->resolveRequestedOrder($requestData, $panelData);
        $orderId = is_array($order) ? $this->extractOrderId($order) : null;
        $clientToken = $this->normalizeNullableString($panelData['clientToken'] ?? null);

        if ($order === null || $orderId === null || $clientToken === null) {
            return [
                'type' => 'error',
                'message' => 'The selected server could not be resolved.',
            ];
        }

        $buttonId = $this->orderMapper->findPowerActionButtonId($order);
        $actionCode = $this->orderMapper->findPowerActionCode($order);

        if ($buttonId === null || $actionCode === null) {
            return [
                'type' => 'error',
                'message' => 'This server does not expose a power toggle action.',
            ];
        }

        try {
            $client = $this->createApiClient($hubBaseUrl);
            $client->runOrderAction($clientToken, $orderId, $buttonId);
            $this->waitForExpectedPowerState($client, $clientToken, $orderId, $actionCode === 'start');

            return [
                'type' => 'success',
                'message' => $actionCode === 'start'
                    ? 'Server power on request sent successfully.'
                    : 'Server power off request sent successfully.',
            ];
        } catch (\Throwable $exception) {
            return [
                'type' => 'error',
                'message' => $exception->getMessage() !== '' ? $exception->getMessage() : 'Unable to change the server power state right now.',
            ];
        }
    }

    /**
     * @param array<string, mixed> $requestData
     * @param array<string, mixed> $panelData
     * @return array<string, string>
     */
    private function handleRebootAction(array $requestData, array $panelData, mixed $hubBaseUrl): array
    {
        $order = $this->resolveRequestedOrder($requestData, $panelData);
        $orderId = is_array($order) ? $this->extractOrderId($order) : null;
        $clientToken = $this->normalizeNullableString($panelData['clientToken'] ?? null);

        if ($order === null || $orderId === null || $clientToken === null) {
            return [
                'type' => 'error',
                'message' => 'The selected server could not be resolved.',
            ];
        }

        $buttonId = $this->orderMapper->findRebootActionButtonId($order);

        if ($buttonId === null) {
            return [
                'type' => 'error',
                'message' => 'This server does not expose a reboot action.',
            ];
        }

        try {
            $client = $this->createApiClient($hubBaseUrl);
            $client->runOrderAction($clientToken, $orderId, $buttonId);

            return [
                'type' => 'success',
                'message' => 'Server reboot request sent successfully.',
            ];
        } catch (\Throwable $exception) {
            return [
                'type' => 'error',
                'message' => $exception->getMessage() !== '' ? $exception->getMessage() : 'Unable to reboot the server right now.',
            ];
        }
    }

    /**
     * @param array<string, mixed> $requestData
     * @param array<string, mixed> $panelData
     */
    private function handleOpenConsoleAction(array $requestData, array $panelData, mixed $hubBaseUrl): string
    {
        $brandName = WhmcsCompanyProfile::getName('Company');
        $order = $this->resolveRequestedOrder($requestData, $panelData);
        $orderId = is_array($order) ? $this->extractOrderId($order) : null;
        $clientToken = $this->normalizeNullableString($panelData['clientToken'] ?? null);

        if ($order === null || $orderId === null || $clientToken === null) {
            return $this->renderer->renderSimpleDocument($brandName . ' Console', 'The selected server could not be resolved.');
        }

        $buttonId = $this->orderMapper->findConsoleButtonId($order);

        if ($buttonId === null) {
            return $this->renderer->renderSimpleDocument($brandName . ' Console', 'This server does not expose a console action.');
        }

        try {
            $client = $this->createApiClient($hubBaseUrl);
            $actionPayload = $client->runOrderAction($clientToken, $orderId, $buttonId);
            $actionData = $this->extractPayloadData($actionPayload);
            $actionId = isset($actionData['id']) && is_numeric($actionData['id']) ? (int) $actionData['id'] : null;
            $consoleParams = $this->orderMapper->extractConsoleParameters($actionData);

            if (($consoleParams['address'] ?? null) === null && $actionId !== null) {
                $consoleParams = $this->waitForConsoleParameters($client, $clientToken, $orderId, $actionId);
            }

            $viewerUrl = $this->buildNoVncViewerUrl($consoleParams);

            if ($viewerUrl === null) {
                return $this->renderer->renderSimpleDocument(
                    $brandName . ' Console',
                    'The console request completed, but no console address was returned for this server.'
                );
            }

            return $this->renderer->renderRedirectDocument(
                $brandName . ' Console',
                'Opening the server console in a new window.',
                $viewerUrl
            );
        } catch (\Throwable $exception) {
            return $this->renderer->renderSimpleDocument(
                $brandName . ' Console',
                $exception->getMessage() !== '' ? $exception->getMessage() : 'Unable to open the server console right now.'
            );
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function loadPanelData(int $clientId, string $adminToken, mixed $hubBaseUrl): array
    {
        $clientToken = $this->authTokenResolver->handle($clientId, $adminToken);
        $client = $this->createApiClient($hubBaseUrl);
        $warnings = [];

        $clientProfilePayload = $client->getProfile($clientToken);
        $clientProfile = $this->extractPayloadData($clientProfilePayload);
        $caasifyUserId = $this->extractString($clientProfilePayload, ['data', 'id'])
            ?? $this->extractString($clientProfilePayload, ['id']);

        if ($caasifyUserId === null) {
            throw new \RuntimeException(WhmcsCompanyProfile::getName('Company') . ' client profile did not include a user id.');
        }

        $realBalance = $this->extractAmount($clientProfile['balance'] ?? null) ?? 0.0;
        $realDebt = $this->extractAmount($clientProfile['debt'] ?? null) ?? 0.0;
        $realRemaining = $this->extractAmount($clientProfile['available_balance'] ?? null) ?? ($realBalance - $realDebt);
        $orders = [];

        try {
            $ordersPayload = $client->getOrders($clientToken, 1);
            $orders = $this->mergeMonitoringStatuses(
                $this->extractPayloadList($ordersPayload, 'data'),
                $client,
                $clientToken
            );
        } catch (\Throwable $exception) {
            $warnings[] = $this->buildLoadWarning(
                'Orders could not be loaded. Showing an empty list instead.',
                $exception
            );
        }

        $adminRealBalance = 0.0;
        $adminBalance = 0.0;

        try {
            $resellerProfilePayload = $client->getProfile($adminToken);
            $resellerProfile = $this->extractPayloadData($resellerProfilePayload);
            $adminRealBalance = $this->extractAmount($resellerProfile['balance'] ?? null) ?? 0.0;
            $adminBalance = $this->extractAmount($resellerProfile['available_balance'] ?? null)
                ?? $adminRealBalance
                ?? 0.0;
        } catch (\Throwable $exception) {
            $warnings[] = $this->buildLoadWarning(
                'Reseller profile could not be loaded. Showing safe admin balance defaults instead.',
                $exception
            );
        }

        return [
            'adminBalance' => $adminBalance,
            'adminRealBalance' => $adminRealBalance,
            'caasifyUserId' => $caasifyUserId,
            'caasifyProfileResponse' => $clientProfilePayload,
            'caasifyProfileStatus' => 200,
            'caasifyProfileUrl' => '/server/v1/profile/show',
            'clientToken' => $clientToken,
            'orders' => $this->orderMapper->mapList($orders),
            'rawOrders' => $orders,
            'realBalance' => $realBalance,
            'realDebt' => $realDebt,
            'realRemaining' => $realRemaining,
            'warnings' => $warnings,
        ];
    }

    /**
     * @param array<string, mixed> $panelData
     * @param array<string, mixed> $pricingContext
     * @return array<string, mixed>
     */
    private function applyPricingContext(array $panelData, array $pricingContext): array
    {
        $orders = [];

        foreach (($panelData['orders'] ?? []) as $order) {
            if (!is_array($order)) {
                continue;
            }

            $order['price'] = $this->pricing->convertHubEuroToDisplay(
                $this->extractAmount($order['price'] ?? null) ?? 0.0,
                $pricingContext,
                2
            );
            $orders[] = $order;
        }

        return [
            ...$panelData,
            'pricingContext' => $pricingContext,
            'commissionPercent' => (float) ($pricingContext['commissionPercent'] ?? 0.0),
            'commissionBalance' => $this->pricing->convertHubEuroToDisplay(
                $this->extractAmount($panelData['realBalance'] ?? null) ?? 0.0,
                $pricingContext,
                2
            ),
            'commissionDebt' => $this->pricing->convertHubEuroToDisplay(
                $this->extractAmount($panelData['realDebt'] ?? null) ?? 0.0,
                $pricingContext,
                2
            ),
            'commissionRemaining' => $this->pricing->convertHubEuroToDisplay(
                $this->extractAmount($panelData['realRemaining'] ?? null) ?? 0.0,
                $pricingContext,
                2
            ),
            'orders' => $orders,
        ];
    }

    private function createApiClient(mixed $hubBaseUrl): CaasifyApiClient
    {
        $resolvedBaseUrl = is_string($hubBaseUrl) ? trim($hubBaseUrl) : '';

        return $resolvedBaseUrl !== ''
            ? new CaasifyApiClient($resolvedBaseUrl)
            : new CaasifyApiClient();
    }

    private function buildLoadWarning(string $message, \Throwable $exception): string
    {
        $detail = $exception->getMessage();

        if ($detail === '') {
            return $message;
        }

        return $message . ' ' . $detail;
    }

    private function clientExists(int $clientId): bool
    {
        return Client::find($clientId) !== null;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function extractPayloadData(array $payload): array
    {
        $data = $payload['data'] ?? null;

        return is_array($data) ? $data : $payload;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<int, array<string, mixed>>
     */
    private function extractPayloadList(array $payload, string $key): array
    {
        $items = $payload[$key] ?? null;

        if (!is_array($items)) {
            return [];
        }

        if ($items !== [] && $this->isAssociativeArray($items)) {
            return [$items];
        }

        $resolvedItems = [];

        foreach ($items as $item) {
            if (is_array($item)) {
                $resolvedItems[] = $item;
            }
        }

        return $resolvedItems;
    }

    private function isAssociativeArray(array $value): bool
    {
        return array_keys($value) !== range(0, count($value) - 1);
    }

    private function extractString(array $payload, array $path): ?string
    {
        $value = $payload;

        foreach ($path as $segment) {
            if (!is_array($value) || !array_key_exists($segment, $value)) {
                return null;
            }

            $value = $value[$segment];
        }

        return $this->normalizeNullableString($value);
    }

    private function extractAmount(mixed $value): ?float
    {
        if (is_string($value)) {
            $value = str_replace(',', '', trim($value));
        }

        if (!is_numeric($value)) {
            return null;
        }

        return round((float) $value, 2);
    }

    private function extractSignedAmount(mixed $value): ?float
    {
        if (is_string($value)) {
            $value = trim($value);
        }

        if (!is_numeric($value)) {
            return null;
        }

        return round((float) $value, 2);
    }

    private function normalizeChargeAmountInput(mixed $value): string
    {
        $amount = $this->extractSignedAmount($value);

        return $amount === null ? '0' : number_format($amount, 2, '.', '');
    }

    private function normalizeNullableString(mixed $value): ?string
    {
        if (!is_scalar($value)) {
            return null;
        }

        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }

    /**
     * @param array<string, mixed> $requestData
     */
    private function hasValidCsrfToken(array $requestData): bool
    {
        $submittedToken = isset($requestData['csrfToken']) && is_string($requestData['csrfToken'])
            ? $requestData['csrfToken']
            : null;

        return AdminClientSummaryCsrf::isValid($submittedToken);
    }

    /**
     * @param array<string, mixed> $requestData
     */
    private function resolveRequestedAction(array $requestData): string
    {
        $requestedAction = $this->normalizeNullableString($requestData['panelAction'] ?? null);

        return $requestedAction ?? self::ACTION_UPDATE_BALANCE;
    }

    /**
     * @param array<string, mixed> $requestData
     * @param array<string, mixed> $panelData
     * @return array<string, mixed>|null
     */
    private function resolveRequestedOrder(array $requestData, array $panelData): ?array
    {
        $rawOrders = $panelData['rawOrders'] ?? null;
        $orderId = $this->extractRequestedOrderId($requestData);

        if (!is_array($rawOrders) || $orderId === null) {
            return null;
        }

        return $this->orderMapper->findOrderById($rawOrders, $orderId);
    }

    /**
     * @param array<string, mixed> $requestData
     */
    private function extractRequestedOrderId(array $requestData): ?int
    {
        return isset($requestData['orderId']) && is_numeric($requestData['orderId'])
            ? (int) $requestData['orderId']
            : null;
    }

    /**
     * @param array<string, mixed> $order
     */
    private function extractOrderId(array $order): ?int
    {
        return isset($order['id']) && is_numeric($order['id']) ? (int) $order['id'] : null;
    }

    private function waitForExpectedPowerState(
        CaasifyApiClient $client,
        string $clientToken,
        int $orderId,
        bool $expectedPowerState
    ): void {
        for ($attempt = 0; $attempt < self::POWER_POLL_ATTEMPTS; $attempt++) {
            $resolvedState = $this->resolveOrderPowerState($client, $clientToken, $orderId);

            if (is_bool($resolvedState) && $resolvedState === $expectedPowerState) {
                return;
            }

            if ($attempt < self::POWER_POLL_ATTEMPTS - 1) {
                sleep(self::POWER_POLL_INTERVAL_SECONDS);
            }
        }
    }

    /**
     * @param array<int, array<string, mixed>> $orders
     * @return array<int, array<string, mixed>>
     */
    private function mergeMonitoringStatuses(array $orders, CaasifyApiClient $client, string $clientToken): array
    {
        $enrichedOrders = [];

        foreach ($orders as $order) {
            if (!is_array($order)) {
                continue;
            }

            $orderId = isset($order['id']) && is_numeric($order['id']) ? (int) $order['id'] : null;

            if ($orderId !== null) {
                try {
                    $statusPayload = $client->getOrderStatus($clientToken, $orderId);
                    $monitoringStatus = $this->extractString($statusPayload, ['status'])
                        ?? $this->extractString($statusPayload, ['data', 'status']);

                    if ($monitoringStatus !== null) {
                        $order['power_status'] = $monitoringStatus;
                    }
                } catch (\Throwable) {
                }
            }

            $enrichedOrders[] = $order;
        }

        return $enrichedOrders;
    }

    private function resolveOrderPowerState(CaasifyApiClient $client, string $clientToken, int $orderId): ?bool
    {
        try {
            $statusPayload = $client->getOrderStatus($clientToken, $orderId);
            $monitoringStatus = $this->extractString($statusPayload, ['status'])
                ?? $this->extractString($statusPayload, ['data', 'status']);

            if ($monitoringStatus !== null) {
                return $this->orderMapper->describeStatus(null, $monitoringStatus)['powerState'];
            }
        } catch (\Throwable) {
        }

        $orderPayload = $client->getOrder($clientToken, $orderId);
        $orderData = $this->extractPayloadData($orderPayload);
        $mappedOrders = $this->orderMapper->mapList([$orderData]);

        return $mappedOrders[0]['powerState'] ?? null;
    }

    /**
     * @return array<string, string>
     */
    private function waitForConsoleParameters(
        CaasifyApiClient $client,
        string $clientToken,
        int $orderId,
        int $actionId
    ): array {
        for ($attempt = 0; $attempt < self::CONSOLE_POLL_ATTEMPTS; $attempt++) {
            $actionsPayload = $client->getOrderActions($clientToken, $orderId);
            $actions = $this->extractPayloadList($actionsPayload, 'data');

            foreach ($actions as $action) {
                $currentActionId = isset($action['id']) && is_numeric($action['id']) ? (int) $action['id'] : null;

                if ($currentActionId === null || $currentActionId !== $actionId) {
                    continue;
                }

                $consoleParams = $this->orderMapper->extractConsoleParameters($action);

                if (($consoleParams['address'] ?? null) !== null) {
                    return $consoleParams;
                }
            }

            if ($attempt < self::CONSOLE_POLL_ATTEMPTS - 1) {
                sleep(self::CONSOLE_POLL_INTERVAL_SECONDS);
            }
        }

        return [];
    }

    /**
     * @param array<string, string> $consoleParams
     */
    private function buildNoVncViewerUrl(array $consoleParams): ?string
    {
        $address = $this->normalizeNullableString($consoleParams['address'] ?? null);

        if ($address === null) {
            return null;
        }

        $parts = parse_url($address);

        if (!is_array($parts) || !isset($parts['host']) || !is_string($parts['host'])) {
            return null;
        }

        $host = trim($parts['host']);

        if ($host === '') {
            return null;
        }

        $port = isset($parts['port']) && is_numeric($parts['port'])
            ? (string) ((int) $parts['port'])
            : ((($parts['scheme'] ?? 'https') === 'http') ? '80' : '443');

        $query = [
            'host' => $host,
            'port' => $port,
        ];

        parse_str((string) ($parts['query'] ?? ''), $addressQuery);

        foreach ($addressQuery as $key => $value) {
            if (!is_string($key) || $key === '' || !is_scalar($value)) {
                continue;
            }

            $normalizedValue = trim((string) $value);

            if ($normalizedValue === '') {
                continue;
            }

            $query[$key] = $normalizedValue;
        }

        $password = $this->normalizeNullableString($consoleParams['password'] ?? null);

        if ($password !== null) {
            $query['password'] = $password;
        }

        return rtrim(WhmcsAdminUrl::getSystemUrl(), '/')
            . '/modules/addons/caasify/assets/novnc/vnc_lite.html?'
            . http_build_query($query);
    }
}
