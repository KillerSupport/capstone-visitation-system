export type AppDialogTone = 'default' | 'warning' | 'danger' | 'success';
export type AppDialogKind = 'confirm' | 'prompt' | 'alert';
export type AppDialogResult = boolean | string | null;

export type AppDialogOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: AppDialogTone;
  inputLabel?: string;
  placeholder?: string;
  required?: boolean;
};

export type AppDialogRequest = AppDialogOptions & {
  id: number;
  kind: AppDialogKind;
  message: string;
  resolve: (result: AppDialogResult) => void;
};

export const APP_DIALOG_EVENT = 'bjmp:app-dialog-request';
let nextDialogId = 1;

function dispatchDialog(kind: AppDialogKind, message: string, options: AppDialogOptions, resolve: AppDialogRequest['resolve']) {
  const request: AppDialogRequest = { id: nextDialogId++, kind, message, ...options, resolve };
  window.dispatchEvent(new CustomEvent<AppDialogRequest>(APP_DIALOG_EVENT, { detail: request }));
}

export function confirmAction(message: string, options: AppDialogOptions = {}) {
  return new Promise<boolean>(resolve => dispatchDialog('confirm', message, options, result => resolve(result === true)));
}

export function promptAction(message: string, options: AppDialogOptions = {}) {
  return new Promise<string | null>(resolve => dispatchDialog('prompt', message, options, result => resolve(typeof result === 'string' ? result : null)));
}

export function alertAction(message: string, options: AppDialogOptions = {}) {
  return new Promise<void>(resolve => dispatchDialog('alert', message, options, () => resolve()));
}
