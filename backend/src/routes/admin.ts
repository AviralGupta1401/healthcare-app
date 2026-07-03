import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { notifyDoctorLeave } from '../services/notificationService';
import { register } from '../services/authService';
import { AppError } from '../types';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

router.use(authenticate, authorize('ADMIN'));

router.get('/doctors', asyncHandler(async (req, res) => {
  const doctors = await prisma.doctor.findMany({
    include: {
      user: { select: { id: true, email: true, name: true, phone: true, isActive: true } },
      availability: true,
    },
  });
  res.json(doctors);
}));

router.post('/doctors', asyncHandler(async (req, res) => {
  const { email, password, name, phone, specialization, qualifications, slotDuration, consultationFee } = req.body;

  if (!email || !password || !name || !specialization) {
    throw new AppError('email, password, name, and specialization are required');
  }

  const authResult = await register(email, password, name, 'DOCTOR', phone);

  const doctor = await prisma.doctor.create({
    data: {
      userId: authResult.user.id,
      specialization,
      qualifications,
      slotDuration: slotDuration || 30,
      consultationFee: consultationFee || 0,
    },
    include: { user: { select: { id: true, email: true, name: true, phone: true } } },
  });

  res.status(201).json(doctor);
}));

router.put('/doctors/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { specialization, qualifications, slotDuration, consultationFee, isActive } = req.body;

  const doctor = await prisma.doctor.update({
    where: { id },
    data: {
      ...(specialization !== undefined && { specialization }),
      ...(qualifications !== undefined && { qualifications }),
      ...(slotDuration !== undefined && { slotDuration }),
      ...(consultationFee !== undefined && { consultationFee }),
      ...(isActive !== undefined && { isActive }),
    },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  res.json(doctor);
}));

router.delete('/doctors/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.doctor.update({ where: { id }, data: { isActive: false } });
  await prisma.user.update({
    where: { id: (await prisma.doctor.findUnique({ where: { id } }))!.userId },
    data: { isActive: false },
  });
  res.json({ message: 'Doctor deactivated' });
}));

router.post('/doctors/:id/availability', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { availability } = req.body;

  await prisma.doctorAvailability.deleteMany({ where: { doctorId: id } });

  const created = await Promise.all(
    availability.map((a: { dayOfWeek: number; startTime: string; endTime: string; isAvailable?: boolean }) =>
      prisma.doctorAvailability.create({
        data: {
          doctorId: id,
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
          isAvailable: a.isAvailable ?? true,
        },
      })
    ),
  );

  res.status(201).json(created);
}));

router.post('/doctors/:id/leave', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date, reason } = req.body;
  if (!date) throw new AppError('date is required');

  const leave = await prisma.doctorLeave.create({
    data: { doctorId: id, date: new Date(date), reason },
  });

  const cancelled = await notifyDoctorLeave(id, date, reason);

  res.status(201).json({ leave, cancelledAppointments: cancelled.length });
}));

router.get('/appointments', asyncHandler(async (req, res) => {
  const { status, date, doctorId } = req.query;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (date) where.date = new Date(date as string);
  if (doctorId) where.doctorId = doctorId;

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      patient: { include: { user: { select: { name: true, email: true } } } },
      doctor: { include: { user: { select: { name: true, email: true } } } },
    },
    orderBy: { date: 'asc' },
  });
  res.json(appointments);
}));

router.get('/appointments/stats', asyncHandler(async (_req, res) => {
  const totalPatients = await prisma.patient.count();
  const totalDoctors = await prisma.doctor.count();
  const totalAppointments = await prisma.appointment.count();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const todayAppointments = await prisma.appointment.count({
    where: { date: { gte: todayStart, lte: todayEnd } },
  });
  const cancelledToday = await prisma.appointment.count({
    where: { status: 'CANCELLED', date: { gte: todayStart, lte: todayEnd } },
  });

  res.json({ totalPatients, totalDoctors, totalAppointments, todayAppointments, cancelledToday });
}));

export default router;
