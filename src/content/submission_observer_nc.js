// NeetCode Observer - 專門處理 NeetCode 平台的提交檢測

console.log('[LeetCommit] [NC] Content script loaded');

let isWaitingForResult = false;
let observer = null;
let timeoutId = null;

// Debouncer
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

// 監聽 Submit 按鈕點擊
function setupSubmitButtonListener() {
    document.addEventListener('click', (event) => {
        const target = event.target;

        // NeetCode 的 Submit 按鈕檢測（可能需要根據實際 DOM 調整）
        const isSubmitButton =
            target.textContent?.trim() === 'Submit' ||
            target.textContent?.trim() === 'Run' ||
            target.closest('button')?.textContent?.includes('Submit');

        if (isSubmitButton) {
            console.log('[LeetCommit] 🚀 NeetCode Submit button clicked! Starting to watch for result...');
            isWaitingForResult = true;
            startWatchingForResult();
        }
    }, true);
}

// 開始監聽提交結果
function startWatchingForResult() {
    if (timeoutId) {
        clearTimeout(timeoutId);
    }

    if (observer) {
        observer.disconnect();
    }

    console.log('[LeetCommit] ⏳ Waiting 3 seconds before starting detection...');

    // 等待 3 秒後再開始監聽（讓 NeetCode 有時間處理提交）
    setTimeout(() => {
        if (!isWaitingForResult) return; // 如果已經停止等待，就不啟動

        observer = new MutationObserver(debounce(() => {
            if (isWaitingForResult) {
                checkForSuccess();
            }
        }, 1500));

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('[LeetCommit] NeetCode observer started (after 3s delay)');

        // 10 秒後自動停止監聽（從現在開始計算）
        timeoutId = setTimeout(() => {
            if (isWaitingForResult) {
                console.log('[LeetCommit] ⏱️ Timeout (10s) - stopping observer, waiting for next submit...');
                stopWatching();
            }
        }, 10000);
    }, 3000); 
}

// 停止監聽
function stopWatching() {
    isWaitingForResult = false;
    if (observer) {
        observer.disconnect();
    }
    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
    }
}

// 檢測成功提交 - 解析測試通過率
function checkForSuccess() {
    // 尋找包含 "Passed test cases:" 的元素
    const testResultElements = Array.from(document.querySelectorAll('p')).filter(el =>
        el.textContent?.includes('Passed test cases:')
    );

    console.log('[LeetCommit debug] NeetCode found test result elements:', testResultElements.length);

    if (testResultElements.length === 0) {
        console.error('[LeetCommit] ❌ NeetCode: Could not find "Passed test cases:" element. DOM structure may have changed.');
        return;
    }

    for (const element of testResultElements) {
        const text = element.textContent?.trim() || '';
        console.log('[LeetCommit debug] Checking text:', text);

        // 解析 "Passed test cases: X / Y" 格式
        // 例如: "Passed test cases: 23 / 23"
        const match = text.match(/Passed test cases:\s*(\d+)\s*\/\s*(\d+)/);

        if (match) {
            const passed = parseInt(match[1], 10);
            const total = parseInt(match[2], 10);
            const percentage = total > 0 ? (passed / total) * 100 : 0;

            console.log(`[LeetCommit debug] NeetCode test results: ${passed}/${total} (${percentage.toFixed(1)}%)`);

            // 只有 100% 通過才觸發
            if (percentage === 100 && total > 0) {
                console.log('[LeetCommit] ✅ NeetCode 100% tests passed! Gathering data...');
                stopWatching();
                extractAndSend();
                return;
            } else {
                console.log(`[LeetCommit] ⏳ NeetCode tests not fully passed yet (${percentage.toFixed(1)}%)`);
            }
        } else {
            console.error('[LeetCommit] ❌ NeetCode: Found "Passed test cases:" but could not parse the format. Text:', text);
        }
    }
}

// 初始化
setupSubmitButtonListener();
console.log('[LeetCommit] NeetCode Submit button listener ready');

// 手動觸發功能
window.leetcommitManualTrigger = function () {
    console.log('[LeetCommit] 🔧 NeetCode manual trigger activated!');
    extractAndSend();
};

console.log('[LeetCommit] 💡 Tip: You can manually trigger sync by running: leetcommitManualTrigger()');

