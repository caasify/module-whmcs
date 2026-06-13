import { ChevronDown } from '@/components/icons'
import { useState } from 'react'
import { useDashboardApp } from '../../context/useDashboardApp'
import { cn } from '../../lib/cn'
import { getNextSortState, sortTableRows } from '../../lib/tableSort'
import { SelectField } from './FormField'
import { SortableHeaderLabel } from './SortableHeaderLabel'

const defaultMobileSortValue = '__default'

export function DataTable({
  columns,
  rows,
  minWidth = '720px',
  variant = 'flat',
  frame = variant === 'flat',
  className,
  frameClassName,
  emptyMessage,
  scrollHeight,
  stickyHeader = false,
  defaultSort = null,
  sortRows = true,
  sortState: controlledSortState,
  onSortChange,
  getRowClassName,
  getRowKey,
  getRowProps,
  rowClassName,
  gridClassName,
  tableClassName,
  mobileView = true,
}) {
  const { t } = useDashboardApp()
  const [internalSortState, setInternalSortState] = useState(defaultSort)
  const isControlled = controlledSortState !== undefined
  const sortState = isControlled ? controlledSortState : internalSortState
  const displayRows = sortRows ? sortTableRows(rows, columns, sortState) : rows
  const scrollClassName = scrollHeight ? 'overflow-auto' : 'overflow-x-auto'
  const scrollStyle = scrollHeight ? { maxHeight: scrollHeight } : undefined
  const sortableColumns = columns.filter((column) => column.sortable)
  const mobilePrimaryColumns = columns.filter((column) => column.mobileLayout === 'primary')
  const mobileFooterColumns = columns.filter((column) => column.mobileLayout === 'footer')
  const primaryColumns = mobilePrimaryColumns.length > 0
    ? mobilePrimaryColumns
    : columns.slice(0, 1)
  const primaryColumnKeys = new Set(primaryColumns.map((column) => column.key))
  const footerColumnKeys = new Set(mobileFooterColumns.map((column) => column.key))
  const mobileDetailColumns = columns.filter(
    (column) =>
      column.mobileLayout !== 'hidden' &&
      !primaryColumnKeys.has(column.key) &&
      !footerColumnKeys.has(column.key),
  )

  const mobileSortOptions = [
    {
      label: t('common.sort.default'),
      value: defaultMobileSortValue,
    },
    ...sortableColumns.map((column) => ({
      label:
        typeof column.mobileLabel === 'string'
          ? column.mobileLabel
          : typeof column.label === 'string'
            ? column.label
            : column.key,
      value: column.key,
    })),
  ]

  function handleSort(columnKey) {
    const nextSortState = getNextSortState(sortState, columnKey)

    if (!isControlled) {
      setInternalSortState(nextSortState)
    }

    onSortChange?.(nextSortState)
  }

  function renderHeader(column) {
    const isSorted = sortState?.key === column.key

    if (!column.sortable) {
      return column.label
    }

    return (
      <SortableHeaderLabel
        active={isSorted}
        className={column.headerButtonClassName}
        direction={sortState?.direction}
        label={column.label}
        onClick={() => handleSort(column.key)}
      />
    )
  }

  function renderCell(column, row) {
    return column.render ? column.render(row) : row[column.key]
  }

  function renderMobileCell(column, row) {
    return column.mobileRender ? column.mobileRender(row) : renderCell(column, row)
  }

  function updateSortState(nextSortState) {
    if (!isControlled) {
      setInternalSortState(nextSortState)
    }

    onSortChange?.(nextSortState)
  }

  function handleMobileSortChange(event) {
    const nextKey = event.target.value

    if (nextKey === defaultMobileSortValue) {
      updateSortState(null)
      return
    }

    if (sortState?.key === nextKey) {
      updateSortState(sortState)
      return
    }

    updateSortState({
      key: nextKey,
      direction: 'asc',
    })
  }

  function handleMobileDirectionToggle() {
    if (!sortState?.key) {
      return
    }

    updateSortState({
      ...sortState,
      direction: sortState.direction === 'desc' ? 'asc' : 'desc',
    })
  }

  function renderMobileSortControls() {
    if (!mobileView || sortableColumns.length === 0) {
      return null
    }

    return (
      <div className="rounded-[20px] border border-[var(--color-border-soft-strong)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-panel)] md:hidden">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <SelectField
            label={t('common.sortBy')}
            options={mobileSortOptions}
            size="compact"
            value={sortState?.key ?? defaultMobileSortValue}
            onChange={handleMobileSortChange}
          />

          <button
            className="theme-button-secondary type-button inline-flex h-[54px] items-center justify-center gap-3 rounded-[16px] border px-4 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!sortState?.key}
            type="button"
            onClick={handleMobileDirectionToggle}
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 text-[var(--color-primary)] transition-transform',
                sortState?.direction !== 'desc' && 'rotate-180',
              )}
              strokeWidth={2.2}
            />
            {sortState?.direction === 'desc'
              ? t('common.sortDirection.desc')
              : t('common.sortDirection.asc')}
          </button>
        </div>
      </div>
    )
  }

  function renderEmptyState() {
    return (
      <div className="type-body rounded-[18px] border border-[var(--color-border-soft-strong)] bg-[var(--color-surface)] px-6 py-10 text-center text-[var(--color-copy)] shadow-[var(--shadow-panel)]">
        {emptyMessage ?? 'No records yet.'}
      </div>
    )
  }

  function renderMobileCards() {
    if (!mobileView) {
      return null
    }

    return (
      <div className="grid gap-3 md:hidden">
        {renderMobileSortControls()}

        {displayRows.length === 0 ? (
          renderEmptyState()
        ) : (
          displayRows.map((row, index) => {
            const rowProps = getRowProps?.(row, index) ?? {}
            const { className: rowPropsClassName, ...restRowProps } = rowProps

            return (
              <div
                key={getRowKey?.(row, index) ?? row.id ?? `${index}`}
                className={cn(
                  'table-row-card-motion rounded-[22px] border border-[var(--color-border-soft-strong)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-panel)]',
                  rowClassName,
                  getRowClassName?.(row, index),
                  rowPropsClassName,
                )}
                {...restRowProps}
              >
                <div className="grid gap-5">
                  {primaryColumns.map((column) => (
                    <div
                      key={column.key}
                      className={cn(
                        'type-table-cell text-[var(--color-ink)]',
                        column.mobileCellClassName ?? column.cellClassName,
                      )}
                    >
                      {renderMobileCell(column, row)}
                    </div>
                  ))}

                  {mobileDetailColumns.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {mobileDetailColumns.map((column) => (
                        <div
                          key={column.key}
                          className={cn('grid gap-2', column.mobileItemClassName)}
                        >
                          <p className="type-label-sm text-[var(--color-muted)]">
                            {typeof column.mobileLabel === 'string' ? column.mobileLabel : column.label}
                          </p>
                          <div
                            className={cn(
                              'type-table-cell text-[var(--color-ink)]',
                              column.mobileCellClassName ?? column.cellClassName,
                            )}
                          >
                            {renderMobileCell(column, row)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {mobileFooterColumns.length > 0 ? (
                    <div className="grid gap-3 border-t border-[var(--color-border-soft)] pt-4">
                      {mobileFooterColumns.map((column) => (
                        <div
                          key={column.key}
                          className={cn(
                            'type-table-cell text-[var(--color-ink)]',
                            column.mobileCellClassName ?? column.cellClassName,
                          )}
                        >
                          {renderMobileCell(column, row)}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })
        )}
      </div>
    )
  }

  if (variant === 'card') {
    const desktopCardContent = (
      <div className={cn(scrollClassName, 'hidden md:block')} style={scrollStyle}>
        <div style={{ minWidth }}>
          <div className={cn(gridClassName, 'px-6 pb-5')}>
            {columns.map((column) => (
              <div
                key={column.key}
                className={cn('type-table-header text-[var(--color-copy)]', column.headerClassName)}
              >
                {renderHeader(column)}
              </div>
            ))}
          </div>

          {displayRows.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="grid gap-3">
              {displayRows.map((row, index) => {
                const rowProps = getRowProps?.(row, index) ?? {}
                const { className: rowPropsClassName, ...restRowProps } = rowProps

                return (
                  <div
                    key={getRowKey?.(row, index) ?? row.id ?? `${index}`}
                    className={cn(
                      gridClassName,
                      'table-row-card-motion items-center rounded-[18px] border border-[var(--color-border-soft-strong)] bg-[var(--color-surface)] px-6 py-5 shadow-[var(--shadow-panel)]',
                      rowClassName,
                      getRowClassName?.(row, index),
                      rowPropsClassName,
                    )}
                    {...restRowProps}
                  >
                    {columns.map((column) => (
                      <div
                        key={column.key}
                        className={cn('type-table-cell text-[var(--color-ink)]', column.cellClassName)}
                      >
                        {renderCell(column, row)}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )

    const cardContent = (
      <div className={cn(frame ? undefined : className)}>
        {renderMobileCards()}
        {desktopCardContent}
      </div>
    )

    if (!frame) {
      return cardContent
    }

    return (
      <div
        className={cn(
          'overflow-visible rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] md:overflow-hidden',
          frameClassName,
          className,
        )}
      >
        {cardContent}
      </div>
    )
  }

  const desktopFlatContent = (
    <div className={cn(scrollClassName, 'hidden md:block')} style={scrollStyle}>
      <table className={cn('w-full border-collapse', tableClassName)} style={{ minWidth }}>
        <thead>
          <tr className="bg-[var(--color-panel-soft)]">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'type-table-header px-6 py-5 text-left text-[var(--color-muted)]',
                  stickyHeader && 'sticky top-0 z-10 bg-[var(--color-panel-soft)]',
                  column.headerClassName,
                )}
              >
                {renderHeader(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.length === 0 ? (
            <tr>
              <td
                className="type-body-sm px-6 py-10 text-center text-[var(--color-copy)]"
                colSpan={columns.length}
              >
                {emptyMessage ?? 'No records yet.'}
              </td>
            </tr>
          ) : (
            displayRows.map((row, index) => {
              const rowProps = getRowProps?.(row, index) ?? {}
              const { className: rowPropsClassName, ...restRowProps } = rowProps

              return (
                <tr
                  key={getRowKey?.(row, index) ?? row.id ?? `${index}`}
                  className={cn(
                    'table-row-motion-subtle border-t border-[var(--color-border)]',
                    rowClassName,
                    getRowClassName?.(row, index),
                    rowPropsClassName,
                  )}
                  {...restRowProps}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'type-table-cell px-6 py-5 align-top text-[var(--color-ink)]',
                        column.cellClassName,
                      )}
                    >
                      {renderCell(column, row)}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )

  const flatContent = (
    <div className={cn(frame ? undefined : className)}>
      {renderMobileCards()}
      {desktopFlatContent}
    </div>
  )

  if (!frame) {
    return flatContent
  }

  return (
    <div
      className={cn(
        'overflow-visible rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] md:overflow-hidden',
        frameClassName,
        className,
      )}
    >
      {flatContent}
    </div>
  )
}
