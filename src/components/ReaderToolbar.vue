<template>
  <div class="toolbar" v-if="pdfPages.length > 0">
    <div class="controls">
      <button @click="nextLine" class="highlight-btn">
        Next Line ({{ currentLineIndex }})
      </button>

      <div class="pagination">
        <button @click="prevPage" :disabled="currentPageIndex === 0">◀</button>
        <span>Page {{ currentPageIndex + 1 }} of {{ pdfPages.length }}</span>
        <button @click="nextPage" :disabled="currentPageIndex === pdfPages.length - 1">▶</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePdfReader } from '../composables/usePdfReader';

const { 
  pdfPages, currentLineIndex, currentPageIndex, 
  nextLine, prevPage, nextPage 
} = usePdfReader();
</script>

<style scoped>
.toolbar { 
  padding: 1rem; 
  background: white; 
  box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
  display: flex; 
  justify-content: center; /* Center the controls nicely */
  z-index: 10; 
}
.controls { display: flex; gap: 20px; align-items: center; }
button { padding: 6px 16px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; background: white; font-size: 14px; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
.highlight-btn { background-color: #ffd700; font-weight: bold; border: none; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.pagination { display: flex; gap: 10px; align-items: center; font-size: 14px; font-weight: bold; color: #333; }
</style>