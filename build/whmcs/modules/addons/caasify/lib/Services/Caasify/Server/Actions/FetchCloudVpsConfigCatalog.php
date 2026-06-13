<?php

declare(strict_types=1);

namespace Caasify\Services\Caasify\Server\Actions;

use Caasify\Core\Config\CloudVpsConfig;

final class FetchCloudVpsConfigCatalog
{
    public function __construct(
        private readonly FetchPublicPricingCatalog $catalog = new FetchPublicPricingCatalog()
    ) {
    }

    /**
     * @param array<string, mixed> $cloudVpsSettings
     * @return array{
     *   countries: array<int, array<string, mixed>>,
     *   datacenters: array<int, array<string, mixed>>,
     *   visibleCountryCodes: array<int, string>
     * }
     */
    public function handle(array $cloudVpsSettings = []): array
    {
        $catalogPayload = $this->catalog->handle();

        return CloudVpsConfig::buildAvailabilityCatalog(
            is_array($catalogPayload['commonTermsPayload'] ?? null) ? $catalogPayload['commonTermsPayload'] : ['data' => []],
            is_array($catalogPayload['productsPayload'] ?? null) ? $catalogPayload['productsPayload'] : ['data' => []],
            $cloudVpsSettings
        );
    }
}
