<?php

declare(strict_types=1);

namespace Caasify\Repositories;

use Illuminate\Database\Schema\Blueprint;
use WHMCS\Database\Capsule;

final class CaasifyUserRepository
{
    public const TABLE = 'tblcaasify_user';

    public static function ensureTable(): void
    {
        $schema = Capsule::schema();

        if (!$schema->hasTable(self::TABLE)) {
            $schema->create(self::TABLE, function (Blueprint $table): void {
                $table->increments('id');
                $table->string('wh_user_id')->nullable();
                $table->string('token')->nullable();
            });
        }

        self::ensureCurrentColumns();
    }

    public function getTokenByWhmcsClientId(int $clientId): ?string
    {
        self::ensureTable();

        $token = Capsule::table(self::TABLE)
            ->where('wh_user_id', (string) $clientId)
            ->orderByDesc('id')
            ->value('token');

        return self::normalizeNullableString($token);
    }

    public function saveTokenByWhmcsClientId(int $clientId, ?string $token): void
    {
        self::ensureTable();

        $normalizedToken = self::normalizeNullableString($token);
        $query = Capsule::table(self::TABLE)->where('wh_user_id', (string) $clientId);

        if ($query->exists()) {
            $query->update([
                'token' => $normalizedToken,
            ]);

            return;
        }

        if ($normalizedToken === null) {
            return;
        }

        Capsule::table(self::TABLE)->insert([
            'wh_user_id' => (string) $clientId,
            'token' => $normalizedToken,
        ]);
    }

    private static function ensureCurrentColumns(): void
    {
        $schema = Capsule::schema();
        $columns = [
            'wh_user_id' => static function (Blueprint $table): void {
                $table->string('wh_user_id')->nullable();
            },
            'token' => static function (Blueprint $table): void {
                $table->string('token')->nullable();
            },
        ];

        foreach ($columns as $column => $definition) {
            if ($schema->hasColumn(self::TABLE, $column)) {
                continue;
            }

            $schema->table(self::TABLE, static function (Blueprint $table) use ($definition): void {
                $definition($table);
            });
        }
    }

    private static function normalizeNullableString(mixed $value): ?string
    {
        if (!is_scalar($value)) {
            return null;
        }

        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }
}
