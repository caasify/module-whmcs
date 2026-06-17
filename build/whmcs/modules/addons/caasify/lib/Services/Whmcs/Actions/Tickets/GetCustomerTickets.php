<?php

declare(strict_types=1);

namespace Caasify\Services\Whmcs\Actions\Tickets;

use Caasify\Services\Whmcs\Client\LocalApiClient;
use Caasify\Services\Whmcs\Mappers\Tickets\TicketMapper;

final class GetCustomerTickets
{
    public function __construct(
        private readonly LocalApiClient $localApiClient = new LocalApiClient(),
        private readonly TicketMapper $ticketMapper = new TicketMapper()
    ) {
    }

    public function execute(int $clientId, int $limit = 100): array
    {
        $results = $this->localApiClient->call('GetTickets', [
            'clientid' => $clientId,
            'limitnum' => max(1, $limit),
        ]);

        $tickets = $results['tickets']['ticket'] ?? [];

        if (is_array($tickets) && $tickets !== [] && array_key_exists('subject', $tickets)) {
            $tickets = [$tickets];
        }

        return $this->ticketMapper->mapList(is_array($tickets) ? $tickets : []);
    }
}
