import { APP } from "@/lib/config";
import Nav from "./Nav";
import ScrollLightning from "./ScrollLightning";
import HeroSection from "./HeroSection";
import FeaturesSection from "./FeaturesSection";
import ScreenshotsSection from "./ScreenshotsSection";
import StepsSection from "./StepsSection";
import DownloadSection from "./DownloadSection";
import LinuxInstallGuide from "./LinuxInstallGuide";
import WindowsInstallGuide from "./WindowsInstallGuide";
import MacInstallGuide from "./MacInstallGuide";
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
        <div id="install-guides">
          <div className="install-guides-intro container">
            <h2>Install &amp; uninstall guides</h2>
            <p>
              Step-by-step setup for Linux, Windows, and macOS — including dependencies,
              updates, and removal.
            </p>
            <nav className="install-guides-nav" aria-label="Platform install guides">
              <a href="#linux-install">Linux (.deb)</a>
              <a href="#windows-install">Windows (.exe)</a>
              <a href="#windows-dependencies">Windows dependencies</a>
              <a href="#macos-install">macOS (.dmg)</a>
              <a href={APP.cliSiteUrl} target="_blank" rel="noreferrer">
                ytd CLI docs
              </a>
            </nav>
          </div>
          <LinuxInstallGuide />
          <WindowsInstallGuide />
          <MacInstallGuide />
        </div>
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
            <a href="#linux-install">Linux install</a>
            <a href="#windows-install">Windows install</a>
            <a href="#windows-dependencies">Windows dependencies</a>
            <a href="#macos-install">macOS install</a>
            <a href={APP.cliSiteUrl} target="_blank" rel="noreferrer">
              ytd CLI site
            </a>
            <a href={`https://github.com/${APP.terminalRepo}/blob/main/TROUBLESHOOTING.md`}>
              Troubleshooting
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
