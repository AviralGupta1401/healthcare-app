import React, { useEffect, useState } from 'react';
import { doctorApi } from '../../api/client';
import { Appointment } from '../../types';

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [notes, setNotes] = useState('');
  const [prescriptions, setPrescriptions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { loadAppointments(); }, []);

  const loadAppointments = () => {
    setLoading(true);
    doctorApi.getAppointments()
      .then((res) => setAppointments(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleSubmitNotes = async (id: string) => {
    if (!notes.trim()) return;
    setSubmitting(true);
    try {
      await doctorApi.submitNotes(id, { notes, prescriptions });
      setSelectedApt(null);
      setNotes('');
      setPrescriptions('');
      loadAppointments();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to submit';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    const reason = prompt('Reason for cancellation:');
    if (reason === null) return;
    try {
      await doctorApi.updateStatus(id, { status: 'CANCELLED', reason });
      loadAppointments();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to cancel';
      alert(msg);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await doctorApi.updateStatus(id, { status: 'CONFIRMED' });
      loadAppointments();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to confirm';
      alert(msg);
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

  const filtered = filterDate ? appointments.filter(a => new Date(a.date).toISOString().split('T')[0] === filterDate) : appointments;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <h1 className="text-2xl font-bold mb-4">Appointments</h1>
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 mr-2">Filter by date:</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-1.5 border rounded-md text-sm"
          />
          <button onClick={() => setFilterDate('')} className="ml-2 text-sm text-blue-600 hover:underline">
            Clear
          </button>
        </div>
        <div className="space-y-3">
          {filtered.map((apt) => (
            <div key={apt.id} className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{apt.patient?.user?.name || 'Patient'}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[apt.status] || 'bg-gray-100'}`}>
                      {apt.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {new Date(apt.date).toLocaleDateString()} at {apt.startTime} - {apt.endTime}
                  </p>
                  {apt.symptoms && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                      <p className="font-medium text-yellow-800">Symptoms:</p>
                      <p className="text-yellow-700">{apt.symptoms}</p>
                    </div>
                  )}
                  {apt.preVisitSummary && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                      <p className="font-medium text-blue-800">Pre-Visit Summary:</p>
                      <p className="text-blue-700">
                        Urgency: {(apt.preVisitSummary as { urgencyLevel?: string }).urgencyLevel || 'N/A'} |
                        Complaint: {(apt.preVisitSummary as { chiefComplaint?: string }).chiefComplaint || 'N/A'}
                      </p>
                      {(apt.preVisitSummary as { suggestedQuestions?: string[] }).suggestedQuestions && (
                        <ul className="list-disc ml-4 text-blue-600 mt-1">
                          {(apt.preVisitSummary as { suggestedQuestions: string[] }).suggestedQuestions.map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {apt.postVisitSummary && (
                    <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                      <p className="font-medium text-green-800">Post-Visit Summary:</p>
                      <p className="text-green-700">{(apt.postVisitSummary as { summary?: string }).summary || 'Completed'}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {apt.status === 'SCHEDULED' && (
                    <>
                      <button onClick={() => handleConfirm(apt.id)} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">
                        Confirm
                      </button>
                      <button onClick={() => handleCancel(apt.id)} className="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700">
                        Cancel
                      </button>
                    </>
                  )}
                  {apt.status === 'CONFIRMED' && (
                    <button onClick={() => setSelectedApt(apt)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">
                      Complete & Add Notes
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-gray-500 text-center py-8">No appointments found.</p>}
        </div>
      </div>

      {selectedApt && (
        <div className="bg-white p-6 rounded-lg shadow h-fit">
          <h2 className="text-xl font-semibold mb-2">Post-Visit Notes</h2>
          <p className="text-sm text-gray-600 mb-4">
            {selectedApt.patient?.user?.name} - {new Date(selectedApt.date).toLocaleDateString()}
          </p>

          <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 border rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your clinical notes..."
          />

          <label className="block text-sm font-medium text-gray-700 mb-1">Prescriptions</label>
          <textarea
            value={prescriptions}
            onChange={(e) => setPrescriptions(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Amoxicillin 500mg - 3 times a day - 7 days"
          />

          <p className="text-xs text-gray-500 mb-4">
            The AI will generate a patient-friendly summary and medication schedule from your notes.
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => handleSubmitNotes(selectedApt.id)}
              disabled={submitting || !notes.trim()}
              className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit & Complete'}
            </button>
            <button
              onClick={() => { setSelectedApt(null); setNotes(''); setPrescriptions(''); }}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
