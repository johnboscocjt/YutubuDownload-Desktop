"use client";

import { APP } from "@/lib/config";
import Reveal from "./Reveal";

const { macosDmg } = APP;

const INSTALL_STEPS = [
  {
    title: "Download the disk image",
    body: `Click Download .dmg above, or save ${macosDmg.filename} to your Downloads folder.`,
  },
  {
    title: "Open the .dmg and drag to Applications",
    body: "Double-click the .dmg file. Drag YutubuDownload into your Applications folder, then eject the disk image.",
    methods: [
      {
        label: "GUI (recommended)",
        code: `Open Downloads\nDouble-click ${macosDmg.filename}\nDrag ${macosDmg.appName} → Applications\nEject the mounted disk image`,
      },
      {
        label: "Terminal",
        code: `open ~/Downloads/${macosDmg.filename}\n# After mounting:\ncp -R "/Volumes/YutubuDownload/${macosDmg.appName}.app" /Applications/\nhdiutil detach "/Volumes/YutubuDownload"`,
      },
    ],
  },
  {
    title: "First launch (Gatekeeper)",
    body: "The app is open source and not yet notarized. macOS may block the first launch — use right-click → Open instead of double-click.",
    code: `Finder → Applications → ${macosDmg.appName}\nRight-click → Open → Open (confirm once)`,
  },
  {
    title: "Install download dependencies",
    body: "YutubuDownload needs yt-dlp, ffmpeg, and Deno or Node.js on your PATH. Install once with Homebrew:",
    code: `# Homebrew (https://brew.sh) if needed\n/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"\n\nbrew install yt-dlp ffmpeg deno`,
  },
  {
    title: "Launch the app",
    body: `Open ${macosDmg.appName} from Applications or Spotlight. Playback uses the built-in HTML video player on macOS (mpv embed is Linux-only).`,
  },
];

const UPDATE_STEPS = {
  title: "Update",
  body: "Download the latest .dmg, open it, and drag the app to Applications — replace the existing copy when prompted.",
  code: `open ~/Downloads/${macosDmg.filename}\n# Drag to Applications → Replace`,
};

const UNINSTALL_STEPS = {
  title: "Uninstall",
  body: "Removes the app from your Mac. Your downloaded videos in your chosen folder are not deleted.",
  methods: [
    {
      label: "Finder",
      code: `Finder → Applications\nDrag ${macosDmg.appName}.app to Trash\nEmpty Trash`,
    },
    {
      label: "Terminal",
      code: `rm -rf "/Applications/${macosDmg.appName}.app"`,
    },
  ],
  note: "Optional: remove app data with rm -rf ~/Library/Application\\ Support/com.johnboscocjt.yutubudownload",
};

const TROUBLESHOOT = [
  {
    q: "“YutubuDownload is damaged” or won't open?",
    a: "Right-click the app in Applications → Open. If it still fails, run: xattr -cr \"/Applications/YutubuDownload.app\" then try Open again.",
  },
  {
    q: "App opens but downloads fail?",
    a: "Open Terminal and run yt-dlp --version and ffmpeg -version. Install missing tools with brew (see step 4 above).",
  },
  {
    q: "Blank window?",
    a: "Ensure macOS 10.15 or newer. Quit and relaunch; check Console.app for WebKit errors.",
  },
  {
    q: "Need the classic terminal workflow?",
    a: "The Linux terminal installer (ytd command) is not for macOS. Use this desktop app, or run yt-dlp directly in Terminal.",
  },
];

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="guide-code">
      <code>{children}</code>
    </pre>
  );
}

export default function MacInstallGuide() {
  return (
    <section
      id="macos-install"
      className="section-install-guide section-install-guide--macos"
    >
      <div className="container">
        <Reveal>
          <div className="section-head">
            <span className="section-tag">macOS</span>
            <h2>Install &amp; uninstall</h2>
            <p>
              Step-by-step for Apple Silicon and Intel Macs. Uses the universal
              .dmg from this site.
            </p>
            <p className="guide-package-pill">
              Installer: <code>{macosDmg.filename}</code>
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
