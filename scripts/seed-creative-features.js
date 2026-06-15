const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Creative Features...')

  const features = [
    {
      featureId: 'whiteboard',
      name: 'Interactive Whiteboard',
      iconName: 'Palette',
      description: 'Digital drawing, annotation, and collaboration tools',
      category: 'creative',
      roles: ['teacher', 'student'],
      difficulty: 'Beginner',
      estimatedTime: '5-30 minutes',
    },
    {
      featureId: 'virtual-trips',
      name: 'Virtual Field Trips',
      iconName: 'Globe',
      description: 'Explore Zambian landmarks and global destinations virtually',
      category: 'creative',
      roles: ['teacher', 'student', 'hod'],
      difficulty: 'Beginner',
      estimatedTime: '20-45 minutes',
    },
    {
      featureId: 'work-showcase',
      name: 'Student Work Showcase',
      iconName: 'Trophy',
      description: 'Display and celebrate student achievements and creativity',
      category: 'creative',
      roles: ['teacher', 'student', 'hod', 'headteacher'],
      difficulty: 'Beginner',
      estimatedTime: '10-20 minutes',
    },
    {
      featureId: 'project-templates',
      name: 'Creative Project Templates',
      iconName: 'BookOpen',
      description: 'Pre-built templates for various creative projects',
      category: 'creative',
      roles: ['teacher', 'student'],
      difficulty: 'Beginner',
      estimatedTime: '15-45 minutes',
    },
    {
      featureId: 'storytelling',
      name: 'Digital Storytelling Platform',
      iconName: 'Lightbulb',
      description: 'Create and share digital stories with multimedia elements',
      category: 'creative',
      roles: ['teacher', 'student'],
      difficulty: 'Intermediate',
      estimatedTime: '30-60 minutes',
    },
    {
      featureId: 'music_composer',
      name: 'Art & Music Integration',
      iconName: 'Music',
      description: 'Creative arts tools and music education features',
      category: 'creative',
      roles: ['teacher', 'student'],
      difficulty: 'Intermediate',
      estimatedTime: '20-40 minutes',
    },
    {
      featureId: 'math-problems',
      name: 'Mathematics Problem Bank',
      iconName: 'Calculator',
      description: 'Extensive collection of math problems with step-by-step solutions',
      category: 'stem',
      roles: ['teacher', 'student'],
      difficulty: 'Beginner',
      estimatedTime: '15-45 minutes',
    },
    {
      featureId: 'tech-integration',
      name: 'Technology Integration Tools',
      iconName: 'Code',
      description: 'Digital tools and coding education features',
      category: 'stem',
      roles: ['teacher', 'student'],
      difficulty: 'Intermediate',
      estimatedTime: '30-90 minutes',
    },
    {
      featureId: 'data-collection',
      name: 'Scientific Data Collection',
      iconName: 'BarChart3',
      description: 'Tools for gathering and analyzing scientific data',
      category: 'stem',
      roles: ['teacher', 'student'],
      difficulty: 'Intermediate',
      estimatedTime: '20-60 minutes',
    },
    {
      featureId: 'scientific-method',
      name: 'Scientific Method Tracker',
      iconName: 'Microscope',
      description: 'Step-by-step guidance through the scientific process',
      category: 'stem',
      roles: ['teacher', 'student'],
      difficulty: 'Beginner',
      estimatedTime: '30-60 minutes',
    },
  ]

  for (const feature of features) {
    await prisma.creativeFeature.upsert({
      where: { featureId: feature.featureId },
      update: feature,
      create: feature,
    })
  }

  console.log('Creative Features seeded successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
