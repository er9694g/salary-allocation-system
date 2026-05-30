<template>
  <div class="page">
    <h1>儀表板</h1>

    <div v-if="latestRecord" class="card">
      <h2>{{ latestRecord.month }} 最新紀錄</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <label>月收入</label>
          <span class="amount">${{ fmt(latestRecord.monthly_income) }}</span>
        </div>
        <div class="summary-item">
          <label>個人帳戶進帳</label>
          <span class="amount">${{ fmt(latestRecord.personal_account_income) }}</span>
        </div>
        <div class="summary-item">
          <label>個人帳戶支出</label>
          <span class="amount expense">${{ fmt(latestRecord.personal_account_expense) }}</span>
        </div>
        <div class="summary-item">
          <label>個人帳戶結餘</label>
          <span class="amount" :class="latestRecord.personal_account_balance >= 0 ? 'positive' : 'negative'">
            ${{ fmt(latestRecord.personal_account_balance) }}
          </span>
        </div>
      </div>
      <TransferList :transfers="latestRecord.transfer_list" :recordId="latestRecord.id" />
    </div>

    <div v-else class="card empty-state">
      <p>尚無紀錄。請點擊「新增本月紀錄」開始使用。</p>
    </div>

    <div class="action-buttons">
      <router-link to="/calculator" class="btn btn-primary">新增本月紀錄</router-link>
      <router-link to="/history" class="btn btn-secondary">查看歷史</router-link>
      <router-link to="/config" class="btn btn-secondary">管理配置</router-link>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useMainStore } from '../stores/store';
import TransferList from './TransferList.vue';

const store = useMainStore();
const latestRecord = computed(() => store.records[0] || null);

function fmt(n) { return Number(n).toLocaleString('zh-TW'); }
</script>
