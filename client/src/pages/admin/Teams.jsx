import { api } from '../../api.js';
import { useAsync, Chip, Avatar } from '../../ui.jsx';
import { PageState, Person, useMutate } from '../../kit.jsx';
import { TEAMS, teamOf } from '../../data.js';

const STATUS = { working: ['good', 'Working'], done: ['good', 'Done'], leave: ['warn', 'On leave'], off: ['', 'Sunday off'], out: ['', 'Not in yet'] };

export default function Teams() {
  const q = useAsync(() => api('/api/admin/teams'), []);
  const mutate = useMutate(q.reload);
  return (
    <PageState q={q}>
      {q.data && (() => {
        const { ceo, members } = q.data;
        const mgrs = members.filter((e) => e.isManager);
        const leadTeams = TEAMS.filter((t) => {
          const m = members.filter((e) => e.team === t.id);
          if (!m.length) return false;
          const l = m.find((e) => e.isLead);
          return !(l && l.isManager);
        });
        return (
          <div className="stack">
            <div className="card">
              <div className="org">
                <div className="tlabel">Leadership</div>
                <div className="pp ceo"><Avatar name={ceo.name} src={ceo.photo} size={48} /><div><b>{ceo.name}</b><small>Chief Executive Officer</small></div></div>
                <div className="tlink" />
                <div className="tlabel">Managers</div>
                <div className="tier">{mgrs.map((e) => <div className="pp" key={e.id} style={{ '--tc': teamOf(e.team).c }}><Avatar name={e.name} src={e.photo} size={44} ring /><div><b>{e.name}</b><small>{e.role}</small></div></div>)}</div>
                <div className="tlink" />
                <div className="tlabel">Team leaders</div>
                <div className="tier">
                  {leadTeams.map((t) => {
                    const l = members.find((e) => e.team === t.id && e.isLead);
                    return l
                      ? <div className="pp" key={t.id} style={{ '--tc': t.c }}><Avatar name={l.name} src={l.photo} size={44} ring /><div><b>{l.name}</b><small>Team Leader · {t.name}</small></div></div>
                      : <div className="pp empty" key={t.id}><div><b>No leader yet</b><small>{t.name}</small></div></div>;
                  })}
                </div>
              </div>
            </div>
            <div className="teams">
              {TEAMS.map((t) => {
                const m = members.filter((e) => e.team === t.id).sort((a, b) => Number(b.isLead) - Number(a.isLead));
                if (!m.length) return null;
                const lead = m.find((e) => e.isLead);
                const inToday = m.filter((e) => ['working', 'done'].includes(e.status)).length;
                return (
                  <div className="tcard" key={t.id} style={{ '--tc': t.c }}>
                    <div className="th">
                      <div><h3>{t.name}</h3><span className="small muted">{m.length} member{m.length > 1 ? 's' : ''} · Leader: {lead ? lead.name : 'not assigned'}</span></div>
                      <Chip kind="good">{inToday} in today</Chip>
                    </div>
                    <div className="tb">
                      {m.map((e) => {
                        const [k, label] = STATUS[e.status] || STATUS.out;
                        return (
                          <div className="mrow" key={e.id}>
                            <Avatar name={e.name} src={e.photo} size={36} ring />
                            <div className="grow"><b>{e.name}{e.isLead && <> <span className="lead">LEAD</span></>}</b><small>{e.role}</small></div>
                            {!e.isLead && <button type="button" className="btn sm ghost" onClick={() => mutate('PATCH', `/api/admin/employees/${e.id}`, { isLead: true }, `${e.name} is now team leader.`)}>Make leader</button>}
                            <Chip kind={k}>{label}</Chip>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </PageState>
  );
}
