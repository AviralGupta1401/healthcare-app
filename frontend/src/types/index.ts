export interface User {
  id: string;
  email: string;
  name: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  phone?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Doctor {
  id: string;
  userId: string;
  specialization: string;
  qualifications?: string;
  slotDuration: number;
  consultationFee: number;
  isActive: boolean;
  user: { id: string; name: string; email: string; phone?: string };
  availability: DoctorAvailability[];
}

export interface DoctorAvailability {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface Patient {
  id: string;
  userId: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  allergies?: string;
  user: { name: string; email: string; phone?: string };
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
  symptoms?: string;
  preVisitSummary?: Record<string, unknown>;
  postVisitNotes?: string;
  postVisitSummary?: Record<string, unknown>;
  cancellationReason?: string;
  doctor: {
    id: string;
    specialization?: string;
    user: { id: string; name: string; email: string; phone?: string };
  };
  patient?: { user: { name: string; email: string; phone?: string } };
  medications?: Medication[];
}

export interface SlotHold {
  id: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  expiresAt: string;
}

export interface Medication {
  id: string;
  appointmentId: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  reminderEnabled: boolean;
  appointment?: { doctor: { user: { name: string } } };
}

export interface AvailableSlot {
  time: string;
  available: boolean;
}

export interface DoctorStats {
  totalAppointments: number;
  todayAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
}

export interface AdminStats {
  totalPatients: number;
  totalDoctors: number;
  totalAppointments: number;
  todayAppointments: number;
  cancelledToday: number;
}
