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
const isPlaying = ref<boolean>(false);
const selectedVoice = ref<string>('alba');
let currentAudio: HTMLAudioElement | null = null;


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
  const prevLine = () => {
    if (currentLineIndex.value >= 0) currentLineIndex.value--;
  };
  const nextLine = () => {
    const page = pdfPages.value[currentPageIndex.value];
    if (!page) return;

    if (currentLineIndex.value < page.elements.length - 1) {
      currentLineIndex.value++;
    } else {
      if (currentPageIndex.value < pdfPages.value.length - 1) {
        currentPageIndex.value++;
        currentLineIndex.value = 0;
      } else {
        stopReading();
      }
    }
  };

  const prevPage = () => {
    if (currentPageIndex.value > 0) {
      currentPageIndex.value--;
      currentLineIndex.value = -1;
      stopReading();
    }
  };
  const nextPage = () => {
    if (currentPageIndex.value < pdfPages.value.length - 1) {
      currentPageIndex.value++;
      currentLineIndex.value = -1;
      stopReading();
    }
  };

  const readCurrentLine = async () => {
    if (!isPlaying.value) return;

    const page = pdfPages.value[currentPageIndex.value];
    if (!page || !page.elements[currentLineIndex.value]) return;

    const textToRead = page.elements[currentLineIndex.value].text;

    try {
      // ⬅️ Pass the voiceName to Rust (Tauri automatically converts camelCase to snake_case!)
      const audioBytes = await invoke<number[]>('generate_audio', {
        text: textToRead,
        voiceName: selectedVoice.value
      });

      const uint8Array = new Uint8Array(audioBytes);
      const blob = new Blob([uint8Array], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(blob);

      currentAudio = new Audio(audioUrl);

      currentAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (isPlaying.value) {
          nextLine();

          if (isPlaying.value) {
            readCurrentLine();
          }
        }
      };

      currentAudio.play();

    } catch (error) {
      console.error("Piper TTS failed:", error);
      isPlaying.value = false;
    }
  };

  const toggleReading = () => {
    if (isPlaying.value) {
      stopReading();
    } else {
      isPlaying.value = true;
      if (currentLineIndex.value === -1) currentLineIndex.value = 0;
      readCurrentLine();
    }
  };

  const stopReading = () => {
    isPlaying.value = false;
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
  };

  return {
    pdfPath,
    pdfUrl,
    pdfPages,
    currentLineIndex,
    currentPageIndex,
    isLoading,
    isPlaying,
    selectedVoice,
    openFile,
    nextLine,
    prevLine,
    prevPage,
    nextPage,
    toggleReading,
    stopReading,
  };
}