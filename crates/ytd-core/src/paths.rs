use std::path::PathBuf;

pub const TERMINAL_APP_ID: &str = "YutubuDownload";
pub const DESKTOP_APP_ID: &str = "YutubuDownload-Desktop";

#[derive(Debug, Clone)]
pub struct YtdPaths {
    pub app_id: String,
    pub config_dir: PathBuf,
    pub state_dir: PathBuf,
    pub cache_dir: PathBuf,
    pub cookie_file: PathBuf,
    pub cookie_lock_file: PathBuf,
}

impl YtdPaths {
    /// Terminal `ytd` / shared legacy layout.
    pub fn new() -> Self {
        Self::with_app_id(TERMINAL_APP_ID)
    }

    /// Desktop GUI — separate cache/downloads; shares terminal cookies for CLI speed.
    pub fn desktop() -> Self {
        let terminal = Self::with_app_id(TERMINAL_APP_ID);
        let mut paths = Self::with_app_id(DESKTOP_APP_ID);
        paths.cookie_file = terminal.cookie_file;
        paths.cookie_lock_file = terminal.cookie_lock_file;
        paths
    }

    pub fn with_app_id(app_id: &str) -> Self {
        let config_dir = std::env::var("XDG_CONFIG_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|_| dirs::home_dir().unwrap_or_default().join(".config"))
            .join(app_id);

        let state_dir = std::env::var("XDG_STATE_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|_| dirs::home_dir().unwrap_or_default().join(".local/state"))
            .join(app_id);

        let cache_dir = std::env::var("XDG_CACHE_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|_| dirs::home_dir().unwrap_or_default().join(".cache"))
            .join(app_id);

        let cookie_file = config_dir.join("cookies.txt");
        let cookie_lock_file = state_dir.join("cookies.lock");

        Self {
            app_id: app_id.to_string(),
            config_dir,
            state_dir,
            cache_dir,
            cookie_file,
            cookie_lock_file,
        }
    }

    pub fn is_desktop(&self) -> bool {
        self.app_id == DESKTOP_APP_ID
    }

    /// Default folder for desktop saves (terminal uses cwd interactively).
    pub fn default_download_dir(&self) -> PathBuf {
        dirs::home_dir()
            .unwrap_or_default()
            .join(DESKTOP_APP_ID)
    }

    pub fn session_root(&self, session_id: &str) -> PathBuf {
        self.cache_dir.join("runs").join(session_id)
    }

    pub fn session_log(&self, session_id: &str, round: u32) -> PathBuf {
        self.session_root(session_id)
            .join(format!("download-{round}.log"))
    }

    pub fn ensure_dirs(&self) -> std::io::Result<()> {
        std::fs::create_dir_all(&self.config_dir)?;
        std::fs::create_dir_all(&self.state_dir)?;
        std::fs::create_dir_all(&self.cache_dir)?;
        // Desktop reuses terminal cookie paths — create those parents too.
        if let Some(parent) = self.cookie_file.parent() {
            std::fs::create_dir_all(parent)?;
        }
        if let Some(parent) = self.cookie_lock_file.parent() {
            std::fs::create_dir_all(parent)?;
        }
        if self.is_desktop() {
            let _ = std::fs::create_dir_all(self.default_download_dir());
        }
        Ok(())
    }

    pub fn venv_python(&self) -> PathBuf {
        dirs::home_dir()
            .unwrap_or_default()
            .join("youtubedownloading/yt-venv/bin/python3")
    }
}

impl Default for YtdPaths {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn desktop_ensure_dirs_creates_shared_cookie_parents() {
        let base = std::env::temp_dir().join(format!(
            "ytd-paths-test-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&base);

        let terminal_config = base.join("terminal-config");
        let terminal_state = base.join("terminal-state");
        let desktop_config = base.join("desktop-config");
        let desktop_state = base.join("desktop-state");
        let desktop_cache = base.join("desktop-cache");

        let paths = YtdPaths {
            app_id: DESKTOP_APP_ID.into(),
            config_dir: desktop_config.clone(),
            state_dir: desktop_state.clone(),
            cache_dir: desktop_cache.clone(),
            cookie_file: terminal_config.join("cookies.txt"),
            cookie_lock_file: terminal_state.join("cookies.lock"),
        };

        paths.ensure_dirs().expect("ensure_dirs should succeed");

        assert!(terminal_config.is_dir());
        assert!(terminal_state.is_dir());
        assert!(desktop_config.is_dir());
        assert!(desktop_state.is_dir());
        assert!(desktop_cache.is_dir());

        let _ = fs::remove_dir_all(&base);
    }
}
