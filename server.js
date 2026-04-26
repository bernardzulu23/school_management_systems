// server.js
const path = require('path')

// Set static file directories for the standalone server
process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify({
  distDir: '.next',
})

// Delegate entirely to the standalone server Next.js generated
require(path.join(__dirname, '.next', 'standalone', 'server.js'))