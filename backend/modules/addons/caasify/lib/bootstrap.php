<?php

declare(strict_types=1);

spl_autoload_register(static function (string $className): void {
    $namespacePrefix = 'Caasify\\';

    if (strncmp($className, $namespacePrefix, strlen($namespacePrefix)) !== 0) {
        return;
    }

    $relativeClass = substr($className, strlen($namespacePrefix));

    if (!is_string($relativeClass) || $relativeClass === '') {
        return;
    }

    $filePath = __DIR__ . DIRECTORY_SEPARATOR . str_replace('\\', DIRECTORY_SEPARATOR, $relativeClass) . '.php';

    if (is_file($filePath)) {
        require_once $filePath;
    }
});
