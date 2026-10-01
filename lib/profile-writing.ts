export const writingFields = ["headline", "bio", "career_goals", "ai_summary"] as const;
export function writingInput(body: Record<string, unknown>) {
  return Object.fromEntries(writingFields.map(field => [field, typeof body[field] === "string" ? body[field] : ""]));
}
// Never accept model changes to identity, qualifications, skills, language levels,
// salary, classification or scores. Empty fields must remain empty.
export function safeWritingDraft(original: Record<string, unknown>, generated: Record<string, unknown>) {
  const draft = writingInput(original);
  for (const field of writingFields) {
    const source = draft[field];
    const proposed = generated[field];
    if (!source.trim() || typeof proposed !== "string" || !proposed.trim() || proposed.length > 10000) continue;
    // Numeric facts cannot be added, dropped or changed by a writing correction.
    const numbers = (text: string) => (text.match(/\d+(?:[.,]\d+)*/g) || []).sort().join("|");
    if (numbers(source) === numbers(proposed)) draft[field] = proposed;
  }
  return draft;
}
