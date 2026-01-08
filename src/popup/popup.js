document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('saveBtn').addEventListener('click', saveOptions);
document.getElementById('statusCard').addEventListener('click', () => toggleView('config'));
document.getElementById('backBtn').addEventListener('click', () => toggleView('main'));
document.getElementById('viewReviewsBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/options/review.html') });
});

function toggleView(view) {
    const mainView = document.getElementById('mainView');
    const configView = document.getElementById('configView');

    if (view === 'config') {
        mainView.style.display = 'none';
        configView.style.display = 'block';
    } else {
        mainView.style.display = 'block';
        configView.style.display = 'none';
        restoreOptions(); // Refresh status on main view
    }
}

function restoreOptions() {
    chrome.storage.sync.get(
        { githubPat: '', githubRepo: '' },
        (items) => {
            document.getElementById('githubPat').value = items.githubPat;
            document.getElementById('githubRepo').value = items.githubRepo;

            updateStatusDisplay(items.githubPat, items.githubRepo);
        }
    );

    // 檢測當前平台
    detectCurrentPlatform();

    // 檢查是否有待評級的題目
    checkPendingRating();
}

function detectCurrentPlatform() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const platformDisplay = document.getElementById('platformDisplay');

        if (!tabs || tabs.length === 0) {
            platformDisplay.innerHTML = '🤔 Unable to detect current tab';
            return;
        }

        const url = tabs[0].url || '';

        if (url.includes('leetcode.com') || url.includes('leetcode.cn')) {
            if (url.includes('/problems/')) {
                platformDisplay.innerHTML = '<span style="color: #FFA116;">▶</span> <strong>LeetCode</strong> - Ready to sync!';
                platformDisplay.style.color = 'var(--success)';
            } else {
                platformDisplay.innerHTML = '<span style="color: #FFA116;">▶</span> LeetCode - Navigate to a problem page';
                platformDisplay.style.color = 'var(--text-muted)';
            }
        } else if (url.includes('neetcode.io')) {
            if (url.includes('/problems/')) {
                platformDisplay.innerHTML = '🚀 <strong>NeetCode</strong> - Ready to sync!';
                platformDisplay.style.color = 'var(--success)';
            } else {
                platformDisplay.innerHTML = '🚀 NeetCode - Navigate to a problem page';
                platformDisplay.style.color = 'var(--text-muted)';
            }
        } else {
            // 不在任何支援的平台上
            platformDisplay.innerHTML = '⏰ <strong>Time to practice!</strong><br><span style="font-size: 12px; color: var(--text-muted);">Visit LeetCode or NeetCode to start solving problems</span>';
            platformDisplay.style.color = 'var(--primary)';
        }
    });
}

function updateStatusDisplay(pat, repo) {
    const indicator = document.getElementById('connectionStatus');
    const statusTitle = document.getElementById('statusTitle');
    const repoDisplay = document.getElementById('repoDisplay');

    if (pat && repo) {
        indicator.className = 'connection-indicator connected';
        statusTitle.textContent = 'Connected';
        repoDisplay.textContent = repo;
    } else {
        indicator.className = 'connection-indicator disconnected';
        statusTitle.textContent = 'Not Connected';
        repoDisplay.textContent = 'Configure GitHub to start syncing';
    }
}

async function saveOptions() {
    const pat = document.getElementById('githubPat').value.trim();
    const repo = document.getElementById('githubRepo').value.trim();
    const btn = document.getElementById('saveBtn');

    if (!pat || !repo) {
        showStatus('Please fill in all fields.', 'error');
        return;
    }

    if (repo.split('/').length !== 2) {
        showStatus('Format: username/repo', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Verifying...';

    try {
        const response = await fetch(`https://api.github.com/repos/${repo}`, {
            headers: {
                'Authorization': `token ${pat}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (!data.permissions || !data.permissions.push) {
                throw new Error('No write access to this repo.');
            }

            chrome.storage.sync.set(
                { githubPat: pat, githubRepo: repo },
                () => {
                    showStatus('Connected successfully!', 'success');
                    setTimeout(() => {
                        toggleView('main');
                        showStatus('', ''); // Clear status for next time
                    }, 1000);
                }
            );
        } else {
            const errorMap = { 401: 'Invalid Token.', 404: 'Repo not found.' };
            throw new Error(errorMap[response.status] || `API Error: ${response.status}`);
        }
    } catch (err) {
        showStatus(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Connect GitHub';
    }
}

function showStatus(msg, type) {
    const status = document.getElementById('statusMsg');
    status.textContent = msg;
    status.className = `status ${type}`;
}

async function checkPendingRating() {
    // 從 reviews 中找出所有未評級的題目
    const data = await chrome.storage.sync.get('reviews');
    const reviews = data.reviews || {};

    // 找出所有未評級的題目
    const unratedProblems = Object.values(reviews).filter(review => !review.userDifficulty);

    if (unratedProblems.length === 0) {
        return;
    }

    // 按照添加時間排序，最新的在前面 (FILO - First In Last Out / Stack)
    unratedProblems.sort((a, b) => b.addedAt - a.addedAt);

    // 取最新的一個（stack 的 top）
    const currentProblem = unratedProblems[0];

    // 重新渲染 platformCard 為難度選擇 UI
    const platformCard = document.getElementById('platformCard');
    platformCard.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: var(--primary);">
                ✅ Rate this problem
            </div>
            <div style="font-size: 15px; margin-bottom: 8px; color: var(--text);">
                ${currentProblem.title || currentProblem.slug}
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
                ${unratedProblems.length} problem${unratedProblems.length > 1 ? 's' : ''} waiting for rating
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="difficulty-btn easy-btn" onclick="handleDifficultySelection('${currentProblem.slug}', 'easy')">
                    😊 Easy
                </button>
                <button class="difficulty-btn medium-btn" onclick="handleDifficultySelection('${currentProblem.slug}', 'medium')">
                    🤔 Medium
                </button>
                <button class="difficulty-btn hard-btn" onclick="handleDifficultySelection('${currentProblem.slug}', 'hard')">
                    😰 Hard
                </button>
            </div>
        </div>
    `;
}

async function handleDifficultySelection(slug, difficulty) {
    console.log('[LeetCommit] User selected difficulty:', difficulty, 'for', slug);

    // 保存難度到 reviews
    const data = await chrome.storage.sync.get('reviews');
    const reviews = data.reviews || {};

    if (reviews[slug]) {
        reviews[slug].userDifficulty = difficulty;
        reviews[slug].ratedAt = Date.now();
        await chrome.storage.sync.set({ reviews });
    }

    // 檢查是否還有其他未評級的題目（繼續處理 stack）
    checkPendingRating();
}

// 將函數暴露到全域，讓 onclick 可以調用
window.handleDifficultySelection = handleDifficultySelection;
