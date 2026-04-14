CREATE TABLE IF NOT EXISTS "SchoolRegistration" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "verificationToken" TEXT,
  "verificationExpiry" TIMESTAMP(3),
  "plan" TEXT,
  "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
  "paymentProvider" TEXT,
  "paymentReference" TEXT,
  "adminName" TEXT,
  "schoolName" TEXT,
  "subdomain" TEXT,
  "level" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchoolRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolRegistration_email_key" ON "SchoolRegistration"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "SchoolRegistration_verificationToken_key" ON "SchoolRegistration"("verificationToken");

