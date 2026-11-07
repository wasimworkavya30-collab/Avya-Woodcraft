import { useState } from 'react';
import { api } from '../../api.js';
import { useAsync, Icon, Tile, Chip, Seg } from '../../ui.jsx';
import { PageState, Person, useMutate, Edit, PickEdit, Confirm, PhotoButton, Thumb } from '../../kit.jsx';
import { INV_CATS, UNITS } from '../../data.js';
import { fmtDate, inr, num } from '../../util.js';

export default function Inventory() {
  const q = useAsync(() => api('/api/admin/inventory'), []);
  const mutate = useMutate(q.reload);
  const [tab, setTab] = useState('stock');
  const [cat, setCat] = useState('all');
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', category: INV_CATS[0], unit: 'pcs', stock: 0, minStock: 0, rate: '' });
  const [mv, setMv] = useState({});
  const d = q.data;
  return (
    <PageState q={q}>
      {d && (() => {
        const items = d.items.filter((i) => cat === 'all' || i.category === cat);
        const low = d.items.filter((i) => i.stock <= i.minStock);
        const val = d.items.reduce((a, i) => a + i.stock * i.rate, 0);
        const open_ = d.requests.filter((r) => r.status === 'pending');
        const patch = (i, b) => mutate('PATCH', `/api/admin/inventory/items/${i.id}`, b, 'Saved.');
        return (
          <div className="stack">
            <div className="tiles">
              <Tile icon="box" label="Items" value={d.items.length} tone="var(--primary)" />
              <Tile icon="clock" label="Low or out" value={low.length} tone="var(--bad)" alert={low.length > 0} />
              <Tile icon="clip" label="Open requests" value={open_.length} tone="var(--warn)" />
              <Tile icon="rupee" label="Stock value" value={inr(val)} tone="var(--good)" />
            </div>
            <div className="toolbar">
              <Seg label="View" value={tab} onChange={setTab} options={[['stock', 'Stock'], ['req', `Requests (${open_.length})`], ['order', `Order list (${d.orderList.length})`]]} />
              <span className="grow" />
              {tab === 'stock' && <button type="button" className="btn primary" onClick={() => setOpen(!open)}><Icon name="plus" size={16} /> Add item</button>}
            </div>
            {tab === 'stock' && open && (
              <form className="card" onSubmit={async (e) => { e.preventDefault(); const r = await mutate('POST', '/api/admin/inventory/items', { ...f, stock: Number(f.stock), minStock: Number(f.minStock), rate: Number(f.rate) }, 'Item added.'); if (r) { setOpen(false); setF({ ...f, name: '', stock: 0, minStock: 0, rate: '' }); } }}>
                <div className="rowform">
                  <label className="field"><span>Name</span><input required maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
                  <label className="field"><span>Category</span><select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{INV_CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
                  <label className="field"><span>Unit</span><select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></label>
                  <label className="field"><span>Opening stock</span><input type="number" min="0" step="0.25" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} /></label>
                  <label className="field"><span>Reorder at</span><input type="number" min="0" step="0.25" value={f.minStock} onChange={(e) => setF({ ...f, minStock: e.target.value })} /></label>
                  <label className="field"><span>Rate ₹</span><input type="number" required min="0" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></label>
                  <button className="btn primary">Save item</button>
                </div>
              </form>
            )}
            {tab === 'stock' && (
              <div className="card">
                <div className="toolbar" style={{ marginBottom: 8 }}>
                  <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category"><option value="all">All categories</option>{INV_CATS.map((c) => <option key={c}>{c}</option>)}</select>
                </div>
                <div className="scroll">
                  <table>
                    <thead><tr><th>Item</th><th>Category</th><th className="r">Stock</th><th className="r">Reorder at</th><th className="r">Rate ₹</th><th>Add / use stock</th><th /></tr></thead>
                    <tbody>
                      {items.map((i) => {
                        const m = mv[i.id] || { qty: '', mode: 'in' };
                        return (
                          <tr key={i.id}>
                            <td><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Thumb name={i.name} size={38} kind="material" src={i.photo} /><span><Edit className="nm" value={i.name} maxLength={80} onCommit={(v) => v && patch(i, { name: v })} /><br />{i.stock <= 0 ? <Chip kind="bad">Out</Chip> : i.stock <= i.minStock ? <Chip kind="warn">Low</Chip> : null}</span></div></td>
                            <td><PickEdit value={i.category} options={INV_CATS.map((c) => [c, c])} onCommit={(v) => patch(i, { category: v })} /></td>
                            <td className="r mono">{num(i.stock)} {i.unit}</td>
                            <td className="r"><Edit className="sm" type="number" min="0" step="0.25" value={i.minStock} onCommit={(v) => v >= 0 && patch(i, { minStock: v })} /></td>
                            <td className="r"><Edit className="sm" type="number" min="0" value={i.rate} onCommit={(v) => v >= 0 && patch(i, { rate: v })} /></td>
                            <td>
                              <form className="inl" onSubmit={async (e) => { e.preventDefault(); const r = await mutate('POST', `/api/admin/inventory/items/${i.id}/stock`, { mode: m.mode, qty: Number(m.qty) }, 'Stock updated.'); if (r) setMv({ ...mv, [i.id]: { qty: '', mode: m.mode } }); }}>
                                <select value={m.mode} onChange={(e) => setMv({ ...mv, [i.id]: { ...m, mode: e.target.value } })} aria-label="Stock in or out"><option value="in">Add</option><option value="out">Use</option></select>
                                <input className="sm" type="number" required min="0.25" step="0.25" value={m.qty} onChange={(e) => setMv({ ...mv, [i.id]: { ...m, qty: e.target.value } })} aria-label="Quantity" />
                                <button className="btn sm">Go</button>
                              </form>
                            </td>
                            <td className="r"><div className="inl"><PhotoButton iconOnly onPick={(photo) => mutate('POST', `/api/admin/inventory/items/${i.id}/photo`, { photo }, 'Photo updated.')} /><Confirm iconOnly label="Delete" ariaLabel="Delete item" onYes={() => mutate('DELETE', `/api/admin/inventory/items/${i.id}`, undefined, 'Item deleted.')} /></div></td>
                          </tr>
                        );
                      })}
                      {!items.length && <tr><td colSpan="7" className="muted">No items.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {tab === 'req' && (
              <div className="card">
                <h3 style={{ marginBottom: 4 }}>Material requests from employees</h3>
                {d.requests.map((r) => (
                  <div className="pend" key={r.id}>
                    <Person name={r.name} photo={r.photo} size={38} sub={<>{r.itemName} · {num(r.qty)} {r.unit} · {fmtDate(r.date)}{r.note ? <><br />{r.note}</> : null}</>} />
                    <span className="grow" />
                    {r.status === 'pending' ? (
                      <>
                        <button type="button" className="btn sm ok" onClick={() => mutate('PATCH', `/api/admin/inventory/requests/${r.id}`, { status: 'issued' }, 'Issued from stock.')}>Issue</button>
                        <button type="button" className="btn sm" onClick={() => mutate('PATCH', `/api/admin/inventory/requests/${r.id}`, { status: 'ordered' }, 'Marked to order.')}>To order</button>
                        <button type="button" className="btn sm no" onClick={() => mutate('PATCH', `/api/admin/inventory/requests/${r.id}`, { status: 'rejected' }, 'Rejected.')}>Reject</button>
                      </>
                    ) : <Chip kind={r.status === 'issued' ? 'good' : r.status === 'ordered' ? 'warn' : 'bad'}>{r.status}</Chip>}
                    <Confirm iconOnly label="Delete" ariaLabel="Delete request" onYes={() => mutate('DELETE', `/api/admin/inventory/requests/${r.id}`, undefined, 'Request deleted.')} />
                  </div>
                ))}
                {!d.requests.length && <p className="muted">No requests yet.</p>}
              </div>
            )}
            {tab === 'order' && (
              <div className="card">
                <h3 style={{ marginBottom: 4 }}>Order list</h3>
                <p className="small muted" style={{ margin: '0 0 8px' }}>Items that are low or out of stock, plus requests marked "to order".</p>
                <div className="scroll"><table>
                  <thead><tr><th>Item</th><th className="r">In stock</th><th className="r">To buy</th><th className="r">Est. ₹</th><th>Why</th></tr></thead>
                  <tbody>
                    {d.orderList.map((o) => <tr key={o.itemId}><td><b>{o.name}</b></td><td className="r mono">{num(o.stock)} {o.unit}</td><td className="r mono">{num(o.toBuy)} {o.unit}</td><td className="r mono">{inr(o.toBuy * o.rate)}</td><td>{o.why}</td></tr>)}
                    {!d.orderList.length && <tr><td colSpan="5" className="muted">Nothing to order.</td></tr>}
                  </tbody>
                </table></div>
              </div>
            )}
          </div>
        );
      })()}
    </PageState>
  );
}
