<?php

declare(strict_types=1);

namespace Caasify\Admin;

use Caasify\Core\Config\WhmcsCompanyProfile;
use Caasify\Core\Support\CurrencyFormat;

final class ClientSummaryPanelRenderer
{
    /**
     * @param array<string, mixed> $viewModel
     */
    public function render(array $viewModel): string
    {
        $notice = is_array($viewModel['notice'] ?? null) ? $viewModel['notice'] : null;
        $warnings = is_array($viewModel['warnings'] ?? null) ? $viewModel['warnings'] : [];
        $orders = is_array($viewModel['orders'] ?? null) ? $viewModel['orders'] : [];
        $orderCount = count($orders);
        $panelError = $this->normalizeNullableString($viewModel['panelError'] ?? null);
        $frameId = $this->escape($viewModel['frameId'] ?? 'caasify-admin-client-summary-frame');
        $formActionValue = (string) ($viewModel['formAction'] ?? '');
        $csrfTokenValue = (string) ($viewModel['csrfToken'] ?? '');
        $formAction = $this->escape($formActionValue);
        $csrfToken = $this->escape($csrfTokenValue);
        $chargeAmount = $this->escape($viewModel['chargeAmount'] ?? '0');
        $pricingContext = is_array($viewModel['pricingContext'] ?? null) ? $viewModel['pricingContext'] : [];
        $displayCurrency = is_array($pricingContext['displayCurrency'] ?? null) ? $pricingContext['displayCurrency'] : [];
        $realCurrency = is_array($viewModel['realCurrency'] ?? null) ? $viewModel['realCurrency'] : [];
        $displayCurrencyFormat = $this->normalizeNullableString($displayCurrency['format'] ?? null);
        $realCurrencyFormat = $this->normalizeNullableString($realCurrency['format'] ?? null)
            ?? $displayCurrencyFormat
            ?? '1,234.56';
        $commissionPercent = $this->formatAmount($viewModel['commissionPercent'] ?? 0.0);
        $displayCurrencyFormatValue = $displayCurrencyFormat ?? $realCurrencyFormat;
        $realBalance = $this->formatCurrencyAmount($viewModel['realBalance'] ?? 0.0, $realCurrency, $realCurrencyFormat);
        $realDebt = $this->formatCurrencyAmount($viewModel['realDebt'] ?? 0.0, $realCurrency, $realCurrencyFormat);
        $realRemaining = $this->formatCurrencyAmount($viewModel['realRemaining'] ?? 0.0, $realCurrency, $realCurrencyFormat);
        $commissionBalance = $this->formatCurrencyAmount($viewModel['commissionBalance'] ?? 0.0, $displayCurrency, $displayCurrencyFormatValue);
        $commissionDebt = $this->formatCurrencyAmount($viewModel['commissionDebt'] ?? 0.0, $displayCurrency, $displayCurrencyFormatValue);
        $commissionRemaining = $this->formatCurrencyAmount($viewModel['commissionRemaining'] ?? 0.0, $displayCurrency, $displayCurrencyFormatValue);
        $adminRealBalance = $this->formatCurrencyAmount($viewModel['adminRealBalance'] ?? 0.0, $realCurrency, $realCurrencyFormat);
        $clientCurrencyCode = strtoupper(trim((string) ($pricingContext['clientCurrencyCode'] ?? 'EUR'))) ?: 'EUR';
        $displayMode = (string) ($pricingContext['displayMode'] ?? 'raw_eur_fallback');
        $displayCurrencyFormatConfig = CurrencyFormat::describe($displayCurrencyFormatValue);
        $realCurrencyFormatConfig = CurrencyFormat::describe($realCurrencyFormat);
        $realCurrencyMarker = CurrencyFormat::resolveCurrencyMarker($realCurrency);
        $displayCurrencyMarker = CurrencyFormat::resolveCurrencyMarker($displayCurrency);
        $brandName = WhmcsCompanyProfile::getName('Company');
        $moneyActionsBlocked = ($pricingContext['moneyActionsBlocked'] ?? false) === true;
        $moneyActionsBlockedReason = (string) ($pricingContext['moneyActionsBlockedReason'] ?? '');
        $caasifyUserId = $this->normalizeNullableString($viewModel['caasifyUserId'] ?? null) ?? '—';
        $whmcsClientId = (int) ($viewModel['whmcsClientId'] ?? 0);
        $displayModeTitle = $displayMode === 'converted'
            ? $this->formatCurrencyLabel('Customer Visible Values', $displayCurrencyMarker)
            : $this->formatCurrencyLabel('Customer View', $realCurrencyMarker, 'Fallback');
        $chargePreviewLabel = $displayMode === 'converted'
            ? $this->formatCurrencyLabel('Customer-visible amount', $displayCurrencyMarker)
            : $this->formatCurrencyLabel('Customer-visible amount', $realCurrencyMarker, 'fallback');
        $realChargeLabel = $this->formatInlineCurrencyLabel('Real', $realCurrencyMarker);
        $realSummaryLabel = $this->formatCurrencyLabel('Real', $realCurrencyMarker);
        if ($moneyActionsBlockedReason === 'currency_disabled') {
            $moneyActionsBlockedMessage = 'Client pricing is currently showing raw EUR because ' . $clientCurrencyCode . ' is disabled in ' . $brandName . ' pricing. Customer money actions stay blocked until that currency is enabled.';
        } elseif ($moneyActionsBlockedReason === 'missing_eur_rate') {
            $moneyActionsBlockedMessage = 'Client pricing is currently showing raw EUR because no valid EUR rate is configured for ' . $clientCurrencyCode . '. Customer money actions stay blocked until that currency has a valid EUR rate.';
        } elseif ($moneyActionsBlockedReason === 'missing_client_currency') {
            $moneyActionsBlockedMessage = 'Client pricing is currently showing raw EUR because this client does not have a valid WHMCS currency mapping yet. Customer money actions stay blocked until that currency is configured.';
        } else {
            $moneyActionsBlockedMessage = 'Client pricing is currently showing raw EUR because the client currency is not fully configured in ' . $brandName . ' pricing. Customer money actions stay blocked until that currency is enabled and has a valid EUR rate.';
        }

        ob_start();
        ?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= $this->escape($brandName) ?> Admin Summary</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
    <style>
        :root {
            color-scheme: dark;
            --background: #0b1220;
            --surface: #111827;
            --surface-low: #0f172a;
            --surface-mid: #1f2937;
            --surface-high: #243244;
            --outline: #334155;
            --outline-strong: #64748b;
            --primary: #60a5fa;
            --primary-deep: #2563eb;
            --on-surface: #e5eefc;
            --on-surface-variant: #9fb0c7;
            --success: #4ade80;
            --danger: #f87171;
            --danger-soft: rgba(248, 113, 113, 0.12);
            --success-soft: rgba(74, 222, 128, 0.12);
            --shadow-soft: 0 10px 30px rgba(0, 0, 0, 0.24);
            --shadow-hover: 0 14px 28px rgba(0, 0, 0, 0.28);
        }

        * {
            box-sizing: border-box;
        }

        html,
        body {
            width: 100%;
            overflow-x: hidden;
        }

        body {
            margin: 0;
            padding: 16px;
            background: var(--background);
            color: var(--on-surface);
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .notice {
            margin-bottom: 16px;
            padding: 12px 14px;
            border-left: 4px solid transparent;
            border-radius: 8px;
            font-size: 13px;
            line-height: 1.55;
        }

        .notice-success {
            background: var(--success-soft);
            color: var(--success);
            border-left-color: var(--success);
        }

        .notice-error {
            background: var(--danger-soft);
            color: #fecaca;
            border-left-color: var(--danger);
        }

        .notice-warning {
            background: rgba(251, 191, 36, 0.12);
            color: #fde68a;
            border-left-color: #f59e0b;
        }

        .panel-stack {
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        .summary-grid {
            display: grid;
            gap: 24px;
            grid-template-columns: 1fr;
        }

        .card {
            background: var(--surface);
            border: 1px solid var(--outline);
            border-radius: 8px;
            padding: 24px;
            box-shadow: var(--shadow-soft);
        }

        .card-header {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--outline);
            margin-bottom: 20px;
        }

        .card-title {
            margin: 0;
            color: var(--on-surface);
            font-family: "Hanken Grotesk", "Inter", sans-serif;
            font-size: 20px;
            font-weight: 600;
            line-height: 28px;
        }

        .toolbar {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px;
        }

        .search-field {
            position: relative;
            min-width: 0;
            max-width: 280px;
            flex: 1 1 240px;
        }

        .search-field svg {
            position: absolute;
            top: 50%;
            left: 10px;
            width: 16px;
            height: 16px;
            transform: translateY(-50%);
            color: var(--on-surface-variant);
            pointer-events: none;
        }

        .search-input {
            width: 100%;
            border: 1px solid var(--outline);
            border-radius: 8px;
            background: var(--background);
            padding: 8px 12px 8px 34px;
            color: var(--on-surface-variant);
            font-size: 14px;
            line-height: 20px;
            outline: none;
        }

        .search-input::placeholder {
            color: var(--on-surface-variant);
        }

        .summary-block {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .summary-block-title {
            margin: 0;
            color: var(--primary);
            font-size: 12px;
            font-weight: 600;
            line-height: 16px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }

        .summary-block-title.is-muted {
            color: var(--on-surface-variant);
        }

        .summary-block-copy {
            margin: 0;
            color: var(--on-surface-variant);
            font-size: 14px;
            line-height: 20px;
        }

        .summary-block-copy.is-strong {
            color: var(--on-surface);
        }

        .summary-note {
            margin: 0;
            padding: 10px 12px;
            border: 1px solid var(--outline);
            border-radius: 8px;
            background: var(--surface-low);
            color: var(--on-surface-variant);
            font-size: 13px;
            line-height: 1.55;
        }

        .charge-stack {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .charge-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .charge-field-label {
            color: var(--on-surface-variant);
            font-size: 12px;
            line-height: 16px;
        }

        .charge-value,
        .charge-preview {
            width: 100%;
            border: 1px solid var(--outline);
            border-radius: 8px;
            background: var(--background);
            padding: 10px 12px;
            color: var(--on-surface);
            font-family: "JetBrains Mono", monospace;
            font-size: 14px;
            line-height: 20px;
            font-variant-numeric: tabular-nums;
        }

        .charge-preview {
            background: var(--surface);
        }

        .summary-line {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding-bottom: 6px;
            border-bottom: 1px solid var(--surface-mid);
        }

        .summary-line-label {
            color: var(--on-surface-variant);
            font-size: 14px;
            line-height: 20px;
            min-width: 0;
        }

        .summary-line-value {
            color: var(--on-surface);
            font-family: "JetBrains Mono", monospace;
            font-size: 14px;
            line-height: 20px;
            font-variant-numeric: tabular-nums;
            text-align: right;
            min-width: 0;
            overflow-wrap: anywhere;
        }

        .balance-summary-stack {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .balance-summary-grid {
            display: grid;
            gap: 16px;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            align-items: start;
        }

        .balance-summary-box {
            display: flex;
            flex-direction: column;
            gap: 12px;
            min-width: 0;
            width: 100%;
            border: 1px solid var(--outline);
            border-radius: 12px;
            background: var(--surface-low);
            padding: 16px;
            overflow: hidden;
        }

        .balance-summary-box-title {
            margin: 0;
            color: var(--on-surface);
            font-size: 14px;
            font-weight: 600;
            line-height: 20px;
        }

        .charge-actions {
            margin-top: 4px;
        }

        .charge-button {
            display: none;
            width: 100%;
            border: 1px solid transparent;
            border-radius: 8px;
            padding: 10px 14px;
            font-size: 13px;
            font-weight: 600;
            line-height: 16px;
            cursor: pointer;
            transition: transform 0.12s ease, box-shadow 0.12s ease;
        }

        .charge-button:hover {
            transform: translateY(-1px);
            box-shadow: var(--shadow-hover);
        }

        .charge-button-primary {
            background: var(--primary);
            color: #06111f;
        }

        .charge-button-danger {
            background: var(--danger-soft);
            color: #fecaca;
            border-color: rgba(186, 26, 26, 0.18);
        }

        .money-blocked {
            margin-top: 16px;
            border-left: 4px solid var(--danger);
            border-radius: 8px;
            background: var(--danger-soft);
            padding: 12px 14px;
            color: #fecaca;
            font-size: 13px;
            line-height: 1.55;
        }

        .table-wrap {
            overflow-x: hidden;
            width: 100%;
        }

        table {
            width: 100%;
            min-width: 0;
            border-collapse: collapse;
            table-layout: fixed;
        }

        th {
            padding: 12px;
            border-bottom: 1px solid var(--outline);
            color: var(--on-surface-variant);
            font-size: 12px;
            font-weight: 600;
            line-height: 16px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            text-align: left;
            white-space: nowrap;
        }

        td {
            padding: 14px 12px;
            border-bottom: 1px solid var(--outline);
            color: var(--on-surface-variant);
            font-size: 14px;
            line-height: 20px;
            vertical-align: middle;
        }

        tbody tr:hover {
            background: var(--surface-low);
        }

        .column-price,
        .column-actions {
            text-align: right;
        }

        .id-chip {
            display: inline-flex;
            align-items: center;
            padding: 3px 10px;
            border-radius: 999px;
            background: var(--surface-high);
            color: var(--on-surface-variant);
            font-family: "JetBrains Mono", monospace;
            font-size: 12px;
            line-height: 16px;
            white-space: nowrap;
        }

        .table-name {
            display: block;
            color: var(--on-surface);
            font-size: 13px;
            font-weight: 600;
            line-height: 18px;
        }

        .table-meta {
            display: block;
            margin-top: 4px;
            color: var(--on-surface-variant);
            font-size: 12px;
            line-height: 16px;
        }

        .table-money,
        .table-ip {
            font-family: "JetBrains Mono", monospace;
            font-variant-numeric: tabular-nums;
        }

        .table-money {
            color: var(--primary);
            font-weight: 700;
            white-space: nowrap;
        }

        .status-stack {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .status-row {
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .status-row.is-loading .status-dot {
            background: var(--primary);
            animation: status-pulse 0.9s ease-in-out infinite;
        }

        .status-row.is-loading .status-label {
            color: var(--on-surface);
        }

        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--outline-strong);
        }

        .status-dot.is-online {
            background: var(--primary);
        }

        .status-label {
            color: var(--on-surface-variant);
            font-size: 14px;
            line-height: 20px;
        }

        .status-meta {
            color: var(--on-surface-variant);
            font-size: 12px;
            line-height: 16px;
        }

        .actions-cell {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
        }

        .actions-cell.is-pending {
            pointer-events: none;
        }

        .server-power-form,
        .server-icon-form {
            margin: 0;
        }

        .server-action-group {
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .power-switch {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 22px;
            border: 0;
            border-radius: 999px;
            background: var(--surface-high);
            padding: 0;
            cursor: pointer;
            transition: background 0.16s ease, opacity 0.16s ease;
        }

        .power-switch.is-on {
            background: var(--primary);
        }

        .power-switch:disabled {
            cursor: not-allowed;
            opacity: 0.5;
        }

        .power-switch.is-loading {
            background: var(--primary-deep);
            opacity: 1;
            cursor: progress;
        }

        .power-track {
            position: absolute;
            inset: 0;
            border-radius: inherit;
        }

        .power-thumb {
            position: absolute;
            top: 3px;
            left: 3px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #dbeafe;
            transition: transform 0.16s ease;
        }

        .power-switch.is-on .power-thumb {
            transform: translateX(18px);
        }

        .power-switch.is-loading .power-thumb,
        .power-switch.is-loading.is-on .power-thumb {
            top: 2px;
            left: 11px;
            width: 18px;
            height: 18px;
            background: transparent;
            border: 2px solid rgba(255, 255, 255, 0.35);
            border-top-color: #dbeafe;
            box-shadow: none;
            transform: none;
            animation: power-spinner 0.7s linear infinite;
        }

        .icon-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border: 1px solid var(--outline);
            border-radius: 8px;
            background: var(--surface);
            color: var(--on-surface-variant);
            transition: background 0.16s ease, color 0.16s ease, border-color 0.16s ease;
        }

        .icon-button:hover {
            background: var(--surface-low);
            color: var(--on-surface);
        }

        .icon-button:disabled,
        .icon-button.is-disabled {
            cursor: not-allowed;
            opacity: 0.48;
        }

        .icon-button.is-danger:hover {
            color: var(--danger);
            border-color: rgba(186, 26, 26, 0.28);
        }

        .icon-button.is-loading {
            position: relative;
            cursor: progress;
            pointer-events: none;
        }

        .icon-button.is-loading svg {
            opacity: 0.18;
        }

        .icon-button.is-loading::after {
            content: "";
            position: absolute;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            border: 2px solid rgba(96, 165, 250, 0.18);
            border-top-color: var(--primary);
            animation: power-spinner 0.7s linear infinite;
        }

        .visually-hidden {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }

        .empty-state,
        .panel-error {
            border-radius: 8px;
            padding: 18px;
            font-size: 14px;
            line-height: 1.55;
        }

        .panel-error {
            border-left: 4px solid var(--danger);
            background: var(--danger-soft);
            color: #93000a;
        }

        .empty-state {
            border: 1px solid var(--outline);
            background: var(--surface-low);
            color: var(--on-surface-variant);
        }

        .table-footer {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding-top: 16px;
            border-top: 1px solid var(--outline);
            margin-top: 8px;
        }

        .table-footer-copy {
            color: var(--on-surface-variant);
            font-size: 14px;
            line-height: 20px;
        }

        .table-footer-copy strong {
            color: var(--on-surface);
            font-weight: 600;
        }

        .pager {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .page-indicator,
        .page-arrow {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            font-size: 14px;
            line-height: 16px;
        }

        .page-indicator {
            background: var(--primary);
            color: #ffffff;
            font-weight: 600;
        }

        .page-arrow {
            border: 1px solid var(--outline);
            background: var(--surface);
            color: var(--on-surface-variant);
            opacity: 0.56;
        }

        .page-arrow svg {
            width: 16px;
            height: 16px;
        }

        @keyframes power-spinner {
            from {
                transform: rotate(0deg);
            }

            to {
                transform: rotate(360deg);
            }
        }

        @keyframes status-pulse {
            0%,
            100% {
                opacity: 1;
            }

            50% {
                opacity: 0.35;
            }
        }

        @media (max-width: 720px) {
            body {
                padding: 10px;
            }

            .shell {
                padding: 14px;
            }

            .card {
                padding: 18px;
            }

            .card-header,
            .table-footer {
                align-items: flex-start;
            }

            .search-field {
                max-width: none;
            }

            .balance-summary-grid {
                grid-template-columns: 1fr;
            }

        }
    </style>
</head>
<body>
    <div data-panel-shell>
        <?php if ($notice !== null): ?>
            <div class="notice <?= ($notice['type'] ?? '') === 'success' ? 'notice-success' : (($notice['type'] ?? '') === 'warning' ? 'notice-warning' : 'notice-error') ?>">
                <?= $this->escape($notice['message'] ?? '') ?>
            </div>
        <?php endif; ?>

        <?php foreach ($warnings as $warning): ?>
            <?php if (is_array($warning) && ($warning['message'] ?? '') !== ''): ?>
                <div class="notice notice-warning"><?= $this->escape((string) $warning['message']) ?></div>
            <?php elseif (is_string($warning) && $warning !== ''): ?>
                <div class="notice notice-warning"><?= $this->escape($warning) ?></div>
            <?php endif; ?>
        <?php endforeach; ?>

        <?php if ($panelError !== null): ?>
            <div class="panel-error"><?= $this->escape($panelError) ?></div>
        <?php else: ?>
            <div class="panel-stack">
                <div class="summary-grid">
                    <section class="card">
                        <div class="card-header">
                            <h2 class="card-title">User Info</h2>
                        </div>
                        <div class="summary-block">
                            <p class="summary-block-copy">WHMCS Client ID: <span class="table-ip"><?= $this->escape((string) $whmcsClientId) ?></span></p>
                            <p class="summary-block-copy">Caasify User ID: <span class="table-ip"><?= $this->escape($caasifyUserId) ?></span></p>
                        </div>
                    </section>

                    <section class="card">
                        <div class="card-header">
                            <h2 class="card-title">Increase/Decrease Balance</h2>
                        </div>
                        <div class="summary-block">
                            <p class="summary-block-copy is-strong">Adjust the client’s internal balance by entering a positive or negative amount.</p>
                            <form method="post" action="<?= $formAction ?>" novalidate>
                                <input type="hidden" name="csrfToken" value="<?= $csrfToken ?>">
                                <input type="hidden" name="panelAction" value="updateBalance">
                                <div class="charge-stack">
                                    <label class="charge-field" for="chargeAmountInput">
                                        <span class="charge-field-label">Real amount to apply</span>
                                        <input
                                            id="chargeAmountInput"
                                            class="charge-value"
                                            type="number"
                                            inputmode="decimal"
                                            step="0.01"
                                            name="chargeAmount"
                                            value="<?= $chargeAmount ?>"
                                            autocomplete="off"
                                        >
                                    </label>
                                    <label class="charge-field">
                                        <span class="charge-field-label">Customer-visible preview</span>
                                        <input
                                            class="charge-preview"
                                            type="text"
                                            value="<?= $chargeAmount ?>"
                                            data-charge-preview
                                            disabled
                                        >
                                    </label>
                                    <div class="charge-actions">
                                        <button type="submit" class="charge-button charge-button-primary" data-charge-button></button>
                                    </div>
                                </div>
                            </form>
                            <?php if ($notice !== null): ?>
                                <div class="notice <?= ($notice['type'] ?? '') === 'success' ? 'notice-success' : (($notice['type'] ?? '') === 'warning' ? 'notice-warning' : 'notice-error') ?>">
                                    <?= $this->escape($notice['message'] ?? '') ?>
                                </div>
                            <?php endif; ?>
                            <div class="balance-summary-stack">
                                <div class="balance-summary-box">
                                    <h3 class="balance-summary-box-title">Admin Balance</h3>
                                    <div class="summary-line">
                                        <span class="summary-line-label">Available</span>
                                        <span class="summary-line-value"><?= $this->escape($adminRealBalance) ?></span>
                                    </div>
                                </div>

                                <div class="balance-summary-grid">
                                    <div class="balance-summary-box">
                                        <h3 class="balance-summary-box-title"><?= $this->escape($realSummaryLabel) ?></h3>
                                        <div class="summary-block">
                                            <?= $this->renderMetricRow('Balance', $realBalance) ?>
                                            <?= $this->renderMetricRow('Debt', $realDebt) ?>
                                            <?= $this->renderMetricRow('Remaining', $realRemaining) ?>
                                        </div>
                                    </div>

                                    <div class="balance-summary-box">
                                        <h3 class="balance-summary-box-title">Customer Visible Values</h3>
                                        <div class="summary-block">
                                            <?= $this->renderMetricRow('Balance', $commissionBalance) ?>
                                            <?= $this->renderMetricRow('Debt', $commissionDebt) ?>
                                            <?= $this->renderMetricRow('Remaining', $commissionRemaining) ?>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <?php if ($moneyActionsBlocked): ?>
                                <div class="money-blocked"><?= $this->escape($moneyActionsBlockedMessage) ?></div>
                            <?php endif; ?>
                        </div>
                    </section>

                    <section class="card">
                        <div class="card-header">
                            <h2 class="card-title">Servers</h2>
                            <div class="toolbar">
                                <label class="search-field">
                                    <?= $this->renderSearchIcon() ?>
                                    <input class="search-input" type="text" placeholder="Search servers...">
                                </label>
                            </div>
                        </div>

                        <?php if ($orders === []): ?>
                            <div class="empty-state">No server orders found for this client yet.</div>
                        <?php else: ?>
                            <div class="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Name</th>
                                            <th>Datacenter</th>
                                            <th>Location</th>
                                            <th>IP Address</th>
                                            <th class="column-price">Price</th>
                                            <th class="column-actions">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($orders as $order): ?>
                                            <?= $this->renderServerListItem($order, $formActionValue, $csrfTokenValue, $displayCurrency, $displayCurrencyFormatValue) ?>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            </div>
                            <div class="table-footer">
                                <div class="table-footer-copy">
                                    Showing <strong>1-<?= $this->escape((string) $orderCount) ?></strong> of <strong><?= $this->escape((string) $orderCount) ?></strong> items
                                </div>
                                <div class="pager" aria-hidden="true">
                                    <span class="page-arrow"><?= $this->renderChevronLeftIcon() ?></span>
                                    <span class="page-indicator">1</span>
                                    <span class="page-arrow"><?= $this->renderChevronRightIcon() ?></span>
                                </div>
                            </div>
                        <?php endif; ?>
                    </section>
                </div>
            </div>
        <?php endif; ?>
    </div>

    <script>
        (function () {
            var amountInput = document.getElementById('chargeAmountInput');
            var preview = document.querySelector('[data-charge-preview]');
            var actionButton = document.querySelector('[data-charge-button]');
            var panelShell = document.querySelector('[data-panel-shell]');
            var frameId = <?= json_encode($frameId, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
            var previewDisplayMode = <?= json_encode($displayMode, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
            var previewDisplayCurrencyFormat = <?= json_encode($displayCurrencyFormatConfig, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
            var previewRealCurrencyFormat = <?= json_encode($realCurrencyFormatConfig, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
            var previewDisplayCurrencyPrefix = <?= json_encode($this->normalizeNullableString($displayCurrency['prefix'] ?? null) ?? '', JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
            var previewDisplayCurrencySuffix = <?= json_encode($this->normalizeNullableString($displayCurrency['suffix'] ?? null) ?? '', JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
            var previewRealCurrencyPrefix = <?= json_encode($this->normalizeNullableString($realCurrency['prefix'] ?? null) ?? '', JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
            var previewRealCurrencySuffix = <?= json_encode($this->normalizeNullableString($realCurrency['suffix'] ?? null) ?? '', JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
            var previewEurRate = Number(<?= json_encode($pricingContext['eurRate'] ?? null, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?> || 0);
            var previewCommissionPercent = Number(<?= json_encode($pricingContext['commissionPercent'] ?? 0, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?> || 0);
            var lastSentHeight = 0;

            function getPanelHeight() {
                if (!panelShell) {
                    return Math.max(
                        document.body ? document.body.scrollHeight : 0,
                        document.documentElement ? document.documentElement.scrollHeight : 0
                    );
                }

                var shellRect = panelShell.getBoundingClientRect();
                var bodyStyles = window.getComputedStyle(document.body);
                var paddingTop = Number.parseFloat(bodyStyles.paddingTop || '0') || 0;
                var paddingBottom = Number.parseFloat(bodyStyles.paddingBottom || '0') || 0;

                return Math.ceil(shellRect.height + paddingTop + paddingBottom);
            }

            function sendHeight(force) {
                if (window.parent && window.parent !== window) {
                    var nextHeight = getPanelHeight();

                    if (!Number.isFinite(nextHeight) || nextHeight <= 0) {
                        return;
                    }

                    if (!force && Math.abs(lastSentHeight - nextHeight) < 2) {
                        return;
                    }

                    lastSentHeight = nextHeight;

                    window.parent.postMessage({
                        type: 'caasify-admin-client-summary:resize',
                        frameId: frameId,
                        height: nextHeight
                    }, window.location.origin);
                }
            }

            function parseNumericInput(value) {
                var normalizedValue = typeof value === 'string'
                    ? value.replace(/,/g, '').trim()
                    : value === undefined || value === null
                        ? ''
                        : String(value);

                return Number.parseFloat(normalizedValue);
            }

            function formatAmount(value, formatConfig) {
                var numericValue = parseNumericInput(value);

                if (!Number.isFinite(numericValue)) {
                    numericValue = 0;
                }

                var fractionDigits = Number.isInteger(formatConfig && formatConfig.fractionDigits)
                    ? formatConfig.fractionDigits
                    : 2;
                var decimalSeparator = formatConfig && typeof formatConfig.decimalSeparator === 'string'
                    ? formatConfig.decimalSeparator
                    : '.';
                var groupSeparator = formatConfig && typeof formatConfig.groupSeparator === 'string'
                    ? formatConfig.groupSeparator
                    : ',';
                var useGrouping = formatConfig && formatConfig.useGrouping === false ? false : true;

                return new Intl.NumberFormat('en-US', {
                    minimumFractionDigits: fractionDigits,
                    maximumFractionDigits: fractionDigits,
                    useGrouping: useGrouping
                })
                    .formatToParts(numericValue)
                    .map(function (part) {
                        if (part.type === 'group') {
                            return groupSeparator;
                        }

                        if (part.type === 'decimal') {
                            return decimalSeparator;
                        }

                        return part.value;
                    })
                    .join('');
            }

            function formatPreviewValue(value, formatConfig, prefix, suffix) {
                var formattedValue = formatAmount(value, formatConfig);

                if (prefix) {
                    return (prefix + formattedValue).trim();
                }

                if (suffix) {
                    return (formattedValue + ' ' + suffix).trim();
                }

                return formattedValue;
            }

            function toPreviewValue(value) {
                var numericValue = parseNumericInput(value);

                if (!Number.isFinite(numericValue)) {
                    numericValue = 0;
                }

                if (previewDisplayMode !== 'converted' || !(previewEurRate > 0)) {
                    return formatPreviewValue(
                        numericValue,
                        previewRealCurrencyFormat,
                        previewRealCurrencyPrefix,
                        previewRealCurrencySuffix
                    );
                }

                var convertedValue = numericValue * previewEurRate * (1 + (previewCommissionPercent / 100));

                return formatPreviewValue(
                    convertedValue,
                    previewDisplayCurrencyFormat,
                    previewDisplayCurrencyPrefix,
                    previewDisplayCurrencySuffix
                );
            }

            function syncChargeUi() {
                if (!amountInput || !preview || !actionButton) {
                    sendHeight(false);
                    return;
                }

                var value = amountInput.value || '0';
                var numericValue = parseNumericInput(value);
                preview.value = toPreviewValue(value);

                if (!Number.isFinite(numericValue) || numericValue === 0) {
                    actionButton.style.display = 'none';
                    actionButton.textContent = '';
                    actionButton.classList.remove('charge-button-danger');
                    actionButton.classList.add('charge-button-primary');
                    sendHeight(false);
                    return;
                }

                actionButton.style.display = 'block';

                if (numericValue > 0) {
                    actionButton.textContent = 'Increase User Balance';
                    actionButton.classList.remove('charge-button-danger');
                    actionButton.classList.add('charge-button-primary');
                } else {
                    actionButton.textContent = 'Decrease User Balance';
                    actionButton.classList.remove('charge-button-primary');
                    actionButton.classList.add('charge-button-danger');
                }

                sendHeight(false);
            }

            function beginServerAction(form) {
                if (!form || form.dataset.submitting === '1') {
                    return;
                }

                form.dataset.submitting = '1';

                var actionInput = form.querySelector('input[name="panelAction"]');
                var actionType = actionInput ? actionInput.value : '';
                var button = form.querySelector('button[type="submit"]');
                var row = form.closest('tr');

                if (button) {
                    button.disabled = true;
                    button.setAttribute('aria-busy', 'true');
                    button.classList.add('is-loading');
                }

                if (row) {
                    var actionsCell = row.querySelector('.actions-cell');
                    var statusRow = row.querySelector('.status-row');
                    var statusLabel = row.querySelector('.status-label');

                    if (actionsCell) {
                        actionsCell.classList.add('is-pending');
                    }

                    if (statusRow) {
                        statusRow.classList.add('is-loading');
                    }

                    if (statusLabel) {
                        if (!statusLabel.dataset.originalText) {
                            statusLabel.dataset.originalText = statusLabel.textContent || '';
                        }

                        if (actionType === 'togglePower') {
                            statusLabel.textContent = 'Updating...';
                        } else if (actionType === 'reboot') {
                            statusLabel.textContent = 'Rebooting...';
                        } else if (actionType === 'openConsole') {
                            statusLabel.textContent = 'Opening...';
                        }
                    }
                }

                sendHeight(false);

                window.requestAnimationFrame(function () {
                    window.setTimeout(function () {
                        form.submit();
                    }, 40);
                });
            }

            if (amountInput) {
                amountInput.addEventListener('input', syncChargeUi);
                amountInput.addEventListener('change', syncChargeUi);
            }

            Array.prototype.forEach.call(
                document.querySelectorAll('.server-power-form, .server-icon-form'),
                function (form) {
                    form.addEventListener('submit', function (event) {
                        if (form.dataset.submitting === '1') {
                            return;
                        }

                        event.preventDefault();
                        beginServerAction(form);
                    });
                }
            );

            if (typeof ResizeObserver === 'function' && panelShell) {
                var resizeObserver = new ResizeObserver(function () {
                    sendHeight(false);
                });

                resizeObserver.observe(panelShell);
            }

            window.addEventListener('load', function () {
                syncChargeUi();
                sendHeight(true);
            });
            window.addEventListener('resize', function () {
                sendHeight(false);
            });
            setTimeout(syncChargeUi, 60);
            setTimeout(function () {
                sendHeight(true);
            }, 220);
        }());
    </script>
</body>
</html>
        <?php

        return (string) ob_get_clean();
    }

    public function renderSimpleDocument(string $title, string $message): string
    {
        return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'
            . $this->escape($title)
            . '</title><style>body{margin:0;padding:18px;background:#f7f8fb;color:#1e2a3b;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.message{border:1px solid #d9dee8;border-radius:16px;background:#fff;padding:18px;font-size:14px;line-height:1.6}</style></head><body><div class="message">'
            . $this->escape($message)
            . '</div></body></html>';
    }

    public function renderRedirectDocument(string $title, string $message, string $url): string
    {
        $escapedTitle = $this->escape($title);
        $escapedMessage = $this->escape($message);
        $escapedUrl = $this->escape($url);
        $scriptUrl = json_encode($url, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);

        return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'
            . $escapedTitle
            . '</title><style>body{margin:0;padding:18px;background:#f7f8fb;color:#1e2a3b;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.message{border:1px solid #d9dee8;border-radius:16px;background:#fff;padding:18px;font-size:14px;line-height:1.6}a{color:#1f6fff;text-decoration:none;font-weight:600}</style></head><body><div class="message"><p style="margin:0 0 12px;">'
            . $escapedMessage
            . '</p><p style="margin:0;"><a href="'
            . $escapedUrl
            . '">Open console</a></p></div><script>window.location.replace('
            . $scriptUrl
            . ');</script></body></html>';
    }

    private function renderMetricRow(string $label, string $value): string
    {
        return '<div class="summary-line"><span class="summary-line-label">'
            . $this->escape($label)
            . '</span><span class="summary-line-value">'
            . $this->escape($value)
            . '</span></div>';
    }

    private function renderFooterRow(string $label, string $value): string
    {
        return '<div class="footer-row"><span class="footer-label">'
            . $this->escape($label)
            . '</span><span class="footer-value">'
            . $this->escape($value)
            . '</span></div>';
    }

    /**
     * @param array<string, mixed> $order
     */
    private function renderServerListItem(
        array $order,
        string $formAction,
        string $csrfToken,
        array $currency,
        ?string $currencyFormat = null
    ): string
    {
        $orderId = $this->escape($order['id'] ?? '---');
        $datacenterName = $this->escape($order['datacenterName'] ?? 'Unknown datacenter');
        $datacenterLocationValue = $this->normalizeNullableString($order['datacenterLocation'] ?? null);
        $datacenterLocation = $this->escape($datacenterLocationValue ?? 'Unknown location');
        $name = $this->escape($order['name'] ?? '---');
        $ipv4 = $this->escape($order['ipv4'] ?? 'n/a');
        $resolvedCurrency = [
            ...$currency,
            'format' => $currencyFormat ?? ($currency['format'] ?? null),
        ];
        $price = $this->formatCurrencyAmount($order['price'] ?? 0.0, $resolvedCurrency, $currencyFormat);

        return '<tr>'
            . '<td><span class="id-chip">#' . $orderId . '</span></td>'
            . '<td><span class="table-name">' . $name . '</span></td>'
            . '<td>' . $datacenterName . '</td>'
            . '<td>' . $datacenterLocation . '</td>'
            . '<td class="table-ip">' . $ipv4 . '</td>'
            . '<td class="column-price"><span class="table-money">' . $this->escape($price) . '</span></td>'
            . '<td class="column-actions"><div class="actions-cell">'
            . $this->renderPowerToggle($order, $formAction, $csrfToken)
            . $this->renderServerActionButtons($order, $formAction, $csrfToken)
            . '</div></td>'
            . '</tr>';
    }

    private function renderSearchIcon(): string
    {
        return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.8"/></svg>';
    }

    private function renderChevronLeftIcon(): string
    {
        return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14 6-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }

    private function renderChevronRightIcon(): string
    {
        return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m10 6 6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }

    /**
     * @param array<string, mixed> $order
     */
    private function renderPowerToggle(array $order, string $formAction, string $csrfToken): string
    {
        $orderId = isset($order['orderId']) && is_numeric($order['orderId']) ? (int) $order['orderId'] : null;
        $canToggle = !empty($order['canTogglePower']) && $orderId !== null;
        $isPoweredOn = !empty($order['powerState']);
        $actionTitle = $canToggle
            ? ($isPoweredOn ? 'Power off server' : 'Power on server')
            : 'Power control unavailable';

        return '<form method="post" action="'
            . $this->escape($formAction)
            . '" class="server-power-form">'
            . $this->buildActionFields('togglePower', $orderId, $csrfToken)
            . '<button type="submit" class="power-switch '
            . ($isPoweredOn ? 'is-on' : 'is-off')
            . '" title="'
            . $this->escape($actionTitle)
            . '"'
            . ($canToggle ? '' : ' disabled aria-disabled="true"')
            . '><span class="visually-hidden">'
            . $this->escape($actionTitle)
            . '</span><span class="power-track"></span><span class="power-thumb"></span></button></form>';
    }

    /**
     * @param array<string, mixed> $order
     */
    private function renderServerActionButtons(array $order, string $formAction, string $csrfToken): string
    {
        $orderId = isset($order['orderId']) && is_numeric($order['orderId']) ? (int) $order['orderId'] : null;
        $rebootButton = $this->renderIconActionForm(
            'reboot',
            $orderId,
            !empty($order['canReboot']),
            'Reboot server',
            $this->renderRebootIcon(),
            $formAction,
            $csrfToken,
            false,
            "return window.confirm('Reboot this server now?');",
            ' is-danger'
        );
        $consoleButton = $this->renderIconActionForm(
            'openConsole',
            $orderId,
            !empty($order['canConsole']),
            'Open server console',
            $this->renderConsoleIcon(),
            $formAction,
            $csrfToken,
            true,
            null
        );

        return '<div class="server-action-group">' . $rebootButton . $consoleButton . '</div>';
    }

    private function buildActionFields(string $panelAction, ?int $orderId, string $csrfToken): string
    {
        return '<input type="hidden" name="csrfToken" value="'
            . $this->escape($csrfToken)
            . '"><input type="hidden" name="panelAction" value="'
            . $this->escape($panelAction)
            . '"><input type="hidden" name="orderId" value="'
            . $this->escape($orderId ?? '')
            . '">';
    }

    private function renderIconActionForm(
        string $panelAction,
        ?int $orderId,
        bool $enabled,
        string $title,
        string $iconMarkup,
        string $formAction,
        string $csrfToken,
        bool $openInNewWindow = false,
        ?string $onclick = null,
        string $extraClassName = ''
    ): string {
        if (!$enabled || $orderId === null) {
            return '<span class="icon-button is-disabled'
                . $extraClassName
                . '" title="'
                . $this->escape($title . ' unavailable')
                . '">' . $iconMarkup . '</span>';
        }

        return '<form method="post" action="'
            . $this->escape($formAction)
            . '" class="server-icon-form"'
            . ($openInNewWindow ? ' target="_blank"' : '')
            . '>'
            . $this->buildActionFields($panelAction, $orderId, $csrfToken)
            . '<button type="submit" class="icon-button'
            . $extraClassName
            . '" title="'
            . $this->escape($title)
            . '"'
            . ($onclick !== null ? ' onclick="' . $this->escape($onclick) . '"' : '')
            . '>'
            . '<span class="visually-hidden">' . $this->escape($title) . '</span>'
            . $iconMarkup
            . '</button></form>';
    }

    private function renderRebootIcon(): string
    {
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 3v6h-6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }

    private function renderConsoleIcon(): string
    {
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="m7 10 3 2-3 2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 16h4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
    }

    private function formatAmount(mixed $value, mixed $format = null): string
    {
        return CurrencyFormat::formatNumber($value, $format);
    }

    /**
     * @param array<string, mixed>|null $currency
     */
    private function formatCurrencyAmount(mixed $value, ?array $currency = null, mixed $fallbackFormat = null): string
    {
        $resolvedCurrency = is_array($currency) ? $currency : [];

        if (
            $this->normalizeNullableString($resolvedCurrency['format'] ?? null) === null
            && $fallbackFormat !== null
        ) {
            $resolvedCurrency['format'] = $fallbackFormat;
        }

        return CurrencyFormat::formatCurrency($value, $resolvedCurrency);
    }

    private function formatCurrencyLabel(string $label, string $marker, ?string $suffix = null): string
    {
        $normalizedMarker = trim($marker);
        $normalizedSuffix = $suffix !== null ? trim($suffix) : '';

        if ($normalizedMarker === '') {
            return $label;
        }

        if ($normalizedSuffix !== '') {
            return sprintf('%s (%s %s)', $label, $normalizedMarker, $normalizedSuffix);
        }

        return sprintf('%s (%s)', $label, $normalizedMarker);
    }

    private function formatInlineCurrencyLabel(string $label, string $marker): string
    {
        $normalizedMarker = trim($marker);

        return $normalizedMarker === '' ? $label : ($label . ' ' . $normalizedMarker);
    }

    private function escape(mixed $value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
    }

    private function normalizeNullableString(mixed $value): ?string
    {
        if (!is_scalar($value)) {
            return null;
        }

        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }
}
