<?php

declare(strict_types=1);

namespace Caasify\Core\Config;

final class WhmcsClientAreaUrl
{
    public static function getClientAreaUrl(string $script = '', array $query = []): string
    {
        $baseUrl = rtrim(WhmcsAdminUrl::getSystemUrl(), '/');
        $script = ltrim($script, '/');

        if ($script !== '') {
            $baseUrl .= '/' . $script;
        }

        if ($query !== []) {
            $baseUrl .= '?' . http_build_query($query);
        }

        return $baseUrl;
    }

    public static function getTicketCreateUrl(): string
    {
        return self::getClientAreaUrl('submitticket.php');
    }

    public static function getTicketListUrl(): string
    {
        return self::getClientAreaUrl('supporttickets.php');
    }

    public static function getTicketDetailUrl(int $ticketId): string
    {
        return self::getClientAreaUrl('supporttickets.php', [
            'action' => 'view',
            'id' => $ticketId,
        ]);
    }

    public static function getInvoiceListUrl(): string
    {
        return self::getClientAreaUrl('clientarea.php', [
            'action' => 'invoices',
        ]);
    }

    public static function getClientHomeUrl(): string
    {
        return self::getClientAreaUrl('clientarea.php');
    }

    public static function getInvoiceDetailUrl(int $invoiceId): string
    {
        return self::getClientAreaUrl('viewinvoice.php', [
            'id' => $invoiceId,
        ]);
    }

    public static function getAddFundsUrl(): string
    {
        return self::getClientAreaUrl('clientarea.php', [
            'action' => 'addfunds',
        ]);
    }

    public static function getPublicRoutes(): array
    {
        return [
            'clientAreaUrl' => self::getClientHomeUrl(),
            'ticketCreateUrl' => self::getTicketCreateUrl(),
            'ticketListUrl' => self::getTicketListUrl(),
            'invoiceListUrl' => self::getInvoiceListUrl(),
            'addFundsUrl' => self::getAddFundsUrl(),
        ];
    }
}
