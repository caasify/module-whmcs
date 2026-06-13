<?php

declare(strict_types=1);

namespace Caasify\Services\Whmcs\Mappers\Billing;

final class PaymentMethodMapper
{
    public function mapList(array $methods): array
    {
        return array_values(array_filter(array_map(
            fn(array $method): ?array => $this->mapItem($method),
            $methods
        )));
    }

    public function mapItem(array $method): ?array
    {
        $module = isset($method['module']) ? trim((string) $method['module']) : '';

        if ($module === '') {
            return null;
        }

        $displayName = isset($method['displayname']) ? trim((string) $method['displayname']) : $module;

        return [
            'id' => $module,
            'module' => $module,
            'displayName' => $displayName !== '' ? $displayName : $module,
        ];
    }
}
