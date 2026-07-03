import { google } from 'googleapis';
import { env } from '../config/env';
import prisma from '../config/prisma';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

function getOAuth2Client() {
  const client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
  if (env.GOOGLE_REFRESH_TOKEN) {
    client.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });
  }
  return client;
}

function getCalendar() {
  const auth = getOAuth2Client();
  return google.calendar({ version: 'v3', auth });
}

export async function createCalendarEvent(
  patientEmail: string,
  doctorEmail: string,
  summary: string,
  description: string,
  startDateTime: string,
  endDateTime: string,
): Promise<string | null> {
  try {
    if (!env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID === 'your-google-client-id') {
      console.log('[CALENDAR] Would create event:', summary);
      return 'mock-event-id';
    }
    const calendar = getCalendar();
    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary,
        description,
        start: { dateTime: startDateTime, timeZone: 'UTC' },
        end: { dateTime: endDateTime, timeZone: 'UTC' },
        attendees: [{ email: patientEmail }, { email: doctorEmail }],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      },
    });
    return event.data.id || null;
  } catch (error) {
    console.error('Failed to create calendar event:', error);
    return null;
  }
}

export async function updateCalendarEvent(
  eventId: string,
  summary: string,
  description: string,
  startDateTime: string,
  endDateTime: string,
): Promise<boolean> {
  try {
    if (!env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID === 'your-google-client-id') {
      console.log('[CALENDAR] Would update event:', eventId);
      return true;
    }
    const calendar = getCalendar();
    await calendar.events.update({
      calendarId: 'primary',
      eventId,
      requestBody: {
        summary,
        description,
        start: { dateTime: startDateTime, timeZone: 'UTC' },
        end: { dateTime: endDateTime, timeZone: 'UTC' },
      },
    });
    return true;
  } catch (error) {
    console.error('Failed to update calendar event:', error);
    return false;
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  try {
    if (!env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID === 'your-google-client-id') {
      console.log('[CALENDAR] Would delete event:', eventId);
      return true;
    }
    const calendar = getCalendar();
    await calendar.events.delete({ calendarId: 'primary', eventId });
    return true;
  } catch (error) {
    console.error('Failed to delete calendar event:', error);
    return false;
  }
}

export function getAuthUrl(): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

export async function handleOAuth2Callback(code: string): Promise<string | null> {
  try {
    const client = getOAuth2Client();
    const { tokens } = await client.getToken(code);
    return tokens.refresh_token || null;
  } catch (error) {
    console.error('OAuth callback failed:', error);
    return null;
  }
}
