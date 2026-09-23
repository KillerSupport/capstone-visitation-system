import React, { useState } from 'react';
import { PDLBodyMark, BodyMarkKind, BodyMarkView } from '../../types';

interface BodyMarkPickerProps {
  marks: PDLBodyMark[];
  onChange: (marks: PDLBodyMark[]) => void;
}

const labelForView: Record<BodyMarkView, string> = {
  FRONT: 'Front view',
  BACK: 'Back view',
};

export const BodyMarkPicker: React.FC<BodyMarkPickerProps> = ({ marks, onChange }) => {
  const [view, setView] = useState<BodyMarkView>('FRONT');
  const [kind, setKind] = useState<BodyMarkKind>('Tattoo');

  const addMark = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(3, Math.min(97, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(3, Math.min(97, ((event.clientY - rect.top) / rect.height) * 100));
    const nextNumber = marks.length + 1;
    onChange([...marks, {
      id: `mark-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      view,
      x: Number(x.toFixed(1)),
      y: Number(y.toFixed(1)),
      kind,
      description: `${kind} #${nextNumber} - ${labelForView[view]} body chart`,
    }]);
  };

  const updateMark = (id: string, patch: Partial<PDLBodyMark>) =>
    onChange(marks.map((mark) => mark.id === id ? { ...mark, ...patch } : mark));

  return (
    <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h5 className="font-bold text-amber-300">Digital tattoo and body-mark chart</h5>
          <p className="text-[11px] text-slate-400">Worker-assisted: choose a mark type, then click the body chart to place a numbered circle.</p>
        </div>
        <select value={kind} onChange={(e) => setKind(e.target.value as BodyMarkKind)} className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100">
          <option>Tattoo</option><option>Scar</option><option>Birthmark</option><option>Other</option>
        </select>
      </div>

      <div className="flex gap-2">
        {(['FRONT', 'BACK'] as BodyMarkView[]).map((item) => (
          <button key={item} type="button" onClick={() => setView(item)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${view === item ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
            {labelForView[item]}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-[260px] rounded-xl border border-slate-600 bg-white p-2">
        <svg viewBox="0 0 180 330" onClick={addMark} className="h-[360px] w-full cursor-crosshair select-none" role="img" aria-label={`${labelForView[view]} body chart. Click to mark a tattoo, scar, or birthmark.`}>
          <rect width="180" height="330" fill="#f8fafc" />
          <text x="90" y="18" textAnchor="middle" fontSize="10" fontWeight="700" fill="#334155">{labelForView[view].toUpperCase()} - CLICK TO MARK</text>
          <circle cx="90" cy="52" r="22" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
          <path d="M62 86 Q90 70 118 86 L128 160 L112 205 L108 300 L94 300 L90 222 L86 300 L72 300 L68 205 L52 160 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
          <path d="M62 91 L31 157 L43 164 L72 119 M118 91 L149 157 L137 164 L108 119" fill="none" stroke="#475569" strokeWidth="14" strokeLinecap="round" />
          {view === 'BACK' && <path d="M72 105 Q90 122 108 105 M76 145 Q90 155 104 145" fill="none" stroke="#94a3b8" strokeWidth="2" />}
          {marks.filter((mark) => mark.view === view).map((mark, index) => (
            <g key={mark.id} transform={`translate(${(mark.x / 100) * 180}, ${(mark.y / 100) * 330})`} onClick={(event) => event.stopPropagation()}>
              <circle r="10" fill="#dc2626" stroke="white" strokeWidth="2" />
              <text textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="700" fill="white">{marks.indexOf(mark) + 1}</text>
            </g>
          ))}
        </svg>
      </div>

      {marks.length > 0 && <div className="space-y-2">
        {marks.map((mark, index) => (
          <div key={mark.id} className="grid grid-cols-[auto_110px_1fr_auto] items-center gap-2 rounded-lg bg-slate-950 p-2 text-xs">
            <span className="font-bold text-amber-400">#{index + 1}</span>
            <select value={mark.kind} onChange={(e) => updateMark(mark.id, { kind: e.target.value as BodyMarkKind })} className="bg-slate-900 border border-slate-700 rounded p-1 text-slate-100"><option>Tattoo</option><option>Scar</option><option>Birthmark</option><option>Other</option></select>
            <input value={mark.description} onChange={(e) => updateMark(mark.id, { description: e.target.value })} aria-label={`Description for body mark ${index + 1}`} className="min-w-0 bg-slate-900 border border-slate-700 rounded p-1 text-slate-100" />
            <button type="button" onClick={() => onChange(marks.filter((item) => item.id !== mark.id))} className="text-rose-400 hover:text-rose-300">Remove</button>
          </div>
        ))}
      </div>}
    </section>
  );
};
