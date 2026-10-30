import { useCallback, useEffect, useState } from 'react';
import api, { day, errMsg, kes } from '../api';

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [tutors, setTutors] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [rate, setRate] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [s, t, p, b] = await Promise.all([api.get('/admin/stats'), api.get('/admin/tutors'), api.get('/admin/payouts'), api.get('/admin/bookings')]);
    setStats(s.data); setRate(s.data.commissionRate); setTutors(t.data); setPayouts(p.data); setBookings(b.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, ok) => {
    setMsg('');
    try { await fn(); if (ok) setMsg(ok); await load(); } catch (e) { setMsg(errMsg(e)); }
  };

  if (!stats) return <p className="muted pad">Loading…</p>;
  const cards = [
    ['Commission earned', kes(stats.commissionEarned)], ['Held in escrow', kes(stats.heldInEscrow)], ['Gross paid', kes(stats.grossPaid)],
    ['Students', stats.students], ['Tutors', stats.tutors], ['Completed sessions', stats.completedSessions],
  ];

  return (
    <div className="page">
      <h1>Admin</h1>
      {msg && <p className="notice">{msg}</p>}
      <section className="stats">{cards.map(([l, v]) => <div key={l}><span>{l}</span><strong>{v}</strong></div>)}</section>

      <h2>Commission rate</h2>
      <form className="inline-form" onSubmit={(e) => { e.preventDefault(); run(() => api.put('/admin/commission', { rate }), 'Commission updated for new payments'); }}>
        <input type="number" min="0" max="50" value={rate} onChange={(e) => setRate(e.target.value)} /> <span>% of each session fee</span>
        <button className="btn small">Save</button>
      </form>

      <h2>Tutors {stats.pendingTutors > 0 && <span className="status pending">{stats.pendingTutors} to verify</span>}</h2>
      <table>
        <thead><tr><th>Name</th><th>Subjects</th><th>Rate</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {tutors.map((t) => (
            <tr key={t._id}>
              <td>{t.user.name}<br /><span className="muted">{t.user.email}</span></td>
              <td>{t.subjects.join(', ') || <span className="muted">not set</span>}</td>
              <td>{kes(t.hourlyRate)}</td>
              <td><span className={`status ${t.isVerified ? 'completed' : 'pending'}`}>{t.isVerified ? 'verified' : 'pending'}</span></td>
              <td><button className={`btn small ${t.isVerified ? 'ghost' : ''}`} onClick={() => run(() => api.patch(`/admin/tutors/${t._id}/verify`, { isVerified: !t.isVerified }))}>{t.isVerified ? 'Revoke' : 'Verify'}</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Payout requests</h2>
      {!payouts.length && <p className="muted">No payout requests.</p>}
      {payouts.map((p) => (
        <p key={p._id} className="line">
          {p.tutor.name} ({p.tutor.phone || 'no phone'}) · <strong>{kes(p.amount)}</strong> <span className={`status ${p.status}`}>{p.status}</span>
          {p.status === 'pending' && <>
            <button className="btn small" onClick={() => run(() => api.patch(`/admin/payouts/${p._id}`, { status: 'paid' }))}>Mark paid</button>
            <button className="btn ghost small" onClick={() => run(() => api.patch(`/admin/payouts/${p._id}`, { status: 'rejected' }))}>Reject</button>
          </>}
        </p>
      ))}

      <h2>Recent bookings</h2>
      <table>
        <thead><tr><th>Date</th><th>Student</th><th>Tutor</th><th>Subject</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b._id}><td>{day(b.date)}</td><td>{b.student?.name}</td><td>{b.tutor?.name}</td><td>{b.subject}</td><td>{kes(b.amount)}</td><td><span className={`status ${b.status}`}>{b.status}</span></td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
