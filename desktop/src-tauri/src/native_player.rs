use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, WebviewWindow};

static MPV_CHILD: Mutex<Option<Child>> = Mutex::new(None);

#[cfg(target_os = "linux")]
static MPV_IPC_PATH: Mutex<Option<PathBuf>> = Mutex::new(None);

#[cfg(target_os = "linux")]
static EMBED_PTR: Mutex<Option<usize>> = Mutex::new(None);

#[cfg(target_os = "linux")]
static CINEMA_PTR_SOURCE: Mutex<Option<gtk::glib::SourceId>> = Mutex::new(None);

#[cfg(target_os = "linux")]
static CINEMA_LAST_PTR: Mutex<Option<(i32, i32)>> = Mutex::new(None);

#[cfg(target_os = "linux")]
static LAST_PLAYER_BOUNDS: Mutex<Option<NativePlayerBounds>> = Mutex::new(None);

/// Logical pixels relative to the webview viewport (from getBoundingClientRect).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativePlayerBounds {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    #[serde(default = "default_bounds_visible")]
    pub visible: bool,
}

fn default_bounds_visible() -> bool {
    true
}

#[cfg(target_os = "linux")]
pub fn can_embed_mpv() -> bool {
    which::which("mpv").is_ok()
}

#[cfg(not(target_os = "linux"))]
pub fn can_embed_mpv() -> bool {
    false
}

pub fn has_native_player() -> bool {
    can_embed_mpv()
}

pub fn stop_mpv_process() -> Result<(), String> {
    let mut guard = MPV_CHILD.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = guard.take() {
        let _ = child.kill();
        std::thread::spawn(move || {
            let _ = child.wait();
        });
    }
    #[cfg(target_os = "linux")]
    {
        if let Ok(mut last) = LAST_PLAYER_BOUNDS.lock() {
            *last = None;
        }
        if let Ok(mut path) = MPV_IPC_PATH.lock() {
            if let Some(sock) = path.take() {
                let _ = std::fs::remove_file(sock);
            }
        }
        destroy_embed_window();
    }
    Ok(())
}

#[cfg(target_os = "linux")]
fn ipc_socket_path() -> PathBuf {
    std::env::temp_dir().join(format!("ytd-mpv-{}.sock", std::process::id()))
}

