import React, { useEffect, useRef, useState } from 'react';
import { Eraser, PenLine } from 'lucide-react';

/** Pointer-based signature capture; USB drawing tablets work as a normal pointer. */
export const SignatureCapture: React.FC<{ value?: string; onChange: (dataUrl: string) => void; label?: string }> = ({ value, onChange, label = 'Signature' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(Boolean(value));
  useEffect(() => { const canvas=canvasRef.current;if(!canvas||!value)return;const image=new Image();image.onload=()=>{const ctx=canvas.getContext('2d');if(ctx){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);setHasInk(true)}};image.src=value; }, [value]);
  const pos=(e:React.PointerEvent<HTMLCanvasElement>)=>{const r=e.currentTarget.getBoundingClientRect();return{x:(e.clientX-r.left)*e.currentTarget.width/r.width,y:(e.clientY-r.top)*e.currentTarget.height/r.height}};
  const start=(e:React.PointerEvent<HTMLCanvasElement>)=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);const c=e.currentTarget.getContext('2d');if(!c)return;const p=pos(e);c.beginPath();c.moveTo(p.x,p.y);drawing.current=true};
  const move=(e:React.PointerEvent<HTMLCanvasElement>)=>{if(!drawing.current)return;e.preventDefault();const c=e.currentTarget.getContext('2d');if(!c)return;const p=pos(e);c.lineCap='round';c.lineJoin='round';c.strokeStyle='#0f172a';c.lineWidth=Math.max(1.5,Math.min(4,e.pressure?e.pressure*4:2.5));c.lineTo(p.x,p.y);c.stroke();setHasInk(true)};
  const finish=(e:React.PointerEvent<HTMLCanvasElement>)=>{if(!drawing.current)return;drawing.current=false;const canvas=canvasRef.current;if(canvas)onChange(canvas.toDataURL('image/png'));if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)};
  const clear=()=>{const c=canvasRef.current,x=c?.getContext('2d');if(!c||!x)return;x.clearRect(0,0,c.width,c.height);setHasInk(false);onChange('')};
  return <div className="rounded-xl border border-white/10 bg-slate-950 p-3"><div className="mb-2 flex items-center justify-between"><label className="flex items-center gap-2 text-sm font-semibold text-slate-200"><PenLine className="h-4 w-4 text-blue-300"/>{label}</label><button type="button" onClick={clear} disabled={!hasInk} className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300 disabled:opacity-40"><Eraser className="h-3.5 w-3.5"/>Clear</button></div><canvas ref={canvasRef} width={900} height={260} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} className="h-36 w-full touch-none rounded-lg border border-dashed border-slate-500 bg-white cursor-crosshair" aria-label={`${label} drawing area`}/><p className="mt-2 text-[11px] text-slate-400">Draw with the XP-Pen tablet or mouse. The signature is saved with the PDL record.</p></div>;
};
