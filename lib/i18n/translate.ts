export type Messages = Record<string, string>;
export function translator(messages: Messages) {
  // Templates preserve names, numbers and original user content as captured values.
  const templates = Object.entries(messages).filter(([key]) => /\{\d+\}/.test(key)).sort(([a], [b]) => b.replace(/\{\d+\}/g, "").length - a.replace(/\{\d+\}/g, "").length).map(([key, value]) => ({
    expression: new RegExp("^" + key.split(/\{\d+\}/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("([\\s\\S]*?)") + "$"), value,
  }));
  return (source: string): string => {
    if (Object.hasOwn(messages, source)) return messages[source];
    const trimmed = source.trim();
    if (Object.hasOwn(messages, trimmed)) return source.replace(trimmed, messages[trimmed]);
    for (const template of templates) {
      const match = template.expression.exec(source);
      if (match) return template.value.replace(/\{(\d+)\}/g, (_, index) => match[Number(index) + 1] ?? "");
    }
    return source;
  };
}
