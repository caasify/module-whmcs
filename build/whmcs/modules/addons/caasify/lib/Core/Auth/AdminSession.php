<?php

declare(strict_types=1);

namespace Caasify\Core\Auth;

final class AdminSession
{
    public function getId(): ?int
    {
        $adminId = null;

        if (class_exists('\WHMCS\Session')) {
            $adminId = \WHMCS\Session::get('adminid');
        }

        if ($adminId === null && array_key_exists('adminid', $_SESSION)) {
            $adminId = $_SESSION['adminid'];
        }

        if (is_string($adminId)) {
            $adminId = trim($adminId);
        }

        if (!is_numeric($adminId)) {
            return null;
        }

        $resolvedAdminId = (int) $adminId;

        return $resolvedAdminId > 0 ? $resolvedAdminId : null;
    }

    public function isAuthenticated(): bool
    {
        return $this->getId() !== null;
    }
}
