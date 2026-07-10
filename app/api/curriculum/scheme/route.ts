import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { handleSchemeGet, handleSchemePost } from '@/lib/curriculum/schemeRequestHandler'

export const dynamic = 'force-dynamic'

export const POST = withErrorHandler(async function POST(request: Request) {
  return handleSchemePost(request)
})

export const GET = withErrorHandler(async function GET(request: Request) {
  return handleSchemeGet(request)
})
