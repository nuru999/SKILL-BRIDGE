import { useCallback, useEffect, useState } from 'react';
import api, { day, errMsg, kes } from '../api';

export default function TutorDashboard() {
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [p, b, e, o] = await Promise.all([
      api.get('/tutors/me/profile'), api.get('/bookings/mine'), api.get('/tutors/me/earnings'), api.get('/payouts/mine'),
    ]);
    setProfile({ ...p.data, subjectsText: p.data.subjects.join(', ') });
    setBookings(b.data); setEarnings(e.data); setPayouts(o.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, ok) => {
    setMsg('');
    try { await fn(); if (ok) setMsg(ok); await load(); } catch (e) { setMsg(errMsg(e)); }
  };
  const set = (k) => (e) => setProfile({ ...profile, [k]: e.target.value });
  const save = (e) => {
    e.preventDefault();
    run(() => api.put('/tutors/me/profile', { ...profile, subjects: profile.subjectsText.split(',') }), 'Profile saved');
  };
  const act = (id, status) => run(() => api.patch(`/bookings/${id}/status`, { status }));

  if (!profile || !earnings) return <p className="muted pad">Loading…</p>;

  return (
    <div className="page">
      <h1>My tutoring</h1>
      {msg && <p className="notice">{msg}</p>}
      {!profile.isVerified && <p className="notice">Your profile is waiting for admin verification. Students can't find you until it's approved.</p>}

      <section className="stats">
        <div><span>Available to withdraw</span><strong>{kes(earnings.walletBalance)}</strong></div>
        <div><span>Held until sessions finish</span><strong>{kes(earnings.pendingRelease)}</strong></div>
        <div><span>Rating</span><strong>{profile.reviewCount ? `★ ${profile.avgRating}` : 'New'}</strong></div>
      </section>

      <h2>Booking requests</h2>
      {!bookings.length && <p className="muted">No bookings yet.</p>}
      {bookings.map((b) => (
        <article key={b._id} className="row-card">
          <div>
            <h3>{b.subject} with {b.student.name}</h3>
            <p className="muted">{day(b.date)} at {b.startTime} · {b.duration}h · {b.location}</p>
            <p><strong>{kes(b.amount)}</strong></p>
          </div>
          <div className="actions">
            <span className={`status ${b.status}`}>{b.status}</span>
            {b.status === 'pending' && <>
              <button className="btn small" onClick={() => act(b._id, 'accepted')}>Accept</button>
              <button className="btn ghost small" onClick={() => act(b._id, 'declined')}>Decline</button>
            </>}
            {b.status === 'paid' && <button className="btn small" onClick={() => act(b._id, 'completed')}>Mark session completed</button>}
          </div>
        </article>
      ))}

      <h2>Earnings</h2>
      <form className="inline-form" onSubmit={(e) => { e.preventDefault(); run(() => api.post('/payouts', { amount }), 'Payout requested'); setAmount(''); }}>
        <input type="number" min="1" placeholder="Amount in KES" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <button className="btn small">Request payout</button>
      </form>
      <table>
        <thead><tr><th>Session</th><th>Paid</th><th>Commission</th><th>You earn</th><th>Status</th></tr></thead>
        <tbody>
          {earnings.payments.map((p) => (
            <tr key={p._id}>
              <td>{p.booking?.subject} · {p.booking && day(p.booking.date)}</td>
              <td>{kes(p.amount)}</td><td>−{kes(p.commission)}</td><td><strong>{kes(p.tutorEarning)}</strong></td>
              <td><span className={`status ${p.status}`}>{p.status === 'held' ? 'held' : 'in wallet'}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      {payouts.length > 0 && <>
        <h3>Payout requests</h3>
        {payouts.map((p) => <p key={p._id}>{kes(p.amount)} <span className={`status ${p.status}`}>{p.status}</span></p>)}
      </>}

      <h2>My profile</h2>
      <form className="panel" onSubmit={save}>
        <label>Subjects (comma separated)<input value={profile.subjectsText} onChange={set('subjectsText')} placeholder="Calculus, Statistics" /></label>
        <label>Rate per hour (KES)<input type="number" min="0" value={profile.hourlyRate} onChange={set('hourlyRate')} /></label>
        <label>Usual meeting place<input value={profile.location} onChange={set('location')} /></label>
        <label>Availability<input value={profile.availability} onChange={set('availability')} placeholder="Weekdays after 4pm" /></label>
        <label>About you<textarea rows="3" value={profile.bio} onChange={set('bio')} /></label>
        <button className="btn">Save profile</button>
      </form>
    </div>
  );
}
