export default function HeroBackground() {
  return (
    <div className="hero-bg" aria-hidden>
      <svg className="hero-grid" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="rgba(0,212,170,0.07)"
              strokeWidth="1"
            />
          </pattern>
          <radialGradient id="orb1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,212,170,0.35)" />
            <stop offset="100%" stopColor="rgba(0,212,170,0)" />
          </radialGradient>
          <radialGradient id="orb2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(9,132,227,0.3)" />
            <stop offset="100%" stopColor="rgba(9,132,227,0)" />
          </radialGradient>
          <linearGradient id="beam" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,212,170,0)" />
            <stop offset="50%" stopColor="rgba(0,212,170,0.15)" />
            <stop offset="100%" stopColor="rgba(0,212,170,0)" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <ellipse className="orb orb-1" cx="15%" cy="20%" rx="280" ry="280" fill="url(#orb1)" />
        <ellipse className="orb orb-2" cx="85%" cy="60%" rx="320" ry="320" fill="url(#orb2)" />
        <ellipse className="orb orb-3" cx="50%" cy="90%" rx="200" ry="200" fill="url(#orb1)" opacity="0.5" />
        <path
          className="hero-beam"
          d="M-100 200 Q 400 100 900 300 T 1900 150"
          stroke="url(#beam)"
          strokeWidth="2"
          fill="none"
        />
        <path
          className="hero-beam hero-beam-2"
          d="M-50 400 Q 500 250 1000 450 T 2000 350"
          stroke="url(#beam)"
          strokeWidth="1.5"
          fill="none"
          opacity="0.6"
        />
      </svg>

      {/* Floating decorative nodes */}
      <div className="float-node float-node-1">
        <svg viewBox="0 0 40 40" fill="none">
          <rect x="4" y="8" width="32" height="22" rx="3" stroke="rgba(0,212,170,0.5)" strokeWidth="1.2" />
          <path d="M12 16h16M12 21h10" stroke="rgba(0,212,170,0.4)" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="float-node float-node-2">
        <svg viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="14" stroke="rgba(9,132,227,0.5)" strokeWidth="1.2" />
          <path d="M14 20l4 4 8-8" stroke="rgba(9,132,227,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="float-node float-node-3">
        <svg viewBox="0 0 40 40" fill="none">
          <path d="M10 28V14l10-6 10 6v14" stroke="rgba(0,212,170,0.4)" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M16 28v-8h8v8" stroke="rgba(0,212,170,0.35)" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
