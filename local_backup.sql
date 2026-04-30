--
-- PostgreSQL database dump
--

\restrict VIvonwJ3TQoLyXVhHekfFJlCDAlM6PRPtUKSxuHggu9XtuvQc5sTzi1LV7kMf0i

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13 (Debian 16.13-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ConstraintScope; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ConstraintScope" AS ENUM (
    'TEACHER',
    'CLASS',
    'ROOM',
    'SCHOOL'
);


--
-- Name: ConstraintType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ConstraintType" AS ENUM (
    'HARD',
    'SOFT'
);


--
-- Name: RecipeBlockType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RecipeBlockType" AS ENUM (
    'SINGLE',
    'DOUBLE',
    'TRIPLE',
    'QUAD'
);


--
-- Name: RecipeConstraintType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RecipeConstraintType" AS ENUM (
    'HARD',
    'SOFT'
);


--
-- Name: RecipeStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RecipeStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'ARCHIVED'
);


--
-- Name: SubstitutionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SubstitutionStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: TimetableVersionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TimetableVersionStatus" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'ARCHIVED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AIRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AIRequest" (
    id text NOT NULL,
    "schoolId" text NOT NULL,
    feature text NOT NULL,
    prompt text NOT NULL,
    response text NOT NULL,
    tokens integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AIUsageLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AIUsageLog" (
    id text NOT NULL,
    "schoolId" text NOT NULL,
    "featureId" text NOT NULL,
    "monthKey" text NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    "lastUsedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Activity" (
    id text NOT NULL,
    "organizerId" text NOT NULL,
    "schoolId" text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    location text NOT NULL,
    type text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ActivityParticipant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ActivityParticipant" (
    id text NOT NULL,
    "activityId" text NOT NULL,
    "userId" text NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "schoolId" text NOT NULL
);


--
-- Name: Assessment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Assessment" (
    id text NOT NULL,
    title text NOT NULL,
    subject text NOT NULL,
    class text NOT NULL,
    "schoolId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    duration_minutes integer DEFAULT 60 NOT NULL,
    type text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "classId" text
);


--
-- Name: Assignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Assignment" (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    subject text NOT NULL,
    class text NOT NULL,
    "schoolId" text NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "teacherId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "classId" text
);


--
-- Name: AssignmentSubmission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AssignmentSubmission" (
    id text NOT NULL,
    "assignmentId" text NOT NULL,
    "studentId" text NOT NULL,
    "fileUrl" text,
    content text,
    grade double precision,
    feedback text,
    "submittedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status text DEFAULT 'submitted'::text NOT NULL,
    "schoolId" text NOT NULL
);


