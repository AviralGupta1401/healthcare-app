import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { cancelAppointment, rescheduleAppointment, submitPostVisitNotes } from '../services/appointmentService';
import { AppError } from '../types';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

router.use(authenticate, authorize('DOCTOR'));

router.get('/appointments', asyncHandler(async (req, res) => {
  const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
  if (!doctor) throw new AppError('Doctor profile not found', 404);

  const { date, status } = req.query;
  const where: Record<string, unknown> = { doctorId: doctor.id };
  if (date) where.date = new Date(date as string);
  if (status) where.status = status;

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      patient: {
        include: { user: { select: { name: true, email: true, phone: true } } },
      },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });
  res.json(appointments);
}));

router.get('/appointments/:id', asyncHandler(async (req, res) => {
  const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
  if (!doctor) throw new AppError('Doctor profile not found', 404);

  const appointment = await prisma.appointment.findFirst({
    where: { id: req.params.id, doctorId: doctor.id },
    include: {
      patient: { include: { user: { select: { name: true, email: true, phone: true, id: true } } } },
    },
  });
  if (!appointment) throw new AppError('Appointment not found', 404);

  res.json(appointment);
}));

router.put('/appointments/:id/notes', asyncHandler(async (req, res) => {
  const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
  if (!doctor) throw new AppError('Doctor profile not found', 404);

  const { notes, prescriptions } = req.body;
  if (!notes) throw new AppError('notes are required');

  const updated = await submitPostVisitNotes(req.params.id, doctor.id, notes, prescriptions);
  res.json(updated);
}));

router.put('/appointments/:id/status', asyncHandler(async (req, res) => {
  const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
  if (!doctor) throw new AppError('Doctor profile not found', 404);

  const { status, reason } = req.body;
  if (!status) throw new AppError('status is required');

  if (status === 'CANCELLED') {
    const result = await cancelAppointment(req.params.id, req.user!.userId, reason);
    res.json(result);
    return;
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: req.params.id, doctorId: doctor.id },
  });
  if (!appointment) throw new AppError('Appointment not found', 404);

  const updated = await prisma.appointment.update({
    where: { id: req.params.id },
    data: { status },
  });
  res.json(updated);
}));

router.put('/appointments/:id/reschedule', asyncHandler(async (req, res) => {
  const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
  if (!doctor) throw new AppError('Doctor profile not found', 404);

  const { date, startTime } = req.body;
  if (!date || !startTime) throw new AppError('date and startTime are required');
  const appointment = await rescheduleAppointment(req.params.id, req.user!.userId, 'DOCTOR', date, startTime);
  res.json(appointment);
}));

router.get('/profile', asyncHandler(async (req, res) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId: req.user!.userId },
    include: {
      user: { select: { id: true, email: true, name: true, phone: true } },
      availability: true,
    },
  });
  if (!doctor) throw new AppError('Doctor profile not found', 404);
  res.json(doctor);
}));

router.get('/stats', asyncHandler(async (req, res) => {
  const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
  if (!doctor) throw new AppError('Doctor profile not found', 404);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [totalAppointments, todayAppointments, upcomingAppointments, completedAppointments] = await Promise.all([
    prisma.appointment.count({ where: { doctorId: doctor.id } }),
    prisma.appointment.count({
      where: { doctorId: doctor.id, date: today, status: { in: ['SCHEDULED', 'CONFIRMED'] } },
    }),
    prisma.appointment.count({
      where: {
        doctorId: doctor.id,
        date: { gte: today, lte: weekEnd },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
    }),
    prisma.appointment.count({
      where: { doctorId: doctor.id, status: 'COMPLETED' },
    }),
  ]);

  res.json({ totalAppointments, todayAppointments, upcomingAppointments, completedAppointments });
}));

export default router;
