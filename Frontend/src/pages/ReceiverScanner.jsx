import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function ReceiverScanner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // User state
  const [user, setUser] = useState(null);
  
  // Scanner state
  const [scanResult, setScanResult] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [manualToken, setManualToken] = useState('');
  
  // Authentication state
  const [token, setToken] = useState(null);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Package data state
  const [packageData, setPackageData] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      // Redirect to login if not authenticated
      navigate('/auth/receiver?mode=login');
      return;
    }

    // Check for token in URL (from QR code scan)
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
      verifyToken(urlToken);
    }

    // Load scan history
    const history = localStorage.getItem('scan_history');
    if (history) {
      setScanHistory(JSON.parse(history));
    }
  }, [searchParams, navigate]);

  const verifyToken = async (tokenValue) => {
    try {
      setIsVerifying(true);
      const response = await fetch(`http://127.0.0.1:8000/receiver/package/${tokenValue}`);
      const data = await response.json();
      
      if (response.ok) {
        setPackageData(data);
        setShowPinEntry(true);
      } else {
        setScanResult('❌ Invalid QR code or token');
      }
    } catch (error) {
      setScanResult('❌ Error verifying token');
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (pin.length !== 6) {
      setPinError('PIN must be 6 digits');
      return;
    }

    setIsVerifying(true);
    setPinError('');

    try {
      const response = await fetch('http://127.0.0.1:8000/receiver/verify-package', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          package_token: token,
          pin: pin
        })
      });

      const data = await response.json();

      if (response.ok) {
        setIsAuthenticated(true);
        setShowPinEntry(false);
        setPackageData(data.package);
        
        // Show journey summary
        const journey = data.package.journey;
        const tamperStatus = data.package.is_tampered ? '🚨 TAMPERED' : '✅ SAFE';
        setScanResult(`✅ Package Verified!\n\nStatus: ${tamperStatus}\nTotal Scans: ${journey.total_scans}\nTamper Events: ${journey.tamper_count}`);
        
        // Add to scan history
        const newScan = {
          id: Date.now(),
          token: token,
          timestamp: new Date().toISOString(),
          status: 'verified',
          package_id: data.package.package_id
        };
        const updatedHistory = [newScan, ...scanHistory.slice(0, 4)]; // Keep last 5
        setScanHistory(updatedHistory);
        localStorage.setItem('scan_history', JSON.stringify(updatedHistory));
        
      } else {
        setPinError(data.detail || 'Incorrect PIN');
      }
    } catch (error) {
      setPinError('Error verifying PIN');
    } finally {
      setIsVerifying(false);
    }
  };

  const fetchPackageStatus = async (tokenValue) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/seal-status/${tokenValue}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        const statusMessage = data.status === 'SAFE' 
          ? `✅ Package Status: SAFE\nTemperature: ${data.current_temp}°C\nBattery: ${data.battery_level}%`
          : `⚠️ VIOLATION DETECTED\nType: ${data.violation_type}\nTemperature: ${data.current_temp}°C`;
        
        setScanResult(statusMessage);
      }
    } catch (error) {
      setScanResult('❌ Error fetching package status');
    }
  };

  const handleQRScan = async () => {
    setIsScanning(true);
    
    // Simulate QR scanning (in real app, use camera API)
    setTimeout(() => {
      const mockToken = 'demo_token_' + Date.now();
      setToken(mockToken);
      setManualToken(mockToken);
      verifyToken(mockToken);
      setIsScanning(false);
    }, 2000);
  };

  const handleManualTokenSubmit = (e) => {
    e.preventDefault();
    if (manualToken.trim()) {
      setToken(manualToken.trim());
      verifyToken(manualToken.trim());
    }
  };

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(value);
    setPinError('');
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const resetScan = () => {
    setToken(null);
    setShowPinEntry(false);
    setPin('');
    setPinError('');
    setIsAuthenticated(false);
    setPackageData(null);
    setScanResult('');
    setManualToken('');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & User Info */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">📱</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  Welcome, {user.username}
                </h1>
                <p className="text-sm text-gray-500">Package Scanner</p>
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

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Main Scanner Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          {/* Scanner Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-4">
              <span className="text-3xl">🔍</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Package Scanner
            </h2>
            <p className="text-gray-600">
              Scan QR code to verify your package security
            </p>
          </div>

          {/* Token Display */}
          {token && packageData && (
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <h3 className="font-semibold text-purple-800 mb-2">📦 Package Information</h3>
              <div className="space-y-1 text-sm text-purple-700">
                <p><strong>Seal ID:</strong> {packageData.seal_id}</p>
                <p><strong>Package Type:</strong> {packageData.package_type}</p>
                <p><strong>Status:</strong> {isAuthenticated ? '🔓 Authenticated' : '🔒 Requires PIN'}</p>
              </div>
            </div>
          )}

          {/* PIN Entry Form */}
          {showPinEntry && (
            <div className="mb-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔑</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Enter PIN</h3>
                <p className="text-gray-600">Enter the 6-digit PIN sent to your phone</p>
              </div>

              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={pin}
                    onChange={handlePinChange}
                    placeholder="Enter 6-digit PIN"
                    className="w-full p-4 text-center text-2xl font-mono border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none"
                    maxLength={6}
                    autoFocus
                  />
                  {pinError && (
                    <p className="text-red-600 text-sm mt-2 text-center">{pinError}</p>
                  )}
                </div>
                
                <button
                  type="submit"
                  disabled={pin.length !== 6 || isVerifying}
                  className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
                    pin.length === 6 && !isVerifying
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isVerifying ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Verifying...
                    </div>
                  ) : (
                    'Verify PIN'
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Scanner Interface */}
          {!token && (
            <div className="space-y-6">
              {/* QR Scanner Button */}
              <div className="text-center">
                <button
                  onClick={handleQRScan}
                  disabled={isScanning}
                  className="px-12 py-6 text-xl font-bold rounded-2xl shadow-lg transform transition-all duration-200 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 hover:scale-105 text-white disabled:opacity-50"
                >
                  {isScanning ? (
                    <div className="flex items-center gap-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      Scanning...
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">📷</span>
                      Scan QR Code
                    </div>
                  )}
                </button>
              </div>

              {/* Manual Token Entry */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                  Or enter token manually
                </h3>
                <form onSubmit={handleManualTokenSubmit} className="flex gap-3">
                  <input
                    type="text"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Enter package token"
                    className="flex-1 p-3 border border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors"
                  >
                    Verify
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Scan Results */}
          {scanResult && !isAuthenticated && (
            <div className={`p-6 rounded-xl border-2 mb-6 ${
              scanResult.includes('✅') || scanResult.includes('SAFE')
                ? 'bg-green-50 border-green-200'
                : scanResult.includes('⚠️') || scanResult.includes('VIOLATION')
                ? 'bg-red-50 border-red-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <pre className="font-mono text-sm whitespace-pre-wrap">{scanResult}</pre>
            </div>
          )}

          {/* Journey Display - After Authentication */}
          {isAuthenticated && packageData && (
            <div className="space-y-6">
              {/* Package Status Header */}
              <div className={`p-6 rounded-xl border-2 ${
                packageData.is_tampered 
                  ? 'bg-red-50 border-red-300'
                  : 'bg-green-50 border-green-300'
              }`}>
                <div className="text-center">
                  <div className="text-6xl mb-4">
                    {packageData.is_tampered ? '🚨' : '✅'}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">
                    {packageData.is_tampered ? 'Package Tampered!' : 'Package Verified!'}
                  </h3>
                  <div className="space-y-1 text-lg">
                    <p><strong>Package ID:</strong> {packageData.package_id}</p>
                    <p><strong>Order ID:</strong> {packageData.order_id}</p>
                    <p><strong>Type:</strong> {packageData.package_type}</p>
                    <p><strong>Status:</strong> {packageData.current_status}</p>
                  </div>
                </div>
              </div>

              {/* Journey Timeline */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span>📦</span> Package Journey
                </h3>
                
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Checkpoints:</span>
                      <span className="font-bold ml-2">{packageData.journey?.total_scans || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Tamper Events:</span>
                      <span className={`font-bold ml-2 ${packageData.journey?.tamper_count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {packageData.journey?.tamper_count || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Checkpoint Logs */}
                {packageData.journey?.scan_logs && packageData.journey.scan_logs.length > 0 ? (
                  <div className="space-y-4">
                    {packageData.journey.scan_logs.map((log, index) => (
                      <div key={index} className="border-l-4 border-purple-500 pl-4 py-3 bg-gray-50 rounded-r-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-bold text-lg text-gray-800">
                              {log.action === 'proceed' ? '✅' : '🚨'} {log.name || log.checkpoint_id}
                            </h4>
                            <p className="text-sm text-gray-600">📍 {log.location}</p>
                            <p className="text-xs text-gray-500">
                              ⏰ {new Date(log.scanned_at).toLocaleString()}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            log.action === 'proceed' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {log.action === 'proceed' ? 'PROCEED' : 'RETURN'}
                          </span>
                        </div>

                        {/* ESP32 Sensor Data */}
                        {log.esp32_data && (
                          <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                            <h5 className="font-semibold text-sm text-gray-700 mb-2">📊 Sensor Readings:</h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center gap-1">
                                <span>🌡️</span>
                                <span className="text-gray-600">Temp:</span>
                                <span className="font-bold">{log.esp32_data.temperature}°C</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span>💧</span>
                                <span className="text-gray-600">Humidity:</span>
                                <span className="font-bold">{log.esp32_data.humidity}%</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span>🔋</span>
                                <span className="text-gray-600">Battery:</span>
                                <span className="font-bold">{log.esp32_data.battery_level}%</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span>🔒</span>
                                <span className="text-gray-600">Status:</span>
                                <span className={`font-bold ${
                                  log.esp32_data.tamper_status === 'secure' 
                                    ? 'text-green-600' 
                                    : 'text-red-600'
                                }`}>
                                  {log.esp32_data.tamper_status === 'secure' ? 'Secure' : 'Tampered'}
                                </span>
                              </div>
                            </div>
                            {log.esp32_data.gps_location && (
                              <div className="mt-2 text-xs text-gray-600">
                                📍 GPS: {log.esp32_data.gps_location}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Notes */}
                        {log.notes && (
                          <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                            <p className="text-xs text-gray-700">
                              <strong>📝 Notes:</strong> {log.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No checkpoint scans recorded yet.</p>
                  </div>
                )}

                {/* Tamper Events */}
                {packageData.journey?.tamper_events && packageData.journey.tamper_events.length > 0 && (
                  <div className="mt-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                    <h4 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                      <span>⚠️</span> Tamper Events Detected
                    </h4>
                    <div className="space-y-2">
                      {packageData.journey.tamper_events.map((event, index) => (
                        <div key={index} className="p-3 bg-white rounded border border-red-200">
                          <p className="text-sm font-semibold text-red-800">
                            {event.tamper_type} - {new Date(event.timestamp).toLocaleString()}
                          </p>
                          {event.sensor_data && (
                            <p className="text-xs text-gray-600 mt-1">
                              Data: {JSON.stringify(event.sensor_data)}
                            </p>
                          )}
                          {event.gps_location && (
                            <p className="text-xs text-gray-600">
                              📍 Location: {event.gps_location}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Okay Button */}
              <div className="text-center">
                <button
                  onClick={resetScan}
                  className="px-12 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
                >
                  ✓ Okay
                </button>
              </div>
            </div>
          )}

          {/* Reset Button - Only show if not authenticated */}
          {token && !isAuthenticated && (
            <div className="text-center">
              <button
                onClick={resetScan}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Scans</h3>
            <div className="space-y-3">
              {scanHistory.map((scan) => (
                <div key={scan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">
                      {scan.package_type || 'Package'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(scan.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    scan.status === 'verified' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {scan.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReceiverScanner;
