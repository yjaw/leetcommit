// LeetCommit Content Script

console.log('[LeetCommit] [LC] Content script loaded');

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
    // 使用事件委派監聽整個 document
    document.addEventListener('click', (event) => {
        const target = event.target;

        // 檢查是否點擊了 Submit 按鈕
        // LeetCode 的 Submit 按鈕可能有不同的結構，這裡檢查多種可能
        const isSubmitButton =
            target.textContent?.trim() === 'Submit' ||
            target.closest('button')?.textContent?.trim() === 'Submit';

        if (isSubmitButton) {
            console.log('[LeetCommit] 🚀 Submit button clicked! Starting to watch for result...');
            isWaitingForResult = true;
            startWatchingForResult();
        }
    }, true); // 使用捕獲階段確保能捕捉到事件
}

// 開始監聽提交結果
function startWatchingForResult() {
    // 清除之前的 timeout
    if (timeoutId) {
        clearTimeout(timeoutId);
    }

    if (observer) {
        observer.disconnect(); // 先斷開舊的 observer
    }

    console.log('[LeetCommit] ⏳ Waiting 3 seconds before starting detection...');

    // 等待 3 秒後再開始監聽（讓 LeetCode 有時間處理提交）
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

        console.log('[LeetCommit] Observer started (after 3s delay)');

        // 10 秒後自動停止監聽（從現在開始計算）
        timeoutId = setTimeout(() => {
            if (isWaitingForResult) {
                console.log('[LeetCommit] ⏱️ Timeout (10s) - stopping observer, waiting for next submit...');
                stopWatching();
            }
        }, 10000); // 10 秒後自動停止監聽
    }, 3000); // 等待 3 秒後再開始監聽
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
    // 尋找包含 "testcases passed" 的元素
    const testResultElements = Array.from(document.querySelectorAll('div')).filter(el =>
        el.textContent?.includes('testcases passed')
    );

    console.log('[LeetCommit debug] LeetCode found test result elements:', testResultElements.length);

    if (testResultElements.length === 0) {
        console.error('[LeetCommit] ❌ LeetCode: Could not find "testcases passed" element. DOM structure may have changed.');
        return;
    }

    for (const element of testResultElements) {
        const text = element.textContent?.trim() || '';
        console.log('[LeetCommit debug] Checking text:', text);

        // 解析 "X / Y testcases passed" 格式
        // 例如: "47 / 63 testcases passed" 或 "63 / 63 testcases passed"
        const match = text.match(/(\d+)\s*\/\s*(\d+)\s*testcases passed/);

        if (match) {
            const passed = parseInt(match[1], 10);
            const total = parseInt(match[2], 10);
            const percentage = total > 0 ? (passed / total) * 100 : 0;

            console.log(`[LeetCommit debug] LeetCode test results: ${passed}/${total} (${percentage.toFixed(1)}%)`);

            // 只有 100% 通過才觸發
            if (percentage === 100 && total > 0) {
                console.log('[LeetCommit] ✅ LeetCode 100% testcases passed! Gathering data...');
                stopWatching();
                console.log('[LeetCommit] Observer stopped (success), ready for next submit');
                extractAndSend();
                return;
            } else {
                console.log(`[LeetCommit] ⏳ LeetCode testcases not fully passed yet (${percentage.toFixed(1)}%)`);
            }
        } else {
            console.error('[LeetCommit] ❌ LeetCode: Found "testcases passed" but could not parse the format. Text:', text);
        }
    }
}

// 初始化
setupSubmitButtonListener();
console.log('[LeetCommit] Submit button listener ready');

// 加入手動觸發功能（用於測試）
window.leetcommitManualTrigger = function () {
    console.log('[LeetCommit] 🔧 Manual trigger activated!');
    extractAndSend();
};

console.log('[LeetCommit] 💡 Tip: You can manually trigger sync by running: leetcommitManualTrigger()');

