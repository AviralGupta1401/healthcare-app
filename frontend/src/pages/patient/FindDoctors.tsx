import React, { useState, useEffect, useCallback } from 'react';
import { patientApi } from '../../api/client';
import { Doctor, AvailableSlot } from '../../types';

export default function FindDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState('');
  const [showBooking, setShowBooking] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    patientApi.getDoctors().then((res) => setDoctors(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = doctors.filter(d =>
    d.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchSlots = useCallback(async (doctorId: string, date: string) => {
    try {
      const res = await patientApi.getSlots(doctorId, date);
      setSlots(res.data.slots);
      setSelectedSlot(null);
    } catch { setSlots([]); }
  }, []);

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setSelectedSlot(null);
    setShowBooking(true);
    setMessage(null);
    fetchSlots(doctor.id, selectedDate);
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    if (selectedDoctor) fetchSlots(selectedDoctor.id, date);
  };

  const handleBook = async () => {
    if (!selectedDoctor || !selectedSlot) return;
    setBookingLoading(true);
    setMessage(null);
    try {
      await patientApi.holdSlot({ doctorId: selectedDoctor.id, date: selectedDate, startTime: selectedSlot });
      await patientApi.bookAppointment({
        doctorId: selectedDoctor.id,
        date: selectedDate,
        startTime: selectedSlot,
        symptoms: symptoms || undefined,
      });
      setMessage({ type: 'success', text: 'Appointment booked successfully!' });
      setSelectedSlot(null);
      setSymptoms('');
      fetchSlots(selectedDoctor.id, selectedDate);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Booking failed';
      setMessage({ type: 'error', text: msg });
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading doctors...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <h1 className="text-2xl font-bold mb-4">Find a Doctor</h1>
        <input
          type="text"
          placeholder="Search by specialization or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="space-y-3">
          {filtered.map((doctor) => (
            <div
              key={doctor.id}
              className={`bg-white p-4 rounded-lg shadow cursor-pointer border-2 transition-colors ${
                selectedDoctor?.id === doctor.id ? 'border-blue-500' : 'border-transparent hover:border-blue-200'
              }`}
              onClick={() => handleDoctorSelect(doctor)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">Dr. {doctor.user.name}</h3>
                  <p className="text-blue-600 text-sm">{doctor.specialization}</p>
                  <p className="text-gray-500 text-sm">{doctor.qualifications}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">${doctor.consultationFee}</p>
                  <p className="text-sm text-gray-500">{doctor.slotDuration} min</p>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-gray-500">No doctors found.</p>}
        </div>
      </div>

      {showBooking && selectedDoctor && (
        <div className="bg-white p-6 rounded-lg shadow h-fit">
          <h2 className="text-xl font-semibold mb-4">Book Appointment</h2>
          <p className="font-medium">Dr. {selectedDoctor.user.name}</p>
          <p className="text-sm text-gray-600 mb-4">{selectedDoctor.specialization}</p>

          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <label className="block text-sm font-medium text-gray-700 mb-2">Available Slots</label>
          {slots.length === 0 ? (
            <p className="text-sm text-gray-500 mb-4">No slots available for this date.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {slots.map((slot) => (
                <button
                  key={slot.time}
                  disabled={!slot.available}
                  onClick={() => setSelectedSlot(slot.time)}
                  className={`px-2 py-2 text-sm rounded-md border transition-colors ${
                    selectedSlot === slot.time
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

          <label className="block text-sm font-medium text-gray-700 mb-1">Symptoms (optional)</label>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe your symptoms..."
          />

          {message && (
            <div className={`p-3 rounded-md mb-4 text-sm ${
              message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          <button
            onClick={handleBook}
            disabled={!selectedSlot || bookingLoading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bookingLoading ? 'Booking...' : selectedSlot ? `Book at ${selectedSlot}` : 'Select a slot'}
          </button>
        </div>
      )}
    </div>
  );
}
