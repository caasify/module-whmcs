<?php

declare(strict_types=1);

namespace Caasify\Controllers;

use Caasify\Core\Auth\DashboardCsrf;
use Caasify\Core\Config\DashboardSettings;
use Caasify\Core\Support\JsonResponse;

final class LanguagePreferenceController
{
    public function handle(int $clientId, array $payload): void
    {
        $csrfToken = isset($payload['csrfToken']) && is_string($payload['csrfToken'])
            ? $payload['csrfToken']
            : null;

        if (!DashboardCsrf::isValid($csrfToken)) {
            JsonResponse::send([
                'success' => false,
                'message' => 'Invalid request token.',
            ], 403);
        }

        $locale = isset($payload['locale']) && is_string($payload['locale']) ? strtolower($payload['locale']) : null;

        if (!DashboardSettings::isSupportedLocale($locale)) {
            JsonResponse::send([
                'success' => false,
                'message' => 'Unsupported language selection.',
            ], 422);
        }

        if (!DashboardSettings::persistLocaleCookie($locale)) {
            JsonResponse::send([
                'success' => false,
                'message' => 'Unable to save language preference.',
            ], 500);
        }

        JsonResponse::send([
            'success' => true,
            'locale' => $locale,
        ]);
    }
}
