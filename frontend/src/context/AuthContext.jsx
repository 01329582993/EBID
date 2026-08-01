import React, { createContext, useContext, useState, useEffect } from 'react';
import { validateToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ebid_token');
    if (token) {
      validateToken()
        .then(res => setUser(res.data))
        .catch(() => localStorage.removeItem('ebid_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loginUser = (data) => {
    localStorage.setItem('ebid_token', data.token);
    setUser({
      userId: data.userId,
      username: data.username,
      email: data.email,
      role: data.role,
    });
  };

  const logout = () => {
    localStorage.removeItem('ebid_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
