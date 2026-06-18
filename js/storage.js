// 本地存储 + 云端同步编排
import { state, STORAGE_KEY, CURRENT_DATE_KEY } from './state.js';
import { cloudLoadCards, cloudSaveCards, cloudDeleteCards } from './cloud.js';

export function loadCardsLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY + state.currentDate);
    state.cards = raw ? JSON.parse(raw) : [];
  } catch(e) { state.cards = []; }
}

export async function loadCards() {
  loadCardsLocal();
  if (state.cloudConfig.connected) {
    const cloudData = await cloudLoadCards(state.currentDate);
    if (cloudData && cloudData.cards !== null) {
      const localTs = parseInt(localStorage.getItem(STORAGE_KEY + state.currentDate + '_ts') || '0');
      if (cloudData.updatedAt > localTs) {
        state.cards = cloudData.cards;
        localStorage.setItem(STORAGE_KEY + state.currentDate, JSON.stringify(state.cards));
        localStorage.setItem(STORAGE_KEY + state.currentDate + '_ts', String(cloudData.updatedAt));
      }
    }
  }
}

export function saveCards() {
  localStorage.setItem(STORAGE_KEY + state.currentDate, JSON.stringify(state.cards));
  const ts = String(Date.now());
  localStorage.setItem(STORAGE_KEY + state.currentDate + '_ts', ts);
  if (state.cloudConfig.connected) {
    cloudSaveCards(state.currentDate, state.cards).catch(e => console.error('Background cloud save failed:', e));
  }
}

export async function syncFromCloud() {
  if (!state.cloudConfig.connected) return;
  const cloudData = await cloudLoadCards(state.currentDate);
  if (cloudData && cloudData.cards !== null) {
    const localUpdatedAt = parseInt(localStorage.getItem(STORAGE_KEY + state.currentDate + '_ts') || '0');
    if (cloudData.updatedAt > localUpdatedAt) {
      state.cards = cloudData.cards;
      localStorage.setItem(STORAGE_KEY + state.currentDate, JSON.stringify(state.cards));
      localStorage.setItem(STORAGE_KEY + state.currentDate + '_ts', String(cloudData.updatedAt));
    }
  }
}

export async function syncAllFromCloud() {
  if (!state.cloudConfig.connected) return;
  try {
    const { cloudUrl, cloudHeaders } = await import('./cloud.js');
    const url = cloudUrl('diary') + '?sync_code=eq.' + encodeURIComponent(state.cloudConfig.syncCode) + '&select=date,cards,updated_at&limit=100';
    const res = await fetch(url, { method: 'GET', headers: cloudHeaders() });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    if (data) {
      data.forEach(doc => {
        const localTs = parseInt(localStorage.getItem(STORAGE_KEY + doc.date + '_ts') || '0');
        const cloudTs = new Date(doc.updated_at).getTime() || 0;
        if (cloudTs > localTs) {
          localStorage.setItem(STORAGE_KEY + doc.date, JSON.stringify(doc.cards || []));
          localStorage.setItem(STORAGE_KEY + doc.date + '_ts', String(cloudTs));
        }
      });
      loadCardsLocal();
    }
  } catch(e) {
    console.error('Sync all from cloud failed:', e);
  }
}

export async function cloudDeleteCurrent() {
  if (state.cloudConfig.connected) {
    return await cloudDeleteCards(state.currentDate);
  }
  return false;
}
