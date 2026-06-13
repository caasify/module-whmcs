<?php

declare(strict_types=1);

namespace Caasify\Services\Caasify\Server\Client;

use Caasify\Services\Caasify\Server\Exceptions\CaasifyApiException;

final class CaasifyApiClient
{
    private const DEFAULT_BASE_URL = 'https://hub.caasify.com';
    private const CONNECT_TIMEOUT_SECONDS = 10;
    private const REQUEST_TIMEOUT_SECONDS = 20;
    private const TIMEOUT_RETRY_COUNT = 1;
    private const TIMEOUT_RETRY_DELAY_MICROSECONDS = 250000;
    private const CURL_TIMEOUT_ERROR_CODE = 28;
    private const STREAM_TIMEOUT_ERROR_CODE = 10028;

    public function __construct(
        private readonly string $baseUrl = self::DEFAULT_BASE_URL
    ) {
    }

    public function createUser(string $adminToken, array $profile): array
    {
        $adminToken = $this->normalizeHeaderValue($adminToken);

        return $this->postForm('/server/v1/reseller/users/create', [
            'name' => $this->normalizeString($profile['name'] ?? null),
            'email' => $this->normalizeString($profile['email'] ?? null),
            'password' => $this->normalizeString($profile['password'] ?? null),
            'country' => $this->normalizeString($profile['country'] ?? null),
            'phone' => $this->normalizePhone($profile['phone'] ?? null),
        ], [
            'Authorization: Bearer ' . $adminToken,
        ]);
    }

    public function loginUser(string $email, string $password): array
    {
        return $this->postForm('/server/v1/auth/login', [
            'email' => $email,
            'password' => $password,
        ]);
    }

    public function getProfile(string $clientToken): array
    {
        $clientToken = $this->normalizeHeaderValue($clientToken);

        return $this->get('/server/v1/profile/show', [
            'Authorization: Bearer ' . $clientToken,
        ]);
    }

    public function getCountries(string $adminToken): array
    {
        $adminToken = $this->normalizeHeaderValue($adminToken);

        return $this->get('/server/v1/common/countries', [
            'Authorization: Bearer ' . $adminToken,
        ]);
    }

    public function getCommonTerms(string $adminToken): array
    {
        return $this->getCountries($adminToken);
    }

    public function getCountryProducts(string $adminToken, int $countryId): array
    {
        $adminToken = $this->normalizeHeaderValue($adminToken);
        $countryId = max(1, $countryId);

        return $this->get('/server/v1/common/countries/' . $countryId . '/products', [
            'Authorization: Bearer ' . $adminToken,
        ]);
    }

    public function getProductsByCountryTerm(string $adminToken, int $countryId): array
    {
        return $this->getCountryProducts($adminToken, $countryId);
    }

    public function getOrders(string $clientToken, int $page = 1): array
    {
        $clientToken = $this->normalizeHeaderValue($clientToken);
        $page = max(1, $page);

        return $this->get('/server/v1/orders?page=' . $page, [
            'Authorization: Bearer ' . $clientToken,
            'Date-Humanize: 1',
        ]);
    }

    public function getOrder(string $clientToken, int $orderId): array
    {
        $clientToken = $this->normalizeHeaderValue($clientToken);
        $orderId = max(1, $orderId);

        return $this->get('/server/v1/orders/' . $orderId . '/show', [
            'Authorization: Bearer ' . $clientToken,
            'Date-Humanize: 1',
        ]);
    }

    public function getOrderStatus(string $clientToken, int $orderId): array
    {
        $clientToken = $this->normalizeHeaderValue($clientToken);
        $orderId = max(1, $orderId);

        return $this->get('/server/v1/monitoring/orders/' . $orderId . '/status', [
            'Authorization: Bearer ' . $clientToken,
        ]);
    }

    public function getOrderActions(string $clientToken, int $orderId): array
    {
        $clientToken = $this->normalizeHeaderValue($clientToken);
        $orderId = max(1, $orderId);

        return $this->get('/server/v1/orders/' . $orderId . '/actions', [
            'Authorization: Bearer ' . $clientToken,
        ]);
    }

