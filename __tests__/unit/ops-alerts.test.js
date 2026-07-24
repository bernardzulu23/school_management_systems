import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('ops alert channels', () => {
  const originalFetch = global.fetch
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    global.fetch = fetchMock
    vi.resetModules()
  })

  afterEach(() => {
    global.fetch = originalFetch
    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.TELEGRAM_CHAT_ID
    delete process.env.CALLMEBOT_PHONE
    delete process.env.CALLMEBOT_APIKEY
  })

  it('sendTelegramAlert returns missing_config without env', async () => {
    const { sendTelegramAlert } = await import('@/lib/alerts/telegram')
    const result = await sendTelegramAlert('hello')
    expect(result).toEqual({ success: false, reason: 'missing_config' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sendWhatsAppAlert returns missing_config without env', async () => {
    const { sendWhatsAppAlert } = await import('@/lib/alerts/whatsapp')
    const result = await sendWhatsAppAlert('hello')
    expect(result).toEqual({ success: false, reason: 'missing_config' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sendTelegramAlert posts to Bot API when configured', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'tok'
    process.env.TELEGRAM_CHAT_ID = '99'
    fetchMock.mockResolvedValue({ ok: true })
    const { sendTelegramAlert } = await import('@/lib/alerts/telegram')
    const result = await sendTelegramAlert('ping')
    expect(result).toEqual({ success: true })
    expect(String(fetchMock.mock.calls[0][0])).toContain('api.telegram.org/bottok/sendMessage')
  })

  it('sendWhatsAppAlert GETs CallMeBot when configured', async () => {
    process.env.CALLMEBOT_PHONE = '+260971234567'
    process.env.CALLMEBOT_APIKEY = 'key1'
    fetchMock.mockResolvedValue({ ok: true })
    const { sendWhatsAppAlert } = await import('@/lib/alerts/whatsapp')
    const result = await sendWhatsAppAlert('ping')
    expect(result).toEqual({ success: true })
    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('api.callmebot.com/whatsapp.php')
    expect(url).toContain('phone=260971234567')
    expect(url).toContain('apikey=key1')
  })
})
