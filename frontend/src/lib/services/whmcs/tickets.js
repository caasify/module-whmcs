import {
  createStableWhmcsId,
  createWhmcsNativeFallbackError,
  fetchWhmcsDocument,
  getNodeText,
  getQueryParam,
  normalizeWhmcsText,
  toAbsoluteWhmcsUrl,
} from './client'

const EMPTY_TICKET_STATE_HINTS = [
  'no tickets found',
  'there are no support tickets',
  'there are no tickets to display',
]

const TICKET_STATUS_PATTERNS = [
  { pattern: 'awaiting', status: 'Awaiting Reply', statusCode: 'awaitingReply', statusTone: 'warning' },
  { pattern: 'answered', status: 'Answered', statusCode: 'awaitingReply', statusTone: 'warning' },
  { pattern: 'customer-reply', status: 'Customer Reply', statusCode: 'awaitingReply', statusTone: 'warning' },
  { pattern: 'in progress', status: 'In Progress', statusCode: 'open', statusTone: 'success' },
  { pattern: 'closed', status: 'Closed', statusCode: 'closed', statusTone: 'neutral' },
  { pattern: 'open', status: 'Open', statusCode: 'open', statusTone: 'success' },
]

function resolveTicketStatus(value) {
  const normalized = normalizeWhmcsText(value).toLowerCase()

  for (const candidate of TICKET_STATUS_PATTERNS) {
    if (normalized.includes(candidate.pattern)) {
      return candidate
    }
  }

  return {
    status: value || 'Open',
    statusCode: 'open',
    statusTone: 'success',
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

function findTicketAnchor(row, baseUrl) {
  const link = row.querySelector(
    'a[href*="supporttickets.php"], a[href*="viewticket.php"], a[href*="ticket"]',
  )

  if (!link) {
    return null
  }

  const portalUrl = toAbsoluteWhmcsUrl(link.getAttribute('href'), baseUrl)

  if (!portalUrl) {
    return null
  }

  return {
    link,
    portalUrl,
  }
}

function findTicketStatus(row, cells) {
  const badgeTexts = Array.from(
    row.querySelectorAll('.label, .badge, [class*="status"], [data-status]'),
  ).map(getNodeText)

  for (const value of [...badgeTexts, ...cells]) {
    const resolvedStatus = resolveTicketStatus(value)

    if (resolvedStatus.status && normalizeWhmcsText(value) !== '') {
      return resolvedStatus
    }
  }

  return resolveTicketStatus('Open')
}

function resolveCaseId(cells, portalUrl, subject) {
  const ticketNumber = getQueryParam(portalUrl, 'tid', 'ticketid')

  if (ticketNumber) {
    return ticketNumber
  }

  return (
    cells.find((cell) => {
      const normalized = normalizeWhmcsText(cell)

      return normalized !== '' && normalized !== subject && !isDateLike(normalized)
    }) ??
    ''
  )
}

function resolveLastReply(cells, subject, status) {
  const filteredCells = cells.filter(
    (cell) => normalizeWhmcsText(cell) !== '' &&
      normalizeWhmcsText(cell) !== normalizeWhmcsText(subject) &&
      normalizeWhmcsText(cell) !== normalizeWhmcsText(status),
  )
  const datedValue = [...filteredCells].reverse().find(isDateLike)

  if (datedValue) {
    return datedValue
  }

  return filteredCells[filteredCells.length - 1] ?? ''
}

function mapTicketRow(row, baseUrl) {
  const anchor = findTicketAnchor(row, baseUrl)

  if (!anchor) {
    return null
  }

  const cells = Array.from(row.querySelectorAll('th, td'))
    .map(getNodeText)
    .filter(Boolean)
  const subject = getNodeText(anchor.link) || cells[0] || 'Support Ticket'
  const idFromUrl = getQueryParam(anchor.portalUrl, 'id', 'tid', 'ticketid')
  const caseId = resolveCaseId(cells, anchor.portalUrl, subject)
  const { status, statusCode, statusTone } = findTicketStatus(row, cells)
  const lastReply = resolveLastReply(cells, subject, status)
  const id = idFromUrl || createStableWhmcsId(anchor.portalUrl)

  return {
    activityLabel: lastReply,
    caseId: caseId || id,
    id,
    lastReply,
    portalUrl: anchor.portalUrl,
    status,
    statusCode,
    statusTone,
    subject,
  }
}

function findTicketRows(document, baseUrl) {
  const rows = Array.from(document.querySelectorAll('table tbody tr'))
    .map((row) => mapTicketRow(row, baseUrl))
    .filter(Boolean)

  if (rows.length > 0) {
    return rows
  }

  return Array.from(document.querySelectorAll('.ticket, .ticket-row, .panel, .card'))
    .map((row) => mapTicketRow(row, baseUrl))
    .filter(Boolean)
}

function isEmptyTicketState(document) {
  const pageText = normalizeWhmcsText(document.body?.textContent ?? '').toLowerCase()

  return EMPTY_TICKET_STATE_HINTS.some((hint) => pageText.includes(hint))
}

export async function fetchTicketList(ticketListUrl) {
  const { document, url } = await fetchWhmcsDocument(ticketListUrl)
  const tickets = findTicketRows(document, url.toString())
  const uniqueTickets = []
  const seenIds = new Set()

  for (const ticket of tickets) {
    if (seenIds.has(ticket.id)) {
      continue
    }

    seenIds.add(ticket.id)
    uniqueTickets.push(ticket)
  }

  if (uniqueTickets.length > 0) {
    return uniqueTickets.slice(0, 100)
  }

  if (isEmptyTicketState(document)) {
    return []
  }

  throw createWhmcsNativeFallbackError('The WHMCS ticket list markup is not supported.', {
    url: url.toString(),
  })
}
