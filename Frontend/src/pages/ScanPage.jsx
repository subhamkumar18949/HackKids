import React, { useState, useEffect } from 'react';

function ScanPage() {
  const [scanResult, setScanResult] = useState(null);
  const [apiStatus, setApiStatus] = useState("Connecting to API...");
  const [isScanning, setIsScanning] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [packageType, setPackageType] = useState("food");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/")
      .then((res) => res.json())
      .then((data) => setApiStatus(`${data.message}`))
      .catch(() =>
        setApiStatus("Could not connect to API. Is it running?")
      );
  }, []);

  const handleScan = async () => {
    setIsScanning(true);
    setScanResult(null);
    
    // Simulate scanning delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Demo scenarios based on package type
    const scenarios = {
      food: Math.random() > 0.7 ? {
        status: "VIOLATION",
        type: "TEMPERATURE",
        details: "Temperature exceeded 8°C for 12 minutes",
        timestamp: "2025-10-30T18:15:00Z",
        sealId: "FOOD_001"
      } : {
        status: "SAFE",
        details: "Package maintained safe temperature throughout delivery",
        timestamp: "2025-10-30T18:15:00Z",
        sealId: "FOOD_001"
      },
      medical: Math.random() > 0.8 ? {
        status: "VIOLATION", 
        type: "TAMPER",
        details: "Seal was broken at 7:17 PM",
        timestamp: "2025-10-30T19:17:00Z",
        sealId: "MED_001"
      } : {
        status: "SAFE",
        details: "Cold chain maintained, seal intact",
        timestamp: "2025-10-30T18:15:00Z",
        sealId: "MED_001"
      },
      valuable: {
        status: "SAFE",
        details: "High-value package delivered securely",
        timestamp: "2025-10-30T18:15:00Z",
        sealId: "VAL_001"
      }
    };
    
    setScanResult(scenarios[packageType]);
    setIsScanning(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            VeriSeal Scanner
          </h1>
          <p className="text-xl text-gray-600">
            Verify your package security in seconds
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          {/* API Status */}
          <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${
            apiStatus.includes('running') 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className={`w-3 h-3 rounded-full ${
              apiStatus.includes('running') ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}></div>
            <span className={`font-medium ${
              apiStatus.includes('running') ? 'text-green-700' : 'text-red-700'
            }`}>
              {apiStatus.includes('running') ? '✅ Connected to VeriSeal API' : '❌ ' + apiStatus}
            </span>
          </div>

          {/* Package Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Package Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'food', label: 'Food Delivery', emoji: '🍕' },
                { value: 'medical', label: 'Medical', emoji: '💊' },
                { value: 'valuable', label: 'High-Value', emoji: '💎' }
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => setPackageType(type.value)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    packageType === type.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{type.emoji}</div>
                  <div className="text-sm font-medium">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Demo Mode Toggle */}
          <div className="flex items-center gap-3 mb-8 p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="demo-mode"
              checked={demoMode}
              onChange={(e) => setDemoMode(e.target.checked)}
              className="w-4 h-4 text-blue-600"
            />
            <label htmlFor="demo-mode" className="text-sm text-gray-600">
              Demo Mode (Simulate ESP32 device)
            </label>
          </div>

          {/* Scan Button */}
          <div className="text-center mb-6">
            <button
              onClick={handleScan}
              disabled={isScanning}
              className={`relative px-12 py-6 text-xl font-bold rounded-2xl shadow-lg transform transition-all duration-200 ${
                isScanning
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:scale-105 text-white'
              }`}
            >
              <div className="flex items-center gap-4">
                {isScanning ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    Scanning...
                  </>
                ) : (
                  <>
                    <span className="text-2xl">📡</span>
                    Scan for VeriSeal
                  </>
                )}
              </div>
            </button>
          </div>

          {/* Scanning Animation */}
          {isScanning && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-3 text-blue-600 bg-blue-50 px-6 py-3 rounded-full">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="font-medium">Searching for nearby seals...</span>
              </div>
            </div>
          )}

          {/* Scan Results */}
          {scanResult && (
            <div className={`p-6 rounded-xl border-2 ${
              scanResult.status === 'SAFE'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  scanResult.status === 'SAFE' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <span className="text-2xl">
                    {scanResult.status === 'SAFE' ? '✅' : '⚠️'}
                  </span>
                </div>
                <div>
                  <h3 className={`text-2xl font-bold ${
                    scanResult.status === 'SAFE' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {scanResult.status === 'SAFE' ? 'Package Verified Safe!' : 'Security Violation Detected!'}
                  </h3>
                  <p className="text-gray-600">Seal ID: {scanResult.sealId}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <span className="font-medium">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    scanResult.status === 'SAFE' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {scanResult.status}
                  </span>
                </div>
                
                {scanResult.type && (
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="font-medium">Violation Type:</span>
                    <span className="text-red-600 font-medium">{scanResult.type}</span>
                  </div>
                )}
                
                <div className="p-3 bg-white rounded-lg">
                  <span className="font-medium block mb-1">Details:</span>
                  <p className="text-gray-700">{scanResult.details}</p>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <span className="font-medium">Last Updated:</span>
                  <span className="text-gray-600">
                    {new Date(scanResult.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  Share Report
                </button>
                <button className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                  Contact Support
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-3">How it works:</h3>
          <div className="space-y-2 text-gray-600">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
              <span>Select your package type above</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
              <span>Tap "Scan for VeriSeal" to connect via Bluetooth</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
              <span>Get instant verification of package integrity</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScanPage;