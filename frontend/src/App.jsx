import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import AuctionDetailPage from './pages/AuctionDetailPage';
import CreateAuctionPage from './pages/CreateAuctionPage';
import WalletPage from './pages/WalletPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" style={{ marginTop: '20vh' }} />;
  return (
    <div className="page-wrapper">
      <Navbar />
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        
        {/* Core Routes */}
        <Route path="/auction/:id" element={<ProtectedRoute><AuctionDetailPage /></ProtectedRoute>} />
        <Route path="/create-auction" element={<ProtectedRoute><CreateAuctionPage /></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />

        {/* Alias / Fallback Routes to ensure seamless navigation */}
        <Route path="/auctions" element={<Navigate to="/" replace />} />
        <Route path="/auctions/:id" element={<ProtectedRoute><AuctionDetailPage /></ProtectedRoute>} />
        <Route path="/auctions/create" element={<ProtectedRoute><CreateAuctionPage /></ProtectedRoute>} />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#16181f',
              color: '#f8fafc',
              border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.875rem',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
  
}