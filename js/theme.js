// 主题切换：自动按时间 + 手动覆盖
const THEME_KEY = 'diary_theme_override';          // 'day' | 'night' | null
const THEME_EXPIRY_KEY = 'diary_theme_override_expiry';  // timestamp

export function getCurrentThemeByTime() {
  const h = new Date().getHours();
  return (h >= 8 && h < 20) ? 'day' : 'night';
}

export function getActiveTheme() {
  const expiry = parseInt(localStorage.getItem(THEME_EXPIRY_KEY) || '0');
  if (Date.now() < expiry) {
    const override = localStorage.getItem(THEME_KEY);
    if (override === 'day' || override === 'night') return override;
  }
  // 过期则清除覆盖
  localStorage.removeItem(THEME_KEY);
  localStorage.removeItem(THEME_EXPIRY_KEY);
  return getCurrentThemeByTime();
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

function getNextBoundary(theme) {
  const now = new Date();
  const boundary = new Date(now);
  if (theme === 'day') {
    // day 的覆盖到当天 20:00 失效
    boundary.setHours(20, 0, 0, 0);
    if (boundary <= now) boundary.setDate(boundary.getDate() + 1);
  } else {
    // night 的覆盖到次日 08:00 失效
    boundary.setDate(boundary.getDate() + 1);
    boundary.setHours(8, 0, 0, 0);
  }
  return boundary.getTime();
}

export function toggleTheme() {
  const current = getActiveTheme();
  const next = current === 'day' ? 'night' : 'day';
  localStorage.setItem(THEME_KEY, next);
  localStorage.setItem(THEME_EXPIRY_KEY, String(getNextBoundary(next)));
  applyTheme(next);
  updateThemeToggleIcon();
}

export function updateThemeToggleIcon() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const current = getActiveTheme();
  btn.textContent = current === 'day' ? '☾' : '☀';
  btn.title = current === 'day' ? '切换到夜间模式' : '切换到日间模式';
}

function scheduleAutoSwitch() {
  const now = new Date();
  const next8 = new Date(now); next8.setHours(8, 0, 0, 0);
  const next20 = new Date(now); next20.setHours(20, 0, 0, 0);
  if (next8 <= now) next8.setDate(next8.getDate() + 1);
  if (next20 <= now) next20.setDate(next20.getDate() + 1);
  const next = Math.min(next8.getTime(), next20.getTime());
  const delay = next - now.getTime();
  setTimeout(() => {
    const expiry = parseInt(localStorage.getItem(THEME_EXPIRY_KEY) || '0');
    if (Date.now() >= expiry) {
      applyTheme(getCurrentThemeByTime());
      updateThemeToggleIcon();
    }
    scheduleAutoSwitch();
  }, delay + 1000);
}

export function initTheme() {
  applyTheme(getActiveTheme());
  updateThemeToggleIcon();
  scheduleAutoSwitch();
}
