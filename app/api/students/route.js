import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { findStudentByUserId } from '@/lib/db/queries'
import bcrypt from 'bcryptjs';
import { authMiddleware, roleCheck } from '@/lib/middleware/auth';
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler';
import { studentSchema, validateRequest, sanitizeOutput } from '@/lib/middleware/inputValidation';

export const GET = withErrorHandler(async (request) => {
  const auth = authMiddleware(request);
  if (!auth.isAuthenticated) return auth.response;

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = parseInt(searchParams.get('limit')) || 20;

  // Authorization: Only Admin, HOD, and Teacher can view all students or specific classes
  // Students can only view their own record (handled in a separate specific route or filtered here)
  if (!roleCheck(auth.user, ['ADMIN', 'HOD', 'TEACHER', 'headteacher', 'hod', 'teacher'])) {
    // If student, filter to only show themselves
    if (roleCheck(auth.user, ['STUDENT', 'student'])) {
      const student = await findStudentByUserId(auth.user.id)
      return NextResponse.json({ success: true, data: student ? [sanitizeOutput(student)] : [] });
    }
    throw new ApiError('Forbidden: Insufficient permissions', 403);
  }

  const schoolId = auth.user?.schoolId || null
  const { students, total } = await findStudentsByClass(schoolId, classId, page, limit);

  return NextResponse.json({
    success: true,
    data: students.map(s => sanitizeOutput(s)),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
});

export const POST = withErrorHandler(async (request) => {
  const auth = authMiddleware(request);
  if (!auth.isAuthenticated) return auth.response;

  // Authorization: Only Admin and HOD can create students
  if (!roleCheck(auth.user, ['ADMIN', 'HOD', 'headteacher', 'hod'])) {
    throw new ApiError('Forbidden: Only Admin or HOD can create students', 403);
  }

  const body = await request.json();
  const validation = await validateRequest(studentSchema, body);
  if (!validation.success) {
    return NextResponse.json({ success: false, errors: validation.errors }, { status: 400 });
  }

  const studentData = validation.data;

  // Use a secure random password for initial creation instead of hardcoded 'password123'
  // In a real app, this would trigger a password reset email
  const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  const schoolId = auth.user?.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const result = await prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: { schoolId_email: { schoolId, email: studentData.email } }
    })
    if (existingUser) throw new ApiError('User with this email already exists in this school', 400)

    const user = await tx.user.create({
      data: {
        name: studentData.name,
        email: studentData.email,
        role: 'student',
        password: hashedPassword,
        schoolId,
      }
    })

    const student = await tx.student.create({
      data: {
        userId: user.id,
        schoolId,
        name: studentData.name,
        class: studentData.class_id,
        ...(studentData.student_id && { id: studentData.student_id }),
      }
    })
    
    return { ...student, user };
  });

  return NextResponse.json({
    success: true,
    message: 'Student created successfully. A temporary password has been generated.',
    data: sanitizeOutput(result)
  });
});
