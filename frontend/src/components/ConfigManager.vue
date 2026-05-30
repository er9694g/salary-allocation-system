<template>
  <div class="page">
    <h1>配置管理</h1>

    <div class="card">
      <div class="section-header">
        <h2>配置列表</h2>
        <button class="btn btn-primary" @click="openNewForm">新建配置</button>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>名稱</th><th>狀態</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="config in store.configs" :key="config.id">
              <td>{{ config.name }}</td>
              <td>
                <span :class="['badge', config.is_active ? 'badge-active' : 'badge-inactive']">
                  {{ config.is_active ? '活躍' : '非活躍' }}
                </span>
              </td>
              <td>
                <button class="btn btn-sm" @click="openEditForm(config)">編輯</button>
                <button v-if="!config.is_active" class="btn btn-sm" @click="setActive(config.id)">設為活躍</button>
                <button class="btn btn-sm" @click="copyConfig(config)">複製</button>
                <button v-if="config.id !== 'config_default'" class="btn btn-sm btn-danger" @click="deleteConfig(config.id)">刪除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 編輯 Modal -->
    <div v-if="editingConfig" class="modal-overlay" @click.self="cancelEdit">
      <div class="modal modal-large">
        <div class="modal-header">
          <h2>{{ editingConfig.__isNew ? '新建配置' : '編輯配置' }}</h2>
          <button class="close-btn" @click="cancelEdit">×</button>
        </div>

        <!-- 名稱 -->
        <div class="form-group" style="margin-bottom:20px;">
          <label>配置名稱</label>
          <input type="text" v-model="editingConfig.name" style="max-width:300px;" />
        </div>

        <!-- ── 變動收入項目 ── -->
        <div class="config-section">
          <div class="config-section-title">
            <span class="income-color">📈 變動收入項目</span>
            <span class="config-section-desc">每月收入來源，可增刪改名，填入各月的預設金額</span>
          </div>
          <div class="table-wrapper">
            <table class="data-table config-item-table">
              <thead>
                <tr><th>項目名稱</th><th>預設金額</th><th>操作</th></tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in editingConfig.variable_defaults.income" :key="item.id">
                  <td><input type="text" v-model="item.name" class="table-input" /></td>
                  <td><input type="number" v-model.number="item.amount" min="0" class="table-input-sm" /></td>
                  <td><button class="btn btn-sm btn-danger" @click="removeVarItem('income', idx)">刪除</button></td>
                </tr>
                <tr v-if="!editingConfig.variable_defaults.income.length">
                  <td colspan="3" class="empty-cell">尚無收入項目</td>
                </tr>
              </tbody>
            </table>
          </div>
          <button class="btn btn-secondary btn-sm" style="margin-top:8px;" @click="addVarItem('income')">+ 新增收入項目</button>
        </div>

        <!-- ── 變動支出項目 ── -->
        <div class="config-section">
          <div class="config-section-title">
            <span class="expense-color">📤 變動支出項目</span>
            <span class="config-section-desc">每月金額不固定的支出（如信用卡），從個人帳戶扣除</span>
          </div>
          <div class="table-wrapper">
            <table class="data-table config-item-table">
              <thead>
                <tr><th>項目名稱</th><th>預設金額</th><th>操作</th></tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in editingConfig.variable_defaults.expense" :key="item.id">
                  <td><input type="text" v-model="item.name" class="table-input" /></td>
                  <td><input type="number" v-model.number="item.amount" min="0" class="table-input-sm" /></td>
                  <td><button class="btn btn-sm btn-danger" @click="removeVarItem('expense', idx)">刪除</button></td>
                </tr>
                <tr v-if="!editingConfig.variable_defaults.expense.length">
                  <td colspan="3" class="empty-cell">尚無支出項目</td>
                </tr>
              </tbody>
            </table>
          </div>
          <button class="btn btn-secondary btn-sm" style="margin-top:8px;" @click="addVarItem('expense')">+ 新增支出項目</button>
        </div>

        <!-- ── 特殊欄位預設值 ── -->
        <div class="config-section">
          <div class="config-section-title">
            <span>⚙️ 特殊欄位預設值</span>
            <span class="config-section-desc">影響個人帳戶進帳計算</span>
          </div>
          <div class="var-defaults-grid">
            <div class="form-group">
              <label>給家用的金額</label>
              <input type="number" v-model.number="editingConfig.variable_defaults.toFamily" min="0" />
            </div>
            <div class="form-group">
              <label>上月我墊的錢</label>
              <input type="number" v-model.number="editingConfig.variable_defaults.previousMonthPaid" min="0" />
            </div>
          </div>
        </div>

        <!-- ── 固定項目 ── -->
        <div class="config-section">
          <div class="config-section-title">
            <span>🔒 固定項目</span>
            <span class="config-section-desc">每月金額固定，自動帶入不需填寫</span>
          </div>
          <p class="hint">
            <b>個人支出</b>：從個人帳戶扣除／
            <b>家庭支出</b>：從薪轉戶直接轉出／
            <b>僅供參考</b>：不計入計算
          </p>
          <div class="table-wrapper">
            <table class="data-table config-item-table">
              <thead>
                <tr><th>項目名稱</th><th>類型</th><th>金額</th><th>帳戶名稱</th><th>啟用</th><th>操作</th></tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in editingConfig.items" :key="idx">
                  <td><input type="text" v-model="item.name" class="table-input" /></td>
                  <td>
                    <select v-model="item.type" class="table-select">
                      <option value="expense">個人支出</option>
                      <option value="transfer">家庭支出</option>
                      <option value="info">僅供參考</option>
                    </select>
                  </td>
                  <td><input type="number" v-model.number="item.amount" min="0" class="table-input-sm" /></td>
                  <td><input type="text" v-model="item.account_name" class="table-input" /></td>
                  <td style="text-align:center;"><input type="checkbox" v-model="item.is_enabled" /></td>
                  <td><button class="btn btn-sm btn-danger" @click="removeItem(idx)">刪除</button></td>
                </tr>
                <tr v-if="!editingConfig.items.length">
                  <td colspan="6" class="empty-cell">尚無固定項目</td>
                </tr>
              </tbody>
            </table>
          </div>
          <button class="btn btn-secondary btn-sm" style="margin-top:8px;" @click="addItem">+ 新增固定項目</button>
        </div>

        <div class="modal-footer">
          <button class="btn btn-primary" @click="saveConfig" :disabled="loading">保存</button>
          <button class="btn btn-secondary" @click="cancelEdit">取消</button>
        </div>
      </div>
    </div>

    <div v-if="errorMsg" class="error-banner">{{ errorMsg }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMainStore } from '../stores/store';
