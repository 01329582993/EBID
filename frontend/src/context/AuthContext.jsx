import React, { createContext, useContext, useState, useEffect } from 'react';
import { validateToken } from '../api';
import {
  AUTH_EVENTS,
  onAuthEvent,
  emitLoginEvent,
  emitLogoutEvent
} from "../utils/authEvents";

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

  // If any request anywhere in the app comes back 401 (token expired,
  // revoked, or invalid), api.js's interceptor broadcasts this event
  // so we can clear the session immediately rather than waiting for
  // the next full page load.
  useEffect(() => {
    const unsubscribe = onAuthEvent(AUTH_EVENTS.TOKEN_EXPIRED, () => {
      localStorage.removeItem('ebid_token');
      setUser(null);
    });
    return unsubscribe;
  }, []);

  const loginUser = (data) => {
    localStorage.setItem('ebid_token', data.token);
    const nextUser = {
      userId: data.userId,
      username: data.username,
      email: data.email,
      role: data.role,
    };
    setUser(nextUser);
    emitLoginEvent(nextUser);
  };

  const logout = () => {
    localStorage.removeItem('ebid_token');
    setUser(null);
    emitLogoutEvent();
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
