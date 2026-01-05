document.addEventListener('DOMContentLoaded', loadReviews);

async function loadReviews() {
    const data = await chrome.storage.sync.get('reviews');
    const reviews = data.reviews || {};
    const list = document.getElementById('reviewList');
    const empty = document.getElementById('emptyState');
    const now = Date.now();

    let dueCount = 0;
    let totalCount = 0;

    list.innerHTML = '';

    Object.values(reviews).forEach(item => {
        totalCount++;
        if (item.nextReview <= now) {
            dueCount++;
            const row = document.createElement('tr');
            row.innerHTML = `
        <td>
          <a href="https://leetcode.com/problems/${item.slug}" target="_blank" style="color:white;text-decoration:none">
            ${item.title || item.slug}
          </a>
        </td>
        <td>Now</td>
        <td class="actions">
          <button class="btn-hard" onclick="handleReview('${item.slug}', 3)">Hard</button>
          <button class="btn-good" onclick="handleReview('${item.slug}', 4)">Good</button>
          <button class="btn-easy" onclick="handleReview('${item.slug}', 5)">Easy</button>
        </td>
      `;
            list.appendChild(row);
        }
    });

    document.getElementById('dueCount').textContent = dueCount;
    document.getElementById('totalCount').textContent = totalCount;

    if (dueCount === 0) {
        empty.style.display = 'block';
        document.getElementById('reviewTable').style.display = 'none';
    } else {
        empty.style.display = 'none';
        document.getElementById('reviewTable').style.display = 'table';
    }
}

// Expose to window for onclick
window.handleReview = async (slug, grade) => {
    const data = await chrome.storage.sync.get('reviews');
    const reviews = data.reviews || {};
    const item = reviews[slug];

    if (item) {
        const updated = calculateNextReview(item, grade);
        reviews[slug] = updated;
        await chrome.storage.sync.set({ reviews });
        loadReviews(); // Refresh UI
    }
};

/**
 * SuperMemo 2 (SM-2) Algorithm
 * @param {Object} item - { interval (days), repetitions, ef (ease factor), nextReview (timestamp) }
 * @param {number} grade - 3 (Hard), 4 (Good), 5 (Easy)
 */
function calculateNextReview(item, grade) {
    let { interval, repetitions, ef } = item;

    // Defaults for new items if fields missing
    if (!interval) interval = 0;
    if (!repetitions) repetitions = 0;
    if (!ef) ef = 2.5;

    // Correctness assumed for grades >= 3
    if (grade >= 3) {
        if (repetitions === 0) {
            interval = 1;
        } else if (repetitions === 1) {
            interval = 6;
        } else {
            interval = Math.round(interval * ef);
        }
        repetitions++;
    } else {
        // Forgot
        repetitions = 0;
        interval = 1;
    }

    // Update Ease Factor
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    ef = ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
    if (ef < 1.3) ef = 1.3;

    const nextReview = Date.now() + (interval * 24 * 60 * 60 * 1000);

    return {
        ...item,
        interval,
        repetitions,
        ef,
        nextReview,
        lastReviewed: Date.now()
    };
}
