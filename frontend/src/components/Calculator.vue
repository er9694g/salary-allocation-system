<template>
  <div class="page">
    <h1>{{ isEditing ? `編輯紀錄　${month}` : '計算機' }}</h1>

    <!-- 月份 + 配置 -->
    <div class="card calc-topbar">
      <div class="form-group">
        <label>月份</label>
        <input type="month" v-model="month" :disabled="isEditing" />
      </div>
      <div class="form-group">
        <label>使用配置</label>
        <select v-model="selectedConfigId" :disabled="isEditing">
          <option v-for="c in store.configs" :key="c.id" :value="c.id">
            {{ c.name }}{{ c.is_active ? '（活躍）' : '' }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label>備註（選填）</label>
        <input type="text" v-model="notes" placeholder="無" />
      </div>
    </div>

    <div class="calc-layout">
      <!-- 左欄：輸入 -->
      <div class="calc-left">

        <div class="card">
          <div class="var-section-title income-color" style="margin-bottom:12px;">📈 收入項目</div>
          <div v-for="(item, idx) in incomeItems" :key="idx" class="form-group">
            <label>{{ item.name }}</label>
            <input type="number" v-model.number="item.amount" min="0" />
          </div>
          <div v-if="!incomeItems.length" class="hint">請在「管理配置」設定收入項目</div>
        </div>

        <div class="card">
          <div class="var-section-title expense-color" style="margin-bottom:12px;">📤 變動支出項目</div>
          <div v-for="(item, idx) in variableExpenseItems" :key="idx" class="form-group">
            <label>{{ item.name }}</label>
            <input type="number" v-model.number="item.amount" min="0" />
          </div>
          <div v-if="!variableExpenseItems.length" class="hint">請在「管理配置」設定支出項目</div>
        </div>

        <div class="card">
          <div class="var-section-title" style="margin-bottom:12px;">⚙️ 特殊欄位</div>
          <div class="form-group">
            <label>給家用的金額</label>
            <input type="number" v-model.number="toFamily" min="0" />
          </div>
          <div class="form-group">
            <label>上月我墊的錢</label>
            <input type="number" v-model.number="previousMonthPaid" min="0" />
          </div>
        </div>

        <div class="card">
          <div class="var-section-title" style="margin-bottom:6px;">🔒 固定項目（可臨時調整）</div>
          <p class="hint">此處調整不會修改配置</p>
          <div v-for="item in fixedAllItems" :key="item.id" class="form-group">
            <label>
              {{ item.name }}
              <small :class="item.type === 'transfer' ? 'tag-transfer' : 'tag-expense'">
                {{ item.type === 'transfer' ? '家庭支出' : '個人支出' }}
              </small>
            </label>
            <input type="number" v-model.number="itemOverrides[item.id]" min="0" />
          </div>
          <div v-if="!fixedAllItems.length" class="hint">無固定項目</div>
        </div>

      </div>

      <!-- 右欄：計算邏輯 + 儲存 -->
      <div class="calc-right">
        <div class="card calc-logic-card">
          <h2>計算邏輯</h2>

          <div class="calc-step">
            <div class="step-header">
              <span class="step-num">1</span>
              <span class="step-title">月收入</span>
              <span class="step-result income-color">${{ fmt(monthlyIncome) }}</span>
            </div>
            <div class="step-formula">
              <template v-for="(item, idx) in incomeItems" :key="idx">
                <span v-if="idx > 0" class="formula-op">＋</span>
                <span class="formula-item income-tag">{{ item.name }} ${{ fmt(item.amount) }}</span>
              </template>
              <span v-if="!incomeItems.length" class="formula-item">$0</span>
              <span class="formula-op">＝</span>
              <span class="formula-result income-color">${{ fmt(monthlyIncome) }}</span>
            </div>
          </div>

          <div class="calc-step">
            <div class="step-header">
              <span class="step-num">2</span>
              <span class="step-title">個人帳戶進帳</span>
              <span class="step-result income-color">${{ fmt(personalIncome) }}</span>
            </div>
            <div class="step-formula">
              <span class="formula-item">月收入 ${{ fmt(monthlyIncome) }}</span>
              <span class="formula-op expense-op">－</span>
              <span class="formula-item expense-tag">家用 ${{ fmt(toFamily) }}</span>
              <template v-if="previousMonthPaid > 0">
                <span class="formula-op">＋</span>
                <span class="formula-item income-tag">上月墊 ${{ fmt(previousMonthPaid) }}</span>
              </template>
              <span class="formula-op">＝</span>
              <span class="formula-result income-color">${{ fmt(personalIncome) }}</span>
            </div>
          </div>

          <div class="calc-step">
            <div class="step-header">
              <span class="step-num">3</span>
              <span class="step-title">個人帳戶支出明細</span>
              <span class="step-result expense-color">${{ fmt(totalExpense) }}</span>
            </div>
            <div class="expense-breakdown-list">
              <div v-for="item in variableExpenseItems" :key="item.name" class="breakdown-row">
                <span class="breakdown-name">{{ item.name }} <small class="breakdown-tag">變動</small></span>
                <span class="breakdown-amount expense-color">${{ fmt(item.amount) }}</span>
              </div>
              <div v-for="item in fixedExpenseItems" :key="item.id" class="breakdown-row">
                <span class="breakdown-name">{{ item.name }} <small class="breakdown-tag">固定</small></span>
                <span class="breakdown-amount expense-color">${{ fmt(itemOverrides[item.id] ?? item.amount) }}</span>
              </div>
              <div class="breakdown-row breakdown-total">
                <span class="breakdown-name">合計</span>
                <span class="breakdown-amount expense-color">${{ fmt(totalExpense) }}</span>
              </div>
            </div>
          </div>

          <div class="calc-step calc-step-last">
            <div class="step-header">
              <span class="step-num">4</span>
              <span class="step-title">個人帳戶結餘</span>
              <span class="step-result" :class="balance >= 0 ? 'positive' : 'negative'">${{ fmt(balance) }}</span>
            </div>
            <div class="step-formula">
              <span class="formula-item income-tag">進帳 ${{ fmt(personalIncome) }}</span>
              <span class="formula-op expense-op">－</span>
              <span class="formula-item expense-tag">支出 ${{ fmt(totalExpense) }}</span>
              <span class="formula-op">＝</span>
              <span class="formula-result" :class="balance >= 0 ? 'positive' : 'negative'">${{ fmt(balance) }}</span>
            </div>
          </div>
        </div>

        <div class="card">
          <TransferList :transfers="transferList" :recordId="exportRecordId" />
        </div>

        <!-- 儲存 / 更新 -->
        <div class="card save-card">
          <div class="form-actions">
            <button
              class="btn btn-primary"
              @click="handleSave"
              :disabled="saving || hasSaved"
            >{{ saveLabel }}</button>
            <span v-if="saveSuccess" class="success-msg">
              {{ isEditing ? '✓ 已更新' : '✓ 已儲存！可至「歷史查詢」查看' }}
            </span>
          </div>
          <div v-if="errorMsg" class="error-banner" style="margin-top:10px;">{{ errorMsg }}</div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useMainStore } from '../stores/store';
