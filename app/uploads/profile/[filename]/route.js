import { NextResponse } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'

export const runtime = 'nodejs'

const TYPE_BY_EXT = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export async function GET(_request, { params }) {
  const raw = String(params?.filename || '')
  const filename = path.basename(raw)
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const contentType = TYPE_BY_EXT[ext]

  if (!filename || !contentType) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const absPath = path.join(process.cwd(), 'public', 'uploads', 'profile', filename)

  try {
    const buf = await readFile(absPath)
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
