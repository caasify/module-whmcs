<?php

declare(strict_types=1);

namespace Caasify\Controllers\Billing;

use Caasify\Core\Support\JsonResponse;
use Caasify\Core\Support\ValidationException;
use Caasify\Services\Whmcs\Actions\Billing\GetCustomerInvoice;

final class InvoiceController
{
    public function __construct(
        private readonly GetCustomerInvoice $getCustomerInvoice = new GetCustomerInvoice()
    ) {
    }

    public function handle(int $clientId, array $payload): void
    {
        $invoiceIdSource = $payload['invoiceId'] ?? ($_GET['invoiceId'] ?? null);
        $invoiceId = is_numeric($invoiceIdSource) ? (int) $invoiceIdSource : 0;

        if ($invoiceId <= 0) {
            throw new ValidationException('Invoice ID is required.');
        }

        JsonResponse::send([
            'success' => true,
            'invoice' => $this->getCustomerInvoice->execute($clientId, $invoiceId),
        ]);
    }
}
