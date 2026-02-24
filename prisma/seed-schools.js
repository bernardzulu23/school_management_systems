const { PrismaClient } = require('@prisma/client')
const { hash } = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding schools...')

  // Create first school
  const school1 = await prisma.school.upsert({
    where: { subdomain: 'demo-school' },
    update: {},
    create: {
      name: 'Demo High School',
      subdomain: 'demo-school',
      email: 'admin@demo-school.edu',
      phone: '+260 xxx xxx xxx',
      address: 'Lusaka, Zambia',
      timezone: 'Africa/Lusaka',
      currency: 'ZMW',
      academicYear: '2024/2025',
      active: true,
    },
  })

  console.log(`✅ Created school: ${school1.name} (${school1.subdomain})`)

  // Create admin user for school 1
  const hashedPassword = await hash('Admin@123', 12) // Change this password!

  const admin1 = await prisma.user.upsert({
    where: {
      schoolId_email: {
        schoolId: school1.id,
        email: 'admin@demo-school.edu',
      },
    },
    update: {},
    create: {
      schoolId: school1.id,
      email: 'admin@demo-school.edu',
      password: hashedPassword,
      name: 'School Administrator',
      role: 'headteacher',
      contact_number: '+260 xxx xxx xxx',
    },
  })

  console.log(`✅ Created admin user: ${admin1.email}`)

  // Create second school (optional - for testing multi-tenancy)
  const school2 = await prisma.school.upsert({
    where: { subdomain: 'zambian-school' },
    update: {},
    create: {
      name: 'Zambian School Management System',
      subdomain: 'zambian-school',
      email: 'admin@zambian-school.edu',
      phone: '+260 xxx xxx xxx',
      address: 'Lusaka, Zambia',
      timezone: 'Africa/Lusaka',
      currency: 'ZMW',
      academicYear: '2024/2025',
      active: true,
    },
  })

  console.log(`✅ Created school: ${school2.name} (${school2.subdomain})`)

  const admin2 = await prisma.user.upsert({
    where: {
      schoolId_email: {
        schoolId: school2.id,
        email: 'admin@zambian-school.edu',
      },
    },
    update: {},
    create: {
      schoolId: school2.id,
      email: 'admin@zambian-school.edu',
      password: hashedPassword,
      name: 'School Administrator',
      role: 'headteacher',
      contact_number: '+260 xxx xxx xxx',
    },
  })

  console.log(`✅ Created admin user: ${admin2.email}`)

  // Create third school: Ndake Day Secondary School
  const school3 = await prisma.school.upsert({
    where: { subdomain: 'ndakedaysecondaryschool' },
    update: {},
    create: {
      name: 'Ndake Day Secondary School',
      subdomain: 'ndakedaysecondaryschool',
      email: 'info@ndakedaysecondaryschool.bluepeacktechnologies.com',
      phone: '0977994626',
      address: 'P.O. Box 570070 Nyimba District Eastern Province',
      timezone: 'Africa/Lusaka',
      currency: 'ZMW',
      academicYear: '2026',
      active: true,
    },
  })

  console.log(`✅ Created school: ${school3.name} (${school3.subdomain})`)

  const admin3 = await prisma.user.upsert({
    where: {
      schoolId_email: {
        schoolId: school3.id,
        email: 'admin@ndakedaysecondaryschool.edu',
      },
    },
    update: {},
    create: {
      schoolId: school3.id,
      email: 'admin@ndakedaysecondaryschool.edu',
      password: hashedPassword,
      name: 'School Administrator',
      role: 'headteacher',
      contact_number: '0977994626',
    },
  })

  console.log(`✅ Created admin user: ${admin3.email}`)

  // Create fourth school: Kalambakuwa Day Secondary School
  const school4 = await prisma.school.upsert({
    where: { subdomain: 'kalambakuwadaysecondaryschool' },
    update: {},
    create: {
      name: 'Kalambakuwa Day Secondary School',
      subdomain: 'kalambakuwadaysecondaryschool',
      email: 'info@kalambakuwadaysecondaryschool.bluepeacktechnologies.com',
      phone: '0976984221',
      address: 'P.O. Box 570003 Nyimba District Eastern Province',
      timezone: 'Africa/Lusaka',
      currency: 'ZMW',
      academicYear: '2026',
      active: true,
    },
  })

  console.log(`✅ Created school: ${school4.name} (${school4.subdomain})`)

  const admin4 = await prisma.user.upsert({
    where: {
      schoolId_email: {
        schoolId: school4.id,
        email: 'admin@kalambakuwadaysecondaryschool.edu',
      },
    },
    update: {},
    create: {
      schoolId: school4.id,
      email: 'admin@kalambakuwadaysecondaryschool.edu',
      password: hashedPassword,
      name: 'School Administrator',
      role: 'headteacher',
      contact_number: '0976984221',
    },
  })

  console.log(`✅ Created admin user: ${admin4.email}`)

  console.log('\n✨ Seeding completed!')
  console.log('\n📋 Schools created:')
  console.log(`1. ${school1.name}`)
  console.log(`   URL: https://${school1.subdomain}.bluepeacktechnologies.com`)
  console.log(`   Admin: ${admin1.email} / Admin@123`)
  console.log(`\n2. ${school2.name}`)
  console.log(`   URL: https://${school2.subdomain}.bluepeacktechnologies.com`)
  console.log(`   Admin: ${admin2.email} / Admin@123`)
  console.log(`\n3. ${school3.name}`)
  console.log(`   URL: https://${school3.subdomain}.bluepeacktechnologies.com`)
  console.log(`   Admin: ${admin3.email} / Admin@123`)
  console.log(`\n4. ${school4.name}`)
  console.log(`   URL: https://${school4.subdomain}.bluepeacktechnologies.com`)
  console.log(`   Admin: ${admin4.email} / Admin@123`)
  console.log('\n⚠️  Remember to change the default passwords!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding schools:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
