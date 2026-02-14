import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';

// GET all schools (admin only)
export async function GET(request: NextRequest) {
  try {
    // TODO: Add admin authentication check here
    // const session = await getServerSession();
    // if (!session || session.user.role !== 'super_admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        subdomain: true,
        domain: true,
        active: true,
        email: true,
        phone: true,
        address: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            students: true,
            teachers: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(schools);
  } catch (error) {
    console.error('Error fetching schools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schools' },
      { status: 500 }
    );
  }
}

// POST - Create new school
export async function POST(request: NextRequest) {
  try {
    // TODO: Add admin authentication check here
    // const session = await getServerSession();
    // if (!session || session.user.role !== 'super_admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await request.json();
    const {
      name,
      subdomain,
      domain,
      email,
      phone,
      address,
      timezone,
      currency,
      academicYear,
      // Admin user details
      adminName,
      adminEmail,
      adminPassword,
    } = body;

    // Validate required fields
    if (!name || !subdomain || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'Name, subdomain, admin email, and password are required' },
        { status: 400 }
      );
    }

    // Validate subdomain format (lowercase, alphanumeric, hyphens only)
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(subdomain)) {
      return NextResponse.json(
        { error: 'Subdomain can only contain lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    // Check if subdomain already exists
    const existingSchool = await prisma.school.findUnique({
      where: { subdomain }
    });

    if (existingSchool) {
      return NextResponse.json(
        { error: 'Subdomain already taken' },
        { status: 409 }
      );
    }

    // Hash admin password
    const hashedPassword = await hash(adminPassword, 12);

    // Create school and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the school
      const school = await tx.school.create({
        data: {
          name,
          subdomain,
          domain: domain || null,
          email: email || null,
          phone: phone || null,
          address: address || null,
          timezone: timezone || 'Africa/Lusaka',
          currency: currency || 'ZMW',
          academicYear: academicYear || null,
          active: true,
        }
      });

      // 2. Create the admin user
      const adminUser = await tx.user.create({
        data: {
          schoolId: school.id,
          email: adminEmail,
          password: hashedPassword,
          name: adminName || 'School Administrator',
          role: 'headteacher', // or 'super_admin' if you have that role
          contact_number: phone || null,
        }
      });

      return { school, adminUser };
    });

    return NextResponse.json({
      message: 'School created successfully',
      school: {
        id: result.school.id,
        name: result.school.name,
        subdomain: result.school.subdomain,
        url: `https://${result.school.subdomain}.bluepeacktechnologies.com`
      },
      admin: {
        email: result.adminUser.email,
        name: result.adminUser.name,
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating school:', error);
    return NextResponse.json(
      { error: 'Failed to create school' },
      { status: 500 }
    );
  }
}
