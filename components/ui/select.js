'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const SelectContext = createContext(null)

function useSelectContext(name) {
  const context = useContext(SelectContext)
  if (!context) {
    throw new Error(`${name} must be used within Select`)
  }
  return context
}

export function Select({ children, value, onValueChange, disabled = false, name }) {
  const [open, setOpen] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState('')
  const [highlightedValue, setHighlightedValue] = useState(value ?? '')
  const listboxId = useId()

  useEffect(() => {
    if (open) {
      setHighlightedValue(value ?? '')
    }
  }, [open, value])

  return (
    <SelectContext.Provider
      value={{
        open,
        setOpen,
        value,
        onValueChange,
        disabled,
        name,
        selectedLabel,
        setSelectedLabel,
        highlightedValue,
        setHighlightedValue,
        listboxId,
      }}
    >
      <div className="relative w-full">{children}</div>
    </SelectContext.Provider>
  )
}

export const SelectGroup = ({ children, className = '', ...props }) => (
  <div role="group" data-slot="select-group" className={cn('p-1', className)} {...props}>
    {children}
  </div>
)

export const SelectLabel = ({ children, className = '', ...props }) => (
  <div
    data-slot="select-label"
    className={cn('px-2 py-1.5 text-xs font-medium text-royalPurple-text3', className)}
    {...props}
  >
    {children}
  </div>
)

export const SelectSeparator = ({ className = '', ...props }) => (
  <div
    data-slot="select-separator"
    className={cn('-mx-1 my-1 h-px bg-royalPurple-border', className)}
    {...props}
  />
)

export const SelectTrigger = ({
  children,
  className = '',
  disabled: disabledProp,
  id,
  ...props
}) => {
  const {
    open,
    setOpen,
    disabled: disabledContext,
    listboxId,
    value,
    setHighlightedValue,
  } = useSelectContext('SelectTrigger')
  const disabled = disabledProp ?? disabledContext

  return (
    <button
      type="button"
      id={id}
      disabled={disabled}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={listboxId}
      onClick={() => {
        if (!disabled) setOpen((current) => !current)
      }}
      onKeyDown={(event) => {
        if (disabled) return
        if (
          event.key === 'ArrowDown' ||
          event.key === 'ArrowUp' ||
          event.key === 'Enter' ||
          event.key === ' '
        ) {
          event.preventDefault()
          if (!open) {
            setHighlightedValue(value ?? '')
            setOpen(true)
          }
        }
      }}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-lg border border-royalPurple-border bg-royalPurple-card2 px-3 py-2 text-sm text-royalPurple-text1 focus:outline-none focus:border-royalPurple-border2 focus:ring-1 focus:ring-royalPurple-border2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="size-4 shrink-0 text-royalPurple-text3 opacity-70" />
    </button>
  )
}

export const SelectValue = ({ placeholder }) => {
  const { value, selectedLabel } = useSelectContext('SelectValue')

  return (
    <span className="block truncate text-left">
      {value ? (
        selectedLabel || value
      ) : (
        <span className="text-royalPurple-muted">{placeholder}</span>
      )}
    </span>
  )
}

const SelectItemRegistryContext = createContext(() => {})

export const SelectContent = ({ children, className = '' }) => {
  const { open, setOpen, onValueChange, highlightedValue, setHighlightedValue, listboxId } =
    useSelectContext('SelectContent')
  const ref = useRef(null)
  const itemsRef = useRef([])

  const registerItem = useCallback((itemValue, element) => {
    if (!element) {
      itemsRef.current = itemsRef.current.filter((item) => item.value !== itemValue)
      return
    }
    const existing = itemsRef.current.find((item) => item.value === itemValue)
    if (existing) {
      existing.element = element
      return
    }
    itemsRef.current.push({ value: itemValue, element })
  }, [])

  const selectHighlighted = useCallback(() => {
    if (!highlightedValue) return
    onValueChange?.(highlightedValue)
    setOpen(false)
  }, [highlightedValue, onValueChange, setOpen])

  const moveHighlight = useCallback(
    (direction) => {
      const enabledItems = itemsRef.current.filter((item) => item.element && !item.disabled)
      if (!enabledItems.length) return

      const currentIndex = enabledItems.findIndex((item) => item.value === highlightedValue)
      const nextIndex =
        direction === 'next'
          ? currentIndex < 0
            ? 0
            : (currentIndex + 1) % enabledItems.length
          : currentIndex < 0
            ? enabledItems.length - 1
            : (currentIndex - 1 + enabledItems.length) % enabledItems.length

      const nextValue = enabledItems[nextIndex]?.value
      if (nextValue) {
        setHighlightedValue(nextValue)
        enabledItems[nextIndex]?.element?.scrollIntoView?.({ block: 'nearest' })
      }
    },
    [highlightedValue, setHighlightedValue]
  )

  useEffect(() => {
    if (!open) return undefined

    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, setOpen])

  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        moveHighlight('next')
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        moveHighlight('prev')
        return
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        selectHighlighted()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [moveHighlight, open, selectHighlighted, setOpen])

  if (!open) return null

  return (
    <SelectItemRegistryContext.Provider value={registerItem}>
      <div
        ref={ref}
        id={listboxId}
        role="listbox"
        className={cn(
          'absolute z-50 mt-1 max-h-60 w-full min-w-[8rem] overflow-hidden rounded-xl border border-royalPurple-border bg-white text-royalPurple-text1 shadow-md animate-in fade-in-80',
          className
        )}
      >
        {children}
      </div>
    </SelectItemRegistryContext.Provider>
  )
}

export const SelectItem = ({ children, value, className = '', disabled = false, ...props }) => {
  const {
    onValueChange,
    setOpen,
    value: selectedValue,
    setSelectedLabel,
    highlightedValue,
    setHighlightedValue,
  } = useSelectContext('SelectItem')
  const registerItem = useContext(SelectItemRegistryContext)
  const itemRef = useRef(null)

  const isSelected = value === selectedValue
  const isHighlighted = value === highlightedValue

  useEffect(() => {
    registerItem(value, { disabled, element: itemRef.current })
    return () => registerItem(value, null)
  }, [disabled, registerItem, value])

  useEffect(() => {
    if (isSelected) {
      setSelectedLabel(children)
      setHighlightedValue(value)
    }
  }, [children, isSelected, setHighlightedValue, setSelectedLabel, value])

  return (
    <div
      ref={itemRef}
      role="option"
      aria-selected={isSelected}
      data-disabled={disabled ? '' : undefined}
      tabIndex={-1}
      onMouseEnter={() => {
        if (!disabled) setHighlightedValue(value)
      }}
      onClick={() => {
        if (disabled) return
        onValueChange?.(value)
        setOpen(false)
      }}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-2 text-sm outline-none text-ink/80 hover:bg-royalPurple-card2 hover:text-ink data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        isSelected && 'bg-royalPurple-accentBg font-semibold text-royalPurple-accentTx',
        isHighlighted && !isSelected && 'bg-royalPurple-card2',
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        {isSelected ? <Check className="size-4 text-royalPurple-accent" /> : null}
      </span>
      {children}
    </div>
  )
}
