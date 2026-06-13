<?php

declare(strict_types=1);

namespace Caasify\Admin;

use Caasify\Core\Config\CloudVpsConfig;

final class ClientSummaryOrderMapper
{
    /**
     * @param array<int|string, mixed> $orders
     * @return array<int, array<string, mixed>>
     */
    public function mapList(array $orders): array
    {
        $mappedOrders = [];

        foreach ($orders as $order) {
            if (!is_array($order) || !$this->isServerOrder($order)) {
                continue;
            }

            $mappedOrders[] = $this->mapOrder($order);
        }

        return $mappedOrders;
    }

    /**
     * @param array<int, array<string, mixed>> $orders
     * @return array<string, mixed>|null
     */
    public function findOrderById(array $orders, int $orderId): ?array
    {
        foreach ($orders as $order) {
            if (!is_array($order)) {
                continue;
            }

            $currentOrderId = $this->extractOrderId($order);

            if ($currentOrderId !== null && $currentOrderId === $orderId) {
                return $order;
            }
        }

        return null;
    }

    /**
     * @param array<string, mixed> $order
     */
    public function findPowerActionCode(array $order): ?string
    {
        $availableButtons = $this->flattenAvailableButtons($this->getPrimaryProduct($order));
        $powerState = $this->deriveStatus($order)['powerState'];
        $preferredAction = $powerState ? 'stop' : 'start';

        foreach ($availableButtons as $button) {
            if (($button['actionCode'] ?? null) === $preferredAction) {
                return $preferredAction;
            }
        }

        return null;
    }

    /**
     * @param array<string, mixed> $order
     */
    public function findPowerActionButtonId(array $order): ?int
    {
        $actionCode = $this->findPowerActionCode($order);

        if ($actionCode === null) {
            return null;
        }

        return $this->findButtonId($order, [$actionCode]);
    }

    /**
     * @param array<string, mixed> $order
     */
    public function findRebootActionButtonId(array $order): ?int
    {
        return $this->findButtonId($order, ['restart', 'reboot']);
    }

    /**
     * @param array<string, mixed> $order
     */
    public function findConsoleButtonId(array $order): ?int
    {
        return $this->findButtonId($order, ['console']);
    }

    /**
     * @param array<string, mixed> $action
     * @return array<string, string>
     */
    public function extractConsoleParameters(array $action): array
    {
        $references = $action['references'] ?? null;

        if (!is_array($references)) {
            return [];
        }

        $params = [];

        foreach ($references as $reference) {
            if (!is_array($reference)) {
                continue;
            }

            $type = $this->normalizeNullableString($reference['reference']['type'] ?? null);
            $value = $this->normalizeNullableString($reference['value'] ?? null);

            if ($type === null || $value === null) {
                continue;
            }

            $params[strtolower($type)] = $value;
        }

        return $params;
    }

    /**
     * @return array{label: string, powerState: bool}
     */
    public function describeStatus(?string $orderStatus, ?string $powerStatus): array
    {
        $normalizedPowerStatus = strtolower(trim((string) $powerStatus));
        $normalizedOrderStatus = strtolower(trim((string) $orderStatus));

        if ($normalizedPowerStatus === 'online') {
            return [
                'label' => 'Online',
                'powerState' => true,
            ];
        }

        if ($normalizedPowerStatus === 'offline') {
            return [
                'label' => 'Offline',
                'powerState' => false,
            ];
        }

        if ($normalizedOrderStatus === 'active' || $normalizedOrderStatus === 'online') {
            return [
                'label' => 'Active',
                'powerState' => true,
            ];
        }

        return [
            'label' => ucfirst($normalizedOrderStatus !== '' ? $normalizedOrderStatus : 'unknown'),
            'powerState' => $normalizedPowerStatus !== 'offline',
        ];
    }

    /**
     * @param array<string, mixed> $order
     */
    private function isServerOrder(array $order): bool
    {
        $product = $this->getPrimaryProduct($order);
        $type = strtolower(trim((string) ($order['type'] ?? '')));
        $title = strtolower(trim((string) (($product['title'] ?? null) ?: ($order['note'] ?? ''))));
        $detail = is_array($product['detail'] ?? null) ? $product['detail'] : [];
        $sections = is_array($product['sections'] ?? null) ? $product['sections'] : [];

        if ($product === []) {
            return false;
        }

        if ($type === 'vpn' || $type === 'host') {
            return false;
        }

        if (str_contains($title, 'vpn')) {
            return false;
        }

        return $this->normalizeNullableString($detail['dc_country'] ?? null) !== null
            || $this->normalizeNullableString($detail['cpu_core'] ?? null) !== null
            || $this->normalizeNullableString($detail['vm_type'] ?? null) !== null
            || $sections !== [];
    }

