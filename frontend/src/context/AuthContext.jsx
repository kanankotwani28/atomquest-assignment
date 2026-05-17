import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

// Why context: user info (who is logged in, what role)
// is needed by many components across the app.
// Instead of passing it as props through every level (prop drilling),
// context makes it available anywhere with one line.
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while checking existing session

  // On app load: check if a token exists and is still valid
  // This restores the session after a page refresh
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => {
          // Token expired or invalid — clear it
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data.user; // return user so caller knows the role to redirect
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook — components call useAuth() instead of useContext(AuthContext)
// Cleaner and gives a helpful error if used outside the provider
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};