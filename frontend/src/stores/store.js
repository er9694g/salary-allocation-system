import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../services/api';

export const useMainStore = defineStore('main', () => {
  const configs = ref([]);
  const records = ref([]);
  const error   = ref(null);

  const activeConfig = computed(() => configs.value.find(c => c.is_active) || null);

  async function fetchConfigs() {
    try {
      configs.value = await api.getConfigs();
    } catch (err) {
      error.value = err.message;
    }
  }

  async function fetchRecords() {
    try {
      records.value = await api.getRecords();
    } catch (err) {
      error.value = err.message;
    }
  }

  function clearError() { error.value = null; }

  return { configs, records, activeConfig, error, fetchConfigs, fetchRecords, clearError };
});
