import { useState, useCallback } from 'react'
import { logger } from '@/lib/utils/logger'
import { ERROR_MESSAGES, toUserFacingMessage } from '@/lib/utils/errorMessages'
import toast from 'react-hot-toast'

/**
 * A custom hook to handle asynchronous operations with loading and error states.
 */
export function useAsync() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const execute = useCallback(
    async (asyncFunction, successMessage = null, retryOptions = { maxRetries: 0, delay: 1000 }) => {
      let attempt = 0
      const maxRetries = retryOptions.maxRetries || 0

      const run = async () => {
        setIsLoading(true)
        setError(null)
        try {
          const response = await asyncFunction()
          if (successMessage) {
            toast.success(successMessage)
          }
          return response
        } catch (err) {
          const isNetworkError = err.code === 'NETWORK_ERROR' || !navigator.onLine

          if (isNetworkError && attempt < maxRetries) {
            attempt++
            const delay = retryOptions.delay * Math.pow(2, attempt - 1)
            toast.loading(
              `Network issue. Retrying in ${delay / 1000}s... (Attempt ${attempt}/${maxRetries})`,
              { id: 'retry-toast' }
            )
            await new Promise((resolve) => setTimeout(resolve, delay))
            toast.dismiss('retry-toast')
            return run()
          }

          const message = toUserFacingMessage(
            err.response?.data?.error || err.message,
            ERROR_MESSAGES.SERVER_ERROR
          )

          if (isNetworkError) {
            toast.error(
              (t) => (
                <span>
                  Unable to connect.
                  <button
                    onClick={() => {
                      toast.dismiss(t.id)
                      execute(asyncFunction, successMessage, retryOptions)
                    }}
                    className="ml-2 bg-white px-2 py-1 rounded text-xs font-bold text-red-600 border border-red-600 hover:bg-red-50"
                  >
                    Try Again
                  </button>
                </span>
              ),
              {
                id: 'error-toast',
                duration: 5000,
              }
            )
          } else if (err.status === 401) {
            toast.error(ERROR_MESSAGES.SESSION_EXPIRED)
          } else {
            toast.error(message)
          }

          setError(message)
          logger.error('Async operation failed', err)
          throw err
        } finally {
          if (attempt === 0 || attempt >= maxRetries) {
            setIsLoading(false)
          }
        }
      }

      return run()
    },
    []
  )

  return { execute, isLoading, error, setError }
}
