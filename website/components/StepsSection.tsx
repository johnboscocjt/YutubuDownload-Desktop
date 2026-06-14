import { STEPS } from "@/lib/config";
import { STEP_ICONS } from "./svg/Icons";
import Reveal from "./Reveal";

export default function StepsSection() {
  return (
    <section id="how" className="section-steps">
      <div className="container">
        <Reveal>
          <div className="section-head">
            <span className="section-tag">Workflow</span>
            <h2>How it works</h2>
            <p>Three steps from install to saved file.</p>
          </div>
        </Reveal>

        <div className="steps-timeline">
          <svg className="steps-line" viewBox="0 0 800 4" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="stepGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(0,212,170,0.2)" />
                <stop offset="50%" stopColor="rgba(0,212,170,0.8)" />
                <stop offset="100%" stopColor="rgba(9,132,227,0.6)" />
              </linearGradient>
            </defs>
            <line x1="0" y1="2" x2="800" y2="2" stroke="url(#stepGrad)" strokeWidth="2" strokeDasharray="8 6" className="steps-dash" />
          </svg>

          <div className="steps">
            {STEPS.map((s, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <Reveal key={s.n} delay={i * 120}>
                  <div className="step">
                    <div className="step-icon-wrap">
                      <Icon size={22} />
                    </div>
                    <span className="step-num">{s.n}</span>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
