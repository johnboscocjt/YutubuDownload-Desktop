import { useEffect, useRef } from "react";
import mermaid from "mermaid";

let initialized = false;

function ensureMermaid() {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "strict",
    fontFamily: "Inter, Segoe UI, system-ui, sans-serif",
  });
  initialized = true;
}

interface Props {
  chart: string;
}

export default function MermaidDiagram({ chart }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureMermaid();
    const el = ref.current;
    if (!el) return;

    const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
    el.innerHTML = "";

    mermaid
      .render(id, chart.trim())
      .then(({ svg }) => {
        el.innerHTML = svg;
      })
      .catch(() => {
        el.innerHTML = `<pre class="mermaid-fallback">${chart}</pre>`;
      });
  }, [chart]);

  return <div className="mermaid-wrap" ref={ref} aria-label="Diagram" />;
}
