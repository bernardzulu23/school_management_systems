'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const Excalidraw = dynamic(
  async () => {
    const { Excalidraw } = await import('@excalidraw/excalidraw')
    return Excalidraw
  },
  { ssr: false, loading: () => <WhiteboardLoader /> }
)

function WhiteboardLoader() {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1e1033',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: '3px solid #3b2a66',
          borderTop: '3px solid #7c3aed',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <p style={{ color: '#a78bfa', fontSize: 14 }}>Loading whiteboard...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function InteractiveWhiteboard({ user, height = '100vh' }) {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null)
  const [saved, setSaved] = useState(false)
  const [boardName, setBoardName] = useState('My Whiteboard')
  const [showNameInput, setShowNameInput] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.EXCALIDRAW_ASSET_PATH = window.origin
    }
  }, [])

  const handleSave = () => {
    if (!excalidrawAPI) return
    const elements = excalidrawAPI.getSceneElements()
    const appState = excalidrawAPI.getAppState()
    const blob = new Blob(
      [JSON.stringify({ elements, appState, savedAt: new Date().toISOString(), boardName })],
      { type: 'application/json' }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${boardName.replace(/\s+/g, '-')}.excalidraw`
    a.click()
    URL.revokeObjectURL(url)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleExportPNG = async () => {
    if (!excalidrawAPI) return
    const { exportToBlob } = await import('@excalidraw/excalidraw')
    const blob = await exportToBlob({
      elements: excalidrawAPI.getSceneElements(),
      appState: { ...excalidrawAPI.getAppState(), exportBackground: true },
      files: excalidrawAPI.getFiles(),
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${boardName.replace(/\s+/g, '-')}.png`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClear = () => {
    if (!excalidrawAPI) return
    excalidrawAPI.updateScene({ elements: [] })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height, background: '#170d28' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: '#2d1f4e',
          borderBottom: '1px solid #3b2a66',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🖊️</span>
          {showNameInput ? (
            <input
              autoFocus
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              onBlur={() => setShowNameInput(false)}
              onKeyDown={(e) => e.key === 'Enter' && setShowNameInput(false)}
              style={{
                background: '#261843',
                border: '1px solid #7c3aed',
                borderRadius: 6,
                color: '#ede9fe',
                padding: '4px 10px',
                fontSize: 14,
                outline: 'none',
              }}
            />
          ) : (
            <span
              onClick={() => setShowNameInput(true)}
              style={{ color: '#ede9fe', fontWeight: 600, fontSize: 15, cursor: 'text' }}
              title="Click to rename"
            >
              {boardName}
            </span>
          )}
          {user ? (
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 99,
                background: '#0f2318',
                color: '#86efac',
                border: '1px solid #166534',
              }}
            >
              {user.role}
            </span>
          ) : null}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleClear} style={btnStyle('danger')}>
            🗑️ Clear
          </button>
          <button onClick={handleExportPNG} style={btnStyle('secondary')}>
            📷 Export PNG
          </button>
          <button onClick={handleSave} style={btnStyle('primary')}>
            {saved ? '✓ Saved!' : '💾 Save'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          theme="dark"
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: true,
              clearCanvas: false,
              export: false,
              loadScene: true,
              saveAsImage: false,
              saveToActiveFile: false,
            },
          }}
          initialData={{
            appState: {
              viewBackgroundColor: '#1e1033',
              currentItemFontFamily: 1,
            },
          }}
        />
      </div>
    </div>
  )
}

function btnStyle(variant) {
  const base = {
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  }
  if (variant === 'primary') return { ...base, background: '#7c3aed', color: '#fff' }
  if (variant === 'secondary')
    return { ...base, background: '#261843', color: '#a78bfa', border: '1px solid #3b2a66' }
  if (variant === 'danger')
    return { ...base, background: '#3b0a0a', color: '#fca5a5', border: '1px solid #7f1d1d' }
  return base
}
