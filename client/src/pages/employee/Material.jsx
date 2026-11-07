import { useState } from 'react';
import { api } from '../../api.js';
import { useAsync, Chip, Spinner, ErrorBox, useToast } from '../../ui.jsx';
import { Thumb } from '../../kit.jsx';
import { fmtDate, num } from '../../util.js';

const KIND = { pending: 'warn', issued: 'good', ordered: 'info', rejected: 'bad' };

export default function Material() {
  const q = useAsync(() => api('/api/employee/inventory'), []);
  const toast = useToast();
  const [f, setF] = useState({ itemId: '', qty: '', note: '' });
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/employee/material-requests', { method: 'POST', body: { itemId: Number(f.itemId), qty: Number(f.qty), note: f.note } });
      toast('Request sent.');
      setF({ itemId: '', qty: '', note: '' });
      q.reload();
    } catch (err) { toast(err.message, true); } finally { setBusy(false); }
  }
  if (q.loading && !q.data) return <Spinner />;
  if (q.error) return <ErrorBox error={q.error} onRetry={q.reload} />;
  const { items, myRequests } = q.data;
  const it = items.find((x) => x.id === Number(f.itemId));
  return (
    <div className="stack">
      <form className="card" onSubmit={submit}>
        <h3 style={{ marginBottom: 12 }}>Ask for material</h3>
        <label className="field"><span>Material</span>
          <select required value={f.itemId} onChange={(e) => setF({ ...f, itemId: e.target.value })}>
            <option value="">Choose…</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({num(i.stock)} {i.unit} in stock)</option>)}
          </select>
        </label>
        <label className="field"><span>Quantity{it ? ` (${it.unit})` : ''}</span><input type="number" required min="0.25" step="0.25" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /></label>
        <label className="field"><span>Note (optional)</span><input maxLength={80} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
        <button className="btn primary block" disabled={busy}>Send request</button>
      </form>
      <div className="card">
        <h3 style={{ marginBottom: 4 }}>My requests</h3>
        {myRequests.length ? myRequests.map((r) => (
          <div className="logrow" key={r.id}>
            <Thumb name={r.itemName} size={36} kind="material" src={r.photo} />
            <div className="grow"><b>{r.itemName}</b><br /><span className="small muted">{num(r.qty)} {r.unit} · {fmtDate(r.date)}</span></div>
            <Chip kind={KIND[r.status]}>{r.status}</Chip>
          </div>
        )) : <p className="muted">No requests yet.</p>}
      </div>
    </div>
  );
}
