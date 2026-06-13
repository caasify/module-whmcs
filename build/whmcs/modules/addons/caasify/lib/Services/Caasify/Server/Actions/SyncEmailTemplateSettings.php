<?php

declare(strict_types=1);

namespace Caasify\Services\Caasify\Server\Actions;

use Caasify\Core\Config\DashboardSettings;
use Caasify\Services\Caasify\Server\Client\CaasifyApiClient;
use Caasify\Services\Caasify\Server\Exceptions\CaasifyApiException;

final class SyncEmailTemplateSettings
{
    public function handle(array $settings): void
    {
        $adminToken = DashboardSettings::sanitizeToken($settings['adminApiToken'] ?? null);

        if ($adminToken === null) {
            throw new CaasifyApiException('Admin API token is missing.');
        }

        $hubBaseUrl = DashboardSettings::normalizeHubBaseUrl($settings['hubBaseUrl'] ?? null);
        $emailSettings = DashboardSettings::normalizeEmailSettings(
            is_array($settings['emailSettings'] ?? null) ? $settings['emailSettings'] : []
        );

        $client = new CaasifyApiClient($hubBaseUrl);
        $client->saveResellerEmailTemplate($adminToken, $emailSettings);
    }
}
