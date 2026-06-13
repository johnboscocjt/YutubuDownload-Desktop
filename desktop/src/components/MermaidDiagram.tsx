import { useEffect, useRef } from "react";
import mermaid from "mermaid";

let initialized = false;

const MERMAID_CONFIG: Parameters<typeof mermaid.initialize>[0] = {
  startOnLoad: false,
  securityLevel: "loose",
  theme: "base",
  themeVariables: {
    darkMode: true,
    background: "#0b1320",
    mainBkg: "#1e293b",
    secondaryBkg: "#111827",
    tertiaryBkg: "#0f172a",
    primaryColor: "#134e4a",
    primaryTextColor: "#f8fafc",
    primaryBorderColor: "#00d4aa",
    secondaryColor: "#1e3a5f",
    secondaryTextColor: "#e2e8f0",
    secondaryBorderColor: "#3b82f6",
    tertiaryColor: "#1e293b",
    tertiaryTextColor: "#cbd5e1",
    tertiaryBorderColor: "#475569",
    lineColor: "#94a3b8",
    textColor: "#f1f5f9",
    nodeTextColor: "#f8fafc",
    nodeBorder: "#00d4aa",
    clusterBkg: "#111827",
    clusterBorder: "#334155",
    defaultLinkColor: "#94a3b8",
    titleColor: "#00d4aa",
    edgeLabelBackground: "#111827",
    fontFamily: "Inter, Segoe UI, system-ui, sans-serif",
    fontSize: "15px",
  },
  flowchart: {
    htmlLabels: false,
    useMaxWidth: false,
    curve: "basis",
    padding: 18,
    nodeSpacing: 48,
    rankSpacing: 52,
  },
  sequence: {
    useMaxWidth: false,
    diagramMarginX: 24,
    diagramMarginY: 16,
    actorMargin: 56,
    width: 180,
    boxMargin: 12,
    boxTextMargin: 8,
    noteMargin: 12,
    messageMargin: 40,
  },
  state: {
    useMaxWidth: false,
  },
};

function ensureMermaid() {
  if (initialized) return;
  mermaid.initialize(MERMAID_CONFIG);
  initialized = true;
}

function polishSvg(container: HTMLElement) {
  const svg = container.querySelector("svg");
  if (!svg) return;

  svg.setAttribute("role", "img");
  svg.classList.add("mermaid-svg");
  svg.removeAttribute("height");
  svg.style.height = "auto";
  svg.style.display = "block";
  svg.style.margin = "0 auto";
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
        polishSvg(el);
      })
      .catch((err) => {
        console.warn("Mermaid render failed:", err);
        el.innerHTML = `<pre class="mermaid-fallback">${chart}</pre>`;
      });
  }, [chart]);

  return <div className="mermaid-wrap" ref={ref} aria-label="Diagram" />;
}
