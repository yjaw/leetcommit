// LeetCode Observer - 專門處理 LeetCode 平台的提交檢測
// -----------------------------------------------------------------------------------------------------
console.log('[LeetCommit] Content script loaded 2');

let isWaitingForResult = false;
let observer = null;
let timeoutId = null;
let debugMode = true;
let TIMEOUT = 15000; // 15 seconds

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

        // LeetCode Submit button detection
        const isSubmitButton =
            target.textContent?.trim() === 'Submit' ||
            target.closest('button')?.textContent?.trim() === 'Submit';

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

    // 記錄當前的分數（如果有的話）
    const findCurrentScore = () => {
        const spanElements = Array.from(document.querySelectorAll('span')).filter(el => {
            const text = el.textContent?.trim() || '';
            return text.match(/^\d+\s*\/\s*\d+\s*$/);
        });
        return spanElements.length > 0 ? spanElements[0].textContent?.trim() : null;
    };

    const initialScore = findCurrentScore();
    console.log('[LeetCommit] 📝 Initial score:', initialScore || 'null (no element yet)');

    observer = new MutationObserver(() => {
        if (debugMode) console.log('[LeetCommit] 🔔 DOM changed, checking for result...');

        if (!isWaitingForResult) {
            if (debugMode) console.log('[LeetCommit] ⏭️ Not waiting for result, skipping');
            return;
        }

        // Find span elements with "XX / XX" format
        const spanElements = Array.from(document.querySelectorAll('span')).filter(el => {
            const text = el.textContent?.trim() || '';
            return text.match(/^\d+\s*\/\s*\d+\s*$/);
        });

        if (spanElements.length > 0) {
            const element = spanElements[0];
            const currentScore = element.textContent?.trim() || '';

            // 檢查是否是舊分數
            if (currentScore === initialScore) {
                if (debugMode) console.log('[LeetCommit] ⏭️ Skipping old score:', currentScore);
                return;
            }

            if (debugMode) console.log('[LeetCommit] 🎉 New score detected!');
            if (debugMode) console.log('[LeetCommit]    Initial:', initialScore);
            if (debugMode) console.log('[LeetCommit]    Current:', currentScore);

            // Parse "XX / XX" format
            const match = currentScore.match(/(\d+)\s*\/\s*(\d+)/);

            if (match) {
                const passed = parseInt(match[1], 10);
                const total = parseInt(match[2], 10);

                console.log(`[LeetCommit] LeetCode test results: ${passed}/${total}`);

                // Only trigger on 100% pass
                if (passed === total && total > 0) {
                    console.log('[LeetCommit] ✅ LeetCode 100% testcases passed! Gathering data...');
                    stopWatching();
                    extractAndSend();
                    return;
                } else {
                    console.log(`[LeetCommit] ❌ LeetCode testcases not fully passed (${passed}/${total})`);
                    stopWatching();
                }
            } else {
                console.error('[LeetCommit] Could not parse result format. Text:', currentScore);
            }
        } else {
            if (debugMode) console.log('[LeetCommit] ⏳ Not found test result element yet');
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log('[LeetCommit] Observer started (waiting for result)');
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
    if (observer) {
        observer.disconnect();
    }
    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
    }
}

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

    const difficulty = extractDifficulty();
    console.log('[LeetCommit] Difficulty:', difficulty);

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
            language,
            timestamp: Date.now(),
            problemUrl: simplifiedUrl,
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

function extractTitle() {
    // Try multiple selectors for title
    const selectors = [
        'a[href*="/problems/"]',
        'div[class*="title"]',
        'h1',
        'h2'
    ];

    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent) {
            const title = element.textContent.trim();
            // Remove problem number if present (e.g., "1. Two Sum" -> "Two Sum")
            const cleanTitle = title.replace(/^\d+\.\s*/, '');
            if (cleanTitle) {
                console.log('[LeetCommit] Extracted title:', cleanTitle);
                return cleanTitle;
            }
        }
    }

    console.warn('[LeetCommit] Could not extract title, using slug');
    const slug = window.location.href.split('/problems/')[1]?.split('/')[0];
    return slug || 'Unknown Problem';
}

function extractDifficulty() {
    // Try to find difficulty indicator
    const selectors = [
        'div[class*="difficulty"]',
        'span[class*="difficulty"]',
        'div[diff-easy]',
        'div[diff-medium]',
        'div[diff-hard]'
    ];

    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            const text = element.textContent?.trim().toLowerCase();
            if (text?.includes('easy')) return 'Easy';
            if (text?.includes('medium')) return 'Medium';
            if (text?.includes('hard')) return 'Hard';
        }
    }

    console.warn('[LeetCommit] Could not extract difficulty');
    return 'Unknown';
}

function extractCode() {
    // Try to find code editor
    const codeSelectors = [
        '.monaco-editor textarea',
        'textarea[class*="code"]',
        'div[class*="CodeMirror"]',
        'pre code'
    ];

    for (const selector of codeSelectors) {
        const element = document.querySelector(selector);
        if (element) {
            let code = '';
            if (element.tagName === 'TEXTAREA') {
                code = element.value;
            } else {
                code = element.textContent;
            }

            if (code && code.trim()) {
                console.log('[LeetCommit] Extracted code, length:', code.length);
                return code.trim();
            }
        }
    }

    console.error('[LeetCommit] Could not extract code');
    return '// Code extraction failed';
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
