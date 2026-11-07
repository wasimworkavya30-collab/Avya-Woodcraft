import { useState } from 'react';
import { api } from '../../api.js';
import { useAsync, Icon, Tile, Chip, Seg } from '../../ui.jsx';
import { PageState, useMutate, Edit, PickEdit, Confirm, PhotoButton, Thumb } from '../../kit.jsx';
import { UNITS } from '../../data.js';
import { fmtDate, inr, num } from '../../util.js';

const KINDS = [['material', 'Material'], ['labour', 'Labour'], ['other', 'Other']];
const sum = (p, k) => p.lines.filter((l) => !k || l.kind === k).reduce((a, l) => a + l.qty * l.rate, 0);

function Product({ p, inv, mutate, open, toggle }) {
  const cost = sum(p), profit = p.price - cost, margin = p.price ? Math.round((profit / p.price) * 100) : 0;
  const [f, setF] = useState({ kind: 'material', name: '', qty: 1, unit: 'pcs', rate: '', inventoryId: '' });
  const pickInv = (id) => {
    const it = inv.find((x) => x.id === Number(id));
    setF(it ? { ...f, inventoryId: it.id, name: it.name, unit: it.unit, rate: it.rate || '' } : { ...f, inventoryId: '' });
  };
  return (
    <div className="card">
      <div className="head-row" style={{ marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Thumb name={p.name} size={56} kind="product" src={p.photo} />
          <div><b style={{ fontSize: '1.05rem' }}>{p.name}</b><div className="small muted">{p.lines.length} lines · {p.runs.length ? `made ${p.runs.length} time${p.runs.length > 1 ? 's' : ''}` : 'not made yet'}</div></div>
        </div>
        <Chip kind={profit >= 0 ? 'good' : 'bad'}>{margin}% margin</Chip>
      </div>
      <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', margin: '10px 0' }}>
        <Tile icon="box" label="Material" value={inr(sum(p, 'material'))} tone="var(--primary)" />
        <Tile icon="users" label="Labour" value={inr(sum(p, 'labour'))} tone="var(--accent)" />
        <Tile icon="tag" label="Other" value={inr(sum(p, 'other'))} tone="var(--muted)" />
        <Tile icon="rupee" label="Total cost" value={inr(cost)} tone="var(--warn)" />
        <Tile icon="check" label="Price / profit" value={<>{inr(p.price)}<small> · {inr(profit)}</small></>} tone={profit >= 0 ? 'var(--good)' : 'var(--bad)'} />
      </div>
      <button type="button" className="btn sm" onClick={toggle}>{open ? 'Hide BOQ' : 'Open BOQ and edit'}</button>
      {open && (
        <div style={{ borderTop: '1px solid var(--line)', marginTop: 14, paddingTop: 14 }}>
          <div className="rowform" style={{ marginBottom: 12 }}>
            <label className="field"><span>Product name</span><Edit value={p.name} maxLength={80} onCommit={(v) => v && mutate('PATCH', `/api/admin/products/${p.id}`, { name: v }, 'Saved.')} /></label>
            <label className="field"><span>Selling price ₹</span><Edit type="number" min="0" step="100" value={p.price} onCommit={(v) => v >= 0 && mutate('PATCH', `/api/admin/products/${p.id}`, { price: v }, 'Saved.')} /></label>
            <PhotoButton label="Product photo" onPick={(photo) => mutate('POST', `/api/admin/products/${p.id}/photo`, { photo }, 'Photo updated.')} />
            <Confirm label="Delete product" confirmLabel="Yes, delete" className="btn sm no" onYes={() => mutate('DELETE', `/api/admin/products/${p.id}`, undefined, 'Product deleted.')} />
          </div>
          <div className="scroll">
            <table className="boq">
              <thead><tr><th>Item</th><th>Kind</th><th className="r">Qty</th><th>Unit</th><th className="r">Rate ₹</th><th className="r">Amount ₹</th><th /></tr></thead>
              <tbody>
                {p.lines.map((l) => (
                  <tr key={l.id}>
                    <td><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Thumb name={l.name} size={34} kind={l.kind} src={l.photo} /><Edit className="nm" value={l.name} maxLength={80} onCommit={(v) => v && mutate('PATCH', `/api/admin/lines/${l.id}`, { name: v }, 'Saved.')} /></div></td>
                    <td><PickEdit value={l.kind} options={KINDS} onCommit={(v) => mutate('PATCH', `/api/admin/lines/${l.id}`, { kind: v }, 'Saved.')} /></td>
                    <td className="r"><Edit className="sm" type="number" min="0" step="0.25" value={l.qty} onCommit={(v) => v >= 0 && mutate('PATCH', `/api/admin/lines/${l.id}`, { qty: v }, 'Saved.')} /></td>
                    <td><PickEdit value={l.unit} options={UNITS.map((u) => [u, u])} onCommit={(v) => mutate('PATCH', `/api/admin/lines/${l.id}`, { unit: v }, 'Saved.')} /></td>
                    <td className="r"><Edit className="sm" type="number" min="0" step="1" value={l.rate} onCommit={(v) => v >= 0 && mutate('PATCH', `/api/admin/lines/${l.id}`, { rate: v }, 'Saved.')} /></td>
                    <td className="r mono">{inr(l.qty * l.rate)}</td>
                    <td className="r"><div className="inl"><PhotoButton iconOnly onPick={(photo) => mutate('POST', `/api/admin/lines/${l.id}/photo`, { photo }, 'Photo updated.')} /><Confirm iconOnly label="Delete" ariaLabel="Delete line" onYes={() => mutate('DELETE', `/api/admin/lines/${l.id}`, undefined, 'Line deleted.')} /></div></td>
                  </tr>
                ))}
                <tr><td colSpan="5"><b>Total cost</b></td><td className="r mono"><b>{inr(cost)}</b></td><td /></tr>
              </tbody>
            </table>
          </div>
          <form className="rowform" style={{ marginTop: 12 }} onSubmit={async (e) => {
            e.preventDefault();
            const r = await mutate('POST', `/api/admin/products/${p.id}/lines`, { kind: f.kind, name: f.name, qty: Number(f.qty), unit: f.unit, rate: Number(f.rate), inventoryId: f.inventoryId || null }, 'Line added.');
            if (r) setF({ ...f, name: '', qty: 1, rate: '', inventoryId: '' });
          }}>
            <label className="field"><span>Kind</span><select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{KINDS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
            {f.kind === 'material' && <label className="field"><span>From inventory</span><select value={f.inventoryId} onChange={(e) => pickInv(e.target.value)}><option value="">Type my own</option>{inv.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
            <label className="field"><span>Name</span><input required maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
            <label className="field"><span>Qty</span><input type="number" required min="0" step="0.25" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /></label>
            <label className="field"><span>Unit</span><select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></label>
            <label className="field"><span>Rate ₹</span><input type="number" required min="0" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></label>
            <button className="btn primary"><Icon name="plus" size={14} /> Add line</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function Costing() {
  const q = useAsync(() => api('/api/admin/products'), []);
  const mutate = useMutate(q.reload);
  const [tab, setTab] = useState('products');
  const [open, setOpen] = useState(null);
  const [name, setName] = useState('');
  return (
    <PageState q={q}>
      {q.data && (() => {
        const { products, inventory, history } = q.data;
        return (
          <div className="stack">
            <div className="toolbar">
              <Seg label="View" value={tab} onChange={setTab} options={[['products', `Products (${products.length})`], ['history', `Completed items (${history.length})`]]} />
              <span className="grow" />
              {tab === 'products' && (
                <form style={{ display: 'flex', gap: 8 }} onSubmit={async (e) => { e.preventDefault(); const r = await mutate('POST', '/api/admin/products', { name }, 'Product added.'); if (r) setName(''); }}>
                  <input required maxLength={80} placeholder="New product name" value={name} onChange={(e) => setName(e.target.value)} aria-label="New product name" />
                  <button className="btn primary"><Icon name="plus" size={16} /> Add product</button>
                </form>
              )}
            </div>
            {tab === 'products' && products.map((p) => <Product key={p.id} p={p} inv={inventory} mutate={mutate} open={open === p.id} toggle={() => setOpen(open === p.id ? null : p.id)} />)}
            {tab === 'products' && !products.length && <div className="card"><p className="muted" style={{ margin: 0 }}>No products yet. Add one, then open its BOQ to add material, labour and other lines.</p></div>}
            {tab === 'history' && (
              <div className="card">
                <h3 style={{ marginBottom: 4 }}>Completed items: estimate against actual</h3>
                <p className="small muted" style={{ margin: '0 0 10px' }}>Estimate comes from the product costing. Actual labour is the logged hours of every employee × their hourly rate. Link an item to its product in Production.</p>
                <div className="scroll">
                  <table>
                    <thead><tr><th>Item</th><th>Finished</th><th className="r">Man-hours</th><th className="r">People</th><th className="r">Est. cost</th><th className="r">Est. labour</th><th className="r">Actual labour</th><th className="r">Price</th><th className="r">Profit (est.)</th></tr></thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.id}>
                          <td><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Thumb name={h.label} size={32} kind="product" src={h.photo} /><span><b>{h.label}</b><br /><small className="muted">{h.customer || ''} · Qty {h.qty}</small></span></div></td>
                          <td>{fmtDate(h.doneAt)}</td><td className="r mono">{num(h.hours)}</td><td className="r mono">{h.peopleCount}</td>
                          <td className="r mono">{h.cost ? inr(h.cost.total) : '–'}</td><td className="r mono">{h.cost ? inr(h.cost.labour) : '–'}</td>
                          <td className={`r mono ${h.cost && h.labourActual > h.cost.labour ? 'neg' : ''}`}>{inr(h.labourActual)}</td>
                          <td className="r mono">{h.cost ? inr(h.cost.price) : '–'}</td>
                          <td className="r mono">{h.cost ? inr(h.cost.price - h.cost.total) : '–'}</td>
                        </tr>
                      ))}
                      {!history.length && <tr><td colSpan="9" className="muted">No completed items yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </PageState>
  );
}
