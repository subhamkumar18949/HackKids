import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AuthForm from './pages/AuthForm'
import ReceiverScanner from './pages/ReceiverScanner'
import ScanPage from './pages/ScanPage'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* Auth routes */}
        <Route path="/auth/:role" element={<AuthForm />} />
        
        {/* Role-specific dashboard placeholders */}
        <Route path="/sender/dashboard" element={
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-blue-800 mb-4">📦 Sender Dashboard</h1>
              <p className="text-blue-600">Create packages, generate QR codes, manage deliveries</p>
            </div>
          </div>
        } />
        
        <Route path="/receiver/scanner" element={<ReceiverScanner />} />
        
        <Route path="/delivery/dashboard" element={
          <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-orange-800 mb-4">🚚 Delivery Dashboard</h1>
              <p className="text-orange-600">Manage routes, update delivery status, track packages</p>
            </div>
          </div>
        } />
      </Routes>
    </div>
  )
}

export default App