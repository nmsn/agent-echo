# Agent Echo — Layout & Theme Redesign

**Date:** 2026-06-07
**Status:** Approved

---

## 1. Overview

Redesign the Agent Echo UI to match the design document (`index.html` at project root). The redesign applies a warm oklch dark theme, removes KPI cards and TabBar, and introduces a session-list + conversation + translation-composer layout.

---

## 2. Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Topbar (56px): Logo + Status + Search + Settings           │
├──────────────┬──────────────────────────────────────────────┤
│  Sidebar     │  Conversation Area                           │
│  340px       │                                              │
│              │  ┌─ ConversationHeader ─────────────────────┐│
│  ┌────────┐  │  │ Avatar + Title + Meta + Actions          ││
│  │ Search │  │  └─────────────────────────────────────────┘│
│  └────────┘  │                                              │
│              │  ┌─ Messages (scrollable) ─────────────────┐│
│  Session     │  │ Day separator                            ││
│  List        │  │ Message bubbles with kind tags           ││
│              │  │ Bubble actions (hover)                 ││
│              │  └─────────────────────────────────────────┘│
│              │                                              │
│              │  ┌─ Composer ──────────────────────────────┐│
│              │  │ Label + Target + Toggle                 ││
│              │  │ [Chinese input] [English output]        ││
│              │  │ Tone chips + Domain chips               ││
│              │  │ Footer: shortcuts + buttons             ││
│              │  └─────────────────────────────────────────┘│
└──────────────┴──────────────────────────────────────────────┘
```

### Removed
- KPI Cards (4 stat cards: Output Tokens, Input Tokens, Active Sessions, Total Sessions)
- TabBar (replaced by SessionList in sidebar)

### Added
- `SessionList` component in sidebar
- `ConversationHeader` component
- Redesigned `MessageItem` with kind tags
- Redesigned `ComposeBar` with dual-pane translation

---

## 3. Theme (oklch Warm Dark)

### CSS Variables

```css
:root {
  --bg:          oklch(17% 0.011 50);
  --sidebar:     oklch(14% 0.009 50);
  --surface:     oklch(21% 0.013 50);
  --surface-2:   oklch(25% 0.014 50);
  --surface-3:   oklch(28% 0.014 50);
  --code-bg:     oklch(13% 0.012 50);
  --fg:          oklch(96% 0.007 60);
  --muted:       oklch(72% 0.011 60);
  --dim:         oklch(54% 0.010 60);
  --border:      oklch(30% 0.013 50);
  --border-soft: oklch(25% 0.012 50);
  --accent:        oklch(70% 0.145 40);
  --accent-hover:  oklch(75% 0.150 40);
  --accent-soft:   oklch(33% 0.075 40);
  --accent-ring:   oklch(70% 0.145 40 / 0.35);
  --live:    oklch(72% 0.155 145);
  --font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', ...;
  --font-mono: 'JetBrains Mono', 'SF Mono', 'IBM Plex Mono', Menlo, monospace;
  --r-sm: 6px; --r-md: 10px; --r-lg: 14px;
  --shadow-1: 0 1px 0 oklch(0% 0 0 / 0.4), 0 1px 2px oklch(0% 0 0 / 0.3);
  --shadow-2: 0 8px 24px oklch(0% 0 0 / 0.45), 0 2px 6px oklch(0% 0 0 / 0.35);
}
```

### Avatar Kind Colors

| Kind     | Background          | Text              |
|----------|---------------------|-------------------|
| code     | oklch(78% 0.110 60) | oklch(20% 0.02 60) |
| research | oklch(74% 0.105 200)| oklch(18% 0.02 220)|
| data     | oklch(76% 0.130 145)| oklch(18% 0.02 145)|
| devops   | oklch(70% 0.130 320)| oklch(98% 0.005 320)|
| docs     | oklch(75% 0.110 100)| oklch(20% 0.02 100)|

### Kind Tag Styles (Messages)

| Kind     | Text Color           | Background                | Border                    |
|----------|----------------------|---------------------------|---------------------------|
| progress | oklch(74% 0.105 200) | oklch(74% 0.105 200 / 0.12) | oklch(74% 0.105 200 / 0.25) |
| finding  | accent              | accent-soft              | oklch(70% 0.145 40 / 0.3)  |
| decision | oklch(76% 0.130 145) | oklch(76% 0.130 145 / 0.12)| oklch(76% 0.130 145 / 0.25)|
| summary  | oklch(78% 0.110 60)  | oklch(78% 0.110 60 / 0.12) | oklch(78% 0.110 60 / 0.25) |

---

## 4. Components

### 4.1 Topbar
- Height: 56px
- Grid: `1fr auto 1fr` columns
- Left: App mark (hexagon SVG icon in accent-soft) + Title + Subtitle
- Center: Status chip with live pulse dot + "N 个终端在线"
- Right: Search icon button + Settings icon button

### 4.2 Sidebar (340px)
- Search bar with ⌘K shortcut hint
- Session list (scrollable)
- Footer: live indicator dot + "持续监听中"

### 4.3 SessionList Item
- Avatar (36px, rounded-10px) with kind-based colors
- Name (13px, font-weight 600) + Preview (12px, muted)
- Time (10px, mono, dim)
- Active state: left 3px accent bar + surface-2 background + border

### 4.4 ConversationHeader
- Avatar (40px, rounded-12px)
- Title (15px, bold) + Meta row: tags + status + live dot
- Actions: Copy button, Export button, More button (icon)

### 4.5 MessageItem
- Avatar (32px) + Name + Kind tag + Timestamp
- Bubble: surface background, border-soft, border-radius 14px (4px top-left)
- Code inline: code-bg background, accent text
- Hover: shows action buttons (translate/speak/copy)
- Translation panel: slides in below bubble with left accent border

### 4.6 ComposeBar
- Header: "翻译草稿" label + target terminal chip
- Toggle: collapse/expand with chevron rotation
- Body: 1:1 grid of compose panes
  - **Input pane (in)**: Chinese textarea, char count
  - **Output pane (out)**: English result display, ⌘C hint
- Chips: Tone (专业/友好/简洁) + Domain (代码/运维/文档/通用)
- Footer: keyboard shortcuts + Retry / Translate / Copy buttons
- History: recent translations with reuse/copy actions

---

## 5. Animations

### Pulse (live status)
```css
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 oklch(72% 0.155 145 / 0.4); }
  50%      { box-shadow: 0 0 0 5px oklch(72% 0.155 145 / 0); }
}
```

### Wave (speaking indicator)
```css
@keyframes wave {
  0%, 100% { transform: scaleY(0.4); }
  50%      { transform: scaleY(1); }
}
```
4 bars with staggered delays (0s, 0.15s, 0.3s, 0.45s)

### SlideIn (translation panel)
```css
@keyframes slideIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### Blink (streaming cursor)
```css
@keyframes blink { 50% { opacity: 0; } }
```

