export function esSemillaDemo(env: { SEED_DEMO?: string } = { SEED_DEMO: process.env.SEED_DEMO }) {
  return env.SEED_DEMO === "true"
}
