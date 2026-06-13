"use client";

import { APP } from "@/lib/config";
import Reveal from "./Reveal";

const { linuxDeb } = APP;

const INSTALL_STEPS = [
  {
    title: "Download the .deb",
    body: `Click Download .deb above, or save ${linuxDeb.filename} to your Downloads folder.`,
  },
  {
    title: "Install the package",
    body: "The .deb installs the app — it does not run it. Pick terminal (recommended) or GDebi:",
    methods: [
      {
        label: "Terminal",
        code: `cd ~/Downloads\nsudo dpkg -i ${linuxDeb.filename}\nsudo apt-get install -f -y`,
      },
      {
        label: "GDebi",
        code: `Right-click ${linuxDeb.filename}\n→ Open with GDebi Package Installer\n→ Install Package`,
      },
    ],
  },
  {
    title: "Verify install",
    body: "Confirm the package is registered, then test the launcher:",
    code: `dpkg -l ${linuxDeb.packageName}\n/usr/bin/yutubu-download-launcher`,
  },
  {
    title: "Launch from the app menu",
    body: `Search for “${linuxDeb.appMenuName}”. If the icon does not appear right away, log out and back in once.`,
  },
];

const UPDATE_STEPS = {
  title: "Update",
  body: "Download the latest .deb, then install it over the existing package:",
  code: `cd ~/Downloads\nsudo dpkg -i ${linuxDeb.filename}\nsudo apt-get install -f -y`,
};

const UNINSTALL_STEPS = {
  title: "Uninstall",
  body: `Removes the app, menu entry, launcher, and icons. Your downloaded videos are not deleted.`,
  code: `sudo apt remove --purge ${linuxDeb.packageName}\nsudo apt autoremove -y\ndpkg -l ${linuxDeb.packageName}`,
  note: "Should print: no packages found matching yutubu-download",
};

const TROUBLESHOOT = [
  {
    q: "Icon shows a generic box or gear?",
    a: "Reinstall with the commands above, then log out and back in. Do not launch by double-clicking the .deb file.",
  },
  {
    q: "App does not open from the menu?",
    a: "Run /usr/bin/yutubu-download-launcher in a terminal and share any error message.",
  },
  {
    q: "dpkg reports missing dependencies?",
    a: "Run sudo apt-get install -f -y after dpkg -i to install required libraries automatically.",
  },
];

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="guide-code">
      <code>{children}</code>
    </pre>
  );
}

export default function LinuxInstallGuide() {
  return (
    <section id="linux-install" className="section-install-guide section-install-guide--linux">
      <div className="container">
        <Reveal>
          <div className="section-head">
            <span className="section-tag">Linux</span>
            <h2>Install &amp; uninstall</h2>
            <p>
              Step-by-step for Ubuntu, Debian, and other distros that use .deb
              packages.
            </p>
            <p className="guide-package-pill">
              Package name: <code>{linuxDeb.packageName}</code>
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
                <CodeBlock>{UNINSTALL_STEPS.code}</CodeBlock>
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
