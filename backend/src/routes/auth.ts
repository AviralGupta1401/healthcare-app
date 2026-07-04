import { Router, Request, Response, NextFunction } from 'express';
import { register, login, getProfile } from '../services/authService';
import { authenticate } from '../middleware/auth';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, name, role, phone } = req.body;
  if (!email || !password || !name || !role) {
    res.status(400).json({ error: 'email, password, name, and role are required' });
    return;
  }
  if (role !== 'PATIENT') {
    res.status(400).json({ error: 'Public registration is only available for patients' });
    return;
  }
  const result = await register(email, password, name, role, phone);
  res.status(201).json(result);
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }
  const result = await login(email, password);
  res.json(result);
}));

router.get('/profile', authenticate, asyncHandler(async (req, res) => {
  const profile = await getProfile(req.user!.userId);
  res.json(profile);
}));

export default router;