function extractAndSend() {
    console.log('[LeetCommit] NeetCode extractAndSend called');
    const fullUrl = window.location.href;
    console.log('[LeetCommit] Current URL:', fullUrl);

    // 提取 slug
    const slug = fullUrl.split('/problems/')[1]?.split('/')[0];

    if (!slug) {
        console.error('[LeetCommit] Could not extract slug from URL');
        return;
    }
    console.log('[LeetCommit] Extracted slug:', slug);

    // 提取並格式化 URL: domain/problems/slug
    const urlObj = new URL(fullUrl);
    const domain = urlObj.hostname; // e.g., "neetcode.io"
    const simplifiedUrl = `${domain}/problems/${slug}`; // e.g., "neetcode.io/problems/two-sum"
    console.log('[LeetCommit] Simplified URL:', simplifiedUrl);

    // NeetCode 標題提取（需要根據實際 DOM 調整）
    const titleElement = document.querySelector('h1') ||
        document.querySelector('[class*="title"]') ||
        document.querySelector('[class*="problem-title"]');
    console.log('[LeetCommit] Found title element:', titleElement);
    const title = titleElement?.innerText?.trim() || slug;
    console.log('[LeetCommit] Extracted title:', title);

    const description = extractDescription();
    console.log('[LeetCommit] Description length:', description.length);

    const code = extractCode();
    console.log('[LeetCommit] Code length:', code.length);

    // 難度提取
    const difficultyElement = Array.from(document.querySelectorAll('div, span')).find(el => {
        const text = el.innerText?.trim();
        return text === 'Easy' || text === 'Medium' || text === 'Hard';
    });
    const difficulty = difficultyElement?.innerText?.trim() || "Unknown";

    // 標籤提取（需要根據實際 DOM 調整）
    const tags = Array.from(document.querySelectorAll('[class*="tag"]')).map(t => t.innerText);
    console.log('[LeetCommit] Difficulty:', difficulty, 'Tags:', tags);

    const language = extractLanguage();
    console.log('[LeetCommit] Language:', language);

    const payload = {
        type: 'SUBMISSION_ACCEPTED',
        data: {
            slug,
            title,
            description,
            code,
            difficulty,
            tags,
            language: language,
            timestamp: Date.now(),
            platform: 'NEETCODE',
            problemUrl: simplifiedUrl  // 使用簡化的 URL
        }
    };

    console.log('[LeetCommit] Sending NeetCode payload:', payload);
    chrome.runtime.sendMessage(payload, (response) => {
        if (chrome.runtime.lastError) {
            console.error('[LeetCommit] Error sending message:', chrome.runtime.lastError);
        } else {
            console.log('[LeetCommit] Message sent successfully, response:', response);
        }
    });
}

function extractCode() {
    // NeetCode 可能使用 Monaco 或其他編輯器
    const lines = document.querySelectorAll('.view-lines .view-line');
    if (lines.length > 0) {
        return Array.from(lines).map(line => line.textContent).join('\n');
    }

    // 備用方案
    const codeElement = document.querySelector('[class*="code-editor"]') ||
        document.querySelector('textarea[class*="code"]');

    if (codeElement) {
        return codeElement.value || codeElement.textContent;
    }

    return "// Code extraction failed. Please copy manually if needed.";
}

function extractDescription() {
    // NeetCode 的問題描述在 .my-article-component-container 中
    const descriptionElement = document.querySelector('.my-article-component-container') ||
        document.querySelector('[class*="description"]') ||
        document.querySelector('[class*="problem-content"]') ||
        document.querySelector('[class*="question-content"]');

    if (descriptionElement) {
        return descriptionElement.innerHTML;
    }

    return "No description found.";
}

function extractLanguage() {
    // NeetCode 的語言選擇器（需要根據實際 DOM 調整）
    const languageButtons = document.querySelectorAll('button[class*="language"]');

    const knownLanguages = [
        'Python', 'Python3', 'Java', 'C++', 'C', 'C#',
        'JavaScript', 'TypeScript', 'Ruby', 'Swift',
        'Go', 'Scala', 'Kotlin', 'Rust', 'PHP', 'Dart'
    ];

    for (const button of languageButtons) {
        const text = button.textContent?.trim() || '';
        for (const lang of knownLanguages) {
            if (text.toLowerCase().includes(lang.toLowerCase())) {
                console.log('[LeetCommit] Found language:', text);
                return text;
            }
        }
    }

    console.log('[LeetCommit] Could not detect language, using "unknown"');
    return 'unknown';
}