#[cfg(target_os = "linux")]
fn mpv_ipc_payload(action: &str) -> Result<&'static str, String> {
    match action {
        "pause" => Ok(r#"{"command":["cycle","pause"]}"#),
        "seekBack" => Ok(r#"{"command":["seek",-10,"relative"]}"#),
        "seekForward" => Ok(r#"{"command":["seek",10,"relative"]}"#),
        "volumeUp" => Ok(r#"{"command":["add","volume",5]}"#),
        "volumeDown" => Ok(r#"{"command":["add","volume",-5]}"#),
        "mute" => Ok(r#"{"command":["cycle","mute"]}"#),
        "fitWindow" => Ok(r#"{"command":["set_property","keepaspect-window",false]}"#),
        "fillFrame" => Ok(r#"{"command":["set_property","panscan",1.0]}"#),
        other => Err(format!("Unknown player action: {other}")),
    }
}

#[cfg(target_os = "linux")]
fn query_mpv_property(property: &str) -> Result<serde_json::Value, String> {
    use std::io::{BufRead, BufReader, Write};
    use std::os::unix::net::UnixStream;

    let path = MPV_IPC_PATH
        .lock()
        .map_err(|e| e.to_string())?
        .clone()
        .ok_or_else(|| "Player is not running.".to_string())?;

    let mut stream =
        UnixStream::connect(&path).map_err(|e| format!("Could not reach mpv ({e})"))?;
    writeln!(
        stream,
        "{}",
        format!(r#"{{"command":["get_property","{property}"]}}"#)
    )
    .map_err(|e| e.to_string())?;
    let mut reader = BufReader::new(stream);
    let mut line = String::new();
    reader.read_line(&mut line).map_err(|e| e.to_string())?;

    let value: serde_json::Value =
        serde_json::from_str(&line).map_err(|e| format!("Invalid mpv response: {e}"))?;
    if value.get("error").and_then(|v| v.as_str()) != Some("success") {
        return Err(format!("Could not read mpv property '{property}': {line}"));
    }

    Ok(value
        .get("data")
        .cloned()
        .unwrap_or(serde_json::Value::Null))
}

#[cfg(target_os = "linux")]
fn query_mpv_pause() -> Result<bool, String> {
    Ok(query_mpv_property("pause")?
        .as_bool()
        .unwrap_or(false))
}

#[cfg(target_os = "linux")]
fn query_mpv_volume() -> Result<(f64, bool), String> {
    let volume = query_mpv_property("volume")?.as_f64().unwrap_or(100.0);
    let muted = query_mpv_property("mute")?.as_bool().unwrap_or(false);
    Ok((volume.clamp(0.0, 100.0), muted))
}

#[cfg(target_os = "linux")]
fn set_mpv_volume(volume: f64) -> Result<(), String> {
    let vol = volume.clamp(0.0, 100.0);
    send_mpv_ipc_raw(&format!(r#"{{"command":["set_property","volume",{vol}]}}"#))?;
    if vol > 0.0 {
        let _ = send_mpv_ipc_raw(r#"{"command":["set_property","mute",false]}"#);
    }
    Ok(())
}

#[cfg(target_os = "linux")]
fn query_mpv_progress() -> Result<(f64, f64), String> {
    let position = query_mpv_property("time-pos")?.as_f64().unwrap_or(0.0);
    let duration = query_mpv_property("duration")?.as_f64().unwrap_or(0.0);
    Ok((position.max(0.0), duration.max(0.0)))
}

#[cfg(target_os = "linux")]
fn seek_mpv_absolute(seconds: f64) -> Result<(), String> {
    let target = seconds.max(0.0);
    send_mpv_ipc_raw(&format!(r#"{{"command":["seek",{target},"absolute"]}}"#))
}

#[cfg(target_os = "linux")]
fn send_mpv_ipc_raw(payload: &str) -> Result<(), String> {
    use std::io::{BufRead, BufReader, Write};
    use std::os::unix::net::UnixStream;

    let path = MPV_IPC_PATH
        .lock()
        .map_err(|e| e.to_string())?
        .clone()
        .ok_or_else(|| "Player is not running.".to_string())?;

    let mut stream =
        UnixStream::connect(&path).map_err(|e| format!("Could not reach mpv ({e})"))?;
    writeln!(stream, "{payload}").map_err(|e| e.to_string())?;
    let mut reader = BufReader::new(stream);
    let mut line = String::new();
    reader.read_line(&mut line).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(target_os = "linux")]
fn apply_fill_frame() -> Result<(), String> {
    send_mpv_ipc_raw(r#"{"command":["set_property","keepaspect",false]}"#)?;
    send_mpv_ipc_raw(r#"{"command":["set_property","keepaspect-window",false]}"#)?;
    send_mpv_ipc_raw(r#"{"command":["set_property","panscan",1.0]}"#)?;
    send_mpv_ipc_raw(r#"{"command":["set_property","video-unscaled",false]}"#)?;
    Ok(())
}

#[cfg(target_os = "linux")]
fn send_mpv_ipc(action: &str) -> Result<(), String> {
    if action == "fillFrame" {
        return apply_fill_frame();
    }

    let payload = mpv_ipc_payload(action)?;
    send_mpv_ipc_raw(payload)
}

#[cfg(target_os = "linux")]
fn destroy_embed_window() {
    if let Ok(mut ptr) = EMBED_PTR.lock() {
        if let Some(raw) = ptr.take() {
            let window: gtk::Window =
                unsafe { gtk::glib::translate::from_glib_full(raw as *mut gtk::ffi::GtkWindow) };
            use gtk::prelude::GtkWindowExt;
            window.close();
        }
    }
}

#[cfg(target_os = "linux")]
fn pump_gtk_events() {
    while gtk::events_pending() {
        gtk::main_iteration();
    }
}

/// Reparent the mpv surface into the app window using the same logical pixels as the webview.
#[cfg(target_os = "linux")]
fn place_embed_surface(
    embed_gdk: &gdk::Window,
    parent_gdk: &gdk::Window,
    bounds: &NativePlayerBounds,
    visible: bool,
) -> Result<(), String> {
    let x = bounds.x.max(0);
    let y = bounds.y.max(0);
    let mut w = bounds.width.max(0);
    let mut h = bounds.height.max(0);
    if visible {
        w = w.max(1);
        h = h.max(1);
    }
    embed_gdk.hide();
    embed_gdk.reparent(parent_gdk, x, y);
    embed_gdk.resize(w, h);
    if visible {
        embed_gdk.show();
    }
    Ok(())
}

#[cfg(target_os = "linux")]
fn create_child_embed(
    window: &WebviewWindow,
    bounds: &NativePlayerBounds,
) -> Result<u64, String> {
    use gdkx11::X11Window;
    use gtk::prelude::*;
    use gtk::{Window, WindowType};

    destroy_embed_window();

    let gtk_parent = window
        .gtk_window()
        .map_err(|e| format!("Could not access GTK window: {e}"))?;

    let parent_gdk = gtk_parent
        .window()
        .ok_or_else(|| "Could not access parent window.".to_string())?;

    let w = bounds.width.max(200);
    let h = bounds.height.max(120);

    let embed = Window::new(WindowType::Toplevel);
    embed.set_decorated(false);
    embed.set_resizable(false);
    embed.set_skip_taskbar_hint(true);
    embed.set_skip_pager_hint(true);
    embed.set_accept_focus(false);
    embed.set_type_hint(gdk::WindowTypeHint::Utility);
    embed.set_transient_for(Some(&gtk_parent));
    embed.set_default_size(w, h);
    embed.resize(w, h);
    embed.set_visible(false);

    embed.realize();
    pump_gtk_events();

    let embed_gdk = embed
        .window()
        .ok_or_else(|| "Could not create video surface.".to_string())?;

    // Keep hidden until mpv attaches and we do a final positioned show.
    place_embed_surface(&embed_gdk, &parent_gdk, bounds, false)?;
    pump_gtk_events();
    embed_gdk.resize(w, h);
    pump_gtk_events();

    let xid = embed_gdk
        .downcast_ref::<X11Window>()
        .map(|x11| x11.xid() as u64)
        .unwrap_or(0);

    if xid == 0 {
        embed.close();
        return Err(
            "embed_unavailable: X11 window id missing — restart with GDK_BACKEND=x11".to_string(),
        );
    }

    let raw = {
        use gtk::glib::translate::ToGlibPtr;
        let ptr: *mut gtk::ffi::GtkWindow = embed.to_glib_none().0;
        std::mem::forget(embed);
        ptr as usize
    };
    if let Ok(mut ptr) = EMBED_PTR.lock() {
        *ptr = Some(raw);
    }

    Ok(xid)
}

#[cfg(target_os = "linux")]
fn show_embed_window(embed: &gtk::Window, embed_gdk: &gdk::Window, bounds: &NativePlayerBounds) -> Result<(), String> {
    use gtk::prelude::*;

    let parent_gdk = embed
        .transient_for()
        .and_then(|p| p.window())
        .ok_or_else(|| "No parent window.".to_string())?;

    embed.resize(bounds.width.max(1), bounds.height.max(1));
    place_embed_surface(embed_gdk, &parent_gdk, bounds, bounds.visible)?;
    if bounds.visible {
        embed.set_visible(true);
        embed.show_all();
    } else {
        embed.set_visible(false);
    }
    pump_gtk_events();
    Ok(())
}

#[cfg(target_os = "linux")]
fn refresh_mpv_surface() {
    let _ = send_mpv_ipc_raw(r#"{"command":["run","vo","reconfig"]}"#);
    let _ = apply_fill_frame();
}

#[cfg(target_os = "linux")]
fn reposition_child_embed(_window: &WebviewWindow, bounds: &NativePlayerBounds) -> Result<(), String> {
    use gtk::prelude::*;

    let raw = EMBED_PTR
        .lock()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No embed window.".to_string())?;

    let embed: gtk::Window =
        unsafe { gtk::glib::translate::from_glib_none(raw as *mut gtk::ffi::GtkWindow) };

    let embed_gdk = embed
        .window()
        .ok_or_else(|| "No embed surface.".to_string())?;

    if !bounds.visible {
        embed_gdk.hide();
        embed.set_visible(false);
        pump_gtk_events();
        return Ok(());
    }

    show_embed_window(&embed, &embed_gdk, bounds)
}

#[cfg(target_os = "linux")]
fn spawn_mpv_embedded(path: &str, wid: u64) -> Result<Child, String> {
    let mpv = which::which("mpv").map_err(|_| {
        "mpv not found — install for in-app playback: sudo apt install mpv".to_string()
    })?;

    let ipc_path = ipc_socket_path();
    let _ = std::fs::remove_file(&ipc_path);

    let child = Command::new(mpv)
        .args([
            "--no-terminal",
            "--keep-open=no",
            "--fs=no",
            "--hwdec=auto-safe",
            "--vo=x11",
            "--no-border",
            "--osc=no",
            "--osd-level=0",
            "--keepaspect-window=no",
            "--keepaspect=no",
            "--video-unscaled=no",
            "--panscan=1.0",
            "--autofit-larger=100%",
            "--ontop=no",
            "--no-input-default-bindings",
            "--force-window=yes",
            &format!("--input-ipc-server={}", ipc_path.display()),
            &format!("--wid={wid}"),
            path,
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start mpv: {e}"))?;

    if let Ok(mut guard) = MPV_IPC_PATH.lock() {
        *guard = Some(ipc_path);
    }

    Ok(child)
}

#[cfg(target_os = "linux")]
fn run_on_main<T: Send + 'static>(
    window: &WebviewWindow,
    f: impl FnOnce() -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    let (tx, rx) = std::sync::mpsc::sync_channel(1);
    window
        .run_on_main_thread(move || {
            let _ = tx.send(f());
        })
        .map_err(|e| format!("GTK error: {e}"))?;
    rx.recv().map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn has_native_player_cmd() -> bool {
    has_native_player()
}

#[tauri::command]
pub async fn start_native_player(
    window: WebviewWindow,
    path: String,
    bounds: NativePlayerBounds,
) -> Result<(), String> {
    if !std::path::Path::new(&path).is_file() {
        return Err(format!("Media file not found: {path}"));
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _ = (window, bounds);
        return Err("embed_unavailable".to_string());
    }

    #[cfg(target_os = "linux")]
    {
        if !can_embed_mpv() {
            return Err("embed_unavailable".to_string());
        }

        stop_mpv_process()?;

        let win = window.clone();
        let bounds_clone = bounds.clone();
        let wid = run_on_main(&win.clone(), move || create_child_embed(&win, &bounds_clone))?;

        let win_show = window.clone();
        let bounds_show = bounds.clone();
        run_on_main(&win_show.clone(), move || reposition_child_embed(&win_show, &bounds_show))?;

        std::thread::sleep(std::time::Duration::from_millis(50));
        let child = spawn_mpv_embedded(&path, wid)?;
        *MPV_CHILD.lock().map_err(|e| e.to_string())? = Some(child);
        std::thread::sleep(std::time::Duration::from_millis(200));

        refresh_mpv_surface();
        let _ = send_mpv_ipc("fitWindow");
        let _ = send_mpv_ipc("fillFrame");

        let win_final = window.clone();
        let bounds_final = bounds.clone();
        run_on_main(&win_final.clone(), move || reposition_child_embed(&win_final, &bounds_final))?;

        Ok(())
    }
}

#[tauri::command]
pub fn native_player_paused() -> Result<bool, String> {
    #[cfg(not(target_os = "linux"))]
    {
        return Ok(false);
    }

    #[cfg(target_os = "linux")]
    {
        if MPV_CHILD.lock().map_err(|e| e.to_string())?.is_none() {
            return Err("Player is not running.".to_string());
        }
        query_mpv_pause()
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativePlayerProgress {
    pub position: f64,
    pub duration: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativePlayerVolume {
    pub volume: f64,
    pub muted: bool,
}

#[tauri::command]
pub fn native_player_progress() -> Result<NativePlayerProgress, String> {
    #[cfg(not(target_os = "linux"))]
    {
        return Ok(NativePlayerProgress {
            position: 0.0,
            duration: 0.0,
        });
    }

    #[cfg(target_os = "linux")]
    {
        if MPV_CHILD.lock().map_err(|e| e.to_string())?.is_none() {
            return Err("Player is not running.".to_string());
        }
        let (position, duration) = query_mpv_progress()?;
        Ok(NativePlayerProgress { position, duration })
    }
}

#[tauri::command]
pub fn native_player_volume() -> Result<NativePlayerVolume, String> {
    #[cfg(not(target_os = "linux"))]
    {
        return Ok(NativePlayerVolume {
            volume: 100.0,
            muted: false,
        });
    }

    #[cfg(target_os = "linux")]
    {
        if MPV_CHILD.lock().map_err(|e| e.to_string())?.is_none() {
            return Err("Player is not running.".to_string());
        }
        let (volume, muted) = query_mpv_volume()?;
        Ok(NativePlayerVolume { volume, muted })
    }
}

#[tauri::command]
pub fn native_player_set_volume(volume: f64) -> Result<(), String> {
    #[cfg(not(target_os = "linux"))]
    {
        let _ = volume;
        return Err("Player volume is only available on Linux.".to_string());
    }

    #[cfg(target_os = "linux")]
    {
        if MPV_CHILD.lock().map_err(|e| e.to_string())?.is_none() {
            return Err("Player is not running.".to_string());
        }
        set_mpv_volume(volume)
    }
}

#[tauri::command]
pub fn native_player_seek(seconds: f64) -> Result<(), String> {
    #[cfg(not(target_os = "linux"))]
    {
        let _ = seconds;
        return Err("Player seek is only available on Linux.".to_string());
    }

    #[cfg(target_os = "linux")]
    {
        if MPV_CHILD.lock().map_err(|e| e.to_string())?.is_none() {
            return Err("Player is not running.".to_string());
        }
        seek_mpv_absolute(seconds)
    }
}

#[tauri::command]
pub fn native_player_control(action: String) -> Result<(), String> {
    #[cfg(not(target_os = "linux"))]
    {
        let _ = action;
        return Err("Player controls are only available on Linux.".to_string());
    }

    #[cfg(target_os = "linux")]
    {
        if action == "fullscreen" {
            return Ok(());
        }
        if MPV_CHILD.lock().map_err(|e| e.to_string())?.is_none() {
            return Err("Player is not running.".to_string());
        }
        send_mpv_ipc(&action)
    }
}

#[cfg(target_os = "linux")]
fn bounds_unchanged(prev: &NativePlayerBounds, next: &NativePlayerBounds) -> bool {
    prev.x == next.x
        && prev.y == next.y
        && prev.width == next.width
        && prev.height == next.height
        && prev.visible == next.visible
}

#[tauri::command]
pub async fn update_native_player_bounds(
    window: WebviewWindow,
    bounds: NativePlayerBounds,
) -> Result<(), String> {
    #[cfg(not(target_os = "linux"))]
    {
        let _ = (window, bounds);
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        if MPV_CHILD.lock().map_err(|e| e.to_string())?.is_none() {
            return Ok(());
        }

        {
            let mut guard = LAST_PLAYER_BOUNDS.lock().map_err(|e| e.to_string())?;
            if guard
                .as_ref()
                .is_some_and(|prev| bounds_unchanged(prev, &bounds))
            {
                return Ok(());
            }
            *guard = Some(bounds.clone());
        }

        let win = window.clone();
        let bounds_clone = bounds.clone();
        run_on_main(&win.clone(), move || reposition_child_embed(&win, &bounds_clone))?;
        Ok(())
    }
}

#[tauri::command]
pub async fn stop_native_player_cmd(_app: AppHandle) -> Result<(), String> {
    stop_mpv_process()?;
    Ok(())
}

/// Pointer position relative to the app window (works even when mpv covers the webview).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PointerInWindow {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[cfg(target_os = "linux")]
fn read_pointer_in_window(window: &WebviewWindow) -> Result<Option<PointerInWindow>, String> {
    use gdk::prelude::{DeviceExt, SeatExt};
    use gtk::prelude::WidgetExt;

    let gtk_win = window
        .gtk_window()
        .map_err(|e| format!("Could not access GTK window: {e}"))?;
    let gdk_win = gtk_win
        .window()
        .ok_or_else(|| "Could not access GDK window.".to_string())?;

    let display = gdk_win.display();
    let seat = display
        .default_seat()
        .ok_or_else(|| "Could not access input seat.".to_string())?;
    let device = seat
        .pointer()
        .ok_or_else(|| "Could not read pointer device.".to_string())?;

    let width = gdk_win.width() as i32;
    let height = gdk_win.height() as i32;

    let (win_at, x, y, _mods) = gdk_win.device_position_double(&device);
    let (x, y) = if win_at.is_some() {
        (x.round() as i32, y.round() as i32)
    } else {
        let (_screen, root_x, root_y) = device.position_double();
        let (win_x, win_y, _) = gdk_win.origin();
        (root_x.round() as i32 - win_x, root_y.round() as i32 - win_y)
    };

    if x < 0 || y < 0 || x >= width || y >= height {
        return Ok(None);
    }

    Ok(Some(PointerInWindow {
        x,
        y,
        width,
        height,
    }))
}

#[cfg(target_os = "linux")]
fn stop_cinema_pointer_watch() {
    if let Ok(mut guard) = CINEMA_PTR_SOURCE.lock() {
        if let Some(id) = guard.take() {
            id.remove();
        }
    }
    if let Ok(mut last) = CINEMA_LAST_PTR.lock() {
        *last = None;
    }
}

#[tauri::command]
pub fn pointer_in_app_window(window: WebviewWindow) -> Result<Option<PointerInWindow>, String> {
    #[cfg(not(target_os = "linux"))]
    {
        let _ = window;
        return Ok(None);
    }

    #[cfg(target_os = "linux")]
    {
        let win = window.clone();
        run_on_main(&win, move || read_pointer_in_window(&window))
    }
}

#[tauri::command]
pub fn set_cinema_pointer_watch(window: WebviewWindow, enabled: bool) -> Result<(), String> {
    #[cfg(not(target_os = "linux"))]
    {
        let _ = (window, enabled);
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        let win = window.clone();
        run_on_main(&win, move || {
            stop_cinema_pointer_watch();
            if !enabled {
                return Ok(());
            }

            let emit_win = window.clone();
            let source_id = gtk::glib::timeout_add_local(std::time::Duration::from_millis(40), move || {
                if let Ok(Some(pos)) = read_pointer_in_window(&emit_win) {
                    let changed = if let Ok(mut last) = CINEMA_LAST_PTR.lock() {
                        let changed = last
                            .map(|(lx, ly)| lx != pos.x || ly != pos.y)
                            .unwrap_or(false);
                        *last = Some((pos.x, pos.y));
                        changed
                    } else {
                        false
                    };
                    if changed {
                        let _ = emit_win.emit("cinema-pointer", &pos);
                    }
                }
                gtk::glib::ControlFlow::Continue
            });

            if let Ok(mut guard) = CINEMA_PTR_SOURCE.lock() {
                *guard = Some(source_id);
            }
            Ok(())
        })
    }
}
