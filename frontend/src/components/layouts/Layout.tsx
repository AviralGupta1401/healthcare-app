import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-blue-600">
                Healthcare App
              </Link>
              {user && (
                <div className="ml-10 flex space-x-4">
                  {user.role === 'ADMIN' && (
                    <>
                      <Link to="/admin" className="text-gray-700 hover:text-blue-600 px-3 py-2">Dashboard</Link>
                      <Link to="/admin/doctors" className="text-gray-700 hover:text-blue-600 px-3 py-2">Doctors</Link>
                      <Link to="/admin/appointments" className="text-gray-700 hover:text-blue-600 px-3 py-2">Appointments</Link>
                    </>
                  )}
                  {user.role === 'PATIENT' && (
                    <>
                      <Link to="/patient" className="text-gray-700 hover:text-blue-600 px-3 py-2">Dashboard</Link>
                      <Link to="/patient/find-doctors" className="text-gray-700 hover:text-blue-600 px-3 py-2">Find Doctors</Link>
                      <Link to="/patient/appointments" className="text-gray-700 hover:text-blue-600 px-3 py-2">My Appointments</Link>
                      <Link to="/patient/medications" className="text-gray-700 hover:text-blue-600 px-3 py-2">Medications</Link>
                    </>
                  )}
                  {user.role === 'DOCTOR' && (
                    <>
                      <Link to="/doctor" className="text-gray-700 hover:text-blue-600 px-3 py-2">Dashboard</Link>
                      <Link to="/doctor/appointments" className="text-gray-700 hover:text-blue-600 px-3 py-2">Appointments</Link>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-sm text-gray-600">{user.name} ({user.role})</span>
                  <button
                    onClick={handleLogout}
                    className="bg-red-500 text-white px-4 py-2 rounded-md text-sm hover:bg-red-600"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link to="/login" className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600">
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
