import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function SenderDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Dashboard state
  const [stats, setStats] = useState({
    activeDevices: 12,
    offlineDevices: 2,
    packagesInTransit: 45,
    tamperAlerts: 3,
    todayShipments: 28
  });

  // Package creation state
  const [newPackage, setNewPackage] = useState({
    orderId: '',
    packageType: 'electronics',
    customerPhone: '',
    deviceId: '',
    notes: ''
  });
  const [isCreatingPackage, setIsCreatingPackage] = useState(false);
  const [createdPackage, setCreatedPackage] = useState(null);

  // Device management state
  const [devices, setDevices] = useState([
    { id: 'DEV001', status: 'available', battery: 95, lastSeen: '2 min ago' },
    { id: 'DEV002', status: 'deployed', battery: 78, lastSeen: '5 min ago', orderId: 'ORD12345' },
    { id: 'DEV003', status: 'available', battery: 88, lastSeen: '1 min ago' },
    { id: 'DEV004', status: 'deployed', battery: 45, lastSeen: '10 min ago', orderId: 'ORD12346' },
    { id: 'DEV005', status: 'offline', battery: 12, lastSeen: '2 hours ago' }
  ]);

  // Live packages state
  const [livePackages, setLivePackages] = useState([
    {
      id: 'PKG001',
      orderId: 'ORD12345',
      type: 'Electronics',
      deviceId: 'DEV002',
      status: 'in_transit',
      customer: '+91 98765 43210',
      temperature: '22°C',
      tamperStatus: 'secure',
      location: 'Mumbai Central',
      createdAt: '2 hours ago'
    },
    {
      id: 'PKG002',
      orderId: 'ORD12346',
      type: 'Jewelry',
      deviceId: 'DEV004',
      status: 'delivered',
      customer: '+91 98765 43211',
      temperature: '25°C',
      tamperStatus: 'secure',
      location: 'Delivered',
      createdAt: '5 hours ago'
    }
  ]);

  // Alerts state
  const [alerts, setAlerts] = useState([
    { id: 1, type: 'tamper', message: 'Package PKG003 tamper detected', time: '10 min ago', severity: 'high' },
    { id: 2, type: 'battery', message: 'Device DEV005 low battery (12%)', time: '30 min ago', severity: 'medium' },
    { id: 3, type: 'delivery', message: 'Package PKG002 delivered successfully', time: '1 hour ago', severity: 'low' }
  ]);

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
      loadLivePackages();
    } else {
      navigate('/auth/sender?mode=login');
      return;
    }
  }, [navigate]);

  const loadLivePackages = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/sender/packages', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        const packages = await response.json();
        setLivePackages(packages.map(pkg => ({
          id: pkg.package_id,
          orderId: pkg.order_id,
          type: pkg.package_type,
          deviceId: pkg.device_id,
          status: pkg.current_status,
          customer: 'Customer', // You might want to add this to backend
          temperature: pkg.latest_esp32_data?.temperature ? `${pkg.latest_esp32_data.temperature}°C` : 'N/A',
          tamperStatus: pkg.latest_esp32_data?.tamper_status || 'unknown',
          location: pkg.current_location,
          createdAt: new Date(pkg.created_at).toLocaleString(),
          checkpointsCount: pkg.checkpoints_count
        })));
      }
    } catch (error) {
      console.error('Error loading packages:', error);
    }
  };

  const handleCreatePackage = async (e) => {
    e.preventDefault();
    setIsCreatingPackage(true);

    try {
      // Call backend API to create package
      const response = await fetch('http://127.0.0.1:8000/packages/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          order_id: newPackage.orderId,
          package_type: newPackage.packageType,
          receiver_phone: newPackage.customerPhone,
          device_id: newPackage.deviceId,
          sender_id: user.id,
          notes: newPackage.notes
        })
      });

      if (response.ok) {
        const packageData = await response.json();
        
        // Update device status
        setDevices(prev => prev.map(device => 
          device.id === newPackage.deviceId 
            ? { ...device, status: 'deployed', orderId: newPackage.orderId }
            : device
        ));

        setCreatedPackage({
          ...packageData,
          id: packageData.package_id,
          qrUrl: packageData.qr_url,
          createdAt: new Date().toISOString()
        });
        
        setNewPackage({
          orderId: '',
          packageType: 'electronics',
          customerPhone: '',
          deviceId: '',
          notes: ''
        });

        // Refresh live packages
        loadLivePackages();
      } else {
        const error = await response.json();
        console.error('Error creating package:', error);
      }

    } catch (error) {
      console.error('Error creating package:', error);
    } finally {
      setIsCreatingPackage(false);
    }
  };

  const generateQRCodeURL = (url) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'deployed': return 'bg-blue-100 text-blue-800';
      case 'offline': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-50 border-red-200 text-red-800';
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low': return 'bg-green-50 border-green-200 text-green-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & User Info */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">📦</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  {user.company_name || 'E-Commerce Hub'}
                </h1>
                <p className="text-sm text-gray-500">Welcome, {user.username}</p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Devices</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeDevices}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🟢</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Transit</p>
                <p className="text-2xl font-bold text-blue-600">{stats.packagesInTransit}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🚚</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tamper Alerts</p>
                <p className="text-2xl font-bold text-red-600">{stats.tamperAlerts}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🚨</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Shipments</p>
                <p className="text-2xl font-bold text-purple-600">{stats.todayShipments}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Offline Devices</p>
                <p className="text-2xl font-bold text-gray-600">{stats.offlineDevices}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⚫</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'create', label: 'Create Package', icon: '➕' },
                { id: 'devices', label: 'Device Management', icon: '🔧' },
                { id: 'live', label: 'Live Tracking', icon: '📍' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Recent Alerts */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Alerts</h3>
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div key={alert.id} className={`p-4 rounded-lg border ${getAlertColor(alert.severity)}`}>
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{alert.message}</p>
                          <span className="text-sm">{alert.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setActiveTab('create')}
                      className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left"
                    >
                      <div className="text-2xl mb-2">➕</div>
                      <h4 className="font-semibold text-blue-800">Create New Package</h4>
                      <p className="text-sm text-blue-600">Assign device and generate QR code</p>
                    </button>

                    <button
                      onClick={() => setActiveTab('devices')}
                      className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-left"
                    >
                      <div className="text-2xl mb-2">🔧</div>
                      <h4 className="font-semibold text-green-800">Manage Devices</h4>
                      <p className="text-sm text-green-600">View device status and battery levels</p>
                    </button>

                    <button
                      onClick={() => setActiveTab('live')}
                      className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-left"
                    >
                      <div className="text-2xl mb-2">📍</div>
                      <h4 className="font-semibold text-purple-800">Live Tracking</h4>
                      <p className="text-sm text-purple-600">Monitor packages in real-time</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Create Package Tab */}
            {activeTab === 'create' && (
              <div className="max-w-2xl">
                <h3 className="text-lg font-semibold text-gray-800 mb-6">Create New Package</h3>
                
                {!createdPackage ? (
                  <form onSubmit={handleCreatePackage} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Order ID
                        </label>
                        <input
                          type="text"
                          value={newPackage.orderId}
                          onChange={(e) => setNewPackage(prev => ({ ...prev, orderId: e.target.value }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                          placeholder="e.g., ORD12345"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Package Type
                        </label>
                        <select
                          value={newPackage.packageType}
                          onChange={(e) => setNewPackage(prev => ({ ...prev, packageType: e.target.value }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        >
                          <option value="electronics">📱 Electronics</option>
                          <option value="jewelry">💎 Jewelry</option>
                          <option value="fashion">👕 Fashion</option>
                          <option value="books">📚 Books</option>
                          <option value="gaming">🎮 Gaming</option>
                          <option value="home">🏠 Home & Garden</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Customer Phone
                        </label>
                        <input
                          type="tel"
                          value={newPackage.customerPhone}
                          onChange={(e) => setNewPackage(prev => ({ ...prev, customerPhone: e.target.value }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                          placeholder="+91 98765 43210"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Assign Device
                        </label>
                        <select
                          value={newPackage.deviceId}
                          onChange={(e) => setNewPackage(prev => ({ ...prev, deviceId: e.target.value }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                          required
                        >
                          <option value="">Select available device</option>
                          {devices.filter(device => device.status === 'available').map(device => (
                            <option key={device.id} value={device.id}>
                              {device.id} (Battery: {device.battery}%)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Notes (Optional)
                      </label>
                      <textarea
                        value={newPackage.notes}
                        onChange={(e) => setNewPackage(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        rows={3}
                        placeholder="Special handling instructions..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isCreatingPackage}
                      className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {isCreatingPackage ? 'Creating Package...' : 'Create Package & Generate QR'}
                    </button>
                  </form>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-green-800 mb-4">✅ Package Created Successfully!</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-2">Package Details</h5>
                        <div className="space-y-1 text-sm">
                          <p><strong>Package ID:</strong> {createdPackage.id}</p>
                          <p><strong>Order ID:</strong> {createdPackage.orderId}</p>
                          <p><strong>Device:</strong> {createdPackage.deviceId}</p>
                          <p><strong>PIN:</strong> {createdPackage.pin}</p>
                        </div>
                      </div>

                      <div className="text-center">
                        <h5 className="font-semibold text-gray-800 mb-2">QR Code</h5>
                        <img 
                          src={generateQRCodeURL(createdPackage.qrUrl)} 
                          alt="Package QR Code"
                          className="mx-auto border border-gray-300 rounded"
                        />
                        <p className="text-xs text-gray-500 mt-2">Attach to hardware device</p>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button 
                        onClick={() => window.print()}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        🖨️ Print QR Code
                      </button>
                      <button 
                        onClick={() => setCreatedPackage(null)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        Create Another
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Device Management Tab */}
            {activeTab === 'devices' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-6">Device Management</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {devices.map((device) => (
                    <div key={device.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-800">{device.id}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(device.status)}`}>
                          {device.status}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Battery:</span>
                          <span className={device.battery < 20 ? 'text-red-600 font-medium' : ''}>{device.battery}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Last Seen:</span>
                          <span>{device.lastSeen}</span>
                        </div>
                        {device.orderId && (
                          <div className="flex justify-between">
                            <span>Order:</span>
                            <span className="font-medium">{device.orderId}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Tracking Tab */}
            {activeTab === 'live' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-800">Live Package Tracking</h3>
                  <button
                    onClick={loadLivePackages}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    🔄 Refresh
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Package ID</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Order ID</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Checkpoints</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Temperature</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Security</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {livePackages.map((pkg) => (
                        <tr key={pkg.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{pkg.id}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{pkg.orderId}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{pkg.type}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              pkg.status === 'delivered' ? 'bg-green-100 text-green-800' : 
                              pkg.status === 'at_checkpoint' ? 'bg-blue-100 text-blue-800' :
                              pkg.status === 'created' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {pkg.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{pkg.location}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                              {pkg.checkpointsCount} passed
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{pkg.temperature}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              pkg.tamperStatus === 'secure' ? 'bg-green-100 text-green-800' :
                              pkg.tamperStatus === 'tampered' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {pkg.tamperStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {livePackages.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No packages found. Create your first package to start tracking!
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SenderDashboard;
