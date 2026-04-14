/\*\*

- FILE ORGANIZATION GUIDE
- Copy-paste this structure to know exactly where everything goes
  \*/

// =============================================================================
// YOUR PROJECT STRUCTURE (After implementation)
// =============================================================================

/_
school_management_systems/
│
├── prisma/
│ ├── schema.prisma ← UPDATE: Add AIUsageLog model + plan fields
│ └── migrations/
│ └── [date]\_add_ai_usage_and_plans/
│ └── migration.sql
│
├── app/
│ ├── api/
│ │ └── ai/
│ │ ├── story-weaver/
│ │ │ └── route.js ← CREATE (from document)
│ │ │
│ │ ├── lesson-planner/
│ │ │ └── route.js ← CREATE (from document)
│ │ │
│ │ ├── quiz-maker/
│ │ │ └── route.js ← CREATE (from document)
│ │ │
│ │ ├── report-comments/
│ │ │ └── route.js ← CREATE (from document)
│ │ │
│ │ └── ecz-practice/
│ │ └── route.js ← CREATE (from document)
│ │
│ └── dashboard/
│ ├── teacher/
│ │ ├── lesson-planner/
│ │ │ └── page.js ← CREATE (use example)
│ │ ├── story-weaver/
│ │ │ └── page.js ← CREATE (use example)
│ │ ├── quiz-maker/
│ │ │ └── page.js ← CREATE (use example)
│ │ └── report-comments/
│ │ └── page.js ← CREATE (use example)
│ │
│ └── student/
│ └── ecz-practice/
│ └── page.js ← CREATE (use example)
│
├── lib/
│ ├── middleware/
│ │ ├── aiUsageTracker.js ← CREATE (from document)
│ │ ├── planGate.js ← UPDATE: Use with AI features
│ │ └── auth.js ← EXISTS (needed by AI routes)
│ │
│ ├── zambia-features.js ← EXISTS (feature config)
│ └── prisma.js ← EXISTS (database client)
│
├── hooks/
│ ├── useAIStream.js ← CREATE (from document)
│ └── (other hooks...)
│
├── components/
│ ├── shared/
│ │ └── UpgradePrompt.js ← CREATE (from document)
│ │
│ ├── creative/
│ │ ├── AILessonPlanner.js ← CREATE (from document)
│ │ └── (other creative tools...)
│ │
│ └── FeatureGate.jsx ← EXISTS (used by AI pages)
│
├── .env.local ← UPDATE: Add ANTHROPIC_API_KEY
├── .env.example ← UPDATE: Document ANTHROPIC_API_KEY
│
└── package.json ← CHECK: Has @anthropic-ai/sdk dependency
_/

// =============================================================================
// EXACT FILE CONTENTS TO COPY
// =============================================================================

/\*
From the document you uploaded, here are all the files you need to create/update:

PRISMA SCHEMA ADDITIONS
───────────────────────
Location: prisma/schema.prisma

Find: "model School {"
Add these fields after "trialEndsAt":
aiUsageLogs AIUsageLog[]

Add this new model at the end of the file:
model AIUsageLog {
id String @id @default(cuid())
schoolId String
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)

    featureId String
    monthKey  String
    count     Int      @default(0)
    lastUsedAt DateTime @default(now())
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    @@unique([schoolId, monthKey, featureId])
    @@index([schoolId, monthKey])

}

API ROUTES (Copy exactly as shown)
──────────────────────────────────

1. app/api/ai/story-weaver/route.js
   Content: Copy from document "Story weaver route · JS" section

2. app/api/ai/lesson-planner/route.js
   Content: Copy from document "Lesson planner route · JS" section

3. app/api/ai/quiz-maker/route.js
   Content: Copy from document "Quiz maker route · JS" section

4. app/api/ai/report-comments/route.js
   Content: Copy from document "Report comments route · JS" section

5. app/api/ai/ecz-practice/route.js
   Content: Copy from document "Ecz practice route · JS" section

MIDDLEWARE & HOOKS
──────────────────

1. lib/middleware/aiUsageTracker.js
   Content: Copy from document "Aiusagetracker · JS" section

2. hooks/useAIStream.js
   Content: Copy from document "Useaistream · JS" section
   (Contains both useAIStream and useAIFetch)

UI COMPONENTS
─────────────

1. components/shared/UpgradePrompt.js
   Content: Copy from document "Upgradeprompt · JS" section

2. components/creative/AILessonPlanner.js
   Content: Copy from document "Ailessonplanner · JS" section
   (Use this as a template for other tools)

ENVIRONMENT VARIABLES
─────────────────────

.env.local
──────────
Add this line:
ANTHROPIC_API_KEY=sk-ant-YOUR_ACTUAL_API_KEY_HERE

.env.example (optional, for documentation)
──────────────────────────────────────────
Add this line:
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
\*/

// =============================================================================
// QUICK COPY-PASTE COMMANDS (PowerShell)
// =============================================================================

/\*

# If you want to create the folder structure quickly:

# Create API route folders

New-Item -ItemType Directory -Path "app/api/ai/story-weaver" -Force
New-Item -ItemType Directory -Path "app/api/ai/lesson-planner" -Force
New-Item -ItemType Directory -Path "app/api/ai/quiz-maker" -Force
New-Item -ItemType Directory -Path "app/api/ai/report-comments" -Force
New-Item -ItemType Directory -Path "app/api/ai/ecz-practice" -Force

# Create dashboard page folders

New-Item -ItemType Directory -Path "app/dashboard/teacher/lesson-planner" -Force
New-Item -ItemType Directory -Path "app/dashboard/teacher/story-weaver" -Force
New-Item -ItemType Directory -Path "app/dashboard/teacher/quiz-maker" -Force
New-Item -ItemType Directory -Path "app/dashboard/teacher/report-comments" -Force
New-Item -ItemType Directory -Path "app/dashboard/student/ecz-practice" -Force

