<?php

declare(strict_types=1);

namespace Caasify\Services\Whmcs\Actions\Billing;

use Caasify\Services\Whmcs\Client\LocalApiClient;
use Caasify\Services\Whmcs\Mappers\Billing\PaymentMethodMapper;

final class GetActivatedPaymentMethods
{
    public function __construct(
        private readonly LocalApiClient $localApiClient = new LocalApiClient(),
        private readonly PaymentMethodMapper $paymentMethodMapper = new PaymentMethodMapper()
    ) {
    }

    public function execute(): array
    {
        $results = $this->localApiClient->call('GetPaymentMethods');
        $methods = $results['paymentmethods']['paymentmethod'] ?? [];

        if (is_array($methods) && $methods !== [] && array_key_exists('module', $methods)) {
            $methods = [$methods];
        }

        return $this->paymentMethodMapper->mapList(is_array($methods) ? $methods : []);
    }
}
