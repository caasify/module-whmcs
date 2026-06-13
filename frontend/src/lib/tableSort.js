function compareValues(left, right) {
  if (left == null && right == null) {
    return 0
  }

  if (left == null) {
    return 1
  }

  if (right == null) {
    return -1
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right
  }

  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime()
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

function getSortValue(column, row) {
  if (typeof column.sortValue === 'function') {
    return column.sortValue(row)
  }

  return row[column.key]
}

export function getNextSortState(currentSort, columnKey) {
  if (currentSort?.key !== columnKey) {
    return { key: columnKey, direction: 'asc' }
  }

  if (currentSort.direction === 'asc') {
    return { key: columnKey, direction: 'desc' }
  }

  return null
}

export function sortTableRows(rows, columns, sortState) {
  if (!sortState?.key) {
    return rows
  }

  const activeColumn = columns.find(
    (column) => column.key === sortState.key && column.sortable,
  )

  if (!activeColumn) {
    return rows
  }

  const direction = sortState.direction === 'desc' ? -1 : 1

  return [...rows].sort((leftRow, rightRow) => {
    const leftValue = getSortValue(activeColumn, leftRow)
    const rightValue = getSortValue(activeColumn, rightRow)
    const comparison = activeColumn.sortComparator
      ? activeColumn.sortComparator(leftValue, rightValue, leftRow, rightRow)
      : compareValues(leftValue, rightValue)

    return comparison * direction
  })
}
