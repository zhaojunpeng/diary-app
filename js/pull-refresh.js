// 下拉刷新手势
import { state } from './state.js';
import { syncAllFromCloud, syncFromCloud, loadCardsLocal } from './storage.js';
import { render, showToast } from './ui.js';

const THRESHOLD = 80;

export function initPullRefresh() {
  const indicator = document.getElementById('pullIndicator');
  const pullText = document.getElementById('pullText');
  let startY = 0, pulling = false, canPull = true;

  function isAtTop() { return window.scrollY <= 0; }

  function onstart(e) {
    if (!isAtTop()) { canPull = false; return; }
    canPull = true;
    const pt = e.touches ? e.touches[0] : e;
    startY = pt.clientY;
    pulling = false;
  }

  function onmove(e) {
    if (!canPull) return;
    const pt = e.touches ? e.touches[0] : e;
    const dy = pt.clientY - startY;
    if (dy <= 0) { pulling = false; indicator.classList.remove('visible'); return; }
    if (!pulling && dy > 10) { pulling = true; }
    if (!pulling) return;
    e.preventDefault();
    const dist = Math.min(dy * 0.5, THRESHOLD + 20);
    const progress = Math.min(dist / THRESHOLD, 1);
    indicator.style.transform = `translateX(-50%) translateY(${-60 + dist + 12}px)`;
    indicator.classList.toggle('visible', dist > 10);
    indicator.classList.remove('refreshing');
    if (progress >= 1) {
      pullText.textContent = '松手刷新';
      indicator.querySelector('.pull-spinner').style.borderTopColor = 'var(--macaron-green)';
    } else {
      pullText.textContent = '下拉刷新';
      indicator.querySelector('.pull-spinner').style.borderTopColor = 'var(--macaron-pink)';
    }
  }

  async function onend() {
    if (!pulling) return;
    canPull = false;
    const currentTranslate = parseFloat(indicator.style.transform.match(/translateY\((.+?)px\)/)?.[1] || 0);
    if (currentTranslate >= -10) {
      indicator.style.transform = '';
      indicator.classList.add('visible', 'refreshing');
      pullText.textContent = '刷新中…';
      indicator.querySelector('.pull-spinner').style.borderTopColor = 'var(--macaron-green)';

      try {
        if (state.cloudConfig.connected) {
          await syncAllFromCloud();
          await syncFromCloud();
        }
      } catch(e) { console.error('Pull refresh sync error:', e); }
      loadCardsLocal();
      render();
      showToast('已刷新');

      await new Promise(r => setTimeout(r, 500));
    }
    indicator.classList.remove('visible', 'refreshing');
    indicator.style.transform = '';
    pullText.textContent = '下拉刷新';
    indicator.querySelector('.pull-spinner').style.borderTopColor = 'var(--macaron-pink)';
    pulling = false;
  }

  document.addEventListener('touchstart', onstart, { passive: true });
  document.addEventListener('touchmove', onmove, { passive: false });
  document.addEventListener('touchend', onend);
  document.addEventListener('mousedown', onstart);
  document.addEventListener('mousemove', onmove);
  document.addEventListener('mouseup', onend);
}