    public function runOrderAction(string $clientToken, int $orderId, int $buttonId): array
    {
        $clientToken = $this->normalizeHeaderValue($clientToken);
        $orderId = max(1, $orderId);
        $buttonId = max(1, $buttonId);

        return $this->postForm('/server/v1/orders/' . $orderId . '/action', [
            'button_id' => (string) $buttonId,
        ], [
            'Authorization: Bearer ' . $clientToken,
        ]);
    }

    public function saveResellerEmailTemplate(string $adminToken, array $settings): array
    {
        $adminToken = $this->normalizeHeaderValue($adminToken);

        return $this->postForm('/api/reseller/templates/save', [
            'subject' => isset($settings['subject']) && is_string($settings['subject']) ? $settings['subject'] : '',
            'content' => isset($settings['content']) && is_string($settings['content']) ? $settings['content'] : '',
            'from_name' => isset($settings['fromName']) && is_string($settings['fromName']) ? $settings['fromName'] : '',
        ], [
            'Authorization: Bearer ' . $adminToken,
        ], true);
    }

    public function increaseUserBalance(
        string $adminToken,
        string $caasifyUserId,
        float $amount,
        string $reference
    ): array {
        $adminToken = $this->normalizeHeaderValue($adminToken);
        $reference = $this->normalizeString($reference);

        if ($reference === null) {
            throw new CaasifyApiException('Missing balance reference.');
        }

        return $this->postForm(
            '/api/v1/backend/users/' . rawurlencode($caasifyUserId) . '/transactions/increase',
            [
                'amount' => $this->normalizeAmount($amount),
                'reference' => $reference,
            ],
            [
                'Authorization: Bearer ' . $adminToken,
            ]
        );
    }

    public function decreaseUserBalance(
        string $adminToken,
        string $caasifyUserId,
        float $amount,
        string $reference = 'admin'
    ): array {
        $adminToken = $this->normalizeHeaderValue($adminToken);
        $reference = $this->normalizeString($reference);

        if ($reference === null) {
            throw new CaasifyApiException('Missing balance reference.');
        }

        return $this->postForm(
            '/api/v1/backend/users/' . rawurlencode($caasifyUserId) . '/transactions/decrease',
            [
                'amount' => $this->normalizeAmount($amount),
                'type' => 'balance',
                'invoiceid' => $reference,
                'status' => 'paid',
                'reference' => $reference,
            ],
            [
                'Authorization: Bearer ' . $adminToken,
            ]
        );
    }

    private function get(string $path, array $headers = []): array
    {
        return $this->request('GET', $path, null, $headers);
    }

    private function postForm(
        string $path,
        array $form,
        array $headers = [],
        bool $preserveEmptyStrings = false
    ): array
    {
        return $this->request('POST', $path, $form, $headers, $preserveEmptyStrings);
    }

