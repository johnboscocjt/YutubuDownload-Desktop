import { useEffect, useMemo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { listDocumentation, readDocumentation, type DocEntry } from "../api";
import { prepareDocMarkdown } from "../docContent";
import MermaidDiagram from "./MermaidDiagram";

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    div: [...(defaultSchema.attributes?.div ?? []), "align", "className", "class"],
    img: [...(defaultSchema.attributes?.img ?? []), "width", "height", "alt", "src", "loading"],
    a: [...(defaultSchema.attributes?.a ?? []), "href", "title", "target", "rel"],
    code: [...(defaultSchema.attributes?.code ?? []), "className", "class"],
    pre: [...(defaultSchema.attributes?.pre ?? []), "className", "class"],
    table: [...(defaultSchema.attributes?.table ?? []), "className", "class"],
    thead: [...(defaultSchema.attributes?.thead ?? []), "className", "class"],
    tbody: [...(defaultSchema.attributes?.tbody ?? []), "className", "class"],
    tr: [...(defaultSchema.attributes?.tr ?? []), "className", "class"],
    th: [...(defaultSchema.attributes?.th ?? []), "align", "className", "class"],
    td: [...(defaultSchema.attributes?.td ?? []), "align", "className", "class"],
  },
  tagNames: [...(defaultSchema.tagNames ?? []), "table", "thead", "tbody", "tr", "th", "td"],
};

function MarkdownCode({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const text = String(children ?? "").replace(/\n$/, "");
  const lang = /language-(\w+)/.exec(className ?? "")?.[1];

  if (lang === "mermaid") {
    return <MermaidDiagram chart={text} />;
  }

  if (className) {
    return (
      <pre>
        <code className={className}>{children}</code>
      </pre>
    );
  }

  return <code className={className}>{children}</code>;
}

export default function DocsPage() {
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listDocumentation()
      .then((entries) => {
        setDocs(entries);
        if (entries.length > 0) setSelectedId(entries[0].id);
      })
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setError("");
    readDocumentation(selectedId)
      .then((raw) => setContent(prepareDocMarkdown(raw)))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const categories = useMemo(() => {
    const map = new Map<string, DocEntry[]>();
    for (const doc of docs) {
      const list = map.get(doc.category) ?? [];
      list.push(doc);
      map.set(doc.category, list);
    }
    return map;
  }, [docs]);

  const selected = docs.find((d) => d.id === selectedId);

  return (
    <div className="docs-layout">
      <aside className="docs-sidebar glass">
        <h2>Documentation</h2>
        <p className="hint">Select a guide to read in-app.</p>
        {[...categories.entries()].map(([category, entries]) => (
          <div key={category} className="docs-group">
            <h3>{category}</h3>
            {entries.map((doc) => (
              <button
                key={doc.id}
                type="button"
                className={`doc-item ${selectedId === doc.id ? "active" : ""}`}
                onClick={() => setSelectedId(doc.id)}
              >
                <span className="doc-item-title">{doc.title}</span>
                <span className="doc-item-desc">{doc.description}</span>
              </button>
            ))}
          </div>
        ))}
      </aside>

      <article className="docs-content glass">
        {selected && (
          <header className="docs-header">
            <h2>{selected.title}</h2>
            <p>{selected.description}</p>
          </header>
        )}
        {loading && <p className="hint">Loading…</p>}
        {error && <p className="error-text">{error}</p>}
        {!loading && !error && !content.trim() && (
          <p className="error-text">
            This document could not be loaded. Restart the app or check that doc files
            are present in the install folder.
          </p>
        )}
        {!loading && !error && content.trim() && (
          <div className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, [rehypeSanitize, { schema: sanitizeSchema }]]}
              components={{
                pre({ children }) {
                  return <>{children}</>;
                },
                code: MarkdownCode,
                div({ className, children, ...props }) {
                  const align = (props as { align?: string }).align;
                  const style = align
                    ? { textAlign: align as "center" | "left" | "right" }
                    : undefined;
                  return (
                    <div className={className} style={style}>
                      {children}
                    </div>
                  );
                },
                a({ href, children, ...props }) {
                  const external = href?.startsWith("http");
                  return (
                    <a
                      href={href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noreferrer noopener" : undefined}
                      {...props}
                    >
                      {children}
                    </a>
                  );
                },
                img({ src, alt, ...props }) {
                  return (
                    <img
                      src={src}
                      alt={alt ?? ""}
                      loading="lazy"
                      className="doc-image"
                      {...props}
                    />
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </article>
    </div>
  );
}
