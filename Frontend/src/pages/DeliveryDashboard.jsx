import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function DeliveryDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('scanner');
  
  // Scanner state
  const [scanResult, setScanResult] = useState('');
  const [packageToken, setPackageToken] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [packageData, setPackageData] = useState(null);
  
  // Checkpoint state
  const [selectedCheckpoint, setSelectedCheckpoint] = useState('CP001');
  const [esp32Data, setEsp32Data] = useState({
    temperature: 22.5,
    humidity: 45,
    tamper_status: 'secure',
    battery_level: 85,
    shock_detected: false,
    gps_location: '19.0760,72.8777'
  });
  const [checkpointStatus, setCheckpointStatus] = useState('passed');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Packages state
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Checkpoints configuration
  const checkpoints = [
    { id: 'CP001', name: 'Warehouse Dispatch', location: 'Mumbai Warehouse', icon: '🏭' },
    { id: 'CP002', name: 'Local Hub', location: 'Mumbai Central Hub', icon: '🏢' },
    { id: 'CP003', name: 'Transit Hub', location: 'Delhi Transit Hub', icon: '🚛' },
    { id: 'CP004', name: 'Destination Hub', location: 'Bangalore Hub', icon: '🏪' },
    { id: 'CP005', name: 'Out for Delivery', location: 'Local Delivery Center', icon: '🚚' },
    { id: 'CP006', name: 'Delivered', location: 'Customer Location', icon: '🏠' }
  ];

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/auth/delivery?mode=login');
      return;
    }

    // Load packages
    loadPackages();
  }, [navigate]);

  const loadPackages = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/delivery/packages', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPackages(data);
      }
    } catch (error) {
      console.error('Error loading packages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanPackage = async () => {
    if (!packageToken.trim()) {
      setScanResult('❌ Please enter a package token');
      return;
    }

    setIsScanning(true);
    setScanResult('');

    try {
      const response = await fetch(`http://127.0.0.1:8000/delivery/package/${packageToken}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPackageData(data);
        setScanResult(`✅ Package found: ${data.package_id}`);
        
        // Update ESP32 data with latest readings if available
        if (data.latest_esp32_data) {
          setEsp32Data(prev => ({
            ...prev,
            ...data.latest_esp32_data
          }));
        }
      } else {
        const error = await response.json();
        setScanResult(`❌ ${error.detail || 'Package not found'}`);
        setPackageData(null);
      }
    } catch (error) {
      setScanResult('❌ Error scanning package');
      setPackageData(null);
    } finally {
      setIsScanning(false);
    }
  };

  const handleCheckpointScan = async () => {
    if (!packageData) {
      setScanResult('❌ Please scan a package first');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/delivery/scan-checkpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          package_token: packageToken,
          checkpoint_id: selectedCheckpoint,
          esp32_data: esp32Data,
          status: checkpointStatus,
          notes: notes
        })
      });

      if (response.ok) {
        const data = await response.json();
        setScanResult(`✅ Checkpoint scan recorded successfully at ${data.timestamp}`);
        
        // Reset form
        setPackageData(null);
        setPackageToken('');
        setNotes('');
        
        // Reload packages
        loadPackages();
      } else {
        const error = await response.json();
        setScanResult(`❌ ${error.detail || 'Failed to record checkpoint'}`);
      }
    } catch (error) {
      setScanResult('❌ Error recording checkpoint');
    } finally {
      setIsSubmitting(false);
    }
  };

  const simulateESP32Reading = () => {
    // Simulate new ESP32 readings
    setEsp32Data({
      temperature: (20 + Math.random() * 10).toFixed(1),
      humidity: (40 + Math.random() * 20).toFixed(1),
      tamper_status: Math.random() > 0.9 ? 'tampered' : 'secure',
      battery_level: Math.floor(70 + Math.random() * 30),
      shock_detected: Math.random() > 0.95,
      gps_location: '19.0760,72.8777'
    });
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & User Info */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">🚚</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  Delivery Hub
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

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'scanner', label: 'Package Scanner', icon: '📱' },
                { id: 'packages', label: 'Package List', icon: '📦' },
                { id: 'checkpoints', label: 'Checkpoint Map', icon: '🗺️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
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
            {/* Package Scanner Tab */}
            {activeTab === 'scanner' && (
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-orange-600 to-red-600 rounded-full mb-4">
                    <span className="text-3xl">📱</span>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">
                    Checkpoint Scanner
                  </h2>
                  <p className="text-gray-600">
                    Scan packages and record checkpoint data with ESP32 sensors
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Package Scanner */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">📦 Package Scanner</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Package Token
                        </label>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            value={packageToken}
                            onChange={(e) => setPackageToken(e.target.value)}
                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                            placeholder="Enter or scan package token"
                          />
                          <button
                            onClick={handleScanPackage}
                            disabled={isScanning}
                            className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
                          >
                            {isScanning ? 'Scanning...' : 'Scan'}
                          </button>
                        </div>
                      </div>

                      {/* Package Info */}
                      {packageData && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <h4 className="font-semibold text-green-800 mb-2">Package Information</h4>
                          <div className="space-y-1 text-sm text-green-700">
                            <p><strong>Package ID:</strong> {packageData.package_id}</p>
                            <p><strong>Order ID:</strong> {packageData.order_id}</p>
                            <p><strong>Type:</strong> {packageData.package_type}</p>
                            <p><strong>Device:</strong> {packageData.device_id}</p>
                            <p><strong>Current Status:</strong> {packageData.current_status}</p>
                            <p><strong>Location:</strong> {packageData.current_location}</p>
                            <p><strong>Checkpoints:</strong> {packageData.checkpoints_count}</p>
                          </div>
                        </div>
                      )}

                      {/* Scan Result */}
                      {scanResult && (
                        <div className={`p-4 rounded-lg border ${
                          scanResult.includes('✅') 
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : 'bg-red-50 border-red-200 text-red-800'
                        }`}>
                          <p className="font-medium">{scanResult}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Checkpoint & ESP32 Data */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">🔧 Checkpoint Data</h3>
                      <button
                        onClick={simulateESP32Reading}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        📡 Update Sensors
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Checkpoint Selection */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Current Checkpoint
                        </label>
                        <select
                          value={selectedCheckpoint}
                          onChange={(e) => setSelectedCheckpoint(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                        >
                          {checkpoints.map(cp => (
                            <option key={cp.id} value={cp.id}>
                              {cp.icon} {cp.name} - {cp.location}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* ESP32 Sensor Data */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Temperature (°C)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={esp32Data.temperature}
                            onChange={(e) => setEsp32Data(prev => ({...prev, temperature: parseFloat(e.target.value)}))}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Battery (%)
                          </label>
                          <input
                            type="number"
                            value={esp32Data.battery_level}
                            onChange={(e) => setEsp32Data(prev => ({...prev, battery_level: parseInt(e.target.value)}))}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Tamper Status
                          </label>
                          <select
                            value={esp32Data.tamper_status}
                            onChange={(e) => setEsp32Data(prev => ({...prev, tamper_status: e.target.value}))}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                          >
                            <option value="secure">🔒 Secure</option>
                            <option value="tampered">⚠️ Tampered</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Shock Detection
                          </label>
                          <select
                            value={esp32Data.shock_detected}
                            onChange={(e) => setEsp32Data(prev => ({...prev, shock_detected: e.target.value === 'true'}))}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                          >
                            <option value="false">✅ No Shock</option>
                            <option value="true">⚠️ Shock Detected</option>
                          </select>
                        </div>
                      </div>

                      {/* Status & Notes */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Checkpoint Status
                        </label>
                        <select
                          value={checkpointStatus}
                          onChange={(e) => setCheckpointStatus(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                        >
                          <option value="passed">✅ Passed</option>
                          <option value="failed">❌ Failed</option>
                          <option value="pending">⏳ Pending</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Notes (Optional)
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                          rows={3}
                          placeholder="Add any notes about this checkpoint..."
                        />
                      </div>

                      {/* Submit Button */}
                      <button
                        onClick={handleCheckpointScan}
                        disabled={!packageData || isSubmitting}
                        className="w-full py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? 'Recording...' : 'Record Checkpoint Scan'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Package List Tab */}
            {activeTab === 'packages' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-800">Package Management</h3>
                  <button
                    onClick={loadPackages}
                    disabled={isLoading}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Loading...' : '🔄 Refresh'}
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
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {packages.map((pkg) => (
                        <tr key={pkg.package_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{pkg.package_id}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{pkg.order_id}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{pkg.package_type}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              pkg.current_status === 'delivered' ? 'bg-green-100 text-green-800' :
                              pkg.current_status === 'at_checkpoint' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {pkg.current_status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{pkg.current_location}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{pkg.checkpoints_count}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(pkg.updated_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {packages.length === 0 && !isLoading && (
                    <div className="text-center py-8 text-gray-500">
                      No packages found
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Checkpoint Map Tab */}
            {activeTab === 'checkpoints' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-6">Checkpoint Network</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {checkpoints.map((checkpoint, index) => (
                    <div key={checkpoint.id} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">{checkpoint.icon}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">{checkpoint.name}</h4>
                          <p className="text-sm text-gray-600">{checkpoint.id}</p>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 mb-3">{checkpoint.location}</p>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Sequence: {index + 1}</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Active
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeliveryDashboard;
