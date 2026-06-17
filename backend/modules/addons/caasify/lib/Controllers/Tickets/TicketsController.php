<?php

declare(strict_types=1);

namespace Caasify\Controllers\Tickets;

use Caasify\Core\Support\JsonResponse;
use Caasify\Services\Whmcs\Actions\Tickets\GetCustomerTickets;

final class TicketsController
{
    public function __construct(
        private readonly GetCustomerTickets $getCustomerTickets = new GetCustomerTickets()
    ) {
    }

    public function handle(int $clientId): void
    {
        JsonResponse::send([
            'success' => true,
            'tickets' => $this->getCustomerTickets->execute($clientId),
        ]);
    }
}
