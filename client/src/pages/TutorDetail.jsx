import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg, kes } from '../api';
import { useAuth } from '../AuthContext';
import { Stars } from './Tutors';

export default function TutorDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tutor, setTutor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ subject: '', date: '', startTime: '', duration: 1, location: '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    api.get(`/tutors/${id}`).then((r) => { setTutor(r.data); setForm((f) => ({ ...f, subject: r.data.subjects[0] || '', location: r.data.location })); }).catch((e) => setError(errMsg(e)));
    api.get(`/reviews/tutor/${id}`).then((r) => setReviews(r.data)).catch(() => {});
  }, [id]);

  const book = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/bookings', { ...form, tutorProfileId: id });
      navigate('/bookings');
    } catch (err) { setError(errMsg(err)); }
  };

  if (error && !tutor) return <p className="error pad">{error}</p>;
  if (!tutor) return <p className="muted pad">Loading…</p>;

  return (
    <div className="detail">
      <div>
        <h1>{tutor.user.name}</h1>
        <Stars value={tutor.avgRating} count={tutor.reviewCount} />
        <p className="subjects">{tutor.subjects.join(' · ')}</p>
        <p>{tutor.bio}</p>
        <p className="muted">Meets at: {tutor.location || 'to be agreed'}<br />Available: {tutor.availability || 'to be agreed'}</p>

        <h2>Reviews</h2>
        {reviews.map((r) => (
          <blockquote key={r._id}>
            <span className="stars">{'★'.repeat(r.rating)}</span> {r.comment}
            <footer className="muted">{r.student?.name}</footer>
          </blockquote>
        ))}
        {!reviews.length && <p className="muted">No reviews yet.</p>}
      </div>

      <aside className="panel">
        <h2>{kes(tutor.hourlyRate)} <small>per hour</small></h2>
        {user?.role === 'student' ? (
          <form onSubmit={book}>
            <label>Subject<input required value={form.subject} onChange={set('subject')} /></label>
            <label>Date<input required type="date" min={new Date().toISOString().slice(0, 10)} value={form.date} onChange={set('date')} /></label>
            <label>Start time<input required type="time" value={form.startTime} onChange={set('startTime')} /></label>
            <label>Hours<input required type="number" min="1" max="8" value={form.duration} onChange={set('duration')} /></label>
            <label>Meeting place<input required value={form.location} onChange={set('location')} /></label>
            <p className="total">Total: <strong>{kes(tutor.hourlyRate * form.duration)}</strong></p>
            {error && <p className="error">{error}</p>}
            <button className="btn">Request booking</button>
            <p className="muted small-text">You pay only after the tutor accepts.</p>
          </form>
        ) : user ? (
          <p className="muted">Only student accounts can book sessions.</p>
        ) : (
          <p><Link to="/login">Log in</Link> or <Link to="/register">sign up</Link> as a student to book.</p>
        )}
      </aside>
    </div>
  );
}
