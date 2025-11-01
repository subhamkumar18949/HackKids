import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [authMode, setAuthMode] = useState(''); // 'signup' or 'login'
  const navigate = useNavigate();

  const handleAuthClick = (mode) => {
    setAuthMode(mode);
    setShowRoleSelection(true);
  };

  const handleRoleSelect = (role) => {
    // Navigate to auth page with role and mode
    navigate(`/auth/${role}?mode=${authMode}`);
  };

  const roles = [
    {
      id: 'sender',
      title: 'Sender',
      description: 'Restaurants, pharmacies, retailers sending packages',
      icon: '📦',
      color: 'from-blue-600 to-blue-700'
    },
    {
      id: 'receiver',
      title: 'Receiver',
      description: 'Customers receiving and verifying packages',
      icon: '📱',
      color: 'from-indigo-600 to-indigo-700'
    },
    {
      id: 'delivery',
      title: 'Logistics',
      description: 'Drivers and couriers managing deliveries',
      icon: '🚚',
      color: 'from-blue-600 to-indigo-600'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-xl font-bold text-white">V</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  VeriSeal
                </h1>
                <p className="text-xs text-slate-500">Secure Package Verification</p>
              </div>
            </div>

            {/* Auth Buttons */}
            {!showRoleSelection && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleAuthClick('login')}
                  className="px-5 py-2.5 text-slate-700 font-medium hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-all"
                >
                  Login
                </button>
                <button
                  onClick={() => handleAuthClick('signup')}
                  className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all shadow-sm"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {!showRoleSelection ? (
          // Main Landing Content
          <>
            {/* Hero Section */}
            <div className="text-center mb-16">
              <div className="mb-8">
                {/* Delivery Illustration */}
                <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-6 relative">
                  <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                    <div className="text-4xl">📦</div>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                </div>
              </div>

              <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
                Secure Package
                <span className="text-blue-600 block">
                  Verification
                </span>
              </h1>

              <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                Revolutionary IoT-powered tamper detection and temperature monitoring 
                for your most critical deliveries. Trust, verified.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => handleAuthClick('signup')}
                  className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-sm"
                >
                  Get Started Free
                </button>
                <button
                  onClick={() => handleAuthClick('login')}
                  className="px-8 py-4 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:border-blue-600 hover:text-blue-600 transition-all"
                >
                  Sign In
                </button>
              </div>
            </div>

            {/* Features Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <div className="text-center p-6 bg-white rounded-xl border border-slate-200">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔒</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Tamper Detection</h3>
                <p className="text-slate-600">Real-time alerts when package integrity is compromised</p>
              </div>

              <div className="text-center p-6 bg-white rounded-xl border border-slate-200">
                <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🌡️</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Temperature Monitoring</h3>
                <p className="text-slate-600">Continuous cold chain monitoring for sensitive items</p>
              </div>

              <div className="text-center p-6 bg-white rounded-xl border border-slate-200">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📱</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">QR Verification</h3>
                <p className="text-slate-600">Instant package verification with secure QR codes</p>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="text-center">
              <p className="text-gray-500 mb-4">Trusted by delivery companies worldwide</p>
              <div className="flex justify-center items-center gap-8 opacity-60">
                <div className="text-2xl">🏢</div>
                <div className="text-2xl">🏥</div>
                <div className="text-2xl">🍕</div>
                <div className="text-2xl">💊</div>
                <div className="text-2xl">📦</div>
              </div>
            </div>
          </>
        ) : (
          // Role Selection
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <button
                onClick={() => setShowRoleSelection(false)}
                className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors font-medium"
              >
                <span>←</span> Back
              </button>
              
              <h2 className="text-4xl font-bold text-slate-900 mb-4">
                Choose Your Role
              </h2>
              <p className="text-xl text-slate-600">
                Select how you'll be using VeriSeal to {authMode === 'signup' ? 'create your account' : 'sign in'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  className="p-8 bg-white border border-slate-200 rounded-xl hover:border-blue-600 hover:shadow-lg transition-all text-left group"
                >
                  <div className={`w-16 h-16 bg-gradient-to-br ${role.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm`}>
                    <span className="text-2xl text-white">{role.icon}</span>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">
                    {role.title}
                  </h3>
                  
                  <p className="text-slate-600 leading-relaxed">
                    {role.description}
                  </p>

                  <div className="mt-6 flex items-center text-blue-600 font-medium">
                    <span>{authMode === 'signup' ? 'Sign up' : 'Sign in'} as {role.title}</span>
                    <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center text-slate-600">
            <p>&copy; 2025 VeriSeal. Securing deliveries with IoT innovation.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
