# cc-sessions

<div align="center">

**A session bookmark manager for Claude Code**

*Browse and resume Claude Code sessions across all your projects. Bookmark important conversations, fork sessions to explore alternatives, and never lose context again.*

[![npm version](https://badge.fury.io/js/%40i-am-nio%2Fcc-sessions.svg)](https://www.npmjs.com/package/@i-am-nio/cc-sessions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)

<img src="https://raw.githubusercontent.com/i-am-nio/cc-sessions/main/screenshots/all%20sessions.png" alt="cc-sessions session browser" width="700">

</div>

## ✨ Features

- **🔖 Bookmark sessions** — Name and bookmark important conversations directly from inside Claude Code with `/bookmark`
- **▶️ Resume from anywhere** — Open any bookmarked session from any directory, always in the correct project context
- **📚 Session browser** — Browse bookmarked and all sessions in an interactive TUI with live filtering
- **🔀 Fork sessions** — Branch off a conversation to explore an alternative without touching the original
- **🆕 Start named sessions** — Launch Claude with a session name already set, so it's bookmarked from the start
- **📊 Stats** — Usage overview across all your projects

## 🎬 See it in action

### Bookmark a session inside Claude Code and resume it later

<img src="https://raw.githubusercontent.com/i-am-nio/cc-sessions/main/screenshots/saving%20session%20%2B%20re%20opening%20it.gif" alt="Bookmark a session with /bookmark and resume it from cc-sessions" width="700">

Use `/bookmark my-session-name` inside any Claude Code conversation to save it. Then open `cc-sessions list` from anywhere to resume it in the correct project context.

### Bookmark sessions from the TUI

<img src="https://raw.githubusercontent.com/i-am-nio/cc-sessions/main/screenshots/bookmark%20session.gif" alt="Bookmark a session from the sessions tab" width="700">

### Delete sessions

<img src="https://raw.githubusercontent.com/i-am-nio/cc-sessions/main/screenshots/delete%20session.gif" alt="Delete sessions" width="700">

Mark one or more sessions with `X`, then confirm deletion with `Z`.

## ⚡ Quick Start

```bash
npm install -g @i-am-nio/cc-sessions
cc-sessions init
```

That's it! cc-sessions will set up hooks, import your existing sessions, and register the `/bookmark` slash command inside Claude Code.

> Restart Claude Code after running `init` for the hooks to take effect.

## 📋 Prerequisites

- **Node.js 20+**
- **Claude Code**

## 🖥️ The TUI

### Bookmarks tab

<img src="https://raw.githubusercontent.com/i-am-nio/cc-sessions/main/screenshots/bookmarks.png" alt="Bookmarks tab" width="700">

Your named sessions, always one keystroke away. Press `ENTER` to resume in the original project directory.

### Stats tab

<img src="https://raw.githubusercontent.com/i-am-nio/cc-sessions/main/screenshots/stats.png" alt="Stats tab" width="700">

Usage overview across all your projects — session counts, activity, and more.

## 📦 Commands

### Inside Claude Code

| Command | Description |
|---|---|
| `/bookmark name` | Bookmark the current session with a name |

### In your terminal

| Command | Description |
|---|---|
| `cc-sessions init` | One-time setup — configures hooks, imports existing sessions, registers `/bookmark` |
| `cc-sessions list` | Open the interactive session browser (`--all` to show all sessions, not just bookmarks) |
| `cc-sessions new name` | Start a new Claude session in the current directory, bookmarked under the given name |
| `cc-sessions import` | Manually scan `~/.claude/projects/` and sync the session index |
| `cc-sessions uninstall` | Remove cc-sessions hooks from Claude settings, keep bookmarks |
| `cc-sessions uninstall --nuke` | Remove hooks, all session data, and the `/bookmark` command |

## ⌨️ Key Bindings

Letter keys are case-sensitive — use uppercase.

| Key | Action |
|---|---|
| `↑ ↓` | Navigate sessions |
| `ENTER` | Resume selected session |
| `F` | Fork selected session (with confirmation) |
| `B` | Bookmark selected session |
| `R` | Rename bookmark |
| `D` | Unbookmark (with confirmation) |
| `O` | Open project in Cursor / VS Code |
| `A` | Toggle between bookmarks only / all sessions |
| `X` | Mark session for deletion |
| `Z` | Delete all marked sessions |
| `ESC` | Clear filter / Quit |
| Type anything | Filter sessions live |

## 🔧 How It Works

Running `cc-sessions init` will:
1. Create `~/.config/cc-sessions/` to store your session index
2. Register Claude Code lifecycle hooks (session tracking)
3. Import all your existing sessions from `~/.claude/projects/`
4. Add the `/bookmark` slash command inside Claude Code
5. Add a status line showing the current session's bookmark name

cc-sessions integrates with Claude Code via its native hook system:

- **`SessionStart`** — Registers the new session and runs `import` to prune stale entries
- **`UserPromptSubmit`** — Updates `lastActiveAt` for the current session
- **`Stop`** — Marks the session as inactive
- **`statusLine`** — Displays the current session's bookmark name in the Claude Code status bar

Sessions are stored in `~/.config/cc-sessions/index.json`. Each entry tracks the session ID, project path, git branch, first prompt, Claude's auto-generated summary (when available), bookmark name, and timestamps.

### Resume across projects

When you resume a session from `cc-sessions list`, the `claude` process is spawned in the session's **original project directory** — not wherever you ran `cc-sessions list` from. This ensures the correct project context is always used.

### Fork

Forking uses `claude --resume <id> --fork-session`, which creates a new session branching from the selected conversation's full context. The original session is never modified.

## 📂 File Structure

```
~/.config/cc-sessions/
└── index.json       # Session index with bookmarks, names, summaries

~/.claude/
├── settings.json    # Auto-updated with hooks, statusLine, permissions
└── commands/
    └── bookmark.md  # /bookmark slash command
```

## 🩺 Troubleshooting

### "No conversation found" when resuming a session

If resuming fails with:

```
No conversation found with session ID: <id>
```

This is a Claude server-side issue — the session has become stale on Anthropic's servers even though the local file still exists.

**Fix:** manually re-register the session by running the resume command directly from the project directory:

```bash
cd /path/to/your/project
claude --resume <session-id>
```

Once Claude successfully resumes it, it re-registers server-side and `cc-sessions list` will work again.

> You can find the session's project path in the preview pane of `cc-sessions list` under **Project**.

This can happen when:
- Claude experiences a temporary server-side incident
- The session has been idle for an extended period
- The session encountered API errors during a previous conversation

## 🔗 Related

- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** — Official documentation

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

