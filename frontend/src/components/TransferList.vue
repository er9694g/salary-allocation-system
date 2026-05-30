<template>
  <div class="transfer-list">
    <div class="transfer-list-header">
      <h3>轉帳清單</h3>
      <div class="transfer-actions">
        <button class="btn btn-sm" @click="copyToClipboard">複製清單</button>
        <a v-if="recordId" :href="csvUrl" class="btn btn-sm" target="_blank">匯出 CSV</a>
        <a v-if="recordId" :href="txtUrl" class="btn btn-sm" target="_blank">匯出文字</a>
      </div>
    </div>

    <div v-if="copied" class="copy-notice">✓ 已複製到剪貼板</div>

    <div class="table-wrapper">
      <table class="transfer-table">
        <thead>
          <tr>
            <th>#</th>
            <th>從</th>
            <th>到</th>
            <th>金額</th>
            <th>說明</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in transfers" :key="t.order">
            <td>{{ t.order }}</td>
            <td>{{ t.from }}</td>
            <td>{{ t.to }}</td>
            <td class="amount-cell">${{ fmt(t.amount) }}</td>
            <td>{{ t.description }}</td>
          </tr>
          <tr v-if="!transfers.length">
            <td colspan="5" class="empty-cell">尚無轉帳清單</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { api } from '../services/api';

const props = defineProps({
  transfers: { type: Array, default: () => [] },
  recordId:  { type: String, default: null },
});

const copied = ref(false);
const csvUrl = computed(() => props.recordId ? api.exportCsvUrl(props.recordId) : '#');
const txtUrl = computed(() => props.recordId ? api.exportTxtUrl(props.recordId) : '#');

function fmt(n) { return Number(n).toLocaleString('zh-TW'); }

async function copyToClipboard() {
  const text = props.transfers
    .map(t => `${t.order}. ${t.from} → ${t.to}：$${fmt(t.amount)}（${t.description}）`)
    .join('\n');

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }

  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2500);
}
</script>
