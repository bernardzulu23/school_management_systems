import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'

const SelectContext = createContext({})

export const Select = ({ children, value, onValueChange }) => {
  const [open, setOpen] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState('')

  return (
    <SelectContext.Provider
      value={{ open, setOpen, value, onValueChange, selectedLabel, setSelectedLabel }}
    >
      <div className="relative w-full">{children}</div>
    </SelectContext.Provider>
  )
}

export const SelectTrigger = ({ children, className = '' }) => {
  const { open, setOpen } = useContext(SelectContext)
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={`flex h-10 w-full items-center justify-between bg-royalPurple-card2 border border-royalPurple-border text-royalPurple-text1 placeholder:text-royalPurple-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-royalPurple-border2 focus:ring-1 focus:ring-royalPurple-border2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      aria-label="Select"
    >
      {children}
      <ChevronDown className="h-4 w-4 text-royalPurple-text3" />
    </button>
  )
}

export const SelectValue = ({ placeholder }) => {
  const { value, selectedLabel } = useContext(SelectContext)
  return (
    <span className="block truncate">
      {value ? (
        selectedLabel || value
      ) : (
        <span className="text-royalPurple-muted">{placeholder}</span>
      )}
    </span>
  )
}

export const SelectContent = ({ children, className = '' }) => {
  const { open, setOpen } = useContext(SelectContext)
  const ref = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [setOpen])

  if (!open) return null

  return (
    <div
      ref={ref}
      className={`zsms-select-menu absolute z-50 min-w-[8rem] overflow-hidden rounded-xl border border-royalPurple-border bg-white text-royalPurple-text1 shadow-none animate-in fade-in-80 w-full mt-1 ${className}`}
    >
      <div className="p-1">{children}</div>
    </div>
  )
}

export const SelectItem = ({ children, value, className = '' }) => {
  const {
    onValueChange,
    setOpen,
    value: selectedValue,
    setSelectedLabel,
  } = useContext(SelectContext)

  const isSelected = value === selectedValue

  useEffect(() => {
    if (isSelected) {
      setSelectedLabel(children)
    }
  }, [isSelected, children, setSelectedLabel])

  return (
    <div
      onClick={() => {
        onValueChange(value)
        setOpen(false)
      }}
      className={`relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-2 text-sm outline-none text-ink/80 hover:bg-royalPurple-card2 hover:text-ink data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${isSelected ? 'font-semibold bg-royalPurple-accentBg text-royalPurple-accentTx' : ''} ${className}`}
    >
      {isSelected && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <span className="h-2 w-2 rounded-full bg-royalPurple-accent" />
        </span>
      )}
      {children}
    </div>
  )
}
