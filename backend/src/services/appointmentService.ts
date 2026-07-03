import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { generatePreVisitSummary, generatePostVisitSummary } from './llmService';
import { createCalendarEvent, deleteCalendarEvent } from './calendarService';
import { bookingConfirmationEmail, doctorAppointmentNotification, cancellationEmail, sendEmail } from './emailService';
import { createNotification } from './notificationService';
import { formatTimeRange } from '../utils/slots';
import { AppError } from '../types';

export async function getAvailableSlots(doctorId: string, dateStr: string) {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();

  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: {
      availability: { where: { dayOfWeek, isAvailable: true } },
    },
  });
  if (!doctor) throw new AppError('Doctor not found', 404);
  if (doctor.availability.length === 0) return [];

  const leave = await prisma.doctorLeave.findFirst({
    where: { doctorId, date },
  });
  if (leave) return [];

  const { startTime, endTime } = doctor.availability[0];
  const duration = doctor.slotDuration;

  const allSlots: string[] = [];
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  let current = startH * 60 + startM;
  const end = endH * 60 + endM;

  while (current + duration <= end) {
    const h = Math.floor(current / 60).toString().padStart(2, '0');
    const m = (current % 60).toString().padStart(2, '0');
    allSlots.push(`${h}:${m}`);
    current += duration;
  }

  const booked = await prisma.appointment.findMany({
    where: {
      doctorId,
      date,
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
    },
    select: { startTime: true },
  });
  const bookedSet = new Set(booked.map(b => b.startTime));

  const held = await prisma.slotHold.findMany({
    where: {
      doctorId,
      date,
      expiresAt: { gt: new Date() },
    },
    select: { startTime: true },
  });
  const heldSet = new Set(held.map(h => h.startTime));

  return allSlots
    .filter(s => !bookedSet.has(s) && !heldSet.has(s))
    .map(s => ({ time: s, available: true }));
}

export async function holdSlot(doctorId: string, dateStr: string, startTime: string, patientId: string) {
  const date = new Date(dateStr);
  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) throw new AppError('Doctor not found', 404);
  const { end } = formatTimeRange(startTime, doctor.slotDuration);

  const existingBooking = await prisma.appointment.findUnique({
    where: { doctorId_date_startTime: { doctorId, date, startTime } },
  });
  if (existingBooking && ['SCHEDULED', 'CONFIRMED'].includes(existingBooking.status)) {
    throw new AppError('Slot already booked');
  }

  const existingHold = await prisma.slotHold.findFirst({
    where: { doctorId, date, startTime, expiresAt: { gt: new Date() } },
  });
  if (existingHold) throw new AppError('Slot temporarily held by another patient');

  const hold = await prisma.slotHold.create({
    data: {
      doctorId,
      date,
      startTime,
      endTime: end,
      patientId,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  return hold;
}

export async function bookAppointment(
  patientId: string,
  doctorId: string,
  dateStr: string,
  startTime: string,
  symptoms?: string,
) {
  const date = new Date(dateStr);
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: { user: true },
  });
  if (!doctor) throw new AppError('Doctor not found', 404);

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { user: true },
  });
  if (!patient) throw new AppError('Patient not found', 404);

  const { end } = formatTimeRange(startTime, doctor.slotDuration);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.appointment.findUnique({
      where: { doctorId_date_startTime: { doctorId, date, startTime } },
    });
    if (existing && ['SCHEDULED', 'CONFIRMED'].includes(existing.status)) {
      throw new AppError('This slot is already booked');
    }

    const appointment = await tx.appointment.create({
      data: {
        patientId,
        doctorId,
        date,
        startTime,
        endTime: end,
        status: 'SCHEDULED',
        symptoms,
      },
    });

    await tx.slotHold.deleteMany({
      where: { doctorId, date, startTime, patientId },
    });

    let preVisitSummary: Prisma.InputJsonValue | null = null;
    if (symptoms) {
      const summary = await generatePreVisitSummary(
        symptoms,
        patient.dateOfBirth?.toISOString().split('T')[0] ?? undefined,
        patient.allergies ?? undefined,
      );
      if (summary) {
        preVisitSummary = summary as Prisma.InputJsonValue;
        await tx.appointment.update({
          where: { id: appointment.id },
          data: { preVisitSummary },
        });
      }
    }

    const formattedDate = date.toLocaleDateString();
    const timeRange = `${startTime} - ${end}`;

    await createNotification(
      patient.userId,
      'BOOKING_CONFIRMATION',
      'Appointment Confirmed',
      `Your appointment with Dr. ${doctor.user.name} on ${formattedDate} at ${timeRange} is confirmed.`,
    );
    await createNotification(
      doctor.userId,
      'NEW_APPOINTMENT',
      'New Appointment Scheduled',
      `A new appointment with ${patient.user.name} on ${formattedDate} at ${timeRange}.`,
    );

    await sendEmail(
      patient.user.email,
      'Appointment Confirmed',
      bookingConfirmationEmail(patient.user.name, doctor.user.name, formattedDate, timeRange),
    );
    await sendEmail(
      doctor.user.email,
      'New Appointment Scheduled',
      doctorAppointmentNotification(doctor.user.name, patient.user.name, formattedDate, timeRange),
    );

    const eventId = await createCalendarEvent(
      patient.user.email,
      doctor.user.email,
      `Appointment: ${patient.user.name} with Dr. ${doctor.user.name}`,
      `Appointment at Healthcare Clinic\nPatient: ${patient.user.name}\nDoctor: Dr. ${doctor.user.name}\n${symptoms ? `Symptoms: ${symptoms}` : ''}`,
      `${dateStr}T${startTime}:00`,
      `${dateStr}T${end}:00`,
    );

    if (eventId) {
      await tx.calendarEvent.create({
        data: {
          appointmentId: appointment.id,
          userId: patientId,
          googleEventId: eventId,
          eventType: 'PATIENT',
        },
      });
      await tx.calendarEvent.create({
        data: {
          appointmentId: appointment.id,
          userId: doctor.userId,
          googleEventId: eventId,
          eventType: 'DOCTOR',
        },
      });
    }

    return appointment;
  });
}

