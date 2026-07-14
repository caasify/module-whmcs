<?php

declare(strict_types=1);

namespace Caasify\Services\Whmcs\Actions\Billing;

use Caasify\Core\Config\WhmcsCompanyProfile;
use Caasify\Core\Pricing\ClientPricingService;
use Caasify\Core\Support\ValidationException;
use Caasify\Repositories\AddFundsInvoiceRepository;
use Caasify\Services\Whmcs\Client\LocalApiClient;

final class CreateAddFundsInvoice
{
    public function __construct(
        private readonly LocalApiClient $localApiClient = new LocalApiClient(),
        private readonly GetActivatedPaymentMethods $getActivatedPaymentMethods = new GetActivatedPaymentMethods(),
        private readonly AddFundsInvoiceRepository $addFundsInvoices = new AddFundsInvoiceRepository(),
        private readonly ClientPricingService $pricing = new ClientPricingService()
    ) {
    }

    public function execute(int $clientId, float $amount, string $paymentMethodCode): string
    {
        $brandName = WhmcsCompanyProfile::getName('Company');
        $lineItemDescription = AddFundsInvoiceRepository::LINE_ITEM_PREFIX . ' ' . $brandName . ' account top-up / pre-payment';

        if ($amount <= 0) {
            throw new ValidationException('Please enter a valid amount.');
        }

        $availableMethods = $this->getActivatedPaymentMethods->execute();
        $allowedMethodCodes = array_map(
            static fn(array $method): string => (string) ($method['module'] ?? ''),
            $availableMethods
        );

        if (!in_array($paymentMethodCode, $allowedMethodCodes, true)) {
            throw new ValidationException('Please choose a valid payment method.');
        }

        $pricingContext = $this->pricing->buildClientPricingContext($clientId);

        if (($pricingContext['moneyActionsBlocked'] ?? false) === true) {
            throw new ValidationException(
                'Top-ups are temporarily unavailable because pricing for your currency is not configured yet.'
            );
        }

        $creditedEurAmount = $this->pricing->convertClientAmountToHubEuro($amount, $pricingContext, 2);

        if ($creditedEurAmount === null || $creditedEurAmount <= 0) {
            throw new ValidationException('Unable to calculate the top-up value for ' . $brandName . ' right now.');
        }

        $today = date('Y-m-d');
        $results = $this->localApiClient->call('CreateInvoice', [
            'userid' => $clientId,
            'status' => 'Unpaid',
            'sendinvoice' => false,
            'paymentmethod' => $paymentMethodCode,
            'date' => $today,
            'duedate' => $today,
            'notes' => AddFundsInvoiceRepository::INVOICE_MARKER,
            'itemdescription1' => $lineItemDescription,
            'itemamount1' => number_format($amount, 2, '.', ''),
            'itemtaxed1' => true,
            'autoapplycredit' => false,
        ]);

        $invoiceId = trim((string) ($results['invoiceid'] ?? ''));

        if ($invoiceId === '') {
            throw new ValidationException('Unable to create the add funds invoice right now.');
        }

        $this->addFundsInvoices->createPending(
            (int) $invoiceId,
            $clientId,
            $amount,
            $paymentMethodCode,
            [
                'clientCurrencyId' => $pricingContext['clientCurrencyId'] ?? null,
                'clientCurrencyCode' => $pricingContext['clientCurrencyCode'] ?? 'EUR',
                'eurRate' => $pricingContext['eurRate'] ?? null,
                'commissionPercent' => $pricingContext['commissionPercent'] ?? 0.0,
                'creditedEurAmount' => $creditedEurAmount,
            ]
        );

        return $invoiceId;
    }
}
