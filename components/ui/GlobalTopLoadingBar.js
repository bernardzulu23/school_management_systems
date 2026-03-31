'use client'

import { useEffect, useRef, useState } from 'react'
import TopLoadingBar from '@/components/ui/TopLoadingBar'

export default function GlobalTopLoadingBar() {
  const [active, setActive] = useState(false)
  const [percent, setPercent] = useState(0)
  const [label, setLabel] = useState('Refreshing')
  const countRef = useRef(0)
  const simRef = useRef(null)

  useEffect(() => {
    const clearSim = () => {
      if (simRef.current) clearInterval(simRef.current)
      simRef.current = null
    }

    const startSim = () => {
      if (simRef.current) return
      simRef.current = setInterval(() => {
        setPercent((p) => {
          if (p >= 95) return p
          const step = Math.floor(Math.random() * 7) + 1
          return Math.min(95, p + step)
        })
      }, 220)
    }

    const onStart = (e) => {
      countRef.current += 1
      const nextLabel = e?.detail?.label
      if (nextLabel) setLabel(String(nextLabel))
      if (countRef.current === 1) {
        setPercent(0)
        setActive(true)
        startSim()
      }
    }

    const onUpdate = (e) => {
      const p = e?.detail?.percent
      if (p === undefined) return
      setPercent(Math.max(0, Math.min(100, Math.round(Number(p) || 0))))
    }

    const onStop = () => {
      countRef.current = Math.max(0, countRef.current - 1)
      if (countRef.current !== 0) return
      clearSim()
      setPercent(100)
      setTimeout(() => {
        if (countRef.current === 0) setActive(false)
        setPercent(0)
      }, 300)
    }

    window.addEventListener('top-loading:start', onStart)
    window.addEventListener('top-loading:update', onUpdate)
    window.addEventListener('top-loading:stop', onStop)

    return () => {
      clearSim()
      window.removeEventListener('top-loading:start', onStart)
      window.removeEventListener('top-loading:update', onUpdate)
      window.removeEventListener('top-loading:stop', onStop)
    }
  }, [])

  return <TopLoadingBar active={active} percent={percent} label={label} />
}
