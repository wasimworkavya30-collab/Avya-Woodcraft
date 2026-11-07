import { useState } from 'react';
import { api } from '../../api.js';
import { useAsync, Tile } from '../../ui.jsx';
import { PageState, Person, useMutate, Edit, Confirm } from '../../kit.jsx';
import { useRouter } from '../../router.jsx';
import { fmtDate, inr, todayInTz } from '../../util.js';

export default function Advances() {
  const q = useAsync(() => api('/api/admin/advances'), []);
  const mutate = useMutate(q.reload);
  const { navigate } = useRouter();
  const [f, setF] = useState({ employeeId: '', date: todayInTz(), amount: '', note: '', fromPetty: false });
  const d = q.data;
  async function add(e) {
    e.preventDefault();
    const r = await mutate('POST', '/api/admin/advances', { ...f, employeeId: Number(f.employeeId || d.employees[0]?.id), amount: Number(f.amount) }, 'Advance saved.');
    if (r) setF({ ...f, amount: '', note: '', fromPetty: false });
  }
  return (
    <PageState q={q}>
      {d && (() => {
        const given = d.advances.reduce((a, x) => a + x.amount, 0);
        const bal = d.advances.reduce((a, x) => a + x.balance, 0);
        const who = new Set(d.advances.filter((x) => x.balance > 0).map((x) => x.employeeId)).size;
        return (
          <div className="stack">
            <div className="tiles">
              <Tile icon="adv" label="Total given" value={inr(given)} tone="var(--primary)" />
              <Tile icon="wallet" label="Still to recover" value={inr(bal)} tone="var(--warn)" />
              <Tile icon="users" label="Employees with balance" value={who} tone="var(--accent)" />
            </div>
            <form className="card" onSubmit={add}>
              <h3 style={{ marginBottom: 12 }}>Give an advance</h3>
              <div className="rowform">
                <label className="field"><span>Employee</span><select value={f.employeeId || d.employees[0]?.id} onChange={(e) => setF({ ...f, employeeId: e.target.value })}>{d.employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
                <label className="field"><span>Date</span><input type="date" required max={todayInTz()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
                <label className="field"><span>Amount ₹</span><input type="number" required min="1" step="100" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></label>
                <label className="field"><span>Note</span><input maxLength={80} placeholder="Optional" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
                <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', paddingBottom: 10 }}><input type="checkbox" style={{ width: 'auto' }} checked={f.fromPetty} onChange={(e) => setF({ ...f, fromPetty: e.target.checked })} /> Also take from petty cash</label>
                <button className="btn primary">Save advance</button>
              </div>
            </form>
            <div className="card">
              <h3 style={{ marginBottom: 8 }}>All advances</h3>
              <div className="scroll">
                <table>
                  <thead><tr><th>Employee</th><th>Date</th><th className="r">Amount ₹</th><th className="r">Deducted</th><th className="r">Balance</th><th>Note</th><th /></tr></thead>
                  <tbody>
                    {d.advances.map((a) => (
                      <tr key={a.id}>
                        <td><Person name={a.name} photo={a.photo} size={32} onClick={() => navigate(`/admin/employee/${a.employeeId}`)} /></td>
                        <td>{fmtDate(a.date)}</td>
                        <td className="r"><Edit className="sm" type="number" min="1" step="100" value={a.amount} aria-label="Amount" onCommit={(v) => v > 0 && mutate('PATCH', `/api/admin/advances/${a.id}`, { amount: v }, 'Saved.')} /></td>
                        <td className="r mono">{inr(a.paid)}</td>
                        <td className={`r mono ${a.balance > 0 ? 'neg' : 'pos'}`}>{inr(a.balance)}</td>
                        <td><Edit className="nm" value={a.note} maxLength={80} aria-label="Note" onCommit={(v) => mutate('PATCH', `/api/admin/advances/${a.id}`, { note: v }, 'Saved.')} /></td>
                        <td className="r"><Confirm iconOnly label="Delete" ariaLabel="Delete advance" onYes={() => mutate('DELETE', `/api/admin/advances/${a.id}`, undefined, 'Advance deleted.')} /></td>
                      </tr>
                    ))}
                    {!d.advances.length && <tr><td colSpan="7" className="muted">No advances yet.</td></tr>}
                  </tbody>
                </table>
              </div>
              <p className="small muted" style={{ margin: '12px 0 0' }}>Set how much to cut from a month in Salary, or in the employee file. Deductions are applied to the oldest advance first.</p>
            </div>
          </div>
        );
      })()}
    </PageState>
  );
}
