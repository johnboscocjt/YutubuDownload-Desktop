fn main() {
    // Re-embed frontend assets when Vite output changes (screenshots, hashed /assets/*, etc.).
    println!("cargo:rerun-if-changed=../dist");
    tauri_build::build()
}
