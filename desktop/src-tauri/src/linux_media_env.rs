//! WebKitGTK + GStreamer tuning for reliable in-app video on Linux.

#[cfg(target_os = "linux")]
pub fn configure() {
    // DMA-buf GL paths often produce black frames or tearing in embedded WebKit.
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");

    // Broken VAAPI hw decode shows as green blocks / scratching — prefer software H.264.
    if std::env::var("GST_PLUGIN_FEATURE_RANK").is_err() {
        std::env::set_var(
            "GST_PLUGIN_FEATURE_RANK",
            "avdec_h264:PRIMARY,avdec_h265:PRIMARY,vaapih264dec:NONE,vaapidecodebin:NONE,vaapisink:NONE",
        );
    }
}

#[cfg(not(target_os = "linux"))]
pub fn configure() {}
