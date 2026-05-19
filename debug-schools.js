require('dotenv').config()

if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL (Neon pooled or local Postgres) in .env')
  process.exit(1)
}

const { PrismaClient } = require('@prisma/client')
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

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
