import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;

export const authApi = {
  register: (data: { email: string; password: string; name: string; role: string; phone?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  profile: () => api.get('/auth/profile'),
};

export const adminApi = {
  getDoctors: () => api.get('/admin/doctors'),
  createDoctor: (data: Record<string, unknown>) => api.post('/admin/doctors', data),
  updateDoctor: (id: string, data: Record<string, unknown>) => api.put(`/admin/doctors/${id}`, data),
  deleteDoctor: (id: string) => api.delete(`/admin/doctors/${id}`),
  setAvailability: (id: string, availability: Record<string, unknown>[]) =>
    api.post(`/admin/doctors/${id}/availability`, { availability }),
  markLeave: (id: string, data: { date: string; reason?: string }) =>
    api.post(`/admin/doctors/${id}/leave`, data),
  getAppointments: (params?: Record<string, unknown>) => api.get('/admin/appointments', { params }),
  getStats: () => api.get('/admin/appointments/stats'),
};

export const patientApi = {
  getDoctors: (params?: Record<string, unknown>) => api.get('/patients/doctors', { params }),
  getSlots: (doctorId: string, date: string) =>
    api.get(`/patients/doctors/${doctorId}/slots`, { params: { date } }),
  holdSlot: (data: { doctorId: string; date: string; startTime: string }) =>
    api.post('/patients/slots/hold', data),
  bookAppointment: (data: { doctorId: string; date: string; startTime: string; symptoms?: string }) =>
    api.post('/patients/appointments', data),
  submitSymptoms: (id: string, symptoms: string) =>
    api.put(`/patients/appointments/${id}/symptoms`, { symptoms }),
  getAppointments: () => api.get('/patients/appointments'),
  getAppointment: (id: string) => api.get(`/patients/appointments/${id}`),
  cancelAppointment: (id: string, reason?: string) =>
    api.delete(`/patients/appointments/${id}`, { data: { reason } }),
  getMedications: () => api.get('/patients/medications'),
};

export const doctorApi = {
  getAppointments: (params?: Record<string, unknown>) => api.get('/doctors/appointments', { params }),
  getAppointment: (id: string) => api.get(`/doctors/appointments/${id}`),
  submitNotes: (id: string, data: { notes: string; prescriptions?: string }) =>
    api.put(`/doctors/appointments/${id}/notes`, data),
  updateStatus: (id: string, data: { status: string; reason?: string }) =>
    api.put(`/doctors/appointments/${id}/status`, data),
  getProfile: () => api.get('/doctors/profile'),
  getStats: () => api.get('/doctors/stats'),
};
