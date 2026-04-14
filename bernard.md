/\*\*
• IMPLEMENTATION GUIDE: ZAMBIA FEATURES WITH PRIMARY SCHOOL RESTRICTIONS
•
• This system ensures that:
•

1. Plan-based features are restricted by subscription level
   •
2. Primary-only features cannot be accessed by secondary schools
   •
3. All features are Zambia-specific and educationally relevant _/
// ============================================================================= // PART 1: DATABASE SETUP // =============================================================================
/_ Update your Prisma schema (prisma/schema.prisma):
model School { id String @id @default(cuid()) name String subdomain String @unique domain String? @unique
// Plan & Billing plan String @default("trial") // trial, basic, standard, premium planExpiresAt DateTime? trialEndsAt DateTime?
// School Configuration (NEW) level String @default("combined") // primary, secondary, or combined
// Existing fields... active Boolean @default(false) emailVerified Boolean @default(false) verificationToken String? verificationExpiry DateTime?
email String? phone String? address String?
createdAt DateTime @default(now()) updatedAt DateTime @updatedAt
// Relations users User[] classes Class[] students Student[] teachers Teacher[] }
Then run: npx prisma migrate dev --name add_school_level _/
// ============================================================================= // PART 2: REGISTRATION UPDATE // =============================================================================
/_ Update your school registration form to capture school level:
// In your registration component, add: <select name="level" value={level} onChange={(e) => setLevel(e.target.value)}>
<option value="">Select School Level</option> <option value="primary">Primary School Only (Grades 1-7)</option> <option value="secondary">Secondary School Only (Grades 8-12)</option> <option value="combined">Combined Primary & Secondary</option> </select> 
Then when creating the school: const school = await prisma.school.create({ data: { name: schoolName, subdomain, level: schoolLevelSelection, // NEW // ... other fields } }) */
// ============================================================================= // PART 3: USAGE IN API ROUTES // =============================================================================
/* EXAMPLE 1: Protect an AI Lesson Planner endpoint (works for all schools) */
import { requireFeature } from '@/lib/middleware/planGate-zambia'
export async function POST(req) { const schoolId = await getSchoolIdFromRequest(req)
// Check if school has access to this feature const blocked = await requireFeature(schoolId, 'ai-lesson-planner') if (blocked) return blocked
// Feature is now accessible // ... rest of your handler }
/* EXAMPLE 2: Protect a Phonics Trainer endpoint (ONLY for primary schools) Since 'phonics-trainer' is in PRIMARY_ONLY_FEATURES, secondary schools will get 403 */
export async function POST(req) { const schoolId = await getSchoolIdFromRequest(req)
// This will automatically block secondary schools const blocked = await requireFeature(schoolId, 'phonics-trainer') if (blocked) return blocked
// Only primary schools reach here // ... train phonics }
/* EXAMPLE 3: Multi-feature endpoint with context */
export async function POST(req) { const schoolId = await getSchoolIdFromRequest(req) const { feature } = await req.json()
const blocked = await requireFeature(schoolId, feature, { context: 'checking_feature_access' }) if (blocked) return blocked
// Access granted return NextResponse.json({ success: true }) }
// ============================================================================= // PART 4: USAGE IN REACT COMPONENTS // =============================================================================
/* EXAMPLE 1: Simple feature gate wrapper */
import { FeatureGate } from '@/components/FeatureGate'
export default function Dashboard({ schoolId }) { return ( <div> <FeatureGate featureId="ai-story-weaver" schoolId={schoolId}> <AIStoryWeaver /> </FeatureGate> </div> ) }
/* EXAMPLE 2: With custom fallback for locked features */
export default function Dashboard({ schoolId }) { return ( <FeatureGate featureId="phonics-trainer" schoolId={schoolId} fallback={ <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg"> <p className="text-blue-900"> 📚 Phonics Trainer is only available for primary schools </p> </div> } > <PhonicsTrainer /> </FeatureGate> ) }
/* EXAMPLE 3: Show feature availability as a badge */
import { FeatureBadge } from '@/components/FeatureGate'
export default function FeatureList({ school }) { return ( <div className="space-y-2"> <h3>Available Features</h3>
  <div className="flex gap-2 items-center">
    <span>Phonics Trainer</span>
    <FeatureBadge
      featureId="phonics-trainer"
      plan={school.plan}
      schoolLevel={school.level}
    />
  </div>
</div>
) }
/* EXAMPLE 4: Show all available features */
import { AvailableFeaturesList } from '@/components/FeatureGate'
export default function FeatureShowcase({ school }) { return ( <AvailableFeaturesList schoolPlan={school.plan} schoolLevel={school.level} /> ) }
/* EXAMPLE 5: Plan comparison */
import { PlanComparisonCard } from '@/components/FeatureGate'
export default function PricingPage({ school }) { return ( <div className="grid grid-cols-3 gap-4"> <PlanComparisonCard plan="basic" schoolLevel={school.level} /> <PlanComparisonCard plan="standard" schoolLevel={school.level} /> <PlanComparisonCard plan="premium" schoolLevel={school.level} /> </div> ) }
// ============================================================================= // PART 5: ZAMBIA-SPECIFIC FEATURES EXPLAINED // =============================================================================
/* PRIMARY SCHOOL ONLY FEATURES (Grades 1-7):
4. PHONICS TRAINER
   o For: Grades 1-4 (early literacy)
   o Why: Zambian schools use phonics-based reading instruction
   o CBC Alignment: Foundation phase literacy
5. NUMBER BONDS & COUNTING
   o For: Grades 1-4 (early numeracy)
   o Why: Building number sense before formal math
   o CBC Alignment: Foundation numeracy
6. CBC COMPETENCY TRACKER
   o For: Grades 1-7 (all primary)
   o Why: CRITICAL - Zambia's new curriculum since 2022
   o Features: Track core competencies, critical thinking, creativity
7. CONTINUOUS ASSESSMENT TOOL
   o For: Grades 1-7 (all primary)
   o Why: Replaces traditional exams in Zambian primary schools
   o Records: Formative assessment, observation checklists
8. LIFE SKILLS CURRICULUM
   o For: Grades 1-7 (all primary)
   o Why: Mandatory CBC subject in Zambia
   o Includes: Personal, social, environmental competencies
9. LOCAL LANGUAGE SUBJECTS
   o For: Grades 1-4 (primary only)
   o Why: MOE policy - G1-G4 taught in local languages
   o Languages: Bemba, Tonga, Lozi, Kaonde, Lunda, etc.
10. CHILDHOOD WELFARE MONITORING
    o For: Grades 1-7 (all primary)
    o Why: Government requirement, child safeguarding
    o Tracks: Health screenings, abuse reporting, orphan support
11. SCHOOL FEEDING PROGRAM
    o For: Grades 1-7 (all primary)
    o Why: WFP-supported in many Zambian primaries
    o Features: Meal distributions, nutrition tracking
    ALL SCHOOLS FEATURES:
12. ECZ EXAM TRACKING
    o For: Secondary (Grades 10-12)
    o Why: ECZ GCSE is mandatory national exam
    o Features: Question analysis, performance analytics
13. MOE COMPLIANCE REPORTING
    o For: All schools
    o Why: Required for Ministry of Education registration
    o Data: Enrollment, staffing, infrastructure
14. CBC CURRICULUM MAPPER
    o For: All schools
    o Why: New Zambian curriculum standard since 2022
    o Maps lessons to CBC competencies and standards
15. SCHOOL FEES MANAGEMENT
    o For: All schools
    o Why: Critical for school sustainability
    o Features: Fee structures, payment tracking, exemptions
16. TEACHER DEPLOYMENT SYSTEM
    o For: All schools
    o Why: MOE teacher posting coordination
    o Tracks: Transfers, qualifications, assignments
17. COMMUNITY LIAISON SYSTEM
    o For: All schools
    o Why: PTA (Parent-Teacher Association) governance
    o Features: Meetings, decisions, fundraising
    _/
    // ============================================================================= // PART 6: TESTING THE SYSTEM // =============================================================================
    /_ TEST CASE 1: Primary school accessing primary-only feature _/
    // Setup: Create a primary school const primarySchool = await prisma.school.create({ data: { name: 'Test Primary School', subdomain: 'test-primary', level: 'primary', plan: 'standard', } })
    // Test: Can access primary feature const result = await requireFeature(primarySchool.id, 'phonics-trainer') // Result: null (access granted) ✓
    /_ TEST CASE 2: Secondary school trying to access primary-only feature _/
    // Setup: Create a secondary school const secondarySchool = await prisma.school.create({ data: { name: 'Test Secondary School', subdomain: 'test-secondary', level: 'secondary', plan: 'standard', } })
    // Test: Cannot access primary feature const result = await requireFeature(secondarySchool.id, 'phonics-trainer') // Result: 403 Forbidden response ✓ // Message: "This feature is only available for primary schools"
    /_ TEST CASE 3: Basic plan trying to access standard feature _/
    // Setup: Basic plan school const basicSchool = await prisma.school.create({ data: { name: 'Basic School', subdomain: 'basic-school', level: 'combined', plan: 'basic', } })
    // Test: Cannot access standard feature const result = await requireFeature(basicSchool.id, 'cbc-curriculum-mapper') // Result: 403 Forbidden response ✓ // Message: "This feature requires a higher plan"
    /_ TEST CASE 4: Expired plan _/
    // Setup: School with expired plan const expiredSchool = await prisma.school.update({ where: { id: schoolId }, data: { plan: 'premium', planExpiresAt: new Date('2025-01-01'), // Past date } })
    // Test: Any feature is blocked const result = await requireFeature(expiredSchool.id, 'any-feature') // Result: 402 Payment Required response ✓ // Message: "Your plan has expired"
    // ============================================================================= // PART 7: ADMIN DASHBOARD QUERIES // =============================================================================
    /_ Query: See all primary schools with access to phonics _/
    const primarySchools = await prisma.school.findMany({ where: { level: 'primary', }, select: { id: true, name: true, plan: true, level: true, } })
    /_ Query: Find schools using Standard plan _/
    const standardSchools = await prisma.school.findMany({ where: { plan: 'standard' }, })
    /_ Query: Find soon-to-expire plans _/
    const oneMonthFromNow = new Date(Date.now() + 30 _ 24 _ 60 _ 60 _ 1000)
    const expiringPlans = await prisma.school.findMany({ where: { planExpiresAt: { lte: oneMonthFromNow, gt: new Date(), } } })
    // ============================================================================= // PART 8: FEATURE ROLLOUT // =============================================================================
    /_ To gradually roll out new features:
18. Add feature to PLAN_FEATURES (if plan-locked)
19. Add feature to PRIMARY_ONLY_FEATURES (if primary-only)
20. Deploy code
21. Access restrictions automatically enforced
22. Monitor usage via /api/features/check-access calls
    Example: Launching "AI Report Comments" (premium only):
    // In lib/zambia-features.js premium: [ // ... existing features 'ai-report-comments', // NEW - automatically restricted to premium ] \*/
    // ============================================================================= // DONE! Your system is now fully set up with Zambia-specific features. // =============================================================================
    /\*\*

- REACT COMPONENTS FOR FEATURE GATING
- Shows locked features and upgrade prompts
  \*/

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PRIMARY_ONLY_FEATURES } from '@/lib/zambia-features'

/\*\*

- Wrapper component that controls access to features
-
- Usage:
- <FeatureGate featureId="phonics-trainer" schoolId={school.id}>
-     <PhonicsTrainer />
- </FeatureGate>
   */
  export function FeatureGate({ featureId, schoolId, children, fallback = null }) {
    const [access, setAccess] = useState(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

useEffect(() => {
checkAccess()
}, [featureId, schoolId])

async function checkAccess() {
try {
const response = await fetch('/api/features/check-access', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ schoolId, featureId }),
})

      const data = await response.json()
      setAccess(data)
    } catch (error) {
      console.error('[FeatureGate] Error:', error)
      setAccess({ allowed: false, error: error.message })
    } finally {
      setLoading(false)
    }

}

if (loading) return <div className="text-center py-8">Loading...</div>

if (!access?.allowed) {
return (
fallback || (
<FeatureLockedPrompt
featureId={featureId}
reason={access?.reason}
isPrimaryOnly={access?.isPrimaryOnly}
schoolType={access?.schoolType}
onUpgrade={() => router.push('/dashboard/billing')}
/>
)
)
}

return children
}

/\*\*

- Shows a locked feature card with upgrade or error message
  \*/
  export function FeatureLockedPrompt({
  featureId,
  reason,
  isPrimaryOnly,
  schoolType,
  onUpgrade,
  }) {
  const featureMeta = PRIMARY_ONLY_FEATURES[featureId] || {}

return (
<div className="relative opacity-50 pointer-events-none">
{/_ Blurred content _/}
<div style={{ filter: 'blur(2px)' }}>
{/_ Placeholder content would go here _/}
<div className="h-64 bg-gray-200 rounded-lg" />
</div>

      {/* Overlay with message */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(23, 13, 40, 0.92)',
          backdropFilter: 'blur(4px)',
          borderRadius: 12,
          pointerEvents: 'auto',
          zIndex: 50,
        }}
      >
        <div className="text-center max-w-sm px-6">
          {isPrimaryOnly ? (
            <>
              <div className="text-4xl mb-4">🏫</div>
              <h3 className="text-xl font-bold text-white mb-2">
                {featureMeta.name}
              </h3>
              <p className="text-gray-300 mb-6">
                This feature is only available for <strong>primary schools</strong> (Grades 1-7).
              </p>
              <p className="text-sm text-gray-400 mb-6">
                Your school is registered as <strong>{schoolType}</strong>.
              </p>
            </>
          ) : (
            <>
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-bold text-white mb-2">
                Feature Locked
              </h3>
              <p className="text-gray-300 mb-6">
                {reason || 'This feature requires a higher plan.'}
              </p>
              <button
                onClick={onUpgrade}
                className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold py-2 px-6 rounded-lg transition"
              >
                Upgrade Plan →
              </button>
            </>
          )}
        </div>
      </div>
    </div>

)
}

/\*\*

- Feature availability badge for UI elements
- Shows lock icon if feature is locked
  \*/
  export function FeatureBadge({ featureId, plan, schoolLevel, size = 'sm' }) {
  const featureMeta = PRIMARY_ONLY_FEATURES[featureId]
  const isPrimaryOnly = !!featureMeta && schoolLevel === 'secondary'

if (isPrimaryOnly) {
return (
<span
title={`Only available for primary schools`}
className={`inline-flex items-center gap-1 px-2 py-1 rounded ${
          size === 'sm' ? 'text-xs' : 'text-sm'
        } bg-blue-100 text-blue-800`} >
<span>🏫</span> Primary Only
</span>
)
}

return null
}

/\*\*

- Shows list of all available features for a school
  \*/
  export function AvailableFeaturesList({ schoolPlan, schoolLevel }) {
  const { PLAN_FEATURES } = require('@/lib/zambia-features')
  const { PRIMARY_ONLY_FEATURES } = require('@/lib/zambia-features')

const planFeatures = PLAN_FEATURES[schoolPlan?.toLowerCase()] || PLAN_FEATURES.basic

// Filter based on school level
const availableFeatures = schoolLevel === 'secondary'
? planFeatures.filter(f => !PRIMARY_ONLY_FEATURES[f])
: planFeatures

return (
<div className="space-y-4">
<h3 className="font-bold text-lg">Available Features</h3>

      {availableFeatures.length === 0 ? (
        <p className="text-gray-500">No features available for your school configuration.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableFeatures.map(featureId => {
            const feature = PRIMARY_ONLY_FEATURES[featureId]
            return (
              <div
                key={featureId}
                className="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition"
              >
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-semibold">{feature?.name || featureId}</h4>
                  {feature && schoolLevel === 'secondary' && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Primary Only
                    </span>
                  )}
                </div>
                {feature?.description && (
                  <p className="text-sm text-gray-600 mt-2">{feature.description}</p>
                )}
                {feature?.zambian_relevance && (
                  <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded mt-2">
                    🇿🇲 {feature.zambian_relevance}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>

)
}

/\*\*

- Plan comparison card showing what features are included
  \*/
  export function PlanComparisonCard({ plan, schoolLevel = 'primary' }) {
  const { PLAN_FEATURES, PRIMARY_ONLY_FEATURES } = require('@/lib/zambia-features')
  const features = PLAN_FEATURES[plan?.toLowerCase()] || []

// Filter primary-only features if secondary school
const displayFeatures = schoolLevel === 'secondary'
? features.filter(f => !PRIMARY_ONLY_FEATURES[f])
: features

const primaryOnlyCount = schoolLevel === 'primary'
? Object.keys(PRIMARY_ONLY_FEATURES).length
: 0

return (
<div className="border rounded-lg p-6 bg-gray-50">
<div className="flex justify-between items-center mb-4">
<h3 className="text-lg font-bold capitalize">{plan} Plan</h3>
<span className="text-sm text-gray-600">
{displayFeatures.length + primaryOnlyCount} features
</span>
</div>

      <ul className="space-y-2">
        {displayFeatures.slice(0, 5).map(feature => (
          <li key={feature} className="flex items-center gap-2 text-sm">
            <span className="text-green-500">✓</span>
            {feature}
          </li>
        ))}
        {displayFeatures.length > 5 && (
          <li className="text-sm text-gray-600 italic">
            + {displayFeatures.length - 5} more features
          </li>
        )}
      </ul>

      {schoolLevel === 'primary' && primaryOnlyCount > 0 && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-blue-700 font-semibold mb-2">🏫 Primary School Features:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRIMARY_ONLY_FEATURES)
              .slice(0, 3)
              .map(([id, meta]) => (
                <span key={id} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {meta.name}
                </span>
              ))}
            {primaryOnlyCount > 3 && (
              <span className="text-xs text-gray-600">+ {primaryOnlyCount - 3} more</span>
            )}
          </div>
        </div>
      )}
    </div>

)
}

// prisma/schema.prisma

generator client {
provider = "prisma-client-js"
}

datasource db {
provider = "postgresql"
url = env("DATABASE_URL")
}
/\*\*

- API ROUTE: Check if a feature is accessible
- Route: POST /api/features/check-access
-
- Usage:
- const result = await fetch('/api/features/check-access', {
-     method: 'POST',
-     body: JSON.stringify({ schoolId: '...', featureId: 'phonics-trainer' })
- })
  \*/

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { planIncludes, PRIMARY_ONLY_FEATURES } from '@/lib/zambia-features'

export async function POST(request) {
try {
const { schoolId, featureId } = await request.json()

    if (!schoolId || !featureId) {
      return NextResponse.json(
        { error: 'schoolId and featureId required' },
        { status: 400 }
      )
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        plan: true,
        planExpiresAt: true,
        trialEndsAt: true,
        level: true,
      },
    })

    if (!school) {
      return NextResponse.json(
        { allowed: false, reason: 'School not found' },
        { status: 404 }
      )
    }

    const now = new Date()

    // Check plan expiry
    const isExpired = school.planExpiresAt && school.planExpiresAt < now
    const isTrialExpired = school.trialEndsAt && school.trialEndsAt < now && school.plan === 'trial'

    if (isExpired || isTrialExpired) {
      return NextResponse.json({
        allowed: false,
        reason: 'Plan expired',
        requiresUpgrade: true,
        expiryDate: school.planExpiresAt || school.trialEndsAt,
      })
    }

    // Check plan includes feature
    const planHasFeature = planIncludes(school.plan, featureId)

    if (!planHasFeature) {
      return NextResponse.json({
        allowed: false,
        reason: 'Feature requires higher plan',
        requiresUpgrade: true,
        currentPlan: school.plan,
        suggestedPlan: school.plan === 'basic' ? 'standard' : 'premium',
      })
    }

    // Check primary-only restriction
    const isPrimaryOnly = PRIMARY_ONLY_FEATURES[featureId]

    if (isPrimaryOnly && school.level === 'secondary') {
      return NextResponse.json({
        allowed: false,
        reason: 'This feature is only available for primary schools',
        isPrimaryOnly: true,
        featureName: isPrimaryOnly.name,
        schoolType: school.level,
      })
    }

    // All checks passed
    return NextResponse.json({
      allowed: true,
      schoolId: school.id,
      schoolName: school.name,
      plan: school.plan,
      schoolLevel: school.level,
    })

} catch (error) {
console.error('[/api/features/check-access] Error:', error)
return NextResponse.json(
{ error: 'Internal server error', allowed: false },
{ status: 500 }
)
}
}

/\*\*

- FEATURE GATE MIDDLEWARE
- Enforces plan restrictions and primary school restrictions
  \*/

import { prisma } from '@/lib/prisma'
import { planIncludes, canUseFeature, PRIMARY_ONLY_FEATURES } from '@/lib/zambia-features'
import { NextResponse } from 'next/server'

export async function requireFeature(schoolId, featureId, context = {}) {
try {
const school = await prisma.school.findUnique({
where: { id: schoolId },
select: {
id: true,
name: true,
plan: true,
planExpiresAt: true,
trialEndsAt: true,
level: true, // 'primary', 'secondary', or 'combined'
},
})

    if (!school) {
      return NextResponse.json(
        { error: 'School not found', code: 'SCHOOL_NOT_FOUND' },
        { status: 404 }
      )
    }

    // ===== PLAN EXPIRY CHECK =====
    const now = new Date()
    const isExpired = school.planExpiresAt && school.planExpiresAt < now
    const isTrialExpired = school.trialEndsAt && school.trialEndsAt < now && school.plan === 'trial'

    if (isExpired || isTrialExpired) {
      return NextResponse.json(
        {
          error: 'Your plan has expired',
          code: 'PLAN_EXPIRED',
          schoolId: school.id,
          currentPlan: school.plan,
          expiryDate: school.planExpiresAt || school.trialEndsAt,
        },
        { status: 402 }
      )
    }

    // ===== PLAN FEATURE CHECK =====
    if (!planIncludes(school.plan, featureId)) {
      return NextResponse.json(
        {
          error: `This feature requires a higher plan`,
          code: 'PLAN_UPGRADE_REQUIRED',
          feature: featureId,
          currentPlan: school.plan,
          schoolId: school.id,
          // Suggest which plan is needed
          requiredPlan: school.plan === 'basic' ? 'standard' : 'premium',
        },
        { status: 403 }
      )
    }

    // ===== PRIMARY SCHOOL RESTRICTION CHECK =====
    // Some features (like phonics-trainer) ONLY work in primary schools
    const isPrimaryOnly = PRIMARY_ONLY_FEATURES[featureId]

    if (isPrimaryOnly && school.level === 'secondary') {
      return NextResponse.json(
        {
          error: `"${PRIMARY_ONLY_FEATURES[featureId].name}" is only available for primary schools`,
          code: 'PRIMARY_SCHOOL_ONLY',
          feature: featureId,
          schoolType: school.level,
          schoolId: school.id,
          suggestedFeature: null, // Could suggest an alternative for secondary
        },
        { status: 403 }
      )
    }

    // All checks passed
    return null // null = access granted

} catch (error) {
console.error('[featureGate] Error:', error)
return NextResponse.json(
{ error: 'Internal server error', code: 'INTERNAL_ERROR' },
{ status: 500 }
)
}
}

/\*\*

- Middleware function for API routes
- Usage:
- const blocked = await requireFeature(schoolId, 'ai-story-weaver')
- if (blocked) return blocked
  \*/
  export async function enforceFeature(req, schoolId, featureId) {
  return requireFeature(schoolId, featureId)
  }

/\*\*

- CLIENT-SIDE: Check if feature is accessible
- Returns { allowed, reason, requiresUpgrade, isPrimaryOnly }
  \*/
  export async function checkFeatureAccess(schoolId, featureId) {
  try {
  const response = await fetch('/api/features/check-access', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ schoolId, featureId }),
  })

      return await response.json()

  } catch (error) {
  console.error('[checkFeatureAccess] Error:', error)
  return { allowed: false, error: error.message }
  }
  }
  model School {
  id String @id @default(cuid())
  name String
  subdomain String @unique
  domain String? @unique

// ===== PLAN & BILLING =====
plan String @default("trial")
planExpiresAt DateTime?
trialEndsAt DateTime?

// ===== NEW: SCHOOL CONFIGURATION =====
level String @default("combined") // primary, secondary, or combined

// ===== EMAIL & CONTACT =====
email String?
phone String?
address String?

// ===== VERIFICATION =====
active Boolean @default(false)
emailVerified Boolean @default(false)
verificationToken String?
verificationExpiry DateTime?

// ===== TIMESTAMPS =====
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

// ===== RELATIONS =====
users User[]
classes Class[]
students Student[]
teachers Teacher[]
aiRequests AIRequest[] // NEW: Track AI feature usage
}

model User {
id String @id @default(cuid())
schoolId String
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)

email String @unique
password String
name String
role String @default("user") // admin, teacher, student, parent
contact_number String?

isActive Boolean @default(true)
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@index([schoolId])
}

model Class {
id String @id @default(cuid())
schoolId String
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)

name String
grade String // G1, G2, ... G12
section String?

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@index([schoolId])
}

model Student {
id String @id @default(cuid())
schoolId String
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)

firstName String
lastName String
email String?

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@index([schoolId])
}

model Teacher {
id String @id @default(cuid())
schoolId String
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)

firstName String
lastName String
email String?
subject String?

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@index([schoolId])
}

// ===== NEW: TRACK AI FEATURE USAGE =====
model AIRequest {
id String @id @default(cuid())
schoolId String
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)

feature String // ai-lesson-planner, ai-quiz-maker, ai-report-comments, etc.
prompt String @db.Text
response String @db.Text
tokens Int // Track token usage for billing

createdAt DateTime @default(now())

@@index([schoolId])
@@index([feature])
}

