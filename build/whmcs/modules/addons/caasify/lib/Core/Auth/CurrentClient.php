<?php

declare(strict_types=1);

namespace Caasify\Core\Auth;

use WHMCS\Database\Capsule;
use WHMCS\Authentication\CurrentUser;
use WHMCS\User\Client;

final class CurrentClient
{
    public function getId(): ?int
    {
        $client = $this->getClient();

        if (!$client || !isset($client->id)) {
            return null;
        }

        return (int) $client->id;
    }

    public function getProfile(): array
    {
        $client = $this->getClient();

        if (!$client || !isset($client->id)) {
            return [];
        }

        $firstName = trim((string) ($client->firstname ?? ''));
        $lastName = trim((string) ($client->lastname ?? ''));
        $fullName = trim($firstName . ' ' . $lastName);
        $resolvedName = $fullName !== '' ? $fullName : ($firstName !== '' ? $firstName : 'Client');
        $addressLines = array_values(array_filter([
            trim((string) ($client->address1 ?? '')),
            trim((string) ($client->address2 ?? '')),
            trim(implode(', ', array_filter([
                trim((string) ($client->city ?? '')),
                trim((string) ($client->state ?? '')),
                trim((string) ($client->postcode ?? '')),
            ]))),
            trim((string) ($client->country ?? '')),
        ]));

        return [
            'id' => (int) $client->id,
            'name' => $firstName !== '' ? $firstName : $resolvedName,
            'fullName' => $resolvedName,
            'email' => trim((string) ($client->email ?? '')),
            'initials' => $this->buildInitials($resolvedName),
            'address' => $addressLines,
        ];
    }

    private function getClient(): mixed
    {
        $currentUser = new CurrentUser();
        $client = $currentUser->client();

        if ($client && isset($client->id)) {
            return $client;
        }

        $client = $this->resolveClientFromWhmcsUser($currentUser);

        if ($client !== null) {
            return $client;
        }

        return $this->resolveClientFromSession();
    }

    private function resolveClientFromWhmcsUser(CurrentUser $currentUser): ?object
    {
        if (!method_exists($currentUser, 'user')) {
            return null;
        }

        $user = $currentUser->user();

        if (!$user || !isset($user->id) || !is_numeric($user->id)) {
            return null;
        }

        $userRelationColumn = $this->getUsersClientsUserColumn();

        if ($userRelationColumn === null) {
            return null;
        }

        $linkedClientIds = Capsule::table('tblusers_clients')
            ->where($userRelationColumn, (int) $user->id)
            ->pluck('client_id');

        if (is_object($linkedClientIds) && method_exists($linkedClientIds, 'all')) {
            $linkedClientIds = $linkedClientIds->all();
        }

        if (!is_array($linkedClientIds)) {
            return null;
        }

        $resolvedClientIds = array_values(array_unique(array_filter(array_map(
            static function (mixed $value): int {
                if (is_string($value)) {
                    $value = trim($value);
                }

                return is_numeric($value) ? (int) $value : 0;
            },
            $linkedClientIds
        ))));

        if (count($resolvedClientIds) !== 1) {
            return null;
        }

        return $this->resolveClientById($resolvedClientIds[0]);
    }

    private function resolveClientFromSession(): ?object
    {
        $clientId = $this->readSessionValue('cid');

        if ($clientId !== null) {
            return $this->resolveClientById($clientId);
        }

        $userId = $this->readSessionValue('uid');

        if ($userId === null) {
            return null;
        }

        $userRelationColumn = $this->getUsersClientsUserColumn();

        if ($userRelationColumn === null) {
            return $this->resolveClientById($userId);
        }

        $linkedClientIds = Capsule::table('tblusers_clients')
            ->where($userRelationColumn, $userId)
            ->pluck('client_id');

        if (is_object($linkedClientIds) && method_exists($linkedClientIds, 'all')) {
            $linkedClientIds = $linkedClientIds->all();
        }

        if (is_array($linkedClientIds)) {
            $resolvedClientIds = array_values(array_unique(array_filter(array_map(
                static function (mixed $value): int {
                    if (is_string($value)) {
                        $value = trim($value);
                    }

                    return is_numeric($value) ? (int) $value : 0;
                },
                $linkedClientIds
            ))));

            if (count($resolvedClientIds) === 1) {
                return $this->resolveClientById($resolvedClientIds[0]);
            }
        }

        // Legacy WHMCS sessions can still use `uid` as the client id.
        return $this->resolveClientById($userId);
    }

    private function readSessionValue(string $key): ?int
    {
        $value = null;

        if (class_exists('\WHMCS\Session')) {
            $value = \WHMCS\Session::get($key);
        }

        if ($value === null && array_key_exists($key, $_SESSION)) {
            $value = $_SESSION[$key];
        }

        if (is_string($value)) {
            $value = trim($value);
        }

        if (!is_numeric($value)) {
            return null;
        }

        $resolvedValue = (int) $value;

        return $resolvedValue > 0 ? $resolvedValue : null;
    }

    private function getUsersClientsUserColumn(): ?string
    {
        try {
            $schema = Capsule::schema();

            if (!$schema->hasTable('tblusers_clients')) {
                return null;
            }

            if ($schema->hasColumn('tblusers_clients', 'auth_user_id')) {
                return 'auth_user_id';
            }

            if ($schema->hasColumn('tblusers_clients', 'user_id')) {
                return 'user_id';
            }
        } catch (\Throwable) {
            return null;
        }

        return null;
    }

    private function resolveClientById(int $clientId): ?object
    {
        if ($clientId <= 0) {
            return null;
        }

        $client = Client::find($clientId);

        if ($client && isset($client->id)) {
            return $client;
        }

        $row = Capsule::table('tblclients')
            ->where('id', $clientId)
            ->first();

        return is_object($row) ? $row : null;
    }

    private function buildInitials(string $value): string
    {
        $parts = preg_split('/\s+/', trim($value)) ?: [];
        $initials = '';

        foreach (array_slice(array_filter($parts), 0, 2) as $part) {
            $initials .= strtoupper(substr((string) $part, 0, 1));
        }

        return $initials !== '' ? $initials : 'CL';
    }
}
