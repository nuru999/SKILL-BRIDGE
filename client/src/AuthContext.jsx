import { createContext, useContext, useEffect, useState } from 'react';
import api from './api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem('sb_token')) { setReady(true); return; }
    api.get('/auth/me')
      .then((r) => setUser(r.data))
      .catch(() => sessionStorage.removeItem('sb_token'))
      .finally(() => setReady(true));
  }, []);

  const save = ({ token, user }) => { sessionStorage.setItem('sb_token', token); setUser(user); return user; };
  const login = async (email, password) => save((await api.post('/auth/login', { email, password })).data);
  const register = async (data) => save((await api.post('/auth/register', data)).data);
  const logout = () => { sessionStorage.removeItem('sb_token'); setUser(null); };

  return <Ctx.Provider value={{ user, ready, login, register, logout }}>{children}</Ctx.Provider>;
}
