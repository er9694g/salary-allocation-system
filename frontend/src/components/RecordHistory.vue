<template>
  <div class="page">
    <h1>歷史查詢</h1>

    <!-- 頁籤切換 -->
    <div class="tab-bar">
      <button :class="['tab-btn', activeTab === 'monthly' ? 'tab-active' : '']" @click="activeTab = 'monthly'">月份列表</button>
      <button :class="['tab-btn', activeTab === 'annual'  ? 'tab-active' : '']" @click="activeTab = 'annual'">年度摘要</button>
    </div>

    <!-- ===== 月份列表 ===== -->
    <div v-if="activeTab === 'monthly'" class="card">
      <div class="filter-bar">
        <input type="text" v-model="filterYear" placeholder="篩選年份（例：2025）" class="filter-input" maxlength="4" />
        <button v-if="filterYear" class="btn btn-secondary btn-sm" @click="filterYear = ''">清除</button>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>月份</th>
              <th>月收入</th>
              <th>給家用</th>
              <th>個人結餘</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in filteredRecords" :key="record.id">
              <td>{{ record.month }}</td>
              <td class="income-color income-cell">＋${{ fmt(record.monthly_income) }}</td>
              <td class="expense-color expense-cell">－${{ fmt(record.to_family) }}</td>
              <td>
                <span :class="['balance-badge', record.personal_account_balance >= 0 ? 'balance-pos' : 'balance-neg']">
                  {{ record.personal_account_balance >= 0 ? '＋' : '－' }}${{ fmt(Math.abs(record.personal_account_balance)) }}
                </span>
              </td>
              <td>
                <button class="btn btn-sm" @click="viewRecord(record)">查看</button>
                <router-link :to="`/calculator/${record.id}`" class="btn btn-sm">編輯</router-link>
                <button class="btn btn-sm btn-danger" @click="handleDelete(record)">刪除</button>
              </td>
            </tr>
            <tr v-if="!filteredRecords.length">
              <td colspan="5" class="empty-cell">無紀錄</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ===== 年度摘要 ===== -->
    <div v-if="activeTab === 'annual'">
      <div v-if="!annualGroups.length" class="card empty-state">尚無紀錄</div>

      <div v-for="group in annualGroups" :key="group.year" class="card annual-card">
        <!-- 年度標題列 -->
        <div class="annual-header">
          <span class="annual-year">{{ group.year }} 年</span>
          <div class="annual-totals">
            <div class="annual-total-item">
              <span class="total-label">年度總收入</span>
              <span class="total-value income-color">＋${{ fmt(group.totalIncome) }}</span>
            </div>
            <div class="annual-total-item">
              <span class="total-label">年度給家用</span>
              <span class="total-value expense-color">－${{ fmt(group.totalFamily) }}</span>
            </div>
            <div class="annual-total-item">
              <span class="total-label">年度個人結餘</span>
              <span class="total-value" :class="group.totalBalance >= 0 ? 'positive' : 'negative'">
                {{ group.totalBalance >= 0 ? '＋' : '－' }}${{ fmt(Math.abs(group.totalBalance)) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 月份明細 -->
        <div class="table-wrapper">
          <table class="data-table annual-detail-table">
            <thead>
              <tr>
                <th>月份</th>
                <th class="col-income">收入</th>
                <th class="col-expense">給家用</th>
                <th class="col-expense">個人支出</th>
                <th class="col-balance">個人結餘</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in group.records" :key="record.id">
                <td>{{ record.month }}</td>
                <td class="income-cell income-color">＋${{ fmt(record.monthly_income) }}</td>
                <td class="expense-cell expense-color">－${{ fmt(record.to_family) }}</td>
                <td class="expense-cell expense-color">－${{ fmt(record.personal_account_expense) }}</td>
                <td>
                  <span :class="['balance-badge', record.personal_account_balance >= 0 ? 'balance-pos' : 'balance-neg']">
                    {{ record.personal_account_balance >= 0 ? '＋' : '－' }}${{ fmt(Math.abs(record.personal_account_balance)) }}
                  </span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="annual-subtotal">
                <td><strong>小計</strong></td>
                <td class="income-cell income-color"><strong>＋${{ fmt(group.totalIncome) }}</strong></td>
                <td class="expense-cell expense-color"><strong>－${{ fmt(group.totalFamily) }}</strong></td>
                <td class="expense-cell expense-color"><strong>－${{ fmt(group.totalPersonalExpense) }}</strong></td>
                <td>
                  <span :class="['balance-badge', group.totalBalance >= 0 ? 'balance-pos' : 'balance-neg']">
                    {{ group.totalBalance >= 0 ? '＋' : '－' }}${{ fmt(Math.abs(group.totalBalance)) }}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <!-- 詳細查看 Modal -->
    <div v-if="selectedRecord" class="modal-overlay" @click.self="selectedRecord = null">
      <div class="modal modal-large">
        <div class="modal-header">
          <h2>{{ selectedRecord.month }} 詳細</h2>
          <button class="close-btn" @click="selectedRecord = null">×</button>
        </div>

        <div class="summary-grid">
          <div class="summary-item">
            <label>月收入</label>
            <span class="amount income-color">＋${{ fmt(selectedRecord.monthly_income) }}</span>
          </div>
          <div class="summary-item">
            <label>個人帳戶進帳</label>
            <span class="amount income-color">＋${{ fmt(selectedRecord.personal_account_income) }}</span>
          </div>
          <div class="summary-item">
            <label>個人帳戶支出</label>
            <span class="amount expense-color">－${{ fmt(selectedRecord.personal_account_expense) }}</span>
          </div>
          <div class="summary-item">
            <label>個人帳戶結餘</label>
            <span class="amount" :class="selectedRecord.personal_account_balance >= 0 ? 'positive' : 'negative'">
              {{ selectedRecord.personal_account_balance >= 0 ? '＋' : '－' }}${{ fmt(Math.abs(selectedRecord.personal_account_balance)) }}
            </span>
          </div>
        </div>

        <TransferList :transfers="selectedRecord.transfer_list" :recordId="selectedRecord.id" />
        <p v-if="selectedRecord.notes" class="record-notes">備註：{{ selectedRecord.notes }}</p>
      </div>
    </div>

    <div v-if="errorMsg" class="error-banner">{{ errorMsg }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useMainStore } from '../stores/store';
import { api } from '../services/api';
import TransferList from './TransferList.vue';

const store          = useMainStore();
const activeTab      = ref('monthly');
const filterYear     = ref('');
const selectedRecord = ref(null);
const errorMsg       = ref('');

const filteredRecords = computed(() => {
  if (!filterYear.value) return store.records;
  return store.records.filter(r => r.month.startsWith(filterYear.value));
});

// 依年份分組，計算年度統計
const annualGroups = computed(() => {
  const groups = {};
  for (const r of store.records) {
    const year = r.month.substring(0, 4);
    if (!groups[year]) {
      groups[year] = { year, records: [], totalIncome: 0, totalFamily: 0, totalPersonalExpense: 0, totalBalance: 0 };
    }
    groups[year].records.push(r);
    groups[year].totalIncome          += r.monthly_income;
    groups[year].totalFamily          += r.to_family;
    groups[year].totalPersonalExpense += r.personal_account_expense;
    groups[year].totalBalance         += r.personal_account_balance;
  }
  return Object.values(groups).sort((a, b) => b.year.localeCompare(a.year));
});

function viewRecord(record) { selectedRecord.value = record; }

async function handleDelete(record) {
  if (!confirm(`確定刪除 ${record.month} 的紀錄嗎？此操作無法復原。`)) return;
  try {
    await api.deleteRecord(record.id);
    if (selectedRecord.value?.id === record.id) selectedRecord.value = null;
    await store.fetchRecords();
  } catch (err) {
    errorMsg.value = err.message;
  }
}

function fmt(n) { return Number(n || 0).toLocaleString('zh-TW'); }

onMounted(() => store.fetchRecords());
</script>
