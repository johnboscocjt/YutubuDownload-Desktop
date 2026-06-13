use clap::{Parser, Subcommand};
use serde::Serialize;
use ytd_core::{
    check_dependencies, ensure_cookie_store, fetch_available_video_heights, fetch_metadata,
    refresh_cookie_store, resolve_video_quality, YtdPaths, STANDARD_HEIGHTS,
};

#[derive(Parser)]
#[command(name = "ytd-core-cli", version, about = "YutubuDownload headless API")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Deps,
    Cookies {
        #[arg(long)]
        force: bool,
    },
    Heights {
        url: String,
    },
    Resolve {
        url: String,
        #[arg(long, default_value_t = 720)]
        height: u32,
    },
    Metadata {
        url: String,
        #[arg(long)]
        playlist: bool,
    },
    Standards,
}

#[derive(Serialize)]
struct JsonOut<T: Serialize> {
    ok: bool,
    data: Option<T>,
    error: Option<String>,
}

fn ok<T: Serialize>(data: T) {
    println!(
        "{}",
        serde_json::to_string(&JsonOut {
            ok: true,
            data: Some(data),
            error: None,
        })
        .unwrap()
    );
}

fn err(msg: impl Into<String>) {
    println!(
        "{}",
        serde_json::to_string(&JsonOut::<()> {
            ok: false,
            data: None,
            error: Some(msg.into()),
        })
        .unwrap()
    );
    std::process::exit(1);
}

fn main() {
    let cli = Cli::parse();
    let paths = YtdPaths::new();

    match cli.command {
        Commands::Deps => ok(check_dependencies(&paths)),
        Commands::Cookies { force } => match refresh_cookie_store(&paths, force) {
            Ok(msg) => ok(msg),
            Err(e) => err(e.to_string()),
        },
        Commands::Heights { url } => {
            let _ = ensure_cookie_store(&paths);
            match fetch_available_video_heights(&paths, &url) {
                Ok(h) => ok(h),
                Err(e) => err(e.to_string()),
            }
        }
        Commands::Resolve { url, height } => {
            let _ = ensure_cookie_store(&paths);
            let listed = fetch_available_video_heights(&paths, &url).unwrap_or_default();
            match resolve_video_quality(&paths, &url, height, &listed) {
                Ok(r) => ok(r),
                Err(e) => err(e.to_string()),
            }
        }
        Commands::Metadata { url, playlist } => {
            let _ = ensure_cookie_store(&paths);
            match fetch_metadata(&paths, &url, playlist) {
                Ok(m) => ok(m),
                Err(e) => err(e.to_string()),
            }
        }
        Commands::Standards => ok(STANDARD_HEIGHTS),
    }
}
