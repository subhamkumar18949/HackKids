import React, { useState, useEffect } from "react";

function Dashboard() {
  const [seals, setSeals] = useState([]);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [stats, setStats] = useState({ safe: 0, violations: 0, inTransit: 0 });

  // Mock data for demo purposes
  const mockSeals = [
    {
      seal_id: "FOOD_001",
      status: "SAFE",
      type: "Food Delivery",
      location: "Downtown Restaurant",
      last_updated: new Date(Date.now() - 5 * 60000).toISOString(),
      temperature: "4.2°C",
      battery: 85
    },
    {
      seal_id: "MED_002", 
      status: "VIOLATION",
      type: "Medical Supplies",
      location: "City Hospital",
      last_updated: new Date(Date.now() - 15 * 60000).toISOString(),
      violation_type: "TAMPER",
      temperature: "2.1°C",
      battery: 72
    },
    {
      seal_id: "VAL_003",
      status: "IN_TRANSIT",
      type: "High-Value Item",
      location: "En Route",
      last_updated: new Date(Date.now() - 2 * 60000).toISOString(),
      temperature: "22.5°C",
      battery: 91
    },
    {
      seal_id: "FOOD_004",
      status: "VIOLATION",
      type: "Food Delivery",
      location: "Mall Food Court",
      last_updated: new Date(Date.now() - 8 * 60000).toISOString(),
      violation_type: "TEMPERATURE",
      temperature: "12.8°C",
      battery: 67
    },
    {
      seal_id: "MED_005",
      status: "SAFE",
      type: "Medical Supplies",
      location: "Pharmacy Chain",
      last_updated: new Date(Date.now() - 1 * 60000).toISOString(),
      temperature: "3.7°C",
      battery: 94
    }
  ];

  useEffect(() => {
    // Simulate fetching data
    const fetchData = () => {
      try {
        // Use mock data for demo
        setSeals(mockSeals);
        
        // Calculate stats
        const safe = mockSeals.filter(s => s.status === 'SAFE').length;
        const violations = mockSeals.filter(s => s.status === 'VIOLATION').length;
        const inTransit = mockSeals.filter(s => s.status === 'IN_TRANSIT').length;
        
        setStats({ safe, violations, inTransit });
        setLastUpdate(new Date());
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'SAFE': return 'text-green-600 bg-green-100';
      case 'VIOLATION': return 'text-red-600 bg-red-100';
      case 'IN_TRANSIT': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'SAFE': return '✅';
      case 'VIOLATION': return '⚠️';
      case 'IN_TRANSIT': return '🚚';
      default: return '❓';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                VeriSeal Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Real-time monitoring of all seal deployments
              </p>
            </div>
          </div>
          
          {/* Last Update Indicator */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
            <span className="mx-2">•</span>
            <span>Auto-refresh every 10 seconds</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600">{stats.safe}</p>
                <p className="text-gray-600 font-medium">Safe Deliveries</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-red-600">{stats.violations}</p>
                <p className="text-gray-600 font-medium">Violations</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🚚</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-600">{stats.inTransit}</p>
                <p className="text-gray-600 font-medium">In Transit</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📦</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-600">{seals.length}</p>
                <p className="text-gray-600 font-medium">Total Seals</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">❌</span>
              <div>
                <p className="font-semibold text-red-800">Connection Error</p>
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Seals Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Live Seal Status</h2>
            <p className="text-gray-600">Monitor all active seals in real-time</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Seal ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Location</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Temperature</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Battery</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Last Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {seals.length > 0 ? (
                  seals.map((seal, index) => (
                    <tr key={seal.seal_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-mono text-sm font-semibold text-gray-800">
                          {seal.seal_id}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getStatusIcon(seal.status)}</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(seal.status)}`}>
                            {seal.status}
                          </span>
                          {seal.violation_type && (
                            <span className="text-xs text-red-600 font-medium">
                              ({seal.violation_type})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {seal.type}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {seal.location}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-medium ${
                          seal.status === 'VIOLATION' && seal.violation_type === 'TEMPERATURE'
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}>
                          {seal.temperature}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                seal.battery > 80 ? 'bg-green-500' :
                                seal.battery > 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${seal.battery}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">{seal.battery}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(seal.last_updated).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-4xl">📦</span>
                        <p className="text-gray-500 font-medium">No seal data available</p>
                        <p className="text-sm text-gray-400">Seals will appear here once deployed</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <span className="text-lg">✅</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">FOOD_001 delivered safely</p>
                <p className="text-xs text-gray-500">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
              <span className="text-lg">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">Temperature violation detected on MED_002</p>
                <p className="text-xs text-gray-500">8 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <span className="text-lg">🚚</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">VAL_003 started delivery</p>
                <p className="text-xs text-gray-500">15 minutes ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;