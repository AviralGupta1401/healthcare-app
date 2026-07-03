import Queue from 'bull';
import prisma from '../config/prisma';
import { sendEmail } from '../services/emailService';
import { env } from '../config/env';

const reminderQueue = new Queue('medication-reminders', env.REDIS_URL);

reminderQueue.process(async (job) => {
  const { medicationId } = job.data;

  const medication = await prisma.medication.findUnique({
    where: { id: medicationId },
    include: {
      appointment: {
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } },
        },
      },
    },
  });

  if (!medication || !medication.reminderEnabled) return;

  const patientUser = medication.appointment.patient.user;

  const success = await sendEmail(
    patientUser.email,
    `Medication Reminder: ${medication.name}`,
    `<h2>Medication Reminder</h2>
     <p>Dear ${patientUser.name},</p>
     <p>Time to take your medication:</p>
     <p><strong>${medication.name}</strong> - ${medication.dosage}</p>
     <p>Frequency: ${medication.frequency}</p>
     <p>Duration: ${medication.duration}</p>
     ${medication.instructions ? `<p>Instructions: ${medication.instructions}</p>` : ''}
     <p>Stay healthy!</p>`,
  );

  if (success) {
    await prisma.medication.update({
      where: { id: medicationId },
      data: { lastRemindedAt: new Date() },
    });
  }
});

export async function scheduleMedicationReminders(appointmentId: string) {
  const medications = await prisma.medication.findMany({
    where: { appointmentId, reminderEnabled: true },
  });

  for (const med of medications) {
    const delay = 60 * 60 * 1000;
    await reminderQueue.add(
      { medicationId: med.id },
      { delay, attempts: 3, backoff: { type: 'fixed', delay: 300000 } },
    );
  }
}

console.log('Medication reminder worker started');
