//! Linux WebKit needs a real D-Bus session for GStreamer media decoding.
//! Cursor/IDE terminals often set DBUS_SESSION_BUS_ADDRESS=disabled.

#[cfg(target_os = "linux")]
pub fn bootstrap() {
    if std::env::var("GDK_BACKEND").is_err() {
        std::env::set_var("GDK_BACKEND", "x11");
    }

    if std::env::var("YTD_DBUS_BOOTSTRAPPED").is_ok() {
        return;
    }

    let dbus = std::env::var("DBUS_SESSION_BUS_ADDRESS").unwrap_or_default();
    if !dbus.is_empty() && dbus != "disabled" {
        return;
    }

    // Desktop launcher may already start dbus-run-session; skip duplicate re-exec.
    if std::env::var("YTD_SKIP_DBUS_BOOTSTRAP").is_ok() {
        return;
    }

    let dbus_run = match which::which("dbus-run-session") {
        Ok(p) => p,
        Err(_) => return,
    };

    let exe = match std::env::current_exe() {
        Ok(e) => e,
        Err(_) => return,
    };

    std::env::set_var("YTD_DBUS_BOOTSTRAPPED", "1");

    let mut cmd = std::process::Command::new(dbus_run);
    cmd.arg("--").arg(&exe);
    for arg in std::env::args().skip(1) {
        cmd.arg(arg);
    }

    match cmd.status() {
        Ok(status) => std::process::exit(status.code().unwrap_or(1)),
        Err(_) => {
            let _ = std::env::remove_var("YTD_DBUS_BOOTSTRAPPED");
        }
    }
}

#[cfg(not(target_os = "linux"))]
pub fn bootstrap() {}
