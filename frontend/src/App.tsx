import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layouts/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/patient/Dashboard';
import FindDoctors from './pages/patient/FindDoctors';
import PatientAppointments from './pages/patient/Appointments';
import PatientMedications from './pages/patient/Medications';
import DoctorDashboard from './pages/doctor/Dashboard';
import DoctorAppointments from './pages/doctor/Appointments';
import AdminDashboard from './pages/admin/Dashboard';
import AdminDoctors from './pages/admin/Doctors';
import AdminAppointments from './pages/admin/Appointments';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/patient" element={<ProtectedRoute roles={['PATIENT']}><PatientDashboard /></ProtectedRoute>} />
        <Route path="/patient/find-doctors" element={<ProtectedRoute roles={['PATIENT']}><FindDoctors /></ProtectedRoute>} />
        <Route path="/patient/appointments" element={<ProtectedRoute roles={['PATIENT']}><PatientAppointments /></ProtectedRoute>} />
        <Route path="/patient/medications" element={<ProtectedRoute roles={['PATIENT']}><PatientMedications /></ProtectedRoute>} />

        <Route path="/doctor" element={<ProtectedRoute roles={['DOCTOR']}><DoctorDashboard /></ProtectedRoute>} />
        <Route path="/doctor/appointments" element={<ProtectedRoute roles={['DOCTOR']}><DoctorAppointments /></ProtectedRoute>} />

        <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/doctors" element={<ProtectedRoute roles={['ADMIN']}><AdminDoctors /></ProtectedRoute>} />
        <Route path="/admin/appointments" element={<ProtectedRoute roles={['ADMIN']}><AdminAppointments /></ProtectedRoute>} />

        <Route path="*" element={<div className="text-center py-20"><h1 className="text-4xl font-bold">404</h1><p className="text-gray-600 mt-2">Page not found</p></div>} />
      </Routes>
    </Layout>
  );
}
