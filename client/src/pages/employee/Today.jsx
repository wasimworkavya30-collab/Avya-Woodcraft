import { useEffect, useRef, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { useAsync, useToast, Icon, Chip, Spinner, ErrorBox, Avatar } from '../../ui.jsx';
import { fmtTime, fmtDate, hrs, inr, photoToJpeg, getPosition, STATUS_LABEL, currentMonth } from '../../util.js';

function Gate({ ok, title, sub }) {
  return (
    <div className={`gate ${ok === true ? 'ok' : ok === false ? 'bad' : ''}`}>
      <span className="gi">{ok === true ? <Icon name="check" size={16} /> : ok === false ? '✕' : '–'}</span>
      <div><b>{title}</b><span className="small muted">{sub}</span></div>
    </div>
  );
}

export default function Today() {
  const { user } = useAuth();
  const toast = useToast();
  const today = useAsync(() => api('/api/employee/today'), []);
  const dev = useAsync(() => api('/api/device/status'), []);
  const pay = useAsync(() => api(`/api/employee/attendance?month=${currentMonth()}`), []);
  const fileRef = useRef();
  const [selfie, setSelfie] = useState(null);
  const [gps, setGps] = useState(null);
  const [busy, setBusy] = useState(false);

  if (today.loading && !today.data) return <Spinner />;
  if (today.error) return <ErrorBox error={today.error} onRetry={today.reload} />;
  const { attendance: att, onLeave, employee } = today.data;
  const open = att?.status === 'open';
  const done = att && !open;
  const isCompany = dev.data?.authorized;

  async function onPick(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      setSelfie(await photoToJpeg(f));
    } catch (err) {
      toast(err.message, true);
    }
  }
  async function locate() {
    try {
      const p = await getPosition();
      setGps(p);
      return p;
    } catch (err) {
      toast(err.message, true);
      return null;
    }
  }
  async function punch(kind) {
    if (!selfie) return toast('Take a selfie first.', true);
    setBusy(true);
    try {
      const p = gps || (await locate());
      if (!p) return;
      await api(`/api/employee/${kind}`, { method: 'POST', body: { lat: p.lat, lng: p.lng, accuracy: p.accuracy, selfie } });
      toast(kind === 'check-in' ? 'Checked in. Have a good shift.' : 'Checked out. Sent for approval.');
      setSelfie(null);
      setGps(null);
      today.reload();
      pay.reload();
    } catch (err) {
      toast(err.message, true);
    } finally {
      setBusy(false);
    }
  }

  const status = open ? ['good', `Checked in at ${fmtTime(att.check_in_at)}`] : done ? ['', STATUS_LABEL[att.status] || 'Day complete'] : onLeave ? ['warn', 'On approved leave'] : ['warn', 'Not checked in'];
  const t = pay.data?.totals;
  return (
    <div className="stack">
      <div className="hero">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Avatar name={user.name} size={46} />
          <div><b style={{ fontSize: '1.05rem' }}>{user.name}</b><div className="small" style={{ color: '#AEB9D6' }}>{employee.roleTitle}</div></div>
        </div>
        <span className="cap" style={{ marginTop: 10 }}>{fmtDate(today.data.today)}</span>
        <Clock />
        <div className="row"><Chip kind={status[0]}>{status[1]}</Chip><span className="small" style={{ color: '#AEB9D6' }}>{inr(employee.hourlyRate)} per hour</span></div>
      </div>

      <div className="card">
        <div className="gates">
          <Gate ok={dev.loading ? null : Boolean(isCompany)} title="Device" sub={isCompany ? 'Authorized company mobile' : 'This is not the company mobile. Attendance is blocked.'} />
          <Gate ok={gps ? true : null} title="Location" sub={gps ? `GPS ready (accuracy ${Math.round(gps.accuracy)} m). The server checks the distance.` : 'GPS is read when you check in or out.'} />
          <Gate ok={selfie ? true : null} title="Selfie" sub={selfie ? 'Selfie ready for this punch.' : 'Take a fresh selfie before each punch.'} />
        </div>
      </div>

      {!done && !onLeave && (
        <>
          <div className="card">
            <div className="selfie-row">
              <div className="selfie-prev">{selfie ? <img src={selfie} alt="Your selfie preview" /> : 'No selfie yet'}</div>
              <div className="grow" style={{ minWidth: 160 }}>
                <b>Selfie verification</b>
                <p className="small muted" style={{ margin: '2px 0 10px' }}>The admin sees this photo with your punch.</p>
                <input ref={fileRef} type="file" accept="image/*" capture="user" hidden onChange={onPick} />
                <button className="btn sm" onClick={() => fileRef.current.click()}><Icon name="cam" size={14} /> {selfie ? 'Retake' : 'Take selfie'}</button>
              </div>
            </div>
          </div>
          {open ? (
            <button className="btn primary big" disabled={busy} onClick={() => punch('check-out')}>{busy ? 'Please wait…' : 'Check out'}</button>
          ) : (
            <button className="btn primary big" disabled={busy} onClick={() => punch('check-in')}>{busy ? 'Please wait…' : 'Check in'}</button>
          )}
        </>
      )}
      {done && <button className="btn big" disabled>Attendance done for today</button>}

      {t && (
        <div className="card">
          <div className="pay">
            <div><span className="cap">Payable this month</span><div className="big num">{inr(t.payable)}</div></div>
            <div className="formula">{hrs(t.approvedHours)} approved × {inr(t.hourlyRate)}</div>
          </div>
          <p className="small muted" style={{ margin: '10px 0 0' }}>{t.days} days. {t.pendingHours > 0 ? `${hrs(t.pendingHours)} waiting for approval.` : 'No hours waiting for approval.'}</p>
        </div>
      )}
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <div className="clock">{now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</div>;
}
