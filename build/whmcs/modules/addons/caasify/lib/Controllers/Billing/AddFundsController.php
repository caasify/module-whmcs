<?php

declare(strict_types=1);

namespace Caasify\Controllers\Billing;

use Caasify\Core\Auth\DashboardCsrf;
use Caasify\Core\Pricing\ClientPricingService;
use Caasify\Core\Support\JsonResponse;
use Caasify\Core\Support\ValidationException;
use Caasify\Services\Whmcs\Actions\Billing\CreateAddFundsInvoice;

final class AddFundsController
{
    public function __construct(
        private readonly CreateAddFundsInvoice $createAddFundsInvoice = new CreateAddFundsInvoice(),
        private readonly ClientPricingService $pricing = new ClientPricingService()
    ) {
    }

    public function handle(int $clientId, array $payload): void
    {
        $csrfToken = isset($payload['csrfToken']) && is_string($payload['csrfToken'])
            ? $payload['csrfToken']
            : null;

        if (!DashboardCsrf::isValid($csrfToken)) {
            JsonResponse::send([
                'success' => false,
                'message' => 'Invalid request token.',
            ], 403);
        }

        $amount = isset($payload['amount']) && is_numeric($payload['amount'])
            ? round((float) $payload['amount'], 2)
            : 0.0;
        $paymentMethodCode = isset($payload['paymentMethodCode']) && is_string($payload['paymentMethodCode'])
            ? trim($payload['paymentMethodCode'])
            : '';

        if ($amount <= 0) {
            throw new ValidationException('Please enter a valid amount.');
        }

        if ($paymentMethodCode === '') {
            throw new ValidationException('Please choose a payment method.');
        }

        $pricingContext = $this->pricing->buildClientPricingContext($clientId);

        if (($pricingContext['moneyActionsBlocked'] ?? false) === true) {
            throw new ValidationException(
                'Top-ups are temporarily unavailable because pricing for your currency is not configured yet.'
            );
        }

        $invoiceId = $this->createAddFundsInvoice->execute($clientId, $amount, $paymentMethodCode);

        JsonResponse::send([
            'success' => true,
            'invoiceId' => $invoiceId,
        ]);
    }
}
