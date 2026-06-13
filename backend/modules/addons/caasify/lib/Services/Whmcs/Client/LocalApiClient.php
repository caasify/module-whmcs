<?php

declare(strict_types=1);

namespace Caasify\Services\Whmcs\Client;

use Caasify\Services\Whmcs\Config\LocalApiContext;
use Caasify\Services\Whmcs\Exceptions\WhmcsApiException;

final class LocalApiClient
{
    public function __construct(
        private readonly LocalApiContext $context = new LocalApiContext()
    ) {
    }

    public function call(string $command, array $postData = []): array
    {
        if (!function_exists('localAPI')) {
            throw new WhmcsApiException($command, 'WHMCS internal API is unavailable.');
        }

        $results = \localAPI($command, $postData, $this->context->getAdminUsername());

        if (!is_array($results)) {
            throw new WhmcsApiException($command, 'Unexpected WHMCS response.');
        }

        if (strtolower((string) ($results['result'] ?? 'error')) !== 'success') {
            $message = isset($results['message']) && is_string($results['message'])
                ? trim($results['message'])
                : null;

            throw new WhmcsApiException($command, $message !== '' ? $message : null);
        }

        return $results;
    }
}
