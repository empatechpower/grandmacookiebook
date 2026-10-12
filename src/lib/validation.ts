/** Validation rules shared by the browser (form attributes) and the server (actions). */
/** US phone number: 10 digits, optional +1 and any punctuation, e.g. (956) 555-0142. Empty is allowed. */
export const phoneOk = (v: string) => !v || /^\+?1?\D*\d{3}\D*\d{3}\D*\d{4}\D*$/.test(v);
/** Same rule for the browser (input pattern attribute). */
export const PHONE_PATTERN = "^\\+?1?\\D*\\d{3}\\D*\\d{3}\\D*\\d{4}\\D*$";

/** Strips spaces and hyphens: "978-1-4028-9462-6" → "9781402894626". */
export const normalizeIsbn = (v: string) => v.replace(/[\s-]/g, "").toUpperCase();

/** A valid ISBN-10 or ISBN-13 (checksum verified). Empty is allowed. */
export function isbnOk(v: string) {
  const s = normalizeIsbn(v);
  if (!s) return true;
  if (/^\d{9}[\dX]$/.test(s)) {
    const sum = [...s].reduce((acc, ch, i) => acc + (ch === "X" ? 10 : Number(ch)) * (10 - i), 0);
    return sum % 11 === 0;
  }
  if (/^97[89]\d{10}$/.test(s)) {
    const sum = [...s].reduce((acc, ch, i) => acc + Number(ch) * (i % 2 ? 3 : 1), 0);
    return sum % 10 === 0;
  }
  return false;
}

/** For display: 13-digit ISBNs as 978-…, others as stored. */
export const formatIsbn = (s: string) => (s.length === 13 ? `${s.slice(0, 3)}-${s.slice(3)}` : s);
