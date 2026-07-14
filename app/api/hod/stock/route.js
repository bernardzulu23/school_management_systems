export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { CreateHodStockItemSchema, CreateHodStockMovementSchema } from '@/lib/schemas'
import { resolveHodScope, hodDepartmentWhere } from '@/lib/hod/resolveHodScope'

function stockStatus(item) {
  const current = item.currentStock
  const min = item.minimumStock
  const max = item.maximumStock
  if (current <= 0) return 'out_of_stock'
  if (current <= min * 0.5) return 'critical'
  if (current <= min) return 'low_stock'
  if (max > 0 && current > max) return 'overstocked'
  return 'in_stock'
}

function mapItem(item) {
  const status = item.status && item.status !== 'in_stock' ? item.status : stockStatus(item)
  const unitPrice = Number(item.unitPrice) || 0
  const currentStock = Number(item.currentStock) || 0
  return {
    id: item.id,
    itemName: item.itemName,
    category: item.category,
    currentStock,
    minimumStock: item.minimumStock,
    maximumStock: item.maximumStock,
    unitPrice,
    totalValue: currentStock * unitPrice,
    supplier: item.supplier || '',
    location: item.location || '',
    status,
  }
}

export const GET = withErrorHandler(async function GET(request) {
  const scope = await resolveHodScope(request)
  if (!scope.ok) return scope.response

  const { db, departmentId } = scope
  const items = await db.hodStockItem.findMany({
    where: hodDepartmentWhere(departmentId),
    orderBy: { itemName: 'asc' },
  })

  const movements = await db.hodStockMovement.findMany({
    where: {
      item: hodDepartmentWhere(departmentId),
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: { item: { select: { itemName: true, departmentId: true } } },
  })

  return NextResponse.json({
    success: true,
    data: {
      items: items.map(mapItem),
      movements: movements.map((m) => ({
        id: m.id,
        itemName: m.item?.itemName || '',
        movementType: m.movementType,
        quantity: m.quantity,
        note: m.note,
        createdAt: m.createdAt,
      })),
    },
  })
})

export const POST = withErrorHandler(async function POST(request) {
  const scope = await resolveHodScope(request)
  if (!scope.ok) return scope.response

  const json = await request.json().catch(() => null)
  const kind = json?.kind

  if (kind === 'movement') {
    const parsed = CreateHodStockMovementSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 400 }
      )
    }
    const body = parsed.data

    const { db, departmentId } = scope
    const item = await db.hodStockItem.findFirst({
      where: { id: body.itemId, ...hodDepartmentWhere(departmentId) },
    })
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const delta = body.movementType === 'in' ? body.quantity : -body.quantity
    const nextStock = Math.max(0, item.currentStock + delta)
    const status = stockStatus({ ...item, currentStock: nextStock })

    await db.hodStockMovement.create({
      data: {
        itemId: body.itemId,
        movementType: body.movementType,
        quantity: body.quantity,
        note: body.note,
      },
    })
    await db.hodStockItem.update({
      where: { id: body.itemId },
      data: { currentStock: nextStock, status },
    })

    const updated = await db.hodStockItem.findUnique({ where: { id: body.itemId } })
    return NextResponse.json({ success: true, data: mapItem(updated) }, { status: 201 })
  }

  const parsed = CreateHodStockItemSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 }
    )
  }
  const body = parsed.data

  const { db, departmentId } = scope
  const currentStock = body.currentStock ?? 0
  const created = await db.hodStockItem.create({
    data: {
      departmentId,
      itemName: body.itemName,
      category: body.category || 'General',
      currentStock,
      minimumStock: body.minimumStock ?? 0,
      maximumStock: body.maximumStock ?? 100,
      unitPrice: body.unitPrice ?? 0,
      supplier: body.supplier,
      location: body.location,
      status: stockStatus({
        currentStock,
        minimumStock: body.minimumStock ?? 0,
        maximumStock: body.maximumStock ?? 100,
      }),
    },
  })

  return NextResponse.json({ success: true, data: mapItem(created) }, { status: 201 })
})
