# 一日日记

一个简洁的日记应用，纯前端实现，支持云同步。

## 访问地址

- [又拍云（主地址）](http://diary-app.test.upcdn.net/diary.html)

## 文件结构

| 文件/文件夹 | 说明 |
|-------------|------|
| `diary.html` | 主页面 |
| `styles.css` | 样式文件 |
| `js/` | JS 模块目录 |
| ├─ `cards.js` | 卡片管理 |
| ├─ `cloud.js` | 云同步（Supabase） |
| ├─ `date.js` | 日期处理 |
| ├─ `main.js` | 主入口 |
| ├─ `pull-refresh.js` | 下拉刷新 |
| ├─ `settings.js` | 设置面板 |
| ├─ `state.js` | 状态管理 |
| ├─ `storage.js` | 本地存储 |
| ├─ `swipe.js` | 滑动手势 |
| ├─ `theme.js` | 主题切换 |
| └─ `ui.js` | UI 渲染 |

## 技术栈

- 纯前端 HTML/CSS/JavaScript，零依赖
- ES Modules 原生模块化
- Supabase REST API 实现云同步
- 又拍云 UPYun 静态托管
