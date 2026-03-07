<template>
  <div class="viewer-container">
    <div 
      v-if="pdfUrl && activePage" 
      class="page-wrapper"
      :style="{ aspectRatio: `${activePage.width} / ${activePage.height}` }"
    >
      
      <VuePdfEmbed 
        :source="pdfUrl" 
        :page="activePage.page_number" 
        class="pdf-render-layer"
      />

      <div class="highlight-layer">
        <div
          v-for="(line, lineIndex) in activePage.elements"
          :key="lineIndex"
          class="highlight-box"
          :class="{ 'active': lineIndex === currentLineIndex }"
          :style="{
            left: `${(line.x / activePage.width) * 100}%`,
            top: `${(line.y / activePage.height) * 100}%`, 
            width: `${(line.width / activePage.width) * 100}%`,
            height: `${(line.height / activePage.height) * 100}%`
          }"
        ></div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import VuePdfEmbed from 'vue-pdf-embed';
import { usePdfReader } from '../composables/usePdfReader';
import type { PdfPageData } from '../types/pdf';

const { pdfUrl, pdfPages, currentPageIndex, currentLineIndex } = usePdfReader();

const activePage = computed<PdfPageData | undefined>(() => {
  return pdfPages.value[currentPageIndex.value];
});
</script>

<style scoped>
.viewer-container { 
  flex: 1; 
  overflow-y: auto; 
  padding: 2rem; 
  display: flex; 
  justify-content: center; 
  background-color: #f0f0f0; 
}

/* THE FIX 2: Let it be responsive, but lock the proportions */
.page-wrapper { 
  position: relative; 
  width: 100%;             /* Let it shrink on small screens */
  max-width: 800px;        /* Don't let it get too huge on big screens */
  background: white; 
  box-shadow: 0 4px 8px rgba(0,0,0,0.2); 
  /* Removed line-height and max-content! */
}

/* THE FIX 3: Force the canvas to fill our perfectly proportioned wrapper */
.pdf-render-layer { 
  display: block; 
  width: 100%; 
  height: 100%; 
}

.highlight-layer { 
  position: absolute; 
  top: 0; 
  left: 0; 
  width: 100%; 
  height: 100%; 
  pointer-events: none; 
}

.highlight-box { 
  position: absolute; 
  background-color: transparent; 
  border-radius: 2px; 
  transition: background-color 0.1s; 
}

.highlight-box.active { 
  background-color: rgba(255, 215, 0, 0.4); 
  box-shadow: 0 0 4px rgba(255, 215, 0, 0.8); 
}
</style>