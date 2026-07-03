import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { getAvailableSlots, holdSlot, bookAppointment, cancelAppointment, submitSymptoms } from '../services/appointmentService';
import { AppError } from '../types';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

router.use(authenticate, authorize('PATIENT'));

router.get('/doctors', asyncHandler(async (req, res) => {
  const { specialization, name } = req.query;
  const where: Record<string, unknown> = { isActive: true };
  if (specialization) where.specialization = { contains: specialization as string, mode: 'insensitive' };

  const doctors = await prisma.doctor.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      availability: { where: { isAvailable: true } },
    },
  });

  if (name) {
    const filtered = doctors.filter(d =>
      d.user.name.toLowerCase().includes((name as string).toLowerCase())
    );
    res.json(filtered);
    return;
  }

  res.json(doctors);
}));

router.get('/doctors/:id/slots', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date } = req.query;
  if (!date) throw new AppError('date query parameter is required');
  const slots = await getAvailableSlots(id, date as string);
  res.json({ doctorId: id, date, slots });
}));

router.post('/slots/hold', asyncHandler(async (req, res) => {
  const { doctorId, date, startTime } = req.body;
  if (!doctorId || !date || !startTime) throw new AppError('doctorId, date, and startTime are required');

  const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
  if (!patient) throw new AppError('Patient profile not found', 404);

  const hold = await holdSlot(doctorId, date, startTime, patient.id);
  res.status(201).json(hold);
}));

router.post('/appointments', asyncHandler(async (req, res) => {
  const { doctorId, date, startTime, symptoms } = req.body;
  if (!doctorId || !date || !startTime) throw new AppError('doctorId, date, and startTime are required');

  const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
  if (!patient) throw new AppError('Patient profile not found', 404);

  const appointment = await bookAppointment(patient.id, doctorId, date, startTime, symptoms);
  res.status(201).json(appointment);
}));

router.put('/appointments/:id/symptoms', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { symptoms } = req.body;
  if (!symptoms) throw new AppError('symptoms are required');

  const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
  if (!patient) throw new AppError('Patient profile not found', 404);

  const updated = await submitSymptoms(id, patient.id, symptoms);
  res.json(updated);
}));

router.get('/appointments', asyncHandler(async (req, res) => {
  const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
  if (!patient) throw new AppError('Patient profile not found', 404);

  const appointments = await prisma.appointment.findMany({
    where: { patientId: patient.id },
    include: {
      doctor: {
        include: { user: { select: { name: true, email: true, phone: true, id: true } } },
      },
      medications: true,
    },
    orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
  });
  res.json(appointments);
}));

router.get('/appointments/:id', asyncHandler(async (req, res) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: req.params.id },
    include: {
      doctor: { include: { user: { select: { name: true, email: true, phone: true } } } },
      medications: true,
    },
  });
  if (!appointment) throw new AppError('Appointment not found', 404);

  const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
  if (!patient || appointment.patientId !== patient.id) throw new AppError('Not authorized', 403);

  res.json(appointment);
}));

router.delete('/appointments/:id', asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const appointment = await cancelAppointment(req.params.id, req.user!.userId, reason);
  res.json(appointment);
}));

router.get('/medications', asyncHandler(async (req, res) => {
  const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
  if (!patient) throw new AppError('Patient profile not found', 404);

  const appointments = await prisma.appointment.findMany({
    where: { patientId: patient.id },
    select: { id: true },
  });
  const appointmentIds = appointments.map(a => a.id);

  const medications = await prisma.medication.findMany({
    where: { appointmentId: { in: appointmentIds }, reminderEnabled: true },
    include: {
      appointment: {
        include: { doctor: { include: { user: { select: { name: true } } } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(medications);
}));

export default router;
