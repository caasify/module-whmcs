<?php

declare(strict_types=1);

namespace Caasify\Repositories;

use Caasify\Core\Support\CurrencyFormat;
use Illuminate\Database\Schema\Blueprint;
use WHMCS\Database\Capsule;

final class AddFundsInvoiceRepository
{
    public const TABLE = 'tblcaasify_add_funds';
    public const INVOICE_MARKER = 'caasify_add_funds';
    public const LINE_ITEM_PREFIX = '[caasify_add_funds]';
    public const STATUS_PENDING = 'pending';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_CREDITED = 'credited';
    public const STATUS_FAILED = 'failed';
    public const ADMIN_FILTER_ALL = 'all';
    public const ADMIN_FILTER_PAID = 'paid';
    public const ADMIN_FILTER_UNPAID = 'unpaid';
    public const ADMIN_FILTER_CHARGED = 'charged';
    public const ADMIN_FILTER_NOT_CHARGED = 'not_charged';

    private readonly WhmcsCurrencyRepository $whmcsCurrencies;

    public function __construct(?WhmcsCurrencyRepository $whmcsCurrencies = null)
    {
        $this->whmcsCurrencies = $whmcsCurrencies ?? new WhmcsCurrencyRepository();
    }

    public static function ensureTable(): void
    {
        $schema = Capsule::schema();

        if (!$schema->hasTable(self::TABLE)) {
            $schema->create(self::TABLE, function (Blueprint $table): void {
                $table->increments('id');
                $table->unsignedInteger('invoice_id');
                $table->unsignedInteger('wh_user_id');
                $table->decimal('amount', 18, 2);
                $table->unsignedInteger('client_currency_id')->nullable();
                $table->string('client_currency_code', 8)->nullable();
                $table->decimal('eur_rate', 18, 6)->nullable();
                $table->decimal('commission_percent', 10, 4)->nullable();
                $table->decimal('credited_eur_amount', 18, 2)->nullable();
                $table->string('payment_method_code', 64)->nullable();
                $table->string('status', 32)->default(self::STATUS_PENDING);
                $table->string('caasify_transaction_id', 255)->nullable();
                $table->text('last_error')->nullable();
                $table->timestamp('created_at')->nullable();
                $table->timestamp('updated_at')->nullable();
                $table->unique('invoice_id', 'tblcaasify_add_funds_invoice_id_unique');
            });
        }

        self::ensureCurrentColumns();
    }

    /**
     * @param array<string, mixed> $pricingSnapshot
     */
    public function createPending(
        int $invoiceId,
        int $clientId,
        float $amount,
        string $paymentMethodCode,
        array $pricingSnapshot = []
    ): void
    {
        self::ensureTable();

        $timestamp = date('Y-m-d H:i:s');
        $payload = [
            'invoice_id' => $invoiceId,
            'wh_user_id' => $clientId,
            'amount' => number_format($amount, 2, '.', ''),
            'client_currency_id' => isset($pricingSnapshot['clientCurrencyId']) && is_numeric($pricingSnapshot['clientCurrencyId'])
                ? (int) $pricingSnapshot['clientCurrencyId']
                : null,
            'client_currency_code' => $this->normalizeNullableString($pricingSnapshot['clientCurrencyCode'] ?? null),
            'eur_rate' => $this->formatDecimal($pricingSnapshot['eurRate'] ?? null, 6),
            'commission_percent' => $this->formatDecimal($pricingSnapshot['commissionPercent'] ?? null, 4),
            'credited_eur_amount' => $this->formatDecimal($pricingSnapshot['creditedEurAmount'] ?? null, 2),
            'payment_method_code' => $this->normalizeNullableString($paymentMethodCode),
            'status' => self::STATUS_PENDING,
            'caasify_transaction_id' => null,
            'last_error' => null,
            'updated_at' => $timestamp,
        ];

        $query = Capsule::table(self::TABLE)->where('invoice_id', $invoiceId);

        if ($query->exists()) {
            $query->update($payload);

            return;
        }

        $payload['created_at'] = $timestamp;
        Capsule::table(self::TABLE)->insert($payload);
    }

