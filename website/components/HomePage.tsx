import { APP, FEATURES, STEPS } from "@/lib/config";
import StatsCounter from "./StatsCounter";
import DownloadSection from "./DownloadSection";

export default function HomePage() {
  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <a href="#" className="brand">
            <img src="/icon.png" alt="" width={40} height={40} />
            <div>
              {APP.name}
              <br />
              <span>v{APP.version}</span>
            </div>
          </a>
          <nav className="nav-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#download">Download</a>
            <a
              href={`https://github.com/${APP.repo}`}
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <a className="btn btn-primary" href="#download">
              Get the app
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container">
            <div className="hero-badge">
              <span className="pulse-dot" />
              v{APP.version} · Desktop + Terminal
            </div>
            <h1>
              Download YouTube videos with{" "}
              <em>probe-verified quality</em>
            </h1>
            <p>
              {APP.tagline}. Built for real networks in Tanzania and beyond —
              stable quality, playlist support, MP3 extraction, and a sleek desktop app.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#download">
                Download free
              </a>
              <a
                className="btn btn-ghost"
                href={`https://github.com/${APP.repo}`}
                target="_blank"
                rel="noreferrer"
              >
                View source
              </a>
            </div>
            <StatsCounter />
          </div>
        </section>

        <section id="features">
          <div className="container">
            <div className="section-head">
              <h2>Why YutubuDownload</h2>
              <p>
                Terminal-grade reliability in a modern desktop shell — or the classic
                one-command `ytd` workflow you already trust.
              </p>
            </div>
            <div className="features-grid">
              {FEATURES.map((f) => (
                <article key={f.title} className="feature-card">
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how">
          <div className="container">
            <div className="section-head">
              <h2>How it works</h2>
              <p>Three steps from install to saved file.</p>
            </div>
            <div className="steps">
              {STEPS.map((s) => (
                <div key={s.n} className="step">
                  <div className="step-num">{s.n}</div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <DownloadSection />
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <p>
            © {new Date().getFullYear()} {APP.author} · {APP.name} · {APP.license}
          </p>
          <div className="footer-links">
            <a href={`https://github.com/${APP.repo}`}>GitHub</a>
            <a href={`https://github.com/${APP.repo}/blob/main/DOWNLOAD_GUIDE.md`}>
              Download guide
            </a>
            <a href={`https://github.com/${APP.repo}/blob/main/TROUBLESHOOTING.md`}>
              Troubleshooting
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
