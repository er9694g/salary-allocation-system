<template>
  <div id="app-wrapper">
    <Navigation />
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import Navigation from './components/Navigation.vue';
import { useMainStore } from './stores/store';

const store = useMainStore();
onMounted(() => {
  store.fetchConfigs();
  store.fetchRecords();
});
</script>
