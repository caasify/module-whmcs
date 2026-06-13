import { Check, ChevronDown } from '@/components/icons'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'

export function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  readOnly = false,
  className,
}) {
  return (
    <label className={cn('flex flex-col gap-3', className)}>
      <span className="type-label text-[var(--color-muted)]">
        {label}
      </span>
      <input
        className="type-input text-start h-16 rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 text-[var(--color-ink)] outline-none transition placeholder:text-[var(--color-copy)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 read-only:bg-[var(--color-panel-soft)]"
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        type={type}
        value={value}
      />
    </label>
  )
}

const selectSizeClasses = {
  default: {
    trigger: 'h-16 rounded-2xl px-5 text-[var(--color-ink)]',
    menu: 'top-[calc(100%+0.75rem)] rounded-[22px] p-2',
    option: 'rounded-[16px] px-4 py-3',
  },
  compact: {
    trigger: 'h-[54px] rounded-[16px] px-4 text-[var(--color-ink)]',
    menu: 'top-[calc(100%+0.55rem)] rounded-[18px] p-1.5',
    option: 'rounded-[12px] px-3.5 py-2.5',
  },
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  className,
  size = 'default',
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const sizeClasses = selectSizeClasses[size] ?? selectSizeClasses.default
  const selectedOption = options.find(
    (option) => (typeof option === 'string' ? option : option.value) === value,
  )
  const selectedLabel =
    typeof selectedOption === 'string' ? selectedOption : selectedOption?.label ?? value

  useEffect(() => {
    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  function handleSelect(nextValue) {
    onChange?.({ target: { value: nextValue } })
    setOpen(false)
  }

  return (
    <label className={cn('flex flex-col gap-3', className)}>
      {label ? <span className="type-label text-[var(--color-muted)]">{label}</span> : null}
      <span className="relative" ref={menuRef}>
        <button
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            'type-input flex w-full items-center justify-between gap-3 border border-[var(--color-border-strong)] bg-[var(--color-surface)] outline-none transition hover:border-[var(--color-primary)] focus-visible:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/15',
            sizeClasses.trigger,
            open && 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/15',
          )}
          type="button"
          onClick={() => setOpen((current) => !current)}
        >
          <span className="truncate text-start">{selectedLabel}</span>
          <ChevronDown
            className={cn(
              'h-5 w-5 shrink-0 text-[var(--color-muted)] transition',
              open && 'rotate-180',
            )}
            strokeWidth={2.1}
          />
        </button>

        {open ? (
          <div
            className={cn(
              'absolute left-0 right-0 z-30 overflow-hidden border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-[var(--shadow-menu)]',
              sizeClasses.menu,
            )}
            role="listbox"
          >
            {options.map((option) => {
              const optionValue = typeof option === 'string' ? option : option.value
              const optionLabel = typeof option === 'string' ? option : option.label
              const selected = optionValue === value

              return (
                <button
                  key={optionValue}
                  aria-selected={selected}
                  className={cn(
                    'flex w-full items-center justify-between text-start transition',
                    sizeClasses.option,
                    selected
                      ? 'bg-[var(--color-nav-active)] text-[var(--color-primary)]'
                      : 'text-[var(--color-ink)] hover:bg-[var(--color-panel-soft)]',
                  )}
                  role="option"
                  type="button"
                  onClick={() => handleSelect(optionValue)}
                >
                  <span className={selected ? 'type-body-strong' : 'type-body'}>{optionLabel}</span>
                  {selected ? <Check className="h-4 w-4" strokeWidth={2.4} /> : null}
                </button>
              )
            })}
          </div>
        ) : null}
      </span>
    </label>
  )
}