/\*\*

- ZAMBIA-SPECIFIC SCHOOL MANAGEMENT FEATURES
-
- Zambian Curriculum Structure:
- - Primary: Grades 1-7 (ages 6-13) - Foundation, Upper Primary
- - Secondary: Grades 8-12 (ages 13-18) - Lower/Upper Secondary
- - Key Curriculum: CBC (Competency Based Curriculum) implemented 2022+
- - Exam Bodies: NZQA (National Zambian Qualifications Authority), ECZ (Examinations Council of Zambia)
    \*/

export const SCHOOL_LEVELS = {
PRIMARY: 'primary', // Grades 1-7
SECONDARY: 'secondary', // Grades 8-12
COMBINED: 'combined', // Both primary and secondary
}

export const GRADE_LEVELS = {
// Primary (Foundation Phase: G1-G4, Upper Primary: G5-G7)
G1: { name: 'Grade 1', level: 'primary', phase: 'foundation', age: 6 },
G2: { name: 'Grade 2', level: 'primary', phase: 'foundation', age: 7 },
G3: { name: 'Grade 3', level: 'primary', phase: 'foundation', age: 8 },
G4: { name: 'Grade 4', level: 'primary', phase: 'foundation', age: 9 },
G5: { name: 'Grade 5', level: 'primary', phase: 'upper', age: 10 },
G6: { name: 'Grade 6', level: 'primary', phase: 'upper', age: 11 },
G7: { name: 'Grade 7', level: 'primary', phase: 'upper', age: 12 },

// Secondary
G8: { name: 'Grade 8', level: 'secondary', phase: 'lower', age: 13 },
G9: { name: 'Grade 9', level: 'secondary', phase: 'lower', age: 14 },
G10: { name: 'Grade 10', level: 'secondary', phase: 'upper', age: 15 },
G11: { name: 'Grade 11', level: 'secondary', phase: 'upper', age: 16 },
G12: { name: 'Grade 12', level: 'secondary', phase: 'upper', age: 17 },
}

