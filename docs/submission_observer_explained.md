# 📖 `submission_observer.js` 詳細解釋

這是一個 **Content Script**，會被注入到 LeetCode 的網頁中。它的工作是監控頁面變化，當檢測到 "Accepted" 時自動提取題目資訊並發送給 background script。

---

## 🏗️ 整體架構

```
載入 → 監聽 DOM 變化 → 檢測 Accepted → 提取資料 → 發送訊息
```

---

## 📝 逐段解釋

### 1️⃣ **初始化** (第 1-5 行)
```javascript
console.log('[LeetCommit] Content script loaded');
let lastSubmissionId = null;
```
- 確認 script 已載入
- `lastSubmissionId`: 用來避免重複處理同一次提交（防抖）

---

### 2️⃣ **Debounce 函數** (第 7-18 行)
```javascript
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
```

**作用**: 防止函數被頻繁調用
- LeetCode 的 DOM 會不斷變化（動畫、更新等）
- 如果每次變化都檢查，會很耗效能
- **Debounce 確保**: 只有在 DOM 停止變化 1.5 秒後才執行檢查

**比喻**: 就像電梯門，如果有人一直進出，門就不會關。只有當 1.5 秒內沒人進出，門才會關閉。

---

### 3️⃣ **MutationObserver - DOM 監聽器** (第 20-28 行)
```javascript
const observer = new MutationObserver(debounce(() => {
    checkForSuccess();
}, 1500));

observer.observe(document.body, {
    childList: true,
    subtree: true
});
```

**作用**: 監聽整個頁面的 DOM 變化

- `MutationObserver`: 瀏覽器原生 API，用來監聽 DOM 改變
- `childList: true`: 監聽子元素的新增/刪除
- `subtree: true`: 監聽所有後代元素（不只是直接子元素）
- 每當 DOM 變化時 → 等待 1.5 秒 → 執行 `checkForSuccess()`

**為什麼需要這個？**
- LeetCode 是 SPA（Single Page Application），頁面不會重新載入
- 當你點擊 Submit，結果是動態插入到頁面的
- 我們需要監聽這個動態變化

---

### 4️⃣ **檢測 Accepted** (第 30-59 行)
```javascript
function checkForSuccess() {
    const submissionResult = document.querySelector('[data-e2e-locator="submission-result"]');
    const isAccepted = submissionResult && submissionResult.textContent.trim() === 'Accepted';
    
    // Debug logging (每 10 次輸出一次)
    if (window.leetcommitCheckCount % 10 === 0) {
        console.log('[LeetCommit debug] Checking for success...');
    }

    if (isAccepted) {
        // 防止 5 秒內重複處理
        const submissionId = new Date().getTime();
        if (lastSubmissionId && (submissionId - lastSubmissionId < 5000)) {
            return;
        }
        
        lastSubmissionId = submissionId;
        extractAndSend();
    }
}
```

**流程**:
1. 查找 `<span data-e2e-locator="submission-result">Accepted</span>`
2. 檢查文字是否為 "Accepted"
3. 如果是 → 確保不是重複觸發 → 執行 `extractAndSend()`

**防抖機制**:
- `lastSubmissionId`: 記錄上次處理的時間戳
- 如果距離上次處理不到 5 秒 → 跳過（避免重複）

**為什麼用這個選擇器？**
- LeetCode 的 DOM 結構會變化，但 `data-e2e-locator` 是測試用的屬性，相對穩定
- 這是 LeetCode 官方用來做 E2E 測試的標記，不太會改

---

### 5️⃣ **手動觸發功能** (第 61-67 行)
```javascript
window.leetcommitManualTrigger = function() {
    console.log('[LeetCommit] 🔧 Manual trigger activated!');
    extractAndSend();
};

console.log('[LeetCommit] 💡 Tip: You can manually trigger sync by running: leetcommitManualTrigger()');
```

**作用**: 測試用，不需要真的 AC 就能觸發
- 在 Console 執行 `leetcommitManualTrigger()` 即可測試
- 方便開發和 debug

---

### 6️⃣ **提取資料並發送** (第 69-117 行)
```javascript
function extractAndSend() {
    // 1. 從 URL 提取 slug
    const url = window.location.href;  // https://leetcode.com/problems/two-sum/
    const slug = url.split('/problems/')[1]?.split('/')[0];  // "two-sum"
    
    // 2. 提取標題
    const title = document.querySelector('[data-cy="question-title"]')?.innerText;
    
    // 3. 提取描述
    const description = extractDescription();
    
    // 4. 提取代碼
    const code = extractCode();
    
    // 5. 提取難度和標籤
    const difficulty = document.querySelector('[diff]')?.innerText || "Medium";
    const tags = Array.from(document.querySelectorAll('.topic-tag')).map(t => t.innerText);
    
    // 6. 組裝 payload
    const payload = {
        type: 'SUBMISSION_ACCEPTED',
        data: { slug, title, description, code, difficulty, tags, language: 'unknown', timestamp: Date.now() }
    };
    
    // 7. 發送給 background script
    chrome.runtime.sendMessage(payload, (response) => {
        if (chrome.runtime.lastError) {
            console.error('[LeetCommit] Error:', chrome.runtime.lastError);
        } else {
            console.log('[LeetCommit] Message sent successfully');
        }
    });
}
```

**關鍵點**:
- `chrome.runtime.sendMessage()`: 從 content script 發送訊息給 background script
- Background script 會接收這個 payload 並推送到 GitHub
- 使用 `?.` 可選鏈操作符，避免元素不存在時報錯

