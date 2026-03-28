const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function inspect() {
  console.log('🔍 Starting Database Inspection...\n')

  try {
    // 1. List all tables
    const tables = await prisma.$queryRaw`
      SELECT tablename FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public';
    `
    console.log('📂 TABLES FOUND:')
    console.table(tables)

    // 2. Check the 'User' table structure
    console.log('\n📐 USER TABLE STRUCTURE:')
    const userColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'User';
    `
    console.table(userColumns)

    // 3. Check 'TeachingAssignment'
    console.log('\n🔗 TEACHING ASSIGNMENT JUNCTION:')
    const assignmentColumns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'TeachingAssignment';
    `
    console.table(assignmentColumns)
  } catch (error) {
    console.error('❌ Inspection failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

inspect()
