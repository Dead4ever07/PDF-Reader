<template>
  <main class="app-layout">
    <ReaderToolbar />
    <PdfPageViewer />
  </main>
</template>

<script setup lang="ts">
import ReaderToolbar from './components/ReaderToolbar.vue';
import PdfPageViewer from './components/PdfPageViewer.vue';
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; }
.app-layout { display: flex; flex-direction: column; height: 100vh; }
</style>