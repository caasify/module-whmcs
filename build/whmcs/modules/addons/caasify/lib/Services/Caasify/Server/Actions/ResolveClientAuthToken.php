<?php

declare(strict_types=1);

namespace Caasify\Services\Caasify\Server\Actions;

use Caasify\Repositories\CaasifySettingsRepository;
use Caasify\Repositories\CaasifyUserRepository;
use Caasify\Services\Caasify\Server\Client\CaasifyApiClient;
use Caasify\Services\Caasify\Server\Exceptions\CaasifyApiException;
use WHMCS\User\Client;

final class ResolveClientAuthToken
{
    public function __construct(
        private readonly CaasifyUserRepository $users = new CaasifyUserRepository(),
        private readonly CaasifySettingsRepository $settings = new CaasifySettingsRepository()
    ) {
    }

    public function handle(int $clientId, ?string $adminApiToken): string
    {
        $existingToken = $this->users->getTokenByWhmcsClientId($clientId);

        if ($existingToken !== null) {
            return $existingToken;
        }

        $adminApiToken = $this->normalizeNullableString($adminApiToken);

        if ($adminApiToken === null) {
            throw new CaasifyApiException('Admin API token is not configured.');
        }

        $profile = $this->getWhmcsClientProfile($clientId);
        $client = $this->createApiClient();
        $createResponse = $client->createUser($adminApiToken, $profile);
        $token = $this->extractString($createResponse, ['token'])
            ?? $this->extractString($createResponse, ['data', 'token']);

        if ($token === null) {
            $loginResponse = $client->loginUser($profile['email'], $profile['password']);
            $token = $this->extractString($loginResponse, ['data', 'token'])
                ?? $this->extractString($loginResponse, ['token']);
        }

        if ($token === null) {
            throw new CaasifyApiException('The API did not return a client token.');
        }

        $this->users->saveTokenByWhmcsClientId($clientId, $token);

        return $token;
    }

    private function createApiClient(): CaasifyApiClient
    {
        $settings = $this->settings->getSettings();
        $baseUrl = $settings['hubBaseUrl'] ?? null;

        return is_string($baseUrl) && trim($baseUrl) !== ''
            ? new CaasifyApiClient(trim($baseUrl))
            : new CaasifyApiClient();
    }

    private function getWhmcsClientProfile(int $clientId): array
    {
        $client = Client::find($clientId);

        if (!$client || !isset($client->id)) {
            throw new CaasifyApiException('WHMCS client was not found.');
        }

        $email = $this->normalizeNullableString($client->email ?? null);

        if ($email === null) {
            throw new CaasifyApiException('WHMCS client email is missing.');
        }

        $firstName = $this->normalizeNullableString($client->firstname ?? null);
        $lastName = $this->normalizeNullableString($client->lastname ?? null);
        $fullName = trim((string) $firstName . ' ' . (string) $lastName);

        return [
            'name' => $fullName !== '' ? $fullName : $email,
            'email' => $email,
            'password' => $this->createPassword(),
            'country' => $this->normalizeNullableString($client->country ?? null),
            'phone' => $this->normalizeNullableString(
                $client->phonenumber
                ?? $client->phoneNumber
                ?? $client->phone
                ?? null
            ),
        ];
    }

    private function createPassword(): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_-=+;:,<.>?';
        $password = '';
        $maxIndex = strlen($alphabet) - 1;

        for ($index = 0; $index < 24; $index++) {
            $password .= $alphabet[random_int(0, $maxIndex)];
        }

        return $password;
    }

    private function extractString(array $payload, array $path): ?string
    {
        $value = $payload;

        foreach ($path as $segment) {
            if (!is_array($value) || !array_key_exists($segment, $value)) {
                return null;
            }

            $value = $value[$segment];
        }

        return $this->normalizeNullableString($value);
    }

    private function normalizeNullableString(mixed $value): ?string
    {
        if (!is_scalar($value)) {
            return null;
        }

        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }
}