import { api } from '../services/api';
import TransferList from './TransferList.vue';

const store = useMainStore();
const route = useRoute();

const isEditing = computed(() => !!route.params.recordId);

// 頂部
const month            = ref(new Date().toISOString().substring(0, 7));
const selectedConfigId = ref('');
const notes            = ref('');

// 儲存狀態
const saving        = ref(false);
const hasSaved      = ref(false);   // 新增成功後鎖定，防重複送出
const saveSuccess   = ref(false);
const errorMsg      = ref('');
const exportRecordId = ref(null);   // 儲存成功後用於 TransferList 匯出

const saveLabel = computed(() => {
  if (isEditing.value) return saving.value ? '更新中…' : '更新紀錄';
  if (hasSaved.value)  return '✓ 已儲存';
  return saving.value  ? '儲存中…' : '儲存為月度紀錄';
});

// 動態輸入
const incomeItems          = ref([]);
const variableExpenseItems = ref([]);
const toFamily             = ref(19000);
const previousMonthPaid    = ref(0);
const itemOverrides        = ref({});
const transferList         = ref([]);

// 當前配置
const selectedConfig = computed(() =>
  store.configs.find(c => c.id === selectedConfigId.value) || null
);

const fixedExpenseItems = computed(() =>
  (selectedConfig.value?.items || []).filter(i => i.type === 'expense'  && i.is_enabled)
);
const fixedTransferItems = computed(() =>
  (selectedConfig.value?.items || []).filter(i => i.type === 'transfer' && i.is_enabled)
);
const fixedAllItems = computed(() =>
  (selectedConfig.value?.items || []).filter(i => (i.type === 'expense' || i.type === 'transfer') && i.is_enabled)
);

