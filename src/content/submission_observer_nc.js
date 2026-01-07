// NeetCode Observer - 專門處理 NeetCode 平台的提交檢測
// -----------------------------------------------------------------------------------------------------
console.log('[LeetCommit] Content script loaded');

let isWaitingForResult = false;
let observer = null;
let timeoutId = null;
let previousResult = null;
let debugMode = false;
let TIMEOUT = 15000; // 15 seconds
let description = "Unknown";
let difficulty = "Unknown";
// listen for submit button
setupSubmitButtonListener();

// manual trigger enabled
window.syncIt = function () {
    console.log('[LeetCommit] 🔧 Manual trigger activated!');
    extractAndSend();
};
console.log('[LeetCommit] 💡 Tip: You can manually trigger sync by running: syncIt() in the console.');
// -----------------------------------------------------------------------------------------------------

// listen for submit button click
function setupSubmitButtonListener() {
    document.addEventListener('click', (event) => {
        const target = event.target;
        if (debugMode) console.log('[LeetCommit] Click detected on:', target.tagName, target.textContent?.trim().substring(0, 20));

        // NeetCode 的 Submit 按鈕檢測（可能需要根據實際 DOM 調整）
        const isSubmitButton =
            target.textContent?.trim() === 'Submit' ||
            target.textContent?.trim() === 'Run' ||
            target.closest('button')?.textContent?.includes('Submit');

        if (debugMode) console.log('[LeetCommit] Is submit button?', isSubmitButton);

        if (isSubmitButton) {
            console.log('[LeetCommit] 🚀 Submit button clicked! Starting to watch for result...');
            isWaitingForResult = true;
            startCheckingForResult();
        }
    }, true);

    console.log('[LeetCommit] listening for submit button click...');
}

// 開始監聽提交結果
function startCheckingForResult() {
    if (timeoutId) {
        clearTimeout(timeoutId);
    }
    if (observer) {
        observer.disconnect();
    }
    description = extractDescription();
    difficulty = extractDifficulty();

    observer = new MutationObserver(() => {
        if (debugMode) console.log('[LeetCommit] 🔔 DOM changed, checking for new element...');

        if (!isWaitingForResult) {
            if (debugMode) console.log('[LeetCommit] ⏭️ Not waiting for result, skipping');
            return;
        }
        // in NeetCode, the test result element always recreate after submit
        const elements = Array.from(document.querySelectorAll('p')).filter(el =>
            el.textContent?.includes('Passed test cases:')
        );

        if (elements.length > 0) {
            if (debugMode) console.log('[LeetCommit] 🎉 Test result element appeared! Found ' + elements.length + ' elements');
            for (const element of elements) {
                const text = element.textContent?.trim() || '';
                if (debugMode) console.log('[LeetCommit debug] Checking text:', text);

                // "Passed test cases: X / Y"
                const match = text.match(/Passed test cases:\s*(\d+)\s*\/\s*(\d+)/);

                if (match) {
                    const passed = parseInt(match[1], 10);
                    const total = parseInt(match[2], 10);
                    const percentage = total > 0 ? (passed / total) * 100 : 0;

                    // 只有 100% 通過才觸發
                    if (percentage === 100 && total > 0) {
                        console.log('[LeetCommit] ✅ NeetCode 100% tests passed! Gathering data...');
                        extractAndSend();
                        stopWatching();
                        return;
                    } else {
                        console.log(`[LeetCommit] ❌ NeetCode tests not fully passed yet (${percentage.toFixed(1)}%)`);
                        stopWatching();
                    }
                } else {
                    console.error('[LeetCommit] NeetCode: Found "Passed test cases:" but could not parse the format. Text:', text);
                }
            }
        }
        else {
            if (debugMode) console.log('[LeetCommit] ⏳ Not found test result element yet');
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log('[LeetCommit] Observer started (waiting for new element)');
    setupTimeout();
}

// 設置超時
function setupTimeout() {
    timeoutId = setTimeout(() => {
        if (isWaitingForResult) {
            console.log('[LeetCommit] ⏱️ Timeout (' + TIMEOUT + 'ms) - stopping observer');
            stopWatching();
        }
    }, TIMEOUT);
}

// 停止監聽
function stopWatching() {
    isWaitingForResult = false;
    difficulty = "Unknown"
    description = "Unknown"
    if (observer) {
        observer.disconnect();
    }
    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
    }
}

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

    const code = extractCode();
    console.log('[LeetCommit] Code length:', code.length);

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
            language: language,
            timestamp: Date.now(),
            platform: 'NeetCode',
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

function extractDifficulty() {
    // NeetCode 使用 Angular，難度按鈕：
    // <p _ngcontent-ng-c2556711974 class="button difficulty-btn is-warning">Medium</p>

    // 方法 1: 用 class 查找
    // <p class="button difficulty-btn is-warning">Medium</p>
    const difficultyElement =
        document.querySelector('.difficulty-btn.is-warning') ||   // Medium
        document.querySelector('.difficulty-btn.is-success') ||   // Easy
        document.querySelector('.difficulty-btn.is-danger') ||    // Hard
        document.querySelector('.difficulty-btn');                // 任何難度

    if (difficultyElement) {
        const text = difficultyElement.textContent?.trim();
        if (text === 'Easy' || text === 'Medium' || text === 'Hard') {
            console.log('[LeetCommit] Found difficulty:', text);
            return text;
        }
    }

    console.warn('[LeetCommit] Could not find difficulty');
    return 'Unknown';
}

function extractDescription() {
    // NeetCode 的問題描述在 app-article 中
    // <app-article><div class="my-article-component-container">...</div></app-article>
    const appArticle = document.querySelector('app-article');

    if (!appArticle) {
        console.warn('[LeetCommit] No app-article found');
        return "No description found.";
    }

    console.log('[LeetCommit] Found app-article:', appArticle);

    // 取內部的 .my-article-component-container（如果有的話）
    const container = appArticle.querySelector('.my-article-component-container');
    const content = container ? container.innerHTML : appArticle.innerHTML;

    console.log('[LeetCommit] Extracted description length:', content.length);
    return content;
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
