export interface PdfTextElement {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfPageData {
  page_number: number;
  width: number;
  height: number;
  elements: PdfTextElement[];
}