import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { home } from './Login';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'student' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try { const u = await register(form); navigate(home(u.role)); }
    catch (err) { setError(errMsg(err)); }
  };

  return (
    <form className="panel narrow" onSubmit={submit}>
      <h1>Create your account</h1>
      <div className="seg">
        <button type="button" className={form.role === 'student' ? 'on' : ''} onClick={() => setForm({ ...form, role: 'student' })}>I want to learn</button>
        <button type="button" className={form.role === 'tutor' ? 'on' : ''} onClick={() => setForm({ ...form, role: 'tutor' })}>I want to tutor</button>
      </div>
      <label>Full name<input required value={form.name} onChange={set('name')} /></label>
      <label>Email<input type="email" required value={form.email} onChange={set('email')} /></label>
      <label>Phone (M-Pesa number)<input value={form.phone} onChange={set('phone')} placeholder="07XX XXX XXX" /></label>
      <label>Password<input type="password" minLength="6" required value={form.password} onChange={set('password')} /></label>
      {form.role === 'tutor' && <p className="muted">After you sign up, complete your tutor profile. An admin verifies it before you appear in search.</p>}
      {error && <p className="error">{error}</p>}
      <button className="btn">Sign up</button>
      <p className="muted">Already registered? <Link to="/login">Log in</Link></p>
    </form>
  );
}
