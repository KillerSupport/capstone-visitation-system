import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleHelp, Info, X } from 'lucide-react';
import { APP_DIALOG_EVENT, AppDialogRequest, AppDialogResult } from '../../utils/appDialogs';

export function AppDialogHost() {
  const [queue, setQueue] = useState<AppDialogRequest[]>([]);
  const [input, setInput] = useState('');
  const [validation, setValidation] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const active = queue[0] || null;

  useEffect(() => {
    const enqueue = (event: Event) => {
      const request = (event as CustomEvent<AppDialogRequest>).detail;
      setQueue(current => [...current, request]);
    };
    window.addEventListener(APP_DIALOG_EVENT, enqueue);
    return () => window.removeEventListener(APP_DIALOG_EVENT, enqueue);
  }, []);

  useEffect(() => {
    setInput('');
    setValidation('');
    if (active) window.setTimeout(() => (active.kind === 'prompt' ? inputRef.current : confirmRef.current)?.focus(), 0);
  }, [active?.id]);

  const finish = (result: AppDialogResult) => {
    if (!active) return;
    active.resolve(result);
    setQueue(current => current.slice(1));
  };
  const cancel = () => finish(active?.kind === 'confirm' ? false : null);
  const accept = () => {
    if (!active) return;
    if (active.kind === 'prompt') {
      if (active.required !== false && !input.trim()) {
        setValidation('Enter a reason before continuing.');
        inputRef.current?.focus();
        return;
      }
      finish(input.trim());
      return;
    }
    finish(active.kind === 'confirm');
  };

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); cancel(); }
      if (active.kind === 'prompt' && (event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); accept(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active?.id, input]);

  if (!active) return null;
  const tone = active.tone || 'default';
  const title = active.title || (active.kind === 'prompt' ? 'Additional information' : active.kind === 'alert' ? 'Notice' : 'Please confirm');
  const ToneIcon = tone === 'danger' ? AlertTriangle : tone === 'success' ? CheckCircle2 : tone === 'warning' ? CircleHelp : Info;

  return <div className="app-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) cancel(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="app-dialog-title" aria-describedby="app-dialog-message" className="app-dialog-card">
      <header className="app-dialog-header">
        <span className={`app-dialog-icon app-dialog-tone-${tone}`}><ToneIcon size={21}/></span>
        <div className="min-w-0 flex-1"><h2 id="app-dialog-title" className="app-dialog-title">{title}</h2><p id="app-dialog-message" className="app-dialog-message">{active.message}</p></div>
        <button type="button" onClick={cancel} className="app-dialog-close" aria-label="Close dialog"><X size={18}/></button>
      </header>
      {active.kind === 'prompt' && <div className="app-dialog-field">
        <label htmlFor="app-dialog-input">{active.inputLabel || 'Reason'}</label>
        <textarea id="app-dialog-input" ref={inputRef} rows={3} maxLength={1000} value={input} onChange={event => { setInput(event.target.value); setValidation(''); }} placeholder={active.placeholder || 'Type here…'} aria-invalid={Boolean(validation)} aria-describedby={validation ? 'app-dialog-validation' : undefined}/>
        {validation && <p id="app-dialog-validation" role="alert" className="app-dialog-validation">{validation}</p>}
        <p className="app-dialog-hint">{input.length}/1000 characters · Ctrl+Enter to continue</p>
      </div>}
      <footer className="app-dialog-actions">
        {active.kind !== 'alert' && <button type="button" onClick={cancel} className="app-dialog-cancel">{active.cancelLabel || 'Cancel'}</button>}
        <button type="button" ref={confirmRef} onClick={accept} className={`app-dialog-confirm app-dialog-confirm-${tone}`}>{active.confirmLabel || (active.kind === 'alert' ? 'OK' : active.kind === 'prompt' ? 'Continue' : 'Confirm')}</button>
      </footer>
    </section>
  </div>;
}