    public function findByInvoiceId(int $invoiceId): ?array
    {
        self::ensureTable();

        $row = Capsule::table(self::TABLE)
            ->where('invoice_id', $invoiceId)
            ->first();

        if (!is_object($row)) {
            return null;
        }

        /** @var array<string, mixed> $record */
        $record = get_object_vars($row);

        return $record;
    }

    public function markProcessing(int $invoiceId): bool
    {
        self::ensureTable();

        return Capsule::table(self::TABLE)
            ->where('invoice_id', $invoiceId)
            ->where('status', self::STATUS_PENDING)
            ->update([
                'status' => self::STATUS_PROCESSING,
                'updated_at' => date('Y-m-d H:i:s'),
            ]) === 1;
    }

    public function markCredited(int $invoiceId, ?string $transactionId): void
    {
        self::ensureTable();

        Capsule::table(self::TABLE)
            ->where('invoice_id', $invoiceId)
            ->update([
                'status' => self::STATUS_CREDITED,
                'caasify_transaction_id' => $this->normalizeNullableString($transactionId),
                'last_error' => null,
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
    }

    public function markFailed(int $invoiceId, string $message): void
    {
        self::ensureTable();

        Capsule::table(self::TABLE)
            ->where('invoice_id', $invoiceId)
            ->update([
                'status' => self::STATUS_FAILED,
                'last_error' => $this->truncateMessage($message),
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
    }

    /**
     * @return string[]
     */
    public static function getAdminFilters(): array
    {
        return [
            self::ADMIN_FILTER_ALL,
            self::ADMIN_FILTER_PAID,
            self::ADMIN_FILTER_UNPAID,
            self::ADMIN_FILTER_CHARGED,
            self::ADMIN_FILTER_NOT_CHARGED,
        ];
    }

    public static function normalizeAdminFilter(?string $filter): string
    {
        $normalized = is_string($filter) ? strtolower(trim($filter)) : '';

        return in_array($normalized, self::getAdminFilters(), true)
            ? $normalized
            : self::ADMIN_FILTER_ALL;
    }

    public function countAdminInvoices(?string $statusFilter = null, ?string $searchTerm = null): int
    {
        self::ensureTable();

        $query = $this->buildAdminInvoicesQuery(self::normalizeAdminFilter($statusFilter), false, $this->normalizeSearchTerm($searchTerm));
        $count = $query->count();

        return is_numeric($count) ? (int) $count : 0;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getAdminInvoices(?string $statusFilter = null, int $page = 1, int $perPage = 10, ?string $searchTerm = null): array
    {
        self::ensureTable();

        $query = $this->buildAdminInvoicesQuery(self::normalizeAdminFilter($statusFilter), true, $this->normalizeSearchTerm($searchTerm))
            ->forPage(max(1, $page), max(1, $perPage));

        $rows = $query->get();
        $items = [];

        foreach ($rows as $row) {
            if (!is_object($row)) {
                continue;
            }

            /** @var array<string, mixed> $record */
            $record = get_object_vars($row);
            $items[] = $this->mapAdminInvoiceRecord($record);
        }

        return $items;
    }

    private function buildAdminInvoicesQuery(string $statusFilter, bool $selectFields, ?string $searchTerm = null)
    {
        $query = Capsule::table(self::TABLE . ' as add_funds')
            ->join('tblinvoices as invoices', 'invoices.id', '=', 'add_funds.invoice_id')
            ->join('tblclients as clients', 'clients.id', '=', 'add_funds.wh_user_id');

        $this->applyAdminFilter($query, $statusFilter);
        $this->applyAdminSearch($query, $searchTerm);

        if ($selectFields) {
            $query->select([
                'add_funds.id',
                'add_funds.invoice_id',
                'add_funds.amount',
                'add_funds.client_currency_id',
                'add_funds.client_currency_code',
                'add_funds.eur_rate',
                'add_funds.commission_percent',
                'add_funds.credited_eur_amount',
                'add_funds.status as charge_status',
                'clients.firstname',
                'clients.lastname',
                'invoices.status as invoice_status',
            ]);
        }

        return $query->orderByDesc('add_funds.id');
    }

    private function applyAdminFilter(object $query, string $statusFilter): void
    {
        switch ($statusFilter) {
            case self::ADMIN_FILTER_PAID:
                $query->whereRaw('LOWER(invoices.status) = ?', ['paid']);
                break;

            case self::ADMIN_FILTER_UNPAID:
                $query->whereRaw('LOWER(invoices.status) = ?', ['unpaid']);
                break;

            case self::ADMIN_FILTER_CHARGED:
                $query->where('add_funds.status', self::STATUS_CREDITED);
                break;

            case self::ADMIN_FILTER_NOT_CHARGED:
                $query->where('add_funds.status', '!=', self::STATUS_CREDITED);
                break;
        }
    }

    private function applyAdminSearch(object $query, ?string $searchTerm): void
    {
        if ($searchTerm === null || $searchTerm === '') {
            return;
        }

        $searchLike = '%' . $searchTerm . '%';

        $query->where(static function (object $searchQuery) use ($searchLike): void {
            $searchQuery->whereRaw('CAST(add_funds.invoice_id AS CHAR) LIKE ?', [$searchLike])
                ->orWhereRaw('LOWER(clients.email) LIKE ?', [strtolower($searchLike)]);
        });
    }

    /**
     * @param array<string, mixed> $record
     * @return array<string, mixed>
     */
    private function mapAdminInvoiceRecord(array $record): array
    {
        $clientCurrencyId = isset($record['client_currency_id']) && is_numeric($record['client_currency_id'])
            ? (int) $record['client_currency_id']
            : null;
        $clientCurrencyCode = $this->normalizeNullableString($record['client_currency_code'] ?? null)
            ?? 'EUR';
        $clientCurrency = $clientCurrencyId !== null ? $this->whmcsCurrencies->findCurrencyById($clientCurrencyId) : null;

        if ($clientCurrency === null) {
            $clientCurrency = $this->whmcsCurrencies->findCurrencyByCode($clientCurrencyCode);
        }

        $eurCurrency = $this->whmcsCurrencies->findCurrencyByCode('EUR');
        $amount = $this->formatCurrencyAmount($record['amount'] ?? null, $clientCurrency);
        $creditedAmount = $this->formatNullableCurrencyAmount($record['credited_eur_amount'] ?? null, $eurCurrency);
        $eurRate = $this->formatNullableDecimal($record['eur_rate'] ?? null, 2);
        $commissionPercent = $this->formatNullableDecimal($record['commission_percent'] ?? null, 2);
        $invoiceStatus = $this->normalizeNullableString($record['invoice_status'] ?? null) ?? 'Unpaid';
        $chargeStatus = strtolower((string) ($record['charge_status'] ?? ''));
        $isCharged = $chargeStatus === self::STATUS_CREDITED;
        $isPaid = strtolower($invoiceStatus) === 'paid';

        return [
            'invoiceId' => (string) ($record['invoice_id'] ?? ''),
            'client' => trim(implode(' ', array_filter([
                $this->normalizeNullableString($record['firstname'] ?? null),
                $this->normalizeNullableString($record['lastname'] ?? null),
            ]))) ?: '--',
            'paidAmount' => $amount,
            'creditedEur' => $creditedAmount,
            'eurRate' => $eurRate,
            'commissionPercent' => $commissionPercent !== null ? ($commissionPercent . '%') : null,
            'invoiceStatus' => $invoiceStatus,
            'chargeStatus' => $chargeStatus,
            'isPaid' => $isPaid,
            'isCharged' => $isCharged,
        ];
    }

    private static function ensureCurrentColumns(): void
    {
        $schema = Capsule::schema();
        $columns = [
            'invoice_id' => static function (Blueprint $table): void {
                $table->unsignedInteger('invoice_id');
            },
            'wh_user_id' => static function (Blueprint $table): void {
                $table->unsignedInteger('wh_user_id');
            },
            'amount' => static function (Blueprint $table): void {
                $table->decimal('amount', 18, 2);
            },
            'client_currency_id' => static function (Blueprint $table): void {
                $table->unsignedInteger('client_currency_id')->nullable();
            },
            'client_currency_code' => static function (Blueprint $table): void {
                $table->string('client_currency_code', 8)->nullable();
            },
            'eur_rate' => static function (Blueprint $table): void {
                $table->decimal('eur_rate', 18, 6)->nullable();
            },
            'commission_percent' => static function (Blueprint $table): void {
                $table->decimal('commission_percent', 10, 4)->nullable();
            },
            'credited_eur_amount' => static function (Blueprint $table): void {
                $table->decimal('credited_eur_amount', 18, 2)->nullable();
            },
            'payment_method_code' => static function (Blueprint $table): void {
                $table->string('payment_method_code', 64)->nullable();
            },
            'status' => static function (Blueprint $table): void {
                $table->string('status', 32)->default(self::STATUS_PENDING);
            },
            'caasify_transaction_id' => static function (Blueprint $table): void {
                $table->string('caasify_transaction_id', 255)->nullable();
            },
            'last_error' => static function (Blueprint $table): void {
                $table->text('last_error')->nullable();
            },
            'created_at' => static function (Blueprint $table): void {
                $table->timestamp('created_at')->nullable();
            },
            'updated_at' => static function (Blueprint $table): void {
                $table->timestamp('updated_at')->nullable();
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

    private function normalizeNullableString(mixed $value): ?string
    {
        if (!is_scalar($value)) {
            return null;
        }

        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }

    private function normalizeSearchTerm(?string $searchTerm): ?string
    {
        $normalized = is_string($searchTerm) ? trim($searchTerm) : '';

        if ($normalized === '') {
            return null;
        }

        return function_exists('mb_substr')
            ? mb_substr($normalized, 0, 255)
            : substr($normalized, 0, 255);
    }

    private function formatAmount(mixed $value): string
    {
        if (is_string($value)) {
            $value = str_replace(',', '', trim($value));
        }

        if (!is_numeric($value)) {
            return '0.00';
        }

        return number_format((float) $value, 2, '.', '');
    }

    /**
     * @param array<string, mixed>|null $currency
     */
    private function formatCurrencyAmount(mixed $value, ?array $currency = null): string
    {
        return CurrencyFormat::formatCurrency($value, $currency);
    }

    private function formatNullableAmount(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return $this->formatAmount($value);
    }

    /**
     * @param array<string, mixed>|null $currency
     */
    private function formatNullableCurrencyAmount(mixed $value, ?array $currency = null): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return $this->formatCurrencyAmount($value, $currency);
    }

    private function formatNullableDecimal(mixed $value, int $scale): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return $this->formatDecimal($value, $scale);
    }

    private function formatDecimal(mixed $value, int $scale): ?string
    {
        if (is_string($value)) {
            $value = str_replace(',', '', trim($value));
        }

        if (!is_numeric($value)) {
            return null;
        }

        return number_format((float) $value, $scale, '.', '');
    }

    private function truncateMessage(string $message): string
    {
        $normalized = trim($message);

        if ($normalized === '') {
            return 'Unknown error.';
        }

        return function_exists('mb_substr')
            ? mb_substr($normalized, 0, 65535)
            : substr($normalized, 0, 65535);
    }
}
