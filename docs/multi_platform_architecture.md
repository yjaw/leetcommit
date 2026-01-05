# 多平台支援架構

## 📋 概述

LeetCommit 現在採用**分離式 Observer 架構**，為每個支援的平台提供專屬的 content script。

## 🏗️ 架構設計

### 優點

1. **代碼分離**：每個平台有獨立的 observer，避免耦合
2. **易於維護**：針對特定平台的 DOM 結構單獨處理
3. **更好的性能**：只載入需要的代碼
4. **清晰的邏輯**：不需要在代碼中到處判斷平台類型

### 文件結構

```
src/content/
├── submission_observer_lc.js    # LeetCode 專用 (leetcode.com, leetcode.cn)
└── submission_observer_nc.js    # NeetCode 專用 (neetcode.io)
```

## 🔧 當前支援的平台

### 1. LeetCode
- **URL**: `https://leetcode.com/problems/*`, `https://leetcode.cn/problems/*`
- **Observer**: `submission_observer_lc.js`
- **狀態**: ✅ 完全支援

### 2. NeetCode
- **URL**: `https://neetcode.io/problems/*`
- **Observer**: `submission_observer_nc.js`
- **狀態**: ⚠️ 需要實際測試並調整 DOM 選擇器

## 📝 添加新平台的步驟

### 1. 建立新的 Observer

複製 `submission_observer_nc.js` 作為模板，並修改以下部分：

```javascript
// 1. Submit 按鈕檢測
const isSubmitButton = /* 根據平台調整 */;

// 2. 成功檢測
function checkForSuccess() {
    // 根據平台的 DOM 結構調整選擇器
}

// 3. 數據提取
function extractAndSend() {
    const problemUrl = `https://[platform].com/problems/${slug}`;
    // ... 其他提取邏輯
}
```

### 2. 更新 manifest.json

在 `content_scripts` 陣列中加入新的配置：

```json
{
    "matches": [
        "https://[new-platform].com/problems/*"
    ],
    "js": [
        "src/content/[new-platform]_observer.js"
    ]
}
```

### 3. 測試與調整

1. 重新載入擴充功能
2. 訪問新平台的題目頁面
3. 打開 DevTools Console 查看日誌
4. 根據實際 DOM 結構調整選擇器

## 🎯 NeetCode 待調整項目

以下選擇器需要根據 NeetCode 實際 DOM 結構調整：

### 成功檢測
```javascript
// 目前使用通用選擇器，可能需要更精確的定位
const successIndicators = [
    document.querySelector('[class*="accepted"]'),
    // ... 需要根據實際情況調整
];
```

### 標題提取
```javascript
const titleElement = document.querySelector('h1') ||
    document.querySelector('[class*="title"]');
// 可能需要更精確的選擇器
```

### 代碼提取
```javascript
// 需要確認 NeetCode 使用的編輯器類型
const lines = document.querySelectorAll('.view-lines .view-line');
```

### 語言檢測
```javascript
// 需要確認語言選擇器的實際 class name
const languageButtons = document.querySelectorAll('button[class*="language"]');
```

## 🧪 測試建議

1. **LeetCode**: 已經過測試，應該可以正常運作
2. **NeetCode**: 
   - 訪問 `https://neetcode.io/problems/[any-problem]`
   - 打開 Console 查看 `[LeetCommit]` 日誌
   - 提交一個解答並觀察是否正確檢測
   - 根據日誌調整選擇器

## 📊 數據流程

```
[Platform Page] 
    ↓ (Submit clicked)
[Platform Observer] 
    ↓ (Detects success)
[Extract Data] 
    ↓ (Send message)
[Background Script] 
    ↓ (Process & sync)
[GitHub Repository]
```

每個 observer 會在 payload 中加入：
- `platform`: 平台名稱 (e.g., "LEETCODE", "NEETCODE")
- `problemUrl`: 問題的完整 URL

Background script 會使用這些資訊生成正確的 README 連結和平台標記。