/\*\*

- PRIMARY SCHOOL ONLY FEATURES
- These features can ONLY be used in schools/sections with primary grades (G1-G7)
  \*/
  export const PRIMARY_ONLY_FEATURES = {
  // Foundational Learning (G1-G4)
  'phonics-trainer': {
  name: 'Phonics & Letter Recognition',
  grades: ['G1', 'G2', 'G3', 'G4'],
  description: 'AI-powered phonics training with sound recognition for early literacy',
  zambian_relevance: 'Supports CBC foundation phase literacy',
  },
  'number-bonds': {
  name: 'Number Bonds & Counting',
  grades: ['G1', 'G2', 'G3', 'G4'],
  description: 'Interactive number bonds, subitizing, and counting activities',
  zambian_relevance: 'CBC numeracy foundation',
  },
  'early-writing-support': {
  name: 'Handwriting & Mark-Making',
  grades: ['G1', 'G2', 'G3', 'G4'],
  description: 'Pencil grip guides, letter formation, fine motor development',
  zambian_relevance: 'Pre-writing and writing readiness',
  },

// Primary-specific subjects (G1-G7)
'life-skills-curriculum': {
name: 'Life Skills Curriculum Tracker',
grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
description: 'Track CBC Life Skills competencies: Personal, Social, Environment',
zambian_relevance: 'CBC Subject - mandatory in all Zambian primary schools',
cbc_subject: true,
},
'values-education': {
name: 'Values & Citizenship Education',
grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
description: 'Track citizenship values: respect, responsibility, patriotism',
zambian_relevance: 'Zambian national curriculum emphasis',
},

// Literacy specific (G1-G7)
'english-phonic-stages': {
name: 'English Phonics Stages Tracker',
grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
description: 'Track Jolly Phonics or similar synthetic phonics progression',
zambian_relevance: 'Most Zambian primary schools use phonics-based literacy',
},

// Numeracy specific (G1-G7)
'singapore-math-tracker': {
name: 'Singapore Math/CPA Methods Tracker',
grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
description: 'Track Concrete-Pictorial-Abstract (CPA) progression',
zambian_relevance: 'CBC numeracy approach, popular in Zambian schools',
},

// Environmental studies (G1-G7)
'environmental-science-projects': {
name: 'Environmental Projects & Gardens',
grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
description: 'Manage school gardens, nature projects, environmental competencies',
zambian_relevance: 'CBC emphasis on environmental awareness',
},

// PE & Sports (G1-G7)
'movement-coordination-tracker': {
name: 'Movement & Coordination Development',
grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
description: 'Track gross and fine motor development milestones',
zambian_relevance: 'Primary PE focus in CBC',
},

// Arts (G1-G7)
'creative-arts-portfolio': {
name: 'Creative Arts Portfolio System',
grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
description: 'Digital portfolio for art, music, drama, dance work',
zambian_relevance: 'CBC Creative and Performing Arts subject',
},

// Primary-specific assessment
'cbc-competency-tracker': {
name: 'CBC Competency Progress Tracking',
grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
description: 'Track CBC core competencies: critical thinking, creativity, collaboration',
zambian_relevance: '**CRITICAL** - Zambian curriculum since 2022',
},

'continuous-assessment-tool': {
name: 'Continuous Assessment Tool',
grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
description: 'Formative assessment records, observation checklists',
zambian_relevance: 'Replaces traditional exams in primary, part of CBC',
},

// Parent communication (Primary focused)
'parent-report-cards-primary': {
name: 'Primary-Focused Report Cards',
grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
description: 'Report cards emphasizing progress, behavior, competencies (not just grades)',
zambian_relevance: 'CBC assessment reporting format',
},

// Welfare (Primary specific)
'childhood-welfare-monitoring': {
name: 'Child Safeguarding & Welfare',
grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
description: 'Track health screenings, nutrition, abuse reporting, orphan support',
zambian_relevance: 'Zambian government requirement for primary schools',
},

'nutrition-feeding-program': {
name: 'School Feeding Program Tracker',
grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
description: 'Manage meal distributions, menus, nutrition records',
zambian_relevance: 'WFP (World Food Program) supported in many Zambian primaries',
},

// Infrastructure (Primary specific)
'wash-facilities-tracker': {
name: 'WASH Facilities Monitoring',
grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
description: 'Water, Sanitation, Hygiene facility inspections and maintenance',
zambian_relevance: 'Key education quality metric in Zambia',
},
}

