// 左滑删除手势
import { deleteCard } from './cards.js';

export function bindSwipe(cardEl) {
  let startX=0, startY=0, currentX=0, swiping=false, directionLocked=false, isHorizontal=false;

  function onStart(e) {
    if (cardEl.classList.contains('editing')) return;
    const touch = e.touches ? e.touches[0] : e;
    startX = touch.clientX; startY = touch.clientY; currentX = 0;
    swiping = true; directionLocked = false; isHorizontal = false;
    cardEl.classList.add('swiping');
  }

  function onMove(e) {
    if (!swiping) return;
    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - startX, dy = touch.clientY - startY;
    if (!directionLocked && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      directionLocked = true;
      isHorizontal = Math.abs(dx) > Math.abs(dy);
    }
    if (!isHorizontal) return;
    e.preventDefault();
    currentX = Math.min(0, dx);
    const progress = Math.abs(currentX) / 100;
    cardEl.style.transform = `translateX(${currentX}px)`;
    cardEl.style.opacity = Math.max(0.4, 1 - progress * 0.6);
    if (progress > 0.3) cardEl.classList.add('swiping-deleting');
    else cardEl.classList.remove('swiping-deleting');
  }

  function onEnd() {
    if (!swiping) return;
    swiping = false;
    cardEl.classList.remove('swiping', 'swiping-deleting');
    cardEl.style.transform = ''; cardEl.style.opacity = '';
    if (isHorizontal && currentX < -50) {
      const wrapper = cardEl.closest('.card-wrapper');
      if (wrapper) { wrapper.style.transition = 'opacity .2s ease'; wrapper.style.opacity = '0'; }
      setTimeout(() => deleteCard(cardEl.dataset.id), 200);
    }
  }

  cardEl.addEventListener('touchstart', onStart, {passive:true});
  cardEl.addEventListener('touchmove', onMove, {passive:false});
  cardEl.addEventListener('touchend', onEnd);
  cardEl.addEventListener('mousedown', onStart);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onEnd);
  cardEl._cleanup = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onEnd);
  };
}
