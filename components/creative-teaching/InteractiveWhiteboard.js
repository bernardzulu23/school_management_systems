'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  Palette, Eraser, Square, Circle, Type, Image, Save, Download,
  Undo, Redo, Trash2, Layers, MousePointer, Pen, Highlighter,
  Shapes, Grid, ZoomIn, ZoomOut, RotateCcw, Share2, Play, Pause
} from 'lucide-react'

export default function InteractiveWhiteboard() {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentTool, setCurrentTool] = useState('pen')
  const [currentColor, setCurrentColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(3)
  const [canvasHistory, setCanvasHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [zoom, setZoom] = useState(1)
  const [showGrid, setShowGrid] = useState(false)
  const [layers, setLayers] = useState([{ id: 1, name: 'Layer 1', visible: true, active: true }])
  const [isPresenting, setIsPresenting] = useState(false)

  // Drawing tools configuration
  const tools = [
    { id: 'pointer', icon: MousePointer, label: 'Select' },
    { id: 'pen', icon: Pen, label: 'Pen' },
    { id: 'highlighter', icon: Highlighter, label: 'Highlighter' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'line', icon: Shapes, label: 'Line' }
  ]

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000',
    '#FFC0CB', '#A52A2A', '#808080', '#FFFFFF'
  ]

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      
      // Set canvas size
      canvas.width = 1200
      canvas.height = 800
      
      // Fill with white background
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Save initial state
      saveToHistory()
    }
  }, [])

  const startDrawing = (e) => {
    if (currentTool === 'pointer') return
    
    setIsDrawing(true)
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom
    
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e) => {
    if (!isDrawing || currentTool === 'pointer') return
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom
    
    const ctx = canvas.getContext('2d')
    
    if (currentTool === 'pen' || currentTool === 'highlighter') {
      ctx.globalCompositeOperation = currentTool === 'highlighter' ? 'multiply' : 'source-over'
      ctx.strokeStyle = currentColor
      ctx.lineWidth = currentTool === 'highlighter' ? brushSize * 3 : brushSize
      ctx.globalAlpha = currentTool === 'highlighter' ? 0.3 : 1
      ctx.lineTo(x, y)
      ctx.stroke()
    } else if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = brushSize * 2
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false)
      saveToHistory()
    }
  }

  const saveToHistory = () => {
    const canvas = canvasRef.current
    const imageData = canvas.toDataURL()
    const newHistory = canvasHistory.slice(0, historyIndex + 1)
    newHistory.push(imageData)
    setCanvasHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      restoreFromHistory(historyIndex - 1)
    }
  }

  const redo = () => {
    if (historyIndex < canvasHistory.length - 1) {
      setHistoryIndex(historyIndex + 1)
      restoreFromHistory(historyIndex + 1)
    }
  }

  const restoreFromHistory = (index) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
    }
    img.src = canvasHistory[index]
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    saveToHistory()
  }

  const saveCanvas = () => {
    const canvas = canvasRef.current
    const link = document.createElement('a')
    link.download = `whiteboard-${new Date().toISOString().split('T')[0]}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  const toggleGrid = () => {
    setShowGrid(!showGrid)
    // Grid implementation would go here
  }

  const zoomIn = () => setZoom(Math.min(zoom * 1.2, 3))
  const zoomOut = () => setZoom(Math.max(zoom / 1.2, 0.3))

  const addLayer = () => {
    const newLayer = {
      id: layers.length + 1,
      name: `Layer ${layers.length + 1}`,
      visible: true,
      active: false
    }
    setLayers([...layers, newLayer])
  }

  const togglePresentation = () => {
    setIsPresenting(!isPresenting)
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/60 border-slate-700/40">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center">
              <Palette className="h-5 w-5 mr-2 text-purple-400" />
              Interactive Whiteboard
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={togglePresentation}
                className={`${isPresenting ? 'bg-red-600' : 'bg-green-600'} text-white`}
              >
                {isPresenting ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {isPresenting ? 'Stop Presenting' : 'Start Presentation'}
              </Button>
              <Button onClick={saveCanvas} className="bg-blue-600 text-white">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 p-4 bg-slate-700/40 rounded-lg">
            {/* Drawing Tools */}
            <div className="flex items-center space-x-1 border-r border-slate-600 pr-3">
              {tools.map((tool) => (
                <Button
                  key={tool.id}
                  onClick={() => setCurrentTool(tool.id)}
                  className={`p-2 ${currentTool === tool.id ? 'bg-purple-600' : 'bg-slate-600'} text-white`}
                  title={tool.label}
                >
                  <tool.icon className="h-4 w-4" />
                </Button>
              ))}
            </div>

            {/* Colors */}
            <div className="flex items-center space-x-1 border-r border-slate-600 pr-3">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setCurrentColor(color)}
                  className={`w-6 h-6 rounded border-2 ${currentColor === color ? 'border-white' : 'border-gray-400'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            {/* Brush Size */}
            <div className="flex items-center space-x-2 border-r border-slate-600 pr-3">
              <span className="text-white text-sm">Size:</span>
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-20"
              />
              <span className="text-white text-sm">{brushSize}px</span>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1 border-r border-slate-600 pr-3">
              <Button onClick={undo} className="p-2 bg-slate-600 text-white" disabled={historyIndex <= 0}>
                <Undo className="h-4 w-4" />
              </Button>
              <Button onClick={redo} className="p-2 bg-slate-600 text-white" disabled={historyIndex >= canvasHistory.length - 1}>
                <Redo className="h-4 w-4" />
              </Button>
              <Button onClick={clearCanvas} className="p-2 bg-red-600 text-white">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* View Controls */}
            <div className="flex items-center space-x-1">
              <Button onClick={zoomOut} className="p-2 bg-slate-600 text-white">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-white text-sm">{Math.round(zoom * 100)}%</span>
              <Button onClick={zoomIn} className="p-2 bg-slate-600 text-white">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button onClick={toggleGrid} className={`p-2 ${showGrid ? 'bg-purple-600' : 'bg-slate-600'} text-white`}>
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Canvas Container */}
          <div className="relative bg-white rounded-lg overflow-hidden" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="border border-gray-300 cursor-crosshair"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>

          {/* Layer Panel */}
          <div className="bg-slate-700/40 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-medium flex items-center">
                <Layers className="h-4 w-4 mr-2" />
                Layers
              </h4>
              <Button onClick={addLayer} className="bg-purple-600 text-white text-sm px-3 py-1">
                Add Layer
              </Button>
            </div>
            <div className="space-y-2">
              {layers.map((layer) => (
                <div key={layer.id} className={`flex items-center justify-between p-2 rounded ${layer.active ? 'bg-purple-600/40' : 'bg-slate-600/40'}`}>
                  <span className="text-white text-sm">{layer.name}</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={layer.visible}
                      onChange={() => {
                        setLayers(layers.map(l => l.id === layer.id ? { ...l, visible: !l.visible } : l))
                      }}
                      className="text-purple-600"
                    />
                    <Button
                      onClick={() => {
                        setLayers(layers.map(l => ({ ...l, active: l.id === layer.id })))
                      }}
                      className="text-xs px-2 py-1 bg-slate-600 text-white"
                    >
                      Select
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
