// Redact obvious secrets before anything is displayed or exported.
const RULES = [
  [/AKIA[0-9A-Z]{16}/g, "[aws-key]"],
  [/gh[pousr]_[A-Za-z0-9]{30,}/g, "[github-token]"],
  [/sk-ant-[A-Za-z0-9_-]{20,}/g, "[anthropic-key]"],
  [/sk_(live|test)_[A-Za-z0-9]{16,}/g, "[stripe-key]"],
  [/sk-[A-Za-z0-9]{32,}/g, "[api-key]"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----|$)/g, "[private-key]"],
  [/(Bearer\s+)[A-Za-z0-9._~+\/-]{24,}/g, "$1[token]"],
];
export function redact(s) {
  if (typeof s !== "string") return s;
  let n = 0;
  for (const [re, to] of RULES) s = s.replace(re, () => (n++, to));
  return s;
}
