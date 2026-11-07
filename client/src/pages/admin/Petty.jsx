import { useState } from 'react';
import { api } from '../../api.js';
import { useAsync, Tile, Chip } from '../../ui.jsx';
import { PageState, useMutate, Edit, PickEdit, Confirm } from '../../kit.jsx';
import { PC_CATS } from '../../data.js';
import { fmtDate, inr, todayInTz } from '../../util.js';

export default function Petty() {
  const q = useAsync(() => api('/api/admin/petty'), []);
  const mutate = useMutate(q.reload);
  const [f, setF] = useState({ date: todayInTz(), type: 'out', category: PC_CATS[0], amount: '', note: '' });
  const d = q.data;
  return (
    <PageState q={q}>
      {d && (() => {
        const low = d.balance < d.lowAlert;
        const out = d.entries.filter((e) => e.type === 'out').reduce((a, e) => a + e.amount, 0);
        const inn = d.entries.filter((e) => e.type === 'in').reduce((a, e) => a + e.amount, 0);
        return (
          <div className="stack">
            <div className="tiles">
              <Tile icon="wallet" label="Balance in hand" value={inr(d.balance)} tone={low ? 'var(--bad)' : 'var(--good)'} alert={low} />
              <Tile icon="rupee" label="Cash added" value={inr(inn)} tone="var(--primary)" />
              <Tile icon="tag" label="Spent" value={inr(out)} tone="var(--warn)" />
            </div>
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Opening balance and alert</h3>
              <div className="rowform">
                <label className="field"><span>Opening balance ₹</span><Edit type="number" min="0" value={d.opening} onCommit={(v) => v >= 0 && mutate('PUT', '/api/admin/petty/settings', { opening: v }, 'Saved.')} /></label>
                <label className="field"><span>Opening date</span><input type="date" defaultValue={d.openDate} onBlur={(e) => e.target.value && e.target.value !== d.openDate && mutate('PUT', '/api/admin/petty/settings', { openDate: e.target.value }, 'Saved.')} /></label>
                <label className="field"><span>Warn when below ₹</span><Edit type="number" min="0" value={d.lowAlert} onCommit={(v) => v >= 0 && mutate('PUT', '/api/admin/petty/settings', { lowAlert: v }, 'Saved.')} /></label>
              </div>
            </div>
            <form className="card" onSubmit={async (e) => { e.preventDefault(); const r = await mutate('POST', '/api/admin/petty/entries', { ...f, amount: Number(f.amount) }, 'Entry saved.'); if (r) setF({ ...f, amount: '', note: '' }); }}>
              <h3 style={{ marginBottom: 12 }}>Add entry</h3>
              <div className="rowform">
                <label className="field"><span>Date</span><input type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
                <label className="field"><span>Type</span><select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="out">Spent</option><option value="in">Cash added</option></select></label>
                <label className="field"><span>Category</span><select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{PC_CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
                <label className="field"><span>Amount ₹</span><input type="number" required min="1" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></label>
                <label className="field"><span>Note</span><input maxLength={80} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
                <button className="btn primary">Save</button>
              </div>
            </form>
            <div className="card">
              <div className="head-row"><h3>All entries</h3>{low && <Chip kind="bad">Balance is low</Chip>}</div>
              <div className="scroll">
                <table>
                  <thead><tr><th>Date</th><th>Category</th><th>Note</th><th className="r">Amount ₹</th><th className="r">Balance</th><th /></tr></thead>
                  <tbody>
                    {d.entries.map((e) => (
                      <tr key={e.id}>
                        <td>{fmtDate(e.date)}</td>
                        <td><PickEdit value={e.category} options={PC_CATS.map((c) => [c, c])} onCommit={(v) => mutate('PATCH', `/api/admin/petty/entries/${e.id}`, { category: v }, 'Saved.')} /></td>
                        <td><Edit className="nm" value={e.note} maxLength={80} onCommit={(v) => mutate('PATCH', `/api/admin/petty/entries/${e.id}`, { note: v }, 'Saved.')} /></td>
                        <td className={`r mono ${e.type === 'in' ? 'pos' : 'neg'}`}><Edit className="sm" type="number" min="1" value={e.amount} onCommit={(v) => v > 0 && mutate('PATCH', `/api/admin/petty/entries/${e.id}`, { amount: v }, 'Saved.')} /></td>
                        <td className="r mono">{inr(e.balance)}</td>
                        <td className="r"><Confirm iconOnly label="Delete" ariaLabel="Delete entry" onYes={() => mutate('DELETE', `/api/admin/petty/entries/${e.id}`, undefined, 'Entry deleted.')} /></td>
                      </tr>
                    ))}
                    {!d.entries.length && <tr><td colSpan="6" className="muted">No entries yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}
    </PageState>
  );
}
