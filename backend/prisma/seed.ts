import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@healthcare.com' },
    update: {},
    create: {
      email: 'admin@healthcare.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      phone: '+1-555-0001',
    },
  });
  console.log('Admin created:', admin.email);

  const doctorPassword = await bcrypt.hash('doctor123', 12);
  const doctor1User = await prisma.user.upsert({
    where: { email: 'dr.smith@healthcare.com' },
    update: {},
    create: {
      email: 'dr.smith@healthcare.com',
      password: doctorPassword,
      name: 'John Smith',
      role: 'DOCTOR',
      phone: '+1-555-1001',
    },
  });

  const doctor1 = await prisma.doctor.upsert({
    where: { userId: doctor1User.id },
    update: {},
    create: {
      userId: doctor1User.id,
      specialization: 'Cardiology',
      qualifications: 'MD, FACC - 15 years experience',
      slotDuration: 30,
      consultationFee: 150,
    },
  });

  for (const day of [1, 2, 3, 4, 5]) {
    await prisma.doctorAvailability.upsert({
      where: { id: `dr1-${day}` },
      update: {},
      create: {
        doctorId: doctor1.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
      },
    });
  }

  const doctor2User = await prisma.user.upsert({
    where: { email: 'dr.jones@healthcare.com' },
    update: {},
    create: {
      email: 'dr.jones@healthcare.com',
      password: doctorPassword,
      name: 'Emily Jones',
      role: 'DOCTOR',
      phone: '+1-555-1002',
    },
  });

  const doctor2 = await prisma.doctor.upsert({
    where: { userId: doctor2User.id },
    update: {},
    create: {
      userId: doctor2User.id,
      specialization: 'Dermatology',
      qualifications: 'MD, FAAD - 10 years experience',
      slotDuration: 30,
      consultationFee: 120,
    },
  });

  for (const day of [1, 2, 3, 4]) {
    await prisma.doctorAvailability.upsert({
      where: { id: `dr2-${day}` },
      update: {},
      create: {
        doctorId: doctor2.id,
        dayOfWeek: day,
        startTime: '10:00',
        endTime: '16:00',
      },
    });
  }

  const patientPassword = await bcrypt.hash('patient123', 12);
  const patientUser = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      password: patientPassword,
      name: 'Alice Johnson',
      role: 'PATIENT',
      phone: '+1-555-2001',
    },
  });

  await prisma.patient.upsert({
    where: { userId: patientUser.id },
    update: {},
    create: {
      userId: patientUser.id,
      dateOfBirth: new Date('1990-05-15'),
      bloodGroup: 'A+',
      allergies: 'Penicillin',
    },
  });

  console.log('Seed data created successfully');
  console.log('Admin: admin@healthcare.com / admin123');
  console.log('Doctor: dr.smith@healthcare.com / doctor123');
  console.log('Doctor: dr.jones@healthcare.com / doctor123');
  console.log('Patient: alice@example.com / patient123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
