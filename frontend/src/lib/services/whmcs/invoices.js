import {
  createStableWhmcsId,
  createWhmcsNativeFallbackError,
  fetchWhmcsDocument,
  getNodeLines,
  getNodeText,
  getQueryParam,
  normalizeWhmcsText,
  parseMoneyValue,
  toAbsoluteWhmcsUrl,
} from './client'

const EMPTY_INVOICE_STATE_HINTS = [
  'no invoices found',
  'there are no invoices to display',
  'no unpaid invoices',
]

const INVOICE_STATUS_PATTERNS = [
  { pattern: 'payment pending', status: 'Payment Pending', statusCode: 'paymentPending', statusTone: 'info' },
  { pattern: 'overdue', status: 'Overdue', statusCode: 'overdue', statusTone: 'danger' },
  { pattern: 'cancelled', status: 'Cancelled', statusCode: 'cancelled', statusTone: 'neutral' },
  { pattern: 'refunded', status: 'Refunded', statusCode: 'refunded', statusTone: 'neutral' },
  { pattern: 'collections', status: 'Collections', statusCode: 'collections', statusTone: 'danger' },
  { pattern: 'draft', status: 'Draft', statusCode: 'draft', statusTone: 'neutral' },
  { pattern: 'paid', status: 'Paid', statusCode: 'paid', statusTone: 'success' },
  { pattern: 'unpaid', status: 'Unpaid', statusCode: 'unpaid', statusTone: 'warning' },
]

function resolveInvoiceStatus(value) {
  const normalized = normalizeWhmcsText(value).toLowerCase()

  for (const candidate of INVOICE_STATUS_PATTERNS) {
    if (normalized.includes(candidate.pattern)) {
      return candidate
    }
  }

  return {
    status: value || 'Unpaid',
    statusCode: 'unpaid',
    statusTone: 'warning',
  }
}

function isDateLike(value) {
  const normalized = normalizeWhmcsText(value)

  return (
    /\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(normalized) ||
    /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(normalized) ||
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/i.test(normalized)
  )
}

function getInvoiceTextValues(row) {
  const cellValues = Array.from(row.querySelectorAll('th, td'))
    .map(getNodeText)
    .filter(Boolean)

  if (cellValues.length > 0) {
    return cellValues
  }

  return getNodeLines(row)
}

function isInvoiceSummaryRow(row, cells, cellNodes = []) {
  const firstCell = normalizeWhmcsText(cells[0] ?? '').toLowerCase()
  const normalizedClassName = normalizeWhmcsText(row.className ?? '').toLowerCase()
  const cellClassNames = cellNodes
    .map((cell) => normalizeWhmcsText(cell?.className ?? '').toLowerCase())
    .filter(Boolean)

  if (normalizedClassName.includes('total-row') || cellClassNames.some((value) => value.includes('total-row'))) {
    return true
  }

  return (
    ['sub total', 'subtotal', 'credit', 'total'].includes(firstCell) ||
    /^vat\b/.test(firstCell) ||
    /^tax(?:\b|\s*\d)/.test(firstCell)
  )
}

function resolveInvoiceLineItemTypeCode(description) {
  const normalized = normalizeWhmcsText(description).toLowerCase()

  if (!normalized) {
    return ''
  }

  if (
    normalized.includes('csfuserbalance')
    || normalized.includes('user balance')
    || normalized.includes('account balance')
    || normalized.includes('top-up')
    || normalized.includes('top up')
    || normalized.includes('pre-payment')
    || normalized.includes('prepayment')
  ) {
    return 'accountBalance'
  }

  return ''
}

