use serde::Serialize;

#[derive(Serialize)]
pub struct PdfTextElement {
    pub text: String,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

#[derive(Serialize)]
pub struct PdfPageData {
    pub page_number: u16,
    pub width: f32,
    pub height: f32,
    pub elements: Vec<PdfTextElement>,
}