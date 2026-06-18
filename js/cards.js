// 卡片业务逻辑：CRUD、合并、清空、日期导航
import { state, CURRENT_DATE_KEY } from './state.js';
import { isToday, getTodayKey, keyToDate, dateToKey, formatDateHeader, getWeekday } from './date.js';
import { saveCards, loadCards, cloudDeleteCurrent } from './storage.js';
import { render, showToast, updateHeader, closeModal, showModal, escapeHtml } from './ui.js';

export function addNewCard() {
  if (state.isNewCardOpen) return;
  if (!isToday(state.currentDate)) { showToast('只能为今天添加记录'); return; }
  state.isNewCardOpen = true;
  state.editingId = null;
  render();
}

export function cancelNewCard() {
  state.isNewCardOpen = false;
  render();
}

export function saveNewCard() {
  const ta = document.getElementById('newCardText');
  const text = ta ? ta.value.trim() : '';
  if (!text) { showToast('内容不能为空'); return; }
  const saveTime = new Date();
  const timestamp = `${String(saveTime.getHours()).padStart(2,'0')}:${String(saveTime.getMinutes()).padStart(2,'0')}:${String(saveTime.getSeconds()).padStart(2,'0')}`;
  state.cards.push({
    id: 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2,5),
    text: timestamp + ' > ' + text,
    created: Date.now()
  });
  state.isNewCardOpen = false;
  saveCards();
  render();
  showToast('已保存');
}

export function startEdit(id) {
  if (!isToday(state.currentDate)) { showToast('只能编辑今天的记录'); return; }
  state.editingId = id;
  state.isNewCardOpen = false;
  state.focusedId = null;
  render();
}

export function cancelEdit() {
  state.editingId = null;
  render();
}

export function saveEdit(id) {
  const ta = document.getElementById('editText_' + id);
  const text = ta ? ta.value.trim() : '';
  if (!text) { showToast('内容不能为空'); return; }
  const card = state.cards.find(c => c.id === id);
  if (card) card.text = text;
  state.editingId = null;
  saveCards();
  render();
  showToast('已更新');
}

export function deleteCard(id) {
  state.cards = state.cards.filter(c => c.id !== id);
  if (state.focusedId === id) state.focusedId = null;
  saveCards();
  render();
  showToast('已删除');
}

export function mergeCards() {
  if (state.cards.length === 0) { showToast('没有卡片可合并'); return; }
  const title = formatDateHeader(state.currentDate) + ' ' + getWeekday(state.currentDate);
  const merged = title + '\n\n' + state.cards.map(c => c.text).join('\n');
  showModal(`
    <div class="modal-title">合并内容</div>
    <div class="modal-body"><div class="modal-merged-text" id="mergedText">${escapeHtml(merged)}</div></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-action="close-modal">关闭</button>
      <button class="btn btn-primary" data-action="copy-merged">复制</button>
    </div>`);
}

export function copyMerged() {
  const el = document.getElementById('mergedText');
  if (!el) return;
  const text = el.textContent;
  navigator.clipboard.writeText(text)
    .then(() => showToast('已复制到剪贴板'))
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      showToast('已复制到剪贴板');
    });
}

export function confirmClear() {
  if (state.cards.length === 0 && !state.isNewCardOpen) { showToast('没有内容可清空'); return; }
  showModal(`
    <div class="confirm-icon">⚠️</div>
    <div class="modal-title" style="text-align:center">确认清空全部内容？</div>
    <div class="confirm-text">此操作将删除${isToday(state.currentDate) ? '今天的' : '这一天的'}所有记录，且无法恢复。</div>
    <div class="modal-actions" style="justify-content:center">
      <button class="btn btn-ghost" data-action="close-modal">取消</button>
      <button class="btn btn-danger" data-action="clear-all">确认清空</button>
    </div>`);
}

export function clearAll() {
  state.cards = [];
  state.isNewCardOpen = false;
  state.editingId = null;
  state.focusedId = null;
  saveCards();
  cloudDeleteCurrent();
  closeModal();
  render();
  showToast('已清空');
}

export function changeDay(delta) {
  const d = keyToDate(state.currentDate);
  d.setDate(d.getDate() + delta);
  const newKey = dateToKey(d);
  if (newKey > getTodayKey()) return;
  state.currentDate = newKey;
  localStorage.setItem(CURRENT_DATE_KEY, state.currentDate);
  state.editingId = null;
  state.focusedId = null;
  state.isNewCardOpen = false;
  loadCards();
  updateHeader();
  render();
}
