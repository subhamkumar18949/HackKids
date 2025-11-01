import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

function AuthForm() {
  const { role } = useParams(); // sender, receiver, delivery
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get('mode') || 'login'; // login or signup

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    company_name: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Role configuration
  const roleConfig = {
    sender: {
      title: 'Sender',
      icon: '📦',
      color: 'from-blue-600 to-blue-700',
      description: 'Restaurants, pharmacies, retailers'
    },
    receiver: {
      title: 'Receiver', 
      icon: '📱',
      color: 'from-indigo-600 to-indigo-700',
      description: 'Customers receiving packages'
    },
    delivery: {
      title: 'Logistics',
      icon: '🚚', 
      color: 'from-blue-600 to-indigo-600',
      description: 'Drivers and couriers'
    }
  };

  const currentRole = roleConfig[role] || roleConfig.sender;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Validation
      if (mode === 'signup') {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
      }

      const endpoint = mode === 'signup' ? '/auth/register' : '/auth/login';
      const payload = mode === 'signup' 
        ? {
            username: formData.username,
            email: formData.email,
            password: formData.password,
            role: role, // Role is locked from URL
            phone: formData.phone || null,
            company_name: formData.company_name || null
          }
        : {
            email: formData.email,
            password: formData.password
          };

      const response = await fetch(`http://127.0.0.1:8000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      // Store JWT token
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect to role-specific dashboard
      const dashboardRoutes = {
        sender: '/sender/dashboard',
        receiver: '/receiver/scanner', 
        delivery: '/delivery/dashboard'
      };

      navigate(dashboardRoutes[role] || '/dashboard');

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    const newMode = mode === 'login' ? 'signup' : 'login';
    navigate(`/auth/${role}?mode=${newMode}`);
  };

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

            {/* Back Button */}
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all font-medium"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-md mx-auto px-4 py-12">
        {/* Role Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br ${currentRole.color} rounded-2xl mb-4 shadow-lg shadow-blue-500/20`}>
            <span className="text-3xl text-white">{currentRole.icon}</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {mode === 'signup' ? 'Sign Up' : 'Sign In'} as {currentRole.title}
          </h1>
          <p className="text-slate-600">{currentRole.description}</p>
        </div>

        {/* Auth Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Display (Locked) */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{currentRole.icon}</span>
                <div>
                  <p className="font-semibold text-slate-900">Role: {currentRole.title}</p>
                  <p className="text-sm text-slate-600">This role is locked for this registration</p>
                </div>
              </div>
            </div>

            {/* Username (Signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none transition-all"
                  placeholder="Enter your username"
                  required
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none transition-all"
                placeholder="Enter your email"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none transition-all"
                placeholder="Enter your password"
                required
              />
            </div>

            {/* Confirm Password (Signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none transition-all"
                  placeholder="Confirm your password"
                  required
                />
              </div>
            )}

            {/* Role-specific fields (Signup only) */}
            {mode === 'signup' && (
              <>
                {/* Phone for all roles */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Phone Number {role === 'receiver' && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none transition-all"
                    placeholder="Enter your phone number"
                    required={role === 'receiver'}
                  />
                </div>

                {/* Company Name for sender */}
                {role === 'sender' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none transition-all"
                      placeholder="Enter your company name"
                    />
                  </div>
                )}
              </>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
                isLoading
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-sm'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {mode === 'signup' ? 'Creating Account...' : 'Signing In...'}
                </div>
              ) : (
                `${mode === 'signup' ? 'Create Account' : 'Sign In'} as ${currentRole.title}`
              )}
            </button>
          </form>

          {/* Switch Mode */}
          <div className="mt-6 text-center">
            <p className="text-slate-600">
              {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
              <button
                onClick={switchMode}
                className="ml-2 font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                {mode === 'signup' ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthForm;
