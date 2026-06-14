"use client";

import { APP } from "@/lib/config";
import Reveal from "./Reveal";

const { windowsInstaller } = APP;

type GuideMethod = { label: string; code: string };

type InstallStep = {
  title: string;
  body: string;
  code?: string;
  methods?: GuideMethod[];
  note?: string;
};

const INSTALL_STEPS: InstallStep[] = [
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
    body: "The desktop app needs yt-dlp, ffmpeg, a JS runtime (Deno or Node.js), and Python with browser-cookie3. Use the PowerShell guide below — then open the app’s Setup tab and click Re-check.",
    note: "Jump to the full step-by-step dependency section below (#windows-dependencies).",
  },
  {
    title: "Launch the app",
    body: `Open Start and search for “${windowsInstaller.appMenuName}”, or use the desktop shortcut. Playback uses the built-in HTML video player on Windows (mpv embed is Linux-only).`,
  },
];

const DEPENDENCY_PREP: InstallStep = {
  title: "Before you start",
  body: "Open Windows PowerShell (not Command Prompt). winget is built into Windows 10/11. After each install that changes PATH, close PowerShell and open a new window — or restart the YutubuDownload app — before testing.",
  code: `# Check winget\nwinget --version\n\n# Optional: run PowerShell as Administrator if winget asks for elevation`,
};

