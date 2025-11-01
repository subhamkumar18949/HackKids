import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';

function SenderDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Dashboard state
  const [stats, setStats] = useState({
    activeDevices: 0,
    offlineDevices: 0,
    packagesInTransit: 0,
    tamperAlerts: 0,
    todayShipments: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

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
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const qrScannerRef = useRef(null);

  // Device management state
  const [devices, setDevices] = useState([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);

  // Transit report state
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [transitReport, setTransitReport] = useState(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // Live packages state
  const [livePackages, setLivePackages] = useState([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);

  // Alerts state
  const [alerts, setAlerts] = useState([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'sender') {
      navigate('/login');
      return;
    }

    setUser(parsedUser);
    
    // Load all real data from backend
    loadLivePackages();
    loadDashboardStats();
    loadDevices();
    loadAlerts();
  }, [navigate]);

  const loadDashboardStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/sender/packages', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const packages = data.packages || [];
        
        // Calculate real stats from packages
        const inTransit = packages.filter(pkg => 
          pkg.current_status !== 'delivered' && pkg.current_status !== 'cancelled'
        ).length;
        
        const tampered = packages.filter(pkg => pkg.is_tampered).length;
        
        const today = new Date().toDateString();
        const todayShipments = packages.filter(pkg => 
          new Date(pkg.created_at).toDateString() === today
        ).length;
        
        setStats({
          activeDevices: devices.filter(d => d.status === 'available' || d.status === 'deployed').length,
          offlineDevices: devices.filter(d => d.status === 'offline').length,
          packagesInTransit: inTransit,
          tamperAlerts: tampered,
          todayShipments: todayShipments
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadDevices = async () => {
    setIsLoadingDevices(true);
    try {
      // For now, create devices based on packages or use a simple list
      // You can add a backend endpoint later: /sender/devices
      const response = await fetch('http://127.0.0.1:8000/sender/packages', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const packages = data.packages || [];
        
        // Extract unique devices from packages
        const deviceMap = new Map();
        packages.forEach(pkg => {
          if (!deviceMap.has(pkg.device_id)) {
            deviceMap.set(pkg.device_id, {
              id: pkg.device_id,
              status: pkg.current_status === 'delivered' ? 'available' : 'deployed',
              battery: 85, // Default value since we don't have real battery data yet
              lastSeen: 'Active',
              orderId: pkg.current_status !== 'delivered' ? pkg.order_id : null
            });
          }
        });
        
        // Add some available devices for demo
        for (let i = 1; i <= 5; i++) {
          const devId = `DEV${String(i).padStart(3, '0')}`;
          if (!deviceMap.has(devId)) {
            deviceMap.set(devId, {
              id: devId,
              status: 'available',
              battery: 90 + Math.floor(Math.random() * 10),
              lastSeen: 'Ready',
              orderId: null
            });
          }
        }
        
        setDevices(Array.from(deviceMap.values()));
      }
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  const loadAlerts = async () => {
    setIsLoadingAlerts(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/sender/packages', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const packages = data.packages || [];
        
        // Generate alerts from real package data
        const alertsList = [];
        let alertId = 1;
        
        packages.forEach(pkg => {
          // Tamper alerts
          if (pkg.is_tampered && pkg.tamper_count > 0) {
            alertsList.push({
              id: alertId++,
              severity: 'high',
              message: `Tamper detected on ${pkg.package_id}`,
              time: new Date(pkg.updated_at).toLocaleString()
            });
          }
          
          // Delivery alerts
          if (pkg.current_status === 'delivered') {
            alertsList.push({
              id: alertId++,
              severity: 'low',
              message: `Package ${pkg.package_id} delivered successfully`,
              time: new Date(pkg.updated_at).toLocaleString()
            });
          }
          
          // In transit alerts
          if (pkg.current_status === 'in_transit') {
            alertsList.push({
              id: alertId++,
              severity: 'medium',
              message: `Package ${pkg.package_id} is in transit at ${pkg.current_location}`,
              time: new Date(pkg.updated_at).toLocaleString()
            });
          }
        });
        
        // Sort by most recent and take top 5
        setAlerts(alertsList.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setIsLoadingAlerts(false);
    }
  };

  const loadLivePackages = async () => {
    setIsLoadingPackages(true);
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
          checkpointsCount: pkg.checkpoints_count,
          isTampered: pkg.is_tampered
        })));
      }
    } catch (error) {
      console.error('Error loading packages:', error);
    } finally {
      setIsLoadingPackages(false);
    }
  };

  const startQRScanner = () => {
    setShowQRScanner(true);
    setScannerError(null);
    
    // Initialize scanner after DOM is ready
    setTimeout(() => {
      if (!qrScannerRef.current) {
        qrScannerRef.current = new Html5QrcodeScanner(
          "qr-reader-create",
          { 
            fps: 20,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            rememberLastUsedCamera: true
          },
          false
        );
        
        qrScannerRef.current.render(
          (decodedText) => {
            console.log("QR Code detected:", decodedText);
            
            // Extract device_id from QR code
            let deviceId = decodedText.trim();
            
            // Handle different QR formats
            if (decodedText.includes('device/')) {
              deviceId = decodedText.split('device/')[1].trim();
            } else if (decodedText.includes('://')) {
              const parts = decodedText.split('/');
              deviceId = parts[parts.length - 1].trim();
            }
            
            console.log("Extracted device ID:", deviceId);
            
            // Set device ID in form
            setNewPackage(prev => ({ ...prev, deviceId: deviceId }));
            
            // Stop scanner
            stopQRScanner();
          },
          (errorMessage) => {
            // Ignore continuous scan errors
          }
        );
      }
    }, 300);
  };

  const stopQRScanner = () => {
    try {
      if (qrScannerRef.current) {
        qrScannerRef.current.clear();
        qrScannerRef.current = null;
      }
      setShowQRScanner(false);
    } catch (err) {
      console.error("Error stopping scanner:", err);
      setShowQRScanner(false);
    }
  };

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        try {
          qrScannerRef.current.clear();
        } catch (err) {
          console.error(err);
        }
      }
    };
  }, []);

  const loadTransitReport = async (packageId) => {
    setIsLoadingReport(true);
    setSelectedPackageId(packageId);
    try {
      const response = await fetch(`http://127.0.0.1:8000/sender/package/${packageId}/transit-report`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        const report = await response.json();
        setTransitReport(report);
      } else {
        console.error('Failed to load transit report');
        setTransitReport(null);
      }
    } catch (error) {
      console.error('Error loading transit report:', error);
      setTransitReport(null);
    } finally {
      setIsLoadingReport(false);
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

        setCreatedPackage(packageData);
        
        setNewPackage({
          orderId: '',
          packageType: 'electronics',
          customerPhone: '',
          deviceId: '',
          notes: ''
        });

        // Refresh all data
        loadLivePackages();
        loadDashboardStats();
        loadDevices();
        loadAlerts();
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
                { id: 'live', label: 'Live Tracking', icon: '📍' },
                { id: 'reports', label: 'Transit Reports', icon: '📋' }
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
                  {isLoadingAlerts ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="mt-2 text-gray-600">Loading alerts...</p>
                    </div>
                  ) : alerts.length > 0 ? (
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
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No alerts yet. All packages are secure! ✅
                    </div>
                  )}
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
                        <div className="flex gap-2">
                          <select
                            value={newPackage.deviceId}
                            onChange={(e) => setNewPackage(prev => ({ ...prev, deviceId: e.target.value }))}
                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                            required
                          >
                            <option value="">Select available device</option>
                            {devices.filter(device => device.status === 'available').map(device => (
                              <option key={device.id} value={device.id}>
                                {device.id} (Battery: {device.battery}%)
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={startQRScanner}
                            className="px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
                            title="Scan ESP32 QR Code"
                          >
                            <span>📷</span>
                            <span className="hidden sm:inline">Scan QR</span>
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Select from list or scan the ESP32 device's QR code
                        </p>
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
                    
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-3">Package Details</h5>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-white p-3 rounded">
                            <p className="text-gray-600">Package ID</p>
                            <p className="font-semibold text-lg">{createdPackage.package_id}</p>
                          </div>
                          <div className="bg-white p-3 rounded">
                            <p className="text-gray-600">Order ID</p>
                            <p className="font-semibold text-lg">{createdPackage.order_id}</p>
                          </div>
                          <div className="bg-white p-3 rounded">
                            <p className="text-gray-600">Device ID</p>
                            <p className="font-semibold text-lg">{createdPackage.device_id}</p>
                          </div>
                          <div className="bg-white p-3 rounded">
                            <p className="text-gray-600">Receiver PIN</p>
                            <p className="font-semibold text-lg">{createdPackage.pin}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">📱</span>
                          <div className="w-full">
                            <h5 className="font-semibold text-blue-800 mb-2">ESP32 QR Code Format</h5>
                            <p className="text-sm text-blue-700 mb-3">
                              The ESP32 device's QR code contains <strong>package_token + 4 sensor parameters</strong>
                            </p>
                            <div className="bg-white rounded p-3 text-xs font-mono">
                              <p className="text-gray-600 mb-2">QR Code Data:</p>
                              {createdPackage.esp32_qr_data && (
                                <div className="space-y-1">
                                  <p>📦 <strong>package_token:</strong> {createdPackage.package_token}</p>
                                  <p>🔒 <strong>tamper_status:</strong> {createdPackage.esp32_qr_data.tamper_status}</p>
                                  <p>🔗 <strong>loop_connected:</strong> {createdPackage.esp32_qr_data.loop_connected ? 'true' : 'false'}</p>
                                  <p>⚡ <strong>acceleration:</strong> {createdPackage.esp32_qr_data.acceleration} m/s²</p>
                                  <p>🌡️ <strong>temperature:</strong> {createdPackage.esp32_qr_data.temperature}°C</p>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-blue-600 mt-2">
                              ℹ️ Sensor values update in real-time on ESP32 device
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">💡</span>
                          <div>
                            <h5 className="font-semibold text-yellow-800 mb-1">Next Steps</h5>
                            <ul className="text-sm text-yellow-700 space-y-1">
                              <li>• Attach ESP32 device to the package</li>
                              <li>• Share PIN <strong>{createdPackage.pin}</strong> with receiver</li>
                              <li>• Device QR code: <strong>{createdPackage.device_id}</strong></li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setCreatedPackage(null)}
                      className="w-full mt-6 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Create Another Package
                    </button>
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

            {/* Transit Reports Tab */}
            {activeTab === 'reports' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-6">Transit Reports with Blockchain Verification</h3>
                
                {!selectedPackageId ? (
                  <div>
                    <p className="text-gray-600 mb-4">Select a package to view its complete transit report including blockchain hashes for tampering events:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {livePackages.map((pkg) => (
                        <div 
                          key={pkg.id} 
                          onClick={() => loadTransitReport(pkg.id)}
                          className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-800">{pkg.id}</h4>
                            {pkg.isTampered && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                🚨 Tampered
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <p><strong>Order:</strong> {pkg.orderId}</p>
                            <p><strong>Type:</strong> {pkg.type}</p>
                            <p><strong>Status:</strong> {pkg.status}</p>
                            <p><strong>Location:</strong> {pkg.location}</p>
                          </div>
                          <button className="mt-3 w-full py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
                            View Report →
                          </button>
                        </div>
                      ))}
                    </div>
                    {livePackages.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No packages found. Create packages to view transit reports.
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => {
                        setSelectedPackageId(null);
                        setTransitReport(null);
                      }}
                      className="mb-4 px-4 py-2 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      ← Back to Package List
                    </button>

                    {isLoadingReport ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="mt-2 text-gray-600">Loading transit report...</p>
                      </div>
                    ) : transitReport ? (
                      <div className="space-y-6">
                        {/* Package Info */}
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                          <h4 className="text-lg font-semibold text-gray-800 mb-4">📦 Package Information</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Package ID</p>
                              <p className="font-semibold">{transitReport.package_info.package_id}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Order ID</p>
                              <p className="font-semibold">{transitReport.package_info.order_id}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Type</p>
                              <p className="font-semibold">{transitReport.package_info.package_type}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Device ID</p>
                              <p className="font-semibold">{transitReport.package_info.device_id}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Status</p>
                              <p className="font-semibold">{transitReport.current_status.status}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Location</p>
                              <p className="font-semibold">{transitReport.current_status.location}</p>
                            </div>
                          </div>
                        </div>

                        {/* Security Status with Blockchain Hashes */}
                        {transitReport.security.is_tampered && transitReport.security.blockchain_hashes.length > 0 && (
                          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
                            <h4 className="text-lg font-semibold text-red-800 mb-4">🚨 Security Alerts - Blockchain Verified</h4>
                            <p className="text-red-700 mb-4">
                              <strong>{transitReport.security.tamper_count}</strong> tampering event(s) detected and logged to blockchain
                            </p>
                            
                            <div className="space-y-4">
                              {transitReport.security.blockchain_hashes.map((hash, index) => (
                                <div key={index} className="bg-white border border-red-200 rounded-lg p-4">
                                  <div className="flex items-start justify-between mb-3">
                                    <div>
                                      <h5 className="font-semibold text-red-800">Tampering Event #{index + 1}</h5>
                                      <p className="text-sm text-gray-600">{hash.event_type}</p>
                                    </div>
                                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                      ⛓️ Blockchain Verified
                                    </span>
                                  </div>
                                  
                                  <div className="space-y-2 text-sm">
                                    <div className="bg-gray-50 p-3 rounded">
                                      <p className="text-gray-600 mb-1">Blockchain Hash:</p>
                                      <p className="font-mono text-xs break-all text-blue-600">{hash.blockchain_hash}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <p className="text-gray-600">Block Number:</p>
                                        <p className="font-semibold">{hash.blockchain_block}</p>
                                      </div>
                                      <div>
                                        <p className="text-gray-600">Timestamp:</p>
                                        <p className="font-semibold">{new Date(hash.timestamp).toLocaleString()}</p>
                                      </div>
                                    </div>
                                    {hash.location && (
                                      <div>
                                        <p className="text-gray-600">Location:</p>
                                        <p className="font-semibold">{hash.location}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* All Tamper Events */}
                        {transitReport.security.tamper_events.length > 0 && (
                          <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h4 className="text-lg font-semibold text-gray-800 mb-4">🔍 All Tamper Events</h4>
                            <div className="space-y-3">
                              {transitReport.security.tamper_events.map((event, index) => (
                                <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-semibold text-red-800">{event.tamper_type}</h5>
                                    <span className="text-xs text-gray-600">{new Date(event.detected_at).toLocaleString()}</span>
                                  </div>
                                  {event.blockchain_hash && (
                                    <div className="mt-2 p-2 bg-white rounded text-xs">
                                      <p className="text-gray-600">Blockchain Hash:</p>
                                      <p className="font-mono text-blue-600 break-all">{event.blockchain_hash}</p>
                                    </div>
                                  )}
                                  {event.sensor_data && (
                                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                                      {event.sensor_data.temperature && (
                                        <div className="bg-white p-2 rounded">
                                          <p className="text-gray-600">Temp:</p>
                                          <p className="font-semibold">{event.sensor_data.temperature}°C</p>
                                        </div>
                                      )}
                                      {event.sensor_data.acceleration !== undefined && (
                                        <div className="bg-white p-2 rounded">
                                          <p className="text-gray-600">Acceleration:</p>
                                          <p className={`font-semibold ${event.sensor_data.acceleration > 20 ? 'text-red-600' : ''}`}>
                                            {event.sensor_data.acceleration} m/s²
                                          </p>
                                        </div>
                                      )}
                                      {event.sensor_data.loop_connected !== undefined && (
                                        <div className="bg-white p-2 rounded">
                                          <p className="text-gray-600">Wire Loop:</p>
                                          <p className={`font-semibold ${event.sensor_data.loop_connected ? 'text-green-600' : 'text-red-600'}`}>
                                            {event.sensor_data.loop_connected ? '✅ OK' : '❌ Broken'}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Transit Logs from ESP32 Scans */}
                        {transitReport.transit_data && transitReport.transit_data.transit_logs.length > 0 && (
                          <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h4 className="text-lg font-semibold text-gray-800 mb-4">📡 ESP32 Transit Scans</h4>
                            <p className="text-sm text-gray-600 mb-4">Total scans: {transitReport.transit_data.total_scans}</p>
                            <div className="space-y-3">
                              {transitReport.transit_data.transit_logs.map((log, index) => (
                                <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-gray-800">Scan #{index + 1}</span>
                                    <span className="text-xs text-gray-600">{new Date(log.logged_at).toLocaleString()}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                    <div>
                                      <p className="text-gray-600">Device:</p>
                                      <p className="font-semibold">{log.device_id}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-600">Location:</p>
                                      <p className="font-semibold">{log.location}</p>
                                    </div>
                                  </div>
                                  {log.sensor_data && (
                                    <div className="p-2 bg-white rounded text-xs">
                                      <p className="text-gray-600 mb-1">Sensor Data:</p>
                                      <div className="grid grid-cols-3 gap-2">
                                        {log.sensor_data.temperature && (
                                          <div>
                                            <p className="text-gray-500">Temp:</p>
                                            <p className="font-semibold">{log.sensor_data.temperature}°C</p>
                                          </div>
                                        )}
                                        {log.sensor_data.battery_level && (
                                          <div>
                                            <p className="text-gray-500">Battery:</p>
                                            <p className="font-semibold">{log.sensor_data.battery_level}%</p>
                                          </div>
                                        )}
                                        {log.sensor_data.tamper_status && (
                                          <div>
                                            <p className="text-gray-500">Status:</p>
                                            <p className={`font-semibold ${
                                              log.sensor_data.tamper_status === 'secure' ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                              {log.sensor_data.tamper_status}
                                            </p>
                                          </div>
                                        )}
                                        {log.sensor_data.acceleration !== undefined && (
                                          <div>
                                            <p className="text-gray-500">Accel:</p>
                                            <p className={`font-semibold ${
                                              log.sensor_data.acceleration > 20 ? 'text-red-600' : 'text-gray-800'
                                            }`}>
                                              {log.sensor_data.acceleration} m/s²
                                            </p>
                                          </div>
                                        )}
                                        {log.sensor_data.loop_connected !== undefined && (
                                          <div>
                                            <p className="text-gray-500">Loop:</p>
                                            <p className={`font-semibold ${
                                              log.sensor_data.loop_connected ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                              {log.sensor_data.loop_connected ? '✅' : '❌'}
                                            </p>
                                          </div>
                                        )}
                                        {log.sensor_data.humidity !== undefined && (
                                          <div>
                                            <p className="text-gray-500">Humidity:</p>
                                            <p className="font-semibold">{log.sensor_data.humidity}%</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Journey/Checkpoint Logs */}
                        {transitReport.journey.scan_logs.length > 0 && (
                          <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h4 className="text-lg font-semibold text-gray-800 mb-4">🗺️ Checkpoint Journey</h4>
                            <div className="space-y-3">
                              {transitReport.journey.scan_logs.map((log, index) => (
                                <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-semibold text-gray-800">{log.name}</h5>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      log.status === 'passed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                      {log.status}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600">{log.location}</p>
                                  <p className="text-xs text-gray-500 mt-1">{new Date(log.scanned_at).toLocaleString()}</p>
                                  {log.notes && <p className="text-sm text-gray-700 mt-1">{log.notes}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        Failed to load transit report. Please try again.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* QR Scanner Modal */}
            {showQRScanner && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Scan ESP32 QR Code</h3>
                    <button
                      onClick={stopQRScanner}
                      className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                      ×
                    </button>
                  </div>
                  
                  {scannerError ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-red-700 text-sm">{scannerError}</p>
                    </div>
                  ) : null}
                  
                  <div id="qr-reader-create" className="w-full"></div>
                  
                  <p className="text-sm text-gray-600 mt-4 text-center">
                    Position the ESP32's QR code within the frame
                  </p>
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
