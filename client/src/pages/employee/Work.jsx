import { useState } from 'react';
import { api } from '../../api.js';
import { useAsync, useToast, Spinner, ErrorBox, Chip } from '../../ui.jsx';
import { hrs, fmtDate } from '../../util.js';

export default function Work() {
  const toast = useToast();
  const meta = useAsync(() => api('/api/employee/meta'), []);
  const today = useAsync(() => api('/api/employee/today'), []);
  const [f, setF] = useState({ task_type: '', item: '', hours: '1', note: '' });
  const [busy, setBusy] = useState(false);

  if ((meta.loading || today.loading) && !today.data) return <Spinner />;
  if (meta.error || today.error) return <ErrorBox error={meta.error || today.error} onRetry={() => { meta.reload(); today.reload(); }} />;
  const { taskTypes, items } = meta.data;
  const { work, recent, attendance } = today.data;
  const total = work.reduce((a, w) => a + w.hours, 0);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function add(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/employee/work', { method: 'POST', body: { task_type: f.task_type || taskTypes[0], item: f.item, hours: parseFloat(f.hours), note: f.note } });
      toast('Work added to today’s log.');
      setF({ ...f, item: '', note: '' });
      today.reload();
    } catch (err) {
      toast(err.message, true);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id) {
    try {
      await api(`/api/employee/work/${id}`, { method: 'DELETE' });
      toast('Entry removed.');
      today.reload();
    } catch (err) {
      toast(err.message, true);
    }
  }

  return (
    <div className="stack">
      <form className="card" onSubmit={add}>
        <h3 style={{ marginBottom: 4 }}>What did you work on?</h3>
        <p className="small muted" style={{ margin: '0 0 12px' }}>Add each job you did today. You can add several entries.</p>
        <label className="field"><span>Kind of work</span>
          <select value={f.task_type || taskTypes[0]} onChange={set('task_type')}>{taskTypes.map((t) => <option key={t}>{t}</option>)}</select>
        </label>
        <label className="field"><span>Item or order</span>
          <input list="wl-items" required maxLength={80} placeholder="Example: Teak dining table (Order #214)" value={f.item} onChange={set('item')} />
          <datalist id="wl-items">{items.map((i) => <option key={i} value={i} />)}</datalist>
        </label>
        <div className="two">
          <label className="field"><span>Hours spent</span><input type="number" min="0.25" max="12" step="0.25" required value={f.hours} onChange={set('hours')} /></label>
          <label className="field"><span>Note (optional)</span><input maxLength={100} value={f.note} onChange={set('note')} /></label>
        </div>
        <button className="btn primary" disabled={busy || !attendance}>Add to today’s log</button>
        {!attendance && <p className="small muted" style={{ margin: '10px 0 0' }}>Check in first. You can add work only on days you are present.</p>}
      </form>

      <div className="card">
        <div className="head-row"><h3>Today’s work</h3><Chip kind={total > 0 ? 'good' : ''}>{hrs(total)} logged</Chip></div>
        {work.length ? work.map((w) => (
          <div className="logrow" key={w.id}>
            <div className="grow"><b>{w.task_type}</b><br /><span className="small muted">{w.item}{w.note ? ` · ${w.note}` : ''}</span></div>
            <span className="mono">{hrs(w.hours)}</span>
            <button className="btn sm no" onClick={() => remove(w.id)} aria-label="Remove entry">Remove</button>
          </div>
        )) : <p className="muted" style={{ margin: 0 }}>Nothing logged yet.</p>}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 4 }}>Previous days</h3>
        {recent.length ? recent.map((r) => (
          <div className="logrow" key={r.work_date}>
            <div className="grow"><b>{fmtDate(r.work_date)}</b><br /><span className="small muted">{(r.tasks || []).join(', ')}</span></div>
            <span className="mono">{hrs(r.hours)}</span>
          </div>
        )) : <p className="muted" style={{ margin: 0 }}>No earlier entries.</p>}
      </div>
    </div>
  );
}
