export function mergeItemById(items, nextItem) {
  const itemId = String(nextItem?.id ?? '')

  if (!itemId) {
    return items
  }

  const nextItems = [...items]
  const existingIndex = nextItems.findIndex((item) => String(item?.id ?? '') === itemId)

  if (existingIndex === -1) {
    nextItems.unshift(nextItem)
    return nextItems
  }

  nextItems[existingIndex] = {
    ...nextItems[existingIndex],
    ...nextItem,
  }

  return nextItems
}
