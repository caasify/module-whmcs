import { useEffect, useRef, useState } from 'react'
import { copyToClipboard } from '../lib/copyToClipboard'

const DEFAULT_RESET_DELAY = 1200

export function useCopyToClipboard(resetDelay = DEFAULT_RESET_DELAY) {
  const [copiedKey, setCopiedKey] = useState('')
  const timeoutRef = useRef(null)

  useEffect(() => () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }
  }, [])

  async function copyValue(key, value) {
    const didCopy = await copyToClipboard(value)

    if (!didCopy) {
      return false
    }

    setCopiedKey(key)

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = window.setTimeout(() => {
      setCopiedKey((current) => (current === key ? '' : current))
      timeoutRef.current = null
    }, resetDelay)

    return true
  }

  return { copiedKey, copyValue }
}
