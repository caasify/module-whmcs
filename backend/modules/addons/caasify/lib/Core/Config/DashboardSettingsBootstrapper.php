<?php

declare(strict_types=1);

namespace Caasify\Core\Config;

use Caasify\Repositories\CaasifySettingsRepository;

final class DashboardSettingsBootstrapper
{
    public function ensureReady(): void
    {
        CaasifySettingsRepository::ensureTable();
    }
}
