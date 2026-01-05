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
