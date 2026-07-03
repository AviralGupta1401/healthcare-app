import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doctorApi } from '../../api/client';
import { DoctorStats } from '../../types';

export default function DoctorDashboard() {
  const [stats, setStats] = useState<DoctorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    doctorApi.getStats().then((res) => setStats(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Doctor Dashboard</h1>
        <Link to="/doctor/appointments" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          View Appointments
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-600">Total Appointments</h3>
          <p className="text-3xl font-bold text-blue-600">{stats?.totalAppointments || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-600">Today</h3>
          <p className="text-3xl font-bold text-green-600">{stats?.todayAppointments || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-600">Upcoming (7 days)</h3>
          <p className="text-3xl font-bold text-purple-600">{stats?.upcomingAppointments || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-600">Completed</h3>
          <p className="text-3xl font-bold text-orange-600">{stats?.completedAppointments || 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-2">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Link to="/doctor/appointments" className="p-4 border rounded-lg hover:bg-gray-50 text-center">
            <p className="font-medium text-blue-600">Manage Appointments</p>
            <p className="text-sm text-gray-500">View and update appointment status</p>
          </Link>
          <div className="p-4 border rounded-lg bg-gray-50 text-center">
            <p className="font-medium text-gray-600">Pre-Visit Summaries</p>
            <p className="text-sm text-gray-500">Review AI-generated symptom summaries</p>
          </div>
          <div className="p-4 border rounded-lg bg-gray-50 text-center">
            <p className="font-medium text-gray-600">Post-Visit Notes</p>
            <p className="text-sm text-gray-500">Submit notes and prescriptions</p>
          </div>
        </div>
      </div>
    </div>
  );
}