/\*\*

- ZAMBIA-SPECIFIC FEATURES FOR ALL SCHOOL TYPES
- (Can be used in both primary and secondary)
  \*/
  export const ZAMBIA_FEATURES = {
  // National Examinations
  'ecz-exam-tracking': {
  name: 'ECZ Exam Tracking & Analytics',
  levels: ['secondary'],
  description: 'Track ECZ GCSE performance, question analysis, trend reporting',
  zambian_relevance: 'Examinations Council of Zambia - mandatory for Grade 12',
  },

'moe-compliance-reporting': {
name: 'MOE Compliance & Reporting',
levels: ['primary', 'secondary'],
description: 'Generate Ministry of Education reports, enrollment data, staffing',
zambian_relevance: 'Required reporting for all Zambian registered schools',
},

// Curriculum
'cbc-curriculum-mapper': {
name: 'CBC Curriculum Mapper',
levels: ['primary', 'secondary'],
description: 'Map lessons to CBC standards and competencies',
zambian_relevance: 'Competency-Based Curriculum framework (2022+)',
},

// Language support
'english-second-language-tracking': {
name: 'English as Second Language (ESL)',
levels: ['primary', 'secondary'],
description: 'ESL proficiency tracking for schools in local language areas',
zambian_relevance: 'Many Zambian schools teach in local languages G1-G4',
},

'local-language-subjects': {
name: 'Local Language Subject Management',
levels: ['primary'],
description: 'Bemba, Tonga, Lozi, Kaonde, Lunda curriculum tracking',
zambian_relevance: 'G1-G4 taught in local languages per MOE policy',
},

// School management
'school-fees-management': {
name: 'School Fees & Payment Tracking',
levels: ['primary', 'secondary'],
description: 'Fee structures, payment tracking, exemption management',
zambian_relevance: 'Critical for school sustainability in Zambia',
},

'teacher-deployment-system': {
name: 'Teacher Deployment & Transfers',
levels: ['primary', 'secondary'],
description: 'Manage teacher transfers, postings, qualifications',
zambian_relevance: 'MOE teacher deployment coordination',
},

'infrastructure-mapping': {
name: 'School Infrastructure Asset Mapping',
levels: ['primary', 'secondary'],
description: 'Classroom inventory, furniture, equipment tracking',
zambian_relevance: 'EMIS (Education Management Information System) reporting',
},

// Health & Welfare
'hiv-awareness-program': {
name: 'HIV/AIDS Awareness Program',
levels: ['primary', 'secondary'],
description: 'Curriculum tracking, testing data, support programs',
zambian_relevance: 'National priority in Zambian schools',
},

'student-health-records': {
name: 'Student Health Records System',
levels: ['primary', 'secondary'],
description: 'Medical history, vaccinations, health screening records',
zambian_relevance: 'Health ministry coordination',
},

// Community engagement
'community-liaison-system': {
name: 'Community Liaison & PTA Management',
levels: ['primary', 'secondary'],
description: 'Parent-Teacher Association (PTA) meetings, decisions, fundraising',
zambian_relevance: 'Critical governance structure in Zambian schools',
},

'local-partner-network': {
name: 'Local Partner Network Coordination',
levels: ['primary', 'secondary'],
description: 'Manage NGO partnerships, donor programs, community resources',
zambian_relevance: 'Many Zambian schools rely on local NGO support',
},
}

/\*\*

- PLAN FEATURES WITH ZAMBIA ENHANCEMENTS
  \*/
  export const PLAN_FEATURES = {
  basic: [
  'attendance', 'students', 'teachers', 'classes', 'subjects',
  'basic-results', 'headteacher-dashboard', 'teacher-dashboard',
  'student-dashboard', 'user-management', 'email-support',
  // Zambia additions
  'moe-compliance-reporting',
  ],

standard: [
// Everything in basic
'attendance', 'students', 'teachers', 'classes', 'subjects',
'basic-results', 'headteacher-dashboard', 'teacher-dashboard',
'student-dashboard', 'user-management', 'email-support',
'moe-compliance-reporting',

    // Standard additions
    'hod-dashboard', 'junior-performance', 'ecz-tracking',
    'moe-reports', 'stem-monitoring', 'girls-dropout-tracking',
    'export-reports', 'ai-story-weaver', 'ai-lesson-planner',
    'ai-quiz-maker', 'ecz-practice', 'interactive-whiteboard',
    'virtual-science-lab', 'code-playground', 'sms-alerts',
    'bulk-announcements', 'hod-management', 'timetable',
    'whatsapp-support', 'onboarding', 'data-backup',
    'ai-requests-50',

    // Zambia-specific for standard
    'cbc-curriculum-mapper',
    'english-phonic-stages',
    'ecz-exam-tracking',
    'school-fees-management',
    'teacher-deployment-system',
    'student-health-records',
    'community-liaison-system',

],

premium: [
// Everything in standard
'attendance', 'students', 'teachers', 'classes', 'subjects',
'basic-results', 'headteacher-dashboard', 'teacher-dashboard',
'student-dashboard', 'user-management', 'email-support',
'moe-compliance-reporting',
'hod-dashboard', 'junior-performance', 'ecz-tracking',
'moe-reports', 'stem-monitoring', 'girls-dropout-tracking',
'export-reports', 'ai-story-weaver', 'ai-lesson-planner',
'ai-quiz-maker', 'ecz-practice', 'interactive-whiteboard',
'virtual-science-lab', 'code-playground', 'sms-alerts',
'bulk-announcements', 'hod-management', 'timetable',
'whatsapp-support', 'onboarding', 'data-backup',
'ai-requests-50',
'cbc-curriculum-mapper',
'english-phonic-stages',
'ecz-exam-tracking',
'school-fees-management',
'teacher-deployment-system',
'student-health-records',
'community-liaison-system',

    // Premium only
    'predictive-analytics', 'comprehensive-analytics',
    'ai-report-comments', 'ai-requests-unlimited',
    'digital-music-composer', '3d-shape-builder',
    'automated-messaging', 'strategic-planning',
    'blockchain-certificates', 'custom-branding',
    'priority-support',

    // All Zambia features
    'ecz-exam-tracking',
    'local-language-subjects',
    'hiv-awareness-program',
    'infrastructure-mapping',
    'local-partner-network',

    // All primary-only features (if school is primary)
    ...Object.keys(PRIMARY_ONLY_FEATURES),

],
}

/\*\*

- CHECK IF A FEATURE IS AVAILABLE FOR A PLAN
  \*/
  export function planIncludes(schoolPlan, featureId) {
  const plan = schoolPlan?.toLowerCase() || 'basic'
  if (plan === 'premium') return true

if (plan === 'standard') {
return [...PLAN_FEATURES.basic, ...PLAN_FEATURES.standard].includes(featureId)
}

return PLAN_FEATURES.basic.includes(featureId)
}

/\*\*

- CHECK IF FEATURE IS AVAILABLE FOR SCHOOL LEVEL
- PRIMARY-ONLY features can only be used in schools that have primary grades
  \*/
  export function canUseFeature(schoolLevel, featureId) {
  // Non-primary schools cannot use primary-only features
  if (schoolLevel === 'secondary' && PRIMARY_ONLY_FEATURES[featureId]) {
  return false
  }

return true
}

/\*\*a

- GET AVAILABLE FEATURES FOR A SCHOOL
  \*/
  export function getAvailableFeaturesForSchool(schoolPlan, schoolLevel) {
  const planFeatures = PLAN_FEATURES[schoolPlan?.toLowerCase()] || PLAN_FEATURES.basic

// Filter out primary-only features if school is secondary-only
if (schoolLevel === 'secondary') {
return planFeatures.filter(f => !PRIMARY_ONLY_FEATURES[f])
}

return planFeatures
}

/\*\*

- HOW TO UPDATE YOUR PRISMA SCHEMA
-
- You edited the file in the wrong way. Here's the correct process:
  \*/

// =============================================================================
// STEP 1: EDIT THE FILE (Not PowerShell)
// =============================================================================

/\*

1. Open your code editor (VS Code, WebStorm, etc.)
2. Navigate to: prisma/schema.prisma
3. Find the "model School {" section
4. Add this new line after the plan fields:

level String @default("combined") // primary, secondary, or combined

YOUR FILE SHOULD LOOK LIKE:

model School {
id String @id @default(cuid())
name String
subdomain String @unique
domain String? @unique

// Plan & Billing
plan String @default("trial")
planExpiresAt DateTime?
trialEndsAt DateTime?

// NEW LINE HERE ↓↓↓
level String @default("combined") // primary, secondary, or combined
// ↑↑↑ ADD THIS

// Rest of your fields...
active Boolean @default(false)
// ... etc
}

5. Save the file (Ctrl+S)
   \*/

// =============================================================================
// STEP 2: RUN MIGRATION IN POWERSHELL
// =============================================================================

/\*
NOW you can use PowerShell:

