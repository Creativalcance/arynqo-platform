let translate = (message: string) => message;
/** Installed only by a browser effect; server requests never share this state. */
export function setBrowserTranslator(next: (message: string) => string) { translate = next; }
export function localizedAlert(message: unknown) { window.alert(translate(String(message))); }
export function localizedConfirm(message: string) { return window.confirm(translate(message)); }