--
-- Name: Attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Attendance" (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "schoolId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    status text NOT NULL,
    remarks text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Badge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Badge" (
    id text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    icon text NOT NULL,
    category text NOT NULL,
    rarity text NOT NULL,
    "xpValue" integer DEFAULT 10 NOT NULL,
    "schoolId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: BookLoan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BookLoan" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "schoolId" text NOT NULL,
    "bookTitle" text NOT NULL,
    author text NOT NULL,
    isbn text,
    "borrowDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "returnDate" timestamp(3) without time zone,
    status text DEFAULT 'active'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Class; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Class" (
    id text NOT NULL,
    name text NOT NULL,
    year_group text NOT NULL,
    section text NOT NULL,
    "schoolId" text NOT NULL,
    "teacherId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Classroom; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Classroom" (
    id text NOT NULL,
    "schoolId" text NOT NULL,
    name text NOT NULL,
    capacity integer DEFAULT 0 NOT NULL,
    equipment text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Constraint; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Constraint" (
    id text NOT NULL,
    "schoolId" text NOT NULL,
    type public."ConstraintType" NOT NULL,
    scope public."ConstraintScope" NOT NULL,
    "targetId" text,
    priority integer DEFAULT 5 NOT NULL,
    config jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: CreativeFeature; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CreativeFeature" (
    id text NOT NULL,
    "featureId" text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    roles text[],
    difficulty text NOT NULL,
    "estimatedTime" text NOT NULL,
    "iconName" text NOT NULL,
    "schoolId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Department; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Department" (
    id text NOT NULL,
    name text NOT NULL,
    "schoolId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Feedback" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "schoolId" text NOT NULL,
    message text NOT NULL,
    category text,
    rating integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isPublic" boolean DEFAULT false NOT NULL
);


--
-- Name: FieldTrip; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FieldTrip" (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    location text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    type text NOT NULL,
    subject text NOT NULL,
    grade text NOT NULL,
    "imageUrl" text,
    thumbnail text,
    duration text,
    difficulty text,
    rating double precision DEFAULT 0 NOT NULL,
    participants integer DEFAULT 0 NOT NULL,
    stops jsonb,
    "learningObjectives" text[],
    resources text[],
    status text NOT NULL,
    "schoolId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Game; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Game" (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    type text NOT NULL,
    subject text,
    difficulty text NOT NULL,
    content jsonb NOT NULL,
    "schoolId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: GamificationProfile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GamificationProfile" (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "schoolId" text NOT NULL,
    points integer DEFAULT 0 NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    xp integer DEFAULT 0 NOT NULL,
    "nextLevelXp" integer DEFAULT 100 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Goal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Goal" (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "schoolId" text NOT NULL,
    title text NOT NULL,
    description text,
    deadline timestamp(3) without time zone,
    status text DEFAULT 'pending'::text NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    category text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: HeadOfDepartment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."HeadOfDepartment" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "schoolId" text NOT NULL,
    department text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "departmentId" text
);


--
-- Name: Note; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Note" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "schoolId" text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    tags text[],
    color text DEFAULT '#ffffff'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PupilSubjectEnrollment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PupilSubjectEnrollment" (
    id text NOT NULL,
    "schoolId" text NOT NULL,
    "pupilId" text NOT NULL,
    "subjectId" text NOT NULL,
    "classId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: RecipeBlock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RecipeBlock" (
    id text NOT NULL,
    "recipeId" text NOT NULL,
    type public."RecipeBlockType" NOT NULL,
    size integer NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    "placementPriority" integer DEFAULT 5 NOT NULL,
    "preferredDays" text[] DEFAULT ARRAY[]::text[],
    "preferredPeriods" integer[] DEFAULT ARRAY[]::integer[],
    "forbiddenDays" text[] DEFAULT ARRAY[]::text[],
    "forbiddenPeriods" integer[] DEFAULT ARRAY[]::integer[],
    "allowSplitAcrossBreaks" boolean DEFAULT false NOT NULL,
    "isLocked" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: RecipeConstraint; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RecipeConstraint" (
    id text NOT NULL,
    "recipeId" text NOT NULL,
    type public."RecipeConstraintType" NOT NULL,
    priority integer DEFAULT 5 NOT NULL,
    config jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Result; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Result" (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "subjectId" text NOT NULL,
    "schoolId" text NOT NULL,
    score double precision NOT NULL,
    grade text NOT NULL,
    term text NOT NULL,
    year integer NOT NULL,
    comments text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "enteredByUserId" text,
    "workflowStatus" text DEFAULT 'finalized'::text NOT NULL
);


--
-- Name: ResultsStatus; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ResultsStatus" (
    id text NOT NULL,
    "schoolId" text NOT NULL,
    "studentId" text NOT NULL,
    term text NOT NULL,
    year integer NOT NULL,
    "isComplete" boolean DEFAULT false NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "subjectsEnrolled" integer DEFAULT 0 NOT NULL,
    "subjectsFinalized" integer DEFAULT 0 NOT NULL,
    "smsSending" boolean DEFAULT false NOT NULL,
    "smsSentAt" timestamp(3) without time zone,
    "smsLastError" text,
    "smsLastAttemptAt" timestamp(3) without time zone,
    "lastEvaluatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: SchedulingRecipe; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SchedulingRecipe" (
    id text NOT NULL,
    "schoolId" text NOT NULL,
    "teachingAssignmentId" text NOT NULL,
    "teacherId" text NOT NULL,
    "subjectId" text NOT NULL,
    "classId" text NOT NULL,
    status public."RecipeStatus" DEFAULT 'DRAFT'::public."RecipeStatus" NOT NULL,
    season text,
    "seasonVariantOfId" text,
    "expectedPeriodsPerWeek" integer,
    "placementPriority" integer DEFAULT 5 NOT NULL,
    "isValid" boolean DEFAULT false NOT NULL,
    "validationErrors" jsonb,
    "validatedAt" timestamp(3) without time zone,
    "createdByUserId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: School; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."School" (
    id text NOT NULL,
    name text NOT NULL,
    subdomain text NOT NULL,
    domain text,
    active boolean DEFAULT true NOT NULL,
    timezone text DEFAULT 'Africa/Lusaka'::text NOT NULL,
    currency text DEFAULT 'ZMW'::text NOT NULL,
    "academicYear" text,
    email text,
    phone text,
    address text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isPubliclyListed" boolean DEFAULT false NOT NULL,
    "emailVerified" boolean DEFAULT false NOT NULL,
    "verificationToken" text,
    "verificationExpiry" timestamp(3) without time zone,
    plan text DEFAULT 'trial'::text NOT NULL,
    "planExpiresAt" timestamp(3) without time zone,
    "trialEndsAt" timestamp(3) without time zone,
    level text DEFAULT 'combined'::text NOT NULL,
    logo_url text
);


--
-- Name: StrategicGoal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StrategicGoal" (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'not_started'::text NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    "dueDate" timestamp(3) without time zone,
    "schoolId" text NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: StrategicReview; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StrategicReview" (
    id text NOT NULL,
    title text NOT NULL,
    notes text,
    "scheduledAt" timestamp(3) without time zone NOT NULL,
    "schoolId" text NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Student; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Student" (
    id text NOT NULL,
    "userId" text,
    name text NOT NULL,
    "schoolId" text NOT NULL,
    class text NOT NULL,
    exam_number text,
    previous_school text,
    grade_average double precision,
    selected_subjects text[],
    parent_father_name text,
    parent_father_contact text,
    parent_father_email text,
    parent_mother_name text,
    parent_mother_contact text,
    parent_mother_email text,
    guardian_name text,
    guardian_contact text,
    guardian_email text,
    guardian_relationship text,
    guardian_address text,
    emergency_contact_name text,
    emergency_contact_phone text,
    emergency_contact_relationship text,
    emergency_contact_address text,
    blood_type text,
    medical_aid_scheme text,
    medical_aid_number text,
    family_doctor_name text,
    family_doctor_contact text,
    medical_conditions text,
    allergies text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "faceEmbedding" text,
    "classId" text
);


--
-- Name: StudentBadge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StudentBadge" (
    id text NOT NULL,
    "studentId" text,
    "profileId" text NOT NULL,
    "badgeId" text NOT NULL,
    "schoolId" text NOT NULL,
    "awardedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: StudentGame; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StudentGame" (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "gameId" text NOT NULL,
    "schoolId" text NOT NULL,
    score integer NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    "playedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: StudentMaterial; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StudentMaterial" (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "studyMaterialId" text NOT NULL,
    "schoolId" text NOT NULL,
    "isBookmarked" boolean DEFAULT false NOT NULL,
    "isDownloaded" boolean DEFAULT false NOT NULL,
    downloads integer DEFAULT 0 NOT NULL,
    "lastAccessed" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: StudentWork; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StudentWork" (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "schoolId" text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    type text NOT NULL,
    "fileUrl" text,
    "thumbnailUrl" text,
    likes integer DEFAULT 0 NOT NULL,
    views integer DEFAULT 0 NOT NULL,
    "isPublic" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: StudyMaterial; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StudyMaterial" (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    type text NOT NULL,
    subject text NOT NULL,
    "fileUrl" text NOT NULL,
    "uploadDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    size text,
    tags text[],
    "schoolId" text NOT NULL
);


--
-- Name: Subject; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Subject" (
    id text NOT NULL,
    name text NOT NULL,
    code text,
    topics text[],
    "schoolId" text NOT NULL,
    "teacherId" text,
    "classId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Substitution; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Substitution" (
    id text NOT NULL,
    "schoolId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "slotId" text NOT NULL,
    "originalTeacherId" text NOT NULL,
    "coverTeacherId" text NOT NULL,
    status public."SubstitutionStatus" DEFAULT 'PENDING'::public."SubstitutionStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Teacher; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Teacher" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "schoolId" text NOT NULL,
    department text,
    specialization text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "assignedSubjects" text[],
    qualifications text,
    ts_number text
);


--
-- Name: TeacherAllocation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TeacherAllocation" (
    id text NOT NULL,
    "schoolId" text NOT NULL,
    "hodId" text NOT NULL,
    "teacherId" text NOT NULL,
    "subjectId" text NOT NULL,
    "classId" text NOT NULL,
    "periodsPerWeek" integer NOT NULL,
    "blockType" text NOT NULL,
    "singlePeriods" integer DEFAULT 0 NOT NULL,
    "doublePeriods" integer DEFAULT 0 NOT NULL,
    "triplePeriods" integer DEFAULT 0 NOT NULL,
    term text DEFAULT 'Term 1'::text NOT NULL,
    "academicYear" text DEFAULT '2025'::text NOT NULL,
    notes text,
    status text DEFAULT 'draft'::text NOT NULL,
    "pushedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TeacherDepartment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TeacherDepartment" (
    "teacherId" text NOT NULL,
    "departmentId" text NOT NULL
);


--
-- Name: TeacherPeriodAssignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TeacherPeriodAssignment" (
    id text NOT NULL,
    "schoolId" text NOT NULL,
    "teacherId" text NOT NULL,
    "timeSlotId" text NOT NULL,
    "lockedForGeneration" boolean DEFAULT true NOT NULL,
    notes text,
    "createdBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TeacherTermProgress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TeacherTermProgress" (
    id text NOT NULL,
    "teacherId" text NOT NULL,
    "schoolId" text NOT NULL,
    year integer NOT NULL,
    term integer NOT NULL,
    "cpdHours" integer DEFAULT 0 NOT NULL,
    "cpdTargetHours" integer DEFAULT 10 NOT NULL,
    "schemeSubmitted" boolean DEFAULT false NOT NULL,
    "recordsSubmitted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TeachingAssignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TeachingAssignment" (
    id text NOT NULL,
    "schoolId" text NOT NULL,
    "teacherId" text NOT NULL,
    "subjectId" text NOT NULL,
    "classId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TimeSlot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TimeSlot" (
    id text NOT NULL,
    "schoolId" text NOT NULL,
    "dayOfWeek" text NOT NULL,
    "startTime" text NOT NULL,
    "endTime" text NOT NULL,
    period integer NOT NULL,
    "isBreak" boolean DEFAULT false NOT NULL,
    label text,
    "breakName" text,
    "breakDuration" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TimetableAllocationEntry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TimetableAllocationEntry" (
    id text NOT NULL,
    "schoolId" text NOT NULL,
    "allocationId" text NOT NULL,
    "teacherId" text NOT NULL,
    "subjectId" text NOT NULL,
    "classId" text NOT NULL,
    "dayOfWeek" text NOT NULL,
    "startTime" text NOT NULL,
    "endTime" text NOT NULL,
    "durationMin" integer NOT NULL,
    "periodType" text NOT NULL,
    "periodNumber" integer NOT NULL,
    term text NOT NULL,
    "academicYear" text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    "publishedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TimetableConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TimetableConfig" (
    id text NOT NULL,
    "schoolId" text NOT NULL,
    "startTime" text DEFAULT '07:00'::text NOT NULL,
    "endTime" text DEFAULT '18:00'::text NOT NULL,
    "singleDuration" integer DEFAULT 40 NOT NULL,
    term text DEFAULT 'Term 1'::text NOT NULL,
    "academicYear" text DEFAULT '2025'::text NOT NULL,
    "workingDays" text[] DEFAULT ARRAY[]::text[],
    "breakSlots" jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TimetableEntry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TimetableEntry" (
    id text NOT NULL,
    "schoolId" text NOT NULL,
    "versionId" text NOT NULL,
    "timeSlotId" text NOT NULL,
    "teacherId" text,
    "classId" text,
    "subjectId" text,
    "teachingAssignmentId" text,
    "classroomId" text,
    "isLockedPeriodAssignment" boolean DEFAULT false NOT NULL,
    "solvedByAlgorithm" boolean DEFAULT false NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TimetableNotification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TimetableNotification" (
    id text NOT NULL,
    "schoolId" text NOT NULL,
    "fromUserId" text NOT NULL,
    "toUserId" text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    department text,
    term text,
    read boolean DEFAULT false NOT NULL,
    "readAt" timestamp(3) without time zone,
    meta jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TimetableVersion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TimetableVersion" (
    id text NOT NULL,
    "schoolId" text NOT NULL,
    status public."TimetableVersionStatus" DEFAULT 'DRAFT'::public."TimetableVersionStatus" NOT NULL,
    "generationStatus" text DEFAULT 'NOT_STARTED'::text,
    "seasonId" text,
    season text,
    "solverScore" double precision,
    "solverStats" jsonb,
    "periodAssignmentsLocked" integer,
    "totalPeriodsNeeded" integer,
    name text,
    "createdByUserId" text,
    "publishedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    "schoolId" text NOT NULL,
    contact_number text,
    address text,
    date_of_birth timestamp(3) without time zone,
    gender text,
    profile_picture_url text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "employeeId" text,
    "resetToken" text,
    "resetTokenExpiry" timestamp(3) without time zone
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Data for Name: AIRequest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AIRequest" (id, "schoolId", feature, prompt, response, tokens, "createdAt") FROM stdin;
\.


--
-- Data for Name: AIUsageLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AIUsageLog" (id, "schoolId", "featureId", "monthKey", count, "lastUsedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Activity; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Activity" (id, "organizerId", "schoolId", title, description, date, location, type, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ActivityParticipant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ActivityParticipant" (id, "activityId", "userId", role, "joinedAt", "schoolId") FROM stdin;
\.


--
-- Data for Name: Assessment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Assessment" (id, title, subject, class, "schoolId", date, duration_minutes, type, description, "createdAt", "updatedAt", "classId") FROM stdin;
925b9339-84a9-4c59-b231-3e7afe7894a1	Mid-Term Math Exam	Mathematics	Form 1A	3ce87283-13b2-44b3-8cf4-b53c43abd754	2025-06-01 00:00:00	90	exam	Covers Algebra and Geometry.	2026-04-20 01:06:24.44	2026-04-20 01:06:24.44	\N
9814b5ee-d8f9-46a7-b973-5147575d8b13	Science Quiz: Biology	Science	Form 1A	3ce87283-13b2-44b3-8cf4-b53c43abd754	2025-05-20 00:00:00	30	quiz	Focus on Cell Biology.	2026-04-20 01:06:24.465	2026-04-20 01:06:24.465	\N
443e8ab2-dc9f-457a-92b8-47af9eab49b3	English Essay	English Language	Form 1A	3ce87283-13b2-44b3-8cf4-b53c43abd754	2025-05-25 00:00:00	60	assignment	Write an essay about your favorite book.	2026-04-20 01:06:24.469	2026-04-20 01:06:24.469	\N
1b3e5246-34cc-4133-aa26-c0baca0c4a3d	Mid-Term Math Exam	Mathematics	Form 1A	3ce87283-13b2-44b3-8cf4-b53c43abd754	2025-06-01 00:00:00	90	exam	Covers Algebra and Geometry.	2026-04-20 01:06:48.629	2026-04-20 01:06:48.629	\N
e3cfac8f-4179-4a3e-ad9e-4546792ebaec	Science Quiz: Biology	Science	Form 1A	3ce87283-13b2-44b3-8cf4-b53c43abd754	2025-05-20 00:00:00	30	quiz	Focus on Cell Biology.	2026-04-20 01:06:48.638	2026-04-20 01:06:48.638	\N
a1aafffe-82cb-4e0c-8808-ae150a3cc7ac	English Essay	English Language	Form 1A	3ce87283-13b2-44b3-8cf4-b53c43abd754	2025-05-25 00:00:00	60	assignment	Write an essay about your favorite book.	2026-04-20 01:06:48.643	2026-04-20 01:06:48.643	\N
2667f9b5-9809-4963-903d-a69aa917f94d	Mid-Term Math Exam	Mathematics	Form 1A	3ce87283-13b2-44b3-8cf4-b53c43abd754	2025-06-01 00:00:00	90	exam	Covers Algebra and Geometry.	2026-04-20 01:07:27.961	2026-04-20 01:07:27.961	\N
0e9cd960-708f-4cd1-9cec-6d3938514e77	Science Quiz: Biology	Science	Form 1A	3ce87283-13b2-44b3-8cf4-b53c43abd754	2025-05-20 00:00:00	30	quiz	Focus on Cell Biology.	2026-04-20 01:07:27.966	2026-04-20 01:07:27.966	\N
f2ec7cd6-bc47-407b-ad3b-1de20e49e868	English Essay	English Language	Form 1A	3ce87283-13b2-44b3-8cf4-b53c43abd754	2025-05-25 00:00:00	60	assignment	Write an essay about your favorite book.	2026-04-20 01:07:27.969	2026-04-20 01:07:27.969	\N
4308bf0a-71a6-42f9-be8a-a2747544873b	Mid-Term Math Exam	Mathematics	Form 1A	3ce87283-13b2-44b3-8cf4-b53c43abd754	2025-06-01 00:00:00	90	exam	Covers Algebra and Geometry.	2026-04-30 18:29:42.17	2026-04-30 18:29:42.17	\N
aea64748-6642-4ab1-9523-c265baff641c	Science Quiz: Biology	Science	Form 1A	3ce87283-13b2-44b3-8cf4-b53c43abd754	2025-05-20 00:00:00	30	quiz	Focus on Cell Biology.	2026-04-30 18:29:42.191	2026-04-30 18:29:42.191	\N
86b3a2e3-8a56-4223-bb4b-c15a5a8e7e90	English Essay	English Language	Form 1A	3ce87283-13b2-44b3-8cf4-b53c43abd754	2025-05-25 00:00:00	60	assignment	Write an essay about your favorite book.	2026-04-30 18:29:42.197	2026-04-30 18:29:42.197	\N
\.


--
-- Data for Name: Assignment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Assignment" (id, title, description, subject, class, "schoolId", "dueDate", "teacherId", "createdAt", "updatedAt", "classId") FROM stdin;
ff6ddc02-702f-4e89-90c2-7128121a3a3e	Algebra Problem Set 1	Complete problems 1-20 from Chapter 3	Mathematics	Form 1A	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-27 01:06:24.86	\N	2026-04-20 01:06:24.867	2026-04-20 01:06:24.867	\N
44519759-c671-4fc9-acbc-819f99251bf0	Essay: The Great Gatsby	Write a 500-word essay on the themes of the novel	English Literature	Form 1A	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-18 01:06:24.86	\N	2026-04-20 01:06:24.878	2026-04-20 01:06:24.878	\N
635b1370-34a8-4392-aa57-acfb490fea7b	Physics Lab Report	Submit report for the pendulum experiment	Physics	Form 1A	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-23 01:06:24.86	\N	2026-04-20 01:06:24.883	2026-04-20 01:06:24.883	\N
\.


--
-- Data for Name: AssignmentSubmission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AssignmentSubmission" (id, "assignmentId", "studentId", "fileUrl", content, grade, feedback, "submittedAt", status, "schoolId") FROM stdin;
f42d7458-5d59-4f13-8996-81c70cf55c8e	635b1370-34a8-4392-aa57-acfb490fea7b	STU2025000	\N	Here is my lab report...	\N	\N	2026-04-20 01:06:24.889	submitted	3ce87283-13b2-44b3-8cf4-b53c43abd754
\.


--
-- Data for Name: Attendance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Attendance" (id, "studentId", "schoolId", date, status, remarks, "createdAt", "updatedAt") FROM stdin;
95b0b46f-93f3-4c54-8d43-9651bd7c338a	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-10 00:00:00	present	\N	2026-04-20 01:06:24.814	2026-04-30 18:29:42.725
3f2304c6-1205-40e7-ab6c-a13e87f67ac3	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-09 00:00:00	present	\N	2026-04-20 01:06:24.818	2026-04-30 18:29:42.73
cb29ab57-c1ec-4355-b7c8-5efdfebaaa1e	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-08 00:00:00	present	\N	2026-04-20 01:06:24.821	2026-04-30 18:29:42.735
f98ccd99-981f-4295-9137-1231a18c1e6e	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-07 00:00:00	absent	Sick leave	2026-04-20 01:06:24.824	2026-04-30 18:29:42.739
75cc0972-9ee9-4e21-bea4-6d4c77240b99	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-06 00:00:00	present	\N	2026-04-20 01:06:24.827	2026-04-30 18:29:42.743
39ed3678-0a0d-45f5-ba0c-1c34dff38dd7	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-03 00:00:00	present	\N	2026-04-20 01:06:24.83	2026-04-30 18:29:42.748
ca564e6d-0efe-4c11-bcae-3d92333684f1	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-02 00:00:00	late	Bus delay	2026-04-20 01:06:24.833	2026-04-30 18:29:42.754
bc8a45f4-db99-43fc-9619-795eec96772a	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-01 00:00:00	absent	Sick leave	2026-04-20 01:06:24.835	2026-04-30 18:29:42.76
ea0a62aa-dee8-4854-a4e9-edd00db2aaa5	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-03-31 00:00:00	present	\N	2026-04-20 01:06:24.839	2026-04-20 01:07:28.239
6ef3efcb-2a4e-4978-a7e7-d71ecc2bfe7d	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-03-30 00:00:00	present	\N	2026-04-20 01:06:24.842	2026-04-20 01:07:28.243
e39bfab7-289a-4f25-af10-8e119dbcc9c5	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-03-27 00:00:00	present	\N	2026-04-20 01:06:24.845	2026-04-20 01:07:28.246
5c11ccfb-a074-4526-a81a-5c15d6b27755	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-03-26 00:00:00	present	\N	2026-04-20 01:06:24.847	2026-04-20 01:07:28.249
ee27b7a7-01bb-4c92-bc58-f9d086312722	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-03-25 00:00:00	present	\N	2026-04-20 01:06:24.851	2026-04-20 01:07:28.252
9f603069-8721-4abd-941a-b34d8b35167c	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-03-24 00:00:00	present	\N	2026-04-20 01:06:24.855	2026-04-20 01:07:28.255
a52f9cb7-2a48-4592-8745-93e3b17d5c3b	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-03-23 00:00:00	present	\N	2026-04-20 01:06:24.859	2026-04-20 01:07:28.259
cmoltj8tg000011mvt541ghn3	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-30 00:00:00	present	\N	2026-04-30 18:29:42.629	2026-04-30 18:29:42.629
cmoltj8u0000111mvsugo0j3s	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-29 00:00:00	present	\N	2026-04-30 18:29:42.65	2026-04-30 18:29:42.65
cmoltj8ua000211mvdwehtopu	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-28 00:00:00	late	Bus delay	2026-04-30 18:29:42.658	2026-04-30 18:29:42.658
cmoltj8uj000311mvcupyadlx	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-27 00:00:00	present	\N	2026-04-30 18:29:42.667	2026-04-30 18:29:42.667
cmoltj8uq000411mv7p4vztli	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-24 00:00:00	present	\N	2026-04-30 18:29:42.674	2026-04-30 18:29:42.674
cmoltj8uw000511mv34gt5260	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-23 00:00:00	absent	Sick leave	2026-04-30 18:29:42.68	2026-04-30 18:29:42.68
cmoltj8v1000611mvvyhmwnz3	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-22 00:00:00	present	\N	2026-04-30 18:29:42.685	2026-04-30 18:29:42.685
cmoltj8v6000711mvfo08ewbl	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-21 00:00:00	present	\N	2026-04-30 18:29:42.69	2026-04-30 18:29:42.69
8f81db3b-b037-4fd8-a75e-4f6f3aa4430d	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 00:00:00	present	\N	2026-04-20 01:06:24.783	2026-04-30 18:29:42.695
97e9427f-5ce2-40d8-bfc0-cf30e53ae43d	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-17 00:00:00	present	\N	2026-04-20 01:06:24.797	2026-04-30 18:29:42.701
9f4346d5-7ba4-4a83-9168-786cdd2c97ae	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-16 00:00:00	present	\N	2026-04-20 01:06:24.802	2026-04-30 18:29:42.705
8c23fb1f-dd11-47b1-8b86-0f150750c32d	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-15 00:00:00	present	\N	2026-04-20 01:06:24.805	2026-04-30 18:29:42.709
7dcdb80e-76a4-443d-bb87-086ad1daa138	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-14 00:00:00	late	Bus delay	2026-04-20 01:06:24.809	2026-04-30 18:29:42.715
16db58d0-00fa-4219-abd9-b807aaa57c23	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-13 00:00:00	present	\N	2026-04-20 01:06:24.811	2026-04-30 18:29:42.72
\.


--
-- Data for Name: Badge; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Badge" (id, name, description, icon, category, rarity, "xpValue", "schoolId", "createdAt", "updatedAt") FROM stdin;
d3a0e875-cd81-4ca6-95e2-1d4e29261d51	First Steps	Complete your first game	TARGET	academic	common	10	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:24.974	2026-04-20 01:06:24.974
4e5ffc11-bad4-4ba8-a2ca-c6e36ace905c	Perfect Score	Get 100% on any game	STAR	academic	rare	50	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:24.981	2026-04-20 01:06:24.981
a0507a8a-9c30-49a2-a5bd-1a83b5bc1695	Speed Demon	Complete a game in under 5 minutes	SPEED	academic	epic	30	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:24.987	2026-04-20 01:06:24.987
\.


--
-- Data for Name: BookLoan; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."BookLoan" (id, "userId", "schoolId", "bookTitle", author, isbn, "borrowDate", "dueDate", "returnDate", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Class; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Class" (id, name, year_group, section, "schoolId", "teacherId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Classroom; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Classroom" (id, "schoolId", name, capacity, equipment, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Constraint; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Constraint" (id, "schoolId", type, scope, "targetId", priority, config, active, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: CreativeFeature; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CreativeFeature" (id, "featureId", name, description, category, roles, difficulty, "estimatedTime", "iconName", "schoolId", "createdAt", "updatedAt") FROM stdin;
c9de25ab-af68-44a8-b51a-197b27607b0a	interactive_whiteboard	Interactive Whiteboard	Digital canvas for real-time collaboration	creative	{teacher,student}	Beginner	Instant	PenTool	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:25.046	2026-04-20 01:06:25.046
0e991828-2777-4039-a28e-3efcfc8e34ac	ai_story_generator	AI Story Weaver	Collaborative storytelling with AI assistance	creative	{student}	Intermediate	15-30 mins	BookOpen	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:25.056	2026-04-20 01:06:25.056
832aa820-0a8e-4504-8011-2f5c2cbdd653	virtual_lab	Virtual Science Lab	Simulated experiments in a safe environment	stem	{student,teacher}	Advanced	45 mins	FlaskConical	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:25.059	2026-04-20 01:06:25.059
da76fdbd-323a-4a7e-a81d-820cf9bdf258	code_playground	Code Playground	Interactive coding environment with instant feedback	stem	{student}	Intermediate	Flexible	Code	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:25.063	2026-04-20 01:06:25.063
d0f1acc3-ab59-43ff-9f2d-2977cfe14665	music_composer	Digital Music Composer	Create and mix music tracks	creative	{student}	Beginner	20 mins	Music	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:25.068	2026-04-20 01:06:25.068
a48111b0-3f61-4ca2-9a13-ff2b8e774f15	3d_modeler	3D Shape Builder	Build and visualize 3D geometric shapes	stem	{student}	Advanced	30 mins	Box	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:25.073	2026-04-20 01:06:25.073
\.


--
-- Data for Name: Department; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Department" (id, name, "schoolId", "createdAt", "updatedAt") FROM stdin;
19c0346c-c7e7-4777-8778-e64bf92a3bfc	Mathematics	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-30 20:04:56.951	2026-04-30 20:04:56.951
54e88501-c25c-46c7-b1d4-c91a34b7f742	Languages	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-30 20:04:56.951	2026-04-30 20:04:56.951
2e2ed3ae-30e9-4b9d-b0e8-24b83320c24a	Natural Sciences	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-30 20:04:56.951	2026-04-30 20:04:56.951
e0f736b0-5fd6-4262-bca1-90eeb0f9f68d	Home Economics	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-30 20:04:56.951	2026-04-30 20:04:56.951
29fea1ab-08e8-4f63-870b-c9b752a80303	Technical Studies	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-30 20:04:56.951	2026-04-30 20:04:56.951
8bd15c7e-179a-4dd7-a2f1-05da9fcedf27	Commercial Studies	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-30 20:04:56.951	2026-04-30 20:04:56.951
0209a4ba-7a66-4502-a371-0c7504d0b5a8	Social Sciences	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-30 20:04:56.951	2026-04-30 20:04:56.951
25884a0a-16bd-4881-a351-960255689a90	Arts and Design	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-30 20:04:56.951	2026-04-30 20:04:56.951
9bca1a22-fa54-427a-b1d6-a21b9ee6bb03	Technology	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-30 20:04:56.951	2026-04-30 20:04:56.951
\.


--
-- Data for Name: Feedback; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Feedback" (id, "userId", "schoolId", message, category, rating, "createdAt", "isPublic") FROM stdin;
\.


--
-- Data for Name: FieldTrip; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FieldTrip" (id, title, description, location, date, type, subject, grade, "imageUrl", thumbnail, duration, difficulty, rating, participants, stops, "learningObjectives", resources, status, "schoolId", "createdAt", "updatedAt") FROM stdin;
d2516c30-4d47-46df-8380-bba043f17796	Virtual Museum Tour	Explore the Louvre Museum from your classroom.	Paris, France (Virtual)	2025-05-15 00:00:00	virtual	Art and Design	All	https://images.unsplash.com/photo-1499856871940-a09e32842449?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80	\N	\N	\N	0	0	\N	\N	\N	upcoming	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:24.356	2026-04-20 01:06:24.356
388fdd11-e291-429f-b743-0d346dbfc94d	Mars Rover Expedition	A virtual journey across the surface of Mars.	Mars (Virtual)	2025-06-10 00:00:00	virtual	Science	Form 1	https://images.unsplash.com/photo-1614728853980-40bc488f1d48?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80	\N	\N	\N	0	0	\N	\N	\N	upcoming	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:24.429	2026-04-20 01:06:24.429
ea4ae246-47df-4215-9c27-49087d1f07c7	Ancient Egypt Walkthrough	Walk through the pyramids of Giza.	Cairo, Egypt (Virtual)	2025-07-20 00:00:00	virtual	History	Form 2	https://images.unsplash.com/photo-1539650116455-251d9a0d63f6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80	\N	\N	\N	0	0	\N	\N	\N	upcoming	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:24.434	2026-04-20 01:06:24.434
28c44d8c-7d82-437f-9ad6-17d3732e962e	Space Station Visit	Tour the International Space Station	Low Earth Orbit	2026-05-20 01:06:25.031	virtual	Science	Form 1	https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=1000	\N	\N	\N	0	0	[{"id": 1, "image": "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=1000", "title": "Control Room", "audioUrl": "", "description": "Where operations happen"}, {"id": 2, "image": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1000", "title": "Observation Deck", "audioUrl": "", "description": "View of Earth"}]	\N	\N	upcoming	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:25.037	2026-04-20 01:06:25.037
f2bcd6d1-ca33-4bc7-9ff1-b42621927d8c	Virtual Museum Tour	Explore the Louvre Museum from your classroom.	Paris, France (Virtual)	2025-05-15 00:00:00	virtual	Art and Design	All	https://images.unsplash.com/photo-1499856871940-a09e32842449?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80	\N	\N	\N	0	0	\N	\N	\N	upcoming	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:48.609	2026-04-20 01:06:48.609
2537d593-eb9a-4b5b-b25f-d025be6f17a1	Mars Rover Expedition	A virtual journey across the surface of Mars.	Mars (Virtual)	2025-06-10 00:00:00	virtual	Science	Form 1	https://images.unsplash.com/photo-1614728853980-40bc488f1d48?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80	\N	\N	\N	0	0	\N	\N	\N	upcoming	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:48.619	2026-04-20 01:06:48.619
051af059-2048-476f-995b-878701d74c00	Ancient Egypt Walkthrough	Walk through the pyramids of Giza.	Cairo, Egypt (Virtual)	2025-07-20 00:00:00	virtual	History	Form 2	https://images.unsplash.com/photo-1539650116455-251d9a0d63f6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80	\N	\N	\N	0	0	\N	\N	\N	upcoming	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:48.624	2026-04-20 01:06:48.624
83d4ed97-8b5c-4168-9138-01acffc2d077	Virtual Museum Tour	Explore the Louvre Museum from your classroom.	Paris, France (Virtual)	2025-05-15 00:00:00	virtual	Art and Design	All	https://images.unsplash.com/photo-1499856871940-a09e32842449?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80	\N	\N	\N	0	0	\N	\N	\N	upcoming	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:07:27.947	2026-04-20 01:07:27.947
30b9e81f-9b91-4e02-b341-94dfaae1bce9	Mars Rover Expedition	A virtual journey across the surface of Mars.	Mars (Virtual)	2025-06-10 00:00:00	virtual	Science	Form 1	https://images.unsplash.com/photo-1614728853980-40bc488f1d48?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80	\N	\N	\N	0	0	\N	\N	\N	upcoming	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:07:27.953	2026-04-20 01:07:27.953
2ad05229-3f0e-431d-8331-70a96e5d556a	Ancient Egypt Walkthrough	Walk through the pyramids of Giza.	Cairo, Egypt (Virtual)	2025-07-20 00:00:00	virtual	History	Form 2	https://images.unsplash.com/photo-1539650116455-251d9a0d63f6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80	\N	\N	\N	0	0	\N	\N	\N	upcoming	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:07:27.956	2026-04-20 01:07:27.956
52174f7c-a62f-43f7-adeb-3d98c5ed5bcf	Virtual Museum Tour	Explore the Louvre Museum from your classroom.	Paris, France (Virtual)	2025-05-15 00:00:00	virtual	Art and Design	All	https://images.unsplash.com/photo-1499856871940-a09e32842449?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80	\N	\N	\N	0	0	\N	\N	\N	upcoming	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-30 18:29:42.127	2026-04-30 18:29:42.127
a9685663-ec5d-4e0a-bf7e-2fc9486f4641	Mars Rover Expedition	A virtual journey across the surface of Mars.	Mars (Virtual)	2025-06-10 00:00:00	virtual	Science	Form 1	https://images.unsplash.com/photo-1614728853980-40bc488f1d48?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80	\N	\N	\N	0	0	\N	\N	\N	upcoming	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-30 18:29:42.151	2026-04-30 18:29:42.151
ab5108c7-35b3-41d7-af4b-6840e740de3b	Ancient Egypt Walkthrough	Walk through the pyramids of Giza.	Cairo, Egypt (Virtual)	2025-07-20 00:00:00	virtual	History	Form 2	https://images.unsplash.com/photo-1539650116455-251d9a0d63f6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80	\N	\N	\N	0	0	\N	\N	\N	upcoming	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-30 18:29:42.159	2026-04-30 18:29:42.159
\.


--
-- Data for Name: Game; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Game" (id, title, description, type, subject, difficulty, content, "schoolId", "createdAt", "updatedAt") FROM stdin;
53ffa622-d56d-4734-8e26-1f1e7cf7604d	Math Quest: Algebra	Solve algebraic equations to unlock the treasure.	puzzle	Mathematics	medium	{"levels": 10, "timeLimit": 300}	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:24.314	2026-04-20 01:06:24.314
e2fdd22e-9d2d-4382-84db-a55ccd2e3994	Science Explorer: Cells	Explore the inner workings of a cell.	challenge	Science	easy	{"mode": "exploration"}	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:24.349	2026-04-20 01:06:24.349
0b117136-b173-4d35-a7b1-5b8f608889f0	History Time Travel	Travel back in time to ancient civilizations.	quiz	History	hard	{"questions": 20}	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:24.353	2026-04-20 01:06:24.353
0eb7120b-1100-486d-84f1-79791a4e6c04	Math Quiz	Algebra basics	quiz	Mathematics	medium	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:25.014	2026-04-20 01:06:25.014
8e8508ec-b610-4194-8923-718d87278031	Vocab Blast	English vocabulary	quiz	English Language	easy	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:25.026	2026-04-20 01:06:25.026
21c5f1ac-a37b-4790-a680-90bfe18d24d8	Math Quest: Algebra	Solve algebraic equations to unlock the treasure.	puzzle	Mathematics	medium	{"levels": 10, "timeLimit": 300}	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:48.589	2026-04-20 01:06:48.589
4ffc9b62-50c0-481e-b819-2fd88272af8f	Science Explorer: Cells	Explore the inner workings of a cell.	challenge	Science	easy	{"mode": "exploration"}	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:48.599	2026-04-20 01:06:48.599
60c31e51-ce2f-45a6-8317-6b5b5d13f0e9	History Time Travel	Travel back in time to ancient civilizations.	quiz	History	hard	{"questions": 20}	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:48.604	2026-04-20 01:06:48.604
7ec90ee6-9979-49e6-a635-8200825ed5be	Math Quest: Algebra	Solve algebraic equations to unlock the treasure.	puzzle	Mathematics	medium	{"levels": 10, "timeLimit": 300}	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:07:27.931	2026-04-20 01:07:27.931
abcdd4df-6f72-41c8-8026-9a880261c52d	Science Explorer: Cells	Explore the inner workings of a cell.	challenge	Science	easy	{"mode": "exploration"}	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:07:27.938	2026-04-20 01:07:27.938
1aa22788-ee8d-4dfd-a6b3-030229bc5a8a	History Time Travel	Travel back in time to ancient civilizations.	quiz	History	hard	{"questions": 20}	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:07:27.943	2026-04-20 01:07:27.943
4fafda1a-5543-4045-a12f-cb3da32f6ea0	Math Quest: Algebra	Solve algebraic equations to unlock the treasure.	puzzle	Mathematics	medium	{"levels": 10, "timeLimit": 300}	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-30 18:29:42.051	2026-04-30 18:29:42.051
f658c7be-7844-40eb-9972-b7b59d065d4c	Science Explorer: Cells	Explore the inner workings of a cell.	challenge	Science	easy	{"mode": "exploration"}	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-30 18:29:42.102	2026-04-30 18:29:42.102
0096ad46-8920-4737-8bd6-32fc5029003c	History Time Travel	Travel back in time to ancient civilizations.	quiz	History	hard	{"questions": 20}	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-30 18:29:42.111	2026-04-30 18:29:42.111
\.


--
-- Data for Name: GamificationProfile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GamificationProfile" (id, "studentId", "schoolId", points, level, xp, "nextLevelXp", "createdAt", "updatedAt") FROM stdin;
3496bc59-b33d-40c8-aa31-c5afc79caf45	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	1250	8	1250	1600	2026-04-20 01:06:24.926	2026-04-20 01:06:24.926
\.


--
-- Data for Name: Goal; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Goal" (id, "studentId", "schoolId", title, description, deadline, status, progress, category, "createdAt", "updatedAt") FROM stdin;
897234ac-ceb7-410e-9424-eacdd4f7eb73	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	Achieve A Grade in Mathematics	Improve mathematics performance to achieve an A grade by end of term	\N	in_progress	75	academic	2026-04-20 01:06:24.764	2026-04-20 01:06:24.764
9567e699-6a70-4c7c-bfb5-d7b6db464547	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	Read 20 Books This Year	Expand knowledge and improve reading comprehension	\N	in_progress	40	personal	2026-04-20 01:06:24.778	2026-04-20 01:06:24.778
\.


--
-- Data for Name: HeadOfDepartment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."HeadOfDepartment" (id, "userId", "schoolId", department, "createdAt", "updatedAt", "departmentId") FROM stdin;
\.


--
-- Data for Name: Note; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Note" (id, "userId", "schoolId", title, content, tags, color, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PupilSubjectEnrollment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PupilSubjectEnrollment" (id, "schoolId", "pupilId", "subjectId", "classId", "createdAt") FROM stdin;
\.


--
-- Data for Name: RecipeBlock; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RecipeBlock" (id, "recipeId", type, size, quantity, "placementPriority", "preferredDays", "preferredPeriods", "forbiddenDays", "forbiddenPeriods", "allowSplitAcrossBreaks", "isLocked", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: RecipeConstraint; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RecipeConstraint" (id, "recipeId", type, priority, config, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Result; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Result" (id, "studentId", "subjectId", "schoolId", score, grade, term, year, comments, "createdAt", "updatedAt", "enteredByUserId", "workflowStatus") FROM stdin;
\.


--
-- Data for Name: ResultsStatus; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ResultsStatus" (id, "schoolId", "studentId", term, year, "isComplete", "completedAt", "subjectsEnrolled", "subjectsFinalized", "smsSending", "smsSentAt", "smsLastError", "smsLastAttemptAt", "lastEvaluatedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SchedulingRecipe; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SchedulingRecipe" (id, "schoolId", "teachingAssignmentId", "teacherId", "subjectId", "classId", status, season, "seasonVariantOfId", "expectedPeriodsPerWeek", "placementPriority", "isValid", "validationErrors", "validatedAt", "createdByUserId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: School; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."School" (id, name, subdomain, domain, active, timezone, currency, "academicYear", email, phone, address, "createdAt", "updatedAt", "isPubliclyListed", "emailVerified", "verificationToken", "verificationExpiry", plan, "planExpiresAt", "trialEndsAt", level, logo_url) FROM stdin;
b09c2a20-cbc7-4884-990b-a2154414cb92	Demo High School	demo-school	demo-school.bluepeacktechnologies.com	t	Africa/Lusaka	ZMW	2024/2025	admin@demo-school.edu	+260 xxx xxx xxx	Lusaka, Zambia	2026-04-20 00:24:31.988	2026-04-20 00:51:46.983	f	f	\N	\N	trial	\N	\N	combined	\N
25e31e5c-13fd-46ec-a403-fa10e6c1a498	Zambian School Management System	zambian-school	zambian-school.bluepeacktechnologies.com	t	Africa/Lusaka	ZMW	2024/2025	admin@zambian-school.edu	+260 xxx xxx xxx	Lusaka, Zambia	2026-04-20 00:24:32.909	2026-04-20 00:51:47.93	f	f	\N	\N	trial	\N	\N	combined	\N
c25d24b1-40fa-491e-bec3-afc9ad8ea567	Ndake Day Secondary School	ndakedaysecondaryschool	ndakedaysecondaryschool.bluepeacktechnologies.com	t	Africa/Lusaka	ZMW	2026	admin@ndakedaysecondaryschool.edu	0977994626	P.O. Box 570070 Nyimba District Eastern Province	2026-04-20 00:24:32.926	2026-04-20 00:51:47.947	f	f	\N	\N	trial	\N	\N	combined	/Assets/logo.jpg
413d8c29-5586-41f5-9171-2aff463b3075	Kalambakuwa Day Secondary School	kalambakuwadaysecondaryschool	kalambakuwadaysecondaryschool.bluepeacktechnologies.com	t	Africa/Lusaka	ZMW	2026	admin@kalambakuwadaysecondaryschool.edu	0976984221	P.O. Box 570003 Nyimba District Eastern Province	2026-04-20 00:24:32.942	2026-04-20 00:51:47.96	f	f	\N	\N	trial	\N	\N	combined	\N
3ce87283-13b2-44b3-8cf4-b53c43abd754	Demo International School	demo	demo.school.com	t	UTC	USD	2025/2026	admin@demo.school.com	\N	\N	2026-04-20 01:06:23.664	2026-04-30 18:29:41.198	f	t	\N	\N	premium	2027-04-20 01:06:21.921	\N	combined	\N
\.


--
-- Data for Name: StrategicGoal; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StrategicGoal" (id, title, description, status, progress, "dueDate", "schoolId", "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StrategicReview; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StrategicReview" (id, title, notes, "scheduledAt", "schoolId", "createdById", "createdAt") FROM stdin;
\.


--
-- Data for Name: Student; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Student" (id, "userId", name, "schoolId", class, exam_number, previous_school, grade_average, selected_subjects, parent_father_name, parent_father_contact, parent_father_email, parent_mother_name, parent_mother_contact, parent_mother_email, guardian_name, guardian_contact, guardian_email, guardian_relationship, guardian_address, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, emergency_contact_address, blood_type, medical_aid_scheme, medical_aid_number, family_doctor_name, family_doctor_contact, medical_conditions, allergies, "createdAt", "updatedAt", "faceEmbedding", "classId") FROM stdin;
STU2025000	e9ac941e-afb4-4348-9b12-ed68d91d253f	Student Demo	3ce87283-13b2-44b3-8cf4-b53c43abd754	Form 1A	EXAM2025000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-20 01:06:24.278	2026-04-20 01:06:24.278	\N	\N
STU2025001	\N	Student 1 (Form 1A)	3ce87283-13b2-44b3-8cf4-b53c43abd754	Form 1A	EXAM2025001	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-20 01:06:24.673	2026-04-20 01:06:24.673	\N	\N
STU2025002	\N	Student 2 (Form 1A)	3ce87283-13b2-44b3-8cf4-b53c43abd754	Form 1A	EXAM2025002	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-20 01:06:24.678	2026-04-20 01:06:24.678	\N	\N
STU2025003	\N	Student 3 (Form 1A)	3ce87283-13b2-44b3-8cf4-b53c43abd754	Form 1A	EXAM2025003	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-20 01:06:24.682	2026-04-20 01:06:24.682	\N	\N
STU2025004	\N	Student 4 (Form 1A)	3ce87283-13b2-44b3-8cf4-b53c43abd754	Form 1A	EXAM2025004	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-20 01:06:24.686	2026-04-20 01:06:24.686	\N	\N
STU2025005	\N	Student 5 (Form 1A)	3ce87283-13b2-44b3-8cf4-b53c43abd754	Form 1A	EXAM2025005	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-20 01:06:24.69	2026-04-20 01:06:24.69	\N	\N
STU2025006	\N	Student 6 (Form 1A)	3ce87283-13b2-44b3-8cf4-b53c43abd754	Form 1A	EXAM2025006	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-20 01:06:24.694	2026-04-20 01:06:24.694	\N	\N
STU2025007	\N	Student 7 (Form 1A)	3ce87283-13b2-44b3-8cf4-b53c43abd754	Form 1A	EXAM2025007	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-20 01:06:24.7	2026-04-20 01:06:24.7	\N	\N
STU2025008	\N	Student 8 (Form 1A)	3ce87283-13b2-44b3-8cf4-b53c43abd754	Form 1A	EXAM2025008	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-20 01:06:24.705	2026-04-20 01:06:24.705	\N	\N
STU2025009	\N	Student 9 (Form 1A)	3ce87283-13b2-44b3-8cf4-b53c43abd754	Form 1A	EXAM2025009	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-20 01:06:24.709	2026-04-20 01:06:24.709	\N	\N
STU2025010	\N	Student 10 (Form 1A)	3ce87283-13b2-44b3-8cf4-b53c43abd754	Form 1A	EXAM2025010	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-20 01:06:24.714	2026-04-20 01:06:24.714	\N	\N
STU2025011	\N	Student 11 (Form 1A)	3ce87283-13b2-44b3-8cf4-b53c43abd754	Form 1A	EXAM2025011	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-20 01:06:24.72	2026-04-20 01:06:24.72	\N	\N
STU2025012	\N	Student 12 (Form 1A)	3ce87283-13b2-44b3-8cf4-b53c43abd754	Form 1A	EXAM2025012	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-20 01:06:24.725	2026-04-20 01:06:24.725	\N	\N
STU2025013	\N	Student 13 (Form 1A)	3ce87283-13b2-44b3-8cf4-b53c43abd754	Form 1A	EXAM2025013	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-20 01:06:24.731	2026-04-20 01:06:24.731	\N	\N
STU2025014	\N	Student 14 (Form 1A)	3ce87283-13b2-44b3-8cf4-b53c43abd754	Form 1A	EXAM2025014	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-20 01:06:24.738	2026-04-20 01:06:24.738	\N	\N
STU2025015	\N	Student 15 (Form 1A)	3ce87283-13b2-44b3-8cf4-b53c43abd754	Form 1A	EXAM2025015	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-20 01:06:24.744	2026-04-20 01:06:24.744	\N	\N
\.


--
-- Data for Name: StudentBadge; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StudentBadge" (id, "studentId", "profileId", "badgeId", "schoolId", "awardedAt") FROM stdin;
beec320f-a000-496e-bc5a-7bbc960f5a34	\N	3496bc59-b33d-40c8-aa31-c5afc79caf45	d3a0e875-cd81-4ca6-95e2-1d4e29261d51	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:24.997
3203227c-6511-434f-b0b1-0558d4c6fdbf	\N	3496bc59-b33d-40c8-aa31-c5afc79caf45	4e5ffc11-bad4-4ba8-a2ca-c6e36ace905c	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:25.005
47f33e85-d9b3-4a3c-b699-722ec777a9a3	\N	3496bc59-b33d-40c8-aa31-c5afc79caf45	a0507a8a-9c30-49a2-a5bd-1a83b5bc1695	3ce87283-13b2-44b3-8cf4-b53c43abd754	2026-04-20 01:06:25.008
\.


--
-- Data for Name: StudentGame; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StudentGame" (id, "studentId", "gameId", "schoolId", score, completed, "playedAt") FROM stdin;
9639c764-1265-4b85-abf6-9adb4a0e765b	STU2025000	0eb7120b-1100-486d-84f1-79791a4e6c04	3ce87283-13b2-44b3-8cf4-b53c43abd754	62	t	2026-04-20 01:06:25.016
1dab23a1-5460-42a7-815b-ac1646dc7b05	STU2025000	8e8508ec-b610-4194-8923-718d87278031	3ce87283-13b2-44b3-8cf4-b53c43abd754	46	t	2026-04-20 01:06:25.028
185fa1c1-3012-4a31-a26b-7d8e9ba055c7	STU2025000	0eb7120b-1100-486d-84f1-79791a4e6c04	3ce87283-13b2-44b3-8cf4-b53c43abd754	23	t	2026-04-20 01:06:48.99
55f1a27a-b5af-4d7e-b204-450a6e2dd14a	STU2025000	8e8508ec-b610-4194-8923-718d87278031	3ce87283-13b2-44b3-8cf4-b53c43abd754	89	t	2026-04-20 01:06:48.996
2c8d7e63-be48-4b6e-8607-252328ca8aa1	STU2025000	0eb7120b-1100-486d-84f1-79791a4e6c04	3ce87283-13b2-44b3-8cf4-b53c43abd754	24	t	2026-04-20 01:07:28.3
d6fb2ab0-eea2-4be5-9f9d-0f870094ff07	STU2025000	8e8508ec-b610-4194-8923-718d87278031	3ce87283-13b2-44b3-8cf4-b53c43abd754	8	t	2026-04-20 01:07:28.307
580cc810-4c67-43d4-8e47-c8ccb8df3b64	STU2025000	0eb7120b-1100-486d-84f1-79791a4e6c04	3ce87283-13b2-44b3-8cf4-b53c43abd754	67	t	2026-04-30 18:29:42.912
4b10a11f-1caf-4cbf-977e-a60d98a03edc	STU2025000	8e8508ec-b610-4194-8923-718d87278031	3ce87283-13b2-44b3-8cf4-b53c43abd754	62	t	2026-04-30 18:29:42.924
\.


--
-- Data for Name: StudentMaterial; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StudentMaterial" (id, "studentId", "studyMaterialId", "schoolId", "isBookmarked", "isDownloaded", downloads, "lastAccessed") FROM stdin;
\.


--
-- Data for Name: StudentWork; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StudentWork" (id, "studentId", "schoolId", title, description, type, "fileUrl", "thumbnailUrl", likes, views, "isPublic", "createdAt", "updatedAt") FROM stdin;
0c087269-e2bb-4d9d-99c1-1cc3e5538d9a	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	Solar System Model	3D model of the solar system using recycled materials	science	\N	\N	24	156	t	2026-04-20 01:06:24.905	2026-04-20 01:06:24.905
c3cfc1de-5e12-46a0-a961-78bb9edfeebf	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	Abstract Painting	Exploration of colors and emotions	art	\N	\N	45	230	t	2026-04-20 01:06:24.916	2026-04-20 01:06:24.916
2df9ad71-e07f-4ef5-8389-f8a34c9ee78f	STU2025000	3ce87283-13b2-44b3-8cf4-b53c43abd754	Python Calculator	Simple calculator app built with Python	coding	\N	\N	12	89	t	2026-04-20 01:06:24.923	2026-04-20 01:06:24.923
\.


--
-- Data for Name: StudyMaterial; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StudyMaterial" (id, title, description, type, subject, "fileUrl", "uploadDate", size, tags, "schoolId") FROM stdin;
\.


--
-- Data for Name: Subject; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Subject" (id, name, code, topics, "schoolId", "teacherId", "classId", "createdAt", "updatedAt") FROM stdin;
4c370713-05ef-4b2c-958a-83e1fb07a736	Science	SCI	{Biology,Physics,Chemistry,Environment}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.504	2026-04-30 18:29:42.264
9fdbf13e-7870-495f-a744-998da0d2c515	ICT	ICT	{"Computer Basics",Programming,Networking,"Digital Literacy"}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.516	2026-04-30 18:29:42.282
1261f816-dc0f-456d-9eef-8786436c3a3a	History	HIST	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.524	2026-04-30 18:29:42.291
c381518f-2558-43c2-843d-ad62154df9e3	Geography	GEO	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.53	2026-04-30 18:29:42.301
328bc19d-aecd-4f92-85dd-e8ec31182a87	Religious Education	RE	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.536	2026-04-30 18:29:42.31
9fb41085-c678-42a9-bbaa-55711f7e4094	Physical Education	PE	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.541	2026-04-30 18:29:42.317
5705b842-90c9-42bc-9113-870764815d4c	Physics	PHY	{Mechanics,Thermodynamics,Optics,Electricity}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.547	2026-04-30 18:29:42.325
038fab94-c980-49fe-a37e-d0c7cf219d9a	Chemistry	CHEM	{"Organic Chemistry","Inorganic Chemistry","Physical Chemistry"}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.553	2026-04-30 18:29:42.336
13611199-55ce-4ca1-ae1b-3ccb2afb884f	Biology	BIO	{"Cell Biology",Genetics,Ecology,"Human Physiology"}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.559	2026-04-30 18:29:42.345
fd862005-f8a1-4822-a16c-9d3603bab1bd	Accounting	ACC	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.564	2026-04-30 18:29:42.353
8e0ae729-1856-42f3-85a6-ec0e564857a1	Business Studies	BUS	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.569	2026-04-30 18:29:42.361
a02dada3-511e-4ba7-9e41-3d0ecf7d2a40	Economics	ECO	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.574	2026-04-30 18:29:42.368
f9c48716-9f52-45d9-b887-1d222d29849f	English Literature	LIT	{Shakespeare,"Modern Drama",Poetry,Novels}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.579	2026-04-30 18:29:42.378
2ddf9d44-0225-48ba-940f-e7810192e5ef	Shona	SHO	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.584	2026-04-30 18:29:42.385
e82d637e-8883-42fd-b6ee-11205d7fc7ac	Ndebele	NDE	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.588	2026-04-30 18:29:42.393
f9fdea08-c355-489c-9eea-7825da1ef105	French	FRE	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.593	2026-04-30 18:29:42.401
49604ca3-2d62-47d5-95d0-db556f0bdb5a	Art and Design	ART	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.599	2026-04-30 18:29:42.408
a0196929-4332-4ccf-8eef-f4c3ca5ab573	Music	MUS	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.604	2026-04-30 18:29:42.416
4727c938-6f05-443d-8e10-292a8b950133	Drama/Theatre Arts	DRA	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.609	2026-04-30 18:29:42.424
4e9230fc-da14-442a-9ebf-12718f76add0	Information Technology	IT	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.613	2026-04-30 18:29:42.432
cb9d183b-c3fb-4cc2-9600-b5d61322bc12	Design and Technology	DT	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.618	2026-04-30 18:29:42.445
fbd0c7b2-3e37-435f-927c-433ad6c77062	Computer Studies	CS	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.623	2026-04-30 18:29:42.452
f75119fa-f706-40e0-8a5d-9637d532b753	Commerce	COM	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.627	2026-04-30 18:29:42.459
9dda403c-8627-4e26-abce-2d732ab9b8e6	Food and Nutrition	FN	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.631	2026-04-30 18:29:42.467
968480f6-5153-407d-8d91-26ca6a68191e	Fashion and Fabrics	FF	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.635	2026-04-30 18:29:42.473
d646e95f-ef83-4765-970f-526bf7a4dca0	Woodwork	WW	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.638	2026-04-30 18:29:42.481
c3468262-836d-4498-9ccf-0f7b270436e3	Metalwork	MW	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.642	2026-04-30 18:29:42.487
faac74a2-8a43-405e-87f4-0b2a52863faa	Civic Education	CIV	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.644	2026-04-30 18:29:42.494
fe7d9b7f-5cea-4f5e-aa64-007d7d5bc0e6	Zambian Languages	ZAM	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.647	2026-04-30 18:29:42.5
5a30bb5b-84f5-4614-bc21-3fdd3607cc12	Creative & Technology Studies	CTS	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.651	2026-04-30 18:29:42.506
031bf06b-82a4-47e4-8fc6-cf77eb01dfc7	Home Economics	HE	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.654	2026-04-30 18:29:42.514
efd3ce32-01ef-4e1b-984e-452eac9c8e16	Additional Mathematics	ADDM	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.657	2026-04-30 18:29:42.521
e40b9542-8334-41f6-ab8e-ef89db31662a	Statistics	STAT	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.659	2026-04-30 18:29:42.528
3a004ba8-e634-4475-b70b-b29815aa154f	Psychology	PSY	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.662	2026-04-30 18:29:42.536
d9762717-2b90-4b91-bf15-e9f6c2093bde	Sociology	SOC	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.665	2026-04-30 18:29:42.542
19619bd2-1cf7-4841-9256-c3ca5018ce66	General Science	GENS	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.669	2026-04-30 18:29:42.549
b030458b-2601-49e5-bd2a-adb235a81718	Principles of Accounts	POA	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:22:28.721	2026-04-20 01:22:28.721
d465ce9a-b9fe-4f02-945a-05dc3917669c	Agriculture Science	AGRI	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:22:28.721	2026-04-20 01:22:28.721
06342dd8-331b-4a98-806d-608432650bd8	Social Studies	SST	{History,Civics,Geography,Economics}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.51	2026-04-30 18:29:42.273
06f3fb68-ba33-45d3-b5ce-8dc9ca597607	Chichewa	CHI	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:22:28.721	2026-04-20 01:22:28.721
22829b0b-a272-49e2-934d-9015fe704ab3	Chitonga	TON	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:22:28.721	2026-04-20 01:22:28.721
effa35e4-401d-426a-9a91-8f27a4599578	Luvale	LUV	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:22:28.721	2026-04-20 01:22:28.721
3c255894-b7b3-4139-bc2a-7cdc5a9c79bc	Lunda	LUN	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:22:28.721	2026-04-20 01:22:28.721
79aa5dd7-2893-4ae3-8622-765d51f5700b	Kikaonde	KIK	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:22:28.721	2026-04-20 01:22:28.721
61647b90-65dd-427b-b85d-405d5e6866d4	Bemba	BEM	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:22:28.721	2026-04-20 01:22:28.721
b048e7b2-c898-4a05-8c74-ebfb5e193525	Silozi	SIL	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:22:28.721	2026-04-20 01:22:28.721
ce8e131c-af75-4ac3-b9f0-5337e60938d2	Chinese	CHI_CHI	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:22:28.721	2026-04-20 01:22:28.721
6d61a4fb-0a2c-42d6-ad6c-f36ecde764ff	Home Management	HM	{}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:22:28.721	2026-04-20 01:22:28.721
d7c45b4f-b0cd-465d-9d25-61a3e88491c1	Mathematics	MATH	{Algebra,Geometry,Calculus,Statistics}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.481	2026-04-30 18:29:42.236
2d9349e2-9b8d-4836-9f12-a7eee685a1c5	English Language	ENG	{Grammar,Composition,Comprehension,Literature}	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.498	2026-04-30 18:29:42.253
\.


--
-- Data for Name: Substitution; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Substitution" (id, "schoolId", date, "slotId", "originalTeacherId", "coverTeacherId", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Teacher; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Teacher" (id, "userId", "schoolId", department, specialization, "createdAt", "updatedAt", "assignedSubjects", qualifications, ts_number) FROM stdin;
f66436d1-2cd1-47cc-9202-4874ef98ae9d	c5dcdb66-de2c-4459-aefb-0f85cf5ef45c	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	2026-04-20 01:06:24.216	2026-04-20 01:06:24.216	\N	\N	\N
\.


--
-- Data for Name: TeacherAllocation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TeacherAllocation" (id, "schoolId", "hodId", "teacherId", "subjectId", "classId", "periodsPerWeek", "blockType", "singlePeriods", "doublePeriods", "triplePeriods", term, "academicYear", notes, status, "pushedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TeacherDepartment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TeacherDepartment" ("teacherId", "departmentId") FROM stdin;
\.


--
-- Data for Name: TeacherPeriodAssignment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TeacherPeriodAssignment" (id, "schoolId", "teacherId", "timeSlotId", "lockedForGeneration", notes, "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TeacherTermProgress; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TeacherTermProgress" (id, "teacherId", "schoolId", year, term, "cpdHours", "cpdTargetHours", "schemeSubmitted", "recordsSubmitted", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TeachingAssignment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TeachingAssignment" (id, "schoolId", "teacherId", "subjectId", "classId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TimeSlot; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TimeSlot" (id, "schoolId", "dayOfWeek", "startTime", "endTime", period, "isBreak", label, "breakName", "breakDuration", "createdAt", "updatedAt") FROM stdin;
e786b301-15cb-429c-8c80-0828ce93bac1	b09c2a20-cbc7-4884-990b-a2154414cb92	monday	07:45	08:25	2	f	Period 2	\N	\N	2026-04-20 00:24:48.149	2026-04-20 00:51:53.735
74a0baaf-5837-4663-b002-fa0de1a2942e	b09c2a20-cbc7-4884-990b-a2154414cb92	monday	08:30	09:10	3	f	Period 3	\N	\N	2026-04-20 00:24:48.156	2026-04-20 00:51:53.743
ec6fb10e-d642-4b7d-8870-381ab1275634	b09c2a20-cbc7-4884-990b-a2154414cb92	monday	09:15	09:55	4	f	Period 4	\N	\N	2026-04-20 00:24:48.163	2026-04-20 00:51:53.749
147271bf-36c4-4dd1-8953-053264cf8d65	b09c2a20-cbc7-4884-990b-a2154414cb92	monday	10:15	10:55	6	f	Period 5	\N	\N	2026-04-20 00:24:48.178	2026-04-20 00:51:53.763
11266264-ddfd-4ed4-b024-2f63905fe6f9	b09c2a20-cbc7-4884-990b-a2154414cb92	monday	11:00	11:40	7	f	Period 6	\N	\N	2026-04-20 00:24:48.186	2026-04-20 00:51:53.769
a53d0cda-84a2-4adb-b6b3-f4a9bbb60e06	b09c2a20-cbc7-4884-990b-a2154414cb92	monday	11:45	12:25	8	f	Period 7	\N	\N	2026-04-20 00:24:48.192	2026-04-20 00:51:53.775
d1beb946-0eb8-4fab-a6af-5fba103f3312	b09c2a20-cbc7-4884-990b-a2154414cb92	monday	12:30	13:10	9	f	Period 8	\N	\N	2026-04-20 00:24:48.198	2026-04-20 00:51:53.781
0f1c606e-0efe-4bb0-ab6a-79e204c076d9	b09c2a20-cbc7-4884-990b-a2154414cb92	monday	13:10	14:00	10	t	Lunch Break	Lunch Break	50	2026-04-20 00:24:48.205	2026-04-20 00:51:53.787
6e32bab9-3a55-495d-a04f-70a1dc1651a9	b09c2a20-cbc7-4884-990b-a2154414cb92	monday	14:00	14:40	11	f	Period 9	\N	\N	2026-04-20 00:24:48.211	2026-04-20 00:51:53.793
7c0672ff-a7c7-4bf2-b3c8-5eac041ebd2e	b09c2a20-cbc7-4884-990b-a2154414cb92	monday	14:45	15:25	12	f	Period 10	\N	\N	2026-04-20 00:24:48.218	2026-04-20 00:51:53.801
c042f709-b570-44bc-9c1a-7cf5b6b12481	b09c2a20-cbc7-4884-990b-a2154414cb92	monday	15:30	16:10	13	f	Period 11	\N	\N	2026-04-20 00:24:48.225	2026-04-20 00:51:53.806
b6307728-57d9-4918-be77-56dbce121cd2	b09c2a20-cbc7-4884-990b-a2154414cb92	monday	16:15	16:55	14	f	Period 12	\N	\N	2026-04-20 00:24:48.231	2026-04-20 00:51:53.813
7f4007ad-0fa8-44d3-b1f7-5f9dcd05a3a5	b09c2a20-cbc7-4884-990b-a2154414cb92	tuesday	07:00	07:40	1	f	Period 1	\N	\N	2026-04-20 00:24:48.238	2026-04-20 00:51:53.819
9829452c-74df-46fa-ba08-e97569eecc08	b09c2a20-cbc7-4884-990b-a2154414cb92	tuesday	07:45	08:25	2	f	Period 2	\N	\N	2026-04-20 00:24:48.245	2026-04-20 00:51:53.824
1eb986ba-28fc-49bb-84f9-ca151d78d8ab	b09c2a20-cbc7-4884-990b-a2154414cb92	tuesday	08:30	09:10	3	f	Period 3	\N	\N	2026-04-20 00:24:48.251	2026-04-20 00:51:53.831
50e251b0-6aa0-4b81-9e11-806798658285	b09c2a20-cbc7-4884-990b-a2154414cb92	tuesday	09:15	09:55	4	f	Period 4	\N	\N	2026-04-20 00:24:48.258	2026-04-20 00:51:53.837
2c15cc48-a10d-4ad3-a3e0-2d0ff8199678	b09c2a20-cbc7-4884-990b-a2154414cb92	tuesday	09:55	10:15	5	t	Morning Break	Morning Break	20	2026-04-20 00:24:48.265	2026-04-20 00:51:53.844
2c5e4dc1-bc34-46f9-a488-03690f42f2ef	b09c2a20-cbc7-4884-990b-a2154414cb92	tuesday	10:15	10:55	6	f	Period 5	\N	\N	2026-04-20 00:24:48.271	2026-04-20 00:51:53.849
7e566cd3-c046-4bce-967e-6126623ef539	b09c2a20-cbc7-4884-990b-a2154414cb92	tuesday	11:00	11:40	7	f	Period 6	\N	\N	2026-04-20 00:24:48.283	2026-04-20 00:51:53.855
db80e3a7-5551-4415-8fc0-1228af3f659e	b09c2a20-cbc7-4884-990b-a2154414cb92	tuesday	11:45	12:25	8	f	Period 7	\N	\N	2026-04-20 00:24:48.29	2026-04-20 00:51:53.861
96204f46-9192-4f2d-a3b0-a632c503891e	b09c2a20-cbc7-4884-990b-a2154414cb92	tuesday	12:30	13:10	9	f	Period 8	\N	\N	2026-04-20 00:24:48.296	2026-04-20 00:51:53.866
79f5372a-c2bb-4494-b52c-41449d6ae544	b09c2a20-cbc7-4884-990b-a2154414cb92	tuesday	13:10	14:00	10	t	Lunch Break	Lunch Break	50	2026-04-20 00:24:48.303	2026-04-20 00:51:53.871
6a0af4ef-f8f1-4198-b573-5bda15bf8f37	b09c2a20-cbc7-4884-990b-a2154414cb92	tuesday	14:00	14:40	11	f	Period 9	\N	\N	2026-04-20 00:24:48.31	2026-04-20 00:51:53.874
c1316a19-1c38-492b-966f-53753b922f31	b09c2a20-cbc7-4884-990b-a2154414cb92	tuesday	14:45	15:25	12	f	Period 10	\N	\N	2026-04-20 00:24:48.317	2026-04-20 00:51:53.879
986b0bfb-1110-4ca7-89c4-6767bc9a935c	b09c2a20-cbc7-4884-990b-a2154414cb92	tuesday	15:30	16:10	13	f	Period 11	\N	\N	2026-04-20 00:24:48.323	2026-04-20 00:51:53.885
fdc65872-9367-4e9b-9c0d-19f42268e1a2	b09c2a20-cbc7-4884-990b-a2154414cb92	tuesday	16:15	16:55	14	f	Period 12	\N	\N	2026-04-20 00:24:48.329	2026-04-20 00:51:53.89
438af256-d6cf-4517-b35b-d1e46f1d8f91	b09c2a20-cbc7-4884-990b-a2154414cb92	wednesday	07:00	07:40	1	f	Period 1	\N	\N	2026-04-20 00:24:48.335	2026-04-20 00:51:53.896
83865774-8033-402f-a563-0e10f2a6f542	b09c2a20-cbc7-4884-990b-a2154414cb92	wednesday	07:45	08:25	2	f	Period 2	\N	\N	2026-04-20 00:24:48.341	2026-04-20 00:51:53.903
f1eed411-a14d-4559-b76a-8c6b01e7982d	b09c2a20-cbc7-4884-990b-a2154414cb92	wednesday	08:30	09:10	3	f	Period 3	\N	\N	2026-04-20 00:24:48.348	2026-04-20 00:51:53.909
7b313e46-140d-457a-9d02-2dca9beabdf9	b09c2a20-cbc7-4884-990b-a2154414cb92	wednesday	09:15	09:55	4	f	Period 4	\N	\N	2026-04-20 00:24:48.352	2026-04-20 00:51:53.914
a4789eb7-2fb6-4f83-b1ff-a31ec5fd4e3f	b09c2a20-cbc7-4884-990b-a2154414cb92	wednesday	09:55	10:15	5	t	Morning Break	Morning Break	20	2026-04-20 00:24:48.357	2026-04-20 00:51:53.921
4403bbe7-1ae3-464c-a576-545ed6b3d72c	b09c2a20-cbc7-4884-990b-a2154414cb92	wednesday	10:15	10:55	6	f	Period 5	\N	\N	2026-04-20 00:24:48.362	2026-04-20 00:51:53.926
7668cf77-fb98-46ea-876b-ff576a28c194	b09c2a20-cbc7-4884-990b-a2154414cb92	wednesday	11:00	11:40	7	f	Period 6	\N	\N	2026-04-20 00:24:48.367	2026-04-20 00:51:53.932
df3ce686-dfb3-495e-8074-7c6399d783b1	b09c2a20-cbc7-4884-990b-a2154414cb92	wednesday	11:45	12:25	8	f	Period 7	\N	\N	2026-04-20 00:24:48.372	2026-04-20 00:51:53.938
aa786c5b-7c81-410c-96e5-25a3e1cb5f07	b09c2a20-cbc7-4884-990b-a2154414cb92	wednesday	12:30	13:10	9	f	Period 8	\N	\N	2026-04-20 00:24:48.377	2026-04-20 00:51:53.944
4bcdb4b3-ecc5-4e9a-a806-f8c1d8ee3671	b09c2a20-cbc7-4884-990b-a2154414cb92	wednesday	13:10	14:00	10	t	Lunch Break	Lunch Break	50	2026-04-20 00:24:48.384	2026-04-20 00:51:53.95
c47211aa-929f-4883-bce2-3b869d4ccbb6	b09c2a20-cbc7-4884-990b-a2154414cb92	wednesday	14:00	14:40	11	f	Period 9	\N	\N	2026-04-20 00:24:48.39	2026-04-20 00:51:53.956
0d10da45-f781-46d5-a99d-44059011f0ac	b09c2a20-cbc7-4884-990b-a2154414cb92	wednesday	14:45	15:25	12	f	Period 10	\N	\N	2026-04-20 00:24:48.397	2026-04-20 00:51:53.962
c93d5e13-ea6e-49c0-88a8-39401ccf758e	b09c2a20-cbc7-4884-990b-a2154414cb92	wednesday	15:30	16:10	13	f	Period 11	\N	\N	2026-04-20 00:24:48.404	2026-04-20 00:51:53.968
0f99f48c-038f-4b0b-bb00-e11c7629197e	b09c2a20-cbc7-4884-990b-a2154414cb92	wednesday	16:15	16:55	14	f	Period 12	\N	\N	2026-04-20 00:24:48.41	2026-04-20 00:51:53.974
549df126-ca22-42c0-8ef5-41033f7efb5e	b09c2a20-cbc7-4884-990b-a2154414cb92	thursday	07:00	07:40	1	f	Period 1	\N	\N	2026-04-20 00:24:48.419	2026-04-20 00:51:53.98
22686f5e-7c10-413c-b8c0-c4525f090a4d	b09c2a20-cbc7-4884-990b-a2154414cb92	thursday	07:45	08:25	2	f	Period 2	\N	\N	2026-04-20 00:24:48.424	2026-04-20 00:51:53.986
51b7741b-80c5-4fa2-b9af-68b71c219c0d	b09c2a20-cbc7-4884-990b-a2154414cb92	thursday	08:30	09:10	3	f	Period 3	\N	\N	2026-04-20 00:24:48.431	2026-04-20 00:51:53.991
7aafb8a6-b27a-43c1-b467-8515f9855fef	b09c2a20-cbc7-4884-990b-a2154414cb92	thursday	09:15	09:55	4	f	Period 4	\N	\N	2026-04-20 00:24:48.437	2026-04-20 00:51:53.997
0a47dce1-b0e5-4822-967c-611adda592c9	b09c2a20-cbc7-4884-990b-a2154414cb92	thursday	09:55	10:15	5	t	Morning Break	Morning Break	20	2026-04-20 00:24:48.443	2026-04-20 00:51:54.003
1cb50aad-172d-4e1d-902b-0866a5f8b2a8	b09c2a20-cbc7-4884-990b-a2154414cb92	thursday	10:15	10:55	6	f	Period 5	\N	\N	2026-04-20 00:24:48.45	2026-04-20 00:51:54.008
e89a2cf1-1f3c-402a-af35-f9f0929f82a4	b09c2a20-cbc7-4884-990b-a2154414cb92	thursday	11:00	11:40	7	f	Period 6	\N	\N	2026-04-20 00:24:48.455	2026-04-20 00:51:54.015
f9590071-0ed5-413c-a325-7405ccd264eb	b09c2a20-cbc7-4884-990b-a2154414cb92	thursday	12:30	13:10	9	f	Period 8	\N	\N	2026-04-20 00:24:48.468	2026-04-20 00:51:54.026
77213674-e076-47fb-bfa6-e8e5a9a3e82f	b09c2a20-cbc7-4884-990b-a2154414cb92	thursday	14:00	14:40	11	f	Period 9	\N	\N	2026-04-20 00:24:48.481	2026-04-20 00:51:54.037
03c9ec93-928d-4661-96d9-1febb648afc8	b09c2a20-cbc7-4884-990b-a2154414cb92	thursday	14:45	15:25	12	f	Period 10	\N	\N	2026-04-20 00:24:48.489	2026-04-20 00:51:54.042
cc2216e0-5dbc-48fc-a36b-b07b851191c5	b09c2a20-cbc7-4884-990b-a2154414cb92	thursday	15:30	16:10	13	f	Period 11	\N	\N	2026-04-20 00:24:48.495	2026-04-20 00:51:54.048
622fb2f4-be2f-42c4-b53c-f29e4ce4c64f	b09c2a20-cbc7-4884-990b-a2154414cb92	thursday	16:15	16:55	14	f	Period 12	\N	\N	2026-04-20 00:24:48.502	2026-04-20 00:51:54.053
f9590741-c62f-489e-9047-5bda93c1e2f7	b09c2a20-cbc7-4884-990b-a2154414cb92	friday	07:00	07:40	1	f	Period 1	\N	\N	2026-04-20 00:24:48.51	2026-04-20 00:51:54.056
1c8d91e2-b875-460d-a06b-c0b28e33fce0	b09c2a20-cbc7-4884-990b-a2154414cb92	friday	07:45	08:25	2	f	Period 2	\N	\N	2026-04-20 00:24:48.517	2026-04-20 00:51:54.06
90d2edd4-0d0f-4eeb-9c31-9c5cbcb4a76e	b09c2a20-cbc7-4884-990b-a2154414cb92	friday	08:30	09:10	3	f	Period 3	\N	\N	2026-04-20 00:24:48.524	2026-04-20 00:51:54.064
93c6d0ab-0a52-4b1c-a2fe-0c90ccc604cd	b09c2a20-cbc7-4884-990b-a2154414cb92	friday	09:15	09:55	4	f	Period 4	\N	\N	2026-04-20 00:24:48.53	2026-04-20 00:51:54.068
1ef857f2-43ee-4477-8912-d595b5d6e264	b09c2a20-cbc7-4884-990b-a2154414cb92	friday	09:55	10:15	5	t	Morning Break	Morning Break	20	2026-04-20 00:24:48.537	2026-04-20 00:51:54.072
da9ebc73-1098-490b-98ca-de2f237f5233	b09c2a20-cbc7-4884-990b-a2154414cb92	friday	10:15	10:55	6	f	Period 5	\N	\N	2026-04-20 00:24:48.542	2026-04-20 00:51:54.076
c4921c39-4282-4ae3-bbba-d5d77ba59ffc	b09c2a20-cbc7-4884-990b-a2154414cb92	friday	11:00	11:40	7	f	Period 6	\N	\N	2026-04-20 00:24:48.547	2026-04-20 00:51:54.081
47fb01c0-9ec3-4d52-9527-a70ae99fa6c1	b09c2a20-cbc7-4884-990b-a2154414cb92	friday	11:45	12:25	8	f	Period 7	\N	\N	2026-04-20 00:24:48.552	2026-04-20 00:51:54.085
f0a34f6d-b15b-4e09-b9dd-b8b20dc529e8	b09c2a20-cbc7-4884-990b-a2154414cb92	friday	12:30	13:10	9	f	Period 8	\N	\N	2026-04-20 00:24:48.558	2026-04-20 00:51:54.089
e07f0bf8-9ee9-417c-b488-582b07e47937	b09c2a20-cbc7-4884-990b-a2154414cb92	friday	13:10	14:00	10	t	Lunch Break	Lunch Break	50	2026-04-20 00:24:48.565	2026-04-20 00:51:54.098
5092880b-053b-4e2e-b804-413d518509a3	b09c2a20-cbc7-4884-990b-a2154414cb92	friday	14:00	14:40	11	f	Period 9	\N	\N	2026-04-20 00:24:48.57	2026-04-20 00:51:54.103
fc313397-ac90-4574-a047-e81b210b7b14	b09c2a20-cbc7-4884-990b-a2154414cb92	friday	14:45	15:25	12	f	Period 10	\N	\N	2026-04-20 00:24:48.575	2026-04-20 00:51:54.11
291cd707-39f5-4fed-bdc3-cb5c01d444b4	b09c2a20-cbc7-4884-990b-a2154414cb92	friday	15:30	16:10	13	f	Period 11	\N	\N	2026-04-20 00:24:48.582	2026-04-20 00:51:54.116
b0708560-98bc-46f0-b008-5e21737aaf1a	b09c2a20-cbc7-4884-990b-a2154414cb92	friday	16:15	16:55	14	f	Period 12	\N	\N	2026-04-20 00:24:48.588	2026-04-20 00:51:54.122
1e70cdb2-9947-4067-a14f-1ef591d867b3	25e31e5c-13fd-46ec-a403-fa10e6c1a498	monday	07:00	07:40	1	f	Period 1	\N	\N	2026-04-20 00:24:48.597	2026-04-20 00:51:54.128
f2071f7d-1ce6-4389-b0c2-115eaa837886	25e31e5c-13fd-46ec-a403-fa10e6c1a498	monday	07:45	08:25	2	f	Period 2	\N	\N	2026-04-20 00:24:48.603	2026-04-20 00:51:54.134
4b5e063c-5ffa-40ea-8d01-c0f7682914f4	25e31e5c-13fd-46ec-a403-fa10e6c1a498	monday	08:30	09:10	3	f	Period 3	\N	\N	2026-04-20 00:24:48.61	2026-04-20 00:51:54.14
7049588a-7ad0-4f61-9d72-7f9c381c319d	25e31e5c-13fd-46ec-a403-fa10e6c1a498	monday	09:15	09:55	4	f	Period 4	\N	\N	2026-04-20 00:24:48.617	2026-04-20 00:51:54.146
9c20eb9f-d307-4a31-a16f-e64c2fd100c2	25e31e5c-13fd-46ec-a403-fa10e6c1a498	monday	09:55	10:15	5	t	Morning Break	Morning Break	20	2026-04-20 00:24:48.624	2026-04-20 00:51:54.152
22aec12c-0c01-4973-b81d-5fa2b83c7d85	25e31e5c-13fd-46ec-a403-fa10e6c1a498	monday	10:15	10:55	6	f	Period 5	\N	\N	2026-04-20 00:24:48.631	2026-04-20 00:51:54.157
3f0f0b6b-796f-45df-bb26-7b5963424553	25e31e5c-13fd-46ec-a403-fa10e6c1a498	monday	11:00	11:40	7	f	Period 6	\N	\N	2026-04-20 00:24:48.638	2026-04-20 00:51:54.163
d284d4ab-3a3e-4eb7-9222-097d58146df1	25e31e5c-13fd-46ec-a403-fa10e6c1a498	monday	11:45	12:25	8	f	Period 7	\N	\N	2026-04-20 00:24:48.644	2026-04-20 00:51:54.169
6271c904-0aef-4c09-af45-9c2773bb1ca3	25e31e5c-13fd-46ec-a403-fa10e6c1a498	monday	12:30	13:10	9	f	Period 8	\N	\N	2026-04-20 00:24:48.652	2026-04-20 00:51:54.176
892a6e6e-50b6-47c8-929e-df14a08bb663	25e31e5c-13fd-46ec-a403-fa10e6c1a498	monday	13:10	14:00	10	t	Lunch Break	Lunch Break	50	2026-04-20 00:24:48.659	2026-04-20 00:51:54.183
b565d885-6f1d-48d0-8d91-34237c79d8f7	25e31e5c-13fd-46ec-a403-fa10e6c1a498	monday	14:00	14:40	11	f	Period 9	\N	\N	2026-04-20 00:24:48.667	2026-04-20 00:51:54.188
5f03b0fb-f551-47d7-a1f7-87069cdcd64e	25e31e5c-13fd-46ec-a403-fa10e6c1a498	monday	14:45	15:25	12	f	Period 10	\N	\N	2026-04-20 00:24:48.673	2026-04-20 00:51:54.193
e934453c-31f4-44a7-ba56-7639f44ac2cb	25e31e5c-13fd-46ec-a403-fa10e6c1a498	monday	15:30	16:10	13	f	Period 11	\N	\N	2026-04-20 00:24:48.68	2026-04-20 00:51:54.199
b251ddad-b67d-46fb-85b5-fd1ed4790904	25e31e5c-13fd-46ec-a403-fa10e6c1a498	monday	16:15	16:55	14	f	Period 12	\N	\N	2026-04-20 00:24:48.686	2026-04-20 00:51:54.206
8c59e067-bba4-4383-97f1-82f99136af49	25e31e5c-13fd-46ec-a403-fa10e6c1a498	tuesday	07:00	07:40	1	f	Period 1	\N	\N	2026-04-20 00:24:48.695	2026-04-20 00:51:54.212
531439dc-42bb-4dd4-bbd7-1aed678325dd	25e31e5c-13fd-46ec-a403-fa10e6c1a498	tuesday	07:45	08:25	2	f	Period 2	\N	\N	2026-04-20 00:24:48.702	2026-04-20 00:51:54.217
1068ccba-8eb7-45d2-97e6-3c294149e416	25e31e5c-13fd-46ec-a403-fa10e6c1a498	tuesday	08:30	09:10	3	f	Period 3	\N	\N	2026-04-20 00:24:48.708	2026-04-20 00:51:54.223
11592bfc-0a8c-4dd0-948d-34c42faf0358	25e31e5c-13fd-46ec-a403-fa10e6c1a498	tuesday	09:15	09:55	4	f	Period 4	\N	\N	2026-04-20 00:24:48.716	2026-04-20 00:51:54.228
22ea4658-b453-49bd-8210-36f07699b969	25e31e5c-13fd-46ec-a403-fa10e6c1a498	tuesday	09:55	10:15	5	t	Morning Break	Morning Break	20	2026-04-20 00:24:48.722	2026-04-20 00:51:54.234
3dca6f04-36fe-40c8-8cee-341bdf25b6a2	25e31e5c-13fd-46ec-a403-fa10e6c1a498	tuesday	10:15	10:55	6	f	Period 5	\N	\N	2026-04-20 00:24:48.728	2026-04-20 00:51:54.239
991b286d-2db2-458b-85f3-a5bbc27a2409	25e31e5c-13fd-46ec-a403-fa10e6c1a498	tuesday	11:00	11:40	7	f	Period 6	\N	\N	2026-04-20 00:24:48.735	2026-04-20 00:51:54.244
6a7fc935-de13-4d3c-abcd-a5610d83b6ff	25e31e5c-13fd-46ec-a403-fa10e6c1a498	tuesday	11:45	12:25	8	f	Period 7	\N	\N	2026-04-20 00:24:48.741	2026-04-20 00:51:54.25
5da15ef7-5478-412c-8bca-05fe6810d01c	25e31e5c-13fd-46ec-a403-fa10e6c1a498	tuesday	12:30	13:10	9	f	Period 8	\N	\N	2026-04-20 00:24:48.748	2026-04-20 00:51:54.255
8ab260f1-d60f-4aeb-bc82-201d7fa8520a	25e31e5c-13fd-46ec-a403-fa10e6c1a498	tuesday	13:10	14:00	10	t	Lunch Break	Lunch Break	50	2026-04-20 00:24:48.754	2026-04-20 00:51:54.259
ebdee08f-9ea8-41da-a9f3-245833d7a6f4	25e31e5c-13fd-46ec-a403-fa10e6c1a498	tuesday	14:00	14:40	11	f	Period 9	\N	\N	2026-04-20 00:24:48.76	2026-04-20 00:51:54.264
6b1d487b-33b7-417a-80d4-a33410d1abe4	25e31e5c-13fd-46ec-a403-fa10e6c1a498	tuesday	14:45	15:25	12	f	Period 10	\N	\N	2026-04-20 00:24:48.766	2026-04-20 00:51:54.269
6517da4b-afc7-4c93-8251-52d5abb6e3d6	25e31e5c-13fd-46ec-a403-fa10e6c1a498	tuesday	15:30	16:10	13	f	Period 11	\N	\N	2026-04-20 00:24:48.772	2026-04-20 00:51:54.274
715518c4-3868-4282-87a9-ca5f159edd6b	25e31e5c-13fd-46ec-a403-fa10e6c1a498	tuesday	16:15	16:55	14	f	Period 12	\N	\N	2026-04-20 00:24:48.776	2026-04-20 00:51:54.279
268ba10f-830d-4b74-8fec-31e8a0744ecf	25e31e5c-13fd-46ec-a403-fa10e6c1a498	wednesday	07:45	08:25	2	f	Period 2	\N	\N	2026-04-20 00:24:48.788	2026-04-20 00:51:54.29
66127e0b-28a7-41c3-8fd6-2daca80aa0d4	25e31e5c-13fd-46ec-a403-fa10e6c1a498	wednesday	08:30	09:10	3	f	Period 3	\N	\N	2026-04-20 00:24:48.794	2026-04-20 00:51:54.295
e7d72ff2-0db9-45b3-a7e9-a241256a78df	25e31e5c-13fd-46ec-a403-fa10e6c1a498	wednesday	09:15	09:55	4	f	Period 4	\N	\N	2026-04-20 00:24:48.799	2026-04-20 00:51:54.301
ef81126c-e25c-4e72-87ef-ca41b076b543	25e31e5c-13fd-46ec-a403-fa10e6c1a498	wednesday	10:15	10:55	6	f	Period 5	\N	\N	2026-04-20 00:24:48.811	2026-04-20 00:51:54.312
b02db147-20cb-4f27-be40-c72fd904aab7	25e31e5c-13fd-46ec-a403-fa10e6c1a498	wednesday	11:00	11:40	7	f	Period 6	\N	\N	2026-04-20 00:24:48.818	2026-04-20 00:51:54.318
791565a2-dbd1-47e2-bbd9-b613a56c658b	25e31e5c-13fd-46ec-a403-fa10e6c1a498	wednesday	11:45	12:25	8	f	Period 7	\N	\N	2026-04-20 00:24:48.824	2026-04-20 00:51:54.324
6052950a-968b-45e3-b0e9-9ac84f244a09	25e31e5c-13fd-46ec-a403-fa10e6c1a498	wednesday	12:30	13:10	9	f	Period 8	\N	\N	2026-04-20 00:24:48.83	2026-04-20 00:51:54.329
f21bbac7-18d6-43cf-9c48-604c516b5536	25e31e5c-13fd-46ec-a403-fa10e6c1a498	wednesday	13:10	14:00	10	t	Lunch Break	Lunch Break	50	2026-04-20 00:24:48.837	2026-04-20 00:51:54.335
80c51c18-f71f-49a8-92f7-cee0cc67d91e	25e31e5c-13fd-46ec-a403-fa10e6c1a498	wednesday	14:00	14:40	11	f	Period 9	\N	\N	2026-04-20 00:24:48.843	2026-04-20 00:51:54.341
a03002eb-2f22-4928-ad47-8ced6a7bcd45	25e31e5c-13fd-46ec-a403-fa10e6c1a498	wednesday	14:45	15:25	12	f	Period 10	\N	\N	2026-04-20 00:24:48.849	2026-04-20 00:51:54.347
91709596-d09f-4687-9c63-56e8649f20f4	25e31e5c-13fd-46ec-a403-fa10e6c1a498	wednesday	15:30	16:10	13	f	Period 11	\N	\N	2026-04-20 00:24:48.855	2026-04-20 00:51:54.352
ebfebfc9-a47b-40d0-8697-1e2b35d88928	25e31e5c-13fd-46ec-a403-fa10e6c1a498	wednesday	16:15	16:55	14	f	Period 12	\N	\N	2026-04-20 00:24:48.862	2026-04-20 00:51:54.358
077cb8e0-0aea-4bb5-b466-3747835aac8f	25e31e5c-13fd-46ec-a403-fa10e6c1a498	thursday	07:00	07:40	1	f	Period 1	\N	\N	2026-04-20 00:24:48.869	2026-04-20 00:51:54.365
fe6f7fe5-93fa-442f-a0c3-be048489aefc	25e31e5c-13fd-46ec-a403-fa10e6c1a498	thursday	07:45	08:25	2	f	Period 2	\N	\N	2026-04-20 00:24:48.874	2026-04-20 00:51:54.371
1a875a36-d9e6-4ecd-a226-3364bed6eb02	25e31e5c-13fd-46ec-a403-fa10e6c1a498	thursday	08:30	09:10	3	f	Period 3	\N	\N	2026-04-20 00:24:48.88	2026-04-20 00:51:54.376
ac2da3ec-dbb6-40ec-8869-5ba1a8c3197f	25e31e5c-13fd-46ec-a403-fa10e6c1a498	thursday	09:15	09:55	4	f	Period 4	\N	\N	2026-04-20 00:24:48.886	2026-04-20 00:51:54.382
42f30540-71bc-4363-9c37-4d40e956eeaa	25e31e5c-13fd-46ec-a403-fa10e6c1a498	thursday	09:55	10:15	5	t	Morning Break	Morning Break	20	2026-04-20 00:24:48.891	2026-04-20 00:51:54.388
2d664d3d-18ae-4eaa-9d68-6a51f5c72d17	25e31e5c-13fd-46ec-a403-fa10e6c1a498	thursday	10:15	10:55	6	f	Period 5	\N	\N	2026-04-20 00:24:48.897	2026-04-20 00:51:54.393
45b8a5a0-11ad-456b-b7b1-3fb7b9286406	25e31e5c-13fd-46ec-a403-fa10e6c1a498	thursday	11:00	11:40	7	f	Period 6	\N	\N	2026-04-20 00:24:48.902	2026-04-20 00:51:54.4
0d43f2b8-5cb9-40d1-b8b1-5a3c540857f0	25e31e5c-13fd-46ec-a403-fa10e6c1a498	thursday	11:45	12:25	8	f	Period 7	\N	\N	2026-04-20 00:24:48.908	2026-04-20 00:51:54.406
a735d674-100b-4994-ae56-2dcd3a0596ba	25e31e5c-13fd-46ec-a403-fa10e6c1a498	thursday	12:30	13:10	9	f	Period 8	\N	\N	2026-04-20 00:24:48.915	2026-04-20 00:51:54.413
db7d5403-4548-4027-a9e3-08a98b6782e8	25e31e5c-13fd-46ec-a403-fa10e6c1a498	thursday	13:10	14:00	10	t	Lunch Break	Lunch Break	50	2026-04-20 00:24:48.922	2026-04-20 00:51:54.419
69a392d2-4930-4015-a8cb-a8f6295ef6d5	25e31e5c-13fd-46ec-a403-fa10e6c1a498	thursday	14:00	14:40	11	f	Period 9	\N	\N	2026-04-20 00:24:48.929	2026-04-20 00:51:54.425
6fb5f74b-66e9-429e-b431-dac153d45f25	25e31e5c-13fd-46ec-a403-fa10e6c1a498	thursday	14:45	15:25	12	f	Period 10	\N	\N	2026-04-20 00:24:48.936	2026-04-20 00:51:54.431
9d650831-c981-4bb4-b2b3-78bda26026c5	25e31e5c-13fd-46ec-a403-fa10e6c1a498	thursday	15:30	16:10	13	f	Period 11	\N	\N	2026-04-20 00:24:48.943	2026-04-20 00:51:54.436
5e7a2a75-2892-4ad3-ab82-cd38dfb6496f	25e31e5c-13fd-46ec-a403-fa10e6c1a498	thursday	16:15	16:55	14	f	Period 12	\N	\N	2026-04-20 00:24:48.95	2026-04-20 00:51:54.442
daf59d61-1a91-40ae-96d9-cabfac6d6555	25e31e5c-13fd-46ec-a403-fa10e6c1a498	friday	07:00	07:40	1	f	Period 1	\N	\N	2026-04-20 00:24:48.956	2026-04-20 00:51:54.449
ad183caf-3cee-416a-bc1c-82fc022de11d	25e31e5c-13fd-46ec-a403-fa10e6c1a498	friday	07:45	08:25	2	f	Period 2	\N	\N	2026-04-20 00:24:48.963	2026-04-20 00:51:54.455
9d607e34-38fe-4bb7-b5fb-f30713666d3a	25e31e5c-13fd-46ec-a403-fa10e6c1a498	friday	08:30	09:10	3	f	Period 3	\N	\N	2026-04-20 00:24:48.969	2026-04-20 00:51:54.461
907587ff-ada1-4876-9cf9-4d1087ab0aa4	25e31e5c-13fd-46ec-a403-fa10e6c1a498	friday	09:15	09:55	4	f	Period 4	\N	\N	2026-04-20 00:24:48.976	2026-04-20 00:51:54.467
bc98f191-b379-41fd-b74a-f5ffc46f5e13	25e31e5c-13fd-46ec-a403-fa10e6c1a498	friday	09:55	10:15	5	t	Morning Break	Morning Break	20	2026-04-20 00:24:48.983	2026-04-20 00:51:54.472
21d05746-2ee1-4cfe-ab0c-f8532bd92809	25e31e5c-13fd-46ec-a403-fa10e6c1a498	friday	10:15	10:55	6	f	Period 5	\N	\N	2026-04-20 00:24:48.99	2026-04-20 00:51:54.478
71811015-22e6-4c71-9385-3a90a7ac04a8	25e31e5c-13fd-46ec-a403-fa10e6c1a498	friday	11:00	11:40	7	f	Period 6	\N	\N	2026-04-20 00:24:48.996	2026-04-20 00:51:54.484
86e7cc73-081d-4389-880f-1e9a9cadf345	25e31e5c-13fd-46ec-a403-fa10e6c1a498	friday	11:45	12:25	8	f	Period 7	\N	\N	2026-04-20 00:24:49.003	2026-04-20 00:51:54.489
2f517231-83a2-4d90-916b-aafa5f731c25	25e31e5c-13fd-46ec-a403-fa10e6c1a498	friday	12:30	13:10	9	f	Period 8	\N	\N	2026-04-20 00:24:49.009	2026-04-20 00:51:54.494
1b194dc1-ad67-4415-9dcd-d6411a0150b3	25e31e5c-13fd-46ec-a403-fa10e6c1a498	friday	13:10	14:00	10	t	Lunch Break	Lunch Break	50	2026-04-20 00:24:49.016	2026-04-20 00:51:54.499
955c0299-2aa8-4bfa-af35-009561343960	25e31e5c-13fd-46ec-a403-fa10e6c1a498	friday	14:00	14:40	11	f	Period 9	\N	\N	2026-04-20 00:24:49.021	2026-04-20 00:51:54.504
44eb86d8-a920-41f3-8b03-8f25374b4bcd	25e31e5c-13fd-46ec-a403-fa10e6c1a498	friday	14:45	15:25	12	f	Period 10	\N	\N	2026-04-20 00:24:49.026	2026-04-20 00:51:54.509
78836ace-0524-4404-8bec-7667337dfdb4	25e31e5c-13fd-46ec-a403-fa10e6c1a498	friday	15:30	16:10	13	f	Period 11	\N	\N	2026-04-20 00:24:49.033	2026-04-20 00:51:54.513
1ac8287d-711e-43f5-ae9b-8b71cf6e0349	25e31e5c-13fd-46ec-a403-fa10e6c1a498	friday	16:15	16:55	14	f	Period 12	\N	\N	2026-04-20 00:24:49.039	2026-04-20 00:51:54.519
cfaa27e2-9b7e-4cdf-a361-ec521357a666	c25d24b1-40fa-491e-bec3-afc9ad8ea567	monday	07:00	07:40	1	f	Period 1	\N	\N	2026-04-20 00:24:49.045	2026-04-20 00:51:54.525
32254a55-1528-4631-8674-93177323816d	c25d24b1-40fa-491e-bec3-afc9ad8ea567	monday	07:45	08:25	2	f	Period 2	\N	\N	2026-04-20 00:24:49.052	2026-04-20 00:51:54.53
4b1c599e-dc82-417a-8b4e-c9eb782ed275	c25d24b1-40fa-491e-bec3-afc9ad8ea567	monday	08:30	09:10	3	f	Period 3	\N	\N	2026-04-20 00:24:49.057	2026-04-20 00:51:54.534
a5df8046-573d-4c25-93f7-cce571bc223d	c25d24b1-40fa-491e-bec3-afc9ad8ea567	monday	09:15	09:55	4	f	Period 4	\N	\N	2026-04-20 00:24:49.062	2026-04-20 00:51:54.538
1a33ea7d-f923-41e3-abfd-fbb59d7f54e9	c25d24b1-40fa-491e-bec3-afc9ad8ea567	monday	09:55	10:15	5	t	Morning Break	Morning Break	20	2026-04-20 00:24:49.068	2026-04-20 00:51:54.541
dda4dc4e-5520-47a9-a5d4-80cf1d409d2f	c25d24b1-40fa-491e-bec3-afc9ad8ea567	monday	10:15	10:55	6	f	Period 5	\N	\N	2026-04-20 00:24:49.074	2026-04-20 00:51:54.544
9e2c0f63-d187-4ac1-adda-4fda759f2028	c25d24b1-40fa-491e-bec3-afc9ad8ea567	monday	11:00	11:40	7	f	Period 6	\N	\N	2026-04-20 00:24:49.08	2026-04-20 00:51:54.55
585e9ca2-ecc2-4107-8a4b-98c0f00fe5da	c25d24b1-40fa-491e-bec3-afc9ad8ea567	monday	12:30	13:10	9	f	Period 8	\N	\N	2026-04-20 00:24:49.092	2026-04-20 00:51:54.562
5fd1a78c-c8f5-462f-bf47-dc18157093e5	c25d24b1-40fa-491e-bec3-afc9ad8ea567	monday	14:00	14:40	11	f	Period 9	\N	\N	2026-04-20 00:24:49.105	2026-04-20 00:51:54.573
aa68203f-52b4-4c40-b982-db0acf78a5e0	c25d24b1-40fa-491e-bec3-afc9ad8ea567	monday	14:45	15:25	12	f	Period 10	\N	\N	2026-04-20 00:24:49.11	2026-04-20 00:51:54.578
5085d202-3f44-4c83-8491-c117cc2ef22e	c25d24b1-40fa-491e-bec3-afc9ad8ea567	monday	15:30	16:10	13	f	Period 11	\N	\N	2026-04-20 00:24:49.117	2026-04-20 00:51:54.584
12bfa334-33f1-43e7-b4fa-5dda44f5fc8b	c25d24b1-40fa-491e-bec3-afc9ad8ea567	monday	16:15	16:55	14	f	Period 12	\N	\N	2026-04-20 00:24:49.124	2026-04-20 00:51:54.588
21b234b4-0493-4469-8859-433306342fb6	c25d24b1-40fa-491e-bec3-afc9ad8ea567	tuesday	07:00	07:40	1	f	Period 1	\N	\N	2026-04-20 00:24:49.131	2026-04-20 00:51:54.592
1448dcf3-8a01-4371-890c-f30335ea3a6f	c25d24b1-40fa-491e-bec3-afc9ad8ea567	tuesday	07:45	08:25	2	f	Period 2	\N	\N	2026-04-20 00:24:49.137	2026-04-20 00:51:54.596
21aa5bf6-ce88-4141-ba44-d1a1b6253e21	c25d24b1-40fa-491e-bec3-afc9ad8ea567	tuesday	08:30	09:10	3	f	Period 3	\N	\N	2026-04-20 00:24:49.144	2026-04-20 00:51:54.6
82492e64-daca-4a9c-b256-f59353e6fce3	c25d24b1-40fa-491e-bec3-afc9ad8ea567	tuesday	09:15	09:55	4	f	Period 4	\N	\N	2026-04-20 00:24:49.151	2026-04-20 00:51:54.604
6fd05d35-1201-44c5-a0a4-74a4558960c8	c25d24b1-40fa-491e-bec3-afc9ad8ea567	tuesday	09:55	10:15	5	t	Morning Break	Morning Break	20	2026-04-20 00:24:49.158	2026-04-20 00:51:54.608
cb8bf43c-15db-464c-abfc-60f9a9e4f7d2	c25d24b1-40fa-491e-bec3-afc9ad8ea567	tuesday	10:15	10:55	6	f	Period 5	\N	\N	2026-04-20 00:24:49.166	2026-04-20 00:51:54.612
1158c589-f31a-4163-a48c-94b6f6d3ddb2	c25d24b1-40fa-491e-bec3-afc9ad8ea567	tuesday	11:00	11:40	7	f	Period 6	\N	\N	2026-04-20 00:24:49.172	2026-04-20 00:51:54.617
6a885172-ea86-48d4-b4a7-0b39e831698f	c25d24b1-40fa-491e-bec3-afc9ad8ea567	tuesday	11:45	12:25	8	f	Period 7	\N	\N	2026-04-20 00:24:49.179	2026-04-20 00:51:54.623
51a3b658-f537-4ac8-94cc-93b36aa9c916	c25d24b1-40fa-491e-bec3-afc9ad8ea567	tuesday	12:30	13:10	9	f	Period 8	\N	\N	2026-04-20 00:24:49.185	2026-04-20 00:51:54.628
4edf3e9a-5065-48ba-9995-23354ed3536b	c25d24b1-40fa-491e-bec3-afc9ad8ea567	tuesday	13:10	14:00	10	t	Lunch Break	Lunch Break	50	2026-04-20 00:24:49.192	2026-04-20 00:51:54.634
895a6308-af08-4188-b397-493de8679711	c25d24b1-40fa-491e-bec3-afc9ad8ea567	tuesday	14:00	14:40	11	f	Period 9	\N	\N	2026-04-20 00:24:49.197	2026-04-20 00:51:54.64
39422103-33ee-402d-a7e7-a5debae5c4e1	c25d24b1-40fa-491e-bec3-afc9ad8ea567	tuesday	14:45	15:25	12	f	Period 10	\N	\N	2026-04-20 00:24:49.204	2026-04-20 00:51:54.647
3a946412-37f3-4875-9740-b90bef4e8555	c25d24b1-40fa-491e-bec3-afc9ad8ea567	tuesday	15:30	16:10	13	f	Period 11	\N	\N	2026-04-20 00:24:49.209	2026-04-20 00:51:54.653
e13148af-bccf-4d6d-9458-bea7d91c48c8	c25d24b1-40fa-491e-bec3-afc9ad8ea567	tuesday	16:15	16:55	14	f	Period 12	\N	\N	2026-04-20 00:24:49.214	2026-04-20 00:51:54.658
22b694e9-a043-4b68-9349-2dc0d64b896d	c25d24b1-40fa-491e-bec3-afc9ad8ea567	wednesday	07:00	07:40	1	f	Period 1	\N	\N	2026-04-20 00:24:49.219	2026-04-20 00:51:54.664
6909d20f-8b63-45ba-9681-ea13fb8995fb	c25d24b1-40fa-491e-bec3-afc9ad8ea567	wednesday	07:45	08:25	2	f	Period 2	\N	\N	2026-04-20 00:24:49.224	2026-04-20 00:51:54.67
fde0fe70-f4e9-494b-9184-e7dccfa8c3c5	c25d24b1-40fa-491e-bec3-afc9ad8ea567	wednesday	08:30	09:10	3	f	Period 3	\N	\N	2026-04-20 00:24:49.228	2026-04-20 00:51:54.676
abb75a3f-bd0b-4f1a-83c8-27293f372ab9	c25d24b1-40fa-491e-bec3-afc9ad8ea567	wednesday	09:15	09:55	4	f	Period 4	\N	\N	2026-04-20 00:24:49.233	2026-04-20 00:51:54.682
d5249a2c-0b5c-40c9-bfbb-d58765af334a	c25d24b1-40fa-491e-bec3-afc9ad8ea567	wednesday	09:55	10:15	5	t	Morning Break	Morning Break	20	2026-04-20 00:24:49.239	2026-04-20 00:51:54.688
af83c177-6d69-427b-bb92-ae6fd99b09a9	c25d24b1-40fa-491e-bec3-afc9ad8ea567	wednesday	10:15	10:55	6	f	Period 5	\N	\N	2026-04-20 00:24:49.244	2026-04-20 00:51:54.693
3c23fd71-9d29-4aff-a5ea-5fffb241b41b	c25d24b1-40fa-491e-bec3-afc9ad8ea567	wednesday	11:00	11:40	7	f	Period 6	\N	\N	2026-04-20 00:24:49.252	2026-04-20 00:51:54.699
343a7582-5b59-4566-ba44-1dda739aebfb	c25d24b1-40fa-491e-bec3-afc9ad8ea567	wednesday	11:45	12:25	8	f	Period 7	\N	\N	2026-04-20 00:24:49.259	2026-04-20 00:51:54.705
f24408e7-a80a-4934-a3f8-72176a7260a3	c25d24b1-40fa-491e-bec3-afc9ad8ea567	wednesday	12:30	13:10	9	f	Period 8	\N	\N	2026-04-20 00:24:49.266	2026-04-20 00:51:54.71
ab62eb13-13f7-48d9-a437-03e11ef43b63	c25d24b1-40fa-491e-bec3-afc9ad8ea567	wednesday	13:10	14:00	10	t	Lunch Break	Lunch Break	50	2026-04-20 00:24:49.272	2026-04-20 00:51:54.716
d3be03d9-5edc-4bff-93c6-7219ed9f2980	c25d24b1-40fa-491e-bec3-afc9ad8ea567	wednesday	14:00	14:40	11	f	Period 9	\N	\N	2026-04-20 00:24:49.279	2026-04-20 00:51:54.722
a8ce6419-d6c1-4f9f-a980-127eac0c62eb	c25d24b1-40fa-491e-bec3-afc9ad8ea567	wednesday	14:45	15:25	12	f	Period 10	\N	\N	2026-04-20 00:24:49.286	2026-04-20 00:51:54.727
7cc960c5-b3d7-41fb-8023-bd5fa2579a8e	c25d24b1-40fa-491e-bec3-afc9ad8ea567	wednesday	15:30	16:10	13	f	Period 11	\N	\N	2026-04-20 00:24:49.291	2026-04-20 00:51:54.733
8b9c8579-34c3-417b-b38b-041adccdcebd	c25d24b1-40fa-491e-bec3-afc9ad8ea567	wednesday	16:15	16:55	14	f	Period 12	\N	\N	2026-04-20 00:24:49.298	2026-04-20 00:51:54.739
8f6dc326-ecee-4c73-931d-577e99ec3158	c25d24b1-40fa-491e-bec3-afc9ad8ea567	thursday	07:00	07:40	1	f	Period 1	\N	\N	2026-04-20 00:24:49.305	2026-04-20 00:51:54.744
4219e2b3-19d5-4d71-8f77-276eb6acf581	c25d24b1-40fa-491e-bec3-afc9ad8ea567	thursday	07:45	08:25	2	f	Period 2	\N	\N	2026-04-20 00:24:49.311	2026-04-20 00:51:54.751
d4c72a96-7460-41a5-be27-b6543f9ec541	c25d24b1-40fa-491e-bec3-afc9ad8ea567	thursday	08:30	09:10	3	f	Period 3	\N	\N	2026-04-20 00:24:49.317	2026-04-20 00:51:54.755
ff31ebb1-cecb-433d-98e3-160ec39e3a90	c25d24b1-40fa-491e-bec3-afc9ad8ea567	thursday	09:15	09:55	4	f	Period 4	\N	\N	2026-04-20 00:24:49.324	2026-04-20 00:51:54.76
5fb69ea5-20bc-4628-9c03-680bba0a7666	c25d24b1-40fa-491e-bec3-afc9ad8ea567	thursday	09:55	10:15	5	t	Morning Break	Morning Break	20	2026-04-20 00:24:49.33	2026-04-20 00:51:54.766
77e0b4d4-066f-48cd-84f5-772d0f00c021	c25d24b1-40fa-491e-bec3-afc9ad8ea567	thursday	10:15	10:55	6	f	Period 5	\N	\N	2026-04-20 00:24:49.338	2026-04-20 00:51:54.77
a9b9d1b4-c99d-4e82-b310-6de8aa280ba8	c25d24b1-40fa-491e-bec3-afc9ad8ea567	thursday	11:00	11:40	7	f	Period 6	\N	\N	2026-04-20 00:24:49.344	2026-04-20 00:51:54.776
27f196f7-9aae-47e9-907b-57dccb8bd189	c25d24b1-40fa-491e-bec3-afc9ad8ea567	thursday	11:45	12:25	8	f	Period 7	\N	\N	2026-04-20 00:24:49.35	2026-04-20 00:51:54.781
4ddeac81-b386-485d-9df4-fc446a85dd64	c25d24b1-40fa-491e-bec3-afc9ad8ea567	thursday	12:30	13:10	9	f	Period 8	\N	\N	2026-04-20 00:24:49.356	2026-04-20 00:51:54.785
06361d81-8d53-4e10-be42-220d0c572f5d	c25d24b1-40fa-491e-bec3-afc9ad8ea567	thursday	13:10	14:00	10	t	Lunch Break	Lunch Break	50	2026-04-20 00:24:49.364	2026-04-20 00:51:54.788
174442dc-fda3-4bf5-a5bb-0ee693007027	c25d24b1-40fa-491e-bec3-afc9ad8ea567	thursday	14:00	14:40	11	f	Period 9	\N	\N	2026-04-20 00:24:49.37	2026-04-20 00:51:54.792
cb6e9862-1e20-4f5e-bbed-414d249cf539	c25d24b1-40fa-491e-bec3-afc9ad8ea567	thursday	14:45	15:25	12	f	Period 10	\N	\N	2026-04-20 00:24:49.377	2026-04-20 00:51:54.795
523f423b-fa0b-4367-ad01-01d0ce157479	c25d24b1-40fa-491e-bec3-afc9ad8ea567	thursday	15:30	16:10	13	f	Period 11	\N	\N	2026-04-20 00:24:49.384	2026-04-20 00:51:54.8
38b79be9-35a8-4e84-93cd-e68f8e63546a	c25d24b1-40fa-491e-bec3-afc9ad8ea567	thursday	16:15	16:55	14	f	Period 12	\N	\N	2026-04-20 00:24:49.391	2026-04-20 00:51:54.804
caff9756-507a-4111-bcb1-0538e30c1262	c25d24b1-40fa-491e-bec3-afc9ad8ea567	friday	07:45	08:25	2	f	Period 2	\N	\N	2026-04-20 00:24:49.404	2026-04-20 00:51:54.812
0a3f1239-4045-4d00-93a6-86fc9d29134e	c25d24b1-40fa-491e-bec3-afc9ad8ea567	friday	08:30	09:10	3	f	Period 3	\N	\N	2026-04-20 00:24:49.409	2026-04-20 00:51:54.816
541ae81d-67ad-49ab-b8d3-4e2e90a8cd49	c25d24b1-40fa-491e-bec3-afc9ad8ea567	friday	09:15	09:55	4	f	Period 4	\N	\N	2026-04-20 00:24:49.415	2026-04-20 00:51:54.821
11ff9522-5dc5-4838-a4df-b74f29d0ca27	c25d24b1-40fa-491e-bec3-afc9ad8ea567	friday	10:15	10:55	6	f	Period 5	\N	\N	2026-04-20 00:24:49.425	2026-04-20 00:51:54.833
bdd404bf-2cf2-40a6-a234-cbe20c8d5368	c25d24b1-40fa-491e-bec3-afc9ad8ea567	friday	11:00	11:40	7	f	Period 6	\N	\N	2026-04-20 00:24:49.43	2026-04-20 00:51:54.839
996f5784-0e0a-46f6-8c8e-5dcf48a7e224	c25d24b1-40fa-491e-bec3-afc9ad8ea567	friday	11:45	12:25	8	f	Period 7	\N	\N	2026-04-20 00:24:49.436	2026-04-20 00:51:54.844
aeb9e846-0f1e-44b6-b0a5-1e93cc8e363c	c25d24b1-40fa-491e-bec3-afc9ad8ea567	friday	12:30	13:10	9	f	Period 8	\N	\N	2026-04-20 00:24:49.442	2026-04-20 00:51:54.85
650e8914-71a4-43d5-b585-d751a5030f69	c25d24b1-40fa-491e-bec3-afc9ad8ea567	friday	13:10	14:00	10	t	Lunch Break	Lunch Break	50	2026-04-20 00:24:49.448	2026-04-20 00:51:54.856
00cf926b-7ad5-4e06-806e-26179a7269db	c25d24b1-40fa-491e-bec3-afc9ad8ea567	friday	14:00	14:40	11	f	Period 9	\N	\N	2026-04-20 00:24:49.454	2026-04-20 00:51:54.861
aead5b44-4465-4098-a052-5a427abd080e	c25d24b1-40fa-491e-bec3-afc9ad8ea567	friday	14:45	15:25	12	f	Period 10	\N	\N	2026-04-20 00:24:49.46	2026-04-20 00:51:54.867
7b294ca1-fae7-4194-a06d-35001758ee2c	c25d24b1-40fa-491e-bec3-afc9ad8ea567	friday	15:30	16:10	13	f	Period 11	\N	\N	2026-04-20 00:24:49.466	2026-04-20 00:51:54.872
43354f92-1948-485e-8b3e-f348847a0565	c25d24b1-40fa-491e-bec3-afc9ad8ea567	friday	16:15	16:55	14	f	Period 12	\N	\N	2026-04-20 00:24:49.472	2026-04-20 00:51:54.878
bf5fd8c6-1752-4b36-877b-c48cb2ee5e9c	413d8c29-5586-41f5-9171-2aff463b3075	monday	07:00	07:40	1	f	Period 1	\N	\N	2026-04-20 00:24:49.479	2026-04-20 00:51:54.884
d8e7b426-6c24-494f-a947-e21ac59e180b	413d8c29-5586-41f5-9171-2aff463b3075	monday	07:45	08:25	2	f	Period 2	\N	\N	2026-04-20 00:24:49.486	2026-04-20 00:51:54.889
8dd0563d-b27d-4ecf-af28-b8d1360d9405	413d8c29-5586-41f5-9171-2aff463b3075	monday	08:30	09:10	3	f	Period 3	\N	\N	2026-04-20 00:24:49.492	2026-04-20 00:51:54.894
fff39ee9-04ca-46d4-a008-c6c51cb5cb48	413d8c29-5586-41f5-9171-2aff463b3075	monday	09:15	09:55	4	f	Period 4	\N	\N	2026-04-20 00:24:49.499	2026-04-20 00:51:54.899
dce9747e-efeb-4640-9545-53c45461ee57	413d8c29-5586-41f5-9171-2aff463b3075	monday	09:55	10:15	5	t	Morning Break	Morning Break	20	2026-04-20 00:24:49.505	2026-04-20 00:51:54.905
91c3968e-fc86-441f-a0ee-c5d074fbb1fe	413d8c29-5586-41f5-9171-2aff463b3075	monday	10:15	10:55	6	f	Period 5	\N	\N	2026-04-20 00:24:49.511	2026-04-20 00:51:54.91
91d30b37-feff-4811-89ca-2e8fc847e5c2	413d8c29-5586-41f5-9171-2aff463b3075	monday	11:00	11:40	7	f	Period 6	\N	\N	2026-04-20 00:24:49.517	2026-04-20 00:51:54.917
faa43404-6d7c-4933-8bf2-ee591a8162dc	413d8c29-5586-41f5-9171-2aff463b3075	monday	11:45	12:25	8	f	Period 7	\N	\N	2026-04-20 00:24:49.523	2026-04-20 00:51:54.925
2143ec74-0dff-496d-ad46-60239fd50cc3	413d8c29-5586-41f5-9171-2aff463b3075	monday	12:30	13:10	9	f	Period 8	\N	\N	2026-04-20 00:24:49.53	2026-04-20 00:51:54.929
bf6fb770-6e68-4438-a044-e11a2afe1ca7	413d8c29-5586-41f5-9171-2aff463b3075	monday	13:10	14:00	10	t	Lunch Break	Lunch Break	50	2026-04-20 00:24:49.537	2026-04-20 00:51:54.934
ee1d92f7-6a13-4519-8c4b-25fbf59cd1f1	413d8c29-5586-41f5-9171-2aff463b3075	monday	14:00	14:40	11	f	Period 9	\N	\N	2026-04-20 00:24:49.544	2026-04-20 00:51:54.938
577895d0-cb40-4dc5-be70-a74f5a3caedb	413d8c29-5586-41f5-9171-2aff463b3075	monday	14:45	15:25	12	f	Period 10	\N	\N	2026-04-20 00:24:49.551	2026-04-20 00:51:54.942
383e1998-5e62-41ca-98f1-f69624d1c347	413d8c29-5586-41f5-9171-2aff463b3075	monday	15:30	16:10	13	f	Period 11	\N	\N	2026-04-20 00:24:49.556	2026-04-20 00:51:54.946
65fd8241-90aa-4e69-ba23-e525f65e28f5	413d8c29-5586-41f5-9171-2aff463b3075	monday	16:15	16:55	14	f	Period 12	\N	\N	2026-04-20 00:24:49.562	2026-04-20 00:51:54.951
0439f2fa-fe6e-438c-b99a-6b52d8da5f1b	413d8c29-5586-41f5-9171-2aff463b3075	tuesday	07:00	07:40	1	f	Period 1	\N	\N	2026-04-20 00:24:49.568	2026-04-20 00:51:54.955
b4ec9339-bd2c-43f0-849f-ccd7453aef7a	413d8c29-5586-41f5-9171-2aff463b3075	tuesday	07:45	08:25	2	f	Period 2	\N	\N	2026-04-20 00:24:49.574	2026-04-20 00:51:54.959
e9f42142-6992-44cb-bc7c-c0ffc770b2ed	413d8c29-5586-41f5-9171-2aff463b3075	tuesday	08:30	09:10	3	f	Period 3	\N	\N	2026-04-20 00:24:49.583	2026-04-20 00:51:54.962
43f4a3ac-25dc-40eb-b0dd-09d25f670aea	413d8c29-5586-41f5-9171-2aff463b3075	tuesday	09:15	09:55	4	f	Period 4	\N	\N	2026-04-20 00:24:49.589	2026-04-20 00:51:54.967
ac09be8f-6bbf-4655-bcb7-1b077fc491d9	413d8c29-5586-41f5-9171-2aff463b3075	tuesday	09:55	10:15	5	t	Morning Break	Morning Break	20	2026-04-20 00:24:49.597	2026-04-20 00:51:54.972
2d8f2016-872e-4734-b8b7-18876c9964ab	413d8c29-5586-41f5-9171-2aff463b3075	tuesday	10:15	10:55	6	f	Period 5	\N	\N	2026-04-20 00:24:49.603	2026-04-20 00:51:54.977
c51970ab-462d-443d-bdd8-257e11a7a3e8	413d8c29-5586-41f5-9171-2aff463b3075	tuesday	11:00	11:40	7	f	Period 6	\N	\N	2026-04-20 00:24:49.61	2026-04-20 00:51:54.982
85c81f79-1171-4133-9789-8c47c4d02d14	413d8c29-5586-41f5-9171-2aff463b3075	tuesday	11:45	12:25	8	f	Period 7	\N	\N	2026-04-20 00:24:49.616	2026-04-20 00:51:54.989
f4537c25-df06-405d-be0a-34cf5ce4dab6	413d8c29-5586-41f5-9171-2aff463b3075	tuesday	12:30	13:10	9	f	Period 8	\N	\N	2026-04-20 00:24:49.622	2026-04-20 00:51:54.995
1cc809e5-15e1-45f5-977d-155248ce8e0c	413d8c29-5586-41f5-9171-2aff463b3075	tuesday	13:10	14:00	10	t	Lunch Break	Lunch Break	50	2026-04-20 00:24:49.629	2026-04-20 00:51:55.001
36b1910b-7df2-4b06-92c4-6625d1cd578f	413d8c29-5586-41f5-9171-2aff463b3075	tuesday	14:00	14:40	11	f	Period 9	\N	\N	2026-04-20 00:24:49.635	2026-04-20 00:51:55.008
90fe250e-5a4a-4458-bdaf-97227371ee58	413d8c29-5586-41f5-9171-2aff463b3075	tuesday	14:45	15:25	12	f	Period 10	\N	\N	2026-04-20 00:24:49.642	2026-04-20 00:51:55.016
407015ea-5c50-4bdf-99b5-b3e1180ac313	413d8c29-5586-41f5-9171-2aff463b3075	tuesday	15:30	16:10	13	f	Period 11	\N	\N	2026-04-20 00:24:49.648	2026-04-20 00:51:55.022
db955988-2083-46f7-9770-df1a4dce3afe	413d8c29-5586-41f5-9171-2aff463b3075	tuesday	16:15	16:55	14	f	Period 12	\N	\N	2026-04-20 00:24:49.653	2026-04-20 00:51:55.028
cd22aef9-966f-4e2f-984d-b8f3909e4ab5	413d8c29-5586-41f5-9171-2aff463b3075	wednesday	07:00	07:40	1	f	Period 1	\N	\N	2026-04-20 00:24:49.659	2026-04-20 00:51:55.034
dea37649-9021-4e87-aeb9-8229cd758468	413d8c29-5586-41f5-9171-2aff463b3075	wednesday	07:45	08:25	2	f	Period 2	\N	\N	2026-04-20 00:24:49.665	2026-04-20 00:51:55.04
ebad5b97-16c7-46c1-bc1c-1ec586c533fa	413d8c29-5586-41f5-9171-2aff463b3075	wednesday	08:30	09:10	3	f	Period 3	\N	\N	2026-04-20 00:24:49.669	2026-04-20 00:51:55.045
eb4398a8-d270-4ac3-bed5-6fa40bc25bb0	413d8c29-5586-41f5-9171-2aff463b3075	wednesday	09:15	09:55	4	f	Period 4	\N	\N	2026-04-20 00:24:49.674	2026-04-20 00:51:55.05
043a8e23-7322-4573-b200-d95795111d4b	413d8c29-5586-41f5-9171-2aff463b3075	wednesday	09:55	10:15	5	t	Morning Break	Morning Break	20	2026-04-20 00:24:49.681	2026-04-20 00:51:55.054
fbc2d4c1-3dd9-4d0b-84c6-0a1740bfee10	413d8c29-5586-41f5-9171-2aff463b3075	wednesday	10:15	10:55	6	f	Period 5	\N	\N	2026-04-20 00:24:49.687	2026-04-20 00:51:55.059
ef657ab2-4088-4266-ae9f-c225be1f6fa1	413d8c29-5586-41f5-9171-2aff463b3075	wednesday	11:00	11:40	7	f	Period 6	\N	\N	2026-04-20 00:24:49.697	2026-04-20 00:51:55.063
d972dd3d-8098-48a2-843e-bc55af70cc7e	b09c2a20-cbc7-4884-990b-a2154414cb92	monday	07:00	07:40	1	f	Period 1	\N	\N	2026-04-20 00:24:48.136	2026-04-20 00:51:53.716
4c673288-01bb-481e-826e-bfc997494943	b09c2a20-cbc7-4884-990b-a2154414cb92	monday	09:55	10:15	5	t	Morning Break	Morning Break	20	2026-04-20 00:24:48.17	2026-04-20 00:51:53.756
5c743b65-d83e-4b5d-b5ec-f250672a124f	b09c2a20-cbc7-4884-990b-a2154414cb92	thursday	11:45	12:25	8	f	Period 7	\N	\N	2026-04-20 00:24:48.462	2026-04-20 00:51:54.021
24c8dcd6-35ac-4c6f-acfd-a2e7ed9a25bf	b09c2a20-cbc7-4884-990b-a2154414cb92	thursday	13:10	14:00	10	t	Lunch Break	Lunch Break	50	2026-04-20 00:24:48.474	2026-04-20 00:51:54.031
4f32aa77-b5f0-48ac-8df9-ad743725ad82	25e31e5c-13fd-46ec-a403-fa10e6c1a498	wednesday	07:00	07:40	1	f	Period 1	\N	\N	2026-04-20 00:24:48.783	2026-04-20 00:51:54.285
0995f5ae-6514-45b5-8ece-4715ab6ee961	25e31e5c-13fd-46ec-a403-fa10e6c1a498	wednesday	09:55	10:15	5	t	Morning Break	Morning Break	20	2026-04-20 00:24:48.805	2026-04-20 00:51:54.307
78c2a6bd-1930-49f6-984a-486cd6fa787d	c25d24b1-40fa-491e-bec3-afc9ad8ea567	monday	11:45	12:25	8	f	Period 7	\N	\N	2026-04-20 00:24:49.085	2026-04-20 00:51:54.556
ae4c0ec4-3922-4ea4-9809-9da73f87e510	c25d24b1-40fa-491e-bec3-afc9ad8ea567	monday	13:10	14:00	10	t	Lunch Break	Lunch Break	50	2026-04-20 00:24:49.099	2026-04-20 00:51:54.568
35c5a1c1-7e3a-458b-8ab2-ac771045de7f	c25d24b1-40fa-491e-bec3-afc9ad8ea567	friday	07:00	07:40	1	f	Period 1	\N	\N	2026-04-20 00:24:49.397	2026-04-20 00:51:54.808
fd95fd65-54ba-4e7b-9420-866b0826c29f	c25d24b1-40fa-491e-bec3-afc9ad8ea567	friday	09:55	10:15	5	t	Morning Break	Morning Break	20	2026-04-20 00:24:49.42	2026-04-20 00:51:54.827
b4b73264-8314-4c0b-8ce2-c0cbabe2431e	413d8c29-5586-41f5-9171-2aff463b3075	wednesday	11:45	12:25	8	f	Period 7	\N	\N	2026-04-20 00:24:49.701	2026-04-20 00:51:55.068
5fa73e64-c964-4fbc-a1a9-b7ae8bafbafa	413d8c29-5586-41f5-9171-2aff463b3075	wednesday	12:30	13:10	9	f	Period 8	\N	\N	2026-04-20 00:24:49.707	2026-04-20 00:51:55.072
a3d37f39-46eb-4188-b0cc-779e1defea8e	413d8c29-5586-41f5-9171-2aff463b3075	wednesday	13:10	14:00	10	t	Lunch Break	Lunch Break	50	2026-04-20 00:24:49.712	2026-04-20 00:51:55.076
711ce1f7-3b58-415b-883f-903e4e040b27	413d8c29-5586-41f5-9171-2aff463b3075	wednesday	14:00	14:40	11	f	Period 9	\N	\N	2026-04-20 00:24:49.719	2026-04-20 00:51:55.08
efff70a5-438d-4463-87f6-9df5224b9d2c	413d8c29-5586-41f5-9171-2aff463b3075	wednesday	14:45	15:25	12	f	Period 10	\N	\N	2026-04-20 00:24:49.724	2026-04-20 00:51:55.085
9462b8b5-364f-42bb-aa67-0e3d59309935	413d8c29-5586-41f5-9171-2aff463b3075	wednesday	15:30	16:10	13	f	Period 11	\N	\N	2026-04-20 00:24:49.731	2026-04-20 00:51:55.089
936266bb-1a08-45f7-a408-f24458b33680	413d8c29-5586-41f5-9171-2aff463b3075	wednesday	16:15	16:55	14	f	Period 12	\N	\N	2026-04-20 00:24:49.738	2026-04-20 00:51:55.093
4cf31797-0310-4796-82cc-3f56c38adebc	413d8c29-5586-41f5-9171-2aff463b3075	thursday	07:00	07:40	1	f	Period 1	\N	\N	2026-04-20 00:24:49.744	2026-04-20 00:51:55.097
35a5cce4-568f-467a-bcaa-a5b4536e1aa1	413d8c29-5586-41f5-9171-2aff463b3075	thursday	07:45	08:25	2	f	Period 2	\N	\N	2026-04-20 00:24:49.75	2026-04-20 00:51:55.102
e6b5cf8e-af09-461c-b7da-27a9cce421a8	413d8c29-5586-41f5-9171-2aff463b3075	thursday	08:30	09:10	3	f	Period 3	\N	\N	2026-04-20 00:24:49.756	2026-04-20 00:51:55.106
1edf4a4e-9be8-42d8-85df-df49b233d8e5	413d8c29-5586-41f5-9171-2aff463b3075	thursday	09:15	09:55	4	f	Period 4	\N	\N	2026-04-20 00:24:49.762	2026-04-20 00:51:55.11
6fc56b62-3bd0-43bc-9ed4-ffa8ee20050d	413d8c29-5586-41f5-9171-2aff463b3075	thursday	09:55	10:15	5	t	Morning Break	Morning Break	20	2026-04-20 00:24:49.768	2026-04-20 00:51:55.115
4473a5db-97c0-4fe3-935d-0106597cc916	413d8c29-5586-41f5-9171-2aff463b3075	thursday	10:15	10:55	6	f	Period 5	\N	\N	2026-04-20 00:24:49.774	2026-04-20 00:51:55.119
b92763b5-f0f2-42c6-94d5-77739f11ad11	413d8c29-5586-41f5-9171-2aff463b3075	thursday	11:00	11:40	7	f	Period 6	\N	\N	2026-04-20 00:24:49.781	2026-04-20 00:51:55.123
06a21900-dbb7-43d3-a1bd-12498ce6a015	413d8c29-5586-41f5-9171-2aff463b3075	thursday	11:45	12:25	8	f	Period 7	\N	\N	2026-04-20 00:24:49.787	2026-04-20 00:51:55.127
7a8f3db4-8f76-4a38-910e-6ae9b21e843b	413d8c29-5586-41f5-9171-2aff463b3075	thursday	12:30	13:10	9	f	Period 8	\N	\N	2026-04-20 00:24:49.792	2026-04-20 00:51:55.132
67c8d642-10c7-4622-9c78-1c9ba7971270	413d8c29-5586-41f5-9171-2aff463b3075	thursday	13:10	14:00	10	t	Lunch Break	Lunch Break	50	2026-04-20 00:24:49.798	2026-04-20 00:51:55.137
bb36fb66-9fe0-4f15-ad58-0c18ef000e25	413d8c29-5586-41f5-9171-2aff463b3075	thursday	14:00	14:40	11	f	Period 9	\N	\N	2026-04-20 00:24:49.802	2026-04-20 00:51:55.141
ee531d5f-097e-4310-9465-260f0a5efce0	413d8c29-5586-41f5-9171-2aff463b3075	thursday	14:45	15:25	12	f	Period 10	\N	\N	2026-04-20 00:24:49.808	2026-04-20 00:51:55.146
ff1f0354-c488-46ea-99ba-78914e991bf2	413d8c29-5586-41f5-9171-2aff463b3075	thursday	15:30	16:10	13	f	Period 11	\N	\N	2026-04-20 00:24:49.815	2026-04-20 00:51:55.153
78f7c302-f530-4bc9-a769-a6388a0b2492	413d8c29-5586-41f5-9171-2aff463b3075	thursday	16:15	16:55	14	f	Period 12	\N	\N	2026-04-20 00:24:49.821	2026-04-20 00:51:55.158
75172633-9a35-4b10-86bd-64e6cfb8eec7	413d8c29-5586-41f5-9171-2aff463b3075	friday	07:00	07:40	1	f	Period 1	\N	\N	2026-04-20 00:24:49.826	2026-04-20 00:51:55.163
5af83468-0399-4f43-9348-24a86cfb6449	413d8c29-5586-41f5-9171-2aff463b3075	friday	07:45	08:25	2	f	Period 2	\N	\N	2026-04-20 00:24:49.832	2026-04-20 00:51:55.168
02d7e89a-6988-420f-a092-f3722af0692b	413d8c29-5586-41f5-9171-2aff463b3075	friday	08:30	09:10	3	f	Period 3	\N	\N	2026-04-20 00:24:49.838	2026-04-20 00:51:55.172
522dcc2d-fa9f-4f54-99d7-b972c7e5d029	413d8c29-5586-41f5-9171-2aff463b3075	friday	09:15	09:55	4	f	Period 4	\N	\N	2026-04-20 00:24:49.844	2026-04-20 00:51:55.176
b17756a6-9930-4048-80e4-309f8daf09d4	413d8c29-5586-41f5-9171-2aff463b3075	friday	09:55	10:15	5	t	Morning Break	Morning Break	20	2026-04-20 00:24:49.85	2026-04-20 00:51:55.182
154cd2da-b92e-401b-a276-394c8e6ba270	413d8c29-5586-41f5-9171-2aff463b3075	friday	10:15	10:55	6	f	Period 5	\N	\N	2026-04-20 00:24:49.855	2026-04-20 00:51:55.187
cf3f0eb7-4c75-485b-9f11-3b453d35db97	413d8c29-5586-41f5-9171-2aff463b3075	friday	11:00	11:40	7	f	Period 6	\N	\N	2026-04-20 00:24:49.86	2026-04-20 00:51:55.191
4dac9b55-7b92-4c23-aa24-c534a3ac032f	413d8c29-5586-41f5-9171-2aff463b3075	friday	11:45	12:25	8	f	Period 7	\N	\N	2026-04-20 00:24:49.865	2026-04-20 00:51:55.196
28c4bf10-6cb0-4d30-a81f-244c8eb64a8a	413d8c29-5586-41f5-9171-2aff463b3075	friday	12:30	13:10	9	f	Period 8	\N	\N	2026-04-20 00:24:49.871	2026-04-20 00:51:55.2
0d2c582a-9b4a-40f5-9279-9952729aecd8	413d8c29-5586-41f5-9171-2aff463b3075	friday	13:10	14:00	10	t	Lunch Break	Lunch Break	50	2026-04-20 00:24:49.875	2026-04-20 00:51:55.205
8d1cccf2-7758-4657-9230-df97552d18e6	413d8c29-5586-41f5-9171-2aff463b3075	friday	14:00	14:40	11	f	Period 9	\N	\N	2026-04-20 00:24:49.882	2026-04-20 00:51:55.209
8860d4c3-28a6-4416-9330-dba81e9068d4	413d8c29-5586-41f5-9171-2aff463b3075	friday	14:45	15:25	12	f	Period 10	\N	\N	2026-04-20 00:24:49.887	2026-04-20 00:51:55.213
22461923-052c-4ed6-8beb-87d517e1b720	413d8c29-5586-41f5-9171-2aff463b3075	friday	15:30	16:10	13	f	Period 11	\N	\N	2026-04-20 00:24:49.893	2026-04-20 00:51:55.217
113921d6-2311-459c-8892-121a304def9c	413d8c29-5586-41f5-9171-2aff463b3075	friday	16:15	16:55	14	f	Period 12	\N	\N	2026-04-20 00:24:49.899	2026-04-20 00:51:55.222
\.


--
-- Data for Name: TimetableAllocationEntry; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TimetableAllocationEntry" (id, "schoolId", "allocationId", "teacherId", "subjectId", "classId", "dayOfWeek", "startTime", "endTime", "durationMin", "periodType", "periodNumber", term, "academicYear", status, "publishedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TimetableConfig; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TimetableConfig" (id, "schoolId", "startTime", "endTime", "singleDuration", term, "academicYear", "workingDays", "breakSlots", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TimetableEntry; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TimetableEntry" (id, "schoolId", "versionId", "timeSlotId", "teacherId", "classId", "subjectId", "teachingAssignmentId", "classroomId", "isLockedPeriodAssignment", "solvedByAlgorithm", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TimetableNotification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TimetableNotification" (id, "schoolId", "fromUserId", "toUserId", type, title, message, department, term, read, "readAt", meta, "createdAt") FROM stdin;
\.


--
-- Data for Name: TimetableVersion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TimetableVersion" (id, "schoolId", status, "generationStatus", "seasonId", season, "solverScore", "solverStats", "periodAssignmentsLocked", "totalPeriodsNeeded", name, "createdByUserId", "publishedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, email, password, name, role, "schoolId", contact_number, address, date_of_birth, gender, profile_picture_url, "createdAt", "updatedAt", "employeeId", "resetToken", "resetTokenExpiry") FROM stdin;
3e4d7131-f287-4fce-82bb-a47c88c21acd	admin@demo-school.edu	$2a$12$ktdeT8WIN8cnXq7u/AgoC.XRXHAZX1DiFAcv3N.FWGIOLllmZywwi	School Administrator	headteacher	b09c2a20-cbc7-4884-990b-a2154414cb92	+260 xxx xxx xxx	\N	\N	\N	\N	2026-04-20 00:24:32.83	2026-04-20 00:24:32.83	\N	\N	\N
26b2f6ec-c92b-41f6-9621-697f804c9ce3	admin@zambian-school.edu	$2a$12$ktdeT8WIN8cnXq7u/AgoC.XRXHAZX1DiFAcv3N.FWGIOLllmZywwi	School Administrator	headteacher	25e31e5c-13fd-46ec-a403-fa10e6c1a498	+260 xxx xxx xxx	\N	\N	\N	\N	2026-04-20 00:24:32.918	2026-04-20 00:24:32.918	\N	\N	\N
a4ba9152-a190-4d9c-b6c1-699cc0c69ebf	admin@ndakedaysecondaryschool.edu	$2a$12$ktdeT8WIN8cnXq7u/AgoC.XRXHAZX1DiFAcv3N.FWGIOLllmZywwi	School Administrator	headteacher	c25d24b1-40fa-491e-bec3-afc9ad8ea567	0977994626	\N	\N	\N	\N	2026-04-20 00:24:32.933	2026-04-20 00:24:32.933	\N	\N	\N
856385b9-e90d-4118-a1ec-9536a501549e	admin@kalambakuwadaysecondaryschool.edu	$2a$12$ktdeT8WIN8cnXq7u/AgoC.XRXHAZX1DiFAcv3N.FWGIOLllmZywwi	School Administrator	headteacher	413d8c29-5586-41f5-9171-2aff463b3075	0976984221	\N	\N	\N	\N	2026-04-20 00:24:32.949	2026-04-20 00:24:32.949	\N	\N	\N
93efcb2a-c982-4107-a229-04a8d2b42bfc	headteacher@school.com	$2a$10$NypQs0OJhuMLQrXPWtTb8O62K8/mkd3usn73t2oMOvmh5MQ3sMPq.	Headteacher Demo	headteacher	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	\N	\N	\N	2026-04-20 01:06:24.146	2026-04-20 01:06:24.146	\N	\N	\N
a505b671-6f0a-467f-a8ed-fb77756bf212	hod@school.com	$2a$10$NypQs0OJhuMLQrXPWtTb8O62K8/mkd3usn73t2oMOvmh5MQ3sMPq.	HOD Demo	hod	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	\N	\N	\N	2026-04-20 01:06:24.188	2026-04-20 01:06:24.188	\N	\N	\N
c5dcdb66-de2c-4459-aefb-0f85cf5ef45c	teacher@school.com	$2a$10$NypQs0OJhuMLQrXPWtTb8O62K8/mkd3usn73t2oMOvmh5MQ3sMPq.	Teacher Demo	teacher	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	\N	\N	\N	2026-04-20 01:06:24.195	2026-04-20 01:06:24.195	\N	\N	\N
e9ac941e-afb4-4348-9b12-ed68d91d253f	student@school.com	$2a$10$NypQs0OJhuMLQrXPWtTb8O62K8/mkd3usn73t2oMOvmh5MQ3sMPq.	Student Demo	student	3ce87283-13b2-44b3-8cf4-b53c43abd754	\N	\N	\N	\N	\N	2026-04-20 01:06:24.255	2026-04-20 01:06:24.255	\N	\N	\N
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
12462ecf-04ba-49a6-8e44-86a447c44871	c00f64e52adc4dbf83f18f0df96af70cfd5d584cd08036ccfc435bde7d79611e	2026-04-19 14:00:21.062711+00	20260210122709_add_multi_tenancy	\N	\N	2026-04-19 14:00:20.499081+00	1
0aaa2032-2d56-4e6c-8dc4-3e7fd178920b	ecb5c0d6bc88fd87302aaaf68354bc580855681107b163fa5695bfca7f7483de	2026-04-19 14:00:21.649659+00	20260414190000_add_school_registration	\N	\N	2026-04-19 14:00:21.61657+00	1
e1f5327c-5c9a-4f91-aa12-0f89724cff28	c8794b2908b9dbbd0cdc5f7c3a6e6416651bc304a04c6cf07e5cd81159a2eff2	2026-04-19 14:00:21.110872+00	20260210122710_add_feedback	\N	\N	2026-04-19 14:00:21.070856+00	1
cce1cd24-7e8d-45db-81fa-6890e8a5c1ff	5d38874aa6a7dcd7f457ebd4e542ce48e1a49ca9a46b0cbf7d2637be5075a856	2026-04-19 14:00:21.124679+00	20260309120000_add_teacher_assigned_subjects	\N	\N	2026-04-19 14:00:21.117118+00	1
a0243825-7d8d-4c7d-b919-288dd2532384	632c9c22492cf2113e07e94486e3e3838a803446043862e859d38a603b39aaaf	2026-04-19 14:00:21.262208+00	20260327090000_teaching_assignments_and_departments	\N	\N	2026-04-19 14:00:21.130179+00	1
f29ec38c-fbdb-47de-b7cd-14a1eeb4afd4	8a864493776ddbe3e9d6bbd8b1458a5519d64d406e2f399462eb1718e9d6b62b	2026-04-19 14:00:21.668378+00	20260418100000_add_school_registration_last_verification_sent_at	\N	\N	2026-04-19 14:00:21.659838+00	1
23b9132d-3cd5-4998-b28a-68ef0e109763	f2d37153fa783b851237d98ea29f41cf26f2e605263ce8f8d9510158e90cd05c	2026-04-19 14:00:21.275135+00	20260406100000_add_student_face_embedding	\N	\N	2026-04-19 14:00:21.268691+00	1
98384d17-6084-4965-9d4f-719875ebae41	8f087ae7e7af5a27695ba46342d6b7878da5b5f0d7241569b2ddd4dce22f555f	2026-04-19 14:00:21.308257+00	20260408140000_add_classid_refs	\N	\N	2026-04-19 14:00:21.281307+00	1
ac9cbd5e-c3de-43cb-a345-47ac8bc36309	d88035862f5d9e761937f3f3bea93af629b4e511f7b630d3f99ddf3e29ea60a0	2026-04-19 14:00:21.328038+00	20260408153000_add_result_entered_by	\N	\N	2026-04-19 14:00:21.31475+00	1
77316b3c-e14f-4270-8f5d-3dbc1b3b155a	046d0be8c3aa91c17dbe85b9d3a2978810812799b9f57d5d7c58b037fa197eb5	2026-04-19 14:00:26.124513+00	20260419140025_add_time_slots_and_teacher_period_assignments	\N	\N	2026-04-19 14:00:25.382845+00	1
ed88c31c-d15a-445e-9a9d-f1de235d2caa	71d6cc371e099c4d195d4a49c47f292961270d00abb8c334819bd528faf57972	2026-04-19 14:00:21.354041+00	20260412110000_public_directory_and_feedback_public	\N	\N	2026-04-19 14:00:21.33488+00	1
8324e4a9-8c91-403c-a355-ca17d6efdfb1	63cf4621ce3f3695250833e8ee8147cdee84288d936c22ea15f47d4effff510f	2026-04-19 14:00:21.425672+00	20260412111500_strategic_planning	\N	\N	2026-04-19 14:00:21.362439+00	1
64c5f5f1-0847-4079-8a0c-2ec43942bcd3	a3df4e1b77a00a2008c6dfa40cf0bcf74e2175788bd3a126048e210aba4819e8	2026-04-19 14:00:21.445744+00	20260412113000_school_email_verification	\N	\N	2026-04-19 14:00:21.432502+00	1
6fd7682d-c5d8-4a96-b821-2e52bae2916c	33ea0bc542d776075ce93233076cd3ff96e3144e6adb3b4520fc63e477379f6a	2026-04-20 00:22:48.620289+00	20260420002248_add_scheduling_recipes	\N	\N	2026-04-20 00:22:48.368281+00	1
d33e3aaa-a987-41e9-ab36-77f405c60d04	55544854dbd303e3c2ce88a2532446caf7d78b128a93dc2ca27149584db4e64a	2026-04-19 14:00:21.491786+00	20260412120000_teacher_term_progress	\N	\N	2026-04-19 14:00:21.456209+00	1
d8cf0cd7-4c8c-4b84-8ab3-458a7432ae00	c098a982e4bf0303d773f33e819f11f9fd6bd4262eefe285a93ada6a6c4de753	2026-04-19 14:00:21.548289+00	20260414160000_add_plan_level_ai_request	\N	\N	2026-04-19 14:00:21.49799+00	1
e475349d-e417-47a5-9ea5-6a3b75176d07	648a03d029a89967947c094e0c40b4de91a21d31d256b372d01c9170edf6a9a0	2026-04-19 14:00:21.608822+00	20260414173000_add_ai_usage_log	\N	\N	2026-04-19 14:00:21.565169+00	1
\.


--
-- Name: AIRequest AIRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AIRequest"
    ADD CONSTRAINT "AIRequest_pkey" PRIMARY KEY (id);


--
-- Name: AIUsageLog AIUsageLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AIUsageLog"
    ADD CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY (id);


--
-- Name: ActivityParticipant ActivityParticipant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityParticipant"
    ADD CONSTRAINT "ActivityParticipant_pkey" PRIMARY KEY (id);


--
-- Name: Activity Activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Activity"
    ADD CONSTRAINT "Activity_pkey" PRIMARY KEY (id);


--
-- Name: Assessment Assessment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Assessment"
    ADD CONSTRAINT "Assessment_pkey" PRIMARY KEY (id);


--
-- Name: AssignmentSubmission AssignmentSubmission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AssignmentSubmission"
    ADD CONSTRAINT "AssignmentSubmission_pkey" PRIMARY KEY (id);


--
-- Name: Assignment Assignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Assignment"
    ADD CONSTRAINT "Assignment_pkey" PRIMARY KEY (id);


--
-- Name: Attendance Attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_pkey" PRIMARY KEY (id);


--
-- Name: Badge Badge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Badge"
    ADD CONSTRAINT "Badge_pkey" PRIMARY KEY (id);


--
-- Name: BookLoan BookLoan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BookLoan"
    ADD CONSTRAINT "BookLoan_pkey" PRIMARY KEY (id);


--
-- Name: Class Class_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Class"
    ADD CONSTRAINT "Class_pkey" PRIMARY KEY (id);


--
-- Name: Classroom Classroom_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Classroom"
    ADD CONSTRAINT "Classroom_pkey" PRIMARY KEY (id);


--
-- Name: Constraint Constraint_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Constraint"
    ADD CONSTRAINT "Constraint_pkey" PRIMARY KEY (id);


--
-- Name: CreativeFeature CreativeFeature_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CreativeFeature"
    ADD CONSTRAINT "CreativeFeature_pkey" PRIMARY KEY (id);


--
-- Name: Department Department_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Department"
    ADD CONSTRAINT "Department_pkey" PRIMARY KEY (id);


--
-- Name: Feedback Feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Feedback"
    ADD CONSTRAINT "Feedback_pkey" PRIMARY KEY (id);


--
-- Name: FieldTrip FieldTrip_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FieldTrip"
    ADD CONSTRAINT "FieldTrip_pkey" PRIMARY KEY (id);


--
-- Name: Game Game_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Game"
    ADD CONSTRAINT "Game_pkey" PRIMARY KEY (id);


--
-- Name: GamificationProfile GamificationProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GamificationProfile"
    ADD CONSTRAINT "GamificationProfile_pkey" PRIMARY KEY (id);


--
-- Name: Goal Goal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Goal"
    ADD CONSTRAINT "Goal_pkey" PRIMARY KEY (id);


--
-- Name: HeadOfDepartment HeadOfDepartment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HeadOfDepartment"
    ADD CONSTRAINT "HeadOfDepartment_pkey" PRIMARY KEY (id);


--
-- Name: Note Note_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Note"
    ADD CONSTRAINT "Note_pkey" PRIMARY KEY (id);


--
-- Name: PupilSubjectEnrollment PupilSubjectEnrollment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PupilSubjectEnrollment"
    ADD CONSTRAINT "PupilSubjectEnrollment_pkey" PRIMARY KEY (id);


--
-- Name: RecipeBlock RecipeBlock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RecipeBlock"
    ADD CONSTRAINT "RecipeBlock_pkey" PRIMARY KEY (id);


--
-- Name: RecipeConstraint RecipeConstraint_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RecipeConstraint"
    ADD CONSTRAINT "RecipeConstraint_pkey" PRIMARY KEY (id);


--
-- Name: Result Result_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Result"
    ADD CONSTRAINT "Result_pkey" PRIMARY KEY (id);


--
-- Name: ResultsStatus ResultsStatus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ResultsStatus"
    ADD CONSTRAINT "ResultsStatus_pkey" PRIMARY KEY (id);


--
-- Name: SchedulingRecipe SchedulingRecipe_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SchedulingRecipe"
    ADD CONSTRAINT "SchedulingRecipe_pkey" PRIMARY KEY (id);


--
-- Name: School School_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."School"
    ADD CONSTRAINT "School_pkey" PRIMARY KEY (id);


--
-- Name: StrategicGoal StrategicGoal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StrategicGoal"
    ADD CONSTRAINT "StrategicGoal_pkey" PRIMARY KEY (id);


--
-- Name: StrategicReview StrategicReview_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StrategicReview"
    ADD CONSTRAINT "StrategicReview_pkey" PRIMARY KEY (id);


--
-- Name: StudentBadge StudentBadge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudentBadge"
    ADD CONSTRAINT "StudentBadge_pkey" PRIMARY KEY (id);


--
-- Name: StudentGame StudentGame_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudentGame"
    ADD CONSTRAINT "StudentGame_pkey" PRIMARY KEY (id);


--
-- Name: StudentMaterial StudentMaterial_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudentMaterial"
    ADD CONSTRAINT "StudentMaterial_pkey" PRIMARY KEY (id);


--
-- Name: StudentWork StudentWork_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudentWork"
    ADD CONSTRAINT "StudentWork_pkey" PRIMARY KEY (id);


--
-- Name: Student Student_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_pkey" PRIMARY KEY (id);


--
-- Name: StudyMaterial StudyMaterial_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudyMaterial"
    ADD CONSTRAINT "StudyMaterial_pkey" PRIMARY KEY (id);


--
-- Name: Subject Subject_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Subject"
    ADD CONSTRAINT "Subject_pkey" PRIMARY KEY (id);


--
-- Name: Substitution Substitution_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Substitution"
    ADD CONSTRAINT "Substitution_pkey" PRIMARY KEY (id);


--
-- Name: TeacherAllocation TeacherAllocation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeacherAllocation"
    ADD CONSTRAINT "TeacherAllocation_pkey" PRIMARY KEY (id);


--
-- Name: TeacherDepartment TeacherDepartment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeacherDepartment"
    ADD CONSTRAINT "TeacherDepartment_pkey" PRIMARY KEY ("teacherId", "departmentId");


--
-- Name: TeacherPeriodAssignment TeacherPeriodAssignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeacherPeriodAssignment"
    ADD CONSTRAINT "TeacherPeriodAssignment_pkey" PRIMARY KEY (id);


--
-- Name: TeacherTermProgress TeacherTermProgress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeacherTermProgress"
    ADD CONSTRAINT "TeacherTermProgress_pkey" PRIMARY KEY (id);


--
-- Name: Teacher Teacher_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Teacher"
    ADD CONSTRAINT "Teacher_pkey" PRIMARY KEY (id);


--
-- Name: TeachingAssignment TeachingAssignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeachingAssignment"
    ADD CONSTRAINT "TeachingAssignment_pkey" PRIMARY KEY (id);


--
-- Name: TimeSlot TimeSlot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimeSlot"
    ADD CONSTRAINT "TimeSlot_pkey" PRIMARY KEY (id);


--
-- Name: TimetableAllocationEntry TimetableAllocationEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimetableAllocationEntry"
    ADD CONSTRAINT "TimetableAllocationEntry_pkey" PRIMARY KEY (id);


--
-- Name: TimetableConfig TimetableConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimetableConfig"
    ADD CONSTRAINT "TimetableConfig_pkey" PRIMARY KEY (id);


--
-- Name: TimetableEntry TimetableEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimetableEntry"
    ADD CONSTRAINT "TimetableEntry_pkey" PRIMARY KEY (id);


--
-- Name: TimetableNotification TimetableNotification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimetableNotification"
    ADD CONSTRAINT "TimetableNotification_pkey" PRIMARY KEY (id);


--
-- Name: TimetableVersion TimetableVersion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimetableVersion"
    ADD CONSTRAINT "TimetableVersion_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AIRequest_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AIRequest_createdAt_idx" ON public."AIRequest" USING btree ("createdAt");


--
-- Name: AIRequest_feature_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AIRequest_feature_idx" ON public."AIRequest" USING btree (feature);


--
-- Name: AIRequest_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AIRequest_schoolId_idx" ON public."AIRequest" USING btree ("schoolId");


--
-- Name: AIUsageLog_schoolId_monthKey_featureId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AIUsageLog_schoolId_monthKey_featureId_key" ON public."AIUsageLog" USING btree ("schoolId", "monthKey", "featureId");


--
-- Name: AIUsageLog_schoolId_monthKey_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AIUsageLog_schoolId_monthKey_idx" ON public."AIUsageLog" USING btree ("schoolId", "monthKey");


--
-- Name: ActivityParticipant_activityId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ActivityParticipant_activityId_userId_key" ON public."ActivityParticipant" USING btree ("activityId", "userId");


--
-- Name: ActivityParticipant_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ActivityParticipant_schoolId_idx" ON public."ActivityParticipant" USING btree ("schoolId");


--
-- Name: Activity_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Activity_date_idx" ON public."Activity" USING btree (date);


--
-- Name: Activity_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Activity_schoolId_idx" ON public."Activity" USING btree ("schoolId");


--
-- Name: Activity_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Activity_type_idx" ON public."Activity" USING btree (type);


--
-- Name: Assessment_classId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Assessment_classId_idx" ON public."Assessment" USING btree ("classId");


--
-- Name: Assessment_class_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Assessment_class_idx" ON public."Assessment" USING btree (class);


--
-- Name: Assessment_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Assessment_date_idx" ON public."Assessment" USING btree (date);


--
-- Name: Assessment_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Assessment_schoolId_idx" ON public."Assessment" USING btree ("schoolId");


--
-- Name: Assessment_subject_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Assessment_subject_idx" ON public."Assessment" USING btree (subject);


--
-- Name: AssignmentSubmission_assignmentId_studentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AssignmentSubmission_assignmentId_studentId_key" ON public."AssignmentSubmission" USING btree ("assignmentId", "studentId");


--
-- Name: AssignmentSubmission_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AssignmentSubmission_schoolId_idx" ON public."AssignmentSubmission" USING btree ("schoolId");


--
-- Name: Assignment_classId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Assignment_classId_idx" ON public."Assignment" USING btree ("classId");


--
-- Name: Assignment_dueDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Assignment_dueDate_idx" ON public."Assignment" USING btree ("dueDate");


--
-- Name: Assignment_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Assignment_schoolId_idx" ON public."Assignment" USING btree ("schoolId");


--
-- Name: Attendance_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Attendance_date_idx" ON public."Attendance" USING btree (date);


--
-- Name: Attendance_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Attendance_schoolId_idx" ON public."Attendance" USING btree ("schoolId");


--
-- Name: Attendance_studentId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Attendance_studentId_date_key" ON public."Attendance" USING btree ("studentId", date);


--
-- Name: Attendance_studentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Attendance_studentId_idx" ON public."Attendance" USING btree ("studentId");


--
-- Name: Badge_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Badge_schoolId_idx" ON public."Badge" USING btree ("schoolId");


--
-- Name: Badge_schoolId_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Badge_schoolId_name_key" ON public."Badge" USING btree ("schoolId", name);


--
-- Name: BookLoan_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BookLoan_schoolId_idx" ON public."BookLoan" USING btree ("schoolId");


--
-- Name: BookLoan_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BookLoan_status_idx" ON public."BookLoan" USING btree (status);


--
-- Name: BookLoan_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BookLoan_userId_idx" ON public."BookLoan" USING btree ("userId");


--
-- Name: Class_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Class_schoolId_idx" ON public."Class" USING btree ("schoolId");


--
-- Name: Class_schoolId_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Class_schoolId_name_key" ON public."Class" USING btree ("schoolId", name);


--
-- Name: Class_year_group_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Class_year_group_idx" ON public."Class" USING btree (year_group);


--
-- Name: Classroom_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Classroom_name_idx" ON public."Classroom" USING btree (name);


--
-- Name: Classroom_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Classroom_schoolId_idx" ON public."Classroom" USING btree ("schoolId");


--
-- Name: Classroom_schoolId_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Classroom_schoolId_name_key" ON public."Classroom" USING btree ("schoolId", name);


--
-- Name: Constraint_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Constraint_schoolId_idx" ON public."Constraint" USING btree ("schoolId");


--
-- Name: Constraint_schoolId_scope_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Constraint_schoolId_scope_idx" ON public."Constraint" USING btree ("schoolId", scope);


--
-- Name: Constraint_schoolId_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Constraint_schoolId_type_idx" ON public."Constraint" USING btree ("schoolId", type);


--
-- Name: Constraint_targetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Constraint_targetId_idx" ON public."Constraint" USING btree ("targetId");


--
-- Name: CreativeFeature_schoolId_featureId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CreativeFeature_schoolId_featureId_key" ON public."CreativeFeature" USING btree ("schoolId", "featureId");


--
-- Name: CreativeFeature_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CreativeFeature_schoolId_idx" ON public."CreativeFeature" USING btree ("schoolId");


--
-- Name: Department_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Department_name_idx" ON public."Department" USING btree (name);


--
-- Name: Department_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Department_schoolId_idx" ON public."Department" USING btree ("schoolId");


--
-- Name: Department_schoolId_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Department_schoolId_name_key" ON public."Department" USING btree ("schoolId", name);


--
-- Name: Feedback_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Feedback_createdAt_idx" ON public."Feedback" USING btree ("createdAt");


--
-- Name: Feedback_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Feedback_schoolId_idx" ON public."Feedback" USING btree ("schoolId");


--
-- Name: Feedback_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Feedback_userId_idx" ON public."Feedback" USING btree ("userId");


--
-- Name: FieldTrip_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FieldTrip_date_idx" ON public."FieldTrip" USING btree (date);


--
-- Name: FieldTrip_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FieldTrip_schoolId_idx" ON public."FieldTrip" USING btree ("schoolId");


--
-- Name: Game_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Game_schoolId_idx" ON public."Game" USING btree ("schoolId");


--
-- Name: Game_subject_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Game_subject_idx" ON public."Game" USING btree (subject);


--
-- Name: Game_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Game_type_idx" ON public."Game" USING btree (type);


--
-- Name: GamificationProfile_points_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GamificationProfile_points_idx" ON public."GamificationProfile" USING btree (points);


--
-- Name: GamificationProfile_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GamificationProfile_schoolId_idx" ON public."GamificationProfile" USING btree ("schoolId");


--
-- Name: GamificationProfile_studentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "GamificationProfile_studentId_key" ON public."GamificationProfile" USING btree ("studentId");


--
-- Name: Goal_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Goal_schoolId_idx" ON public."Goal" USING btree ("schoolId");


--
-- Name: Goal_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Goal_status_idx" ON public."Goal" USING btree (status);


--
-- Name: Goal_studentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Goal_studentId_idx" ON public."Goal" USING btree ("studentId");


--
-- Name: HeadOfDepartment_departmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "HeadOfDepartment_departmentId_idx" ON public."HeadOfDepartment" USING btree ("departmentId");


--
-- Name: HeadOfDepartment_department_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "HeadOfDepartment_department_idx" ON public."HeadOfDepartment" USING btree (department);


--
-- Name: HeadOfDepartment_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "HeadOfDepartment_schoolId_idx" ON public."HeadOfDepartment" USING btree ("schoolId");


--
-- Name: HeadOfDepartment_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "HeadOfDepartment_userId_key" ON public."HeadOfDepartment" USING btree ("userId");


--
-- Name: Note_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Note_schoolId_idx" ON public."Note" USING btree ("schoolId");


--
-- Name: Note_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Note_userId_idx" ON public."Note" USING btree ("userId");


--
-- Name: PupilSubjectEnrollment_classId_subjectId_pupilId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PupilSubjectEnrollment_classId_subjectId_pupilId_idx" ON public."PupilSubjectEnrollment" USING btree ("classId", "subjectId", "pupilId");


--
-- Name: PupilSubjectEnrollment_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PupilSubjectEnrollment_schoolId_idx" ON public."PupilSubjectEnrollment" USING btree ("schoolId");


--
-- Name: PupilSubjectEnrollment_schoolId_pupilId_subjectId_classId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PupilSubjectEnrollment_schoolId_pupilId_subjectId_classId_key" ON public."PupilSubjectEnrollment" USING btree ("schoolId", "pupilId", "subjectId", "classId");


--
-- Name: RecipeBlock_recipeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RecipeBlock_recipeId_idx" ON public."RecipeBlock" USING btree ("recipeId");


--
-- Name: RecipeBlock_recipeId_placementPriority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RecipeBlock_recipeId_placementPriority_idx" ON public."RecipeBlock" USING btree ("recipeId", "placementPriority");


--
-- Name: RecipeBlock_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RecipeBlock_type_idx" ON public."RecipeBlock" USING btree (type);


--
-- Name: RecipeConstraint_priority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RecipeConstraint_priority_idx" ON public."RecipeConstraint" USING btree (priority);


--
-- Name: RecipeConstraint_recipeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RecipeConstraint_recipeId_idx" ON public."RecipeConstraint" USING btree ("recipeId");


--
-- Name: RecipeConstraint_recipeId_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RecipeConstraint_recipeId_type_idx" ON public."RecipeConstraint" USING btree ("recipeId", type);


--
-- Name: Result_enteredByUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Result_enteredByUserId_idx" ON public."Result" USING btree ("enteredByUserId");


--
-- Name: Result_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Result_schoolId_idx" ON public."Result" USING btree ("schoolId");


--
-- Name: Result_score_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Result_score_idx" ON public."Result" USING btree (score);


--
-- Name: Result_studentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Result_studentId_idx" ON public."Result" USING btree ("studentId");


--
-- Name: Result_subjectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Result_subjectId_idx" ON public."Result" USING btree ("subjectId");


--
-- Name: Result_term_year_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Result_term_year_idx" ON public."Result" USING btree (term, year);


--
-- Name: Result_workflowStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Result_workflowStatus_idx" ON public."Result" USING btree ("workflowStatus");


--
-- Name: ResultsStatus_isComplete_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ResultsStatus_isComplete_idx" ON public."ResultsStatus" USING btree ("isComplete");


--
-- Name: ResultsStatus_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ResultsStatus_schoolId_idx" ON public."ResultsStatus" USING btree ("schoolId");


--
-- Name: ResultsStatus_schoolId_studentId_term_year_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ResultsStatus_schoolId_studentId_term_year_key" ON public."ResultsStatus" USING btree ("schoolId", "studentId", term, year);


--
-- Name: ResultsStatus_smsSentAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ResultsStatus_smsSentAt_idx" ON public."ResultsStatus" USING btree ("smsSentAt");


--
-- Name: ResultsStatus_studentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ResultsStatus_studentId_idx" ON public."ResultsStatus" USING btree ("studentId");


--
-- Name: ResultsStatus_term_year_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ResultsStatus_term_year_idx" ON public."ResultsStatus" USING btree (term, year);


--
-- Name: SchedulingRecipe_isValid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SchedulingRecipe_isValid_idx" ON public."SchedulingRecipe" USING btree ("isValid");


--
-- Name: SchedulingRecipe_schoolId_classId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SchedulingRecipe_schoolId_classId_idx" ON public."SchedulingRecipe" USING btree ("schoolId", "classId");


--
-- Name: SchedulingRecipe_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SchedulingRecipe_schoolId_idx" ON public."SchedulingRecipe" USING btree ("schoolId");


--
-- Name: SchedulingRecipe_schoolId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SchedulingRecipe_schoolId_status_idx" ON public."SchedulingRecipe" USING btree ("schoolId", status);


--
-- Name: SchedulingRecipe_schoolId_subjectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SchedulingRecipe_schoolId_subjectId_idx" ON public."SchedulingRecipe" USING btree ("schoolId", "subjectId");


--
-- Name: SchedulingRecipe_schoolId_teacherId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SchedulingRecipe_schoolId_teacherId_idx" ON public."SchedulingRecipe" USING btree ("schoolId", "teacherId");


--
-- Name: SchedulingRecipe_schoolId_teachingAssignmentId_season_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SchedulingRecipe_schoolId_teachingAssignmentId_season_key" ON public."SchedulingRecipe" USING btree ("schoolId", "teachingAssignmentId", season);


--
-- Name: SchedulingRecipe_season_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SchedulingRecipe_season_idx" ON public."SchedulingRecipe" USING btree (season);


--
-- Name: SchedulingRecipe_teachingAssignmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SchedulingRecipe_teachingAssignmentId_idx" ON public."SchedulingRecipe" USING btree ("teachingAssignmentId");


--
-- Name: School_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "School_active_idx" ON public."School" USING btree (active);


--
-- Name: School_domain_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "School_domain_key" ON public."School" USING btree (domain);


--
-- Name: School_isPubliclyListed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "School_isPubliclyListed_idx" ON public."School" USING btree ("isPubliclyListed");


--
-- Name: School_subdomain_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "School_subdomain_idx" ON public."School" USING btree (subdomain);


--
-- Name: School_subdomain_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "School_subdomain_key" ON public."School" USING btree (subdomain);


--
-- Name: School_verificationToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "School_verificationToken_key" ON public."School" USING btree ("verificationToken");


--
-- Name: StrategicGoal_dueDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StrategicGoal_dueDate_idx" ON public."StrategicGoal" USING btree ("dueDate");


--
-- Name: StrategicGoal_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StrategicGoal_schoolId_idx" ON public."StrategicGoal" USING btree ("schoolId");


--
-- Name: StrategicGoal_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StrategicGoal_status_idx" ON public."StrategicGoal" USING btree (status);


--
-- Name: StrategicReview_scheduledAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StrategicReview_scheduledAt_idx" ON public."StrategicReview" USING btree ("scheduledAt");


--
-- Name: StrategicReview_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StrategicReview_schoolId_idx" ON public."StrategicReview" USING btree ("schoolId");


--
-- Name: StudentBadge_profileId_badgeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "StudentBadge_profileId_badgeId_key" ON public."StudentBadge" USING btree ("profileId", "badgeId");


--
-- Name: StudentBadge_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StudentBadge_schoolId_idx" ON public."StudentBadge" USING btree ("schoolId");


--
-- Name: StudentMaterial_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StudentMaterial_schoolId_idx" ON public."StudentMaterial" USING btree ("schoolId");


--
-- Name: StudentMaterial_studentId_studyMaterialId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "StudentMaterial_studentId_studyMaterialId_key" ON public."StudentMaterial" USING btree ("studentId", "studyMaterialId");


--
-- Name: StudentWork_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StudentWork_createdAt_idx" ON public."StudentWork" USING btree ("createdAt");


--
-- Name: StudentWork_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StudentWork_schoolId_idx" ON public."StudentWork" USING btree ("schoolId");


--
-- Name: StudentWork_studentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StudentWork_studentId_idx" ON public."StudentWork" USING btree ("studentId");


--
-- Name: StudentWork_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StudentWork_type_idx" ON public."StudentWork" USING btree (type);


--
-- Name: Student_classId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Student_classId_idx" ON public."Student" USING btree ("classId");


--
-- Name: Student_class_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Student_class_idx" ON public."Student" USING btree (class);


--
-- Name: Student_grade_average_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Student_grade_average_idx" ON public."Student" USING btree (grade_average);


--
-- Name: Student_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Student_name_idx" ON public."Student" USING btree (name);


--
-- Name: Student_schoolId_exam_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Student_schoolId_exam_number_key" ON public."Student" USING btree ("schoolId", exam_number);


--
-- Name: Student_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Student_schoolId_idx" ON public."Student" USING btree ("schoolId");


--
-- Name: Student_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Student_userId_key" ON public."Student" USING btree ("userId");


--
-- Name: StudyMaterial_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StudyMaterial_schoolId_idx" ON public."StudyMaterial" USING btree ("schoolId");


--
-- Name: StudyMaterial_subject_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StudyMaterial_subject_idx" ON public."StudyMaterial" USING btree (subject);


--
-- Name: Subject_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subject_name_idx" ON public."Subject" USING btree (name);


--
-- Name: Subject_schoolId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Subject_schoolId_code_key" ON public."Subject" USING btree ("schoolId", code);


--
-- Name: Subject_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subject_schoolId_idx" ON public."Subject" USING btree ("schoolId");


--
-- Name: Subject_schoolId_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Subject_schoolId_name_key" ON public."Subject" USING btree ("schoolId", name);


--
-- Name: Substitution_coverTeacherId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Substitution_coverTeacherId_idx" ON public."Substitution" USING btree ("coverTeacherId");


--
-- Name: Substitution_originalTeacherId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Substitution_originalTeacherId_idx" ON public."Substitution" USING btree ("originalTeacherId");


--
-- Name: Substitution_schoolId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Substitution_schoolId_date_idx" ON public."Substitution" USING btree ("schoolId", date);


--
-- Name: Substitution_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Substitution_schoolId_idx" ON public."Substitution" USING btree ("schoolId");


--
-- Name: Substitution_slotId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Substitution_slotId_idx" ON public."Substitution" USING btree ("slotId");


--
-- Name: TeacherAllocation_schoolId_hodId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TeacherAllocation_schoolId_hodId_idx" ON public."TeacherAllocation" USING btree ("schoolId", "hodId");


--
-- Name: TeacherAllocation_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TeacherAllocation_schoolId_idx" ON public."TeacherAllocation" USING btree ("schoolId");


--
-- Name: TeacherAllocation_schoolId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TeacherAllocation_schoolId_status_idx" ON public."TeacherAllocation" USING btree ("schoolId", status);


--
-- Name: TeacherAllocation_schoolId_teacherId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TeacherAllocation_schoolId_teacherId_idx" ON public."TeacherAllocation" USING btree ("schoolId", "teacherId");


--
-- Name: TeacherAllocation_schoolId_teacherId_subjectId_classId_term_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TeacherAllocation_schoolId_teacherId_subjectId_classId_term_key" ON public."TeacherAllocation" USING btree ("schoolId", "teacherId", "subjectId", "classId", term, "academicYear");


--
-- Name: TeacherDepartment_departmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TeacherDepartment_departmentId_idx" ON public."TeacherDepartment" USING btree ("departmentId");


--
-- Name: TeacherPeriodAssignment_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TeacherPeriodAssignment_schoolId_idx" ON public."TeacherPeriodAssignment" USING btree ("schoolId");


--
-- Name: TeacherPeriodAssignment_schoolId_teacherId_timeSlotId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TeacherPeriodAssignment_schoolId_teacherId_timeSlotId_key" ON public."TeacherPeriodAssignment" USING btree ("schoolId", "teacherId", "timeSlotId");


--
-- Name: TeacherPeriodAssignment_teacherId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TeacherPeriodAssignment_teacherId_idx" ON public."TeacherPeriodAssignment" USING btree ("teacherId");


--
-- Name: TeacherPeriodAssignment_timeSlotId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TeacherPeriodAssignment_timeSlotId_idx" ON public."TeacherPeriodAssignment" USING btree ("timeSlotId");


--
-- Name: TeacherTermProgress_schoolId_year_term_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TeacherTermProgress_schoolId_year_term_idx" ON public."TeacherTermProgress" USING btree ("schoolId", year, term);


--
-- Name: TeacherTermProgress_teacherId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TeacherTermProgress_teacherId_idx" ON public."TeacherTermProgress" USING btree ("teacherId");


--
-- Name: TeacherTermProgress_teacherId_year_term_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TeacherTermProgress_teacherId_year_term_key" ON public."TeacherTermProgress" USING btree ("teacherId", year, term);


--
-- Name: Teacher_department_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Teacher_department_idx" ON public."Teacher" USING btree (department);


--
-- Name: Teacher_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Teacher_schoolId_idx" ON public."Teacher" USING btree ("schoolId");


--
-- Name: Teacher_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Teacher_userId_key" ON public."Teacher" USING btree ("userId");


--
-- Name: TeachingAssignment_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TeachingAssignment_schoolId_idx" ON public."TeachingAssignment" USING btree ("schoolId");


--
-- Name: TeachingAssignment_schoolId_teacherId_subjectId_classId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TeachingAssignment_schoolId_teacherId_subjectId_classId_key" ON public."TeachingAssignment" USING btree ("schoolId", "teacherId", "subjectId", "classId");


--
-- Name: TeachingAssignment_teacherId_classId_subjectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TeachingAssignment_teacherId_classId_subjectId_idx" ON public."TeachingAssignment" USING btree ("teacherId", "classId", "subjectId");


--
-- Name: TimeSlot_schoolId_dayOfWeek_period_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimeSlot_schoolId_dayOfWeek_period_idx" ON public."TimeSlot" USING btree ("schoolId", "dayOfWeek", period);


--
-- Name: TimeSlot_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimeSlot_schoolId_idx" ON public."TimeSlot" USING btree ("schoolId");


--
-- Name: TimetableAllocationEntry_schoolId_classId_dayOfWeek_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimetableAllocationEntry_schoolId_classId_dayOfWeek_idx" ON public."TimetableAllocationEntry" USING btree ("schoolId", "classId", "dayOfWeek");


--
-- Name: TimetableAllocationEntry_schoolId_dayOfWeek_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimetableAllocationEntry_schoolId_dayOfWeek_idx" ON public."TimetableAllocationEntry" USING btree ("schoolId", "dayOfWeek");


--
-- Name: TimetableAllocationEntry_schoolId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimetableAllocationEntry_schoolId_status_idx" ON public."TimetableAllocationEntry" USING btree ("schoolId", status);


--
-- Name: TimetableAllocationEntry_schoolId_teacherId_dayOfWeek_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimetableAllocationEntry_schoolId_teacherId_dayOfWeek_idx" ON public."TimetableAllocationEntry" USING btree ("schoolId", "teacherId", "dayOfWeek");


--
-- Name: TimetableConfig_schoolId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TimetableConfig_schoolId_key" ON public."TimetableConfig" USING btree ("schoolId");


--
-- Name: TimetableEntry_classId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimetableEntry_classId_idx" ON public."TimetableEntry" USING btree ("classId");


--
-- Name: TimetableEntry_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimetableEntry_schoolId_idx" ON public."TimetableEntry" USING btree ("schoolId");


--
-- Name: TimetableEntry_subjectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimetableEntry_subjectId_idx" ON public."TimetableEntry" USING btree ("subjectId");


--
-- Name: TimetableEntry_teacherId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimetableEntry_teacherId_idx" ON public."TimetableEntry" USING btree ("teacherId");


--
-- Name: TimetableEntry_teachingAssignmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimetableEntry_teachingAssignmentId_idx" ON public."TimetableEntry" USING btree ("teachingAssignmentId");


--
-- Name: TimetableEntry_timeSlotId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimetableEntry_timeSlotId_idx" ON public."TimetableEntry" USING btree ("timeSlotId");


--
-- Name: TimetableEntry_versionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimetableEntry_versionId_idx" ON public."TimetableEntry" USING btree ("versionId");


--
-- Name: TimetableEntry_versionId_timeSlotId_classId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TimetableEntry_versionId_timeSlotId_classId_key" ON public."TimetableEntry" USING btree ("versionId", "timeSlotId", "classId");


--
-- Name: TimetableEntry_versionId_timeSlotId_teacherId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TimetableEntry_versionId_timeSlotId_teacherId_key" ON public."TimetableEntry" USING btree ("versionId", "timeSlotId", "teacherId");


--
-- Name: TimetableNotification_schoolId_toUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimetableNotification_schoolId_toUserId_idx" ON public."TimetableNotification" USING btree ("schoolId", "toUserId");


--
-- Name: TimetableNotification_schoolId_toUserId_read_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimetableNotification_schoolId_toUserId_read_idx" ON public."TimetableNotification" USING btree ("schoolId", "toUserId", read);


--
-- Name: TimetableVersion_createdByUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimetableVersion_createdByUserId_idx" ON public."TimetableVersion" USING btree ("createdByUserId");


--
-- Name: TimetableVersion_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimetableVersion_schoolId_idx" ON public."TimetableVersion" USING btree ("schoolId");


--
-- Name: TimetableVersion_schoolId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimetableVersion_schoolId_status_idx" ON public."TimetableVersion" USING btree ("schoolId", status);


--
-- Name: User_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_role_idx" ON public."User" USING btree (role);


--
-- Name: User_schoolId_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_schoolId_email_key" ON public."User" USING btree ("schoolId", email);


--
-- Name: User_schoolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_schoolId_idx" ON public."User" USING btree ("schoolId");


--
-- Name: AIRequest AIRequest_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AIRequest"
    ADD CONSTRAINT "AIRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AIUsageLog AIUsageLog_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AIUsageLog"
    ADD CONSTRAINT "AIUsageLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActivityParticipant ActivityParticipant_activityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityParticipant"
    ADD CONSTRAINT "ActivityParticipant_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES public."Activity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ActivityParticipant ActivityParticipant_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityParticipant"
    ADD CONSTRAINT "ActivityParticipant_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActivityParticipant ActivityParticipant_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityParticipant"
    ADD CONSTRAINT "ActivityParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Activity Activity_organizerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Activity"
    ADD CONSTRAINT "Activity_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Activity Activity_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Activity"
    ADD CONSTRAINT "Activity_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Assessment Assessment_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Assessment"
    ADD CONSTRAINT "Assessment_classId_fkey" FOREIGN KEY ("classId") REFERENCES public."Class"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Assessment Assessment_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Assessment"
    ADD CONSTRAINT "Assessment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AssignmentSubmission AssignmentSubmission_assignmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AssignmentSubmission"
    ADD CONSTRAINT "AssignmentSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES public."Assignment"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AssignmentSubmission AssignmentSubmission_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AssignmentSubmission"
    ADD CONSTRAINT "AssignmentSubmission_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AssignmentSubmission AssignmentSubmission_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AssignmentSubmission"
    ADD CONSTRAINT "AssignmentSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Assignment Assignment_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Assignment"
    ADD CONSTRAINT "Assignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES public."Class"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Assignment Assignment_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Assignment"
    ADD CONSTRAINT "Assignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Attendance Attendance_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Attendance Attendance_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Badge Badge_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Badge"
    ADD CONSTRAINT "Badge_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BookLoan BookLoan_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BookLoan"
    ADD CONSTRAINT "BookLoan_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BookLoan BookLoan_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BookLoan"
    ADD CONSTRAINT "BookLoan_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Class Class_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Class"
    ADD CONSTRAINT "Class_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Class Class_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Class"
    ADD CONSTRAINT "Class_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public."Teacher"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Classroom Classroom_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Classroom"
    ADD CONSTRAINT "Classroom_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Constraint Constraint_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Constraint"
    ADD CONSTRAINT "Constraint_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CreativeFeature CreativeFeature_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CreativeFeature"
    ADD CONSTRAINT "CreativeFeature_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Department Department_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Department"
    ADD CONSTRAINT "Department_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Feedback Feedback_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Feedback"
    ADD CONSTRAINT "Feedback_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Feedback Feedback_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Feedback"
    ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FieldTrip FieldTrip_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FieldTrip"
    ADD CONSTRAINT "FieldTrip_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Game Game_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Game"
    ADD CONSTRAINT "Game_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GamificationProfile GamificationProfile_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GamificationProfile"
    ADD CONSTRAINT "GamificationProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GamificationProfile GamificationProfile_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GamificationProfile"
    ADD CONSTRAINT "GamificationProfile_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Goal Goal_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Goal"
    ADD CONSTRAINT "Goal_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Goal Goal_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Goal"
    ADD CONSTRAINT "Goal_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: HeadOfDepartment HeadOfDepartment_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HeadOfDepartment"
    ADD CONSTRAINT "HeadOfDepartment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: HeadOfDepartment HeadOfDepartment_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HeadOfDepartment"
    ADD CONSTRAINT "HeadOfDepartment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HeadOfDepartment HeadOfDepartment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HeadOfDepartment"
    ADD CONSTRAINT "HeadOfDepartment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Note Note_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Note"
    ADD CONSTRAINT "Note_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Note Note_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Note"
    ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PupilSubjectEnrollment PupilSubjectEnrollment_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PupilSubjectEnrollment"
    ADD CONSTRAINT "PupilSubjectEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES public."Class"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PupilSubjectEnrollment PupilSubjectEnrollment_pupilId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PupilSubjectEnrollment"
    ADD CONSTRAINT "PupilSubjectEnrollment_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PupilSubjectEnrollment PupilSubjectEnrollment_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PupilSubjectEnrollment"
    ADD CONSTRAINT "PupilSubjectEnrollment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PupilSubjectEnrollment PupilSubjectEnrollment_subjectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PupilSubjectEnrollment"
    ADD CONSTRAINT "PupilSubjectEnrollment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES public."Subject"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RecipeBlock RecipeBlock_recipeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RecipeBlock"
    ADD CONSTRAINT "RecipeBlock_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES public."SchedulingRecipe"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RecipeConstraint RecipeConstraint_recipeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RecipeConstraint"
    ADD CONSTRAINT "RecipeConstraint_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES public."SchedulingRecipe"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Result Result_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Result"
    ADD CONSTRAINT "Result_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Result Result_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Result"
    ADD CONSTRAINT "Result_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Result Result_subjectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Result"
    ADD CONSTRAINT "Result_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES public."Subject"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ResultsStatus ResultsStatus_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ResultsStatus"
    ADD CONSTRAINT "ResultsStatus_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ResultsStatus ResultsStatus_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ResultsStatus"
    ADD CONSTRAINT "ResultsStatus_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SchedulingRecipe SchedulingRecipe_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SchedulingRecipe"
    ADD CONSTRAINT "SchedulingRecipe_classId_fkey" FOREIGN KEY ("classId") REFERENCES public."Class"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SchedulingRecipe SchedulingRecipe_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SchedulingRecipe"
    ADD CONSTRAINT "SchedulingRecipe_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SchedulingRecipe SchedulingRecipe_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SchedulingRecipe"
    ADD CONSTRAINT "SchedulingRecipe_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SchedulingRecipe SchedulingRecipe_seasonVariantOfId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SchedulingRecipe"
    ADD CONSTRAINT "SchedulingRecipe_seasonVariantOfId_fkey" FOREIGN KEY ("seasonVariantOfId") REFERENCES public."SchedulingRecipe"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SchedulingRecipe SchedulingRecipe_subjectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SchedulingRecipe"
    ADD CONSTRAINT "SchedulingRecipe_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES public."Subject"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SchedulingRecipe SchedulingRecipe_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SchedulingRecipe"
    ADD CONSTRAINT "SchedulingRecipe_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public."Teacher"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SchedulingRecipe SchedulingRecipe_teachingAssignmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SchedulingRecipe"
    ADD CONSTRAINT "SchedulingRecipe_teachingAssignmentId_fkey" FOREIGN KEY ("teachingAssignmentId") REFERENCES public."TeachingAssignment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StrategicGoal StrategicGoal_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StrategicGoal"
    ADD CONSTRAINT "StrategicGoal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StrategicGoal StrategicGoal_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StrategicGoal"
    ADD CONSTRAINT "StrategicGoal_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StrategicReview StrategicReview_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StrategicReview"
    ADD CONSTRAINT "StrategicReview_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StrategicReview StrategicReview_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StrategicReview"
    ADD CONSTRAINT "StrategicReview_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StudentBadge StudentBadge_badgeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudentBadge"
    ADD CONSTRAINT "StudentBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES public."Badge"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StudentBadge StudentBadge_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudentBadge"
    ADD CONSTRAINT "StudentBadge_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."GamificationProfile"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StudentBadge StudentBadge_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudentBadge"
    ADD CONSTRAINT "StudentBadge_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StudentGame StudentGame_gameId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudentGame"
    ADD CONSTRAINT "StudentGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES public."Game"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StudentGame StudentGame_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudentGame"
    ADD CONSTRAINT "StudentGame_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StudentGame StudentGame_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudentGame"
    ADD CONSTRAINT "StudentGame_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StudentMaterial StudentMaterial_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudentMaterial"
    ADD CONSTRAINT "StudentMaterial_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StudentMaterial StudentMaterial_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudentMaterial"
    ADD CONSTRAINT "StudentMaterial_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StudentMaterial StudentMaterial_studyMaterialId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudentMaterial"
    ADD CONSTRAINT "StudentMaterial_studyMaterialId_fkey" FOREIGN KEY ("studyMaterialId") REFERENCES public."StudyMaterial"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StudentWork StudentWork_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudentWork"
    ADD CONSTRAINT "StudentWork_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StudentWork StudentWork_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudentWork"
    ADD CONSTRAINT "StudentWork_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Student Student_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES public."Class"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Student Student_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Student Student_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StudyMaterial StudyMaterial_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudyMaterial"
    ADD CONSTRAINT "StudyMaterial_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Subject Subject_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Subject"
    ADD CONSTRAINT "Subject_classId_fkey" FOREIGN KEY ("classId") REFERENCES public."Class"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Subject Subject_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Subject"
    ADD CONSTRAINT "Subject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Subject Subject_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Subject"
    ADD CONSTRAINT "Subject_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public."Teacher"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Substitution Substitution_coverTeacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Substitution"
    ADD CONSTRAINT "Substitution_coverTeacherId_fkey" FOREIGN KEY ("coverTeacherId") REFERENCES public."Teacher"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Substitution Substitution_originalTeacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Substitution"
    ADD CONSTRAINT "Substitution_originalTeacherId_fkey" FOREIGN KEY ("originalTeacherId") REFERENCES public."Teacher"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Substitution Substitution_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Substitution"
    ADD CONSTRAINT "Substitution_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Substitution Substitution_slotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Substitution"
    ADD CONSTRAINT "Substitution_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES public."TimeSlot"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TeacherAllocation TeacherAllocation_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeacherAllocation"
    ADD CONSTRAINT "TeacherAllocation_classId_fkey" FOREIGN KEY ("classId") REFERENCES public."Class"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TeacherAllocation TeacherAllocation_hodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeacherAllocation"
    ADD CONSTRAINT "TeacherAllocation_hodId_fkey" FOREIGN KEY ("hodId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TeacherAllocation TeacherAllocation_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeacherAllocation"
    ADD CONSTRAINT "TeacherAllocation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TeacherAllocation TeacherAllocation_subjectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeacherAllocation"
    ADD CONSTRAINT "TeacherAllocation_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES public."Subject"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TeacherAllocation TeacherAllocation_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeacherAllocation"
    ADD CONSTRAINT "TeacherAllocation_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TeacherDepartment TeacherDepartment_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeacherDepartment"
    ADD CONSTRAINT "TeacherDepartment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TeacherDepartment TeacherDepartment_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeacherDepartment"
    ADD CONSTRAINT "TeacherDepartment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public."Teacher"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TeacherPeriodAssignment TeacherPeriodAssignment_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeacherPeriodAssignment"
    ADD CONSTRAINT "TeacherPeriodAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TeacherPeriodAssignment TeacherPeriodAssignment_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeacherPeriodAssignment"
    ADD CONSTRAINT "TeacherPeriodAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public."Teacher"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TeacherPeriodAssignment TeacherPeriodAssignment_timeSlotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeacherPeriodAssignment"
    ADD CONSTRAINT "TeacherPeriodAssignment_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES public."TimeSlot"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TeacherTermProgress TeacherTermProgress_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeacherTermProgress"
    ADD CONSTRAINT "TeacherTermProgress_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TeacherTermProgress TeacherTermProgress_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeacherTermProgress"
    ADD CONSTRAINT "TeacherTermProgress_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public."Teacher"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Teacher Teacher_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Teacher"
    ADD CONSTRAINT "Teacher_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Teacher Teacher_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Teacher"
    ADD CONSTRAINT "Teacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TeachingAssignment TeachingAssignment_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeachingAssignment"
    ADD CONSTRAINT "TeachingAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES public."Class"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TeachingAssignment TeachingAssignment_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeachingAssignment"
    ADD CONSTRAINT "TeachingAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TeachingAssignment TeachingAssignment_subjectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeachingAssignment"
    ADD CONSTRAINT "TeachingAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES public."Subject"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TeachingAssignment TeachingAssignment_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeachingAssignment"
    ADD CONSTRAINT "TeachingAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public."Teacher"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TimeSlot TimeSlot_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimeSlot"
    ADD CONSTRAINT "TimeSlot_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TimetableAllocationEntry TimetableAllocationEntry_allocationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimetableAllocationEntry"
    ADD CONSTRAINT "TimetableAllocationEntry_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES public."TeacherAllocation"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TimetableAllocationEntry TimetableAllocationEntry_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimetableAllocationEntry"
    ADD CONSTRAINT "TimetableAllocationEntry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TimetableConfig TimetableConfig_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimetableConfig"
    ADD CONSTRAINT "TimetableConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TimetableEntry TimetableEntry_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimetableEntry"
    ADD CONSTRAINT "TimetableEntry_classId_fkey" FOREIGN KEY ("classId") REFERENCES public."Class"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TimetableEntry TimetableEntry_classroomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimetableEntry"
    ADD CONSTRAINT "TimetableEntry_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES public."Classroom"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TimetableEntry TimetableEntry_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimetableEntry"
    ADD CONSTRAINT "TimetableEntry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TimetableEntry TimetableEntry_subjectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimetableEntry"
    ADD CONSTRAINT "TimetableEntry_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES public."Subject"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TimetableEntry TimetableEntry_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimetableEntry"
    ADD CONSTRAINT "TimetableEntry_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public."Teacher"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TimetableEntry TimetableEntry_teachingAssignmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimetableEntry"
    ADD CONSTRAINT "TimetableEntry_teachingAssignmentId_fkey" FOREIGN KEY ("teachingAssignmentId") REFERENCES public."TeachingAssignment"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TimetableEntry TimetableEntry_timeSlotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimetableEntry"
    ADD CONSTRAINT "TimetableEntry_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES public."TimeSlot"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TimetableEntry TimetableEntry_versionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimetableEntry"
    ADD CONSTRAINT "TimetableEntry_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES public."TimetableVersion"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TimetableNotification TimetableNotification_fromUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimetableNotification"
    ADD CONSTRAINT "TimetableNotification_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TimetableNotification TimetableNotification_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimetableNotification"
    ADD CONSTRAINT "TimetableNotification_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TimetableNotification TimetableNotification_toUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimetableNotification"
    ADD CONSTRAINT "TimetableNotification_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TimetableVersion TimetableVersion_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimetableVersion"
    ADD CONSTRAINT "TimetableVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TimetableVersion TimetableVersion_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimetableVersion"
    ADD CONSTRAINT "TimetableVersion_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict VIvonwJ3TQoLyXVhHekfFJlCDAlM6PRPtUKSxuHggu9XtuvQc5sTzi1LV7kMf0i

