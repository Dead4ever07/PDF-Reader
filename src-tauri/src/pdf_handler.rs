use pdfium_render::prelude::*;
use crate::models::{PdfPageData, PdfTextElement};

#[tauri::command]
pub fn parse_pdf(path: String) -> Result<Vec<PdfPageData>, String> {
    let pdfium = Pdfium::new(
        Pdfium::bind_to_library(Pdfium::pdfium_platform_library_name_at_path("./"))
            .map_err(|e| format!("Failed to bind to Pdfium: {}", e))?
    );

    let document = pdfium.load_pdf_from_file(&path, None)
        .map_err(|e| format!("Failed to load PDF: {}", e))?;
        
    let mut pages_data = Vec::new();

    for (index, page) in document.pages().iter().enumerate() {
        let mut raw_elements = Vec::new();
        
        // 1. Collect all valid words on the page
        for object in page.objects().iter() {
            if let Some(text_object) = object.as_text_object() {
                let raw_text = text_object.text();
                if raw_text.chars().any(|c| c.is_alphanumeric()) {
                    if let Ok(bounds) = text_object.bounds() {
                        raw_elements.push(PdfTextElement {
                            text: raw_text.trim().to_string(),
                            x: bounds.left().value,
                            y: page.height().value - bounds.top().value, 
                            width: bounds.width().value,
                            height: bounds.height().value,
                        });
                    }
                }
            }
        }

        // 2. Sort words vertically (Top to Bottom)
        // PDF Y=0 is at the bottom, so we sort descending
        raw_elements.sort_by(|a, b| a.y.partial_cmp(&b.y).unwrap_or(std::cmp::Ordering::Equal));

        let mut line_elements = Vec::new();
        let mut current_line: Vec<PdfTextElement> = Vec::new();
        let y_tolerance = 5.0; // Margin of error for words on the same line

        // 3. Group words into lines
        for el in raw_elements {
            if current_line.is_empty() {
                current_line.push(el);
            } else {
                let baseline_y = current_line[0].y;
                // If the word is on the same vertical level
                if (el.y - baseline_y).abs() <= y_tolerance {
                    current_line.push(el);
                } else {
                    // Merge the current line and start a new one
                    line_elements.push(merge_line_elements(&mut current_line));
                    current_line.push(el);
                }
            }
        }
        
        // Don't forget to push the very last line!
        if !current_line.is_empty() {
            line_elements.push(merge_line_elements(&mut current_line));
        }

        pages_data.push(PdfPageData { 
            page_number: index as u16 + 1, 
            width: page.width().value,   
            height: page.height().value, 
            elements: line_elements // ⬅️ We now send merged lines instead of individual words!
        });
    }

    Ok(pages_data)
}

// Helper function to merge an array of words into a single line bounding box
fn merge_line_elements(line: &mut Vec<PdfTextElement>) -> PdfTextElement {
    // Sort words left-to-right
    line.sort_by(|a, b| a.x.partial_cmp(&b.x).unwrap_or(std::cmp::Ordering::Equal));
    let first = line.first().unwrap();
    let last = line.last().unwrap();

    let min_x = first.x;
    let max_x = last.x + last.width; // The far right edge of the last word
    
    // Find the highest top edge and tallest height in the line
    let max_y = line.iter().map(|e| e.y).fold(f32::MIN, f32::max);
    let max_height = line.iter().map(|e| e.height).fold(f32::MIN, f32::max);

    // Combine all the text with spaces
    let combined_text = line.iter().map(|e| e.text.as_str()).collect::<Vec<&str>>().join(" ");

    let merged = PdfTextElement {
        text: combined_text,
        x: min_x,
        y: max_y,
        width: max_x - min_x,
        height: max_height,
    };
    
    line.clear(); // Empty the vector so it can be reused for the next line
    merged
}