const BASE = '/api';

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Configs
  getConfigs:      ()         => req('GET',    '/configs'),
  getConfig:       (id)       => req('GET',    `/configs/${id}`),
  createConfig:    (data)     => req('POST',   '/configs', data),
  updateConfig:    (id, data) => req('PUT',    `/configs/${id}`, data),
  deleteConfig:    (id)       => req('DELETE', `/configs/${id}`),
  setActiveConfig: (id)       => req('GET',    `/configs/${id}/active`),

  // Records
  getRecords:       ()         => req('GET',    '/records'),
  getRecord:        (id)       => req('GET',    `/records/${id}`),
  getRecordByMonth: (month)    => req('GET',    `/records/month/${month}`),
  createRecord:     (data)     => req('POST',   '/records', data),
  updateRecord:     (id, data) => req('PUT',    `/records/${id}`, data),
  deleteRecord:     (id)       => req('DELETE', `/records/${id}`),

  // Calculate
  calculate: (data) => req('POST', '/calculate', data),

  // Export (直接回傳 URL 供 <a> 使用)
  exportCsvUrl: (id) => `${BASE}/export/${id}/csv`,
  exportTxtUrl: (id) => `${BASE}/export/${id}/txt`,
};
