<?php

declare(strict_types=1);

namespace Caasify\Core\Auth;

final class AdminSettingsCsrf
{
    private const SESSION_KEY = 'caasify_admin_settings_csrf_token';

    public static function issueToken(): string
    {
        if (empty($_SESSION[self::SESSION_KEY]) || !is_string($_SESSION[self::SESSION_KEY])) {
            $_SESSION[self::SESSION_KEY] = bin2hex(random_bytes(32));
        }

        return $_SESSION[self::SESSION_KEY];
    }

    public static function isValid(?string $token): bool
    {
        if (!is_string($token) || $token === '') {
            return false;
        }

        $knownToken = $_SESSION[self::SESSION_KEY] ?? null;

        return is_string($knownToken) && hash_equals($knownToken, $token);
    }
}
