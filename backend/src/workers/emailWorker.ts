import Queue from 'bull';
import { env } from '../config/env';
import { processNotification, getPendingNotifications } from '../services/notificationService';

const emailQueue = new Queue('email-notifications', env.REDIS_URL, {
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 60000 },
    removeOnComplete: true,
  },
});

emailQueue.process(async (job) => {
  const { notificationId } = job.data;
  await processNotification(notificationId);
});

async function pollNotifications() {
  const pending = await getPendingNotifications(20);
  for (const notification of pending) {
    await emailQueue.add({ notificationId: notification.id });
  }
}

setInterval(pollNotifications, 30000);

console.log('Email worker started - polling every 30s');
