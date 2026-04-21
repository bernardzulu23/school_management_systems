const fs = require('fs')
const path = require('path')

const isProd = process.env.NODE_ENV === 'production'

const standaloneServerPath = path.join(process.cwd(), '.next', 'standalone', 'server.js')
const shouldUseStandalone = isProd && fs.existsSync(standaloneServerPath)

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

if (shouldUseStandalone) {
  if (!process.env.HOSTNAME) process.env.HOSTNAME = '0.0.0.0'
  if (!process.env.PORT) process.env.PORT = '3000'
  require(standaloneServerPath)
} else {
  const dev = !isProd
  const hostname = '0.0.0.0'
  const port = parseInt(process.env.PORT || '3000', 10)

  const app = next({ dev, hostname, port })
  const handle = app.getRequestHandler()

  app.prepare().then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true)
        await handle(req, res, parsedUrl)
      } catch (err) {
        console.error('Error occurred handling', req.url, err)
        res.statusCode = 500
        res.end('internal server error')
      }
    })
      .once('error', (err) => {
        console.error(err)
        process.exit(1)
      })
      .listen(port, hostname, () => {
        console.log(`> Ready on http://${hostname}:${port}`)
      })
  })
}
