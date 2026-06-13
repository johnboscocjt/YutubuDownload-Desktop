"use client";

import { useEffect, useState } from "react";
import { APP } from "@/lib/config";
import AppIcon from "./AppIcon";
import { IconGithub } from "./svg/Icons";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#screenshots", label: "Screenshots" },
  { href: "#how", label: "How it works" },
  { href: "#download", label: "Download" },
  { href: "#linux-install", label: "Install" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`nav ${scrolled ? "nav-scrolled" : ""}`}>
      <div className="container nav-inner">
        <a href="#" className="brand">
          <span className="brand-icon-wrap">
            <AppIcon size={38} className="brand-icon" />
            <span className="brand-glow" aria-hidden />
          </span>
          <div>
            <span className="brand-name">{APP.name}</span>
            <span className="brand-ver">v{APP.version}</span>
          </div>
        </a>

        <nav className={`nav-links ${menuOpen ? "nav-open" : ""}`}>
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>
              {l.label}
            </a>
          ))}
          <a
            href={`https://github.com/${APP.repo}`}
            target="_blank"
            rel="noreferrer"
            className="nav-github"
          >
            <IconGithub size={18} />
            GitHub
          </a>
            <a className="btn btn-primary" href="#download">
              Get the app
            </a>
        </nav>

        <button
          type="button"
          className="nav-toggle"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
