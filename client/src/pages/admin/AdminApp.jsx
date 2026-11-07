import { useCallback, useMemo } from 'react';
import { useRouter } from '../../router.jsx';
import { useAuth } from '../../auth.jsx';
import { api } from '../../api.js';
import { Icon, Avatar, useAsync } from '../../ui.jsx';
import { CountsCtx } from '../../kit.jsx';
import Overview from './Overview.jsx';
import Approvals from './Approvals.jsx';
import Production from './Production.jsx';
import WorkLog from './WorkLog.jsx';
import Employees from './Employees.jsx';
import EmployeeFile from './EmployeeFile.jsx';
import Teams from './Teams.jsx';
import Advances from './Advances.jsx';
import Leave from './Leave.jsx';
import Costing from './Costing.jsx';
import Petty from './Petty.jsx';
import Inventory from './Inventory.jsx';
import Salary from './Salary.jsx';
import Report from './Report.jsx';
import Devices from './Devices.jsx';
import Settings from './Settings.jsx';

const NAV = [
  ['Workspace', [['', 'Overview', 'home'], ['approvals', 'Approvals', 'check'], ['production', 'Production', 'gantt'], ['work', 'Work log', 'clip']]],
  ['People', [['employees', 'Employees', 'users'], ['teams', 'Teams', 'team'], ['advances', 'Advances', 'adv'], ['leave', 'Leave', 'sun']]],
  ['Business', [['costing', 'Costing', 'tag'], ['petty', 'Petty cash', 'wallet'], ['inventory', 'Inventory', 'box']]],
  ['Reports', [['salary', 'Salary', 'rupee'], ['report', 'Monthly report', 'cal']]],
  ['Security', [['devices', 'Devices', 'shield'], ['settings', 'Settings', 'gear']]],
];
const PAGES = {
  '': [Overview, 'Overview', 'Live view of the workshop today'],
  approvals: [Approvals, 'Approvals', 'Approve hours and set the day type'],
  production: [Production, 'Production tracking', 'Live status, people and timeline of every item being made'],
  work: [WorkLog, 'Daily work log', 'What every employee worked on'],
  employees: [Employees, 'Employees', 'Add, remove and manage staff, teams and rates'],
  teams: [Teams, 'Teams', 'Who works in which team and who leads it'],
  advances: [Advances, 'Advances', 'Money given to employees and deducted from salary'],
  leave: [Leave, 'Leave', 'Review leave requests'],
  costing: [Costing, 'Product costing', 'Bill of quantities: material, labour and other cost of each product'],
  petty: [Petty, 'Petty cash', 'Balance and daily spending'],
  inventory: [Inventory, 'Inventory', 'Stock, requests and the order list'],
  salary: [Salary, 'Salary report', 'Approved hours × hourly rate − advances'],
  report: [Report, 'Monthly report', 'Attendance with half day, double shift and Sunday off'],
  devices: [Devices, 'Devices', 'Authorized company mobile and blocked phones'],
  settings: [Settings, 'Settings', 'Company, workshop location and work types'],
};

export default function AdminApp() {
  const { path, navigate } = useRouter();
  const { user, logout } = useAuth();
  const counts = useAsync(() => api('/api/admin/counts'), []);
  const ctx = useMemo(() => ({ refresh: counts.reload }), [counts.reload]);
  const rest = path.replace(/^\/admin\/?/, '');
  const [seg, id] = rest.split('/');
  const key = PAGES[seg] ? seg : seg === 'employee' ? 'employees' : '';
  const isFile = seg === 'employee' && id;
  const [Page, title, sub] = isFile ? [EmployeeFile, 'Employee file', 'Full record, edit any past month, advances and net pay'] : PAGES[key];
  const c = counts.data || {};
  const badge = { approvals: c.approvals, leave: c.leave, inventory: c.requests };
  const go = useCallback((to) => (e) => { e.preventDefault(); navigate(to ? `/admin/${to}` : '/admin'); }, [navigate]);

  return (
    <CountsCtx.Provider value={ctx}>
      <div className="shell">
        <aside className="side">
          <div className="sbrand">
            <img className="logo" src="/logo.png" alt="" width="38" />
            <div><b>Avya Woodcraft LLP</b><small>Operations console</small></div>
          </div>
          <nav className="snav" aria-label="Admin sections">
            {NAV.map(([group, items]) => (
              <div key={group} style={{ display: 'contents' }}>
                <div className="sgroup">{group}</div>
                {items.map(([to, label, icon]) => (
                  <a key={to} href={to ? `/admin/${to}` : '/admin'} className={`nv${key === to && !isFile ? ' on' : ''}${isFile && to === 'employees' ? ' on' : ''}`} onClick={go(to)} aria-current={key === to ? 'page' : undefined}>
                    <Icon name={icon} size={18} />{label}{badge[to] ? <em>{badge[to]}</em> : null}
                  </a>
                ))}
              </div>
            ))}
          </nav>
          <div className="suser"><Avatar name="Main Admin" size={34} /><div><b>Main Admin</b><small>{user.email || 'admin'}</small></div></div>
          <button type="button" className="nv" style={{ marginTop: 8 }} onClick={logout}><Icon name="out" size={18} />Log out</button>
        </aside>
        <main className="main gut">
          <div className="top">
            <div className="tl"><div><h1>{title}</h1><p className="muted small">{sub}</p></div></div>
            <div className="tr"><button type="button" className="btn sm" onClick={logout}><Icon name="out" size={14} /> Log out</button></div>
          </div>
          <Page id={isFile ? id : undefined} />
        </main>
      </div>
    </CountsCtx.Provider>
  );
}
