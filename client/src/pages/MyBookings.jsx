import { useCallback, useEffect, useState } from 'react';
import api, { day, errMsg, kes } from '../api';
import { useAuth } from '../AuthContext';

function ReviewForm({ booking, onDone }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try { await api.post('/reviews', { bookingId: booking._id, rating, comment }); onDone(); }
    catch (err) { setError(errMsg(err)); }
  };
  return (
    <form className="inline-form" onSubmit={submit}>
      <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
        {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 && 's'}</option>)}
      </select>
      <input placeholder="How was the session?" value={comment} onChange={(e) => setComment(e.target.value)} />
      <button className="btn small">Post review</button>
      {error && <span className="error">{error}</span>}
    </form>
  );
}

export default function MyBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [msg, setMsg] = useState('');
  const [asking, setAsking] = useState(null); // { id, phone }: asking which number to charge
  const [waiting, setWaiting] = useState({}); // bookingId -> { paymentId, startedAt }: prompt sent, waiting for the PIN
  const [demo, setDemo] = useState({}); // bookingId -> paymentId: demo-mode payment waiting for the demo button

  const load = useCallback(() => api.get('/bookings/mine').then((r) => setBookings(r.data)), []);
  useEffect(() => { load(); }, [load]);

  const drop = (id) => setWaiting((w) => { const n = { ...w }; delete n[id]; return n; });

  // Poll while a prompt is on the customer's phone
  useEffect(() => {
    if (!Object.keys(waiting).length) return;
    const timer = setInterval(async () => {
      for (const [id, w] of Object.entries(waiting)) {
        try {
          const { data } = await api.get(`/payments/${w.paymentId}/status`);
          if (data.status === 'held' || data.status === 'released') {
            drop(id);
            setMsg('Payment received' + (data.receipt ? ` (M-Pesa receipt ${data.receipt})` : '') + '. Your money is held safely until the session is done.');
            load();
          } else if (data.status === 'failed') {
            drop(id);
            setMsg(`Payment not completed: ${data.reason || 'cancelled'}. You can try again.`);
            load();
          } else if (Date.now() - w.startedAt > 120000) {
            drop(id);
            setMsg('No response from M-Pesa yet. If you approved it on your phone, refresh in a minute.');
          }
        } catch { /* keep polling */ }
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [waiting, load]);

  const run = async (fn) => {
    setMsg('');
    try { await fn(); await load(); } catch (e) { setMsg(errMsg(e)); }
  };
  const cancel = (id) => run(() => api.patch(`/bookings/${id}/status`, { status: 'cancelled' }));

  const sendPrompt = (e) => {
    e.preventDefault();
    const { id, phone } = asking;
    run(async () => {
      const { data } = await api.post('/payments/initiate', { bookingId: id, phone });
      setAsking(null);
      setMsg(data.message);
      if (data.mode === 'mpesa') setWaiting((w) => ({ ...w, [id]: { paymentId: data.payment._id, startedAt: Date.now() } }));
      else setDemo((d) => ({ ...d, [id]: data.payment._id }));
    });
  };
  const simulate = (id) => run(async () => {
    const { data } = await api.post('/payments/simulate', { paymentId: demo[id] });
    setDemo((d) => { const n = { ...d }; delete n[id]; return n; });
    setMsg(data.message);
  });

  return (
    <div className="page">
      <h1>My bookings</h1>
      {msg && <p className="notice">{msg}</p>}
      {!bookings.length && <p className="muted">No bookings yet. Find a tutor and request your first session.</p>}
      {bookings.map((b) => (
        <article key={b._id} className="row-card">
          <div>
            <h3>{b.subject} with {b.tutor.name}</h3>
            <p className="muted">{day(b.date)} at {b.startTime} · {b.duration}h · {b.location}</p>
            <p><strong>{kes(b.amount)}</strong></p>
          </div>
          <div className="actions">
            <span className={`status ${b.status}`}>{b.status}</span>
            {['pending', 'accepted'].includes(b.status) && <button className="btn ghost small" onClick={() => cancel(b._id)}>Cancel</button>}
            {b.status === 'accepted' && !waiting[b._id] && !demo[b._id] && asking?.id !== b._id && (
              <button className="btn small" onClick={() => setAsking({ id: b._id, phone: user.phone || '' })}>Pay with M-Pesa</button>
            )}
            {waiting[b._id] && <span className="status paid">Waiting for your PIN on your phone…</span>}
            {demo[b._id] && <button className="btn small amber" onClick={() => simulate(b._id)}>Demo: confirm M-Pesa payment</button>}
          </div>
          {asking?.id === b._id && (
            <form className="inline-form" onSubmit={sendPrompt}>
              <input required placeholder="M-Pesa number, e.g. 0712345678" value={asking.phone} onChange={(e) => setAsking({ ...asking, phone: e.target.value })} />
              <button className="btn small">Send M-Pesa prompt</button>
              <button type="button" className="btn ghost small" onClick={() => setAsking(null)}>Back</button>
            </form>
          )}
          {b.status === 'completed' && !b.reviewed && <ReviewForm booking={b} onDone={load} />}
        </article>
      ))}
    </div>
  );
}
