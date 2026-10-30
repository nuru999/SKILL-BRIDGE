import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg, kes } from '../api';

export function Stars({ value, count }) {
  if (!count) return <span className="muted">No reviews yet</span>;
  return <span className="stars">★ {value.toFixed(1)} <span className="muted">({count})</span></span>;
}

export default function Tutors() {
  const [tutors, setTutors] = useState([]);
  const [error, setError] = useState('');
  const [f, setF] = useState({ subject: '', location: '', maxPrice: '', minRating: '', sort: 'rating' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    const t = setTimeout(() => {
      const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
      api.get('/tutors', { params }).then((r) => setTutors(r.data)).catch((e) => setError(errMsg(e)));
    }, 250);
    return () => clearTimeout(t);
  }, [f]);

  return (
    <>
      <section className="hero">
        <h1>Learn it from someone who sat your exam last semester.</h1>
        <p>Book a verified student tutor, meet on campus, and pay safely. Your money is only released once the session is done.</p>
      </section>

      <section className="filters">
        <input placeholder="Subject, e.g. Calculus" value={f.subject} onChange={set('subject')} />
        <input placeholder="Meeting place" value={f.location} onChange={set('location')} />
        <input type="number" min="0" placeholder="Max KES per hour" value={f.maxPrice} onChange={set('maxPrice')} />
        <select value={f.minRating} onChange={set('minRating')}>
          <option value="">Any rating</option>
          <option value="4">4 stars and up</option>
          <option value="3">3 stars and up</option>
        </select>
        <select value={f.sort} onChange={set('sort')}>
          <option value="rating">Best rated</option>
          <option value="price">Lowest price</option>
        </select>
      </section>

      {error && <p className="error">{error}</p>}
      <section className="grid">
        {tutors.map((t) => (
          <Link key={t._id} to={`/tutors/${t._id}`} className="tutor-card">
            <div className="avatar">{t.user.name[0]}</div>
            <div>
              <h3>{t.user.name}</h3>
              <Stars value={t.avgRating} count={t.reviewCount} />
              <p className="subjects">{t.subjects.join(' · ')}</p>
              <p className="muted">{t.location || 'Location not set'}</p>
            </div>
            <strong className="rate">{kes(t.hourlyRate)}<small>/hr</small></strong>
          </Link>
        ))}
        {!tutors.length && !error && <p className="muted">No tutors match those filters. Try a broader subject or a higher price.</p>}
      </section>
    </>
  );
}
