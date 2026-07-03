import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api/client';
import { Appointment } from '../../types';

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => { loadAppointments(); }, []);

  const loadAppointments = () => {
    setLoading(true);
    const params: Record<string, unknown> = {};
    if (filterStatus) params.status = filterStatus;
    adminApi.getAppointments(params).then((res) => setAppointments(res.data)).catch(console.error).finally(() => setLoading(false));
  };

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
    CANCELLED: 'bg-red-100 text-red-800',
    RESCHEDULED: 'bg-purple-100 text-purple-800',
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">All Appointments</h1>

      <div className="flex gap-2 mb-4">
        <button onClick={() => { setFilterStatus(''); loadAppointments(); }} className={`px-3 py-1.5 rounded text-sm ${!filterStatus ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
          All
        </button>
        {['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((s) => (
          <button
            key={s}
            onClick={() => { setFilterStatus(s); loadAppointments(); }}
            className={`px-3 py-1.5 rounded text-sm ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Patient</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Doctor</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Time</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Symptoms</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {appointments.map((apt) => (
              <tr key={apt.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{apt.patient?.user?.name || 'N/A'}</td>
                <td className="px-4 py-3 text-sm">Dr. {apt.doctor?.user?.name || 'N/A'}</td>
                <td className="px-4 py-3 text-sm">{new Date(apt.date).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm">{apt.startTime} - {apt.endTime}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[apt.status] || 'bg-gray-100'}`}>
                    {apt.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{apt.symptoms || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {appointments.length === 0 && (
          <div className="text-center py-8 text-gray-500">No appointments found.</div>
        )}
      </div>
    </div>
  );
}
