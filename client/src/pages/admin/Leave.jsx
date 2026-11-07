import { api } from '../../api.js';
import { useAsync, Chip } from '../../ui.jsx';
import { PageState, Person, useMutate, Confirm } from '../../kit.jsx';
import { fmtDate, daysBetween } from '../../util.js';

export default function Leave() {
  const q = useAsync(() => api('/api/admin/leave'), []);
  const mutate = useMutate(q.reload);
  const all = q.data?.requests || [];
  const pend = all.filter((l) => l.status === 'pending');
  const done = all.filter((l) => l.status !== 'pending');
  const row = (l, actions) => {
    const n = daysBetween(l.from, l.to);
    return (
      <div className="pend" key={l.id}>
        <Person name={l.name} photo={l.photo} size={40} sub={<>{l.type} · {n} day{n > 1 ? 's' : ''} · {fmtDate(l.from)}{l.to !== l.from ? ` to ${fmtDate(l.to)}` : ''}<br />{l.reason}</>} />
        <span className="grow" />
        {actions ? (
          <>
            <button type="button" className="btn sm ok" onClick={() => mutate('PATCH', `/api/admin/leave/${l.id}`, { status: 'approved' }, 'Leave approved.')}>Approve</button>
            <button type="button" className="btn sm no" onClick={() => mutate('PATCH', `/api/admin/leave/${l.id}`, { status: 'rejected' }, 'Leave rejected.')}>Reject</button>
          </>
        ) : <Chip kind={l.status === 'approved' ? 'good' : 'bad'}>{l.status === 'approved' ? 'Approved' : 'Rejected'}</Chip>}
        <Confirm iconOnly label="Delete" ariaLabel="Delete request" onYes={() => mutate('DELETE', `/api/admin/leave/${l.id}`, undefined, 'Leave record deleted.')} />
      </div>
    );
  };
  return (
    <PageState q={q}>
      <div className="cols even">
        <div className="card"><h3 style={{ marginBottom: 4 }}>Pending requests</h3>{pend.length ? pend.map((l) => row(l, true)) : <p className="muted">No pending requests.</p>}</div>
        <div className="card"><h3 style={{ marginBottom: 4 }}>Decided</h3>{done.length ? done.map((l) => row(l, false)) : <p className="muted">Nothing decided yet.</p>}</div>
      </div>
    </PageState>
  );
}
