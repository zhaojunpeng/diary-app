// 入口模块：初始化、全局事件绑定、键盘快捷键
import { state, CURRENT_DATE_KEY } from './state.js';
import { getTodayKey, isToday } from './date.js';
import { loadCloudConfig, initCloud } from './cloud.js';
import { loadCardsLocal, loadCards, syncFromCloud, syncAllFromCloud } from './storage.js';
import { render, updateHeader, updateSyncIndicator, closeModal, showToast } from './ui.js';
import {
  addNewCard, cancelNewCard, saveNewCard,
  startEdit, cancelEdit, saveEdit, deleteCard,
  mergeCards, copyMerged, confirmClear, clearAll, changeDay
} from './cards.js';
import { openSettings, handleConnect, handleDisconnect } from './settings.js';
import { initPullRefresh } from './pull-refresh.js';
import { initTheme, toggleTheme } from './theme.js';

// ===== Static button bindings =====
function bindStaticButtons() {
  document.getElementById('prevDay').addEventListener('click', () => changeDay(-1));
  document.getElementById('nextDay').addEventListener('click', () => changeDay(1));
  document.querySelector('.header-settings').addEventListener('click', openSettings);
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('addBtn').addEventListener('click', addNewCard);
  document.querySelector('.btn-merge').addEventListener('click', mergeCards);
  document.querySelector('.btn-clear').addEventListener('click', confirmClear);
}

// ===== Delegated clicks for dynamic content (cards, modal, refresh) =====
function bindDelegatedClicks() {
  // Card grid: dblclick to edit
  const grid = document.getElementById('cardsGrid');
  grid.addEventListener('dblclick', (e) => {
    const card = e.target.closest('.card[data-action="dblclick-edit"]');
    if (card) startEdit(card.dataset.id);
  });

  // Card grid: action buttons + focus toggle
  grid.addEventListener('click', (e) => {
    // action buttons (cancel/save) — handle and stop
    const btn = e.target.closest('[data-action]');
    if (btn && btn.dataset.action !== 'dblclick-edit') {
      const action = btn.dataset.action;
      if (action === 'cancel-edit') { cancelEdit(); return; }
      if (action === 'save-edit') { saveEdit(btn.dataset.id); return; }
      if (action === 'cancel-new') { cancelNewCard(); return; }
      if (action === 'save-new') { saveNewCard(); return; }
    }
    // single click on a non-editing card → toggle focus (scale up 5%)
    // 用 DOM 操作直接切换 class，不调用 render()，避免重建 DOM 破坏 dblclick 检测
    const card = e.target.closest('.card[data-action="dblclick-edit"]');
    if (card && card.dataset.id !== state.editingId) {
      const wrapper = card.closest('.card-wrapper');
      // 取消之前的聚焦
      if (state.focusedId && state.focusedId !== card.dataset.id) {
        const prevCard = grid.querySelector('.card.focused');
        const prevWrapper = grid.querySelector('.card-wrapper.focused-wrapper');
        if (prevCard) prevCard.classList.remove('focused');
        if (prevWrapper) prevWrapper.classList.remove('focused-wrapper');
      }
      // toggle 当前卡片
      const willFocus = state.focusedId !== card.dataset.id;
      state.focusedId = willFocus ? card.dataset.id : null;
      card.classList.toggle('focused', willFocus);
      if (wrapper) wrapper.classList.toggle('focused-wrapper', willFocus);
    }
  });

  // Modal: action buttons (delegated on document since modal is appended to body)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#modalOverlay [data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'close-modal') closeModal();
    else if (action === 'copy-merged') copyMerged();
    else if (action === 'clear-all') clearAll();
    else if (action === 'connect') handleConnect();
    else if (action === 'disconnect') handleDisconnect();
  });

  // Click on .main background: cancel empty new-card form + clear card focus
  document.querySelector('.main').addEventListener('click', (e) => {
    // Cancel new-card form if clicking outside it and textarea is empty
    if (state.isNewCardOpen && !e.target.closest('.new-card')) {
      const ta = document.getElementById('newCardText');
      if (!ta || !ta.value.trim()) cancelNewCard();
    }
    // Clear card focus when clicking outside any card (DOM 直接操作，不 render)
    if (state.focusedId && !e.target.closest('.card')) {
      const prevCard = document.querySelector('#cardsGrid .card.focused');
      const prevWrapper = document.querySelector('#cardsGrid .card-wrapper.focused-wrapper');
      if (prevCard) prevCard.classList.remove('focused');
      if (prevWrapper) prevWrapper.classList.remove('focused-wrapper');
      state.focusedId = null;
    }
  });
}

// ===== Keyboard shortcuts =====
function bindKeyboard() {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (document.getElementById('modalOverlay')) { closeModal(); return; }
      if (state.editingId) { cancelEdit(); return; }
      if (state.isNewCardOpen) { cancelNewCard(); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      const active = document.activeElement;
      if (active && (active.id === 'newCardText' || active.id.startsWith('editText_'))) {
        e.preventDefault();
        if (state.isNewCardOpen) { saveNewCard(); return; }
        if (state.editingId) { saveEdit(state.editingId); return; }
      }
    }
  });
}

// ===== Mobile keyboard handling =====
function bindMobileKeyboard() {
  if (!window.visualViewport) return;
  let prevH = window.visualViewport.height;
  window.visualViewport.addEventListener('resize', () => {
    const curH = window.visualViewport.height;
    if (prevH - curH > 100) {
      const active = document.activeElement;
      if (active && (active.id === 'newCardText' || active.id.startsWith('editText_'))) {
        const target = active.closest('.card-wrapper,.new-card') || active;
        setTimeout(() => target.scrollIntoView({behavior:'smooth',block:'center'}), 50);
      }
    }
    prevH = curH;
  });
}

// ===== Init =====
async function init() {
  try {
    loadCloudConfig();
    const saved = localStorage.getItem(CURRENT_DATE_KEY);
    const today = getTodayKey();
    state.currentDate = (saved && saved <= today) ? saved : today;
    updateHeader();

    if (state.cloudConfig.supabaseUrl && state.cloudConfig.supabaseKey && state.cloudConfig.syncCode) {
      try {
        const connected = await initCloud();
        updateSyncIndicator();
        if (connected) {
          await syncAllFromCloud();
        }
      } catch(cloudErr) {
        console.error('Cloud init error (non-fatal):', cloudErr);
        updateSyncIndicator();
      }
    }

    loadCardsLocal();
    if (state.cloudConfig.connected) {
      try { await syncFromCloud(); } catch(e) { console.error('Sync error (non-fatal):', e); }
    }
  } catch(e) {
    console.error('Init error:', e);
  }
  render();
}

// ===== Boot =====
initTheme();
bindStaticButtons();
bindDelegatedClicks();
bindKeyboard();
bindMobileKeyboard();
initPullRefresh();
init();