function findInvoiceUrlInText(value, baseUrl) {
  const normalized = String(value ?? '').trim()

  if (!normalized) {
    return ''
  }

  const urlMatch =
    normalized.match(/https?:\/\/[^\s"'<>]+/i) ??
    normalized.match(/(?:viewinvoice\.php|clientarea\.php\?action=invoice)[^\s"'<>]*/i)

  if (!urlMatch?.[0]) {
    return ''
  }

  return toAbsoluteWhmcsUrl(urlMatch[0], baseUrl)
}

function findInvoiceAnchor(row, baseUrl) {
  const link = row.querySelector(
    'a[href*="viewinvoice.php"], a[href*="clientarea.php?action=invoice"], a[href*="invoice"]',
  )

  if (link) {
    const portalUrl = toAbsoluteWhmcsUrl(link.getAttribute('href'), baseUrl)

    if (portalUrl) {
      return {
        link,
        portalUrl,
      }
    }
  }

  const attributeCandidates = [
    row.getAttribute('onclick'),
    row.getAttribute('data-href'),
    row.getAttribute('data-url'),
    row.getAttribute('href'),
    row.outerHTML,
  ]

  for (const candidate of attributeCandidates) {
    const portalUrl = findInvoiceUrlInText(candidate, baseUrl)

    if (!portalUrl) {
      continue
    }

    return {
      link: null,
      portalUrl,
    }
  }

  return null
}

function mapInvoiceRow(row, baseUrl) {
  const anchor = findInvoiceAnchor(row, baseUrl)

  if (!anchor) {
    return null
  }

  const cells = getInvoiceTextValues(row)
  const id = getQueryParam(anchor.portalUrl, 'id') || createStableWhmcsId(anchor.portalUrl)
  const number = getNodeText(anchor.link) || cells.find((cell) => /invoice/i.test(cell)) || `Invoice #${id}`
  const statusValue = (
    Array.from(row.querySelectorAll('.label, .badge, [class*="status"]'))
      .map(getNodeText)
      .find(Boolean) ??
    cells.find((cell) => resolveInvoiceStatus(cell).status !== 'Unpaid' || cell.toLowerCase().includes('unpaid')) ??
    'Unpaid'
  )
  const { status, statusCode, statusTone } = resolveInvoiceStatus(statusValue)
  const dates = cells.filter(isDateLike)
  const totalDisplay = cells[cells.length - 1] ?? ''
  const total = parseMoneyValue(totalDisplay, 0)
  const amountDue = statusCode === 'paid' ? 0 : total

  return {
    amountDue,
    amountDueDisplay: statusCode === 'paid' ? '' : totalDisplay,
    creditApplied: 0,
    dueDate: dates[1] ?? dates[0] ?? '',
    id,
    issuedDate: dates[0] ?? '',
    number,
    paymentMethod: 'Payment Gateway',
    paymentMethodCode: '',
    portalUrl: anchor.portalUrl,
    status,
    statusCode,
    statusTone,
    total,
    totalDisplay,
    type: 'WHMCS Invoice',
    typeCode: 'whmcsInvoice',
  }
}

function isEmptyInvoiceState(document) {
  const pageText = normalizeWhmcsText(document.body?.textContent ?? '').toLowerCase()

  return EMPTY_INVOICE_STATE_HINTS.some((hint) => pageText.includes(hint))
}

function normalizeInvoiceLabel(value) {
  return normalizeWhmcsText(value).toLowerCase().replace(/[:-]\s*$/, '')
}

function extractLabeledValueFromLines(document, labels, excludedLabels = []) {
  const normalizedLabels = labels.map((label) => normalizeInvoiceLabel(label))
  const normalizedExcludedLabels = excludedLabels.map((label) => normalizeInvoiceLabel(label))
  const lines = getNodeLines(document.body)

  for (let index = 0; index < lines.length; index += 1) {
    const currentLine = lines[index]
    const normalizedLine = normalizeInvoiceLabel(currentLine)

    if (normalizedExcludedLabels.some((label) => normalizedLine.includes(label))) {
      continue
    }

    for (const label of normalizedLabels) {
      if (!normalizedLine.startsWith(label)) {
        continue
      }

      const inlineValue = currentLine.slice(currentLine.toLowerCase().indexOf(label) + label.length).replace(/^[:\-\s]+/, '').trim()

      if (inlineValue) {
        return inlineValue
      }

      const nextLine = lines[index + 1] ?? ''

      if (nextLine && !normalizedLabels.some((candidate) => normalizeInvoiceLabel(nextLine).startsWith(candidate))) {
        return nextLine
      }
    }
  }

  return ''
}

function findInvoiceRows(document, baseUrl) {
  const tableRows = Array.from(document.querySelectorAll('table tbody tr, table tr'))
    .map((row) => mapInvoiceRow(row, baseUrl))
    .filter(Boolean)

  if (tableRows.length > 0) {
    return tableRows
  }

  return Array.from(
    document.querySelectorAll(
      '.invoice, .invoice-row, .panel, .card, .list-group-item, [data-role="invoice"], [class*="invoice"]',
    ),
  )
    .map((row) => mapInvoiceRow(row, baseUrl))
    .filter(Boolean)
}

function findValueByLabels(document, labels, excludedLabels = []) {
  const textLineMatch = extractLabeledValueFromLines(document, labels, excludedLabels)

  if (textLineMatch) {
    return textLineMatch
  }

  const normalizedLabels = labels.map((label) => normalizeWhmcsText(label).toLowerCase())
  const normalizedExcludedLabels = excludedLabels.map((label) => normalizeWhmcsText(label).toLowerCase())

  for (const row of Array.from(document.querySelectorAll('table tr'))) {
    const cells = Array.from(row.querySelectorAll('th, td'))
      .map(getNodeText)
      .filter(Boolean)

    if (cells.length < 2) {
      continue
    }

    const firstCell = cells[0].toLowerCase()

    if (normalizedExcludedLabels.some((label) => firstCell.includes(label))) {
      continue
    }

    if (normalizedLabels.some((label) => firstCell.includes(label))) {
      return cells[cells.length - 1]
    }
  }

  for (const term of Array.from(document.querySelectorAll('dt'))) {
    const termText = getNodeText(term).toLowerCase()

    if (normalizedExcludedLabels.some((label) => termText.includes(label))) {
      continue
    }

    if (!normalizedLabels.some((label) => termText.includes(label))) {
      continue
    }

    return getNodeText(term.nextElementSibling)
  }

  return ''
}

function findInvoiceLineItems(document) {
  for (const table of Array.from(document.querySelectorAll('table'))) {
    const headers = Array.from(table.querySelectorAll('thead th, thead td'))
      .map(getNodeText)
      .map((value) => value.toLowerCase())

    if (!headers.some((header) => header.includes('description')) || !headers.some((header) => header.includes('amount'))) {
      continue
    }

    const rows = Array.from(table.querySelectorAll('tbody tr'))
      .map((row, index) => {
        const cellNodes = Array.from(row.querySelectorAll('td'))
        const cells = cellNodes.map(getNodeText).filter(Boolean)

        if (cells.length < 2) {
          return null
        }

        if (isInvoiceSummaryRow(row, cells, cellNodes)) {
          return null
        }

        const amountDisplay = cells[cells.length - 1] ?? ''
        const amount = parseMoneyValue(amountDisplay, Number.NaN)
        const description = cells.slice(0, -1).join(' — ')

        if (!description || !Number.isFinite(amount)) {
          return null
        }

        return {
          amount,
          amountDisplay,
          description,
          id: `${index + 1}`,
          taxed: false,
          type: '',
          typeCode: resolveInvoiceLineItemTypeCode(description),
        }
      })
      .filter(Boolean)

    if (rows.length > 0) {
      return rows
    }
  }

  return []
}

function findPanelByHeading(document, labels) {
  const normalizedLabels = labels.map((label) => normalizeWhmcsText(label).toLowerCase())
  const nodes = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, strong, b, p, div, span'))

  for (const node of nodes) {
    const text = getNodeText(node).toLowerCase()

    if (!text || text.length > 80) {
      continue
    }

    if (!normalizedLabels.some((label) => text.includes(label))) {
      continue
    }

    const candidate = node.closest('.panel, .card, .well, .col-sm-6, .col-md-6, .col-lg-6, td, div')

    if (!candidate) {
      continue
    }

    const lines = getNodeLines(candidate).filter((line) => !normalizedLabels.some((label) => line.toLowerCase().includes(label)))

    if (lines.length > 0) {
      const email = lines.find((line) => line.includes('@')) ?? ''
      const nonEmailLines = lines.filter((line) => line !== email)

      return {
        address: nonEmailLines.slice(1),
        email,
        name: nonEmailLines[0] ?? '',
      }
    }
  }

  return null
}

function findInvoiceHeadingValue(document) {
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, .invoice-number, .page-header'))

  for (const heading of headings) {
    const text = getNodeText(heading)

    if (/invoice/i.test(text) && /#/.test(text)) {
      return text
    }
  }

  return ''
}

function extractInvoiceNumber(headingValue, fallbackId) {
  const normalizedHeading = normalizeWhmcsText(headingValue)
  const match = normalizedHeading.match(/invoice\s*#?\s*([A-Za-z0-9-]+)/i)

  if (match?.[1]) {
    return match[1]
  }

  return fallbackId ? `Invoice #${fallbackId}` : 'Invoice'
}

function extractInvoiceStatus(document) {
  const candidates = Array.from(
    document.querySelectorAll('.label, .badge, [class*="status"], .invoice-status, .status'),
  ).map(getNodeText)

  for (const candidate of candidates) {
    const resolved = resolveInvoiceStatus(candidate)

    if (normalizeWhmcsText(candidate) !== '' || resolved.statusCode !== 'unpaid') {
      return resolved
    }
  }

  return resolveInvoiceStatus(findValueByLabels(document, ['status']) || 'Unpaid')
}

function mapInvoiceAddress(source, fallback) {
  if (!source) {
    return fallback
  }

  return {
    address: source.address?.length ? source.address : fallback.address,
    email: source.email || fallback.email,
    name: source.name || fallback.name,
  }
}

export async function fetchInvoiceList(invoiceListUrl) {
  const { document, url } = await fetchWhmcsDocument(invoiceListUrl)
  const invoices = findInvoiceRows(document, url.toString())
  const uniqueInvoices = []
  const seenIds = new Set()

  for (const invoice of invoices) {
    if (seenIds.has(invoice.id)) {
      continue
    }

    seenIds.add(invoice.id)
    uniqueInvoices.push(invoice)
  }

  if (uniqueInvoices.length > 0) {
    return uniqueInvoices.slice(0, 100)
  }

  if (isEmptyInvoiceState(document)) {
    return []
  }

  throw createWhmcsNativeFallbackError('The WHMCS invoice list markup is not supported.', {
    url: url.toString(),
  })
}

export async function fetchInvoiceDetail(invoiceDetailUrl, fallbackProfile = {}) {
  const { document, url } = await fetchWhmcsDocument(invoiceDetailUrl)
  const id = getQueryParam(url.toString(), 'id') || createStableWhmcsId(url.toString())
  const headingValue = findInvoiceHeadingValue(document)
  const number = extractInvoiceNumber(headingValue, id)
  const { status, statusCode, statusTone } = extractInvoiceStatus(document)
  const invoiceDateText = findValueByLabels(document, ['invoice date', 'proforma invoice date', 'date created'])
  const dueDateText = findValueByLabels(document, ['due date'])
  const subtotalDisplay = findValueByLabels(document, ['subtotal', 'sub total'])
  const vatPrimaryDisplay = findValueByLabels(document, ['vat', 'tax 1', 'tax1', 'tax'], ['tax rate', 'taxrate'])
  const vatSecondaryDisplay = findValueByLabels(document, ['tax 2', 'tax2'], ['tax rate', 'taxrate'])
  const totalDisplay = findValueByLabels(document, ['total'])
  const amountDueDisplay = findValueByLabels(
    document,
    ['balance due', 'amount due', 'due today', 'amount outstanding'],
  )
  const creditAppliedDisplay = findValueByLabels(document, ['credit'])
  const subtotal = parseMoneyValue(subtotalDisplay, Number.NaN)
  const vat = parseMoneyValue(vatPrimaryDisplay, 0) + parseMoneyValue(vatSecondaryDisplay, 0)
  const total = parseMoneyValue(totalDisplay, Number.NaN)
  const amountDue = parseMoneyValue(
    amountDueDisplay,
    statusCode === 'paid' ? 0 : Number.NaN,
  )
  const creditApplied = parseMoneyValue(creditAppliedDisplay, 0)
  const issuedDate = invoiceDateText
  const dueDate = dueDateText
  const paymentMethod = findValueByLabels(document, ['payment method'])
  const lineItems = findInvoiceLineItems(document)
  const invoiceFallback = {
    email: fallbackProfile.currentClient?.email ?? '',
    name: fallbackProfile.currentClient?.fullName ?? fallbackProfile.currentClient?.name ?? 'Client',
    address: Array.isArray(fallbackProfile.currentClient?.address)
      ? fallbackProfile.currentClient.address
      : [],
  }
  const companyFallback = {
    email: fallbackProfile.companyProfile?.email ?? '',
    name: fallbackProfile.companyProfile?.name ?? 'Company',
    address: Array.isArray(fallbackProfile.companyProfile?.address)
      ? fallbackProfile.companyProfile.address
      : [],
  }
  const invoicedTo = mapInvoiceAddress(findPanelByHeading(document, ['invoiced to', 'bill to']), invoiceFallback)
  const payTo = mapInvoiceAddress(findPanelByHeading(document, ['pay to', 'from']), companyFallback)
  const resolvedTotal = Number.isFinite(total)
    ? total
    : lineItems.reduce((sum, lineItem) => sum + Number(lineItem.amount || 0), 0)
  const resolvedSubtotal = Number.isFinite(subtotal) ? subtotal : resolvedTotal
  const resolvedAmountDue = Number.isFinite(amountDue)
    ? amountDue
    : statusCode === 'paid'
      ? 0
      : resolvedTotal

  if (!number && !resolvedTotal && lineItems.length === 0) {
    throw createWhmcsNativeFallbackError('The WHMCS invoice detail markup is not supported.', {
      url: url.toString(),
    })
  }

  return {
    amountDue: resolvedAmountDue,
    amountDueDisplay,
    canPay: resolvedAmountDue > 0,
    creditApplied,
    creditAppliedDisplay,
    dueDate,
    id,
    invoicedTo,
    issuedDate,
    lineItems,
    notes: '',
    number,
    payTo,
    paymentMethod: paymentMethod || 'Payment Gateway',
    paymentMethodCode: normalizeWhmcsText(paymentMethod).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    portalUrl: url.toString(),
    status,
    statusCode,
    statusTone,
    subtotal: resolvedSubtotal,
    subtotalDisplay,
    vat,
    vatDisplay: [vatPrimaryDisplay, vatSecondaryDisplay].filter(Boolean).join(' + '),
    total: resolvedTotal,
    totalDisplay,
    type: 'WHMCS Invoice',
    typeCode: 'whmcsInvoice',
  }
}
