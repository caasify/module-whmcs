<?php

declare(strict_types=1);

namespace Caasify\Controllers;

use Caasify\Core\Support\JsonResponse;
use Caasify\Services\Caasify\Server\Actions\ResolveClientAuthToken;

final class DashboardDirectAuthTokenController
{
    public function __construct(
        private readonly ResolveClientAuthToken $authTokenResolver = new ResolveClientAuthToken()
    ) {
    }

    public function handle(int $clientId, ?string $adminApiToken): void
    {
        JsonResponse::send([
            'success' => true,
            'directAuthToken' => $this->authTokenResolver->handle($clientId, $adminApiToken),
        ]);
    }
}
