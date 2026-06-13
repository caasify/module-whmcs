<?php

declare(strict_types=1);

namespace Caasify\Controllers;

use Caasify\Core\Support\JsonResponse;
use Caasify\Services\Caasify\Server\Actions\FetchPublicPricingCatalog;

final class PublicPricingCatalogController
{
    public function __construct(
        private readonly FetchPublicPricingCatalog $catalog = new FetchPublicPricingCatalog()
    ) {
    }

    /**
     * @param array<string, mixed> $query
     */
    public function handle(array $query): void
    {
        $countryTermId = isset($query['countryTermId']) && is_numeric($query['countryTermId'])
            ? (int) $query['countryTermId']
            : 0;

        if ($countryTermId <= 0) {
            JsonResponse::send([
                'success' => false,
                'message' => 'Select a country before loading offers.',
            ], 422);
        }

        JsonResponse::send([
            'success' => true,
            'productsPayload' => $this->catalog->fetchProductsForCountryTerm($countryTermId),
        ]);
    }
}
