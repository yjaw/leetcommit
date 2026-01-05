# 🚀 LeetCommit

> Automatically sync your LeetCode & NeetCode solutions to GitHub with a built-in spaced repetition review system.

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue)](https://chrome.google.com/webstore)
[![Version](https://img.shields.io/badge/version-1.0.0-green)](https://github.com/yjaw/leetcommit)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## ✨ Features

### 📊 Multi-Platform Support
- ✅ **LeetCode** (leetcode.com, leetcode.cn)
- ✅ **NeetCode** (neetcode.io)
- 🔜 More platforms coming soon!

### 🔄 Automatic Sync
- Detects successful submissions automatically (100% test cases passed)
- Syncs code and problem descriptions to GitHub
- Creates organized folder structure (`problem-slug/`)
- Preserves all metadata (difficulty, tags, language, platform)
- Smart README updates (skips if difficulty unknown and folder exists)

### 📚 Spaced Repetition System
- Built-in review scheduler
- Helps you retain problem-solving patterns
- Smart intervals based on SuperMemo SM-2 algorithm

### 🎯 Smart Features
- Only syncs 100% passed solutions
- 3-second delay before detection (avoids false positives)
- Badge notification for sync status (✓ success, ✗ error)
- Platform detection in popup
- Minimal permissions required

## 🔧 Installation

### From Chrome Web Store (Recommended)
1. Visit the [Chrome Web Store](#) (link coming soon)
2. Click "Add to Chrome"
3. Follow the setup instructions

### From Source (Development)
1. Clone this repository:
   ```bash
   git clone https://github.com/yjaw/leetcommit.git
   cd leetcommit
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in top right)

4. Click "Load unpacked" and select the `leetcommit` folder

## ⚙️ Setup (2 minutes)

### 1. Get GitHub Personal Access Token

1. Go to [GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a name (e.g., "LeetCommit")
4. Select scope: **`repo`** (Full control of private repositories)
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)

### 2. Configure Extension

1. Click the LeetCommit icon in your Chrome toolbar
2. Click on the status card to open settings
3. Paste your GitHub Personal Access Token
4. Enter your repository name (format: `username/repo`)
5. Click "Connect GitHub"

### 3. Start Coding!

1. Go to LeetCode or NeetCode
2. Solve a problem
3. Submit your solution
4. Wait for 100% test cases to pass
5. See the green ✓ badge on the extension icon
6. Check your GitHub repo!

## 📁 Repository Structure

Your GitHub repository will be organized like this:

```
your-repo/
├── two-sum/
│   ├── README.md          # Problem description with badges
│   └── two-sum.py         # Your solution
├── add-two-numbers/
│   ├── README.md
│   └── add-two-numbers.js
└── ...
```

### README.md Example

```markdown
# [1. Two Sum](https://leetcode.com/problems/two-sum/)

![LeetCode](https://img.shields.io/badge/LeetCode-grey) ![Easy](https://img.shields.io/badge/Easy-brightgreen)

Given an array of integers nums and an integer target...
```

## 🎮 Usage

### Automatic Sync
Just solve problems normally! The extension will:
1. Detect when you click "Submit"
2. Wait 3 seconds
3. Check if 100% test cases passed
4. Sync to GitHub automatically
5. Show a badge (✓ or ✗) for 5 seconds

### Manual Trigger (for testing)
Open the browser console on a problem page and run:
```javascript
leetcommitManualTrigger()
```

### Review System
1. Click "View Reviews" in the popup
2. See your scheduled reviews
3. Click on a problem to review it
4. Rate your recall (Easy/Good/Hard)
5. System adjusts next review interval

## 🔍 Debugging

See [DEBUG.md](DEBUG.md) for detailed debugging instructions.

Quick tips:
- **Content Script Console**: Right-click page → Inspect → Console
- **Service Worker Console**: chrome://extensions → LeetCommit → Service worker
- **Popup Console**: Right-click popup → Inspect

## 🏗️ Architecture

### Content Scripts
- `submission_observer_lc.js` - LeetCode detection
- `submission_observer_nc.js` - NeetCode detection

### Background Service Worker
- `github_client.js` - GitHub API integration, sync logic

### Popup
- `popup.html/js` - Configuration UI

### Options Page
- `review.html/js` - Spaced repetition review system

See [docs/multi_platform_architecture.md](docs/multi_platform_architecture.md) for more details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a PR

### Adding a New Platform
See [docs/multi_platform_architecture.md](docs/multi_platform_architecture.md) for instructions.

## 📝 Privacy

LeetCommit respects your privacy:
- ✅ No data collection
- ✅ No analytics
- ✅ No external servers
- ✅ All data stored locally
- ✅ Direct sync to YOUR GitHub

See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for full details.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the coding community's need for better solution tracking
- Built with love for interview preparation

## 📞 Support

- 🐛 **Bug Reports**: [Open an issue](https://github.com/yjaw/leetcommit/issues)
- 💡 **Feature Requests**: [Open an issue](https://github.com/yjaw/leetcommit/issues)
- 📧 **Email**: [Your Email]

## 🗺️ Roadmap

- [ ] Support for more platforms (HackerRank, CodeForces, etc.)
- [ ] Statistics dashboard
- [ ] Export to PDF
- [ ] Team collaboration features
- [ ] VS Code extension

---

**Made with ❤️ for the coding community**

⭐ Star this repo if you find it helpful!