---

## 6. Typography

- **Body**: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif
- **Mono**: 'JetBrains Mono', 'SF Mono', 'IBM Plex Mono', Menlo, monospace
- **Sizes**: 14px base, 13px secondary, 12px muted, 11px labels, 10px timestamps
- **Letter-spacing**: 0.04em subtitles, 0.14em uppercase labels, 0.08em kind tags

---

## 7. Implementation Notes

### File Changes
1. `packages/main/src/renderer/index.css` — Replace CSS variables with oklch theme
2. `packages/main/src/renderer/App.tsx` — New layout (sidebar + conversation)
3. `packages/main/src/renderer/components/SessionList.tsx` — New component
4. `packages/main/src/renderer/components/ConversationHeader.tsx` — New component
5. `packages/main/src/renderer/components/MessageItem.tsx` — Kind tags + redesigned bubble
6. `packages/main/src/renderer/components/ComposeBar.tsx` — Dual-pane translation
7. `packages/main/src/renderer/stores/conversation.ts` — May need `kind` field support

### Data Model
The store's `Session` type may need a `kind` field (code/research/data/devops/docs) to support avatar coloring. Design document shows `kind` on session objects.

### No Functional Changes
- Translation API remains the same
- IPC bridge remains the same
- Terminal focus remains the same