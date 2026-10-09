/** Validation rules shared by the browser (form attributes) and the server (actions). */
/** US phone number: 10 digits, optional +1 and any punctuation, e.g. (956) 555-0142. Empty is allowed. */
export const phoneOk = (v: string) => !v || /^\+?1?\D*\d{3}\D*\d{3}\D*\d{4}\D*$/.test(v);
/** Same rule for the browser (input pattern attribute). */
export const PHONE_PATTERN = "^\\+?1?\\D*\\d{3}\\D*\\d{3}\\D*\\d{4}\\D*$";
