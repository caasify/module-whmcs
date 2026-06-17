<?php

declare(strict_types=1);

namespace Caasify\Services\Whmcs\Mappers\Tickets;

final class TicketMapper
{
    public function mapList(array $tickets): array
    {
        $mapped = [];

        foreach ($tickets as $ticket) {
            if (!is_array($ticket)) {
                continue;
            }

            $mapped[] = $this->mapOne($ticket);
        }

        return $mapped;
    }

    /**
     * @param array<string, mixed> $ticket
     *
     * @return array<string, mixed>
     */
    private function mapOne(array $ticket): array
    {
        $id = (string) ($ticket['id'] ?? $ticket['ticketid'] ?? $ticket['tid'] ?? '');
        $status = $this->normalizeStatus($ticket['status'] ?? 'Open');
        $statusCode = $this->statusCode($status);

        return [
            'id' => $id,
            'caseId' => (string) ($ticket['tid'] ?? $ticket['ticketnum'] ?? $id),
            'subject' => (string) ($ticket['subject'] ?? ''),
            'subjectKey' => '',
            'status' => $status,
            'statusCode' => $statusCode,
            'statusTone' => $this->statusTone($statusCode),
            'lastReply' => (string) ($ticket['lastreply'] ?? $ticket['date'] ?? $ticket['created_at'] ?? ''),
            'activityLabel' => (string) ($ticket['lastreply'] ?? $ticket['date'] ?? $ticket['created_at'] ?? ''),
            'portalUrl' => '',
        ];
    }

    private function normalizeStatus(mixed $value): string
    {
        $status = strtolower(trim((string) $value));

        return $status !== '' ? ucfirst($status) : 'Open';
    }

    private function statusCode(string $status): string
    {
        return strtolower(preg_replace('/[^a-z0-9]+/i', '', $status) ?? '') ?: 'open';
    }

    private function statusTone(string $statusCode): string
    {
        return match ($statusCode) {
            'closed' => 'neutral',
            'awaitingreply' => 'warning',
            default => 'success',
        };
    }
}