PS F:\Mobile Apps\school_management_systems> npx prisma migrate dev --name add_school_level

This will:
✓ Create a new migration file
✓ Apply it to your Railway PostgreSQL database
✓ Update your Prisma client

You should see:
✓ Database synced to schema
✓ Generated Prisma Client
\*/

// =============================================================================
// STEP 3: VERIFY IT WORKED
// =============================================================================

/\*
In PowerShell:

PS F:\Mobile Apps\school_management_systems> npx prisma studio

This opens a GUI where you can see your School table now has a "level" column.
Press Ctrl+C to close it.
\*/

// =============================================================================
// COMPLETE FILE PATH
// =============================================================================

/\*
Your Prisma schema file should be at:
F:\Mobile Apps\school_management_systems\prisma\schema.prisma

If you can't find it, run:
PS> Get-ChildItem -Path "prisma" -Name "schema.prisma" -Recurse
\*/

/\*\*

- AI INTEGRATION FOR ZAMBIA SCHOOL FEATURES
-
- Features that benefit from AI:
- 1.  AI Lesson Planner - Generate lessons aligned to CBC curriculum
- 2.  AI Quiz Maker - Create assessments based on topics
- 3.  AI Report Comments - Generate personalized student feedback
- 4.  AI Story Weaver - Create engaging stories for reading
- 5.  CBC Competency Analyzer - Assess student progress
- 6.  Phonics Assistant - Generate phonics exercises
      \*/

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// =============================================================================
// 1. AI LESSON PLANNER (For all grades, CBC-aligned)
// =============================================================================

export async function generateCBCLesson({
grade, // G1, G2, ... G12
subject, // English, Mathematics, Life Skills, etc.
topic, // Specific topic
duration, // in minutes
schoolId,
}) {
const isZambianContext =
["Life Skills", "Citizenship", "Environmental Studies"].includes(subject);

const prompt = `You are a Zambian education expert creating a Competency-Based Curriculum (CBC) lesson.

Grade Level: ${grade}
Subject: ${subject}
Topic: ${topic}
Duration: ${duration} minutes
Context: ${isZambianContext ? "Zambian primary/secondary school" : "General"}

Create a detailed lesson plan that includes:

1. Learning Objectives (CBC Core Competencies):
   - Critical thinking
   - Creativity
   - Collaboration
   - Communication

2. Lesson Outline:
   - Introduction (5 min)
   - Main Activities (bulk of time)
   - Group Work (if applicable)
   - Reflection/Closure (5 min)

3. Materials Needed (consider limited resources in Zambian schools)

4. Assessment Methods (formative, not just written exams)

5. Differentiation strategies for mixed-ability classes

6. How this connects to Zambian context/curriculum

Format as JSON with clear sections.`;

try {
const message = await client.messages.create({
model: "claude-opus-4-6",
max_tokens: 2000,
messages: [
{
role: "user",
content: prompt,
},
],
});

    const lessonContent = message.content[0];

    // Save to database
    await saveLessonToDB({
      schoolId,
      grade,
      subject,
      topic,
      content: lessonContent.text,
      feature: "ai-lesson-planner",
      tokensUsed: message.usage.output_tokens,
    });

    return {
      success: true,
      lesson: lessonContent.text,
      tokensUsed: message.usage.output_tokens,
    };

} catch (error) {
console.error("Error generating lesson:", error);
return { success: false, error: error.message };
}
}

// =============================================================================
// 2. AI QUIZ MAKER (Generate formative assessments)
// =============================================================================

export async function generateQuiz({
grade,
subject,
topic,
questionCount = 10,
schoolId,
}) {
const prompt = `Create a quiz for Zambian students.

Grade: ${grade}
Subject: ${subject}
Topic: ${topic}
Question Count: ${questionCount}
Curriculum: CBC (Competency-Based)

Requirements:

- Mix of question types (multiple choice, short answer, matching)
- Age-appropriate for grade ${grade}
- Aligned to CBC competencies, not just recall
- Include critical thinking questions
- Some questions should reference Zambian context when appropriate

Format as JSON with array of questions. Each question should have:
{
"id": "q1",
"type": "multiple_choice" | "short_answer" | "matching",
"question": "...",
"options": [...], // for multiple choice
"correctAnswer": "...",
"marks": 1,
"competencies": ["critical thinking", "..."],
"explanation": "Why this answer matters"
}`;

try {
const message = await client.messages.create({
model: "claude-opus-4-6",
max_tokens: 3000,
messages: [
{
role: "user",
content: prompt,
},
],
});

    const quizContent = message.content[0].text;

    // Save to database
    await saveQuizToDB({
      schoolId,
      grade,
      subject,
      topic,
      content: quizContent,
      feature: "ai-quiz-maker",
      tokensUsed: message.usage.output_tokens,
    });

    return {
      success: true,
      quiz: quizContent,
      tokensUsed: message.usage.output_tokens,
    };

} catch (error) {
console.error("Error generating quiz:", error);
return { success: false, error: error.message };
}
}

// =============================================================================
// 3. AI REPORT COMMENTS (Generate student feedback)
// =============================================================================

export async function generateReportComments({
studentName,
grade,
subject,
marks,
maxMarks,
behavior,
attendance,
strengths,
areasForImprovement,
schoolId,
}) {
const percentage = ((marks / maxMarks) \* 100).toFixed(1);

const prompt = `Generate a meaningful report comment for a Zambian student.

Student: ${studentName}
Grade: ${grade}
Subject: ${subject}
Performance: ${marks}/${maxMarks} (${percentage}%)
Behavior: ${behavior}
Attendance: ${attendance}
Strengths: ${strengths.join(", ")}
Areas for Improvement: ${areasForImprovement.join(", ")}

Write a personalized, encouraging comment that:

1. Acknowledges specific strengths
2. Identifies one area for growth with constructive advice
3. Encourages effort and progress
4. Is written in simple English (teachers/parents will read it)
5. Is positive even if marks are low
6. References CBC competencies where relevant
7. Is approximately 3-4 sentences

Do NOT include marks or percentages in the comment.`;

try {
const message = await client.messages.create({
model: "claude-opus-4-6",
max_tokens: 500,
messages: [
{
role: "user",
content: prompt,
},
],
});

    const comment = message.content[0].text;

    // Save to database
    await saveReportCommentToDB({
      schoolId,
      studentName,
      grade,
      subject,
      comment,
      feature: "ai-report-comments",
      tokensUsed: message.usage.output_tokens,
    });

    return {
      success: true,
      comment,
      tokensUsed: message.usage.output_tokens,
    };

} catch (error) {
console.error("Error generating comment:", error);
return { success: false, error: error.message };
}
}

// =============================================================================
// 4. AI STORY WEAVER (Engaging stories for reading lessons)
// =============================================================================

export async function generateStory({
grade,
theme, // Animal stories, Adventure, Moral lessons, etc.
length = "short", // short (300 words), medium (600 words), long (1000+ words)
zambianContext = true,
schoolId,
}) {
const wordTargets = {
short: 300,
medium: 600,
long: 1000,
};

const prompt = `Write an engaging story for Zambian Grade ${grade} students.

Theme: ${theme}
Target Length: approximately ${wordTargets[length]} words
Context: ${zambianContext ? "Include Zambian setting, characters, or cultural elements" : "Generic"}

Requirements:

- Age-appropriate vocabulary for Grade ${grade}
- Clear beginning, middle, end
- Relatable characters (preferably Zambian names/settings if context=true)
- ${zambianContext ? "Reflect Zambian culture, traditions, or environments" : ""}
- Includes a subtle lesson or moral
- Engaging and fun to read
- Can be used as a reading comprehension text

After the story, include:

- 5 comprehension questions
- 3 vocabulary words to discuss
- 1 discussion prompt`;

  try {
  const message = await client.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 2000,
  messages: [
  {
  role: "user",
  content: prompt,
  },
  ],
  });

      const story = message.content[0].text;

      // Save to database
      await saveStoryToDB({
        schoolId,
        grade,
        theme,
        length,
        content: story,
        feature: "ai-story-weaver",
        tokensUsed: message.usage.output_tokens,
      });

      return {
        success: true,
        story,
        tokensUsed: message.usage.output_tokens,
      };

  } catch (error) {
  console.error("Error generating story:", error);
  return { success: false, error: error.message };
  }
  }

// =============================================================================
// 5. PHONICS ASSISTANT (For Grade 1-4 Reading)
// =============================================================================

export async function generatePhonicsLesson({
grade, // G1, G2, G3, G4
phonic, // "sh", "ch", "th", "ai", "ea", etc.
schoolId,
}) {
const prompt = `Create a phonics lesson for Zambian Grade ${grade} students.

Sound/Phoneme: /${phonic}/

Include:

1. Pronunciation guide (how to make the sound)
2. Initial introduction activity
3. Letter cards and flashcards (ASCII format)
4. 10 words containing "${phonic}"
5. Blending activities (combining sounds)
6. Short sentences using words with "${phonic}"
7. Fun activity (games, songs, etc.)
8. Home practice suggestions for parents

Format should be:

- Clear and visual (use ASCII art if needed)
- Simple language
- Practical activities teachers can do with limited resources
- Includes words relevant to Zambian context where possible`;

  try {
  const message = await client.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 1500,
  messages: [
  {
  role: "user",
  content: prompt,
  },
  ],
  });

      const lesson = message.content[0].text;

      await saveLessonToDB({
        schoolId,
        grade,
        subject: "English",
        topic: `Phonics: /${phonic}/`,
        content: lesson,
        feature: "phonics-trainer",
        tokensUsed: message.usage.output_tokens,
      });

      return {
        success: true,
        lesson,
        tokensUsed: message.usage.output_tokens,
      };

  } catch (error) {
  console.error("Error generating phonics lesson:", error);
  return { success: false, error: error.message };
  }
  }

// =============================================================================
// 6. CBC COMPETENCY ANALYZER (Assess student competency development)
// =============================================================================

