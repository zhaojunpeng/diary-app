// Supabase REST API（纯 fetch，无 SDK 依赖）
import { state, CLOUD_CONFIG_KEY } from './state.js';
import { getTodayKey } from './date.js';

export function cloudHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': state.cloudConfig.supabaseKey,
    'Authorization': 'Bearer ' + state.cloudConfig.supabaseKey,
    'Prefer': 'return=representation'
  };
}

export function cloudUrl(table) {
  const base = state.cloudConfig.supabaseUrl.replace(/\/$/, '');
  return base + '/rest/v1/' + table;
}

export function loadCloudConfig() {
  try {
    const raw = localStorage.getItem(CLOUD_CONFIG_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      // 只用 saved 中的非空字段覆盖，避免空值覆盖预填的默认凭据
      Object.keys(saved).forEach(k => {
        if (saved[k] !== '' && saved[k] !== null && saved[k] !== undefined) {
          state.cloudConfig[k] = saved[k];
        }
      });
    }
  } catch(e) {}
}

export function saveCloudConfig() {
  localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify({
    supabaseUrl: state.cloudConfig.supabaseUrl,
    supabaseKey: state.cloudConfig.supabaseKey,
    syncCode: state.cloudConfig.syncCode,
    connected: state.cloudConfig.connected
  }));
}

export async function initCloud() {
  const cfg = state.cloudConfig;
  if (!cfg.supabaseUrl || !cfg.supabaseKey || !cfg.syncCode) {
    cfg.connected = false;
    return false;
  }
  try {
    const url = cloudUrl('diary') + '?sync_code=eq.' + encodeURIComponent(cfg.syncCode) + '&date=eq.' + getTodayKey() + '&limit=1';
    const res = await fetch(url, { method: 'GET', headers: cloudHeaders() });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(res.status + ': ' + (errBody || res.statusText));
    }
    await res.json();
    cfg.connected = true;
    cfg.lastError = '';
    saveCloudConfig();
    return true;
  } catch(e) {
    console.error('Cloud init failed:', e);
    cfg.connected = false;
    cfg.lastError = e.message || String(e);
    saveCloudConfig();
    return false;
  }
}

export async function disconnectCloud() {
  state.cloudConfig.connected = false;
  saveCloudConfig();
}

export async function cloudLoadCards(dateKey) {
  if (!state.cloudConfig.connected) return null;
  try {
    const url = cloudUrl('diary') + '?sync_code=eq.' + encodeURIComponent(state.cloudConfig.syncCode) + '&date=eq.' + encodeURIComponent(dateKey) + '&limit=1';
    const res = await fetch(url, { method: 'GET', headers: cloudHeaders() });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    if (data && data.length > 0) {
      return { cards: data[0].cards || [], updatedAt: new Date(data[0].updated_at).getTime() || 0, id: data[0].id };
    }
    return { cards: null, updatedAt: 0, id: null };
  } catch(e) {
    console.error('Cloud load failed:', e);
    return null;
  }
}

export async function cloudSaveCards(dateKey, cardsData) {
  if (!state.cloudConfig.connected) return false;
  try {
    const checkUrl = cloudUrl('diary') + '?sync_code=eq.' + encodeURIComponent(state.cloudConfig.syncCode) + '&date=eq.' + encodeURIComponent(dateKey) + '&select=id&limit=1';
    const checkRes = await fetch(checkUrl, { method: 'GET', headers: cloudHeaders() });
    if (!checkRes.ok) throw new Error(checkRes.status);
    const existing = await checkRes.json();

    const payload = { cards: cardsData, updated_at: new Date().toISOString() };

    if (existing && existing.length > 0) {
      const updateUrl = cloudUrl('diary') + '?id=eq.' + existing[0].id;
      const res = await fetch(updateUrl, { method: 'PATCH', headers: cloudHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(res.status);
    } else {
      payload.sync_code = state.cloudConfig.syncCode;
      payload.date = dateKey;
      const insertHeaders = { ...cloudHeaders() };
      delete insertHeaders['Prefer'];
      const res = await fetch(cloudUrl('diary'), { method: 'POST', headers: insertHeaders, body: JSON.stringify([payload]) });
      if (!res.ok) throw new Error(res.status);
    }
    return true;
  } catch(e) {
    console.error('Cloud save failed:', e);
    return false;
  }
}

export async function cloudDeleteCards(dateKey) {
  if (!state.cloudConfig.connected) return false;
  try {
    const url = cloudUrl('diary') + '?sync_code=eq.' + encodeURIComponent(state.cloudConfig.syncCode) + '&date=eq.' + encodeURIComponent(dateKey);
    const res = await fetch(url, { method: 'DELETE', headers: cloudHeaders() });
    if (!res.ok) throw new Error(res.status);
    return true;
  } catch(e) {
    console.error('Cloud delete failed:', e);
    return false;
  }
}
