<?php

declare(strict_types=1);

namespace Caasify\Core\Auth;

use WHMCS\Authentication\CurrentUser;

final class WhmcsClientAreaAccess
{
    public function canUseCustomTicketsAndInvoices(): bool
    {
        $currentUser = new CurrentUser();
        $client = $currentUser->client();

        if (!$client || !isset($client->id)) {
            return (new CurrentClient())->getId() !== null;
        }

        if (!method_exists($currentUser, 'user')) {
            return true;
        }

        $user = $currentUser->user();

        if (!$user || !isset($user->id)) {
            return true;
        }

        $clientId = (int) $client->id;
        $userId = (int) $user->id;

        if ($clientId <= 0 || $userId <= 0) {
            return false;
        }

        if (method_exists($client, 'owner')) {
            try {
                $owner = $client->owner();

                if ($owner && isset($owner->id)) {
                    return (int) $owner->id === $userId;
                }
            } catch (\Throwable) {
                return false;
            }
        }

        return false;
    }
}
