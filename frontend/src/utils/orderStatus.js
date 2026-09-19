// Mirrors backend/model/orderRequestModel.js — statuses only move forward.
// "converted" is what the backend stores for a confirmed order.
export const ORDER_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "contacted", label: "Contacted" },
  { value: "converted", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "spam", label: "Spam" },
  { value: "not_interested", label: "Not interested" },
];

const RANK = { pending: 0, contacted: 1, converted: 2, cancelled: 2, spam: 2, not_interested: 2, completed: 3 };
const RESTORABLE = ["spam", "not_interested"];

export const canMoveStatus = (from, to) => {
  if (from === to) return true;
  if (to === "completed") return from === "converted";
  if (to === "pending" && RESTORABLE.includes(from)) return true;
  return RANK[to] >= RANK[from];
};

/** Options a status dropdown may offer for a request currently in `current`. */
export const allowedStatusOptions = (current) => ORDER_STATUS_OPTIONS.filter((o) => canMoveStatus(current, o.value));
