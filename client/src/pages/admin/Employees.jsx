import { useState } from 'react';
import { api } from '../../api.js';
import { useAsync, Icon, Chip } from '../../ui.jsx';
import { PageState, Person, useMutate, Edit, PickEdit, Confirm, PhotoButton } from '../../kit.jsx';
import { useRouter } from '../../router.jsx';
import { TEAMS } from '../../data.js';

export default function Employees() {
  const q = useAsync(() => api('/api/admin/employees?all=1'), []);
  const mutate = useMutate(q.reload);
  const { navigate } = useRouter();
  const [search, setSearch] = useState('');
  const [team, setTeam] = useState('all');
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', role: '', team: 'carp', hourlyRate: '', pin: '' });
  const all = q.data?.employees || [];
  const s = search.trim().toLowerCase();
  const act = all.filter((e) => e.active && (team === 'all' || e.team === team) && (!s || `${e.name} ${e.role} ${e.code}`.toLowerCase().includes(s)));
  const gone = all.filter((e) => !e.active);
  const patch = (e, body, msg = 'Saved.') => mutate('PATCH', `/api/admin/employees/${e.id}`, body, msg);

  async function add(ev) {
    ev.preventDefault();
    const r = await mutate('POST', '/api/admin/employees', { ...f, hourlyRate: Number(f.hourlyRate) }, 'Employee added.');
    if (r) { setOpen(false); setF({ name: '', role: '', team: 'carp', hourlyRate: '', pin: '' }); }
  }

  return (
    <PageState q={q}>
      <div className="stack">
        <div className="toolbar">
          <div className="search"><Icon name="search" size={16} /><input type="search" placeholder="Search name, role or code" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <select value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Filter by team">
            <option value="all">All teams</option>
            {TEAMS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <span className="grow" />
          <button type="button" className="btn primary" onClick={() => setOpen(!open)}><Icon name="plus" size={16} /> Add employee</button>
        </div>
        {open && (
          <form className="card" onSubmit={add}>
            <h3 style={{ marginBottom: 12 }}>Add employee</h3>
            <div className="rowform">
              <label className="field"><span>Full name</span><input required maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
              <label className="field"><span>Role</span><input required maxLength={40} placeholder="Example: Carpenter" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} /></label>
              <label className="field"><span>Team</span><select value={f.team} onChange={(e) => setF({ ...f, team: e.target.value })}>{TEAMS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
              <label className="field"><span>Hourly rate ₹</span><input type="number" required min="1" step="5" value={f.hourlyRate} onChange={(e) => setF({ ...f, hourlyRate: e.target.value })} /></label>
              <label className="field"><span>Login PIN (4-6 digits)</span><input type="password" inputMode="numeric" required pattern="\d{4,6}" maxLength={6} value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value })} /></label>
              <button className="btn primary">Save employee</button>
            </div>
            <p className="small muted" style={{ margin: '10px 0 0' }}>A code is created automatically. Add a photo from the list after saving.</p>
          </form>
        )}
        <div className="card">
          <div className="head-row"><h3>Employees <span className="muted">({act.length})</span></h3></div>
          <div className="scroll">
            <table>
              <thead><tr><th>Employee</th><th>Role</th><th>Team</th><th className="r">Rate ₹/hour</th><th className="r">Actions</th></tr></thead>
              <tbody>
                {act.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <Person name={e.name} photo={e.photo} size={38} />
                        <div>
                          <Edit className="nm" value={e.name} maxLength={60} aria-label="Name" onCommit={(v) => v && patch(e, { name: v })} />{e.isLead && <> <span className="lead">LEAD</span></>}
                          <br /><span className="small muted mono">{e.code}</span>
                        </div>
                      </div>
                    </td>
                    <td><Edit value={e.role} maxLength={40} aria-label="Role" onCommit={(v) => v && patch(e, { role: v })} /></td>
                    <td><PickEdit value={e.team} options={TEAMS.map((t) => [t.id, t.name])} aria-label={`Team for ${e.name}`} onCommit={(v) => patch(e, { team: v }, `${e.name} moved.`)} /></td>
                    <td className="r"><Edit className="sm" type="number" min="1" step="5" value={e.hourlyRate} aria-label={`Hourly rate for ${e.name}`} onCommit={(v) => v > 0 && patch(e, { hourlyRate: v })} /></td>
                    <td className="r">
                      <div className="inl">
                        <button type="button" className="btn sm" onClick={() => navigate(`/admin/employee/${e.id}`)}><Icon name="file" size={13} /> File</button>
                        <PhotoButton onPick={(photo) => mutate('POST', `/api/admin/employees/${e.id}/photo`, { photo }, 'Photo updated.')} />
                        <Confirm label="Remove" confirmLabel="Yes, remove" onYes={() => patch(e, { active: false }, `${e.name} removed. Past records are kept.`)} className="btn sm no" />
                      </div>
                    </td>
                  </tr>
                ))}
                {!act.length && <tr><td colSpan="5" className="muted">No employee matches.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="small muted" style={{ margin: '12px 0 0' }}>Removed employees cannot log in. Their past attendance and salary records are kept.</p>
        </div>
        {gone.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 4 }}>Removed employees</h3>
            {gone.map((e) => (
              <div className="logrow" key={e.id}>
                <Person name={e.name} photo={e.photo} size={34} sub={e.role} />
                <span className="grow" />
                <button type="button" className="btn sm" onClick={() => patch(e, { active: true }, `${e.name} restored.`)}><Icon name="undo" size={13} /> Restore</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageState>
  );
}
