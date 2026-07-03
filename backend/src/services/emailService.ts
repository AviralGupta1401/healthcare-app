import nodemailer from 'nodemailer';
import { env } from '../config/env';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  if (env.SENDGRID_API_KEY && env.SENDGRID_API_KEY !== 'SG.your-sendgrid-api-key') {
    transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: { user: 'apikey', pass: env.SENDGRID_API_KEY },
    });
    return transporter;
  }

  if (env.NODE_ENV === 'development') {
    transporter = nodemailer.createTransport({
      host: 'localhost',
      port: 1025,
      ignoreTLS: true,
    });
    return transporter;
  }

  return null;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    console.log(`[EMAIL] Would send to ${to}: ${subject}`);
    return true;
  }

  try {
    await transport.sendMail({
      from: env.FROM_EMAIL,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export function bookingConfirmationEmail(patientName: string, doctorName: string, date: string, time: string): string {
  return `
    <h2>Appointment Confirmed</h2>
    <p>Dear ${patientName},</p>
    <p>Your appointment with <strong>Dr. ${doctorName}</strong> is confirmed.</p>
    <p><strong>Date:</strong> ${date}</p>
    <p><strong>Time:</strong> ${time}</p>
    <p>Please arrive 10 minutes early. You can share your symptoms beforehand via the patient portal.</p>
  `;
}

export function doctorAppointmentNotification(doctorName: string, patientName: string, date: string, time: string): string {
  return `
    <h2>New Appointment Scheduled</h2>
    <p>Dear Dr. ${doctorName},</p>
    <p>A new appointment has been scheduled with <strong>${patientName}</strong>.</p>
    <p><strong>Date:</strong> ${date}</p>
    <p><strong>Time:</strong> ${time}</p>
    <p>The patient may submit symptoms before the visit for your review.</p>
  `;
}

export function cancellationEmail(patientName: string, doctorName: string, date: string, time: string, reason?: string): string {
  return `
    <h2>Appointment Cancelled</h2>
    <p>Dear ${patientName},</p>
    <p>Your appointment with <strong>Dr. ${doctorName}</strong> on ${date} at ${time} has been cancelled.</p>
    ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
    <p>Please book a new appointment at your convenience.</p>
  `;
}

export function medicationReminderEmail(patientName: string, medication: string, dosage: string): string {
  return `
    <h2>Medication Reminder</h2>
    <p>Dear ${patientName},</p>
    <p>This is a reminder to take your medication:</p>
    <p><strong>${medication}</strong> - ${dosage}</p>
    <p>Please follow your doctor's instructions carefully.</p>
  `;
}
