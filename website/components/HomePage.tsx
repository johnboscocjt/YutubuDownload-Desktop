import { APP } from "@/lib/config";
import Nav from "./Nav";
import ScrollLightning from "./ScrollLightning";
import HeroSection from "./HeroSection";
import FeaturesSection from "./FeaturesSection";
import ScreenshotsSection from "./ScreenshotsSection";
import StepsSection from "./StepsSection";
import DownloadSection from "./DownloadSection";
import LinuxInstallGuide from "./LinuxInstallGuide";
import AppIcon from "./AppIcon";
import { IconGithub } from "./svg/Icons";

export default function HomePage() {
  return (
    <div className="page-wrap">
      <Nav />
      <ScrollLightning />

      <main className="page-main">
        <HeroSection />
        <FeaturesSection />
        <ScreenshotsSection />
        <StepsSection />
        <DownloadSection />
        <LinuxInstallGuide />
      </main>

      <footer className="footer">
        <div className="footer-glow" aria-hidden />
        <div className="container footer-inner">
          <div className="footer-brand">
            <AppIcon size={32} className="footer-icon" />
            <div>
              <strong>{APP.name}</strong>
              <span>v{APP.version} · {APP.license}</span>
            </div>
          </div>
          <p className="footer-copy">
            © {new Date().getFullYear()} {APP.author}
          </p>
          <div className="footer-links">
            <a href={`https://github.com/${APP.repo}`}>
              <IconGithub size={16} />
              GitHub
            </a>
            <a href="#linux-install">Linux install guide</a>
            <a href={`https://github.com/${APP.terminalRepo}/blob/main/TROUBLESHOOTING.md`}>
              Troubleshooting
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
