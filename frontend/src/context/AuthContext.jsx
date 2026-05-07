import { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (token) {
      client.get('/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // ✅ LOGIN
  const login = async (email, password) => {
    const { data } = await client.post('/auth/login', {
      email,
      password,
    });

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);

    return data.user;
  };

  // ✅ REGISTER (FINAL FIX 🔥)
  const register = async (name, email, password, role) => {
    const { data } = await client.post('/auth/register', {
      name,
      email,
      password,
      role,
    });

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);

    return data.user;
  };

  // ✅ LOGOUT
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);