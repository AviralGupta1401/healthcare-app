import React, { useEffect, useState } from 'react';
import { patientApi } from '../../api/client';
import { Medication } from '../../types';

export default function PatientMedications() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    patientApi.getMedications()
      .then((res) => setMedications(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Medications</h1>
      {medications.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-500">No medications prescribed yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {medications.map((med) => (
            <div key={med.id} className="bg-white p-5 rounded-lg shadow">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{med.name}</h3>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  {med.dosage}
                </span>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-medium">Frequency:</span> {med.frequency}</p>
                <p><span className="font-medium">Duration:</span> {med.duration}</p>
                {med.instructions && <p><span className="font-medium">Instructions:</span> {med.instructions}</p>}
                <p><span className="font-medium">Prescribed by:</span> Dr. {med.appointment?.doctor?.user?.name || 'Doctor'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`w-2 h-2 rounded-full ${med.reminderEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-xs">{med.reminderEnabled ? 'Reminders active' : 'Reminders disabled'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