function extractAndSend() {
    console.log('[LeetCommit] extractAndSend called');
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
    const domain = urlObj.hostname; // e.g., "leetcode.com"
    const simplifiedUrl = `${domain}/problems/${slug}`; // e.g., "leetcode.com/problems/two-sum"
    console.log('[LeetCommit] Simplified URL:', simplifiedUrl);

    // 優先從標題區域的連結提取 (例如 "1. Two Sum")
    const titleElement = document.querySelector('.text-title-large a') ||
        document.querySelector('a[href*="/problems/"]') ||
        document.querySelector('[data-cy="question-title"]');
    console.log('[LeetCommit] Found title element:', titleElement);
    const title = titleElement?.innerText?.trim() || slug;
    console.log('[LeetCommit] Extracted title:', title);

    const description = extractDescription();
    console.log('[LeetCommit] Description length:', description.length);

    const code = extractCode();
    console.log('[LeetCommit] Code length:', code.length);
    console.log('[LeetCommit] Code preview:', code.substring(0, 100));

    // 改進：尋找所有 class 包含 "difficulty" 的元素，或直接尋找文字是 Easy/Medium/Hard 的 div
    const difficultyElement = Array.from(document.querySelectorAll('div, span')).find(el => {
        const className = el.className || "";
        const text = el.innerText?.trim();
        return (typeof className === 'string' && className.includes('text-difficulty-')) ||
            (text === 'Easy' || text === 'Medium' || text === 'Hard');
    });

    console.log('[LeetCommit] Found difficulty element:', difficultyElement);
    const difficulty = difficultyElement?.innerText?.trim() || "Unknown";

    const tags = Array.from(document.querySelectorAll('.topic-tag')).map(t => t.innerText);
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
            problemUrl: simplifiedUrl,  // 加入簡化的 URL
            platform: 'LeetCode'
        }
    };

    console.log('[LeetCommit] Sending payload:', payload);
    chrome.runtime.sendMessage(payload, (response) => {
        if (chrome.runtime.lastError) {
            console.error('[LeetCommit] Error sending message:', chrome.runtime.lastError);
        } else {
            console.log('[LeetCommit] Message sent successfully, response:', response);
        }
    });
}

function extractCode() {
    // Try to find the Monaco editor text
    // The editor usually has lines in .view-lines
    const lines = document.querySelectorAll('.view-lines .view-line');
    if (lines.length > 0) {
        return Array.from(lines).map(line => {
            // preserve indentation often found in &nbsp; or spans
            return line.textContent; // This is a rough approximation, real Monaco parsing is harder from outside
        }).join('\n');
    }

    // Method 2: Look for clipboard copy button data (sometimes stored in attributes)
    // Method 3: 'code' tag if readable view
    return "// Code extraction failed. Please copy manually if needed.";
}

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

function extractLanguage() {
    const languageButtons = document.querySelectorAll('button[aria-haspopup="dialog"]');
    console.log('[LeetCommit] Found buttons:', languageButtons.length);

    const knownLanguages = [
        'Python', 'Python3', 'Java', 'C++', 'C', 'C#',
        'JavaScript', 'TypeScript', 'Ruby', 'Swift',
        'Go', 'Scala', 'Kotlin', 'Rust', 'PHP', 'Dart',
        'MySQL', 'PostgreSQL', 'Oracle', 'Pandas', 'MongoDB',
        'Elixir', 'Erlang', 'Haskell', 'R', 'Racket'
    ];

    for (const button of languageButtons) {
        // 方法 1: 從文字節點提取
        const textNode = Array.from(button.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
        let candidateText = '';

        if (textNode) {
            candidateText = textNode.textContent?.trim() || '';
        } else {
            // 方法 2: 從完整文字提取
            const fullText = button.textContent?.trim() || '';
            candidateText = fullText.split(/[\n\s]+/)[0]?.trim() || '';
        }

        console.log('[LeetCommit] Checking button text:', candidateText);

        // 檢查是否匹配已知語言
        for (const lang of knownLanguages) {
            if (candidateText.toLowerCase() === lang.toLowerCase() ||
                candidateText.toLowerCase().includes(lang.toLowerCase())) {
                console.log('[LeetCommit] Found language:', candidateText);
                return candidateText;
            }
        }
    }

    console.log('[LeetCommit] Could not detect language, using "unknown"');
    return 'unknown';
}
