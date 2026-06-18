// 渲染与通用 UI 组件
import { state } from './state.js';
import { formatDateHeader, getWeekday, isToday } from './date.js';
import { bindSwipe } from './swipe.js';

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function updateHeader() {
  document.getElementById('headerDate').textContent = formatDateHeader(state.currentDate);
  document.getElementById('headerWeekday').textContent = getWeekday(state.currentDate);
  const badge = document.getElementById('todayBadge');
  const nextBtn = document.getElementById('nextDay');
  if (isToday(state.currentDate)) {
    badge.style.display = 'inline-block';
    nextBtn.disabled = true;
  } else {
    badge.style.display = 'none';
    nextBtn.disabled = false;
  }
  document.getElementById('addBtn').style.display = isToday(state.currentDate) ? 'flex' : 'none';
  updateSyncIndicator();
}

export function updateSyncIndicator() {
  const el = document.getElementById('syncIndicator');
  if (!el) return;
  if (state.cloudConfig.connected) {
    el.innerHTML = '<div class="sync-indicator sync-on"><span class="sync-dot"></span>已同步</div>';
  } else {
    el.innerHTML = '<div class="sync-indicator sync-off"><span class="sync-dot"></span>本地存储</div>';
  }
}

export function render() {
  const grid = document.getElementById('cardsGrid');
  const canAdd = isToday(state.currentDate);

  if (state.cards.length === 0 && !state.isNewCardOpen) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">✦</div>
        <div class="empty-state-text">${canAdd ? '今天还没有记录<br>点击下方「记一下」开始书写' : '这一天没有记录'}</div>
      </div>`;
    return;
  }

  let html = '';
  state.cards.forEach((card, i) => {
    if (state.editingId === card.id) {
      html += `
        <div class="card-wrapper editing-wrapper" style="animation-delay:${i*0.04}s">
          <div class="card editing" data-id="${card.id}">
            <textarea class="card-edit-area" id="editText_${card.id}">${escapeHtml(card.text)}</textarea>
            <div class="card-edit-actions">
              <button class="btn btn-ghost" data-action="cancel-edit">取消</button>
              <button class="btn btn-primary" data-action="save-edit" data-id="${card.id}">保存</button>
            </div>
          </div>
        </div>`;
    } else {
      const isFocused = state.focusedId === card.id;
      html += `
        <div class="card-wrapper${isFocused ? ' focused-wrapper' : ''}" style="animation-delay:${i*0.04}s">
          <div class="card${isFocused ? ' focused' : ''}" data-id="${card.id}" data-action="dblclick-edit">
            <div class="card-text">${escapeHtml(card.text)}</div>
          </div>
        </div>`;
    }
  });

  if (state.isNewCardOpen && canAdd) {
    html += `
      <div class="new-card" id="newCardForm">
        <textarea class="new-card-textarea" id="newCardText" placeholder="写下此刻的想法…" autofocus></textarea>
        <div class="new-card-actions">
          <button class="btn btn-ghost" data-action="cancel-new">取消</button>
          <button class="btn btn-primary" data-action="save-new">保存</button>
        </div>
      </div>`;
  }

  grid.innerHTML = html;
  document.querySelectorAll('.card-wrapper .card:not(.editing)').forEach(bindSwipe);

  // Dim other cards' text when adding/editing to focus attention on the active textarea
  grid.classList.toggle('dimmed', !!(state.isNewCardOpen || state.editingId));

  // Bottom bar visibility
  const bottomBar = document.getElementById('bottomBar');
  if (state.isNewCardOpen || state.editingId) {
    bottomBar.style.opacity = '0'; bottomBar.style.pointerEvents = 'none';
    bottomBar.style.transform = 'translateX(-50%) translateY(20px)';
  } else {
    bottomBar.style.opacity = '1'; bottomBar.style.pointerEvents = 'auto';
    bottomBar.style.transform = 'translateX(-50%) translateY(0)';
  }

  // Scroll active textarea into view (single smooth scroll, no repeated calls)
  function scrollToTarget(el) {
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({behavior:'smooth',block:'center'});
    });
  }
  if (state.editingId) {
    const ta = document.getElementById('editText_' + state.editingId);
    if (ta) {
      ta.focus({preventScroll:true});
      ta.selectionStart = ta.value.length;
      scrollToTarget(ta.closest('.card-wrapper') || ta);
    }
  }
  if (state.isNewCardOpen) {
    const form = document.getElementById('newCardForm');
    const ta = document.getElementById('newCardText');
    scrollToTarget(form || ta);
    if (ta) { ta.focus({preventScroll:true}); }
  }
}

export function showModal(html) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modalOverlay';
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeModal();
  });
  document.body.appendChild(overlay);
}

export function closeModal() {
  const m = document.getElementById('modalOverlay');
  if (m) m.remove();
}

export function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}
