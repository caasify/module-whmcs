<?php

declare(strict_types=1);

namespace Caasify\Services\Whmcs\Actions\Billing;

use Caasify\Services\Whmcs\Client\LocalApiClient;
use Caasify\Services\Whmcs\Mappers\Billing\InvoiceMapper;

final class GetCustomerInvoices
{
    public function __construct(
        private readonly LocalApiClient $localApiClient = new LocalApiClient(),
        private readonly InvoiceMapper $invoiceMapper = new InvoiceMapper()
    ) {
    }

    public function execute(int $clientId, int $limit = 100): array
    {
        $results = $this->localApiClient->call('GetInvoices', [
            'userid' => $clientId,
            'limitnum' => max(1, $limit),
        ]);

        $invoices = $results['invoices']['invoice'] ?? [];

        if (is_array($invoices) && $invoices !== [] && array_key_exists('id', $invoices)) {
            $invoices = [$invoices];
        }

        return $this->invoiceMapper->mapList(is_array($invoices) ? $invoices : []);
    }
}
