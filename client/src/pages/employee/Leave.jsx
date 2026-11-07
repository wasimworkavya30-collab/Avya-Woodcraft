import { useState } from 'react';
import { api } from '../../api.js';
import { useAsync, useToast, Spinner, ErrorBox, Chip } from '../../ui.jsx';
import { daysBetween, fmtDate, todayInTz } from '../../util.js';

const KIND = { approved: 'good', rejected: 'bad', pending: 'warn' };

export default function Leave() {
  const toast = useToast();
  const q = useAsync(() => api('/api/employee/leave'), []);
  const [f, setF] = useState({ leave_type: 'Casual', from_date: '', to_date: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const t = todayInTz();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (f.to_date < f.from_date) return toast('End date cannot be before the start date.', true);
    setBusy(true);
    try {
      await api('/api/employee/leave', { method: 'POST', body: f });
      toast('Leave request sent.');
      setF({ leave_type: 'Casual', from_date: '', to_date: '', reason: '' });
      q.reload();
    } catch (err) {
      toast(err.message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      <form className="card" onSubmit={submit}>
        <h3 style={{ marginBottom: 12 }}>Request leave</h3>
        <label className="field"><span>Type</span><select value={f.leave_type} onChange={set('leave_type')}>{['Casual', 'Sick', 'Unpaid'].map((x) => <option key={x}>{x}</option>)}</select></label>
        <div className="two">
          <label className="field"><span>From</span><input type="date" min={t} required value={f.from_date} onChange={set('from_date')} /></label>
          <label className="field"><span>To</span><input type="date" min={f.from_date || t} required value={f.to_date} onChange={set('to_date')} /></label>
        </div>
        <label className="field"><span>Reason</span><input maxLength={200} minLength={3} required placeholder="Short reason" value={f.reason} onChange={set('reason')} /></label>
        <button className="btn primary" disabled={busy}>Send for approval</button>
      </form>
      <div className="card">
        <h3 style={{ marginBottom: 4 }}>My requests</h3>
        {q.loading && !q.data ? <Spinner /> : q.error ? <ErrorBox error={q.error} onRetry={q.reload} /> : q.data.requests.length ? q.data.requests.map((l) => {
          const n = daysBetween(l.from_date, l.to_date);
          return (
            <div className="logrow" key={l.id}>
              <div className="grow"><b>{l.leave_type} · {n} day{n > 1 ? 's' : ''}</b><br /><span className="small muted">{fmtDate(l.from_date)}{l.to_date !== l.from_date ? ` to ${fmtDate(l.to_date)}` : ''} · {l.reason}</span></div>
              <Chip kind={KIND[l.status]}>{l.status[0].toUpperCase() + l.status.slice(1)}</Chip>
            </div>
          );
        }) : <p className="muted">No requests yet.</p>}
      </div>
    </div>
  );
}