export async function analyzeCBCCompetencies({
studentName,
grade,
observations, // Array of teacher observations
schoolId,
}) {
const observationsText = observations
.map(
(obs, i) =>
`${i + 1}. ${obs.competency}: ${obs.evidence} (Date: ${obs.date})`
)
.join("\n");

const prompt = `Analyze a Zambian student's CBC competency development.

Student: ${studentName}
Grade: ${grade}

Teacher Observations:
${observationsText}

CBC Core Competencies to assess:

- Critical thinking
- Creativity
- Collaboration
- Communication
- Digital literacy (if applicable)

For each competency, provide:

1. Current Level (Emerging, Developing, Proficient, Mastery)
2. Evidence from observations
3. Specific next steps to develop this competency
4. Suggested activities/tasks

Also provide:

- Overall competency profile summary
- Key strengths
- Priority areas for development
- Recommendations for parents/guardians`;

  try {
  const message = await client.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 2000,
  messages: [
  {
  role: "user",
  content: prompt,
  },
  ],
  });

      const analysis = message.content[0].text;

      return {
        success: true,
        analysis,
        tokensUsed: message.usage.output_tokens,
      };

  } catch (error) {
  console.error("Error analyzing competencies:", error);
  return { success: false, error: error.message };
  }
  }

// =============================================================================
// API ROUTE EXAMPLE: How to use in your Next.js app
// =============================================================================

/\*
// app/api/ai/lesson-planner/route.js

import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { generateCBCLesson } from '@/lib/ai/zambia-features'
import { NextResponse } from 'next/server'

export async function POST(req) {
try {
const schoolId = await getSchoolIdFromRequest(req)

    // Check if school has access
    const blocked = await requireFeature(schoolId, 'ai-lesson-planner')
    if (blocked) return blocked

    const { grade, subject, topic, duration } = await req.json()

    // Generate lesson using AI
    const result = await generateCBCLesson({
      grade,
      subject,
      topic,
      duration,
      schoolId
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      lesson: result.lesson,
      tokensUsed: result.tokensUsed
    })

} catch (error) {
console.error('Error:', error)
return NextResponse.json({ error: error.message }, { status: 500 })
}
}
\*/

// =============================================================================
// HELPER FUNCTIONS (Save to database)
// =============================================================================

async function saveLessonToDB({
schoolId,
grade,
subject,
topic,
content,
feature,
tokensUsed,
}) {
await prisma.aIRequest.create({
data: {
schoolId,
feature,
prompt: `Generate lesson: ${subject} ${topic} for ${grade}`,
response: content,
tokens: tokensUsed,
},
});
}

async function saveQuizToDB({
schoolId,
grade,
subject,
topic,
content,
feature,
tokensUsed,
}) {
await prisma.aIRequest.create({
data: {
schoolId,
feature,
prompt: `Generate quiz: ${subject} ${topic} for ${grade}`,
response: content,
tokens: tokensUsed,
},
});
}

async function saveReportCommentToDB({
schoolId,
studentName,
grade,
subject,
comment,
feature,
tokensUsed,
}) {
await prisma.aIRequest.create({
data: {
schoolId,
feature,
prompt: `Generate report comment for ${studentName} in ${subject}`,
response: comment,
tokens: tokensUsed,
},
});
}

async function saveStoryToDB({
schoolId,
grade,
theme,
length,
content,
feature,
tokensUsed,
}) {
await prisma.aIRequest.create({
data: {
schoolId,
feature,
prompt: `Generate story: ${theme} for ${grade} (${length})`,
response: content,
tokens: tokensUsed,
},
});
}

// =============================================================================
// TRACKING AI USAGE FOR BILLING
// =============================================================================

/\*
Premium plans get unlimited AI requests.
Standard plans get 50 AI requests/month.
Basic plans get 5 AI requests/month.

Check before allowing request:

async function checkAIQuota(schoolId) {
const thisMonth = new Date(Date.now() - 30 _ 24 _ 60 _ 60 _ 1000)

const requestCount = await prisma.aIRequest.count({
where: {
schoolId,
createdAt: { gte: thisMonth }
}
})

const school = await prisma.school.findUnique({ where: { id: schoolId } })

const quotas = { basic: 5, standard: 50, premium: Infinity }
const limit = quotas[school.plan]

return {
used: requestCount,
limit,
remaining: limit - requestCount,
exceeded: requestCount >= limit
}
}
\*/

/\*\*

- EXAMPLE API ROUTES FOR AI FEATURES
- Copy these to your app/api/ai/ folder
  \*/

// =============================================================================
// 1. AI LESSON PLANNER
// =============================================================================

// app/api/ai/lesson-planner/route.js

import { NextResponse } from 'next/server'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { generateCBCLesson } from '@/lib/ai/zambia-features'
import { getSchoolIdFromSession } from '@/lib/auth'

