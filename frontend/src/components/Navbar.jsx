import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate('/')}>EBID</div>

      <div className="navbar-nav">
        {user ? (
          <>
            <button
              id="nav-auctions-btn"
              className="nav-btn nav-btn-ghost"
              onClick={() => navigate('/')}
            >
              Auctions
            </button>
            <button
              id="nav-wallet-btn"
              className="nav-btn nav-btn-ghost"
              onClick={() => navigate('/wallet')}
            >
              Wallet
            </button>
            {user.role === 'SELLER' && (
              <button
                id="nav-create-btn"
                className="nav-btn nav-btn-ghost"
                onClick={() => navigate('/create-auction')}
              >
                + New Auction
              </button>
            )}
            <span className={`nav-role-badge role-${user.role}`}>{user.role}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {user.username}
            </span>
            <button
              id="nav-logout-btn"
              className="nav-btn nav-btn-ghost"
              onClick={handleLogout}
            >
              Sign Out
            </button>
          </>
        ) : (
          <button
            id="nav-login-btn"
            className="nav-btn nav-btn-primary"
            onClick={() => navigate('/auth')}
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
