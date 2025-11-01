import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';

function DeliveryDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('scanner');
  
  // Scanner state
  const [scanResult, setScanResult] = useState('');
  const [packageToken, setPackageToken] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [packageData, setPackageData] = useState(null);
  const [qrData, setQrData] = useState(null);  // ESP32 data from QR code
  const [showUploadButton, setShowUploadButton] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const scannerRef = useRef(null);
  const qrScannerRef = useRef(null);
  
  // Checkpoint state
  const [selectedCheckpoint, setSelectedCheckpoint] = useState('CP001');
  const [esp32Data, setEsp32Data] = useState(null); // Start with null - only show after QR scan
  const [checkpointStatus, setCheckpointStatus] = useState('passed');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Packages state
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Checkpoints configuration
  const checkpoints = [
    { id: 'CP001', name: 'Warehouse 1', location: 'Warehouse 1', icon: '🏭' },
    { id: 'CP002', name: 'Warehouse 2', location: 'Warehouse 2', icon: '🏢' },
    { id: 'CP003', name: 'Warehouse 3', location: 'Warehouse 3', icon: '🚛' },
    { id: 'CP004', name: 'Warehouse 4', location: 'Warehouse 4', icon: '🏪' },
    { id: 'CP005', name: 'Warehouse 5', location: 'Warehouse 5', icon: '🚚' },
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
      setScanResult('❌ Please scan a QR code or enter a package token');
      return;
    }

    setIsScanning(true);
    setScanResult('🔍 Validating package...');
    setShowUploadButton(false);

    try {
      // Try to parse as JSON (QR code with ESP32 data)
      let parsedQR = null;
      try {
        parsedQR = JSON.parse(packageToken);
      } catch (e) {
        // Not JSON, treat as simple token
        parsedQR = { package_token: packageToken };
      }

      // Extract package token and sensor data from QR
      let token = parsedQR.package_token || packageToken;
      
      // If QR contains sensor data, set it
      if (parsedQR.tamper_status || parsedQR.temperature || parsedQR.acceleration) {
        console.log('📊 ESP32 sensor data found in QR:', parsedQR);
        setEsp32Data({
          temperature: parsedQR.temperature || 25.0,
          humidity: parsedQR.humidity || 45,
          tamper_status: parsedQR.tamper_status || 'secure',
          battery_level: parsedQR.battery_level || 85,
          shock_detected: parsedQR.shock_detected || false,
          gps_location: parsedQR.gps_location || '',
          loop_connected: parsedQR.loop_connected !== undefined ? parsedQR.loop_connected : true,
          acceleration: parsedQR.acceleration || 0.0
        });
        setQrData(parsedQR);
      }
      
      // FOR DEMO: If scanned data doesn't look like a package token, use demo token
      if (!token.includes('demo_token') && !token.includes('PKG') && !token.includes('_')) {
        console.log('Using demo token for:', token);
        token = 'demo_token_electronics_001';  // Default demo package
        setPackageToken(token);  // Save the demo token
        setScanResult('🔍 Using demo package for validation...');
      }

      // Call backend to validate package
      const response = await fetch('http://127.0.0.1:8000/delivery/scan-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ package_token: token })
      });

      if (response.ok) {
        const data = await response.json();
        setPackageData(data);
        
        // Show success message
        setScanResult(`✅ ${data.message}\n\n📦 Package: ${data.package_id}\n\n💡 Review sensor readings below and click Upload.`);
        setShowUploadButton(true);
      } else {
        const error = await response.json();
        setScanResult(`❌ ${error.detail || 'Package not found'}`);
        setPackageData(null);
        setShowUploadButton(false);
      }
    } catch (error) {
      setScanResult('❌ Error scanning QR code');
      setPackageData(null);
      setShowUploadButton(false);
    } finally {
      setIsScanning(false);
    }
  };

  const handleUploadScan = async (decision) => {
    if (!packageData) {
      setScanResult('❌ Please scan a package first');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get package token - use demo token if needed
      let token = qrData?.package_token || packageToken;
      
      // Ensure we have a valid token
      if (!token || (!token.includes('demo_token') && !token.includes('PKG'))) {
        token = 'demo_token_electronics_001';
      }

      const response = await fetch('http://127.0.0.1:8000/delivery/upload-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          package_token: token,
          checkpoint_id: selectedCheckpoint,
          esp32_data: esp32Data,
          notes: notes,
          decision: decision  // "proceed" or "return"
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (decision === 'proceed') {
          setScanResult(`✅ Uploaded Successfully!\n\n📍 Checkpoint: ${selectedCheckpoint}\n📦 Package: ${data.package_id}\n✅ Action: Proceed to next checkpoint\n⏰ ${new Date(data.timestamp).toLocaleString()}`);
        } else {
          setScanResult(`🚨 Uploaded - Return to Sender\n\n📍 Checkpoint: ${selectedCheckpoint}\n📦 Package: ${data.package_id}\n❌ Action: Return to sender\n⏰ ${new Date(data.timestamp).toLocaleString()}`);
        }
        
        // Reset form
        setPackageData(null);
        setPackageToken('');
        setQrData(null);
        setNotes('');
        setShowUploadButton(false);
        
        // Reload packages
        loadPackages();
      } else {
        const error = await response.json();
        setScanResult(`❌ ${error.detail || 'Failed to upload scan'}`);
      }
    } catch (error) {
      setScanResult('❌ Error uploading scan data');
      console.error('Upload Error:', error);
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
      gps_location: '19.0760,72.8777',
      loop_connected: Math.random() > 0.1,
      acceleration: (9.5 + Math.random() * 1).toFixed(2)
    });
  };

  const startCameraScanner = () => {
    setShowCamera(true);
    
    // Initialize scanner after a short delay to ensure DOM is ready
    setTimeout(() => {
      if (!qrScannerRef.current) {
        qrScannerRef.current = new Html5QrcodeScanner(
          "qr-reader",
          { 
            fps: 20,  // Increased for faster detection
            qrbox: 250,  // Simplified box size
            aspectRatio: 1.0,
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
            // More aggressive scanning
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true
            },
            // Support all QR code formats
            formatsToSupport: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
          },
          /* verbose= */ false
        );

        qrScannerRef.current.render(onScanSuccess, onScanError);
      }
    }, 200);
  };

  const stopCameraScanner = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.clear().catch(error => {
        console.error("Failed to clear scanner:", error);
      });
      qrScannerRef.current = null;
    }
    setShowCamera(false);
  };

  const onScanSuccess = (decodedText, decodedResult) => {
    console.log("QR Code scanned:", decodedText);
    
    // Stop scanner
    stopCameraScanner();
    
    // Set the scanned text as package token
    setPackageToken(decodedText);
    
    // Show what was scanned - NO AUTO VALIDATION
    setScanResult(`✅ QR Code Scanned Successfully!\n\nData: ${decodedText.substring(0, 100)}${decodedText.length > 100 ? '...' : ''}\n\n👉 Click "Scan" button to validate package.`);
  };

  const onScanError = (errorMessage) => {
    // Ignore errors - they happen frequently during scanning
    // console.log("Scan error:", errorMessage);
  };

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.clear().catch(error => {
          console.error("Failed to clear scanner on unmount:", error);
        });
      }
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & User Info */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-2xl">🚚</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Delivery Hub
                </h1>
                <p className="text-sm text-slate-500">Welcome, {user.username}</p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="border-b border-slate-200">
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
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-linear-to-br from-orange-600 to-red-600 rounded-full mb-4">
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
                      {/* Camera Scanner */}
                      {!showCamera && (
                        <div className="space-y-4">
                          <button
                            onClick={startCameraScanner}
                            className="w-full py-4 bg-linear-to-br from-blue-600 to-indigo-600 text-white rounded-lg font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg flex items-center justify-center gap-3"
                          >
                            <span className="text-2xl">📷</span>
                            Open Camera to Scan QR
                          </button>
                          
                          <div className="text-center text-sm text-gray-500">Or enter manually</div>
                          
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={packageToken}
                              onChange={(e) => setPackageToken(e.target.value)}
                              placeholder="Paste QR JSON or token"
                              className="flex-1 p-3 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                            />
                            <button
                              onClick={handleScanPackage}
                              disabled={isScanning || !packageToken}
                              className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
                            >
                              {isScanning ? 'Scanning...' : 'Scan'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Camera View */}
                      {showCamera && (
                        <div className="space-y-3">
                          <div id="qr-reader" className="w-full"></div>
                          
                          <button
                            onClick={stopCameraScanner}
                            className="w-full py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                          >
                            ❌ Stop Camera
                          </button>
                        </div>
                      )}
                      
                      {/* Package Information */}
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
                          <p className="font-medium whitespace-pre-line">{scanResult}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ESP32 Data & Upload */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">🔧 ESP32 Sensor Data</h3>
                    
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

                      {/* ESP32 Data Display - Only show after QR scan */}
                      {esp32Data ? (
                        <div className="p-4 bg-white border border-gray-300 rounded-lg">
                          <h4 className="font-semibold text-gray-800 mb-3">📊 Sensor Readings</h4>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="p-2 bg-blue-50 rounded">
                              <span className="text-gray-600">🌡️ Temperature:</span>
                              <span className="font-bold ml-2">{esp32Data.temperature}°C</span>
                            </div>
                            <div className="p-2 bg-blue-50 rounded">
                              <span className="text-gray-600">💧 Humidity:</span>
                              <span className="font-bold ml-2">{esp32Data.humidity}%</span>
                            </div>
                            <div className="p-2 bg-blue-50 rounded">
                              <span className="text-gray-600">🔋 Battery:</span>
                              <span className="font-bold ml-2">{esp32Data.battery_level}%</span>
                            </div>
                            <div className="p-2 bg-blue-50 rounded">
                              <span className="text-gray-600">🔒 Tamper:</span>
                              <span className={`font-bold ml-2 ${esp32Data.tamper_status === 'secure' ? 'text-green-600' : 'text-red-600'}`}>
                                {esp32Data.tamper_status === 'secure' ? '✅ Secure' : '⚠️ Tampered'}
                              </span>
                            </div>
                            <div className="p-2 bg-blue-50 rounded">
                              <span className="text-gray-600">🔌 Loop:</span>
                              <span className={`font-bold ml-2 ${esp32Data.loop_connected ? 'text-green-600' : 'text-red-600'}`}>
                                {esp32Data.loop_connected ? '✅ Connected' : '❌ Broken'}
                              </span>
                            </div>
                            <div className="p-2 bg-blue-50 rounded">
                              <span className="text-gray-600">📊 Acceleration:</span>
                              <span className="font-bold ml-2">{esp32Data.acceleration} m/s²</span>
                            </div>
                          </div>
                          {qrData && (
                            <div className="mt-2 text-xs text-green-600">
                              ✅ Data loaded from QR code
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
                          <p className="text-gray-500">📱 Scan a QR code to view sensor readings</p>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Notes (Optional)
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                          rows={3}
                          placeholder="Add any notes about this scan..."
                        />
                      </div>

                      {/* Upload Buttons */}
                      {showUploadButton && (
                        <div className="space-y-3">
                          <button
                            onClick={() => handleUploadScan('proceed')}
                            disabled={isSubmitting}
                            className="w-full py-4 bg-linear-to-br from-green-600 to-green-700 text-white rounded-lg font-bold text-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                          >
                            {isSubmitting ? '⏳ Uploading.......' : '✅ Upload & Proceed'}
                          </button>
                          
                          <button
                            onClick={() => handleUploadScan('return')}
                            disabled={isSubmitting}
                            className="w-full py-4 bg-linear-to-br from-red-600 to-red-700 text-white rounded-lg font-bold text-lg hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                          >
                            {isSubmitting ? '⏳ Uploading...' : '🚨 Upload & Return to Sender'}
                          </button>
                        </div>
                      )}

                      {!showUploadButton && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                          💡 Scan a QR code first to enable upload
                        </div>
                      )}
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
