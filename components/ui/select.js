import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'

const SelectContext = createContext({})

export const Select = ({ children, value, onValueChange }) => {
  const [open, setOpen] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState('')

  return (
    <SelectContext.Provider value={{ open, setOpen, value, onValueChange, selectedLabel, setSelectedLabel }}>
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
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white dark:bg-slate-800 px-3 py-2 text-sm ring-offset-white dark:ring-offset-slate-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-gray-100 ${className}`}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  )
}

export const SelectValue = ({ placeholder }) => {
  const { value, selectedLabel } = useContext(SelectContext)
  return (
    <span className="block truncate">
      {value ? (selectedLabel || value) : <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>}
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
      className={`absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white dark:bg-slate-800 text-gray-950 dark:text-gray-50 shadow-md animate-in fade-in-80 w-full mt-1 dark:border-slate-700 ${className}`}
    >
      <div className="p-1">{children}</div>
    </div>
  )
}

export const SelectItem = ({ children, value, className = '' }) => {
  const { onValueChange, setOpen, value: selectedValue, setSelectedLabel } = useContext(SelectContext)
  
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
      className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-gray-100 dark:hover:bg-slate-700 focus:bg-gray-100 focus:text-gray-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 cursor-pointer ${isSelected ? 'font-medium bg-purple-50 dark:bg-slate-700 text-purple-900 dark:text-purple-100' : ''} ${className}`}
    >
      {isSelected && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <span className="h-2 w-2 rounded-full bg-purple-600 dark:bg-purple-400" />
        </span>
      )}
      {children}
    </div>
  )
}
