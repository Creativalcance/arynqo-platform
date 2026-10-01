import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

const files = [];
function walk(directory) { for (const item of fs.readdirSync(directory, { withFileTypes: true })) { const file = path.join(directory, item.name); if (item.isDirectory()) walk(file); else if (/\.tsx?$/.test(file)) files.push(file); } }
walk("app"); walk("lib");
const messages = new Set(fs.existsSync("lib/i18n/messages/pt.json") ? Object.keys(JSON.parse(fs.readFileSync("lib/i18n/messages/pt.json", "utf8"))) : []);
const ignored = new Set(["className", "class", "id", "key", "htmlFor", "href", "src", "rel", "target", "type", "name", "value", "role", "method", "action", "dateTime", "autoComplete", "viewBox", "fill", "stroke", "d", "xmlns", "fontFamily", "color", "background"]);
export function jsxText(text) {
  const lines = text.replace(/\t/g, " ").split(/\r?\n/);
  let last = lines.length - 1; while (last >= 0 && !lines[last].trim()) last--;
  return lines.map((line, index) => {
    if (index > 0) line = line.replace(/^ +/, "");
    if (index < lines.length - 1) line = line.replace(/ +$/, "");
    return line && index < last ? line + " " : line;
  }).join("");
}
function include(value, ui = false) {
  const text = value.trim();
  if (!text || !/[A-Za-zÀ-ÿ]/.test(text) || (!ui && /^[a-z0-9_./:#@?=-]+$/i.test(text) && !/^[A-Z][a-z]+$/.test(text)) || /^[/?<&]/.test(text) || text.includes("%s") || text.includes("@/lib") || text.includes("<table") || text.includes("SELECT ") || text.includes("\n- ") || text.length > 5000) return;
  if (/\b(?:rounded-|text-\[|border-|flex |grid |px-|w-full|font-semibold|from\(|Bearer |https?:\/\/|require\(|import |use client|application\/json)\b/.test(text)) return;
  messages.add(text);
}
for (const file of files) {
  if ((file.startsWith("lib/i18n/") && !file.endsWith("client.tsx")) || file.endsWith(".json")) continue;
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  function visit(node) {
    if (ts.isJsxText(node)) include(jsxText(node.text), true);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const parent = node.parent;
      if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent) || ts.isLiteralTypeNode(parent)) return;
      if (ts.isJsxAttribute(parent) && ignored.has(parent.name.getText(source))) return;
      if (ts.isPropertyAssignment(parent) && ["id", "key", "href", "className", "style", "src", "number"].includes(parent.name.getText(source).replaceAll('"', ""))) return;
      include(node.text);
    }
    if (ts.isTemplateExpression(node)) include(node.head.text + node.templateSpans.map((span, index) => `{${index}}${span.literal.text}`).join(""));
    ts.forEachChild(node, visit);
  }
  visit(source);
}
for (const post of JSON.parse(fs.readFileSync("lib/i18n/academy-source.json", "utf8"))) {
  include(post.title, true); include(post.excerpt, true);
  for (const line of post.content.split(/\r?\n/).filter(Boolean)) {
    include(line, true); include(line.replace(/^#+\s*|^-\s*/, ""), true); include(line.replace(/^- /, "• "), true);
  }
}
fs.mkdirSync("lib/i18n/messages", { recursive: true });
for (const key of Object.keys(JSON.parse(fs.readFileSync("scripts/i18n-overrides.json", "utf8")))) messages.add(key);
const entries = [...messages].sort();
fs.writeFileSync("lib/i18n/messages/pt.json", JSON.stringify(Object.fromEntries(entries.map(text => [text, text])), null, 2) + "\n");
console.log(`${entries.length} messages; ${entries.reduce((sum, text) => sum + text.length, 0)} source characters`);
