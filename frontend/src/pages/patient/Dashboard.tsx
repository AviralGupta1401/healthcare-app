import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { patientApi } from '../../api/client';
import { Appointment } from '../../types';

export default function PatientDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    patientApi.getAppointments()
      .then((res) => setAppointments(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const upcoming = appointments.filter(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED');
  const completed = appointments.filter(a => a.status === 'COMPLETED');

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Patient Dashboard</h1>
        <Link to="/patient/find-doctors" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Book New Appointment
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-600">Total Appointments</h3>
          <p className="text-3xl font-bold text-blue-600">{appointments.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-600">Upcoming</h3>
          <p className="text-3xl font-bold text-green-600">{upcoming.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-600">Completed</h3>
          <p className="text-3xl font-bold text-purple-600">{completed.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold p-6 border-b">Upcoming Appointments</h2>
        {upcoming.length === 0 ? (
          <p className="p-6 text-gray-500">No upcoming appointments.</p>
        ) : (
          <div className="divide-y">
            {upcoming.map((apt) => (
              <div key={apt.id} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">Dr. {apt.doctor?.user?.name || 'Doctor'}</p>
                  <p className="text-sm text-gray-600">{new Date(apt.date).toLocaleDateString()} at {apt.startTime}</p>
                  <p className="text-sm text-gray-500">{apt.doctor?.specialization || ''}</p>
                </div>
                <Link to={`/patient/appointments`} className="text-blue-600 hover:underline text-sm">View</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
