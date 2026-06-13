import { FEATURES } from "@/lib/config";
import { FEATURE_ICONS } from "./svg/Icons";
import Reveal from "./Reveal";

export default function FeaturesSection() {
  return (
    <section id="features" className="section-features">
      <div className="section-glow section-glow-left" aria-hidden />
      <div className="container">
        <Reveal>
          <div className="section-head">
            <span className="section-tag">Capabilities</span>
            <h2>Why YutubuDownload</h2>
            <p>
              Terminal-grade reliability in a modern desktop shell — or the classic
              one-command <code>ytd</code> workflow you already trust.
            </p>
          </div>
        </Reveal>

        <div className="features-grid">
          {FEATURES.map((f, i) => {
            const Icon = FEATURE_ICONS[f.id];
            return (
              <Reveal key={f.id} delay={i * 80}>
                <article className="feature-card">
                  <div className="feature-icon-wrap">
                    <Icon size={22} />
                    <span className="feature-icon-ring" />
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                  <span className="feature-card-shine" />
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
