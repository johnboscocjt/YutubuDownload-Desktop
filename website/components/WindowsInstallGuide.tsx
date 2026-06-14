"use client";

import { APP } from "@/lib/config";
import Reveal from "./Reveal";

const { windowsInstaller } = APP;

const INSTALL_STEPS = [
  {
    title: "Download the installer",
    body: `Click Download .exe above, or save ${windowsInstaller.filename} to your Downloads folder.`,
  },
  {
    title: "Run the setup wizard",
    body: "Double-click the .exe. If Windows SmartScreen appears, choose More info → Run anyway (the app is open source and not yet code-signed).",
    methods: [
      {
        label: "GUI (recommended)",
        code: `Open Downloads\nDouble-click ${windowsInstaller.filename}\nFollow the installer prompts\nLeave "Add desktop shortcut" checked if you want one`,
      },
      {
        label: "Silent install (PowerShell)",
        code: `cd $env:USERPROFILE\\Downloads\n.\\${windowsInstaller.filename} /S`,
      },
    ],
  },
  {
    title: "Install download dependencies",
    body: "YutubuDownload needs the same tools as the terminal version. Install these once and ensure they are on your PATH:",
    code: `# yt-dlp (pick one)\nwinget install yt-dlp\n# or: choco install yt-dlp\n\n# ffmpeg\nwinget install Gyan.FFmpeg\n\n# Deno or Node.js (for cookie extraction)\nwinget install DenoLand.Deno`,
  },
  {
    title: "Launch the app",
    body: `Open Start and search for “${windowsInstaller.appMenuName}”, or use the desktop shortcut. Playback uses the built-in HTML video player on Windows (mpv embed is Linux-only).`,
  },
];

const UPDATE_STEPS = {
  title: "Update",
  body: "Download the latest setup .exe and run it. The installer upgrades the existing copy in place — you do not need to uninstall first.",
  code: `cd $env:USERPROFILE\\Downloads\n.\\${windowsInstaller.filename}`,
};

const UNINSTALL_STEPS = {
  title: "Uninstall",
  body: `Removes the app, shortcuts, and Start menu entry. Your downloaded videos in your chosen folder are not deleted.`,
  methods: [
    {
      label: "Settings (Windows 11)",
      code: `Settings → Apps → Installed apps\nSearch: ${windowsInstaller.appMenuName}\nClick ⋯ → Uninstall`,
    },
    {
      label: "Control Panel (all versions)",
      code: `Control Panel → Programs → Uninstall a program\nSelect ${windowsInstaller.appMenuName} → Uninstall`,
    },
  ],
  note: "You can also run the uninstaller from Start → YutubuDownload → Uninstall YutubuDownload.",
};

const TROUBLESHOOT = [
  {
    q: "SmartScreen blocks the installer?",
    a: "Click More info, then Run anyway. For production use, we plan to add code signing; the source is public on GitHub.",
  },
  {
    q: "App opens but downloads fail?",
    a: "Open Command Prompt and run yt-dlp --version and ffmpeg -version. Install missing tools with winget (see step 3 above).",
  },
  {
    q: "Blank window or WebView error?",
    a: "Install Microsoft Edge WebView2 Runtime from Microsoft’s site, or update Windows. WebView2 is bundled on Windows 11.",
  },
  {
    q: "Need the classic terminal workflow?",
    a: (
      <>
        On Windows, use WSL or a Linux VM and install{" "}
        <code>ytd</code> there — see the{" "}
        <a href={APP.cliSiteUrl} target="_blank" rel="noreferrer">
          CLI docs site
        </a>
        . Or use this desktop app, or run yt-dlp directly in PowerShell.
      </>
    ),
  },
];

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="guide-code">
      <code>{children}</code>
    </pre>
  );
}

export default function WindowsInstallGuide() {
  return (
    <section
      id="windows-install"
      className="section-install-guide section-install-guide--windows"
    >
      <div className="container">
        <Reveal>
          <div className="section-head">
            <span className="section-tag">Windows</span>
            <h2>Install &amp; uninstall</h2>
            <p>
              Step-by-step for Windows 10 and 11 (64-bit). Uses the NSIS setup
              installer from this site.
            </p>
            <p className="guide-package-pill">
              Installer: <code>{windowsInstaller.filename}</code>
            </p>
          </div>
        </Reveal>

        <div className="guide-layout">
          <Reveal className="guide-reveal">
            <article className="guide-card guide-card-install">
              <h3 className="guide-card-title">Fresh install</h3>
              <ol className="guide-steps">
                {INSTALL_STEPS.map((step) => (
                  <li key={step.title}>
                    <strong>{step.title}</strong>
                    <p>{step.body}</p>
                    {step.methods && (
                      <div className="guide-methods">
                        {step.methods.map((m) => (
                          <div key={m.label} className="guide-method">
                            <span className="guide-method-label">{m.label}</span>
                            <CodeBlock>{m.code}</CodeBlock>
                          </div>
                        ))}
                      </div>
                    )}
                    {step.code && <CodeBlock>{step.code}</CodeBlock>}
                  </li>
                ))}
              </ol>
            </article>
          </Reveal>

          <Reveal className="guide-reveal" delay={80}>
            <div className="guide-secondary">
              <article className="guide-card guide-card-update">
                <h3 className="guide-card-title">Update to a newer version</h3>
                <p>{UPDATE_STEPS.body}</p>
                <CodeBlock>{UPDATE_STEPS.code}</CodeBlock>
              </article>

              <article className="guide-card guide-card-uninstall">
                <h3 className="guide-card-title">Uninstall completely</h3>
                <p>{UNINSTALL_STEPS.body}</p>
                <div className="guide-methods guide-methods-stack">
                  {UNINSTALL_STEPS.methods.map((m) => (
                    <div key={m.label} className="guide-method">
                      <span className="guide-method-label">{m.label}</span>
                      <CodeBlock>{m.code}</CodeBlock>
                    </div>
                  ))}
                </div>
                <p className="guide-note">{UNINSTALL_STEPS.note}</p>
              </article>
            </div>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <div className="guide-faq">
            <h3>Troubleshooting</h3>
            <dl className="guide-faq-list">
              {TROUBLESHOOT.map((item) => (
                <div key={item.q} className="guide-faq-item">
                  <dt>{item.q}</dt>
                  <dd>{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