# Create hooks folder if not exists

New-Item -ItemType Directory -Path "hooks" -Force

# Create components folders if not exists

New-Item -ItemType Directory -Path "components/shared" -Force
New-Item -ItemType Directory -Path "components/creative" -Force
\*/

// =============================================================================
// DEPENDENCIES CHECK
// =============================================================================

/\*
Make sure you have in package.json:

{
"dependencies": {
"@anthropic-ai/sdk": "^0.20.0+", ← Make sure this is installed
"next": "^14.0.0+",
"react": "^18.0.0+",
"prisma": "^5.0.0+",
"@prisma/client": "^5.0.0+",
// ... other dependencies
},
"devDependencies": {
"prisma": "^5.0.0+"
}
}

If @anthropic-ai/sdk is NOT listed, run:
npm install @anthropic-ai/sdk

If any other packages are missing, run:
npm install
\*/

// =============================================================================
// VALIDATION CHECKLIST
// =============================================================================

/\*
After copying all files, verify:

✅ Prisma Schema

- [ ] model AIUsageLog exists
- [ ] School has plan, planExpiresAt, trialEndsAt fields
- [ ] School has aiUsageLogs relation
- Command: npx prisma validate

✅ API Routes

- [ ] All 5 route files exist in app/api/ai/\*/route.js
- [ ] Each imports Anthropic correctly
- [ ] Each handles auth and feature gate
      Command: npm run build (should pass)

✅ Hooks & Components

- [ ] hooks/useAIStream.js exists with both functions
- [ ] components/shared/UpgradePrompt.js exists
- [ ] components/creative/AILessonPlanner.js exists
      Command: Check files with: Get-ChildItem hooks/useAIStream.js

✅ Environment Variables

- [ ] .env.local has ANTHROPIC_API_KEY set
- [ ] Value starts with "sk-ant-"
      Command: In code: console.log(process.env.ANTHROPIC_API_KEY?.substring(0,10))

✅ Database Migration

- [ ] Migration ran: npx prisma migrate dev --name add_ai_usage_and_plans
- [ ] No errors in output
- [ ] AIUsageLog table created
      Command: npx prisma studio (check tables)

✅ Tests & Lint

- [ ] npm test passes
- [ ] npm run lint has no errors
      Commands: npm test && npm run lint
      \*/

// =============================================================================
// QUICK DEPLOYMENT CHECKLIST
// =============================================================================

/\*
Before pushing to production:

1. ✅ All files created and no syntax errors
   npm run lint

2. ✅ Database migrations applied locally
   npx prisma migrate dev
   npx prisma studio (verify AIUsageLog table exists)

3. ✅ Tests pass
   npm test

4. ✅ Can build without errors
   npm run build

5. ✅ .env.local has ANTHROPIC_API_KEY
   Check: echo $env:ANTHROPIC_API_KEY

6. ✅ Features are gated properly
   - Check: getSchoolIdFromRequest
   - Check: requireFeature middleware
   - Check: aiUsageTracker.checkAILimit

7. ✅ Ready to deploy!
   git add .
   git commit -m "Add AI streaming features with usage tracking"
   git push

8. ✅ After deployment to Railway:
   - Add ANTHROPIC_API_KEY to Variables
   - Redeploy
   - Test /api/ai/story-weaver endpoint
   - Verify streaming works
     \*/

// =============================================================================
// BEFORE & AFTER COMPARISON
// =============================================================================

/\*
BEFORE:

- ❌ Story Weaver was placeholder
- ❌ Lesson Planner was placeholder
- ❌ Quiz Maker was placeholder
- ❌ Report Comments was placeholder
- ❌ ECZ Practice was placeholder
- ❌ No AI usage tracking
- ❌ No plan restrictions on AI
- ❌ No streaming (slow responses)

AFTER:

- ✅ Story Weaver: Real-time streaming + Zambian context
- ✅ Lesson Planner: Streaming ECZ-aligned lesson plans
- ✅ Quiz Maker: Generates structured quizzes
- ✅ Report Comments: Streams personalized feedback
- ✅ ECZ Practice: Past-paper style exam questions
- ✅ Usage Tracking: Counts requests per plan per month
- ✅ Plan Restrictions: Basic=0, Standard=50/month, Premium=unlimited
- ✅ Real-time Streaming: Text appears as it's generated (like ChatGPT)
- ✅ Error Handling: Upgrade prompts when hitting limits
- ✅ Zambian Alignment: All prompts reference Zambian curriculum

IMPROVEMENTS INCLUDED:

- ✅ Student subjects now display correctly
- ✅ Assessment tools fully implemented (Question Bank + Calendar)
- ✅ Teacher department shows correctly
- ✅ Gender-based titles (Mr/Mrs) implemented
  \*/

// =============================================================================
// NEED HELP?
// =============================================================================

/\*
If you get stuck on any step:

1. Check the COMPLETE_IMPLEMENTATION_CHECKLIST.md for detailed instructions
2. Review the exact code in the document for your specific file
3. Check the troubleshooting section for common errors
4. Verify database schema with: npx prisma studio
5. Check browser Network tab to see API responses
6. Check Railway logs for server-side errors

Most common issues:

- ANTHROPIC_API_KEY not set → Check .env.local and .env.local doesn't get committed
- Routes not found → Check file paths are exactly as specified
- Streaming not working → Check Content-Type headers match
- AI responses slow → Normal for first request, subsequent requests cached
- Usage not tracked → Check AIUsageLog table exists via prisma studio

You've got this! 🚀
\*/
