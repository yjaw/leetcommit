# Privacy Policy for LeetCommit

**Last updated: January 5, 2026**

## Overview

LeetCommit is committed to protecting your privacy. This privacy policy explains how our Chrome extension handles your data.

## Data Collection

**LeetCommit does NOT collect, store, or transmit any personal data to external servers.**

All data processing happens locally on your device.

## What Data is Stored Locally

The following data is stored locally in your browser using Chrome's storage API:

1. **GitHub Personal Access Token**
   - Stored in: Chrome sync storage
   - Purpose: To authenticate with GitHub API for syncing your solutions
   - Access: Only accessible by you and the extension

2. **GitHub Repository Name**
   - Stored in: Chrome sync storage
   - Purpose: To know where to sync your solutions
   - Format: `username/repository`

3. **Review Schedule**
   - Stored in: Chrome sync storage
   - Purpose: To track your spaced repetition review schedule
   - Contains: Problem slugs, titles, and review timestamps

## Third-Party Services

LeetCommit interacts with the following third-party services:

### GitHub API
- **Purpose**: To sync your code solutions to your GitHub repository
- **Data Sent**: Code solutions, problem descriptions, file paths
- **Authorization**: Uses your Personal Access Token
- **Privacy**: Data goes directly to YOUR GitHub repository

### LeetCode / NeetCode
- **Purpose**: To detect successful problem submissions
- **Data Collected**: Read-only access to submission results
- **No Data Sent**: We only READ from these platforms, never write

## Data Sharing

**We do NOT share any data with third parties.**

All data flows:
- Your browser → Your GitHub repository (direct)
- LeetCode/NeetCode → Your browser (read-only)

There are NO intermediate servers or analytics services.

## Permissions

LeetCommit requests the following permissions:

- `storage`: To save your GitHub credentials and review schedule locally
- `activeTab`: To detect which platform you're on
- `scripting`: To inject content scripts for detecting submissions
- `host_permissions`: To access LeetCode, NeetCode, and GitHub API

## Data Security

- Your GitHub token is stored using Chrome's secure storage API
- All communication with GitHub uses HTTPS
- No data is logged or transmitted to any external servers

## Your Rights

You have full control over your data:

- **Access**: All data is stored locally and accessible to you
- **Delete**: Uninstalling the extension removes all stored data
- **Export**: Your data is synced to your own GitHub repository

## Children's Privacy

LeetCommit does not knowingly collect data from children under 13. The extension is designed for developers and students learning to code.

## Changes to This Policy

We may update this privacy policy from time to time. We will notify users of any changes by updating the "Last updated" date.

## Open Source

LeetCommit is open source. You can review the code at:
https://github.com/yjaw/leetcommit

## Contact

If you have questions about this privacy policy, please:
- Open an issue on our GitHub repository
- Email: [Your Email]

## Consent

By using LeetCommit, you consent to this privacy policy.
