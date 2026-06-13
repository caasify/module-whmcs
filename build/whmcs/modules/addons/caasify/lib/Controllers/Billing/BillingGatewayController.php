<?php

declare(strict_types=1);

namespace Caasify\Controllers\Billing;

use Caasify\Core\Support\JsonResponse;
use Caasify\Services\Whmcs\Actions\Billing\GetActivatedPaymentMethods;

final class BillingGatewayController
{
    public function __construct(
        private readonly GetActivatedPaymentMethods $getActivatedPaymentMethods = new GetActivatedPaymentMethods()
    ) {
    }

    public function handle(): void
    {
        JsonResponse::send([
            'success' => true,
            'paymentMethods' => $this->getActivatedPaymentMethods->execute(),
        ]);
    }
}
