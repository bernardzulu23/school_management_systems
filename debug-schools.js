const { PrismaClient } = require('@prisma/client')

// Use the public proxy URL
process.env.DATABASE_URL =
  'postgresql://postgres:TBGUIpaIMczwHWzrupsNdkgwiFLRDTTr@ballast.proxy.rlwy.net:17921/railway'

const prisma = new PrismaClient()

async function checkSchools() {
  try {
    const schools = await prisma.school.findMany()
    console.log('--- Schools in DB ---')
    schools.forEach((s) => {
      console.log(`Name: "${s.name}"`)
      console.log(`Subdomain: "${s.subdomain}" (Length: ${s.subdomain.length})`)
      console.log(`Domain: "${s.domain}"`)
      console.log(`Active: ${s.active}`)
      console.log('-------------------')
    })
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSchools()
