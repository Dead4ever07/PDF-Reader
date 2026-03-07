<template>
  <div data-tauri-drag-region class="titlebar">
    
    <div class="menu-section">
      <div class="menu-item" @click="toggleFileMenu">
        File
        <div v-if="isFileMenuOpen" class="dropdown-menu">
          <div class="dropdown-item" @click.stop="handleOpenFile">📄 Open File...</div>
        </div>
      </div>
    </div>

    <div data-tauri-drag-region class="title-text">
      PDF Reader
    </div>

    <div class="window-controls">
      <div class="control-btn minimize" @click="minimize">🗕</div>
      <div class="control-btn maximize" @click="toggleMaximize">🗗</div>
      <div class="control-btn close" @click="close">✕</div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { usePdfReader } from '../composables/usePdfReader';

const appWindow = getCurrentWindow();
const { openFile } = usePdfReader();

// Window Control Functions
const minimize = () => appWindow.minimize();
const toggleMaximize = () => appWindow.toggleMaximize();
const close = () => appWindow.close();

// Menu Logic
const isFileMenuOpen = ref(false);

const toggleFileMenu = (event: Event) => {
  event.stopPropagation();
  isFileMenuOpen.value = !isFileMenuOpen.value;
};

const handleOpenFile = async () => {
  isFileMenuOpen.value = false;
  await openFile();
};

const closeMenu = () => isFileMenuOpen.value = false;

onMounted(() => window.addEventListener('click', closeMenu));
onUnmounted(() => window.removeEventListener('click', closeMenu));
</script>

<style scoped>
.titlebar {
  height: 40px;
  background: #f8f9fa;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ddd;
  user-select: none;
}

/* The magic attribute that lets you drag the window by clicking the background */
.titlebar[data-tauri-drag-region] {
  cursor: default;
}

.menu-section { display: flex; height: 100%; z-index: 100; }
.menu-item { position: relative; display: flex; align-items: center; padding: 0 15px; cursor: pointer; color: #333; font-size: 14px; }
.menu-item:hover { background-color: #e9ecef; }

.dropdown-menu { position: absolute; top: 100%; left: 0; background: white; border: 1px solid #ddd; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 4px; padding: 5px 0; min-width: 150px; }
.dropdown-item { padding: 8px 15px; font-size: 14px; cursor: pointer; }
.dropdown-item:hover { background-color: #007bff; color: white; }

.title-text { flex: 1; text-align: center; font-size: 13px; color: #666; font-weight: bold; pointer-events: none; }

.window-controls { display: flex; height: 100%; }
.control-btn { display: flex; justify-content: center; align-items: center; width: 45px; height: 100%; cursor: pointer; color: #333; font-size: 16px; transition: background 0.1s; }
.control-btn:hover { background-color: #e9ecef; }
.control-btn.close:hover { background-color: #e81123; color: white; }
</style>