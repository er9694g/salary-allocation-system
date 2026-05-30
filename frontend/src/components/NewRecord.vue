<template>
  <div class="page">
    <h1>{{ isEditing ? '編輯紀錄' : '新增月度紀錄' }}</h1>

    <div class="card">
      <form @submit.prevent="handleCalculate">
        <div class="form-grid">
          <div class="form-group">
            <label>月份</label>
            <input type="month" v-model="form.month" required :disabled="isEditing" />
          </div>
          <div class="form-group">
            <label>使用配置</label>
            <select v-model="form.configId">
              <option v-for="c in store.configs" :key="c.id" :value="c.id">
                {{ c.name }}{{ c.is_active ? '（活躍）' : '' }}
              </option>
            </select>
          </div>
        </div>

        <!-- 收入項目 -->
        <div class="var-section">
          <div class="var-section-title income-color">📈 收入項目</div>
          <div class="var-items-grid">
            <div v-for="(item, idx) in form.incomeItems" :key="idx" class="form-group">
              <label>{{ item.name }}</label>
              <input type="number" v-model.number="item.amount" min="0" placeholder="0" />
            </div>
          </div>
        </div>

        <!-- 支出項目（變動）-->
        <div class="var-section">
          <div class="var-section-title expense-color">📤 變動支出項目</div>
          <div class="var-items-grid">
            <div v-for="(item, idx) in form.variableExpenseItems" :key="idx" class="form-group">
              <label>{{ item.name }}</label>
              <input type="number" v-model.number="item.amount" min="0" placeholder="0" />
            </div>
          </div>
        </div>

        <!-- 特殊欄位 -->
        <div class="var-section">
          <div class="var-section-title">⚙️ 特殊欄位</div>
          <div class="var-items-grid">
            <div class="form-group">
              <label>給家用的金額</label>
              <input type="number" v-model.number="form.toFamily" min="0" placeholder="19000" />
            </div>
            <div class="form-group">
              <label>上月我墊的錢</label>
              <input type="number" v-model.number="form.previousMonthPaid" min="0" placeholder="0" />
            </div>
            <div class="form-group">
              <label>備註（選填）</label>
              <input type="text" v-model="form.notes" placeholder="無" />
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary" :disabled="loading">計算</button>
        </div>
      </form>
    </div>

    <!-- 計算結果 -->
    <div v-if="result" class="card">
      <h2>計算結果</h2>

      <div class="calc-breakdown">
        <!-- STEP 1 月收入 -->
        <div class="calc-step">
          <div class="step-header">
            <span class="step-num">1</span>
            <span class="step-title">月收入</span>
            <span class="step-result income-color">${{ fmt(result.monthlyIncome) }}</span>
          </div>
          <div class="step-formula">
            <template v-for="(item, idx) in result.breakdown.incomeItems" :key="idx">
              <span v-if="idx > 0" class="formula-op">＋</span>
              <span class="formula-item income-tag">{{ item.name }} ${{ fmt(item.amount) }}</span>
            </template>
            <span class="formula-op">＝</span>
            <span class="formula-result income-color">${{ fmt(result.monthlyIncome) }}</span>
          </div>
        </div>

        <!-- STEP 2 個人帳戶進帳 -->
        <div class="calc-step">
          <div class="step-header">
            <span class="step-num">2</span>
            <span class="step-title">個人帳戶進帳</span>
            <span class="step-result income-color">${{ fmt(result.personalAccountIncome) }}</span>
          </div>
          <div class="step-formula">
            <span class="formula-item">月收入 ${{ fmt(result.monthlyIncome) }}</span>
            <span class="formula-op expense-op">－</span>
            <span class="formula-item expense-tag">家用 ${{ fmt(form.toFamily) }}</span>
            <template v-if="form.previousMonthPaid > 0">
              <span class="formula-op">＋</span>
              <span class="formula-item income-tag">上月墊 ${{ fmt(form.previousMonthPaid) }}</span>
            </template>
            <span class="formula-op">＝</span>
            <span class="formula-result income-color">${{ fmt(result.personalAccountIncome) }}</span>
          </div>
        </div>

        <!-- STEP 3 支出明細 -->
        <div class="calc-step">
          <div class="step-header">
            <span class="step-num">3</span>
            <span class="step-title">個人帳戶支出明細</span>
            <span class="step-result expense-color">${{ fmt(result.personalAccountExpense) }}</span>
          </div>
          <div class="expense-breakdown-list">
            <div v-for="item in result.breakdown.variableExpenseItems" :key="item.name" class="breakdown-row">
              <span class="breakdown-name">{{ item.name }} <small class="breakdown-tag">變動</small></span>
              <span class="breakdown-amount expense-color">${{ fmt(item.amount) }}</span>
            </div>
            <div v-for="item in result.breakdown.fixedExpenseItems" :key="item.name" class="breakdown-row">
              <span class="breakdown-name">{{ item.name }} <small class="breakdown-tag">固定</small></span>
              <span class="breakdown-amount expense-color">${{ fmt(item.amount) }}</span>
            </div>
            <div class="breakdown-row breakdown-total">
              <span class="breakdown-name">合計</span>
              <span class="breakdown-amount expense-color">${{ fmt(result.personalAccountExpense) }}</span>
            </div>
          </div>
        </div>

        <!-- STEP 4 結餘 -->
        <div class="calc-step calc-step-last">
          <div class="step-header">
            <span class="step-num">4</span>
            <span class="step-title">個人帳戶結餘</span>
            <span class="step-result" :class="result.personalAccountBalance >= 0 ? 'positive' : 'negative'">
              ${{ fmt(result.personalAccountBalance) }}
            </span>
          </div>
          <div class="step-formula">
            <span class="formula-item income-tag">進帳 ${{ fmt(result.personalAccountIncome) }}</span>
            <span class="formula-op expense-op">－</span>
            <span class="formula-item expense-tag">支出 ${{ fmt(result.personalAccountExpense) }}</span>
            <span class="formula-op">＝</span>
            <span class="formula-result" :class="result.personalAccountBalance >= 0 ? 'positive' : 'negative'">
              ${{ fmt(result.personalAccountBalance) }}
            </span>
          </div>
        </div>
      </div>

      <TransferList :transfers="result.transferList" :recordId="savedRecordId" />

      <div class="form-actions">
        <button v-if="!isEditing && !savedRecordId" class="btn btn-primary" @click="handleSave" :disabled="loading">保存紀錄</button>
        <button v-else class="btn btn-primary" @click="handleUpdate" :disabled="loading">更新紀錄</button>
        <span v-if="saveSuccess" class="success-msg">✓ 已保存</span>
      </div>
    </div>

    <div v-if="errorMsg" class="error-banner">{{ errorMsg }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useMainStore } from '../stores/store';
