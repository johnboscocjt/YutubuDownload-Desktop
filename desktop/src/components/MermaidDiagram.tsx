import { useEffect, useRef } from "react";
import mermaid from "mermaid";

const MERMAID_ACCENT = "#00d4aa";
const MERMAID_NODE = "#1e293b";
const MERMAID_SIGNAL = "#f8fafc";
const MERMAID_LABEL = "#e2e8f0";

const MERMAID_CONFIG: Parameters<typeof mermaid.initialize>[0] = {
  startOnLoad: false,
  securityLevel: "loose",
  theme: "base",
  themeVariables: {
    darkMode: true,
    background: "#0b1320",
    mainBkg: MERMAID_NODE,
    primaryColor: MERMAID_NODE,
    primaryTextColor: MERMAID_SIGNAL,
    primaryBorderColor: MERMAID_ACCENT,
    secondaryColor: "#111827",
    secondaryTextColor: MERMAID_LABEL,
    secondaryBorderColor: MERMAID_ACCENT,
    tertiaryColor: "#111827",
    tertiaryTextColor: MERMAID_LABEL,
    tertiaryBorderColor: "#334155",
    lineColor: MERMAID_ACCENT,
    arrowheadColor: MERMAID_SIGNAL,
    textColor: MERMAID_LABEL,
    nodeTextColor: MERMAID_SIGNAL,
    nodeBorder: MERMAID_ACCENT,
    clusterBkg: "#111827",
    clusterBorder: "#334155",
    defaultLinkColor: MERMAID_ACCENT,
    titleColor: MERMAID_ACCENT,
    edgeLabelBackground: "#111827",
    actorBkg: MERMAID_NODE,
    actorBorder: MERMAID_ACCENT,
    actorTextColor: MERMAID_SIGNAL,
    actorLineColor: MERMAID_ACCENT,
    signalColor: MERMAID_SIGNAL,
    signalTextColor: MERMAID_LABEL,
    labelBoxBkgColor: MERMAID_NODE,
    labelBoxBorderColor: MERMAID_ACCENT,
    labelTextColor: MERMAID_LABEL,
    loopTextColor: MERMAID_LABEL,
    activationBkgColor: "#134e4a",
    activationBorderColor: MERMAID_ACCENT,
    noteBkgColor: "#111827",
    noteBorderColor: MERMAID_ACCENT,
    noteTextColor: MERMAID_LABEL,
    fontFamily: "Inter, Segoe UI, system-ui, sans-serif",
    fontSize: "14px",
  },
  flowchart: {
    htmlLabels: false,
    useMaxWidth: false,
    curve: "basis",
    padding: 16,
    nodeSpacing: 44,
    rankSpacing: 48,
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
    mirrorActors: true,
    wrap: true,
  },
  state: {
    useMaxWidth: false,
  },
};

function diagramKind(source: string): "sequence" | "flowchart" | "other" {
  const head = source.trim().toLowerCase();
  if (head.startsWith("sequencediagram")) return "sequence";
  if (head.startsWith("flowchart") || head.startsWith("graph ")) return "flowchart";
  return "other";
}

function polishSvg(container: HTMLElement, source: string) {
  const svg = container.querySelector("svg");
  if (!svg) return;

  const kind = diagramKind(source);

  svg.setAttribute("role", "img");
  svg.classList.add("mermaid-svg");
  svg.removeAttribute("height");
  svg.style.height = "auto";
  svg.style.display = "block";
  svg.style.margin = "0 auto";

  svg.querySelectorAll("defs marker").forEach((marker) => {
    marker.setAttribute("markerUnits", "userSpaceOnUse");
    marker.setAttribute("overflow", "visible");
    marker.querySelectorAll("path").forEach((path) => {
      path.setAttribute("fill", kind === "sequence" ? MERMAID_SIGNAL : MERMAID_ACCENT);
      path.setAttribute("stroke", "none");
    });
  });

  if (kind === "flowchart") {
    svg.querySelectorAll("g.edgePath path.flowchart-link").forEach((path) => {
      path.setAttribute("stroke", MERMAID_ACCENT);
      path.setAttribute("stroke-width", "2.25");
      path.setAttribute("fill", "none");
      path.setAttribute("opacity", "1");
    });

    svg.querySelectorAll("g.edgeLabel rect.labelBkg").forEach((rect) => {
      rect.setAttribute("fill", "#111827");
      rect.setAttribute("stroke", "#334155");
    });

    svg.querySelectorAll("g.node rect, g.node polygon, g.node circle, g.node ellipse").forEach((shape) => {
      shape.setAttribute("fill", MERMAID_NODE);
      shape.setAttribute("stroke", MERMAID_ACCENT);
      shape.setAttribute("stroke-width", "2");
    });
  }

  if (kind === "sequence") {
    svg.querySelectorAll("text").forEach((text) => {
      if (text.closest("defs")) return;
      text.setAttribute("fill", MERMAID_LABEL);
      text.setAttribute("font-size", "14px");
    });

    svg.querySelectorAll("rect").forEach((rect) => {
      if (rect.closest("defs")) return;
      const w = parseFloat(rect.getAttribute("width") || "0");
      const h = parseFloat(rect.getAttribute("height") || "0");
      if (w < 20 || h < 12) return;
      rect.setAttribute("fill", MERMAID_NODE);
      rect.setAttribute("stroke", MERMAID_ACCENT);
      rect.setAttribute("stroke-width", "2");
    });

    svg.querySelectorAll("line").forEach((line) => {
      const x1 = parseFloat(line.getAttribute("x1") || "0");
      const x2 = parseFloat(line.getAttribute("x2") || "0");
      const y1 = parseFloat(line.getAttribute("y1") || "0");
      const y2 = parseFloat(line.getAttribute("y2") || "0");
      const vertical = Math.abs(x2 - x1) < 1.5 && Math.abs(y2 - y1) > 12;
      const horizontal = Math.abs(y2 - y1) < 1.5 && Math.abs(x2 - x1) > 12;

      if (vertical) {
        line.setAttribute("stroke", MERMAID_ACCENT);
        line.setAttribute("stroke-width", "2.5");
      } else if (horizontal) {
        line.setAttribute("stroke", MERMAID_SIGNAL);
        line.setAttribute("stroke-width", "2");
      }
    });

    svg.querySelectorAll("path").forEach((path) => {
      if (path.closest("defs")) return;
      if (path.classList.contains("flowchart-link")) return;
      const stroke = path.getAttribute("stroke");
      if (!stroke || stroke === "none") return;
      path.setAttribute("stroke", MERMAID_SIGNAL);
      path.setAttribute("stroke-width", "2");
      path.setAttribute("fill", "none");
    });
  }
}

interface Props {
  chart: string;
}

export default function MermaidDiagram({ chart }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
    el.innerHTML = "";

    mermaid.initialize(MERMAID_CONFIG);

    mermaid
      .render(id, chart.trim())
      .then(({ svg }) => {
        el.innerHTML = svg;
        polishSvg(el, chart);
      })
      .catch((err) => {
        console.warn("Mermaid render failed:", err);
        el.innerHTML = `<pre class="mermaid-fallback">${chart}</pre>`;
      });
  }, [chart]);

  return <div className="mermaid-wrap" ref={ref} aria-label="Diagram" />;
}
