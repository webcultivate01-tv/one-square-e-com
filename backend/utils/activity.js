import CustomerActivity from "../model/customerActivityModel.js";

/**
 * Append a row to the customer timeline.
 * NEVER throws — a logging failure must not fail the business operation.
 */
export const logActivity = async ({
  customer,
  type = "system",
  action = "",
  message = "",
  actor = null,
  context = {},
  meta = {},
}) => {
  try {
    if (!customer) return null;
    return await CustomerActivity.create({
      customer,
      type,
      action,
      message,
      actor: actor?.id || actor || null,
      actorName: actor?.name || "",
      actorRole: actor?.role || "",
      ip: context.ip || "",
      userAgent: context.userAgent || "",
      device: context.device || "",
      browser: context.browser || "",
      os: context.os || "",
      meta,
    });
  } catch (error) {
    console.warn("[activity] log failed:", error.message);
    return null;
  }
};

export default logActivity;
