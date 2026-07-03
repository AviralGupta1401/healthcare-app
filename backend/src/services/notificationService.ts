import prisma from '../config/prisma';
import { sendEmail } from './emailService';
import { AppError } from '../types';

export async function createNotification(
  userId: string,
  type: string,
  subject: string,
  body: string,
) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      subject,
      body,
      channel: 'EMAIL',
      status: 'PENDING',
      nextRetryAt: new Date(),
    },
  });
}

export async function processNotification(notificationId: string): Promise<boolean> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: { user: true },
  });
  if (!notification) throw new AppError('Notification not found', 404);

  const success = await sendEmail(
    notification.user.email,
    notification.subject,
    notification.body,
  );

  if (success) {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'SENT', sentAt: new Date() },
    });
    return true;
  }

  const newRetryCount = notification.retryCount + 1;
  if (newRetryCount >= notification.maxRetries) {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'FAILED', retryCount: newRetryCount },
    });
    return false;
  }

  const delays = [1, 5, 15, 60, 360]; // minutes
  const delay = delays[Math.min(newRetryCount - 1, delays.length - 1)];
  const nextRetryAt = new Date(Date.now() + delay * 60 * 1000);

  await prisma.notification.update({
    where: { id: notificationId },
    data: { retryCount: newRetryCount, nextRetryAt },
  });

  return false;
}

export async function getPendingNotifications(limit: number = 10) {
  return prisma.notification.findMany({
    where: {
      status: 'PENDING',
      nextRetryAt: { lte: new Date() },
    },
    take: limit,
    orderBy: { createdAt: 'asc' },
  });
}

export async function notifyDoctorLeave(doctorId: string, date: string, reason?: string) {
  const appointments = await prisma.appointment.findMany({
    where: {
      doctorId,
      date: new Date(date),
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
    },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
    },
  });

  for (const appointment of appointments) {
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason || 'Doctor on leave',
      },
    });

    await createNotification(
      appointment.patient.userId,
      'LEAVE_NOTICE',
      'Appointment Cancelled - Doctor on Leave',
      `Your appointment with Dr. ${appointment.doctor.user.name} on ${date} has been cancelled because the doctor is on leave. Please reschedule.`,
    );

    const formattedDate = new Date(appointment.date).toLocaleDateString();
    await sendEmail(
      appointment.patient.user.email,
      'Appointment Cancelled - Doctor on Leave',
      `Your appointment with Dr. ${appointment.doctor.user.name} on ${formattedDate} at ${appointment.startTime} has been cancelled because the doctor is on leave. Please log in to reschedule.`
    );
  }

  return appointments;
}
