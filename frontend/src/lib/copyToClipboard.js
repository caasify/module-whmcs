function fallbackCopyToClipboard(value) {
  const textArea = document.createElement('textarea')
  textArea.value = value
  textArea.setAttribute('readonly', '')
  textArea.style.position = 'fixed'
  textArea.style.top = '-9999px'
  textArea.style.left = '-9999px'

  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  textArea.setSelectionRange(0, textArea.value.length)

  try {
    return document.execCommand('copy')
  } finally {
    document.body.removeChild(textArea)
  }
}

export async function copyToClipboard(value) {
  if (!value) {
    return false
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      return fallbackCopyToClipboard(value)
    }
  }

  if (typeof document !== 'undefined') {
    return fallbackCopyToClipboard(value)
  }

  return false
}
