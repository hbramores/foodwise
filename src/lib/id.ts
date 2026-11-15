let counter = 0;

/** Collision-resistant id that does not depend on crypto availability. */
export function uid(prefix = "id"): string {
  counter += 1;
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${t}${counter.toString(36)}${r}`;
}
