<?php

declare(strict_types=1);

namespace Caasify\Core\Config;

final class CaasifyServiceEndpoints
{
    private const DEFAULT_SERVICE_PATHS = [
        'server' => '/server/v1/',
        'aiApi' => '/ai-api/v1/',
        's3Storage' => '/s3-storage/v1/',
    ];

    public static function getServicePaths(): array
    {
        return self::DEFAULT_SERVICE_PATHS;
    }

    public static function getPublicConfig(string $hubBaseUrl): array
    {
        $serviceUrls = [];

        foreach (self::DEFAULT_SERVICE_PATHS as $service => $path) {
            $serviceUrls[$service] = self::buildServiceUrl($hubBaseUrl, $path);
        }

        return [
            'hubBaseUrl' => $hubBaseUrl,
            'servicePaths' => self::DEFAULT_SERVICE_PATHS,
            'serviceUrls' => $serviceUrls,
        ];
    }

    private static function buildServiceUrl(string $hubBaseUrl, string $path): string
    {
        return rtrim($hubBaseUrl, '/') . '/' . ltrim($path, '/');
    }
}
