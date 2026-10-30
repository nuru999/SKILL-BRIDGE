import { Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Tutors from './pages/Tutors';
import TutorDetail from './pages/TutorDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import MyBookings from './pages/MyBookings';
import TutorDashboard from './pages/TutorDashboard';
import Admin from './pages/Admin';

function Guard({ role, children }) {
  const { user, ready } = useAuth();
  if (!ready) return <p className="muted pad">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="nav">
      <Link to="/" className="brand">SkillBridge</Link>
      <nav>
        <NavLink to="/">Find a tutor</NavLink>
        {user?.role === 'student' && <NavLink to="/bookings">My bookings</NavLink>}
        {user?.role === 'tutor' && <NavLink to="/tutor">My tutoring</NavLink>}
        {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
        {user ? (
          <button className="link" onClick={() => { logout(); navigate('/'); }}>Log out ({user.name.split(' ')[0]})</button>
        ) : (
          <>
            <NavLink to="/login">Log in</NavLink>
            <Link to="/register" className="btn small">Sign up</Link>
          </>
        )}
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Tutors />} />
          <Route path="/tutors/:id" element={<TutorDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/bookings" element={<Guard role="student"><MyBookings /></Guard>} />
          <Route path="/tutor" element={<Guard role="tutor"><TutorDashboard /></Guard>} />
          <Route path="/admin" element={<Guard role="admin"><Admin /></Guard>} />
          <Route path="*" element={<p className="pad">Page not found.</p>} />
        </Routes>
      </main>
    </>
  );
}
