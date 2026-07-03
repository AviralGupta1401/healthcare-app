import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api/client';
import { Doctor } from '../../types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', name: '', phone: '',
    specialization: '', qualifications: '', slotDuration: 30, consultationFee: 0,
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [leaves, setLeaves] = useState<Record<string, { date: string; reason: string }>>({});

  useEffect(() => { loadDoctors(); }, []);

  const loadDoctors = () => {
    setLoading(true);
    adminApi.getDoctors().then((res) => setDoctors(res.data)).catch(console.error).finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      await adminApi.createDoctor(form);
      setShowForm(false);
      setForm({ email: '', password: '', name: '', phone: '', specialization: '', qualifications: '', slotDuration: 30, consultationFee: 0 });
      loadDoctors();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to create doctor';
      alert(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await adminApi.updateDoctor(id, { isActive: !current });
      loadDoctors();
    } catch { alert('Failed to update'); }
  };

  const handleLeaveSubmit = async (doctorId: string) => {
    const leave = leaves[doctorId];
    if (!leave?.date) return;
    try {
      const res = await adminApi.markLeave(doctorId, leave);
      alert(`Leave marked. ${res.data.cancelledAppointments} appointment(s) cancelled and notified.`);
      setLeaves((prev) => ({ ...prev, [doctorId]: { date: '', reason: '' } }));
      loadDoctors();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed';
      alert(msg);
    }
  };

  const daysAvail = (availability: Doctor['availability']) => {
    return availability.filter(a => a.isAvailable).map(a => DAYS[a.dayOfWeek]).join(', ') || 'None';
  };

  const updateField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Doctors</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          {showForm ? 'Cancel' : 'Add Doctor'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">New Doctor</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input type="text" value={form.name} onChange={updateField('name')} required className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email *</label>
              <input type="email" value={form.email} onChange={updateField('email')} required className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password *</label>
              <input type="password" value={form.password} onChange={updateField('password')} required className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input type="text" value={form.phone} onChange={updateField('phone')} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Specialization *</label>
              <input type="text" value={form.specialization} onChange={updateField('specialization')} required className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Qualifications</label>
              <input type="text" value={form.qualifications} onChange={updateField('qualifications')} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Slot Duration (min)</label>
              <input type="number" value={form.slotDuration} onChange={(e) => setForm(p => ({ ...p, slotDuration: parseInt(e.target.value) || 30 }))} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Consultation Fee ($)</label>
              <input type="number" value={form.consultationFee} onChange={(e) => setForm(p => ({ ...p, consultationFee: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 border rounded-md" />
            </div>
          </div>
          <button type="submit" disabled={submitLoading} className="mt-4 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50">
            {submitLoading ? 'Creating...' : 'Create Doctor'}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {doctors.map((doc) => (
          <div key={doc.id} className="bg-white p-5 rounded-lg shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">Dr. {doc.user.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${doc.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {doc.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-blue-600">{doc.specialization}</p>
                <p className="text-sm text-gray-500">{doc.qualifications}</p>
                <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                  <p><span className="font-medium">Fee:</span> ${doc.consultationFee}</p>
                  <p><span className="font-medium">Slot:</span> {doc.slotDuration}min</p>
                  <p><span className="font-medium">Email:</span> {doc.user.email}</p>
                </div>
                <p className="text-sm text-gray-500 mt-1"><span className="font-medium">Available:</span> {daysAvail(doc.availability)}</p>
              </div>
              <div className="flex gap-2 ml-4">
                <button onClick={() => handleToggleActive(doc.id, doc.isActive)} className={`px-3 py-1.5 rounded text-sm ${doc.isActive ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                  {doc.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-700 mb-2">Mark Leave</p>
              <div className="flex gap-2 items-end">
                <div>
                  <label className="block text-xs text-gray-500">Date</label>
                  <input
                    type="date"
                    value={leaves[doc.id]?.date || ''}
                    onChange={(e) => setLeaves(p => ({ ...p, [doc.id]: { ...p[doc.id], date: e.target.value } }))}
                    className="px-3 py-1.5 border rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Reason</label>
                  <input
                    type="text"
                    value={leaves[doc.id]?.reason || ''}
                    onChange={(e) => setLeaves(p => ({ ...p, [doc.id]: { ...p[doc.id], reason: e.target.value } }))}
                    placeholder="Optional"
                    className="px-3 py-1.5 border rounded-md text-sm"
                  />
                </div>
                <button
                  onClick={() => handleLeaveSubmit(doc.id)}
                  disabled={!leaves[doc.id]?.date}
                  className="bg-orange-600 text-white px-3 py-1.5 rounded text-sm hover:bg-orange-700 disabled:opacity-50"
                >
                  Apply Leave
                </button>
              </div>
              {leaves[doc.id]?.date && (
                <p className="text-xs text-orange-600 mt-1">
                  Existing appointments on this date will be cancelled and patients notified.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