// === 即時計算 ===
const monthlyIncome = computed(() =>
  incomeItems.value.reduce((s, i) => s + (i.amount || 0), 0)
);
const personalIncome = computed(() =>
  monthlyIncome.value - toFamily.value + previousMonthPaid.value
);
const varExpenseTotal = computed(() =>
  variableExpenseItems.value.reduce((s, i) => s + (i.amount || 0), 0)
);
const fixedExpenseTotal = computed(() =>
  fixedExpenseItems.value.reduce((s, i) => s + (itemOverrides.value[i.id] ?? i.amount), 0)
);
const totalExpense = computed(() => varExpenseTotal.value + fixedExpenseTotal.value);
const balance      = computed(() => personalIncome.value - totalExpense.value);

function rebuildTransferList() {
  const list = []; let order = 1;

  list.push({ order: order++, from: '薪轉戶（家庭帳戶）', to: '保留家用', amount: toFamily.value, description: '家用' });

  for (const item of fixedTransferItems.value) {
    list.push({ order: order++, from: '薪轉戶', to: item.account_name, amount: itemOverrides.value[item.id] ?? item.amount, description: item.name });
  }

  list.push({ order: order++, from: '薪轉戶', to: '個人帳戶', amount: personalIncome.value, description: '個人帳戶進帳' });

  for (const item of variableExpenseItems.value) {
    if ((item.amount || 0) > 0) {
      list.push({ order: order++, from: '個人帳戶', to: item.name + '帳戶', amount: item.amount, description: item.name });
    }
  }

  for (const item of fixedExpenseItems.value) {
    list.push({ order: order++, from: '個人帳戶', to: item.account_name, amount: itemOverrides.value[item.id] ?? item.amount, description: item.name });
  }

  transferList.value = list;
}

watch([monthlyIncome, personalIncome, totalExpense, varExpenseTotal, fixedExpenseTotal], rebuildTransferList);

// 從配置初始化輸入值（新增模式用）
function initFromConfig(config) {
  if (!config) return;
  const vd = config.variable_defaults || {};
  incomeItems.value          = (vd.income  || []).map(i => ({ name: i.name, amount: i.amount }));
  variableExpenseItems.value = (vd.expense || []).map(i => ({ name: i.name, amount: i.amount }));
  toFamily.value             = vd.toFamily          ?? 19000;
  previousMonthPaid.value    = vd.previousMonthPaid ?? 0;
  const overrides = {};
  for (const item of config.items || []) overrides[item.id] = item.amount;
  itemOverrides.value = overrides;
  rebuildTransferList();
}

// 新增模式：切換配置時重新初始化
watch(selectedConfig, (config) => {
  if (!isEditing.value) initFromConfig(config);
});

// configs 載入後設定預設配置（新增模式）
watch(() => store.configs, (configs) => {
  if (!selectedConfigId.value && configs.length > 0) {
    const active = configs.find(c => c.is_active);
    selectedConfigId.value = (active || configs[0]).id;
  }
}, { immediate: true });

onMounted(async () => {
  await store.fetchConfigs();

  if (isEditing.value) {
    // 編輯模式：從既有紀錄預填
    try {
      const record = await api.getRecord(route.params.recordId);
      month.value            = record.month;
      selectedConfigId.value = record.config_id;
      notes.value            = record.notes || '';
      incomeItems.value          = record.income_items          || [];
      variableExpenseItems.value = record.variable_expense_items || [];
      toFamily.value             = record.to_family;
      previousMonthPaid.value    = record.previous_month_paid;
      exportRecordId.value       = record.id;

      // 固定項目覆蓋值從當前配置初始化
      const config = store.configs.find(c => c.id === record.config_id);
      if (config) {
        const overrides = {};
        for (const item of config.items || []) overrides[item.id] = item.amount;
        itemOverrides.value = overrides;
      }
    } catch (err) {
      errorMsg.value = err.message;
    }
  }

  rebuildTransferList();
});

// 儲存 / 更新
async function handleSave() {
  saving.value = true; errorMsg.value = '';
  try {
    const payload = {
      incomeItems:          incomeItems.value,
      variableExpenseItems: variableExpenseItems.value,
      toFamily:             toFamily.value,
      previousMonthPaid:    previousMonthPaid.value,
      configId:             selectedConfigId.value,
      notes:                notes.value,
    };

    if (isEditing.value) {
      await api.updateRecord(route.params.recordId, payload);
      exportRecordId.value = route.params.recordId;
    } else {
      const record = await api.createRecord({ month: month.value, ...payload });
      exportRecordId.value = record.id;
      hasSaved.value = true;
    }

    saveSuccess.value = true;
    await store.fetchRecords();
    if (isEditing.value) setTimeout(() => { saveSuccess.value = false; }, 3000);
  } catch (err) {
    errorMsg.value = err.message;
  } finally {
    saving.value = false;
  }
}

function fmt(n) { return Number(n || 0).toLocaleString('zh-TW'); }
</script>
