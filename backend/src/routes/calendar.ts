import { Router, Request, Response, NextFunction } from 'express';
import { getAuthUrl, handleOAuth2Callback } from '../services/calendarService';
import { env } from '../config/env';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

router.get('/auth', (_req, res) => {
  const url = getAuthUrl();
  res.redirect(url);
});

router.get('/oauth2callback', asyncHandler(async (req, res) => {
  const { code } = req.query;
  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'Authorization code is required' });
    return;
  }
  const refreshToken = await handleOAuth2Callback(code);
  if (refreshToken) {
    res.json({ message: 'Authentication successful', refreshToken });
  } else {
    res.status(500).json({ error: 'Failed to get refresh token' });
  }
}));

router.get('/status', (_req, res) => {
  const configured = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_ID !== 'your-google-client-id' && env.GOOGLE_REFRESH_TOKEN);
  res.json({ configured, clientId: env.GOOGLE_CLIENT_ID ? 'configured' : 'missing' });
});

export default router;
