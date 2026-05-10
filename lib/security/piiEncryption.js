import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

/**
 * PIIEncryption provides symmetric encryption for sensitive fields.
 * The key is derived from the environment variable ENCRYPTION_KEY.
 */
export class PIIEncryption {
  constructor() {
    const key = process.env.ENCRYPTION_KEY
    if (!key) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('ENCRYPTION_KEY must be set in production environment')
      }
      // Dev fallback
      this.key = crypto.scryptSync('dev-secret-key', 'salt', 32)
    } else {
      this.key = crypto.scryptSync(key, 'salt', 32)
    }
  }

  /**
   * Encrypts a string value
   * @param {string} text
   * @returns {string} Format: iv:authTag:encryptedData (base64)
   */
  encrypt(text) {
    if (!text) return text

    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv)

    let encrypted = cipher.update(text, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const authTag = cipher.getAuthTag().toString('base64')

    return `${iv.toString('base64')}:${authTag}:${encrypted}`
  }

  /**
   * Decrypts an encrypted string
   * @param {string} encryptedText
   * @returns {string|null}
   */
  decrypt(encryptedText) {
    if (!encryptedText) return encryptedText
    if (!encryptedText.includes(':')) return encryptedText // Not encrypted

    try {
      const [ivBase64, authTagBase64, dataBase64] = encryptedText.split(':')
      const iv = Buffer.from(ivBase64, 'base64')
      const authTag = Buffer.from(authTagBase64, 'base64')

      const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv)
      decipher.setAuthTag(authTag)

      let decrypted = decipher.update(dataBase64, 'base64', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      console.error('[Encryption Error]: Decryption failed', error)
      return null
    }
  }
}

export const piiEncryption = new PIIEncryption()
