<template>
  <div class="reader-container">
    <button @click="loadPdf">Load PDF Data</button>
    <button @click="nextWord" :disabled="!pages.length">Highlight Next Word</button>

    <div 
      v-for="page in pages" 
      :key="page.page_number" 
      class="pdf-page-container"
    >
      <div class="visual-pdf-layer">Page {{ page.page_number }}</div>

      <div class="highlight-layer">
        <div
          v-for="(word, index) in page.elements"
          :key="index"
          class="highlight-box"
          :class="{ 'active-highlight': index === currentWordIndex }"
          :style="{
            left: `${word.x}pt`, // PDFium usually returns points
            top: `${word.y}pt`,
            width: `${word.width}pt`,
            height: `${word.height}pt`
          }"
        >
          <span class="sr-only">{{ word.text }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';

const pages = ref([]);
const currentWordIndex = ref(-1);

const loadPdf = async () => {
  try {
    // Call the Rust backend! Provide an absolute path to a test PDF.
    const result = await invoke('parse_pdf', { path: '/absolute/path/to/your/test.pdf' });
    pages.value = result;
    currentWordIndex.value = 0; // Reset highlight
    console.log("PDF Data loaded:", result);
  } catch (error) {
    console.error("Failed to load PDF:", error);
  }
};

const nextWord = () => {
  if (pages.value.length > 0) {
    currentWordIndex.value++;
  }
};
</script>

<style scoped>
.reader-container {
  padding: 20px;
}

.pdf-page-container {
  position: relative; /* Crucial: ensures absolute positioned children stay inside */
  width: 612pt; /* Standard US Letter width in points */
  height: 792pt; /* Standard US Letter height in points */
  background: white;
  margin-top: 20px;
  border: 1px solid #ccc;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.highlight-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* Let users click through the highlights */
}

.highlight-box {
  position: absolute;
  background-color: transparent;
  transition: background-color 0.1s ease-in-out;
  border-radius: 2px;
}

.active-highlight {
  background-color: rgba(255, 255, 0, 0.4); /* Semi-transparent yellow */
}

.sr-only {
  opacity: 0;
}
</style>