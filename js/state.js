// 全局状态与常量
// 预填 Supabase 凭据，省去用户每次手动输入
export const SUPABASE_URL = 'https://htnhtlzocswnelgngabk.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_fKVADdqjv3JsyhIU81B14A_KclK1ai8';

export const STORAGE_KEY = 'diary_cards_';
export const CURRENT_DATE_KEY = 'diary_current_date';
export const CLOUD_CONFIG_KEY = 'diary_cloud_config';

export const state = {
  cards: [],
  editingId: null,
  focusedId: null,
  isNewCardOpen: false,
  currentDate: null,
  cloudConfig: {
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_KEY,
    syncCode: '',
    connected: false,
    lastError: ''
  }
};