**提取的資料**:
- `slug`: 題目的 URL 標識（如 "two-sum"）
- `title`: 題目標題
- `description`: 題目描述（HTML 格式）
- `code`: 你的解答代碼
- `difficulty`: 難度（Easy/Medium/Hard）
- `tags`: 標籤（如 Array, Hash Table）

---

### 7️⃣ **提取代碼** (第 119-133 行)
```javascript
function extractCode() {
    // Try to find the Monaco editor text
    const lines = document.querySelectorAll('.view-lines .view-line');
    if (lines.length > 0) {
        return Array.from(lines).map(line => {
            return line.textContent;
        }).join('\n');
    }
    
    return "// Code extraction failed. Please copy manually if needed.";
}
```

**挑戰**: LeetCode 使用 Monaco Editor（VS Code 的編輯器）
- 代碼不是存在 `<textarea>` 裡
- 而是渲染成一堆 `<div>` 元素
- 我們嘗試從 `.view-line` 元素提取文字

**限制**: 
- 這個方法不完美（可能丟失部分縮排）
- Monaco Editor 的 DOM 結構複雜，完整提取需要更深入的處理
- 更好的方法是從提交結果頁面抓取（那裡有完整代碼）

**改進方向**:
- 可以嘗試訪問 Monaco Editor 的 API
- 或者從提交歷史頁面抓取已提交的代碼

---

### 8️⃣ **提取描述** (第 135-146 行)
```javascript
function extractDescription() {
    const metaDescription = document.querySelector('meta[name="description"]')?.content;
    const contentNode = document.querySelector('[data-track-load="description_content"]');
    
    if (contentNode) {
        // Simple HTML to Markdown could go here, or just save HTML
        // For now, return HTML content to be saved as README.md (GitHub renders it)
        return contentNode.innerHTML;
    }
    
    return metaDescription || "No description found.";
}
```

**策略**:
1. 優先從題目描述區域提取完整 HTML
2. 如果找不到，使用頁面的 meta description（簡短版本）
3. 都沒有就返回預設訊息

**為什麼存 HTML？**
- GitHub 可以渲染 HTML
- 保留了題目的格式（粗體、列表、代碼塊等）
- 如果需要 Markdown，可以用工具轉換

---

## 🔄 完整流程圖

```
用戶提交代碼
    ↓
LeetCode 顯示結果（DOM 變化）
    ↓
MutationObserver 檢測到變化
    ↓
等待 1.5 秒（debounce）
    ↓
checkForSuccess() 執行
    ↓
找到 <span data-e2e-locator="submission-result">Accepted</span>
    ↓
extractAndSend() 執行
    ↓
提取: slug, title, code, description, difficulty, tags
    ↓
chrome.runtime.sendMessage() 發送給 background
    ↓
background/github_client.js 接收
    ↓
推送到 GitHub
```

---

## 💡 關鍵技術點

### 1. **MutationObserver**
- 監聽 SPA 的動態變化
- 不需要輪詢（polling），效能更好
- 可以精確知道 DOM 何時改變

### 2. **Debounce**
- 避免過度檢查，提升效能
- 在 DOM 頻繁變化時特別重要
- 1.5 秒的延遲確保結果已完全渲染

### 3. **DOM Scraping**
- 從頁面提取資料
- 選擇器可能會隨 LeetCode 更新而變化
- 使用 `data-e2e-locator` 等相對穩定的屬性

### 4. **Chrome Extension Messaging**
- Content Script 運行在網頁環境
- Background Script 運行在擴展環境
- 需要通過 `chrome.runtime.sendMessage()` 通訊

### 5. **錯誤處理**
- 使用 `?.` 可選鏈，避免元素不存在時崩潰
- 提供預設值（如 difficulty 預設為 "Medium"）
- 檢查 `chrome.runtime.lastError` 確保訊息發送成功

---

## 🐛 常見問題

### Q1: 為什麼有時候沒有觸發？
**A**: 可能的原因：
1. LeetCode 更新了 DOM 結構，選擇器失效
2. Debounce 時間太短，結果還沒渲染完
3. 網路延遲，結果出現較慢

**解決方法**:
- 檢查 Console 的 debug log
- 使用 `leetcommitManualTrigger()` 手動測試
- 調整 debounce 時間（目前是 1.5 秒）

### Q2: 代碼提取不完整怎麼辦？
**A**: Monaco Editor 的提取確實有限制
- 可以手動複製代碼後再提交
- 或者從 LeetCode 的提交歷史頁面抓取
- 未來可以改進提取邏輯

### Q3: 如何 debug？
**A**: 
1. 打開 LeetCode 頁面的 Console（F12）
2. 看是否有 `[LeetCommit] Content script loaded`
3. 每 10 次檢查會輸出 debug 資訊
4. 使用 `leetcommitManualTrigger()` 手動觸發

---

## 🔧 可能的改進

1. **更好的代碼提取**
   - 嘗試訪問 Monaco Editor 的內部 API
   - 或從提交詳情頁面抓取

2. **語言檢測**
   - 目前 `language: 'unknown'`
   - 可以從 UI 的語言選擇器提取

3. **更智能的檢測**
   - 支援其他狀態（如 Wrong Answer 時也記錄）
   - 檢測測試用例通過數量

4. **錯誤恢復**
   - 如果提取失敗，提示用戶手動輸入
   - 或者重試機制

---

## 📚 相關資源

- [MutationObserver MDN](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
- [Chrome Extension Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- [Chrome Extension Messaging](https://developer.chrome.com/docs/extensions/mv3/messaging/)
