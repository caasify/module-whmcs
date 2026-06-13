export function createNotice(type, key, values = {}, message = '') {
  return {
    id: `${type}-${Date.now()}`,
    type,
    key,
    message,
    values,
  }
}

export function createMessageNotice(type, message) {
  return createNotice(type, '', {}, message)
}
