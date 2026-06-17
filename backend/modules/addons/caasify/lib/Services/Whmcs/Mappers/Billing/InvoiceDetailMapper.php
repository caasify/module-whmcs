<?php

declare(strict_types=1);

namespace Caasify\Services\Whmcs\Mappers\Billing;

final class InvoiceDetailMapper
{
    /**
     * @param array<string, mixed> $invoice
     *
     * @return array<string, mixed>
     */
    public function map(array $invoice): array
    {
        $invoiceId = (string) ($invoice['id'] ?? $invoice['invoiceid'] ?? '');
        $status = $this->normalizeStatus($invoice['status'] ?? 'Unpaid');
        $statusCode = $this->statusCode($status);
        $total = $this->normalizeFloat($invoice['total'] ?? 0);
        $subtotal = $this->normalizeFloat($invoice['subtotal'] ?? $total);
        $creditApplied = $this->normalizeFloat($invoice['credit'] ?? 0);
        $amountDue = $this->normalizeFloat($invoice['balance'] ?? ($statusCode === 'paid' ? 0 : $total));
        $lineItems = $this->mapLineItems($invoice['items']['item'] ?? []);

        return [
            'amountDue' => $amountDue,
            'amountDueDisplay' => $this->stringValue($invoice['balanceformatted'] ?? $invoice['balance'] ?? ''),
            'canPay' => $amountDue > 0,
            'creditApplied' => $creditApplied,
            'creditAppliedDisplay' => $this->stringValue($invoice['creditformatted'] ?? ''),
            'dueDate' => $this->stringValue($invoice['duedate'] ?? ''),
            'id' => $invoiceId,
            'invoicedTo' => [
                'name' => $this->stringValue($invoice['clientname'] ?? ''),
                'email' => $this->stringValue($invoice['clientemail'] ?? ''),
                'address' => $this->mapAddress($invoice['billingaddress'] ?? ''),
            ],
            'issuedDate' => $this->stringValue($invoice['date'] ?? $invoice['datecreated'] ?? ''),
            'lineItems' => $lineItems,
            'notes' => $this->stringValue($invoice['notes'] ?? ''),
            'number' => $this->stringValue($invoice['invoicenum'] ?? $invoiceId),
            'payTo' => [
                'name' => $this->stringValue($invoice['companyname'] ?? ''),
                'email' => $this->stringValue($invoice['companyemail'] ?? ''),
                'address' => $this->mapAddress($invoice['companyaddress'] ?? ''),
            ],
            'paymentMethod' => $this->stringValue($invoice['paymentmethod'] ?? 'Payment Gateway'),
            'paymentMethodCode' => $this->paymentMethodCode($invoice['paymentmethod'] ?? ''),
            'portalUrl' => '',
            'status' => $status,
            'statusCode' => $statusCode,
            'statusTone' => $this->statusTone($statusCode),
            'subtotal' => $subtotal,
            'subtotalDisplay' => $this->stringValue($invoice['subtotalformatted'] ?? ''),
            'total' => $total,
            'totalDisplay' => $this->stringValue($invoice['totalformatted'] ?? ''),
            'type' => 'WHMCS Invoice',
            'typeCode' => 'whmcsInvoice',
        ];
    }

    /**
     * @param mixed $items
     * @return array<int, array<string, mixed>>
     */
    private function mapLineItems(mixed $items): array
    {
        if (!is_array($items)) {
            return [];
        }

        if (array_key_exists('description', $items)) {
            $items = [$items];
        }

        $mapped = [];

        foreach ($items as $index => $item) {
            if (!is_array($item)) {
                continue;
            }

            $mapped[] = [
                'amount' => $this->normalizeFloat($item['amount'] ?? 0),
                'amountDisplay' => $this->stringValue($item['amountformatted'] ?? $item['amount'] ?? ''),
                'description' => $this->stringValue($item['description'] ?? ''),
                'id' => (string) ($index + 1),
                'taxed' => false,
                'type' => '',
                'typeCode' => '',
            ];
        }

        return $mapped;
    }

    /**
     * @return array<int, string>
     */
    private function mapAddress(mixed $value): array
    {
        if (is_array($value)) {
            return array_values(array_filter(array_map(
                static fn ($line) => is_string($line) ? trim($line) : '',
                $value
            )));
        }

        $text = trim((string) $value);

        return $text !== '' ? preg_split('/\r\n|\r|\n/', $text) ?: [] : [];
    }

    private function normalizeStatus(mixed $value): string
    {
        $status = strtolower(trim((string) $value));
        return $status !== '' ? ucfirst($status) : 'Unpaid';
    }

    private function statusCode(string $status): string
    {
        return strtolower(preg_replace('/[^a-z0-9]+/i', '', $status) ?? '') ?: 'unpaid';
    }

    private function statusTone(string $statusCode): string
    {
        return match ($statusCode) {
            'paid' => 'success',
            'overdue', 'collections' => 'danger',
            'paymentpending' => 'info',
            'cancelled', 'refunded', 'draft' => 'neutral',
            default => 'warning',
        };
    }

    private function normalizeFloat(mixed $value): float
    {
        return is_numeric($value) ? (float) $value : 0.0;
    }

    private function stringValue(mixed $value): string
    {
        return is_string($value) ? trim($value) : (is_numeric($value) ? (string) $value : '');
    }

    private function paymentMethodCode(mixed $value): string
    {
        return strtolower($this->stringValue($value));
    }
}
