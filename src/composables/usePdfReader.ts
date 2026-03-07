import { ref } from 'vue';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { PdfPageData } from '../types/pdf';

const pdfPath = ref<string>('');
const pdfUrl = ref<string>('');
const pdfPages = ref<PdfPageData[]>([]);
const currentLineIndex = ref<number>(-1);
const currentPageIndex = ref<number>(0);
const isLoading = ref<boolean>(false);

export function usePdfReader() {
  
  // NEW: Opens a native file dialog filtered specifically for PDFs
  const openFile = async () => {
    try {
      const selectedFile = await open({
        multiple: false,
        directory: false, // ⬅️ We want a file, not a folder
        filters: [{
          name: 'PDF Documents',
          extensions: ['pdf'] // ⬅️ Only allow PDFs to be clicked
        }]
      });

      if (selectedFile) {
        pdfPath.value = selectedFile as string;
        await loadDocument();
      }
    } catch (error) {
      console.error("Failed to open file:", error);
    }
  };

  const loadDocument = async () => {
    if (!pdfPath.value) return;
    isLoading.value = true;
    try {
      pdfUrl.value = convertFileSrc(pdfPath.value);
      pdfPages.value = await invoke<PdfPageData[]>('parse_pdf', { path: pdfPath.value });
      
      currentLineIndex.value = -1;
      currentPageIndex.value = 0;
    } catch (error) {
      console.error("Error loading PDF:", error);
    } finally {
      isLoading.value = false;
    }
  };

  const nextLine = () => {
    if (pdfPages.value.length > 0) currentLineIndex.value++;
  };

  const prevPage = () => {
    if (currentPageIndex.value > 0) {
      currentPageIndex.value--;
      currentLineIndex.value = -1;
    }
  };

  const nextPage = () => {
    if (currentPageIndex.value < pdfPages.value.length - 1) {
      currentPageIndex.value++;
      currentLineIndex.value = -1;
    }
  };

  return {
    pdfPath,
    pdfUrl,
    pdfPages,
    currentLineIndex,
    currentPageIndex,
    isLoading,
    openFile,
    nextLine,
    prevPage,
    nextPage,
  };
}