const DEPENDENCY_STEPS: InstallStep[] = [
  {
    title: "1. yt-dlp (required — downloads YouTube)",
    body: "Installs yt-dlp and pulls in FFmpeg for yt-dlp as a dependency. This is the main tool the app calls when you click Start download.",
    methods: [
      {
        label: "PowerShell (recommended)",
        code: `winget install --id yt-dlp.yt-dlp \`
  --accept-package-agreements \`
  --accept-source-agreements

# Close PowerShell, open a new window, then verify:
yt-dlp --version`,
      },
      {
        label: "Manual download (no winget)",
        code: `# Download yt-dlp.exe from:
# https://github.com/yt-dlp/yt-dlp/releases/latest

# Save to a folder on PATH, e.g.:
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\\bin" | Out-Null
Move-Item -Force "$env:USERPROFILE\\Downloads\\yt-dlp.exe" "$env:USERPROFILE\\bin\\"

# Add to user PATH (once):
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
[Environment]::SetEnvironmentVariable("Path", "$userPath;$env:USERPROFILE\\bin", "User")`,
      },
    ],
  },
  {
    title: "2. ffmpeg (required — merges video/audio)",
    body: "If you installed yt-dlp.yt-dlp via winget above, FFmpeg for yt-dlp may already be installed. If Setup still shows ffmpeg as Missing, install a full build:",
    methods: [
      {
        label: "PowerShell (winget)",
        code: `winget install --id Gyan.FFmpeg \`
  --accept-package-agreements \`
  --accept-source-agreements

# New PowerShell window, then:
ffmpeg -version`,
      },
    ],
    note: "The app also searches WinGet package folders, so downloads work even if ffmpeg is not in a classic PATH entry.",
  },
  {
    title: "3. Deno or Node.js (recommended — faster metadata)",
    body: "yt-dlp uses a JS runtime for some YouTube pages. Install Deno (recommended) or Node.js — you only need one.",
    methods: [
      {
        label: "Deno via winget (recommended)",
        code: `winget install --id DenoLand.Deno \`
  --accept-package-agreements \`
  --accept-source-agreements

# New PowerShell window, then:
deno --version`,
      },
      {
        label: "Node.js via winget",
        code: `winget install --id OpenJS.NodeJS.LTS \`
  --accept-package-agreements \`
  --accept-source-agreements

# New PowerShell window, then:
node --version
npm --version`,
      },
      {
        label: "Node.js from .zip (no installer / no admin)",
        code: `# 1) Download the Windows x64 .zip from https://nodejs.org/
#    (e.g. node-v24.x-win-x64.zip) and save to Downloads.

$zip = "$env:USERPROFILE\\Downloads\\node-v24.16.0-win-x64.zip"
$dest = "$env:USERPROFILE\\nodejs"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Expand-Archive -Path $zip -DestinationPath $dest -Force

# Flatten if the zip contains a subfolder:
$inner = Get-ChildItem $dest -Directory | Select-Object -First 1
if ($inner) {
  Get-ChildItem $inner.FullName | Move-Item -Destination $dest -Force
  Remove-Item -Recurse -Force $inner.FullName
}

# Add to user PATH (once):
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
[Environment]::SetEnvironmentVariable("Path", "$userPath;$dest", "User")

# Close PowerShell, open a new window, then:
node --version
npm --version`,
      },
    ],
  },
  {
    title: "4. Python + browser cookies (optional but recommended)",
    body: "Lets the app read Chrome/Edge cookies for faster, more reliable downloads (same shared cookie file as the terminal ytd workflow).",
    methods: [
      {
        label: "PowerShell (winget + pip)",
        code: `winget install --id Python.Python.3.12 \`
  --accept-package-agreements \`
  --accept-source-agreements

# New PowerShell window — use py launcher if python is not found:
py -m pip install --upgrade pip
py -m pip install browser-cookie3

# Verify:
py -c "import browser_cookie3; print('browser cookies OK')"`,
      },
      {
        label: "If python is already installed",
        code: `python -m pip install --upgrade pip
python -m pip install browser-cookie3

python -c "import browser_cookie3; print('browser cookies OK')"`,
      },
    ],
    note: "Cookie files are stored under %USERPROFILE%\\.config\\YutubuDownload\\cookies.txt (shared with the terminal tool).",
  },
  {
    title: "5. Verify everything",
    body: `Run this checklist in a new PowerShell window. Then open ${windowsInstaller.appMenuName} → Setup → Re-check. All required rows should show OK before downloading.`,
    code: `yt-dlp --version
ffmpeg -version
deno --version   # or: node --version
python --version # optional
python -c "import browser_cookie3; print('cookies OK')"  # optional

# If a command is "not recognized", close PowerShell and open a new window
# after winget installs. Restart YutubuDownload after fixing PATH.`,
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
    a: "Open Setup in the app and check yt-dlp and ffmpeg. In PowerShell run yt-dlp --version and ffmpeg -version. Follow the dependency steps above, close and reopen PowerShell after winget, then restart the app.",
  },
  {
    q: "yt-dlp or ffmpeg “not recognized” in PowerShell?",
    a: "winget updates PATH for new terminals only. Close PowerShell, open a new window, and try again. Or install yt-dlp.exe manually into %USERPROFILE%\\bin and add that folder to your user PATH (see step 1 above).",
  },
  {
    q: "Console windows flash during download?",
    a: "Update to the latest YutubuDownload build — recent versions hide yt-dlp/ffmpeg windows on Windows.",
  },
  {
    q: "Built-in player shows a blank screen?",
    a: "Use Open in system player for that file, or update to the latest build (Windows playback reads files from your Downloads folder). Install WebView2 if the whole app window is blank.",
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

function GuideStepContent({ step }: { step: InstallStep }) {
  return (
    <>
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
      {step.note && <p className="guide-note">{step.note}</p>}
    </>
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
              installer from this site.{" "}
              <a href="#windows-dependencies">Dependency install guide (PowerShell)</a>{" "}
              covers yt-dlp, ffmpeg, Deno, Node.js, and Python.
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
                    <GuideStepContent step={step} />
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

        <Reveal delay={100}>
          <article
            id="windows-dependencies"
            className="guide-card guide-card-install guide-card-deps"
          >
            <h3 className="guide-card-title">Install dependencies (PowerShell)</h3>
            <p>
              Run these once on a new PC before downloading videos. The app’s{" "}
              <strong>Setup</strong> tab shows what is still missing — use{" "}
              <strong>Re-check</strong> after each step.
            </p>
            <ol className="guide-steps">
              <li key={DEPENDENCY_PREP.title}>
                <strong>{DEPENDENCY_PREP.title}</strong>
                <GuideStepContent step={DEPENDENCY_PREP} />
              </li>
              {DEPENDENCY_STEPS.map((step) => (
                <li key={step.title}>
                  <strong>{step.title}</strong>
                  <GuideStepContent step={step} />
                </li>
              ))}
            </ol>
          </article>
        </Reveal>

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
