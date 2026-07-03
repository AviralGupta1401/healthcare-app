import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api/client';
import { AdminStats } from '../../types';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getStats().then((res) => setStats(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-semibold text-gray-600">Total Patients</h3><p className="text-3xl font-bold text-blue-600">{stats?.totalPatients}</p></div>
        <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-semibold text-gray-600">Total Doctors</h3><p className="text-3xl font-bold text-green-600">{stats?.totalDoctors}</p></div>
        <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-semibold text-gray-600">Total Appointments</h3><p className="text-3xl font-bold text-purple-600">{stats?.totalAppointments}</p></div>
        <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-semibold text-gray-600">Today's Appointments</h3><p className="text-3xl font-bold text-orange-600">{stats?.todayAppointments}</p></div>
        <div className="bg-white p-6 rounded-lg shadow"><h3 className="text-lg font-semibold text-gray-600">Cancelled Today</h3><p className="text-3xl font-bold text-red-600">{stats?.cancelledToday}</p></div>
      </div>
    </div>
  );
}
