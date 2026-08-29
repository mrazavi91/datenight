// Launch switch: sending invitations is free by default while the app grows its first
// users. Flip FREE_MODE=false in the environment once you're ready to charge — the Stripe
// checkout and token-spend paths are untouched and start working again immediately, no
// code changes needed.
export const freeMode = process.env.FREE_MODE !== "false";
