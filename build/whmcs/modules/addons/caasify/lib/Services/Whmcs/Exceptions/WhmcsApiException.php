<?php

declare(strict_types=1);

namespace Caasify\Services\Whmcs\Exceptions;

final class WhmcsApiException extends \RuntimeException
{
    public function __construct(string $command, ?string $message = null)
    {
        parent::__construct($message !== null && $message !== '' ? $message : sprintf('WHMCS API command %s failed.', $command));
    }
}
