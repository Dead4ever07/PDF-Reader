use crate::models::{PdfPageData, PdfTextElement};
use pdfium_render::prelude::*;
use std::io::Write;
use std::process::{Command, Stdio};
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn parse_pdf(app: AppHandle, path: String) -> Result<Vec<PdfPageData>, String> {
    println!("Loading the library");

    let resource_dir = app
        .path()
        .resolve("resources", tauri::path::BaseDirectory::Resource)
        .map_err(|e| format!("Failed to resolve resource directory: {}", e))?;

    let resource_dir_str = resource_dir
        .to_str()
        .ok_or("Invalid characters in resource path")?;

    let pdfium = Pdfium::new(
        Pdfium::bind_to_library(Pdfium::pdfium_platform_library_name_at_path(
            resource_dir_str,
        ))
        .map_err(|e| format!("Failed to bind to Pdfium at {}: {}", resource_dir_str, e))?,
    );

    println!("Starting the file parsing");
    let document = pdfium
        .load_pdf_from_file(&path, None)
        .map_err(|e| format!("Failed to load PDF: {}", e))?;

    println!("File loaded, starting the parsing");

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

        if !current_line.is_empty() {
            line_elements.push(merge_line_elements(&mut current_line));
        }

        pages_data.push(PdfPageData {
            page_number: index as u16 + 1,
            width: page.width().value,
            height: page.height().value,
            elements: line_elements, // ⬅️ We now send merged lines instead of individual words!
        });
    }
    println!("Data sent to the front end");
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
    let combined_text = line
        .iter()
        .map(|e| e.text.as_str())
        .collect::<Vec<&str>>()
        .join(" ");

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

#[tauri::command]
pub fn generate_audio(
    app: tauri::AppHandle,
    text: String,
    voice_name: String,
) -> Result<Vec<u8>, String> {
    let piper_path = app
        .path()
        .resolve(
            "resources/piper/piper",
            tauri::path::BaseDirectory::Resource,
        )
        .map_err(|e| format!("Could not find Piper: {}", e))?;

    let piper_dir = piper_path
        .parent()
        .ok_or("Could not find Piper directory")?;

    // 1. Resolve the .onnx model path
    let model_path_str = format!("resources/models/{}/voice.onnx", voice_name);
    let model_path = app
        .path()
        .resolve(&model_path_str, tauri::path::BaseDirectory::Resource)
        .map_err(|e| format!("Could not find Voice Model {}: {}", voice_name, e))?;

    // 2. THE FIX: Resolve the .json config path explicitly
    let config_path_str = format!("resources/models/{}/voice.json", voice_name);
    let config_path = app
        .path()
        .resolve(&config_path_str, tauri::path::BaseDirectory::Resource)
        .map_err(|e| format!("Could not find Voice Config {}: {}", voice_name, e))?;

    let out_path = app
        .path()
        .temp_dir()
        .map_err(|e| e.to_string())?
        .join("current_line.wav");

    // 3. Pass BOTH the model and the config explicitly to Piper
    let mut child = Command::new(&piper_path)
        .current_dir(piper_dir)
        .env("LD_LIBRARY_PATH", piper_dir)
        .args([
            "--model",
            model_path.to_str().unwrap(),
            "--config",
            config_path.to_str().unwrap(), // ⬅️ Forcing Piper to read this exact file!
            "--output_file",
            out_path.to_str().unwrap(),
        ])
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start Piper TTS: {}", e))?;

    if let Some(mut stdin) = child.stdin.take() {
        Write::write_all(&mut stdin, text.as_bytes()).map_err(|e| e.to_string())?;
    }

    let output = child.wait_with_output().map_err(|e| e.to_string())?;

    if !output.status.success() {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Piper crashed: {}", error_msg));
    }

    let audio_bytes =
        std::fs::read(&out_path).map_err(|e| format!("Failed to read audio: {}", e))?;
    let _ = std::fs::remove_file(&out_path);

    Ok(audio_bytes)
}