export async function cancelAppointment(appointmentId: string, userId: string, reason?: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
      calendarEvents: true,
    },
  });
  if (!appointment) throw new AppError('Appointment not found', 404);

  const isPatient = appointment.patient.userId === userId;
  const isDoctor = appointment.doctor.userId === userId;
  if (!isPatient && !isDoctor) throw new AppError('Not authorized to cancel this appointment', 403);

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'CANCELLED', cancellationReason: reason },
  });

  for (const event of appointment.calendarEvents) {
    if (event.googleEventId) await deleteCalendarEvent(event.googleEventId);
  }

  const formattedDate = appointment.date.toLocaleDateString();
  const timeRange = `${appointment.startTime} - ${appointment.endTime}`;

  await createNotification(
    appointment.patient.userId,
    'CANCELLATION',
    'Appointment Cancelled',
    `Your appointment with Dr. ${appointment.doctor.user.name} on ${formattedDate} at ${timeRange} has been cancelled.`,
  );

  await sendEmail(
    appointment.patient.user.email,
    'Appointment Cancelled',
    cancellationEmail(
      appointment.patient.user.name,
      appointment.doctor.user.name,
      formattedDate,
      timeRange,
      reason,
    ),
  );

  return appointment;
}

export async function submitSymptoms(appointmentId: string, patientId: string, symptoms: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: { include: { user: true } } },
  });
  if (!appointment) throw new AppError('Appointment not found', 404);
  if (appointment.patientId !== patientId) throw new AppError('Not authorized', 403);

  const patient = appointment.patient;
  const summary = await generatePreVisitSummary(
    symptoms,
    patient.dateOfBirth?.toISOString().split('T')[0] ?? undefined,
    patient.allergies ?? undefined,
  );

  const data: Record<string, unknown> = { symptoms };
  if (summary) data.preVisitSummary = summary as Prisma.InputJsonValue;

  return prisma.appointment.update({
    where: { id: appointmentId },
    data,
  });
}

export async function submitPostVisitNotes(appointmentId: string, doctorId: string, notes: string, prescriptions?: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { doctor: true, patient: { include: { user: true } } },
  });
  if (!appointment) throw new AppError('Appointment not found', 404);
  if (appointment.doctorId !== doctorId) throw new AppError('Not authorized', 403);

  const postVisitSummary = await generatePostVisitSummary(notes, prescriptions);

  const updateData: Record<string, unknown> = {
    postVisitNotes: notes,
    status: 'COMPLETED',
  };
  if (postVisitSummary) updateData.postVisitSummary = postVisitSummary as Prisma.InputJsonValue;

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: updateData,
  });

  if (postVisitSummary?.medicationSchedule) {
    const meds = postVisitSummary.medicationSchedule as Array<{
      name: string; dosage: string; frequency: string; duration: string; instructions?: string;
    }>;
    for (const med of meds) {
      await prisma.medication.create({
        data: {
          appointmentId,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          instructions: med.instructions,
        },
      });
    }
  }

  return updated;
}
