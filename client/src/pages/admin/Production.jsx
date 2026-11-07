import { useState } from 'react';
import { api } from '../../api.js';
import { useAsync, Icon, Tile, Chip, Seg, Avatar } from '../../ui.jsx';
import { PageState, useMutate, Edit, Confirm, Thumb, Gantt } from '../../kit.jsx';
import { addDays, dd, fmtDate, inr, num, sdate, todayInTz } from '../../util.js';

/** Planned end, expected finish and state of an item. Same rules as the demo. */
export function ordInfo(o) {
  const T = todayInTz();
  let total = 0, doneD = 0, rem = 0, last = null, first = true;
  let all = o.stages.length > 0;
  o.stages.forEach((s) => {
    total += s.days;
    if (s.done) { doneD += s.days; if (!last || s.done > last) last = s.done; }
    else {
      let r = s.days;
      if (first && s.start && s.start <= T) r = Math.max(0, s.days - dd(s.start, T));
      first = false; rem += r; all = false;
    }
  });
  const pe = addDays(o.start, Math.ceil(total));
  const started = o.start <= T || o.stages.some((s) => s.start || s.done);
  const base = T < o.start ? o.start : T;
  const fe = all ? last : addDays(base, Math.ceil(rem));
  const delay = Math.max(0, dd(pe, fe));
  const st = all ? (delay > 0 ? 'late-done' : 'done') : !started ? 'planned' : delay > 0 ? 'delayed' : 'ontrack';
  return { total, pe, fe, delay, st, pct: total ? Math.round((doneD / total) * 100) : 0, started, all, doneAt: all ? last : null, elapsed: started ? dd(o.start, all ? last : T) + (all ? 0 : 1) : 0 };
}
const isDone = (i) => i.st === 'done' || i.st === 'late-done';
function StateChip({ i }) {
  if (i.st === 'ontrack') return <Chip kind="good">On track</Chip>;
  if (i.st === 'delayed') return <Chip kind="bad">Delayed +{i.delay} day{i.delay > 1 ? 's' : ''}</Chip>;
  if (i.st === 'done') return <Chip kind="good">Completed on time</Chip>;
  if (i.st === 'late-done') return <Chip kind="warn">Completed {i.delay} day{i.delay > 1 ? 's' : ''} late</Chip>;
  return <Chip>Not started</Chip>;
}