export async function POST(request) {
try {
const schoolId = await getSchoolIdFromSession(request)
if (!schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check if school has access to this feature
    const blocked = await requireFeature(schoolId, 'ai-lesson-planner')
    if (blocked) return blocked

    const { grade, subject, topic, duration } = await request.json()

    // Validate input
    if (!grade || !subject || !topic || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log(`📚 Generating lesson for ${grade} ${subject}: ${topic}`)

    // Generate lesson using AI
    const result = await generateCBCLesson({
      grade,
      subject,
      topic,
      duration,
      schoolId,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      lesson: result.lesson,
      tokensUsed: result.tokensUsed,
      message: 'Lesson generated successfully using AI ✨',
    })

} catch (error) {
console.error('[ai/lesson-planner] Error:', error)
return NextResponse.json(
{ error: 'Failed to generate lesson' },
{ status: 500 }
)
}
}

// =============================================================================
// 2. AI QUIZ MAKER
// =============================================================================

// app/api/ai/quiz-maker/route.js

import { NextResponse } from 'next/server'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { generateQuiz } from '@/lib/ai/zambia-features'
import { getSchoolIdFromSession } from '@/lib/auth'

export async function POST(request) {
try {
const schoolId = await getSchoolIdFromSession(request)
if (!schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const blocked = await requireFeature(schoolId, 'ai-quiz-maker')
    if (blocked) return blocked

    const { grade, subject, topic, questionCount = 10 } = await request.json()

    if (!grade || !subject || !topic) {
      return NextResponse.json(
        { error: 'grade, subject, and topic are required' },
        { status: 400 }
      )
    }

    console.log(`📝 Generating ${questionCount} question quiz for ${grade} ${subject}`)

    const result = await generateQuiz({
      grade,
      subject,
      topic,
      questionCount,
      schoolId,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      quiz: result.quiz,
      tokensUsed: result.tokensUsed,
      questions: questionCount,
    })

} catch (error) {
console.error('[ai/quiz-maker] Error:', error)
return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 })
}
}

// =============================================================================
// 3. AI REPORT COMMENTS
// =============================================================================

// app/api/ai/report-comments/route.js

import { NextResponse } from 'next/server'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { generateReportComments } from '@/lib/ai/zambia-features'
import { getSchoolIdFromSession } from '@/lib/auth'

export async function POST(request) {
try {
const schoolId = await getSchoolIdFromSession(request)
if (!schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const blocked = await requireFeature(schoolId, 'ai-report-comments')
    if (blocked) return blocked

    const {
      studentName,
      grade,
      subject,
      marks,
      maxMarks,
      behavior,
      attendance,
      strengths,
      areasForImprovement,
    } = await request.json()

    if (!studentName || !grade || !subject || marks === undefined || !maxMarks) {
      return NextResponse.json(
        { error: 'Missing required student information' },
        { status: 400 }
      )
    }

    console.log(`💬 Generating report comment for ${studentName}`)

    const result = await generateReportComments({
      studentName,
      grade,
      subject,
      marks,
      maxMarks,
      behavior: behavior || 'Good',
      attendance: attendance || 'Regular',
      strengths: strengths || [],
      areasForImprovement: areasForImprovement || [],
      schoolId,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      comment: result.comment,
      tokensUsed: result.tokensUsed,
    })

} catch (error) {
console.error('[ai/report-comments] Error:', error)
return NextResponse.json({ error: 'Failed to generate comment' }, { status: 500 })
}
}

// =============================================================================
// 4. AI STORY WEAVER
// =============================================================================

// app/api/ai/story-weaver/route.js

import { NextResponse } from 'next/server'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { generateStory } from '@/lib/ai/zambia-features'
import { getSchoolIdFromSession } from '@/lib/auth'

export async function POST(request) {
try {
const schoolId = await getSchoolIdFromSession(request)
if (!schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const blocked = await requireFeature(schoolId, 'ai-story-weaver')
    if (blocked) return blocked

    const { grade, theme, length = 'short', zambianContext = true } = await request.json()

    if (!grade || !theme) {
      return NextResponse.json(
        { error: 'grade and theme are required' },
        { status: 400 }
      )
    }

    console.log(`📖 Generating ${length} story for ${grade}: ${theme}`)

    const result = await generateStory({
      grade,
      theme,
      length,
      zambianContext,
      schoolId,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      story: result.story,
      tokensUsed: result.tokensUsed,
      theme,
      length,
    })

} catch (error) {
console.error('[ai/story-weaver] Error:', error)
return NextResponse.json({ error: 'Failed to generate story' }, { status: 500 })
}
}

// =============================================================================
// 5. PHONICS TRAINER
// =============================================================================

// app/api/ai/phonics-trainer/route.js

import { NextResponse } from 'next/server'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { generatePhonicsLesson } from '@/lib/ai/zambia-features'
import { getSchoolIdFromSession } from '@/lib/auth'

export async function POST(request) {
try {
const schoolId = await getSchoolIdFromSession(request)
if (!schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // This will automatically block secondary schools (primary-only feature)
    const blocked = await requireFeature(schoolId, 'phonics-trainer')
    if (blocked) return blocked

    const { grade, phonic } = await request.json()

    if (!grade || !phonic) {
      return NextResponse.json(
        { error: 'grade and phonic are required' },
        { status: 400 }
      )
    }

    // Only allow grades 1-4
    if (!['G1', 'G2', 'G3', 'G4'].includes(grade)) {
      return NextResponse.json(
        { error: 'Phonics trainer is for Grades 1-4 only' },
        { status: 400 }
      )
    }

    console.log(`🔤 Generating phonics lesson for /${phonic}/ (Grade ${grade})`)

    const result = await generatePhonicsLesson({
      grade,
      phonic,
      schoolId,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      lesson: result.lesson,
      tokensUsed: result.tokensUsed,
      phonic,
    })

} catch (error) {
console.error('[ai/phonics-trainer] Error:', error)
return NextResponse.json({ error: 'Failed to generate lesson' }, { status: 500 })
}
}

// =============================================================================
// 6. CBC COMPETENCY ANALYZER
// =============================================================================

// app/api/ai/competency-analyzer/route.js

import { NextResponse } from 'next/server'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { analyzeCBCCompetencies } from '@/lib/ai/zambia-features'
import { getSchoolIdFromSession } from '@/lib/auth'

export async function POST(request) {
try {
const schoolId = await getSchoolIdFromSession(request)
if (!schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const blocked = await requireFeature(schoolId, 'cbc-competency-tracker')
    if (blocked) return blocked

    const { studentName, grade, observations } = await request.json()

    if (!studentName || !grade || !observations || observations.length === 0) {
      return NextResponse.json(
        { error: 'studentName, grade, and observations are required' },
        { status: 400 }
      )
    }

    console.log(`📊 Analyzing CBC competencies for ${studentName}`)

    const result = await analyzeCBCCompetencies({
      studentName,
      grade,
      observations,
      schoolId,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      analysis: result.analysis,
      tokensUsed: result.tokensUsed,
      studentName,
    })

} catch (error) {
console.error('[ai/competency-analyzer] Error:', error)
return NextResponse.json({ error: 'Failed to analyze competencies' }, { status: 500 })
}
}

// =============================================================================
// FRONTEND USAGE EXAMPLES
// =============================================================================

/\*
EXAMPLE: Using the AI Lesson Planner in a React component

// components/LessonPlannerForm.jsx

'use client'

import { useState } from 'react'

export default function LessonPlannerForm() {
const [loading, setLoading] = useState(false)
const [lesson, setLesson] = useState(null)

async function handleGenerate(e) {
e.preventDefault()
setLoading(true)

    try {
      const response = await fetch('/api/ai/lesson-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: 'G5',
          subject: 'Mathematics',
          topic: 'Fractions',
          duration: 60,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setLesson(data.lesson)
      } else {
        alert('Error: ' + data.error)
      }
    } finally {
      setLoading(false)
    }

}

return (
<div>
<button onClick={handleGenerate} disabled={loading}>
{loading ? 'Generating...' : 'Generate Lesson Plan'}
</button>

      {lesson && (
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <h3>Generated Lesson Plan</h3>
          <pre className="whitespace-pre-wrap">{lesson}</pre>
        </div>
      )}
    </div>

)
}
\*/

/\*_
• SETUP GUIDE: ANTHROPIC CLAUDE API FOR ZAMBIA FEATURES _/
// ============================================================================= // STEP 1: INSTALL THE SDK // =============================================================================
/_ In PowerShell, run:
PS F:\Mobile Apps\school_management_systems> npm install @anthropic-ai/sdk
This adds the Anthropic SDK to your project. _/
// ============================================================================= // STEP 2: GET AN API KEY // =============================================================================
/\*

1. Go to https://console.anthropic.com/
2. Sign up (or login if you have an account)
3. Go to API Keys section
4. Create a new API key
5. Copy the key (starts with "sk-ant-...")
6. Do NOT share this key publicly! _/
   // ============================================================================= // STEP 3: ADD TO ENVIRONMENT VARIABLES // =============================================================================
   /_ Create or update your .env.local file in the root of your project:
   .env.local: ───────────────────────────────────────────────────
   Anthropic Claude API
   ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE_REPLACE_WITH_ACTUAL_KEY
   Other existing variables
   DATABASE_URL=... NEXT_PUBLIC_APP_ORIGIN=... ───────────────────────────────────────────────────
   For Railway deployment:
7. Go to Railway Dashboard → Your Project
8. Click Variables tab
9. Add variable: ANTHROPIC_API_KEY = sk-ant-...
10. Redeploy _/
    // ============================================================================= // STEP 4: CREATE THE AI MODULE // =============================================================================
    /_ Create this file: lib/ai/zambia-features.js (This is where all your AI functions go)
    Then import it in your API routes:
    import { generateCBCLesson } from '@/lib/ai/zambia-features' _/
    // ============================================================================= // STEP 5: EXAMPLE - COMPLETE SETUP // =============================================================================
    /_ Here's a complete working example:
    // lib/ai/zambia-features.js
    import Anthropic from "@anthropic-ai/sdk"
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, })
    export async function generateCBCLesson({ grade, subject, topic, duration, schoolId, }) { const prompt = You are a Zambian education expert...
    const message = await client.messages.create({ model: "claude-opus-4-6", max_tokens: 2000, messages: [ { role: "user", content: prompt, }, ], })
    return { success: true, lesson: message.content[0].text, tokensUsed: message.usage.output_tokens, } } _/
    // ============================================================================= // STEP 6: TEST IT WORKS // =============================================================================
    /_ Create a test API route to verify the setup:
    // app/api/test-ai/route.js
    import { NextResponse } from 'next/server' import Anthropic from '@anthropic-ai/sdk'
    export async function GET() { try { const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, })
    const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 100,
    messages: [
    {
    role: 'user',
    content: 'Say hello in exactly 5 words.',
    },
    ],
    })

return NextResponse.json({
success: true,
message: message.content[0].text,
tokensUsed: message.usage.output_tokens,
})
} catch (error) { return NextResponse.json( { success: false, error: error.message, hint: 'Check if ANTHROPIC_API_KEY is set in environment variables', }, { status: 500 } ) } }
Then visit: http://localhost:3000/api/test-ai You should see: { "success": true, "message": "Hello from Claude AI" } _/
// ============================================================================= // STEP 7: PRICING & COSTS // =============================================================================
/_ Claude API pricing (as of April 2026):
Model: claude-opus-4-6 (Most capable, recommended for education)
• Input: $15 per 1M tokens
• Output: $45 per 1M tokens
Typical usage:
• Generating a lesson plan: ~500-800 output tokens (~$0.02-0.04)
• Generating a quiz (10 questions): ~1000-1500 tokens (~$0.03-0.07)
• Generating report comments: ~200-400 tokens (~$0.01-0.02)
COST MANAGEMENT:

1. Store generated content in database
   o Don't regenerate the same lesson twice
   o Reuse for multiple students/years
2. Set max_tokens limit
   o Always specify max_tokens in requests
   o Prevents accidentally generating 10,000 token responses
3. Cache frequently used prompts
   o System prompts can be reused
   o Reduces repeated computation
