use thiserror::Error;

#[derive(Debug, Error)]
pub enum YtdError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("yt-dlp not found in PATH")]
    YtdlpNotFound,

    #[error("yt-dlp failed: {0}")]
    YtdlpFailed(String),

    #[error("cookie error: {0}")]
    Cookie(String),

    #[error("download job not found: {0}")]
    JobNotFound(String),

    #[error("invalid configuration: {0}")]
    Config(String),

    #[error("{0}")]
    Other(String),
}

pub type Result<T> = std::result::Result<T, YtdError>;
