import { fromDayKey, todayKey } from "./dates";

/** A request is biddable while OPEN and its deadline hasn't passed. */
export const rfpIsOpen = (r: { status: string; deadline: Date }) => r.status === "OPEN" && r.deadline >= fromDayKey(todayKey());

export const rfpStatus = (r: { status: string; deadline: Date }) =>
  r.status === "OPEN" && !rfpIsOpen(r) ? "BIDDING_CLOSED" : r.status;

export const RFP_FORMATS = [
  { value: "ANY", label: "Either" },
  { value: "IN_PERSON", label: "In person" },
  { value: "VIRTUAL", label: "Virtual" },
];