    private function request(
        string $method,
        string $path,
        ?array $form = null,
        array $headers = [],
        bool $preserveEmptyStrings = false
    ): array
    {
        $payload = $form === null
            ? []
            : array_filter(
                $form,
                static fn (mixed $value): bool => $value !== null && ($preserveEmptyStrings || $value !== '')
            );
        $body = $payload === [] ? null : http_build_query($payload);
        $requestHeaders = array_merge([
            'Accept: application/json',
        ], $headers);

        if ($body !== null) {
            $requestHeaders[] = 'Content-Type: application/x-www-form-urlencoded';
        }

        $maxAttempts = self::TIMEOUT_RETRY_COUNT + 1;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                if (function_exists('curl_init')) {
                    return $this->requestWithCurl($method, $path, $body, $requestHeaders);
                }

                return $this->requestWithStream($method, $path, $body, $requestHeaders);
            } catch (CaasifyApiException $exception) {
                if (!$this->shouldRetryTimeoutException($exception) || $attempt >= $maxAttempts) {
                    throw $exception;
                }

                usleep(self::TIMEOUT_RETRY_DELAY_MICROSECONDS);
            }
        }

        throw new CaasifyApiException('The API request failed.');
    }

    private function requestWithCurl(string $method, string $path, ?string $body, array $headers): array
    {
        $handle = curl_init($this->buildUrl($path));

        if ($handle === false) {
            throw new CaasifyApiException('Unable to initialize the API request.');
        }

        $options = [
            CURLOPT_CUSTOMREQUEST => strtoupper($method),
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => self::CONNECT_TIMEOUT_SECONDS,
            CURLOPT_TIMEOUT => self::REQUEST_TIMEOUT_SECONDS,
        ];

        if ($body !== null) {
            $options[CURLOPT_POSTFIELDS] = $body;
        }

        curl_setopt_array($handle, $options);

        $responseBody = curl_exec($handle);
        $statusCode = (int) curl_getinfo($handle, CURLINFO_HTTP_CODE);
        $errorCode = curl_errno($handle);
        $error = curl_error($handle);

        curl_close($handle);

        if ($responseBody === false) {
            throw new CaasifyApiException(
                $error !== '' ? $error : 'The API request failed.',
                $errorCode
            );
        }

        return $this->decodeResponse((string) $responseBody, $statusCode);
    }

    private function requestWithStream(string $method, string $path, ?string $body, array $headers): array
    {
        $context = stream_context_create([
            'http' => [
                'method' => strtoupper($method),
                'header' => implode("\r\n", $headers),
                'ignore_errors' => true,
                'timeout' => self::REQUEST_TIMEOUT_SECONDS,
            ],
        ]);

        if ($body !== null) {
            $context = stream_context_create([
                'http' => [
                    'method' => strtoupper($method),
                    'header' => implode("\r\n", $headers),
                    'content' => $body,
                    'ignore_errors' => true,
                    'timeout' => self::REQUEST_TIMEOUT_SECONDS,
                ],
            ]);
        }

        $phpError = null;
        set_error_handler(static function (int $severity, string $message) use (&$phpError): bool {
            $phpError = $message;

            return true;
        });
        try {
            $responseBody = file_get_contents($this->buildUrl($path), false, $context);
        } finally {
            restore_error_handler();
        }
        $statusCode = $this->resolveStreamStatusCode($http_response_header ?? []);

        if ($responseBody === false) {
            $message = is_string($phpError) && trim($phpError) !== ''
                ? trim($phpError)
                : 'The API request failed.';

            throw new CaasifyApiException(
                $message,
                $this->isTimeoutErrorMessage($message) ? self::STREAM_TIMEOUT_ERROR_CODE : 0
            );
        }

        return $this->decodeResponse((string) $responseBody, $statusCode);
    }

    private function decodeResponse(string $responseBody, int $statusCode): array
    {
        $decoded = json_decode($responseBody, true);

        if (!is_array($decoded)) {
            throw new CaasifyApiException('The API returned an invalid response.');
        }

        if ($statusCode >= 400) {
            $message = isset($decoded['message']) && is_string($decoded['message'])
                ? trim($decoded['message'])
                : 'The API request was rejected.';

            throw new CaasifyApiException($message);
        }

        return $decoded;
    }

    private function resolveStreamStatusCode(array $headers): int
    {
        $statusLine = $headers[0] ?? '';

        if (is_string($statusLine) && preg_match('/\s(\d{3})\s/', $statusLine, $matches) === 1) {
            return (int) $matches[1];
        }

        return 0;
    }

    private function buildUrl(string $path): string
    {
        return rtrim($this->baseUrl, '/') . '/' . ltrim($path, '/');
    }

    private function shouldRetryTimeoutException(CaasifyApiException $exception): bool
    {
        return $exception->getCode() === self::CURL_TIMEOUT_ERROR_CODE
            || $exception->getCode() === self::STREAM_TIMEOUT_ERROR_CODE
            || $this->isTimeoutErrorMessage($exception->getMessage());
    }

    private function isTimeoutErrorMessage(string $message): bool
    {
        return str_contains(strtolower($message), 'timed out');
    }

    private function normalizePhone(mixed $value): ?string
    {
        $phone = $this->normalizeString($value);

        return $phone === null ? null : str_replace(['-', '.', ' '], '', $phone);
    }

    private function normalizeString(mixed $value): ?string
    {
        if (!is_scalar($value)) {
            return null;
        }

        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }

    private function normalizeHeaderValue(string $value): string
    {
        $normalized = trim($value);

        if ($normalized === '' || str_contains($normalized, "\r") || str_contains($normalized, "\n")) {
            throw new CaasifyApiException('Invalid API token configuration.');
        }

        return $normalized;
    }

    private function normalizeAmount(float $value): string
    {
        if ($value <= 0) {
            throw new CaasifyApiException('Invalid balance amount.');
        }

        return number_format($value, 2, '.', '');
    }
}
