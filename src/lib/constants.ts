export const ROLES = ["BUYER", "AUTHOR", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  BUYER: "Guest",
  AUTHOR: "Author",
  ADMIN: "Super admin",
};

export const CATEGORIES = [
  { value: "children", label: "Children" },
  { value: "stem", label: "STEM" },
  { value: "sel", label: "SEL" },
  { value: "fiction", label: "Fiction" },
  { value: "nonfiction", label: "Non-fiction" },
  { value: "gifts", label: "Gift sets & merchandise" },
] as const;

export const FORMATS = [
  { value: "IN_PERSON", label: "In person" },
  { value: "VIRTUAL", label: "Virtual" },
  { value: "HYBRID", label: "Hybrid" },
] as const;

export const categoryLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? v;
export const formatLabel = (v: string) => FORMATS.find((f) => f.value === v)?.label ?? v;

// Badge color per status, using the design's b-ok / b-wait / b-off classes.
export function statusBadge(status: string) {
  if (["APPROVED", "ACTIVE", "CONFIRMED", "COMPLETED", "PAID", "SHIPPED", "DELIVERED", "OPEN", "AWARDED"].includes(status)) return "b-ok";
  if (["PENDING", "ACCEPTED", "REQUESTED"].includes(status)) return "b-wait";
  return "b-off";
}

export const statusLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

// ---------- Author directory vocabularies ----------
type Opt = { value: string; label: string };

export const TOPICS: Opt[] = [
  { value: "sel", label: "SEL" },
  { value: "stem", label: "STEM" },
  { value: "literacy", label: "Literacy & reading" },
  { value: "writing", label: "Writing & publishing" },
  { value: "confidence", label: "Confidence & self-discovery" },
  { value: "anti-bullying", label: "Anti-bullying & kindness" },
  { value: "mental-health", label: "Mental health & wellbeing" },
  { value: "diversity", label: "Diversity & inclusion" },
  { value: "history", label: "History & culture" },
  { value: "nature", label: "Nature & animals" },
  { value: "arts", label: "Art & creativity" },
  { value: "leadership", label: "Leadership & careers" },
  { value: "family", label: "Family & community" },
];

export const GRADES: Opt[] = [
  { value: "prek", label: "Pre-K" },
  { value: "k2", label: "K–2" },
  { value: "g35", label: "Grades 3–5" },
  { value: "g68", label: "Grades 6–8" },
  { value: "g912", label: "Grades 9–12" },
  { value: "college", label: "College" },
  { value: "adult", label: "Adults & corporate" },
];

export const LANGUAGES: Opt[] = [
  { value: "english", label: "English" },
  { value: "spanish", label: "Spanish" },
  { value: "french", label: "French" },
  { value: "portuguese", label: "Portuguese" },
  { value: "arabic", label: "Arabic" },
  { value: "mandarin", label: "Chinese (Mandarin)" },
  { value: "vietnamese", label: "Vietnamese" },
  { value: "tagalog", label: "Tagalog" },
  { value: "korean", label: "Korean" },
  { value: "asl", label: "American Sign Language" },
];

export const IDENTITIES: Opt[] = [
  { value: "black-owned", label: "#BlackOwned" },
  { value: "aapi-owned", label: "#AAPIOwned" },
  { value: "hispanic-owned", label: "#HispanicOwned" },
  { value: "women-owned", label: "#WomenOwned" },
  { value: "lgbtq-owned", label: "#LGBTQOwned" },
  { value: "veteran-owned", label: "#VeteranOwned" },
  { value: "bilingual", label: "#Bilingual" },
];

export const BUDGETS = [250, 500, 1000, 2000, 5000];

export const labelsFor = (opts: Opt[], values: string[]) =>
  values.map((v) => opts.find((o) => o.value === v)?.label).filter(Boolean) as string[];

export const CONTACT_TOPICS = ["General question", "Booking help", "Refund or problem with an order", "Becoming an author", "Partnerships & press"];

export const ORG_TYPES = [
  { value: "SCHOOL", label: "School" },
  { value: "LIBRARY", label: "Library" },
  { value: "BUSINESS", label: "Business" },
  { value: "NONPROFIT", label: "Nonprofit / community group" },
  { value: "INDIVIDUAL", label: "Individual / family" },
];
export const orgTypeLabel = (v: string | null | undefined) => ORG_TYPES.find((o) => o.value === v)?.label ?? null;

export const ISSUE_REASONS = {
  item: [
    { value: "NOT_RECEIVED", label: "The book never arrived" },
    { value: "DAMAGED", label: "It arrived damaged" },
    { value: "NOT_AS_DESCRIBED", label: "Not what was described" },
    { value: "OTHER", label: "Something else" },
  ],
  booking: [
    { value: "NO_SHOW", label: "The author didn't show up" },
    { value: "NOT_AS_DESCRIBED", label: "The visit wasn't as agreed" },
    { value: "OTHER", label: "Something else" },
  ],
};
export const issueReasonLabel = (v: string) =>
  [...ISSUE_REASONS.item, ...ISSUE_REASONS.booking].find((r) => r.value === v)?.label ?? v;
