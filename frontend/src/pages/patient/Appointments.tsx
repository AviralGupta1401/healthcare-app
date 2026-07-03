import React, { useEffect, useState } from 'react';
import { patientApi } from '../../api/client';
import { Appointment, AvailableSlot } from '../../types';

export default function PatientAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<AvailableSlot[]>([]);
  const [rescheduleSlot, setRescheduleSlot] = useState<string | null>(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  useEffect(() => { loadAppointments(); }, []);

  const loadAppointments = () => {
    setLoading(true);
    patientApi.getAppointments()
      .then((res) => setAppointments(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleCancel = async (id: string) => {
    try {
      await patientApi.cancelAppointment(id, cancelReason);
      setCancelId(null);
      setCancelReason('');
      loadAppointments();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Cancellation failed';
      alert(msg);
    }
  };

  const openReschedule = (apt: Appointment) => {
    setRescheduleId(apt.id);
    setRescheduleDate(new Date().toISOString().split('T')[0]);
    setRescheduleSlots([]);
    setRescheduleSlot(null);
    fetchRescheduleSlots(apt.doctor?.id || '', new Date().toISOString().split('T')[0]);
  };

  const fetchRescheduleSlots = async (doctorId: string, date: string) => {
    try {
      const res = await patientApi.getSlots(doctorId, date);
      setRescheduleSlots(res.data.slots);
    } catch { setRescheduleSlots([]); }
  };

  const handleRescheduleDateChange = (apt: Appointment, date: string) => {
    setRescheduleDate(date);
    setRescheduleSlot(null);
    fetchRescheduleSlots(apt.doctor?.id || '', date);
  };

  const handleRescheduleSubmit = async (id: string) => {
    if (!rescheduleSlot) return;
    setRescheduleLoading(true);
    try {
      await patientApi.rescheduleAppointment(id, { date: rescheduleDate, startTime: rescheduleSlot });
      setRescheduleId(null);
      setRescheduleSlot(null);
      loadAppointments();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Reschedule failed';
      alert(msg);
    } finally {
      setRescheduleLoading(false);
    }
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
      <h1 className="text-2xl font-bold mb-6">My Appointments</h1>
      {appointments.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-500">No appointments yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((apt) => (
            <div key={apt.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">Dr. {apt.doctor?.user?.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[apt.status] || 'bg-gray-100'}`}>
                      {apt.status}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm">{apt.doctor?.specialization || ''}</p>
                  <p className="text-gray-700 mt-1">
                    {new Date(apt.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    {' '}at {apt.startTime} - {apt.endTime}
                  </p>
                  {apt.symptoms && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm font-medium text-gray-700">Symptoms:</p>
                      <p className="text-sm text-gray-600">{apt.symptoms}</p>
                    </div>
                  )}
                  {apt.preVisitSummary && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm font-medium text-blue-700">Pre-Visit Summary:</p>
                      <p className="text-sm text-blue-600">
                        Urgency: {(apt.preVisitSummary as { urgencyLevel?: string }).urgencyLevel || 'N/A'}
                      </p>
                    </div>
                  )}
                  {apt.postVisitSummary && (
                    <div className="mt-2 p-3 bg-green-50 rounded-md">
                      <p className="text-sm font-medium text-green-700">Post-Visit Summary:</p>
                      <p className="text-sm text-green-600">
                        {(apt.postVisitSummary as { summary?: string }).summary || 'Completed'}
                      </p>
                    </div>
                  )}
                  {apt.medications && apt.medications.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700">Medications:</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {apt.medications.map((med) => (
                          <span key={med.id} className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                            {med.name} - {med.dosage}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  {(apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED') && (
                    <>
                      <button
                        onClick={() => openReschedule(apt)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => setCancelId(apt.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>

              {cancelId === apt.id && (
                <div className="mt-4 p-4 bg-red-50 rounded-md">
                  <p className="text-sm font-medium text-red-700 mb-2">Cancel Appointment</p>
                  <input
                    type="text"
                    placeholder="Reason (optional)"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleCancel(apt.id)} className="bg-red-600 text-white px-4 py-1.5 rounded text-sm hover:bg-red-700">
                      Confirm Cancel
                    </button>
                    <button onClick={() => { setCancelId(null); setCancelReason(''); }} className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded text-sm hover:bg-gray-300">
                      Keep
                    </button>
                  </div>
                </div>
              )}

              {rescheduleId === apt.id && (
                <div className="mt-4 p-4 bg-blue-50 rounded-md">
                  <p className="text-sm font-medium text-blue-700 mb-2">Reschedule Appointment</p>
                  <label className="block text-xs text-gray-500 mb-1">New Date</label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => handleRescheduleDateChange(apt, e.target.value)}
                    className="w-full px-3 py-2 border rounded-md mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {rescheduleSlots.length === 0 ? (
                    <p className="text-sm text-gray-500 mb-3">No slots available for this date.</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {rescheduleSlots.map((slot) => (
                        <button
                          key={slot.time}
                          disabled={!slot.available}
                          onClick={() => setRescheduleSlot(slot.time)}
                          className={`px-2 py-1.5 text-sm rounded border ${
                            rescheduleSlot === slot.time
                              ? 'bg-blue-600 text-white border-blue-600'
                              : slot.available
                                ? 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRescheduleSubmit(apt.id)}
                      disabled={!rescheduleSlot || rescheduleLoading}
                      className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {rescheduleLoading ? 'Rescheduling...' : 'Confirm Reschedule'}
                    </button>
                    <button
                      onClick={() => { setRescheduleId(null); setRescheduleSlot(null); }}
                      className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded text-sm hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
