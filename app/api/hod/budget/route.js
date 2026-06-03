export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { validateBody } from '@/lib/middleware/validate-request'
import { CreateHodBudgetSchema } from '@/lib/schemas'
import { resolveHodScope, hodDepartmentWhere } from '@/lib/hod/resolveHodScope'

const SPENT_STATUSES = new Set(['approved', 'completed'])

function monthKey(d) {
  const dt = new Date(d)
  return dt.toLocaleString('en-US', { month: 'short' })
}

export const GET = withErrorHandler(async function GET(request) {
  const scope = await resolveHodScope(request)
  if (!scope.ok) return scope.response

  const { db, departmentId } = scope
  const deptWhere = hodDepartmentWhere(departmentId)

  const [categories, transactions] = await Promise.all([
    db.hodBudgetCategory.findMany({
      where: deptWhere,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    db.hodBudgetTransaction.findMany({
      where: deptWhere,
      include: { category: { select: { id: true, name: true, color: true } } },
      orderBy: { transactionDate: 'desc' },
      take: 100,
    }),
  ])

  const spentByCategory = new Map()
  let totalSpent = 0
  let pendingRequests = 0
  let approvedRequests = 0

  for (const tx of transactions) {
    if (tx.status === 'pending') pendingRequests += 1
    if (tx.status === 'approved') approvedRequests += 1
    if (!SPENT_STATUSES.has(tx.status)) continue
    const amt = Number(tx.amount) || 0
    totalSpent += amt
    const cid = tx.categoryId || '_none'
    spentByCategory.set(cid, (spentByCategory.get(cid) || 0) + amt)
  }

  const palette = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']
  const budgetCategories = categories.map((c, i) => {
    const allocated = Number(c.allocated) || 0
    const spent = spentByCategory.get(c.id) || 0
    const remaining = Math.max(allocated - spent, 0)
    return {
      id: c.id,
      name: c.name,
      allocated,
      spent,
      remaining,
      color: c.color || palette[i % palette.length],
    }
  })

  const totalAllocated = budgetCategories.reduce((s, c) => s + c.allocated, 0)
  const monthlyMap = new Map()
  for (const tx of transactions) {
    if (!SPENT_STATUSES.has(tx.status)) continue
    const key = monthKey(tx.transactionDate)
    monthlyMap.set(key, (monthlyMap.get(key) || 0) + (Number(tx.amount) || 0))
  }
  const monthlySpending = Array.from(monthlyMap.entries()).map(([month, amount]) => ({
    month,
    amount,
  }))

  const recentTransactions = transactions.slice(0, 20).map((tx) => ({
    id: tx.id,
    description: tx.description,
    category: tx.category?.name || 'Uncategorized',
    amount: Number(tx.amount) || 0,
    date: tx.transactionDate,
    requestedBy: tx.requestedBy || '',
    status: tx.status,
  }))

  return NextResponse.json({
    success: true,
    data: {
      overview: {
        totalAllocated,
        totalSpent,
        remaining: Math.max(totalAllocated - totalSpent, 0),
        pendingRequests,
        approvedRequests,
      },
      budgetCategories,
      monthlySpending,
      recentTransactions,
    },
  })
})

export const POST = withErrorHandler(async function POST(request) {
  const scope = await resolveHodScope(request)
  if (!scope.ok) return scope.response

  const { data: body, error: validationError } = await validateBody(request, CreateHodBudgetSchema)
  if (validationError) return validationError

  const { db, departmentId, userName } = scope
  const deptWhere = hodDepartmentWhere(departmentId)

  if (body.kind === 'category') {
    const category = await db.hodBudgetCategory.create({
      data: {
        departmentId,
        name: body.name,
        allocated: body.allocated ?? 0,
        color: body.color,
        sortOrder: body.sortOrder ?? 0,
      },
    })
    return NextResponse.json({ success: true, data: category }, { status: 201 })
  }

  if (body.categoryId) {
    const cat = await db.hodBudgetCategory.findFirst({
      where: { id: body.categoryId, ...deptWhere },
    })
    if (!cat) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
  }

  const transaction = await db.hodBudgetTransaction.create({
    data: {
      departmentId,
      categoryId: body.categoryId || null,
      description: body.description,
      amount: body.amount,
      status: body.status || 'pending',
      requestedBy: body.requestedBy || userName,
      transactionDate: body.transactionDate ? new Date(body.transactionDate) : new Date(),
    },
  })

  return NextResponse.json({ success: true, data: transaction }, { status: 201 })
})
