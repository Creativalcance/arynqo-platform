import { Fragment } from "react";
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
        if (
          link &&
          (/^https:\/\//.test(link[2]) ||
            (/^\/(?!\/)/.test(link[2]) && !link[2].includes("\\")))
        )
          return (
            <a
              key={i}
              href={link[2]}
              className="break-words text-blue-700 underline"
              {...(link[2].startsWith("https:")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {link[1]}
            </a>
          );
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
export default function AcademyContent({ content }: { content: string }) {
  const lines = content.split(/\r?\n/).map((line) => line.trim());
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const header = /^(#{2,3}) (.*)$/.exec(line);
    if (header) {
      const Heading = header[1] === "##" ? "h2" : "h3";
      blocks.push(
        <Heading
          key={i}
          id={`section-${i}`}
          className="pt-5 text-2xl font-bold"
        >
          <Inline text={header[2]} />
        </Heading>,
      );
      continue;
    }
    if (line.startsWith("- ")) {
      const start = i,
        items = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(
          <li key={i}>
            <Inline text={lines[i].slice(2)} />
          </li>,
        );
        i++;
      }
      i--;
      blocks.push(
        <ul key={start} className="list-disc space-y-3 pl-6 leading-7">
          {items}
        </ul>,
      );
      continue;
    }
    blocks.push(
      <p key={i} className="break-words text-base leading-8">
        <Inline text={line} />
      </p>,
    );
  }
  return <div className="min-w-0 space-y-5">{blocks}</div>;
}
