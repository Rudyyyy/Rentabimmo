import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { InvestmentProvider } from './contexts/InvestmentContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PropertyForm from './components/PropertyForm';
import { GlobalProfitability } from './pages/GlobalProfitability';
import Analysis from './pages/Analysis';
// TODO: V2 - Réactiver le chatbot
// import InvestmentAssistant from './components/InvestmentAssistant';

function App() {
  return (
    <Router>
      <AuthProvider>
        <InvestmentProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/property/new"
              element={
                <ProtectedRoute>
                  <PropertyForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/property/:id"
              element={
                <ProtectedRoute>
                  <PropertyForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profitability"
              element={
                <ProtectedRoute>
                  <GlobalProfitability />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analysis"
              element={
                <ProtectedRoute>
                  <Analysis />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Login />} />
          </Routes>
          
          {/* TODO: V2 - Réactiver le chatbot */}
          {/* Assistant d'investissement disponible sur toutes les pages */}
          {/* <InvestmentAssistant /> */}
        </InvestmentProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;