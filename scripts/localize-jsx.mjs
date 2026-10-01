import ts from "typescript";
import fs from "node:fs";
import path from "node:path";
const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ".");
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();
function clean(text) {
  const lines = text.replace(/\t/g, " ").split(/\r?\n/);
  let last = lines.length - 1; while (last >= 0 && !lines[last].trim()) last--;
  return lines.map((line, index) => { if (index > 0) line = line.replace(/^ +/, ""); if (index < lines.length - 1) line = line.replace(/ +$/, ""); return line && index < last ? line + " " : line; }).join("");
}
const attributes = new Set(["alt", "placeholder", "title", "aria-label", "href", "action"]);
function stringType(type) { return type.isUnion() ? type.types.every(t => (t.flags & (ts.TypeFlags.StringLike | ts.TypeFlags.Undefined | ts.TypeFlags.Null | ts.TypeFlags.Never)) !== 0) : (type.flags & ts.TypeFlags.StringLike) !== 0; }
let total = 0;
for (const source of program.getSourceFiles()) {
  const relative = path.relative(process.cwd(), path.resolve(source.fileName));
  if (!relative.startsWith("app/") || !source.fileName.endsWith(".tsx")) continue;
  if (source.text.includes('import { LText')) continue;
  const edits = [];
  let textUsed = false; let elementUsed = false;
  function visit(node) {
    if (ts.isJsxText(node)) {
      const text = clean(node.text);
      if (text.trim() && /[A-Za-zÀ-ÿ]/.test(text)) {
        edits.push({ start: node.getStart(source), end: node.end, text: `<LText text={${JSON.stringify(text)}} />` }); textUsed = true;
      }
      return;
    }
    if (ts.isJsxExpression(node) && node.expression && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      const expression = node.expression;
      if (stringType(checker.getTypeAtLocation(expression))) {
        edits.push({ start: node.getStart(source), end: node.end, text: `<LText text={${expression.getText(source)}} />` }); textUsed = true; return;
      }
    }
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      const tag = opening.tagName.getText(source);
      const attrs = opening.attributes.properties;
      if (/^[a-z]+$/.test(tag) && attrs.some(attr => ts.isJsxAttribute(attr) && attributes.has(attr.name.getText(source)))) {
        edits.push({ start: opening.tagName.getStart(source), end: opening.tagName.end, text: `LElement as="${tag}"` });
        if (ts.isJsxElement(node)) edits.push({ start: node.closingElement.tagName.getStart(source), end: node.closingElement.tagName.end, text: "LElement" });
        elementUsed = true;
      }
      // Keep option values in their original canonical representation when labels change.
      if (tag === "option" && !attrs.some(attr => ts.isJsxAttribute(attr) && attr.name.getText(source) === "value") && ts.isJsxElement(node)) {
        const meaningful = node.children.filter(child => !ts.isJsxText(child) || clean(child.text).trim());
        if (meaningful.length === 1) {
          const child = meaningful[0];
          const value = ts.isJsxText(child) ? `{${JSON.stringify(clean(child.text))}}` : ts.isJsxExpression(child) && child.expression ? `{${child.expression.getText(source)}}` : null;
          if (value) edits.push({ start: opening.tagName.end, end: opening.tagName.end, text: ` value=${value}` });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  let output = source.text;
  for (const edit of edits.sort((a, b) => b.start - a.start || b.end - a.end)) output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  if (textUsed || elementUsed) {
    const names = [textUsed ? "LText" : "", elementUsed ? "LElement" : ""].filter(Boolean).join(", ");
    const insertion = source.statements[0] && ts.isExpressionStatement(source.statements[0]) && source.statements[0].expression.text === "use client" ? source.statements[0].end : 0;
    output = output.slice(0, insertion) + `\nimport { ${names} } from "@/lib/i18n/client";\n` + output.slice(insertion);
  }
  output = output.replaceAll('from "next/link"', 'from "@/lib/i18n/link"').replaceAll('from "next/image"', 'from "@/lib/i18n/image"');
  output = output.replace(/import\s*\{([^}]+)\}\s*from\s*["']next\/navigation["'];?/g, (whole, imports) => {
    const names = imports.split(",").map(s => s.trim()).filter(Boolean);
    const local = names.filter(name => name === "useRouter" || name === "usePathname");
    const original = names.filter(name => !local.includes(name));
    return [original.length ? `import { ${original.join(", ")} } from "next/navigation";` : "", local.length ? `import { ${local.join(", ")} } from "@/lib/i18n/navigation";` : ""].filter(Boolean).join("\n");
  });
  if (output !== source.text) { fs.writeFileSync(source.fileName, output); total++; }
}
console.log(`Localized ${total} JSX files`);
