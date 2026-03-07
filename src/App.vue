<template>
  <main class="app-container">
    <div class="controls">
      <input v-model="pdfPath" type="text" placeholder="Enter absolute PDF path..." />
      <button @click="handleLoadPdf">Load Document</button>
      
      <button @click="nextWord" :disabled="!pdfPages.length" class="highlight-btn">
        Next Word ({{ currentWordIndex }})
      </button>

      <div class="pagination" v-if="pdfPages.length > 0">
        <button @click="prevPage" :disabled="currentPageIndex === 0">◀ Prev Page</button>
        <span>Page {{ currentPageIndex + 1 }} of {{ pdfPages.length }}</span>
        <button @click="nextPage" :disabled="currentPageIndex === pdfPages.length - 1">Next Page ▶</button>
      </div>
    </div>

    <div class="viewer-layout" v-if="pdfUrl && pdfPages.length > 0">
      
      <div class="page-container">
        <VuePdfEmbed 
          :source="pdfUrl" 
          :page="pdfPages[currentPageIndex].page_number" 
          class="pdf-render-layer"
        />

        <div class="highlight-layer">
          <div
            v-for="(word, wordIndex) in pdfPages[currentPageIndex].elements"
            :key="wordIndex"
            class="highlight-box"
            :class="{ 'active': wordIndex === currentWordIndex }"
            :style="{
              left: `${(word.x / pdfPages[currentPageIndex].width) * 100}%`,
              top: `${(word.y / pdfPages[currentPageIndex].height) * 100}%`,
              width: `${(word.width / pdfPages[currentPageIndex].width) * 100}%`,
              height: `${(word.height / pdfPages[currentPageIndex].height) * 100}%`
            }"
          ></div>
        </div>
      </div>

    </div>
  </main>
</template>

<script setup>
import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import VuePdfEmbed from 'vue-pdf-embed';

const pdfPath = ref('');
const pdfUrl = ref('');
const pdfPages = ref([]);
const currentWordIndex = ref(-1);
const currentPageIndex = ref(0); // ⬅️ NEW: Track the current page

const handleLoadPdf = async () => {
  if (!pdfPath.value) return;

  try {
    pdfUrl.value = convertFileSrc(pdfPath.value);
    
    // Fetch coordinates from Rust
    pdfPages.value = await invoke('parse_pdf', { path: pdfPath.value });
    
    // Reset state for new document
    currentWordIndex.value = -1; 
    currentPageIndex.value = 0;
  } catch (error) {
    console.error("Error loading PDF:", error);
  }
};

const nextWord = () => {
  if (pdfPages.value.length > 0) {
    currentWordIndex.value++;
    // If we highlight past the last word on the page, you could auto-turn the page here!
  }
};

const prevPage = () => {
  if (currentPageIndex.value > 0) {
    currentPageIndex.value--;
    currentWordIndex.value = -1; // Reset highlight on page turn
  }
};

const nextPage = () => {
  if (currentPageIndex.value < pdfPages.value.length - 1) {
    currentPageIndex.value++;
    currentWordIndex.value = -1; // Reset highlight on page turn
  }
};
</script>

<style scoped>
/* Keep your exact same CSS from the previous step here! */
.app-container { display: flex; flex-direction: column; height: 100vh; background-color: #f0f0f0; }
.controls { padding: 1rem; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 10px; z-index: 10; }
input { flex: 1; padding: 8px; }
button { padding: 8px 16px; cursor: pointer; }
.highlight-btn { background-color: #ffd700; color: black; font-weight: bold; border: none;}
.pagination { display: flex; align-items: center; gap: 10px; margin-left: auto; font-weight: bold; }
.viewer-layout { flex: 1; overflow-y: auto; padding: 2rem; display: flex; flex-direction: column; align-items: center; gap: 20px; }
.page-container { position: relative; width: 100%; max-width: 800px; background: white; box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
.pdf-render-layer { width: 100%; display: block; }
.highlight-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
.highlight-box { position: absolute; background-color: transparent; border-radius: 2px; transition: background-color 0.1s; }
.highlight-box.active { background-color: rgba(255, 215, 0, 0.5); box-shadow: 0 0 4px rgba(255, 215, 0, 0.8); }
</style>