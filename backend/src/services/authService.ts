import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { signToken } from '../utils/jwt';
import { AppError } from '../types';

export async function register(email: string, password: string, name: string, role: 'PATIENT' | 'DOCTOR' | 'ADMIN', phone?: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email already registered');

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name, role, phone },
  });

  if (role === 'PATIENT') {
    await prisma.patient.create({ data: { userId: user.id } });
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('Invalid credentials', 401);
  if (!user.isActive) throw new AppError('Account deactivated', 401);

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new AppError('Invalid credentials', 401);

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { doctor: true, patient: true },
  });
  if (!user) throw new AppError('User not found', 404);
  const { password, ...profile } = user;
  return profile;
}
