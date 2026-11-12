import React, { useEffect, useState } from 'react';
import { UserProfile } from '../../types';
import { WorkerDashboard } from './WorkerDashboard';
import { VisitorOperationsDesk } from './VisitorOperationsDesk';

const supportedDuties = ['GATE', 'RECORDS'] as const;
const dutyLabels: Record<string, string> = { GATE: 'Visitor check-in / check-out', RECORDS: 'PDL intake records' };

export function OfficerWorkspace({ user }: { user: UserProfile }) {
  const duties = (user.officerDuties || []).filter((duty) => supportedDuties.includes(duty as (typeof supportedDuties)[number]));
  const [tab, setTab] = useState(duties[0] || '');
  useEffect(() => setTab(duties[0] || ''), [user.id, JSON.stringify(duties)]);
  return <div className="mx-auto max-w-7xl px-4 py-6 text-slate-100">
    <header><h1 className="text-2xl font-bold">Officer workspace</h1><p className="mt-2 text-sm text-slate-400">{user.firstName} {user.lastName} · {user.badgeNumber}</p></header>
    {duties.length > 1 && <nav className="my-5 flex flex-wrap gap-2">{duties.map((duty) => <button key={duty} type="button" className="rounded-lg border border-slate-700 px-4 py-2 text-sm" aria-pressed={tab === duty} onClick={() => setTab(duty)}>{dutyLabels[duty] || duty}</button>)}</nav>}
    {tab === 'GATE' && <VisitorOperationsDesk user={user}/>}
    {tab === 'RECORDS' && <WorkerDashboard user={user}/>}
    {!tab && <p className="mt-5 rounded-lg border border-slate-700 p-4 text-sm text-slate-300">No active duties are assigned. Contact the administrator.</p>}
  </div>;
}