    /**
     * @param array<string, mixed> $order
     * @return array<string, mixed>
     */
    private function mapOrder(array $order): array
    {
        $product = $this->getPrimaryProduct($order);
        $detail = is_array($product['detail'] ?? null) ? $product['detail'] : [];
        $status = $this->deriveStatus($order);
        $addresses = $this->extractAddressesFromView($order);
        $orderId = $this->extractOrderId($order);
        $powerAction = $this->findPowerActionCode($order);
        $price = $this->extractAmount(
            $order['renewal_price']
            ?? $this->extractFirstRecordValue($order, 'price')
            ?? $product['price']
            ?? null
        ) ?? 0.0;

        return [
            'id' => $this->normalizeNullableString($order['id'] ?? null) ?? '---',
            'orderId' => $orderId,
            'zone' => $this->normalizeDatacenterDisplayName($this->normalizeNullableString($detail['dc_name'] ?? null)) ?? '---',
            'datacenterName' => $this->buildDatacenterName($product, $detail),
            'datacenterLocation' => $this->buildDatacenterLocation($detail),
            'name' => $this->normalizeNullableString($order['note'] ?? null) ?? $this->buildDisplayTitle($detail),
            'aliveFrom' => $this->normalizeNullableString($order['started_at'] ?? null)
                ?? $this->normalizeNullableString($order['created_at'] ?? null)
                ?? 'Recently',
            'ipv4' => $addresses['ipv4'],
            'powerState' => $status['powerState'],
            'powerLabel' => $status['label'],
            'powerAction' => $powerAction,
            'canTogglePower' => $powerAction !== null,
            'canReboot' => $this->findRebootActionButtonId($order) !== null,
            'canConsole' => $this->findConsoleButtonId($order) !== null,
            'price' => $price,
        ];
    }

    /**
     * @param array<string, mixed> $order
     * @return array{label: string, powerState: bool}
     */
    private function deriveStatus(array $order): array
    {
        return $this->describeStatus(
            isset($order['status']) ? (string) $order['status'] : null,
            isset($order['power_status']) ? (string) $order['power_status'] : null
        );
    }

    /**
     * @param array<string, mixed> $order
     * @return array{ipv4: string, ipv6: string}
     */
    private function extractAddressesFromView(array $order): array
    {
        $view = is_array($order['view'] ?? null) ? $order['view'] : [];
        $references = is_array($view['references'] ?? null) ? $view['references'] : [];
        $items = is_array($view['items'] ?? null) ? $view['items'] : [];
        $values = [];

        foreach ([$references, $items] as $collection) {
            foreach ($collection as $item) {
                $value = $this->normalizeNullableString(is_array($item) ? ($item['value'] ?? null) : null);

                if ($value !== null) {
                    $values[] = $value;
                }
            }
        }

        $ipv4 = 'n/a';
        $ipv6 = 'n/a';

        foreach ($values as $value) {
            if ($ipv4 === 'n/a' && preg_match('/^\d{1,3}(\.\d{1,3}){3}$/', $value) === 1) {
                $ipv4 = $value;
                continue;
            }

            if ($ipv6 === 'n/a' && str_contains($value, ':')) {
                $ipv6 = $value;
            }
        }

        return [
            'ipv4' => $ipv4,
            'ipv6' => $ipv6,
        ];
    }

    /**
     * @param array<string, mixed> $product
     * @return array<int, array{id: int, actionCode: string}>
     */
    private function flattenAvailableButtons(array $product): array
    {
        $groups = $product['groups'] ?? null;

        if (!is_array($groups)) {
            return [];
        }

        $buttons = [];

        foreach ($groups as $group) {
            if (!is_array($group) || !is_array($group['buttons'] ?? null)) {
                continue;
            }

            foreach ($group['buttons'] as $button) {
                if (!is_array($button)) {
                    continue;
                }

                $buttonId = isset($button['id']) && is_numeric($button['id']) ? (int) $button['id'] : null;
                $actionCode = $this->normalizeButtonActionCode($button);

                if ($buttonId === null || $actionCode === null) {
                    continue;
                }

                $buttons[] = [
                    'id' => $buttonId,
                    'actionCode' => $actionCode,
                ];
            }
        }

        return $buttons;
    }

    /**
     * @param array<string, mixed> $order
     * @param array<int, string> $acceptedCodes
     */
    private function findButtonId(array $order, array $acceptedCodes): ?int
    {
        $availableButtons = $this->flattenAvailableButtons($this->getPrimaryProduct($order));

        foreach ($availableButtons as $button) {
            if (in_array($button['actionCode'], $acceptedCodes, true)) {
                return $button['id'];
            }
        }

        return null;
    }

