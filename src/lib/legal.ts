/**
 * Business details used on the legal and contact pages. Set these in the
 * environment before launch; the bracketed placeholders show until you do.
 */
export const LEGAL = {
  company: process.env.LEGAL_COMPANY_NAME || "[Company legal name]",
  address: process.env.LEGAL_ADDRESS || "[Registered business address]",
  jurisdiction: process.env.LEGAL_JURISDICTION || "[Governing law, e.g. the State of Delaware]",
  email: process.env.SUPPORT_EMAIL || "support@your-domain.com",
  updated: "29 September 2026",
};
export const legalIsPlaceholder = LEGAL.company.startsWith("[");