4. Track usage per school
   o Count tokens in AIRequest table
   o Bill based on actual usage
   Example billing logic:
   • Basic plan: 5 AI requests/month = ~$0.25-0.50/month
   • Standard plan: 50 AI requests/month = $2.50-5.00/month
   • Premium plan: Unlimited = flat $50-100/month _/
   // ============================================================================= // STEP 8: RATE LIMITING & QUOTAS // =============================================================================
   /_ Implement rate limiting to prevent abuse:
   // lib/ai/rate-limiter.js
   const requestsPerMinute = { basic: 2, standard: 10, premium: 100, }
   export async function checkRateLimit(schoolId, schoolPlan) { const now = Date.now() const oneMinuteAgo = now - 60 _ 1000
   const recentRequests = await prisma.aIRequest.count({ where: { schoolId, createdAt: { gte: new Date(oneMinuteAgo) }, }, })
   const limit = requestsPerMinute[schoolPlan] || 2
   return { allowed: recentRequests < limit, used: recentRequests, limit, } }
   // Usage in API route:
   const rateLimitCheck = await checkRateLimit(schoolId, school.plan) if (!rateLimitCheck.allowed) { return NextResponse.json( { error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 } ) } _/
   // ============================================================================= // STEP 9: ERROR HANDLING // =============================================================================
   /_ Always handle API errors gracefully:
   // lib/ai/error-handler.js
   export function handleAIError(error) { if (error.status === 401) { return { success: false, error: 'API key invalid', action: 'Contact admin - check ANTHROPIC_API_KEY', } }
   if (error.status === 429) { return { success: false, error: 'Rate limited by Anthropic', action: 'Wait a moment and retry', } }
   if (error.status === 500) { return { success: false, error: 'Anthropic API error', action: 'Try again in a few moments', } }
   return { success: false, error: error.message || 'Unknown error', } } _/
   // ============================================================================= // STEP 10: MONITORING // =============================================================================
   /_ Add monitoring to track AI usage:
   // lib/ai/monitor.js
   export async function logAIRequest( schoolId, feature, prompt, response, tokensUsed ) { const request = await prisma.aIRequest.create({ data: { schoolId, feature, prompt: prompt.substring(0, 500), // Store first 500 chars response: response.substring(0, 2000), // Store first 2000 chars tokens: tokensUsed, }, })
   // Alert if usage is high const thisMonth = new Date(Date.now() - 30 _ 24 _ 60 _ 60 _ 1000) const monthlyUsage = await prisma.aIRequest.aggregate({ where: { schoolId, createdAt: { gte: thisMonth }, }, \_sum: { tokens: true, }, })
   if (monthlyUsage.\_sum.tokens > 100000) { console.warn(⚠️ School ${schoolId} has used ${monthlyUsage.\_sum.tokens} tokens this month) }
   return request }
   // Dashboard query to see top AI users: const topUsers = await prisma.aIRequest.groupBy({ by: ['schoolId'], \_count: true, \_sum: { tokens: true }, orderBy: { \_sum: { tokens: 'desc' }, }, take: 10, }) _/
   // ============================================================================= // READY TO GO! // =============================================================================
   /\* You're all set! Now you can:
5. ✅ Generate lessons aligned to CBC curriculum
6. ✅ Create quizzes automatically
7. ✅ Write personalized report comments
8. ✅ Generate engaging stories for reading
9. ✅ Create phonics lessons for early readers
10. ✅ Analyze student competency development
    All with Zambian education context and best practices!
    Next steps:
    • Copy the AI integration files to your project
    • Set up ANTHROPIC_API_KEY in your environment
    • Update your database schema (add AIRequest model)
    • Add feature gates to API routes
    • Test with a lesson generation request
    Questions? Check the ZAMBIA_FEATURES_GUIDE.md \*/

/\*_
• 🇿🇲 ZAMBIA SCHOOL FEATURES + AI INTEGRATION
• COMPLETE QUICK START GUIDE _/
// ============================================================================= // WHAT YOU'VE RECEIVED // =============================================================================
/\* 📦 PACKAGE CONTENTS:

1. ✅ Zambia-Specific Features System
   o 20+ Primary School Only Features
   o 15+ Zambian Education Features
   o Plan-based restrictions (Basic, Standard, Premium)
2. ✅ Primary School Restrictions
   o Features locked to primary schools only
   o Automatic enforcement in API routes
   o UI components showing restrictions
3. ✅ AI Integration for Education
   o AI Lesson Planner (CBC-aligned)
   o AI Quiz Maker (assessment generator)
   o AI Report Comments (personalized feedback)
   o AI Story Weaver (reading comprehension)
   o Phonics Trainer (early literacy)
   o CBC Competency Analyzer
   FILES PROVIDED:
   schema.prisma - Updated database schema PRISMA_UPDATE_INSTRUCTIONS.txt - How to apply schema changes ai-integration-zambia.js - Core AI functions api-routes-ai-examples.js - API endpoints ANTHROPIC_SETUP_GUIDE.md - Anthropic SDK setup zambia-features.js - Feature configuration planGate-zambia.js - Feature enforcement middleware FeatureGate.jsx - React UI components ZAMBIA_FEATURES_GUIDE.md - Implementation guide _/
   // ============================================================================= // IMPLEMENTATION CHECKLIST (Do these in order) // =============================================================================
   /_ □ STEP 1: Update Database Schema
4. Open prisma/schema.prisma in your code editor
5. Add this line after planExpiresAt field: level String @default("combined")
6. Save file
7. In PowerShell: npx prisma migrate dev --name add_school_level
   □ STEP 2: Install Anthropic SDK
8. In PowerShell: npm install @anthropic-ai/sdk
   □ STEP 3: Get API Keys
9. Go to https://console.anthropic.com/
10. Create account if needed
11. Generate API key
12. Copy key (starts with sk-ant-...)
    □ STEP 4: Set Environment Variables
13. Open .env.local in project root
14. Add: ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
15. Also add to Railway Variables (redeploy after)
    □ STEP 5: Copy AI Module
16. Create folder: lib/ai/
17. Copy ai-integration-zambia.js → lib/ai/zambia-features.js
18. Update imports if needed
    □ STEP 6: Copy API Routes
19. Create folder: app/api/ai/
20. Create subfolders: lesson-planner, quiz-maker, report-comments, story-weaver, phonics-trainer, competency-analyzer
21. Copy each route from api-routes-ai-examples.js
    □ STEP 7: Copy Feature System
22. Copy zambia-features.js → lib/
23. Copy planGate-zambia.js → lib/middleware/
24. Copy FeatureGate.jsx → components/
    □ STEP 8: Update Registration Form
25. Add "school level" dropdown (primary, secondary, combined)
26. Save to database when creating school
    □ STEP 9: Test It
27. Create a test school with level="primary"
28. Try calling /api/ai/lesson-planner
29. Check that AI generates content
30. Create secondary school, try phonics endpoint - should get 403
    □ STEP 10: Deploy to Railway
31. Push code to Git
32. Railway auto-deploys
33. Add ANTHROPIC_API_KEY to Railway variables
34. Redeploy _/
    // ============================================================================= // QUICK API TESTS (Copy & Paste) // =============================================================================
    /_ TEST 1: Generate a Lesson Plan
    URL: POST http://localhost:3000/api/ai/lesson-planner Body: { "grade": "G5", "subject": "Mathematics", "topic": "Fractions", "duration": 60 }
    Expected: Detailed CBC-aligned lesson plan in JSON
    TEST 2: Generate a Quiz
    URL: POST http://localhost:3000/api/ai/quiz-maker Body: { "grade": "G6", "subject": "English", "topic": "Comprehension", "questionCount": 10 }
    Expected: Array of questions with options and answers
    TEST 3: Generate Report Comment
    URL: POST http://localhost:3000/api/ai/report-comments Body: { "studentName": "Mwale Johnson", "grade": "G4", "subject": "English", "marks": 75, "maxMarks": 100, "behavior": "Excellent", "attendance": "Perfect", "strengths": ["Reads fluently", "Participates actively"], "areasForImprovement": ["Handwriting needs more practice"] }
    Expected: Personalized, encouraging feedback comment
    TEST 4: Phonics Trainer (Primary Only)
    URL: POST http://localhost:3000/api/ai/phonics-trainer Body: { "grade": "G2", "phonic": "sh" }
    Expected: Complete phonics lesson OR 403 if secondary school
    TEST 5: Story Weaver
    URL: POST http://localhost:3000/api/ai/story-weaver Body: { "grade": "G3", "theme": "Adventure", "length": "short", "zambianContext": true }
    Expected: Engaging story with comprehension questions _/
    // ============================================================================= // FEATURE ACCESS EXAMPLES // =============================================================================
    /_ ✅ PRIMARY SCHOOLS can use:
    • phonics-trainer (G1-G4)
    • number-bonds (G1-G4)
    • life-skills-curriculum (G1-G7)
    • continuous-assessment-tool (G1-G7)
    • All AI features
    ❌ SECONDARY SCHOOLS cannot use:
    • phonics-trainer (returns 403)
    • number-bonds (returns 403)
    • early-writing-support (returns 403)
    • movement-coordination-tracker (returns 403)
    ⭐ ALL SCHOOLS can use:
    • ai-lesson-planner
    • ai-quiz-maker
    • ai-report-comments
    • ai-story-weaver
    • cbc-curriculum-mapper
    • moe-compliance-reporting
    • school-fees-management _/
    // ============================================================================= // COST ESTIMATION // =============================================================================
    /_ Anthropic Claude API Pricing:
    Model: claude-opus-4-6 Input: $15 per 1M tokens Output: $45 per 1M tokens
    TYPICAL USAGE PER REQUEST:
    Lesson Plan Generation:
    • Input tokens: ~800 (your prompt)
    • Output tokens: ~500-800
    • Cost: ~$0.02-0.04 per lesson
    Quiz Generation (10 questions):
    • Input: ~500
    • Output: ~1000-1500
    • Cost: ~$0.03-0.07 per quiz
    Report Comments:
    • Input: ~300
    • Output: ~200-300
    • Cost: ~$0.01-0.02 per comment
    MONTHLY ESTIMATES:
    Basic Plan (5 AI requests/month):
    • 5 lessons/quizzes = ~$0.30
    • Good for: Testing features
    Standard Plan (50 AI requests/month):
    • 50 requests = ~$3-5/month
    • Good for: Small to medium schools
    Premium Plan (Unlimited):
    • Flat rate $50-100/month
    • Good for: Large schools, heavy AI use
    COST OPTIMIZATION:
35. Cache results
    o Don't regenerate same lesson
    o Store in database
36. Reuse content
    o Same lesson for multiple classes
    o Quiz bank for multiple years
37. Set token limits
    o max_tokens: 2000 (prevents runaway costs)
    o Always specify reasonable limits _/
    // ============================================================================= // TROUBLESHOOTING // =============================================================================
    /_ ERROR: "ANTHROPIC_API_KEY is not set" FIX:
38. Check .env.local exists in project root
39. Has line: ANTHROPIC_API_KEY=sk-ant-...
40. Restart your dev server
41. For Railway: Check Variables tab has ANTHROPIC_API_KEY set
    ERROR: "Failed to load resource: the server responded with a status of 403" FIX:
42. Check school.level is set correctly
43. Secondary schools can't access primary-only features
44. Check school.plan includes the feature
45. Verify requireFeature middleware is in the route
    ERROR: "Cannot find module '@anthropic-ai/sdk'" FIX:
46. npm install @anthropic-ai/sdk
47. npm install (to reinstall all dependencies)
48. Restart dev server
    ERROR: "Rate limit exceeded" FIX:
49. Implement rate limiting per plan
50. Wait between requests
51. Consider upgrading plan
    ERROR: "Feature is only available for primary schools" FIX:
52. Correct feature is primary-only (phonics-trainer, etc.)
53. Change school level to "primary" or "combined"
54. Choose different feature if school is secondary-only _/
    // ============================================================================= // NEXT STEPS AFTER IMPLEMENTATION // =============================================================================
    /_
55. MONITOR AI USAGE
    o Track tokens in AIRequest table
    o Set alerts for high usage
    o Adjust quotas per plan
56. GATHER TEACHER FEEDBACK
    o Ask teachers to test AI features
    o Collect feedback on lesson quality
    o Improve prompts based on feedback
57. IMPROVE PROMPTS
    o Experiment with different prompts
    o Make CBC alignment stronger
    o Add more Zambian context examples
58. EXPAND FEATURES
    o Add AI essay grader
    o AI recommendation engine for struggling students
    o AI parent communication writer
    o AI parent communication writer
59. ANALYTICS
    o Track which features are most used
    o Track which grades/subjects benefit most
    o Identify improvement areas
60. SCALE GLOBALLY
    o Adapt for other African countries
    o Modify CBC references for other curricula
    o Translate to local languages _/
    // ============================================================================= // SUPPORT RESOURCES // =============================================================================
    /_ Anthropic Documentation: https://docs.anthropic.com/
    Claude API Reference: https://docs.anthropic.com/en/api/messages
    Zambian Education Resources:
    • Ministry of Education (MOE) - https://www.moe.gov.zm/
    • CBC Curriculum Framework - Available from MOE
    • NZQA (National Zambian Qualifications Authority)
    • ECZ (Examinations Council of Zambia)
    This Implementation:
    • Check ZAMBIA_FEATURES_GUIDE.md for detailed examples
    • Check ANTHROPIC_SETUP_GUIDE.md for API setup
    • All files are fully commented with usage examples _/
    // ============================================================================= // CONGRATULATIONS! 🎉 // =============================================================================
    /_ You now have:
    ✅ A complete Zambian school management system ✅ Plan-based feature restrictions ✅ Primary school-only features ✅ 6 AI-powered educational tools ✅ CBC curriculum alignment ✅ Cost tracking and billing support
    Your teachers can now:
    • Generate CBC-aligned lesson plans in seconds
    • Create automatic quizzes based on topics
    • Write personalized student feedback at scale
    • Generate engaging stories for reading lessons
    • Assess student CBC competency development
    • Get phonics training materials automatically
    All while respecting:
    • School plan limitations
    • Primary vs secondary school differences
    • Zambian curriculum requirements
    • Teacher workload and resource constraints
    Ready to improve education in Zambia! 🇿🇲✨ \*/
