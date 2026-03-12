import { ref, computed } from 'vue';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

import type { PdfPageData, SentenceBlock } from '../types/pdf';

const pdfPath = ref<string>('');
const pdfUrl = ref<string>('');
const pdfPages = ref<PdfPageData[]>([]);
const currentSentenceIndex = ref<number>(-1);
const currentPageIndex = ref<number>(0);
const isLoading = ref<boolean>(false);
const isPlaying = ref<boolean>(false);
const selectedVoice = ref<string>('alba');
let currentAudio: HTMLAudioElement | null = null;
const audioCache = ref<Map<string, string>>(new Map());

export function usePdfReader() {

  const pageSentences = computed<SentenceBlock[]>(() => {
    const page = pdfPages.value[currentPageIndex.value];
    if (!page) return [];

    const sentences: SentenceBlock[] = [];
    let currentText = "";
    let currentIndices: number[] = [];

    for (let i = 0; i < page.elements.length; i++) {
      const el = page.elements[i];
      const text = el.text.trim();

      // Check if there is a massive vertical gap (a new paragraph)
      if (i > 0 && currentIndices.length > 0) {
        const prevEl = page.elements[i - 1];
        const gap = el.y - (prevEl.y + prevEl.height);

        // If the gap is larger than a standard line height, force a sentence break
        if (gap > prevEl.height * 1.5) {
          sentences.push({ text: currentText.trim(), elementIndices: [...currentIndices] });
          currentText = "";
          currentIndices = [];
        }
      }

      // Add the current line to our running sentence
      currentText += (currentText ? " " : "") + text;
      currentIndices.push(i);

      // Does this line end with punctuation? (., !, ?, or quote marks)
      if (/[.!?]["']?$/.test(text)) {
        sentences.push({ text: currentText.trim(), elementIndices: [...currentIndices] });
        currentText = "";
        currentIndices = [];
      }
    }

    // Push any leftover text at the end of the page
    if (currentText) {
      sentences.push({ text: currentText.trim(), elementIndices: [...currentIndices] });
    }

    return sentences;
  });

  const getAudioForSentence = async (pIndex: number, sIndex: number): Promise<string | null> => {
    // We can't access pageSentences for FUTURE pages easily via the computed ref, 
    // but for the current page, we use our grouped blocks!
    if (pIndex !== currentPageIndex.value) return null; // We will handle cross-page pre-fetching later if needed

    const sentence = pageSentences.value[sIndex];
    if (!sentence) return null;

    const cacheKey = `${pIndex}-s${sIndex}`;
    if (audioCache.value.has(cacheKey)) return audioCache.value.get(cacheKey)!;

    try {
      const audioBytes = await invoke<number[]>('generate_audio', {
        text: sentence.text,
        voiceName: selectedVoice.value
      });

      const uint8Array = new Uint8Array(audioBytes);
      const blob = new Blob([uint8Array], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);

      audioCache.value.set(cacheKey, url);
      return url;
    } catch (error) {
      console.error("Piper TTS failed:", error);
      return null;
    }
  };

  const readCurrentSentence = async () => {
    if (!isPlaying.value) return;

    const pIndex = currentPageIndex.value;
    const sIndex = currentSentenceIndex.value;

    const audioUrl = await getAudioForSentence(pIndex, sIndex);
    if (!audioUrl) {
      isPlaying.value = false;
      return;
    }

    currentAudio = new Audio(audioUrl);

    // Secretly generate the next sentence in the background!
    if (sIndex + 1 < pageSentences.value.length) {
      getAudioForSentence(pIndex, sIndex + 1);
    }

    currentAudio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      audioCache.value.delete(`${pIndex}-s${sIndex}`);

      if (isPlaying.value) {
        nextSentence();
        if (isPlaying.value) readCurrentSentence();
      }
    };

    currentAudio.play();
  };



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

      currentSentenceIndex.value = -1;
      currentPageIndex.value = 0;
    } catch (error) {
      console.error("Error loading PDF:", error);
    } finally {
      isLoading.value = false;
    }
  };


  const nextSentence = () => {
    if (currentSentenceIndex.value < pageSentences.value.length - 1) {
      currentSentenceIndex.value++;
    } else {
      if (currentPageIndex.value < pdfPages.value.length - 1) {
        currentPageIndex.value++;
        currentSentenceIndex.value = 0;
      } else {
        stopReading();
      }
    }
  };

  const prevPage = () => {
    if (currentPageIndex.value > 0) {
      currentPageIndex.value--;
      currentSentenceIndex.value = -1;
      stopReading();
    }
  };
  const nextPage = () => {
    if (currentPageIndex.value < pdfPages.value.length - 1) {
      currentPageIndex.value++;
      currentSentenceIndex.value = -1;
      stopReading();
    }
  };



  const toggleReading = () => {
    if (isPlaying.value) stopReading();
    else {
      isPlaying.value = true;
      if (currentSentenceIndex.value === -1) currentSentenceIndex.value = 0;
      readCurrentSentence();
    }
  };

  const stopReading = () => {
    isPlaying.value = false;
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    audioCache.value.forEach(url => URL.revokeObjectURL(url));
    audioCache.value.clear();
  };

  return {
    pdfPath, pdfUrl, pdfPages, currentPageIndex, isLoading, isPlaying, selectedVoice,
    currentSentenceIndex, pageSentences,
    openFile, toggleReading, stopReading, prevPage, nextPage,
    nextSentence
  };
}