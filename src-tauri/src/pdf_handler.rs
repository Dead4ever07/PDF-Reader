use crate::models::{PdfPageData, PdfTextElement};
use pdfium_render::prelude::*;

#[tauri::command]
pub fn parse_pdf(path: String) -> Result<Vec<PdfPageData>, String> {
    let pdfium = Pdfium::new(
        Pdfium::bind_to_library(Pdfium::pdfium_platform_library_name_at_path(
            "/home/luis-santos/Desktop/firstTauriApp/Test1/src-tauri/",
        ))
        .map_err(|e| format!("Failed to bind to Pdfium: {}", e))?,
    );

    let document = pdfium
        .load_pdf_from_file(&path, None)
        .map_err(|e| format!("Failed to load PDF: {}", e))?;

    let mut pages_data = Vec::new();

    for (index, page) in document.pages().iter().enumerate() {
        let mut elements = Vec::new();

        for object in page.objects().iter() {
            if let Some(text_object) = object.as_text_object() {
                
                let raw_text = text_object.text();
                
                // THE FIX: Only process if it has at least one letter or number
                if raw_text.chars().any(|c| c.is_alphanumeric()) {
                    
                    if let Ok(bounds) = text_object.bounds() {
                        elements.push(PdfTextElement {
                            text: raw_text.trim().to_string(), // Clean up extra spaces
                            x: bounds.left().value,
                            y: page.height().value - bounds.top().value, 
                            width: bounds.width().value,
                            height: bounds.height().value,
                        });
                    }
                }
            }
        }
        pages_data.push(PdfPageData {
            page_number: index as u16 + 1,
            width: page.width().value,
            height: page.height().value,
            elements,
        });
    }

    Ok(pages_data)
}
