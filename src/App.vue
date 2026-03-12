<template>
  <main class="app-layout">
    <CustomTitlebar />
    <ReaderToolbar />
    <PdfPageViewer />
  </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import CustomTitlebar from './components/CustomTitlebar.vue';
import ReaderToolbar from './components/ReaderToolbar.vue';
import PdfPageViewer from './components/PdfPageViewer.vue';
import { usePdfReader } from './composables/usePdfReader';

const { prevPage, nextPage } = usePdfReader();

// The Keyboard Shortcut Handler
const handleKeydown = (event: KeyboardEvent) => {
  // Ignore key presses if the user is typing in an input field
  if (event.target instanceof HTMLInputElement) return;

  switch(event.key) {
    case ' ':
    case 'ArrowLeft':
    case 'PageDown':
      event.preventDefault();
      nextPage();
      break;
    case 'ArrowRight':
    case 'PageUp':
      event.preventDefault();
      prevPage();
      break;
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>