    /**
     * @param array<string, mixed> $button
     */
    private function normalizeButtonActionCode(array $button): ?string
    {
        $type = strtolower(trim((string) ($button['type'] ?? '')));
        $name = strtolower(trim((string) ($button['name'] ?? '')));
        $value = $type !== '' ? $type : $name;

        if ($value === '') {
            return null;
        }

        return match ($value) {
            'start' => 'start',
            'stop' => 'stop',
            'restart', 'reboot' => 'restart',
            'reinstall', 'rebuild' => 'rebuild',
            'console' => 'console',
            default => $value,
        };
    }

    /**
     * @param array<string, mixed> $order
     */
    private function extractOrderId(array $order): ?int
    {
        return isset($order['id']) && is_numeric($order['id']) ? (int) $order['id'] : null;
    }

    /**
     * @param array<string, mixed> $order
     * @return array<string, mixed>
     */
    private function getPrimaryProduct(array $order): array
    {
        $records = $order['records'] ?? null;

        if (!is_array($records) || !isset($records[0]) || !is_array($records[0])) {
            return [];
        }

        $product = $records[0]['product'] ?? null;

        return is_array($product) ? $product : [];
    }

    /**
     * @param array<string, mixed> $detail
     */
    private function buildDisplayTitle(array $detail): string
    {
        $cpu = $this->extractAmount($detail['cpu_core'] ?? null) ?? 1.0;
        $memory = $this->extractAmount($detail['memory_size'] ?? null) ?? 1.0;
        $country = $this->formatCityLabel($detail['dc_country'] ?? 'Cloud');

        return sprintf('VPS-%s-%sC-%sGB', $country, $this->trimTrailingZeros($cpu), $this->trimTrailingZeros($memory));
    }

    /**
     * @param array<string, mixed> $detail
     */
    private function buildDatacenterName(array $product, array $detail): string
    {
        $categoryName = $this->findProductCategoryName($product, 'datacenter');

        if ($categoryName !== null) {
            return $this->normalizeDatacenterDisplayName($categoryName) ?? $categoryName;
        }

        $realName = $this->normalizeNullableString($detail['dc_real_name'] ?? null);

        if ($realName !== null) {
            return $this->normalizeDatacenterDisplayName($realName) ?? $realName;
        }

        return 'Unknown datacenter';
    }

    private function normalizeDatacenterDisplayName(?string $value): ?string
    {
        return $value === null ? null : CloudVpsConfig::resolveDatacenterDisplayName($value);
    }

    /**
     * @param array<string, mixed> $detail
     */
    private function buildDatacenterLocation(array $detail): ?string
    {
        $city = $this->normalizeNullableString($detail['dc_city'] ?? null);
        $country = $this->normalizeNullableString($detail['dc_country'] ?? null);
        $parts = [];

        if ($city !== null) {
            $parts[] = $this->formatCityLabel($city);
        }

        if ($country !== null) {
            $parts[] = $this->formatCityLabel($country);
        }

        if ($parts === []) {
            return null;
        }

        return implode(', ', $parts);
    }

    /**
     * @param array<string, mixed> $product
     */
    private function findProductCategoryName(array $product, string $type): ?string
    {
        $categories = $product['categories'] ?? null;
        $normalizedType = strtolower(trim($type));

        if (!is_array($categories) || $normalizedType === '') {
            return null;
        }

        foreach ($categories as $category) {
            if (!is_array($category)) {
                continue;
            }

            $categoryType = strtolower(trim((string) ($category['type'] ?? '')));

            if ($categoryType !== $normalizedType) {
                continue;
            }

            $categoryName = $this->normalizeNullableString($category['name'] ?? null);

            if ($categoryName !== null) {
                return $categoryName;
            }
        }

        return null;
    }

    private function formatCityLabel(mixed $value): string
    {
        $label = trim((string) $value);

        if ($label === '') {
            return 'Unknown';
        }

        return preg_replace('/[_-]+/', ' ', preg_replace('/([a-z])([A-Z])/', '$1 $2', $label) ?? $label) ?? $label;
    }

    /**
     * @param array<string, mixed> $order
     */
    private function extractFirstRecordValue(array $order, string $key): mixed
    {
        $records = $order['records'] ?? null;

        if (!is_array($records) || !isset($records[0]) || !is_array($records[0])) {
            return null;
        }

        return $records[0][$key] ?? null;
    }

    private function extractAmount(mixed $value): ?float
    {
        if (is_string($value)) {
            $value = str_replace(',', '', trim($value));
        }

        if (!is_numeric($value)) {
            return null;
        }

        return round((float) $value, 2);
    }

    private function normalizeNullableString(mixed $value): ?string
    {
        if (!is_scalar($value)) {
            return null;
        }

        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }

    private function trimTrailingZeros(float $value): string
    {
        $formatted = number_format($value, 2, '.', '');

        return rtrim(rtrim($formatted, '0'), '.');
    }
}
