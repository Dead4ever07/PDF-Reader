pub mod models;
pub mod pdf_handler;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Changed "shell" to "opener" to match your Tauri template!
        .plugin(tauri_plugin_opener::init()) 
        .invoke_handler(tauri::generate_handler![pdf_handler::parse_pdf])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}