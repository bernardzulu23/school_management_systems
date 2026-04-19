import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type Day = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'

const DAYS: Array<{ day: Day; label: string }> = [
  { day: 'monday', label: 'Monday' },
  { day: 'tuesday', label: 'Tuesday' },
  { day: 'wednesday', label: 'Wednesday' },
  { day: 'thursday', label: 'Thursday' },
  { day: 'friday', label: 'Friday' },
]

type SlotDef = {
  sortPeriod: number
  label: string
  startTime: string
  endTime: string
  isBreak: boolean
  breakName?: string
  breakDuration?: number
}

const SLOT_DEFS: SlotDef[] = [
  { sortPeriod: 1, label: 'Period 1', startTime: '07:00', endTime: '07:40', isBreak: false },
  { sortPeriod: 2, label: 'Period 2', startTime: '07:45', endTime: '08:25', isBreak: false },
  { sortPeriod: 3, label: 'Period 3', startTime: '08:30', endTime: '09:10', isBreak: false },
  { sortPeriod: 4, label: 'Period 4', startTime: '09:15', endTime: '09:55', isBreak: false },
  {
    sortPeriod: 5,
    label: 'Morning Break',
    startTime: '09:55',
    endTime: '10:15',
    isBreak: true,
    breakName: 'Morning Break',
    breakDuration: 20,
  },
  { sortPeriod: 6, label: 'Period 5', startTime: '10:15', endTime: '10:55', isBreak: false },
  { sortPeriod: 7, label: 'Period 6', startTime: '11:00', endTime: '11:40', isBreak: false },
  { sortPeriod: 8, label: 'Period 7', startTime: '11:45', endTime: '12:25', isBreak: false },
  { sortPeriod: 9, label: 'Period 8', startTime: '12:30', endTime: '13:10', isBreak: false },
  {
    sortPeriod: 10,
    label: 'Lunch Break',
    startTime: '13:10',
    endTime: '14:00',
    isBreak: true,
    breakName: 'Lunch Break',
    breakDuration: 50,
  },
  { sortPeriod: 11, label: 'Period 9', startTime: '14:00', endTime: '14:40', isBreak: false },
  { sortPeriod: 12, label: 'Period 10', startTime: '14:45', endTime: '15:25', isBreak: false },
  { sortPeriod: 13, label: 'Period 11', startTime: '15:30', endTime: '16:10', isBreak: false },
  { sortPeriod: 14, label: 'Period 12', startTime: '16:15', endTime: '16:55', isBreak: false },
]

async function main() {
  const schools = await prisma.school.findMany({ select: { id: true, name: true } })
  if (!schools.length) {
    console.log('No schools found; nothing to seed.')
    return
  }

  let total = 0
  for (const school of schools) {
    let createdOrUpdated = 0
    for (const day of DAYS) {
      for (const def of SLOT_DEFS) {
        const existing = await prisma.timeSlot.findFirst({
          where: { schoolId: school.id, dayOfWeek: day.day, period: def.sortPeriod },
          select: { id: true },
        })

        if (existing) {
          await prisma.timeSlot.update({
            where: { id: existing.id },
            data: {
              startTime: def.startTime,
              endTime: def.endTime,
              isBreak: def.isBreak,
              label: def.label,
              breakName: def.breakName ?? null,
              breakDuration: def.breakDuration ?? null,
            },
          })
        } else {
          await prisma.timeSlot.create({
            data: {
              schoolId: school.id,
              dayOfWeek: day.day,
              period: def.sortPeriod,
              startTime: def.startTime,
              endTime: def.endTime,
              isBreak: def.isBreak,
              label: def.label,
              breakName: def.breakName ?? null,
              breakDuration: def.breakDuration ?? null,
            },
          })
        }
        createdOrUpdated += 1
      }
    }
    total += createdOrUpdated
    console.log(`Seeded ${createdOrUpdated} time slots for ${school.name} (${school.id})`)
  }

  console.log(`Done. Total upserts: ${total}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
