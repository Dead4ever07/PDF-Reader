<template>
  <div class="menu-bar">
    
    <div class="nav-menus">
      <div class="menu-item" @click="toggleFileMenu">
        File
        
        <div v-if="isFileMenuOpen" class="dropdown-menu">
          <div class="dropdown-item" @click.stop="handleOpenFile">
            📄 Open File...
          </div>
          <div class="dropdown-divider"></div>
          <!--
            <div class="dropdown-item disabled">Save As...</div>
            -->
        </div>
      </div>
      
      <!--
        <div class="menu-item disabled">Edit</div>
        <div class="menu-item disabled">View</div>
        -->
    </div>
    
    <div class="controls" v-if="pdfPages.length > 0">
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
import { ref, onMounted, onUnmounted } from 'vue';
import { usePdfReader } from '../composables/usePdfReader';

const { 
  pdfPages, currentLineIndex, currentPageIndex, 
  openFile, nextLine, prevPage, nextPage 
} = usePdfReader();

// Dropdown state
const isFileMenuOpen = ref(false);

const toggleFileMenu = (event: Event) => {
  event.stopPropagation(); // Prevent the click from immediately closing it
  isFileMenuOpen.value = !isFileMenuOpen.value;
};

const handleOpenFile = async () => {
  isFileMenuOpen.value = false; // Close the menu
  await openFile();             // Trigger the native OS file picker
};

// Listen for clicks anywhere else on the screen to close the menu
const closeMenu = () => {
  isFileMenuOpen.value = false;
};

onMounted(() => {
  window.addEventListener('click', closeMenu);
});

onUnmounted(() => {
  window.removeEventListener('click', closeMenu);
});
</script>

<style scoped>
/* The main bar */
.menu-bar { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  background-color: #f8f9fa; 
  border-bottom: 1px solid #ddd;
  padding: 0 10px;
  height: 45px;
  user-select: none; /* Make it feel like a real native app menu */
}

/* Menu Items (File, Edit, View) */
.nav-menus { 
  display: flex; 
  height: 100%;
}

.menu-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0 12px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
}

.menu-item:hover {
  background-color: #e9ecef;
}

.menu-item.disabled {
  color: #aaa;
  cursor: default;
}
.menu-item.disabled:hover { background-color: transparent; }

/* The Dropdown Box */
.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background-color: white;
  min-width: 200px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 5px 0;
  z-index: 1000;
}

/* Individual Dropdown Options */
.dropdown-item {
  padding: 8px 15px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: #007bff;
  color: white;
}

.dropdown-item.disabled {
  color: #aaa;
  cursor: default;
}
.dropdown-item.disabled:hover {
  background-color: transparent;
  color: #aaa;
}

.dropdown-divider {
  height: 1px;
  background-color: #eee;
  margin: 5px 0;
}

/* Reader Controls on the right side */
.controls { 
  display: flex; 
  gap: 15px; 
  align-items: center; 
}

button { 
  padding: 4px 12px; 
  cursor: pointer; 
  border-radius: 4px; 
  border: 1px solid #ccc; 
  background: white; 
  font-size: 13px;
}
button:disabled { opacity: 0.5; cursor: not-allowed; }
.highlight-btn { background-color: #ffd700; font-weight: bold; border: none; }
.pagination { display: flex; gap: 10px; align-items: center; font-size: 13px; }
</style>