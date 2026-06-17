<?php

declare(strict_types=1);

namespace Caasify\Services\Whmcs\Mappers\Billing;

final class InvoiceMapper
{
    public function mapList(array $invoices): array
    {
        $mapped = [];

        foreach ($invoices as $invoice) {
            if (!is_array($invoice)) {
                continue;
            }

            $mapped[] = $this->mapOne($invoice);
        }

        return $mapped;
    }

    /**
     * @param array<string, mixed> $invoice
     *
     * @return array<string, mixed>
     */
    private function mapOne(array $invoice): array
    {
        $id = (string) ($invoice['id'] ?? $invoice['invoiceid'] ?? $invoice['invoice_id'] ?? '');
        $status = $this->normalizeStatus($invoice['status'] ?? $invoice['invoice_status'] ?? 'Unpaid');
        $total = $this->normalizeFloat($invoice['total'] ?? $invoice['amount'] ?? $invoice['balance'] ?? 0);
        $issuedDate = (string) ($invoice['date'] ?? $invoice['issuedate'] ?? $invoice['created_at'] ?? '');
        $dueDate = (string) ($invoice['duedate'] ?? $invoice['due_date'] ?? '');
        $invoiceNumber = (string) ($invoice['invoicenum'] ?? $invoice['number'] ?? $id);
        $statusCode = $this->statusCode($status);

        return [
            'id' => $id,
            'number' => $invoiceNumber,
            'invoiceNumber' => $invoiceNumber,
            'issuedDate' => $issuedDate,
            'dueDate' => $dueDate,
            'status' => $status,
            'statusCode' => $statusCode,
            'statusTone' => $this->statusTone($statusCode),
            'total' => $total,
            'totalDisplay' => (string) ($invoice['total_display'] ?? $invoice['totalFormatted'] ?? ''),
            'subtotal' => $this->normalizeFloat($invoice['subtotal'] ?? $total),
            'credit' => $this->normalizeFloat($invoice['credit'] ?? 0),
            'currencyCode' => (string) ($invoice['currencycode'] ?? $invoice['currency_code'] ?? ''),
            'notes' => (string) ($invoice['notes'] ?? ''),
            'amountDue' => $this->normalizeFloat($invoice['amount_due'] ?? $invoice['balance'] ?? $total),
            'amountDueDisplay' => (string) ($invoice['amount_due_display'] ?? ''),
            'creditApplied' => $this->normalizeFloat($invoice['credit_applied'] ?? 0),
            'paymentMethod' => (string) ($invoice['paymentmethod'] ?? $invoice['payment_method'] ?? 'Payment Gateway'),
            'paymentMethodCode' => (string) ($invoice['payment_method_code'] ?? ''),
            'portalUrl' => (string) ($invoice['portalUrl'] ?? $invoice['portal_url'] ?? ''),
            'type' => (string) ($invoice['type'] ?? 'WHMCS Invoice'),
            'typeCode' => (string) ($invoice['typeCode'] ?? 'whmcsInvoice'),
        ];
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
}
