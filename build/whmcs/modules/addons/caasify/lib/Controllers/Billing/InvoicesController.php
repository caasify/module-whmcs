<?php

declare(strict_types=1);

namespace Caasify\Controllers\Billing;

use Caasify\Core\Support\JsonResponse;
use Caasify\Services\Whmcs\Actions\Billing\GetCustomerInvoices;

final class InvoicesController
{
    public function __construct(
        private readonly GetCustomerInvoices $getCustomerInvoices = new GetCustomerInvoices()
    ) {
    }

    public function handle(int $clientId): void
    {
        JsonResponse::send([
            'success' => true,
            'invoices' => $this->getCustomerInvoices->execute($clientId),
        ]);
    }
}
