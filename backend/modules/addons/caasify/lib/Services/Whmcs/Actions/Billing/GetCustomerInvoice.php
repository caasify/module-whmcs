<?php

declare(strict_types=1);

namespace Caasify\Services\Whmcs\Actions\Billing;

use Caasify\Services\Whmcs\Client\LocalApiClient;
use Caasify\Services\Whmcs\Mappers\Billing\InvoiceDetailMapper;

final class GetCustomerInvoice
{
    public function __construct(
        private readonly LocalApiClient $localApiClient = new LocalApiClient(),
        private readonly InvoiceDetailMapper $invoiceDetailMapper = new InvoiceDetailMapper()
    ) {
    }

    public function execute(int $clientId, int $invoiceId): array
    {
        $results = $this->localApiClient->call('GetInvoice', [
            'userid' => $clientId,
            'invoiceid' => $invoiceId,
        ]);

        $invoice = $results['invoice'] ?? $results;

        if (!is_array($invoice)) {
            $invoice = [];
        }

        return $this->invoiceDetailMapper->map($invoice);
    }
}
