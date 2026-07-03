import prisma from '../config/prisma';

async function cleanupExpiredHolds() {
  try {
    const result = await prisma.slotHold.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    if (result.count > 0) {
      console.log(`Cleaned up ${result.count} expired slot holds`);
    }
  } catch (error) {
    console.error('Slot cleanup failed:', error);
  }
}

setInterval(cleanupExpiredHolds, 5 * 60 * 1000);
console.log('Slot cleanup worker started - running every 5 minutes');
