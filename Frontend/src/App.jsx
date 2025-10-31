import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import ScanPage from './pages/ScanPage'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* Auth routes will be added next */}
        <Route path="/auth/:role" element={
          <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">Authentication</h1>
              <p className="text-gray-600">Auth form coming soon</p>
            </div>
          </div>
        } />
      </Routes>
    </div>
  )
}

export default App