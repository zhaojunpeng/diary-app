// 日期工具函数（纯函数，无副作用）
export function getTodayKey() { return dateToKey(new Date()); }

export function dateToKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function keyToDate(key) {
  const [y,m,d] = key.split('-').map(Number);
  return new Date(y, m-1, d);
}

export function formatDateHeader(dateStr) {
  const d = keyToDate(dateStr);
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
}

export function getWeekday(dateStr) {
  const days = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
  return days[keyToDate(dateStr).getDay()];
}

export function isToday(dateStr) {
  return dateStr === getTodayKey();
}
