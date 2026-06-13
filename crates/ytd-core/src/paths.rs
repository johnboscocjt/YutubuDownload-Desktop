use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct YtdPaths {
    pub config_dir: PathBuf,
    pub state_dir: PathBuf,
    pub cache_dir: PathBuf,
    pub cookie_file: PathBuf,
    pub cookie_lock_file: PathBuf,
}

impl YtdPaths {
    pub fn new() -> Self {
        let config_dir = std::env::var("XDG_CONFIG_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|_| dirs::home_dir().unwrap_or_default().join(".config"))
            .join("YutubuDownload");

        let state_dir = std::env::var("XDG_STATE_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|_| dirs::home_dir().unwrap_or_default().join(".local/state"))
            .join("YutubuDownload");

        let cache_dir = std::env::var("XDG_CACHE_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|_| dirs::home_dir().unwrap_or_default().join(".cache"))
            .join("YutubuDownload");

        let cookie_file = config_dir.join("cookies.txt");
        let cookie_lock_file = state_dir.join("cookies.lock");

        Self {
            config_dir,
            state_dir,
            cache_dir,
            cookie_file,
            cookie_lock_file,
        }
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
