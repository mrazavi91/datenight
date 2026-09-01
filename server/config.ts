// Used to build absolute links inside emails sent from contexts with no browser request to
// read an origin from (the Stripe webhook, background credit reconciliation). Routes that do
// have a request prefer `${req.protocol}://${req.get("host")}` instead — this is the fallback.
export const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