import { api } from '../services/api';
import TransferList from './TransferList.vue';

const store = useMainStore();
const route = useRoute();

const isEditing     = computed(() => !!route.params.recordId);
const loading       = ref(false);
const errorMsg      = ref('');
const saveSuccess   = ref(false);
const result        = ref(null);
const savedRecordId = ref(null);

const currentMonth = new Date().toISOString().substring(0, 7);

const form = ref({
  month:                currentMonth,
  configId:             '',
  incomeItems:          [],
  variableExpenseItems: [],
  toFamily:             19000,
  previousMonthPaid:    0,
  notes:                '',
});

// 從配置套用變動項目（新增模式）
function applyConfigDefaults(configId) {
  const config = store.configs.find(c => c.id === configId);
  const vd = config?.variable_defaults;
  if (!vd) return;
  form.value.incomeItems          = (vd.income  || []).map(i => ({ name: i.name, amount: i.amount }));
  form.value.variableExpenseItems = (vd.expense || []).map(i => ({ name: i.name, amount: i.amount }));
  form.value.toFamily             = vd.toFamily          ?? 19000;
  form.value.previousMonthPaid    = vd.previousMonthPaid ?? 0;
}

// 切換配置時（僅新增模式），重新套用預設值
watch(() => form.value.configId, (newId) => {
  if (!isEditing.value && newId) applyConfigDefaults(newId);
});

onMounted(async () => {
  await store.fetchConfigs();

  if (!form.value.configId && store.activeConfig) {
    form.value.configId = store.activeConfig.id;
  }

  if (isEditing.value) {
    try {
      const record = await api.getRecord(route.params.recordId);
      form.value = {
        month:                record.month,
        configId:             record.config_id,
        incomeItems:          record.income_items || [],
        variableExpenseItems: record.variable_expense_items || [],
        toFamily:             record.to_family,
        previousMonthPaid:    record.previous_month_paid,
        notes:                record.notes,
      };
      savedRecordId.value = record.id;
      await handleCalculate();
    } catch (err) {
      errorMsg.value = err.message;
    }
  } else {
    applyConfigDefaults(form.value.configId);
    // 若從 Calculator 帶來 query 參數，覆蓋預設值
    const q = route.query;
    if (q.toFamily)          form.value.toFamily          = Number(q.toFamily);
    if (q.previousMonthPaid) form.value.previousMonthPaid = Number(q.previousMonthPaid);
  }
});

async function handleCalculate() {
  loading.value = true; errorMsg.value = '';
  try {
    const calc = await api.calculate({
      incomeItems:          form.value.incomeItems,
      variableExpenseItems: form.value.variableExpenseItems,
      toFamily:             form.value.toFamily,
      previousMonthPaid:    form.value.previousMonthPaid,
      configId:             form.value.configId,
    });
    result.value = {
      monthlyIncome:          calc.monthlyIncome,
      personalAccountIncome:  calc.personalAccountIncome,
      personalAccountExpense: calc.personalAccountExpense,
      personalAccountBalance: calc.personalAccountBalance,
      transferList:           calc.transferList,
      breakdown:              calc.breakdown,
    };
  } catch (err) {
    errorMsg.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  loading.value = true; errorMsg.value = '';
  try {
    const record = await api.createRecord({
      month:                form.value.month,
      incomeItems:          form.value.incomeItems,
      variableExpenseItems: form.value.variableExpenseItems,
      toFamily:             form.value.toFamily,
      previousMonthPaid:    form.value.previousMonthPaid,
      configId:             form.value.configId,
      notes:                form.value.notes,
    });
    savedRecordId.value = record.id;
    saveSuccess.value   = true;
    await store.fetchRecords();
    setTimeout(() => { saveSuccess.value = false; }, 3000);
  } catch (err) {
    errorMsg.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function handleUpdate() {
  loading.value = true; errorMsg.value = '';
  try {
    const id = savedRecordId.value || route.params.recordId;
    await api.updateRecord(id, {
      incomeItems:          form.value.incomeItems,
      variableExpenseItems: form.value.variableExpenseItems,
      toFamily:             form.value.toFamily,
      previousMonthPaid:    form.value.previousMonthPaid,
      configId:             form.value.configId,
      notes:                form.value.notes,
    });
    savedRecordId.value = id;
    saveSuccess.value   = true;
    await handleCalculate();
    await store.fetchRecords();
    setTimeout(() => { saveSuccess.value = false; }, 3000);
  } catch (err) {
    errorMsg.value = err.message;
  } finally {
    loading.value = false;
  }
}

function fmt(n) { return Number(n || 0).toLocaleString('zh-TW'); }
</script>