import { api } from '../services/api';

const store         = useMainStore();
const editingConfig = ref(null);
const loading       = ref(false);
const errorMsg      = ref('');

const makeVarDefaults = () => ({
  income:  [],
  expense: [],
  toFamily: 19000,
  previousMonthPaid: 0,
});

function mergeVarDefaults(src) {
  return {
    income:            (src?.income  || []).map(i => ({ ...i })),
    expense:           (src?.expense || []).map(i => ({ ...i })),
    toFamily:          src?.toFamily          ?? 19000,
    previousMonthPaid: src?.previousMonthPaid ?? 0,
  };
}

onMounted(() => store.fetchConfigs());

function openNewForm() {
  editingConfig.value = {
    __isNew: true, id: '__new__', name: '新配置',
    variable_defaults: makeVarDefaults(), items: [],
  };
}

function openEditForm(config) {
  editingConfig.value = {
    ...config,
    variable_defaults: mergeVarDefaults(config.variable_defaults),
    items: config.items.map(i => ({ ...i })),
  };
}

function cancelEdit() { editingConfig.value = null; }

function newVarItemId(prefix) {
  return `${prefix}_${Date.now()}`;
}

function addVarItem(category) {
  editingConfig.value.variable_defaults[category].push({
    id: newVarItemId('var'),
    name: category === 'income' ? '新收入項目' : '新支出項目',
    amount: 0,
  });
}

function removeVarItem(category, idx) {
  editingConfig.value.variable_defaults[category].splice(idx, 1);
}

function addItem() {
  editingConfig.value.items.push({ name: '', type: 'expense', amount: 0, account_name: '', is_enabled: true });
}

function removeItem(idx) { editingConfig.value.items.splice(idx, 1); }

async function saveConfig() {
  loading.value = true; errorMsg.value = '';
  try {
    const payload = {
      name:              editingConfig.value.name,
      variable_defaults: editingConfig.value.variable_defaults,
      items:             editingConfig.value.items.map((item, i) => ({
        ...item, is_enabled: item.is_enabled ? 1 : 0, sort_order: i + 1,
      })),
    };
    if (editingConfig.value.__isNew) {
      await api.createConfig(payload);
    } else {
      await api.updateConfig(editingConfig.value.id, payload);
    }
    await store.fetchConfigs();
    editingConfig.value = null;
  } catch (err) {
    errorMsg.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function setActive(configId) {
  try { await api.setActiveConfig(configId); await store.fetchConfigs(); }
  catch (err) { errorMsg.value = err.message; }
}

async function copyConfig(config) {
  try { await api.createConfig({ name: `${config.name}（複製）`, copyFromId: config.id }); await store.fetchConfigs(); }
  catch (err) { errorMsg.value = err.message; }
}

async function deleteConfig(configId) {
  if (!confirm('確定刪除此配置嗎？')) return;
  try { await api.deleteConfig(configId); await store.fetchConfigs(); }
  catch (err) { errorMsg.value = err.message; }
}
</script>
