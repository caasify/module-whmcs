<?php

declare(strict_types=1);

namespace Caasify;

use Caasify\Core\Config\WhmcsCompanyProfile;

final class FrontendAssets
{
    private string $distPath;

    public function __construct(string $modulePath)
    {
        $this->distPath = rtrim($modulePath, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'dist';
    }

    public function getStandalonePageViewData(string $assetBasePath, array $bootstrapPayload = []): array
    {
        $indexDocument = $this->loadIndexDocument();

        if ($indexDocument === null) {
            $brandName = WhmcsCompanyProfile::getName('Company');

            return [
                'ready' => false,
                'errorMessage' => $brandName . ' frontend build not found. Run npm run build before deploying the addon.',
            ];
        }

        return [
            'ready' => true,
            'document' => $this->injectRuntimeConfig(
                $this->injectPageTitle(
                    $this->injectAssetVersion(
                        $this->injectBaseHref($indexDocument, $assetBasePath),
                        $this->getAssetVersion()
                    ),
                    $bootstrapPayload
                ),
                $bootstrapPayload
            ),
        ];
    }

    private function loadIndexDocument(): ?string
    {
        $indexPath = $this->distPath . DIRECTORY_SEPARATOR . 'index.html';

        if (!is_file($indexPath) || !is_readable($indexPath)) {
            return null;
        }

        $indexContents = file_get_contents($indexPath);
        if ($indexContents === false) {
            return null;
        }

        return $indexContents;
    }

    private function getAssetVersion(): string
    {
        $indexPath = $this->distPath . DIRECTORY_SEPARATOR . 'index.html';
        $modifiedAt = is_file($indexPath) ? filemtime($indexPath) : false;

        return $modifiedAt !== false ? (string) $modifiedAt : (string) time();
    }

    private function injectBaseHref(string $indexDocument, string $assetBasePath): string
    {
        $baseHref = htmlspecialchars(rtrim($assetBasePath, '/') . '/', ENT_QUOTES, 'UTF-8');
        $baseTag = '<base href="' . $baseHref . '">';

        if (preg_match('/<head(\s[^>]*)?>/i', $indexDocument) === 1) {
            return preg_replace('/<head(\s[^>]*)?>/i', '$0' . PHP_EOL . $baseTag, $indexDocument, 1) ?: $indexDocument;
        }

        return $baseTag . PHP_EOL . $indexDocument;
    }

    private function injectAssetVersion(string $indexDocument, string $assetVersion): string
    {
        if ($assetVersion === '') {
            return $indexDocument;
        }

        return preg_replace_callback(
            '/\b(?:src|href)=(["\'])(\.\/assets\/[^"\']+\.(?:js|css))\1/i',
            static function (array $matches) use ($assetVersion): string {
                $attribute = $matches[0];
                $url = $matches[2];

                if (str_contains($url, '?v=')) {
                    return $attribute;
                }

                return str_replace($url, $url . '?v=' . rawurlencode($assetVersion), $attribute);
            },
            $indexDocument
        ) ?: $indexDocument;
    }

    private function injectRuntimeConfig(string $indexDocument, array $bootstrapPayload): string
    {
        if ($bootstrapPayload === []) {
            return $indexDocument;
        }

        $jsonPayload = $this->encodeBootstrapPayload($bootstrapPayload);

        if (!is_string($jsonPayload)) {
            return $indexDocument;
        }

        $bootstrapScript = '<script>window.__CLOUDHUB_BOOTSTRAP__ = ' . $jsonPayload . ';</script>';

        if (stripos($indexDocument, '</head>') !== false) {
            return preg_replace('/<\/head>/i', $bootstrapScript . PHP_EOL . '</head>', $indexDocument, 1)
                ?: $indexDocument;
        }

        return $bootstrapScript . PHP_EOL . $indexDocument;
    }

    private function encodeBootstrapPayload(array $bootstrapPayload): ?string
    {
        $jsonFlags = JSON_UNESCAPED_UNICODE
            | JSON_UNESCAPED_SLASHES
            | JSON_HEX_TAG
            | JSON_HEX_AMP
            | JSON_HEX_APOS
            | JSON_HEX_QUOT;

        if (\defined('JSON_INVALID_UTF8_SUBSTITUTE')) {
            $jsonFlags |= JSON_INVALID_UTF8_SUBSTITUTE;
        }

        $jsonPayload = json_encode($bootstrapPayload, $jsonFlags);

        if (is_string($jsonPayload)) {
            return $jsonPayload;
        }

        $this->logBootstrapSerializationFailure(
            json_last_error_msg(),
            array_map(
                static function ($key): string {
                    return (string) $key;
                },
                array_keys($bootstrapPayload)
            )
        );

        return null;
    }

    private function logBootstrapSerializationFailure(string $errorMessage, array $payloadKeys): void
    {
        if (!function_exists('logActivity')) {
            return;
        }

        $brandName = WhmcsCompanyProfile::getName('Company');
        $keySummary = $payloadKeys !== []
            ? implode(', ', $payloadKeys)
            : 'none';

        \logActivity(
            $brandName
            . ' could not serialize the frontend bootstrap payload. JSON error: '
            . $errorMessage
            . '. Payload keys: '
            . $keySummary
            . '.'
        );
    }

    private function injectPageTitle(string $indexDocument, array $bootstrapPayload): string
    {
        $pageTitle = trim((string) ($bootstrapPayload['companyProfile']['name'] ?? ''));

        if ($pageTitle === '') {
            return $indexDocument;
        }

        $escapedTitle = htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8');

        if (preg_match('/<title\b[^>]*>.*?<\/title>/is', $indexDocument) === 1) {
            return preg_replace('/<title\b[^>]*>.*?<\/title>/is', '<title>' . $escapedTitle . '</title>', $indexDocument, 1)
                ?: $indexDocument;
        }

        if (stripos($indexDocument, '</head>') !== false) {
            return preg_replace('/<\/head>/i', '<title>' . $escapedTitle . '</title>' . PHP_EOL . '</head>', $indexDocument, 1)
                ?: $indexDocument;
        }

        return $indexDocument;
    }
}
