// LeetCommit Background Service Worker

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SUBMISSION_ACCEPTED') {
        handleSubmission(message.data);
        // Return true to indicate async response (if needed)
        return true;
    }
});

async function handleSubmission(data) {
    console.log('[LeetCommit] ======== 🚀 handleSubmission called ========');
    console.log('[LeetCommit] Received data:', data);

    try {
        const { githubPat, githubRepo } = await chrome.storage.sync.get(['githubPat', 'githubRepo']);

        console.log('[LeetCommit] Retrieved credentials:', {
            hasPat: !!githubPat,
            hasRepo: !!githubRepo,
            repo: githubRepo
        });

        if (!githubPat || !githubRepo) {
            console.warn('[LeetCommit] GitHub credentials not found. Please configure the extension.');
            return;
        }

        const folderName = data.slug;
        console.log('[LeetCommit] Processing submission for:', folderName);

        // 檢查資料夾是否已存在
        const folderExists = await checkFolderExists(githubPat, githubRepo, folderName);
        console.log('[LeetCommit] Folder exists:', folderExists);

        // 1. Create/Update README.md
        // 如果難度是 Unknown 且資料夾已存在，跳過 README 更新
        const shouldUpdateReadme = !(data.difficulty === 'Unknown' && folderExists);

        if (shouldUpdateReadme) {
            const readmePath = `${folderName}/README.md`;

            // 使用簡化的 URL (domain/problems/slug)，並加上 https:// 前綴
            const problemLink = data.problemUrl
                ? `https://${data.problemUrl}`
                : `https://leetcode.com/problems/${data.slug}/`;

            // 根據難度選擇顏色
            const difficultyColor = {
                'Easy': 'brightgreen',
                'Medium': 'orange',
                'Hard': 'red'
            }[data.difficulty] || 'grey';

            const platformText = data.platform || 'Unknown';
            const difficultyText = data.difficulty || 'Unknown';
            const platformBadge = `![${platformText}](https://img.shields.io/badge/${platformText}-grey)`;
            const difficultyBadge = `![${difficultyText}](https://img.shields.io/badge/${difficultyText}-${difficultyColor})`;

            const readmeContent = `
# [${data.title}](${problemLink})

${platformBadge} ${difficultyBadge}

${data.description}
`.trim();

            console.log('[LeetCommit] Pushing README to:', readmePath);
            await pushToGitHub(githubPat, githubRepo, readmePath, readmeContent, `[${data.platform}] Add problem: ${data.slug}`);
            console.log('[LeetCommit] README pushed successfully');
        } else {
            console.log('[LeetCommit] ⏭️ Skipping README update (difficulty unknown and folder exists)');
        }

        // 2. Create/Update Solution File
        const ext = detectExtension(data.language) || 'txt';
        const solutionPath = `${folderName}/${data.slug}.${ext}`;
        console.log('[LeetCommit] Pushing solution to:', solutionPath);
        await pushToGitHub(githubPat, githubRepo, solutionPath, data.code, `[${data.platform}] Add solution for ${data.slug}`);
        console.log('[LeetCommit] Solution pushed successfully');

        console.log('[LeetCommit] Sync complete!');

        // 3. Add to Review Schedule
        await addToReviewSchedule(data);

        // 4. Show success badge
        showSyncBadge('success');

    } catch (error) {
        console.error('[LeetCommit] Sync failed:', error);
        console.error('[LeetCommit] Error stack:', error.stack);

        // Show error badge
        showSyncBadge('error');
    }
}

async function pushToGitHub(token, repo, path, content, message) {
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
    console.log('[LeetCommit] pushToGitHub called for:', path);
    console.log('[LeetCommit] API URL:', apiUrl);

    // 1. Check if file exists to get SHA (for return updates)
    let sha = null;
    try {
        console.log('[LeetCommit] Checking if file exists...');
        const checkRes = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        console.log('[LeetCommit] Check response status:', checkRes.status);
        if (checkRes.ok) {
            const fileData = await checkRes.json();
            sha = fileData.sha;
            console.log('[LeetCommit] File exists, SHA:', sha);
        } else {
            console.log('[LeetCommit] File does not exist (will create new)');
        }
    } catch (e) {
        console.log('[LeetCommit] Error checking file existence:', e);
    }

    // 2. Create/Update
    const body = {
        message: message,
        content: btoa(unescape(encodeURIComponent(content))), // Handle Unicode properly in Base64
        sha: sha // Include SHA if updating
    };

    console.log('[LeetCommit] Sending PUT request with message:', message);
    const res = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    console.log('[LeetCommit] PUT response status:', res.status);
    if (!res.ok) {
        const err = await res.json();
        console.error('[LeetCommit] GitHub API Error Response:', err);
        throw new Error(`GitHub API Error: ${err.message}`);
    }

    const result = await res.json();
    console.log('[LeetCommit] Successfully pushed to GitHub:', result.content.path);
}

async function checkFolderExists(token, repo, folderName) {
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${folderName}`;
    console.log('[LeetCommit] Checking if folder exists:', apiUrl);

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            // 如果是陣列，表示是資料夾內容
            const exists = Array.isArray(data) && data.length > 0;
            console.log('[LeetCommit] Folder check result:', exists);
            return exists;
        } else {
            console.log('[LeetCommit] Folder does not exist (status:', response.status, ')');
            return false;
        }
    } catch (error) {
        console.error('[LeetCommit] Error checking folder existence:', error);
        return false;
    }
}

function detectExtension(lang) {
    const map = {
        'python': 'py',
        'python3': 'py',
        'java': 'java',
        'cpp': 'cpp',
        'c++': 'cpp',
        'javascript': 'js',
        'typescript': 'ts',
        'c': 'c',
        'c#': 'cs',
        'ruby': 'rb',
        'swift': 'swift',
        'go': 'go',
        'rust': 'rs',
        'scala': 'scala',
        'kotlin': 'kt'
    };
    return map[lang?.toLowerCase()];
}

async function addToReviewSchedule(data) {
    const { reviews } = await chrome.storage.sync.get('reviews');
    const reviewList = reviews || {};

    // Only add if not already present
    if (!reviewList[data.slug]) {
        reviewList[data.slug] = {
            slug: data.slug,
            title: data.title,
            addedAt: Date.now(),
            nextReview: Date.now() + (24 * 60 * 60 * 1000), // First review in 24 hours
            interval: 1,
            repetitions: 0,
            ef: 2.5
        };
        await chrome.storage.sync.set({ reviews: reviewList });
        console.log(`[LeetCommit] Added ${data.slug} to review schedule.`);
    }
}

function showSyncBadge(status) {
    if (status === 'success') {
        // 顯示綠色勾勾
        chrome.action.setBadgeText({ text: '✓' });
        chrome.action.setBadgeBackgroundColor({ color: '#10b981' }); // 綠色
        console.log('[LeetCommit] Badge set to success (✓)');
    } else if (status === 'error') {
        // 顯示紅色叉叉
        chrome.action.setBadgeText({ text: '✗' });
        chrome.action.setBadgeBackgroundColor({ color: '#ef4444' }); // 紅色
        console.log('[LeetCommit] Badge set to error (✗)');
    }

    // 3 秒後清除 badge
    setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
        console.log('[LeetCommit] Badge cleared');
    }, 3000);
}
