/**
 * Renders admin-written article text safely (no HTML): blank lines split paragraphs,
 * "## " starts a heading, "- " starts a bullet, and URLs become links.
 */
function linkify(text: string) {
  return text.split(/(https?:\/\/[^\s)]+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noreferrer">{part}</a>
    ) : (
      part
    ),
  );
}

export function ArticleBody({ body }: { body: string }) {
  const blocks = body.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <div className="legal article-body">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter(Boolean);
        if (lines.length && lines.every((l) => l.startsWith("- ")))
          return <ul key={i}>{lines.map((l, j) => <li key={j}>{linkify(l.slice(2))}</li>)}</ul>;
        if (block.startsWith("## ")) return <h2 key={i}>{block.slice(3)}</h2>;
        return <p key={i}>{lines.map((l, j) => <span key={j}>{j > 0 && <br />}{linkify(l)}</span>)}</p>;
      })}
    </div>
  );
}
