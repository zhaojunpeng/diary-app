// 同步设置弹窗
import { state } from './state.js';
import { initCloud, disconnectCloud } from './cloud.js';
import { syncFromCloud } from './storage.js';
import { render, closeModal, showToast, showModal, escapeHtml, updateSyncIndicator } from './ui.js';

export function openSettings() {
  const isConnected = state.cloudConfig.connected;
  const statusClass = isConnected ? 'settings-status-on' : (state.cloudConfig.lastError ? 'settings-status-err' : 'settings-status-off');
  let statusText = isConnected ? '☁️ 已连接 · 同步码: ' + state.cloudConfig.syncCode : '📁 仅本地存储';
  if (!isConnected && state.cloudConfig.lastError) statusText = '❌ ' + state.cloudConfig.lastError;

  showModal(`
    <div class="modal-title">数据同步设置</div>
    <div class="modal-body">
      <div class="settings-section">
        <div class="settings-label">Supabase 项目 URL</div>
        <input class="settings-input" id="settingsUrl" placeholder="https://xxxxx.supabase.co" value="${escapeHtml(state.cloudConfig.supabaseUrl)}">
        <div class="settings-hint">前往 <a href="https://supabase.com" target="_blank" style="color:var(--accent)">supabase.com</a> 创建免费项目，在 Settings → API 中复制 Project URL</div>
      </div>
      <div class="settings-section">
        <div class="settings-label">Supabase 匿名密钥 (anon key)</div>
        <input class="settings-input" id="settingsKey" placeholder="eyJhbGciOi..." value="${escapeHtml(state.cloudConfig.supabaseKey)}">
        <div class="settings-hint">在 Settings → API 中复制 anon public 密钥（以 sb_publishable_ 或 eyJ 开头均可）</div>
      </div>
      <div class="settings-section">
        <div class="settings-label">同步码</div>
        <input class="settings-input" id="settingsSyncCode" placeholder="设置一个同步码，其他设备输入相同码即可同步" value="${escapeHtml(state.cloudConfig.syncCode)}">
        <div class="settings-hint">同步码是你的跨设备身份标识，类似密码。<br>在另一台设备输入相同同步码，即可访问同一份数据。</div>
      </div>
      <div class="settings-status ${statusClass}" id="settingsStatus">${statusText}</div>
    </div>
    <div class="modal-actions" style="justify-content:space-between">
      ${isConnected ? '<button class="btn btn-danger" data-action="disconnect">断开连接</button>' : '<div></div>'}
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost" data-action="close-modal">关闭</button>
        <button class="btn btn-success" data-action="connect">连接</button>
      </div>
    </div>
  `);
}

export async function handleConnect() {
  const url = document.getElementById('settingsUrl').value.trim();
  const key = document.getElementById('settingsKey').value.trim();
  const syncCode = document.getElementById('settingsSyncCode').value.trim();

  if (!url || !key || !syncCode) {
    showToast('请填写 URL、密钥和同步码');
    return;
  }

  const statusEl = document.getElementById('settingsStatus');
  statusEl.className = 'settings-status settings-status-off';
  statusEl.textContent = '⏳ 正在连接...';

  state.cloudConfig.supabaseUrl = url;
  state.cloudConfig.supabaseKey = key;
  state.cloudConfig.syncCode = syncCode;

  const success = await initCloud();
  updateSyncIndicator();
  if (success) {
    statusEl.className = 'settings-status settings-status-on';
    statusEl.textContent = '☁️ 已连接 · 同步码: ' + syncCode;
    showToast('云端连接成功');
    await syncFromCloud();
    render();
    closeModal();
    openSettings();
  } else {
    statusEl.className = 'settings-status settings-status-err';
    const errMsg = state.cloudConfig.lastError || '请检查 URL、密钥和网络';
    statusEl.textContent = '❌ 连接失败: ' + errMsg;
    showToast('连接失败');
  }
}

export async function handleDisconnect() {
  await disconnectCloud();
  updateSyncIndicator();
  closeModal();
  showToast('已断开云端连接');
  render();
}
