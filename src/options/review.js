// Review Page - 顯示所有保存的題目 metadata
document.addEventListener('DOMContentLoaded', () => {
    loadReviews();

    // 綁定清除按鈕
    document.getElementById('clearAllBtn').addEventListener('click', clearAllReviews);
});

async function loadReviews() {
    const data = await chrome.storage.sync.get('reviews');
    const reviews = data.reviews || {};

    const reviewList = document.getElementById('reviewList');
    const emptyState = document.getElementById('emptyState');

    // 清空列表
    reviewList.innerHTML = '';

    // 檢查是否有資料
    const reviewsArray = Object.values(reviews);

    if (reviewsArray.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    // 顯示每個 review
    reviewsArray.forEach(review => {
        const item = createReviewItem(review);
        reviewList.appendChild(item);
    });
}

function createReviewItem(review) {
    const div = document.createElement('div');
    div.className = 'review-item';

    // 格式化時間
    const addedDate = new Date(review.addedAt).toLocaleString();
    const nextReviewDate = new Date(review.nextReview).toLocaleString();

    div.innerHTML = `
        <div class="review-title">${review.title || review.slug}</div>
        <div class="review-meta">
            <div><strong>Slug:</strong> ${review.slug}</div>
            <div><strong>URL:</strong> ${review.problemUrl || 'N/A'}</div>
            <div><strong>Added:</strong> ${addedDate}</div>
            <div><strong>Next Review:</strong> ${nextReviewDate}</div>
            <div><strong>Interval:</strong> ${review.interval} day(s)</div>
            <div><strong>Repetitions:</strong> ${review.repetitions}</div>
        </div>
    `;

    return div;
}

async function clearAllReviews() {
    if (confirm('⚠️ Are you sure you want to clear ALL reviews?\n\nThis will delete all problem records and cannot be undone.\n\nThis is for debugging only.')) {
        await chrome.storage.sync.remove('reviews');
        console.log('[LeetCommit] All reviews cleared');

        // 重新載入列表
        loadReviews();
    }
}
