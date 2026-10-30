import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { errMsg } from '../api';
import { useAuth } from '../AuthContext';

export const home = (role) => ({ student: '/', tutor: '/tutor', admin: '/admin' }[role]);

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try { const u = await login(form.email, form.password); navigate(home(u.role)); }
    catch (err) { setError(errMsg(err)); }
  };

  return (
    <form className="panel narrow" onSubmit={submit}>
      <h1>Log in</h1>
      <label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <label>Password<input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
      {error && <p className="error">{error}</p>}
      <button className="btn">Log in</button>
      <p className="muted">New here? <Link to="/register">Create an account</Link></p>
    </form>
  );
}