function Detail({ o, i, emps, mutate }) {
  const T = todayInTz();
  const work = useAsync(() => api(`/api/admin/orders/${o.id}/work`), [o.id, o.hours]);
  const wm = useMutate(work.reload);
  const [wf, setWf] = useState({ employeeId: '', date: T, hours: '', task: '' });
  let cum = 0, lo = o.start;
  const hi = addDays(i.fe > i.pe ? i.fe : i.pe, 2);
  const rows = o.stages.map((s) => {
    const pS = addDays(o.start, cum); cum += s.days;
    const pE = addDays(o.start, Math.ceil(cum));
    const aE = s.done || (s.start ? T : null);
    const late = s.done ? s.done > pE : s.start && T > pE;
    if (s.start && s.start < lo) lo = s.start;
    return { key: s.id, label: s.name, pS, pE, aS: s.start, aE, state: s.done ? (late ? 'late' : 'done') : late ? 'late' : '' };
  });
  const patchOrd = (b) => mutate('PATCH', `/api/admin/orders/${o.id}`, b, 'Saved.');
  const patchSt = (s, b) => mutate('PATCH', `/api/admin/stages/${s.id}`, b, 'Saved.');
  const ppl = work.data?.people || [];
  const entries = work.data?.entries || [];
  const tot = ppl.reduce((a, p) => a + p.hours, 0);

  return (
    <div className="detail" style={{ borderTop: '1px solid var(--line)', marginTop: 14, paddingTop: 14 }}>
      <h3 style={{ marginBottom: 10 }}>Timeline</h3>
      <Gantt rows={rows} lo={lo} hi={hi} />

      <h3 style={{ margin: '18px 0 8px' }}>Item details</h3>
      <div className="rowform">
        <label className="field"><span>Item and order number</span><Edit value={o.label} maxLength={80} onCommit={(v) => v && patchOrd({ label: v })} /></label>
        <label className="field"><span>Customer</span><Edit value={o.customer || ''} maxLength={60} onCommit={(v) => patchOrd({ customer: v })} /></label>
        <label className="field"><span>Quantity</span><Edit type="number" min="1" value={o.qty} onCommit={(v) => v > 0 && patchOrd({ qty: v })} /></label>
        <label className="field"><span>Start date</span><input type="date" defaultValue={o.start} onBlur={(e) => e.target.value && e.target.value !== o.start && patchOrd({ start: e.target.value })} /></label>
        <label className="field"><span>Costing product</span>
          <select value={o.productId || ''} onChange={(e) => patchOrd({ productId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Not linked</option>
            {(emps.products || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      </div>

      <h3 style={{ margin: '14px 0 8px' }}>Stages</h3>
      <div className="scroll">
        <table className="boq">
          <thead><tr><th>Stage</th><th className="r">Planned days</th><th>Started</th><th>Done</th><th>People</th><th /></tr></thead>
          <tbody>
            {o.stages.map((s) => (
              <tr key={s.id}>
                <td><Edit className="nm" value={s.name} maxLength={40} aria-label="Stage name" onCommit={(v) => v && patchSt(s, { name: v })} /></td>
                <td className="r"><Edit className="sm" type="number" min="0.5" step="0.5" value={s.days} aria-label="Planned days" onCommit={(v) => v > 0 && patchSt(s, { days: v })} /></td>
                <td><input type="date" defaultValue={s.start || ''} aria-label="Actual start" onBlur={(e) => (e.target.value || null) !== s.start && patchSt(s, { start: e.target.value || null })} /></td>
                <td><input type="date" defaultValue={s.done || ''} aria-label="Done on" onBlur={(e) => (e.target.value || null) !== s.done && patchSt(s, { done: e.target.value || null })} /></td>
                <td>
                  <div className="inl" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                    {s.assigned.map((id) => {
                      const e = emps.list.find((x) => x.id === id);
                      return e ? <span className="who" key={id}>{e.name}<button type="button" className="x" aria-label={`Remove ${e.name}`} onClick={() => mutate('DELETE', `/api/admin/stages/${s.id}/people/${id}`, undefined, 'Removed.')}>×</button></span> : null;
                    })}
                    <select value="" aria-label="Assign person" onChange={(e) => e.target.value && mutate('POST', `/api/admin/stages/${s.id}/people`, { employeeId: Number(e.target.value) }, 'Assigned.')}>
                      <option value="">Add person…</option>
                      {emps.list.filter((e) => !s.assigned.includes(e.id)).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                </td>
                <td className="r">
                  <div className="inl">
                    {s.done ? <button type="button" className="btn sm" onClick={() => patchSt(s, { done: null })}>Reopen</button>
                      : <button type="button" className="btn sm ok" onClick={() => patchSt(s, { done: T, start: s.start || T })}>Done today</button>}
                    <Confirm iconOnly label="Delete" ariaLabel="Delete stage" onYes={() => mutate('DELETE', `/api/admin/stages/${s.id}`, undefined, 'Stage deleted.')} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0 0' }}>
        <button type="button" className="btn sm" onClick={() => mutate('POST', `/api/admin/orders/${o.id}/stages`, { name: 'New stage', days: 1 }, 'Stage added.')}><Icon name="plus" size={13} /> Add stage</button>
        <Confirm label="Delete item" confirmLabel="Yes, delete item" icon="trash" className="btn sm no" onYes={() => mutate('DELETE', `/api/admin/orders/${o.id}`, undefined, 'Item deleted.')} />
      </div>

      <h3 style={{ margin: '20px 0 4px' }}>Who worked on this item</h3>
      <p className="small muted" style={{ margin: '0 0 8px' }}>Built from the work logged by employees against this item. Change or delete any entry below.</p>
      <PageState q={work}>
        {ppl.length ? (
          <div className="scroll">
            <table>
              <thead><tr><th>Employee</th><th className="r">Days worked</th><th className="r">Hours</th><th className="r">Labour cost</th></tr></thead>
              <tbody>
                {ppl.map((p) => (
                  <tr key={p.employeeId}>
                    <td><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Avatar name={p.name} src={p.photo} size={32} ring /><b>{p.name}</b></div></td>
                    <td className="r mono">{p.days}</td><td className="r mono">{num(p.hours)} h</td><td className="r mono">{inr(p.cost)}</td>
                  </tr>
                ))}
                <tr><td><b>Total</b></td><td /><td className="r mono"><b>{num(tot)} h</b></td><td className="r mono"><b>{inr(ppl.reduce((a, p) => a + p.cost, 0))}</b></td></tr>
              </tbody>
            </table>
          </div>
        ) : <p className="muted" style={{ margin: 0 }}>No work logged on this item yet.</p>}

        <h3 style={{ margin: '16px 0 8px' }}>Work entries</h3>
        <div className="scroll">
          <table>
            <thead><tr><th>Date</th><th>Employee</th><th>Work</th><th className="r">Hours</th><th /></tr></thead>
            <tbody>
              {entries.map((x) => (
                <tr key={x.id}>
                  <td>{fmtDate(x.date)}</td><td>{x.name}</td><td>{x.task}{x.note ? <span className="small muted"> · {x.note}</span> : null}</td>
                  <td className="r"><Edit className="sm" type="number" min="0.25" max="12" step="0.25" value={x.hours} aria-label="Hours" onCommit={(v) => v > 0 && wm('PATCH', `/api/admin/work/${x.id}`, { hours: v }, 'Saved.')} /></td>
                  <td className="r"><Confirm iconOnly label="Delete" ariaLabel="Delete entry" onYes={() => wm('DELETE', `/api/admin/work/${x.id}`, undefined, 'Entry deleted.')} /></td>
                </tr>
              ))}
              {!entries.length && <tr><td colSpan="5" className="muted">No entries.</td></tr>}
            </tbody>
          </table>
        </div>
        <form className="rowform" style={{ marginTop: 12 }} onSubmit={async (e) => {
          e.preventDefault();
          const r = await wm('POST', `/api/admin/orders/${o.id}/work`, { employeeId: Number(wf.employeeId || emps.list[0]?.id), date: wf.date, hours: Number(wf.hours), task: wf.task || 'Work' }, 'Entry added.');
          if (r) { setWf({ ...wf, hours: '', task: '' }); mutate('GET', '/api/admin/orders'); }
        }}>
          <label className="field"><span>Add missing work: employee</span><select value={wf.employeeId || emps.list[0]?.id || ''} onChange={(e) => setWf({ ...wf, employeeId: e.target.value })}>{emps.list.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
          <label className="field"><span>Date</span><input type="date" required max={T} value={wf.date} onChange={(e) => setWf({ ...wf, date: e.target.value })} /></label>
          <label className="field"><span>Hours</span><input type="number" required min="0.25" max="12" step="0.25" value={wf.hours} onChange={(e) => setWf({ ...wf, hours: e.target.value })} /></label>
          <label className="field"><span>Kind of work</span><input maxLength={40} placeholder="Example: Polishing" value={wf.task} onChange={(e) => setWf({ ...wf, task: e.target.value })} /></label>
          <button className="btn">Add entry</button>
        </form>
      </PageState>
    </div>
  );
}

function Card({ o, emps, mutate, open, toggle }) {
  const i = ordInfo(o);
  const T = todayInTz();
  const cur = o.stages.find((s) => !s.done);
  const done = isDone(i);
  const planned = i.total;
  const actual = done && i.doneAt ? dd(o.start, i.doneAt) + 1 : i.elapsed;
  const nameOf = (id) => emps.list.find((e) => e.id === id) || { name: '?' };
  return (
    <div className="card">
      <div className="head-row" style={{ marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Thumb name={o.label} size={48} kind="product" src={o.photo} />
          <div><b style={{ fontSize: '1.02rem' }}>{o.label}</b><div className="small muted">{o.customer || 'No customer'} · Qty {o.qty} · {sdate(o.start)} → {done ? sdate(i.doneAt) : `${sdate(i.pe)} planned`}</div></div>
        </div>
        <StateChip i={i} />
      </div>
      <div className="track" style={{ margin: '8px 0 6px', height: 9 }}><div className="bar" style={{ width: `${i.pct}%`, height: 9, background: i.delay > 0 ? 'var(--bad)' : 'var(--good)' }} /></div>
      <div className="head-row" style={{ margin: 0 }}>
        <span className="small">{done ? <>Took <b className="mono">{actual}</b> days against <b className="mono">{num(planned)}</b> planned</> : i.started ? <>Day <b className="mono">{i.elapsed}</b> of <b className="mono">{num(planned)}</b> planned{i.delay > 0 && <> · <span className="neg"><b>+{i.delay}</b> day{i.delay > 1 ? 's' : ''} extra</span></>}</> : <>Starts {fmtDate(o.start)}</>}</span>
        <span className="mono small">{i.pct}% done{cur && i.started && !done ? ` · now: ${cur.name}` : ''}</span>
      </div>

      {!done && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
          <span className="cap">Working today</span>
          {o.today.length ? o.today.map((p) => <span className="who" key={p.employeeId}><Avatar name={nameOf(p.employeeId).name} src={nameOf(p.employeeId).photo} size={26} ring />{nameOf(p.employeeId).name} <span className="mono small muted">{num(p.hours)} h</span></span>)
            : <span className="small muted">Nobody logged work on this item today.</span>}
        </div>
      )}

      <div className="small muted" style={{ marginTop: 8 }}>
        Man-hours <b className="mono">{num(o.hours)} h</b> (≈ {num(Math.round((o.hours / 8) * 10) / 10)} man-days) · {o.peopleCount} {o.peopleCount === 1 ? 'person' : 'people'}
        {!done && i.started && <> · expected finish <b>{sdate(i.fe)}</b></>}
      </div>

      {o.cost && (
        <div className="boqmini" style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 8 }}>
          <span className="small">Costing: <b className="mono">{inr(o.cost.total)}</b> cost</span>
          <span className="small">Selling price <b className="mono">{inr(o.cost.price)}</b></span>
          <span className={`small ${o.cost.price - o.cost.total >= 0 ? 'pos' : 'neg'}`}>Profit <b className="mono">{inr(o.cost.price - o.cost.total)}</b></span>
          <span className="small muted">Actual labour from logged hours <b className="mono">{inr(o.labourActual)}</b></span>
        </div>
      )}
      <div style={{ marginTop: 12 }}><button type="button" className="btn sm" onClick={toggle}>{open ? 'Hide details' : done ? 'Employees, hours and edit' : 'Timeline, stages and edit'}</button></div>
      {open && <Detail o={o} i={i} emps={emps} mutate={mutate} />}
    </div>
  );
}

export default function Production() {
  const q = useAsync(() => api('/api/admin/orders'), []);
  const mutate = useMutate(q.reload);
  const [tab, setTab] = useState('live');
  const [open, setOpen] = useState(null);
  const [search, setSearch] = useState('');
  const [f, setF] = useState({ label: '', customer: '', qty: 1, start: todayInTz() });
  const T = todayInTz();

  return (
    <PageState q={q}>
      {q.data && (() => {
        const emps = { list: q.data.employees, products: q.data.products };
        const all = q.data.orders.map((o) => ({ o, i: ordInfo(o) }));
        const live = all.filter((x) => !isDone(x.i));
        const fin = all.filter((x) => isDone(x.i));
        const delayed = live.filter((x) => x.i.st === 'delayed').length;
        const working = new Set(live.flatMap((x) => x.o.today.map((p) => p.employeeId))).size;
        const order = { delayed: 0, ontrack: 1, planned: 2, 'late-done': 3, done: 4 };
        const s = search.trim().toLowerCase();
        const list = (tab === 'live' ? live : tab === 'done' ? fin : all)
          .filter((x) => !s || `${x.o.label} ${x.o.customer || ''}`.toLowerCase().includes(s))
          .sort((a, b) => (tab === 'live' ? order[a.i.st] - order[b.i.st] : (b.i.doneAt || b.o.start).localeCompare(a.i.doneAt || a.o.start)));
        let lo = T, hi = T;
        list.forEach(({ o, i }) => { if (o.start < lo) lo = o.start; [i.pe, i.fe].forEach((d) => { if (d && d > hi) hi = d; }); });
        hi = addDays(hi, 2); lo = addDays(lo, -1);
        const rows = list.map(({ o, i }) => {
          const aE = i.all ? i.doneAt : i.started ? T : null;
          return { key: o.id, label: o.label, pS: o.start, pE: i.pe, aS: i.started ? o.start : null, aE, state: i.st === 'done' ? 'done' : i.delay > 0 ? 'late' : '', fS: !i.all && i.delay > 0 ? i.pe : null, fE: !i.all && i.delay > 0 ? i.fe : null };
        });
        const finHours = fin.reduce((a, x) => a + x.o.hours, 0);
        return (
          <div className="stack">
            <div className="tiles">
              <Tile icon="tag" label="In production" value={live.length} tone="var(--primary)" />
              <Tile icon="clock" label="Delayed" value={delayed} tone="var(--bad)" alert={delayed > 0} />
              <Tile icon="users" label="Working on items today" value={working} tone="var(--accent)" />
              <Tile icon="check" label="Completed items" value={<>{fin.length}<small> · {num(finHours)} h</small></>} tone="var(--good)" />
            </div>
            <div className="toolbar">
              <Seg label="Show" value={tab} onChange={setTab} options={[['live', `Live (${live.length})`], ['done', `Completed (${fin.length})`], ['all', `All (${all.length})`]]} />
              <div className="search"><Icon name="search" size={16} /><input type="search" placeholder="Search item or customer" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            </div>
            {list.length > 0 && (
              <div className="card">
                <div className="head-row"><div><h3>{tab === 'done' ? 'Completed items timeline' : 'Timeline'}</h3><span className="small muted">Planned days against actual progress. Red means the item took or is taking longer than planned.</span></div></div>
                <Gantt rows={rows} lo={lo} hi={hi} />
              </div>
            )}
            {tab === 'done' && fin.length > 0 && (
              <div className="card">
                <h3 style={{ marginBottom: 8 }}>Completed items summary</h3>
                <div className="scroll">
                  <table>
                    <thead><tr><th>Item</th><th>Finished</th><th className="r">Days</th><th className="r">Man-hours</th><th className="r">People</th><th className="r">Cost</th><th className="r">Profit</th></tr></thead>
                    <tbody>
                      {list.map(({ o, i }) => (
                        <tr key={o.id}>
                          <td><button type="button" className="lnk" onClick={() => setOpen(open === o.id ? null : o.id)}><Thumb name={o.label} size={30} kind="product" src={o.photo} /><b>{o.label}</b></button></td>
                          <td>{fmtDate(i.doneAt)}</td>
                          <td className="r mono">{dd(o.start, i.doneAt) + 1} / {num(i.total)}</td>
                          <td className="r mono">{num(o.hours)}</td><td className="r mono">{o.peopleCount}</td>
                          <td className="r mono">{o.cost ? inr(o.cost.total) : '–'}</td>
                          <td className={`r mono ${o.cost && o.cost.price - o.cost.total < 0 ? 'neg' : 'pos'}`}>{o.cost ? inr(o.cost.price - o.cost.total) : '–'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="small muted" style={{ margin: '10px 0 0' }}>Days = actual / planned. Open an item below for the employee-wise hours.</p>
              </div>
            )}
            <div className="cols even">
              <div className="stack">
                {list.map(({ o }) => <Card key={o.id} o={o} emps={emps} mutate={mutate} open={open === o.id} toggle={() => setOpen(open === o.id ? null : o.id)} />)}
                {!list.length && <div className="card"><p className="muted" style={{ margin: 0 }}>{tab === 'done' ? 'No completed items yet. Items appear here when every stage is done.' : 'Nothing here.'}</p></div>}
              </div>
              <div className="stack">
                <div className="card">
                  <h3 style={{ marginBottom: 4 }}>Live: who is working on what</h3>
                  <span className="small muted">From attendance and the work each person logs today</span>
                  {q.data.live.map((p) => (
                    <div className="logrow" key={p.employeeId}>
                      <Avatar name={p.name} src={p.photo} size={38} ring />
                      <div className="grow"><b>{p.name}</b><br /><span className="small muted">{p.task ? `${p.task} · ${p.item}` : 'Present, no task logged yet'}</span></div>
                      <span className="mono small muted">{p.hours ? `${num(p.hours)} h` : ''}</span>
                      <Chip kind={p.working ? 'good' : ''}>{p.working ? 'Working' : 'Done'}</Chip>
                    </div>
                  ))}
                  {!q.data.live.length && <p className="muted" style={{ margin: '10px 0 0' }}>Nobody has checked in yet.</p>}
                </div>
                <form className="card" onSubmit={async (e) => {
                  e.preventDefault();
                  const r = await mutate('POST', '/api/admin/orders', { ...f, qty: Number(f.qty) }, 'Item added.');
                  if (r) { setF({ label: '', customer: '', qty: 1, start: T }); setTab('live'); }
                }}>
                  <h3 style={{ marginBottom: 12 }}>Add an item to make</h3>
                  <div className="rowform">
                    <label className="field"><span>Item and order number</span><input required maxLength={80} placeholder="Example: Teak study table (Order #220)" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} /></label>
                    <label className="field"><span>Customer</span><input maxLength={60} value={f.customer} onChange={(e) => setF({ ...f, customer: e.target.value })} /></label>
                    <label className="field"><span>Quantity</span><input type="number" min="1" required value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /></label>
                    <label className="field"><span>Start date</span><input type="date" required value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></label>
                    <button className="btn primary">Add item</button>
                  </div>
                  <p className="small muted" style={{ margin: '10px 0 0' }}>Starts with 7 standard stages (14 days). Change stages and days after adding. Past items can be added with an earlier start date and marked done.</p>
                </form>
              </div>
            </div>
          </div>
        );
      })()}
    </PageState>
  );
}
