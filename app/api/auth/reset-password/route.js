import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request) {
  try {
    const { token, email, password } = await request.json()

    if (!token || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Find User with valid token
    // Since resetToken is on User model, we need to find the user where email matches AND resetToken matches AND expiry is valid
    // But wait, user is unique by schoolId + email.
    // If we only have email, we might find multiple users across schools?
    // The reset link contains email.
    // We should probably find by resetToken directly if it's unique enough, but safety says check email too.
    // Actually, resetToken should be enough if high entropy. But let's check expiry.

    // Prisma doesn't support complex where clauses across relations easily if schoolId is involved without knowing it.
    // But we can search findFirst where email = email AND resetToken = token.

    const user = await prisma.user.findFirst({
      where: {
        email,
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(), // Expiry must be greater than now
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update User
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    })

    return NextResponse.json({ success: true, message: 'Password reset successfully' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
