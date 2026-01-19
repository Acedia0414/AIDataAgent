# UI/UX Improvements Changelog

This document tracks visual and functional improvements made to the Chat interface.

## [2026-01-16]
### Chat Interface Overhaul
**Status**: In Progress

#### 1. Message Bubble Styling
- **Issue**: Previous "white on white" contrast was poor. Styles looked outdated.
- **Fix**:
    - **Assistant Messages**: Changed to `bg-slate-50` with a stronger `border-slate-200` and `shadow-sm` to clearly separate from the page background.
    - **User Messages**: Refined blue gradient or solid blue with improved padding and white text.
    - **Typography**: Increased line height and spacing for better readability.
    - **Actions**: Added "Copy to Clipboard" button to every message bubble for one-click copying.

#### 2. Conversation Sidebar
- **Issue**: Sidebar was a plain list of buttons ("really bad").
- **Fix**:
    - Redesigned as a modern navigation list.
    - Added hover effects (`hover:bg-slate-200`).
    - improved active state indicators.
    - Added icons for better visual hierarchy.

#### 3. Performance & smoothness
- **Issue**: Switching conversations felt slow or "jumpy".
- **Fix**:
    - Implemented optimistic UI updates or `keepPreviousData` in React Query to prevent flashing empty states between switches.
    - Reduced layout shifts.
    - ensured interactions feel "extremely fast".

#### 4. General Layout
- **Issue**: "Box in a box" layout (Card inside Card) reduced usable space and looked cluttered.
- **Fix**:
    - Removed outer `Card` wrappers where unnecessary to create a cleaner, full-height "app-like" feel.
    - Improved transparency and blur effects on headers.

### [2026-01-16 Update 2]
### Sidebar & Interactions Refinement
**Status**: Planned

#### 4. Sidebar Styling Overhaul ("Styling sucks")
- **Issue**: Sidebar looks detached, "New Chat" button is isolated, "History" header is weak.
- **Fix**:
    - Switch to a full-height panel design (no floating card).
    - Unified background color (`bg-slate-50/80` or similar) to distinguish from the main chat area.
    - Better integration of the "New Chat" button.
    - Polished list items with clear active/inactive states.

#### 3. Tooltips
- **Issue**: Truncated titles in the sidebar are unreadable.
- **Fix**: Add native `title` attributes to all sidebar items and the main header title.

#### 1 & 2. Logic Clarifications
- **Issue**: Confusion around "New Chat" appearing in history or active chat presence in history.
- **Fix**:
    - Ensure "New Chat" state clearly deselects all history items.
    - Make the "Active" item in the list distinct (white bg + shadow vs gray bg).

### [2026-01-16 Update 3]
### Scrolling, Overflow, and Final Polish
**Status**: In Progress

#### Scrolling Fixes
- **Issue**: Sidebar and main chat had weird scrolling behavior. Horizontal scroll appeared unexpectedly.
- **Fix**:
    - Added proper `overflow-hidden` to sidebar container.
    - Fixed flexbox layout with `min-h-0` for proper scroll containment.
    - Added `overflow-x-hidden` to message list and bubbles.
    - Implemented `break-words`, `overflow-wrap-anywhere` for long text/code.
    - Code blocks now scroll internally with `overflow-x-auto`.

#### Uniform UI
- **Issue**: Inconsistent spacing, colors, and element sizing across components.
- **Fixes Planned**:
    - Standardize header label ("HISTORY" vs "Recent Chats").
    - Ensure all interactive elements have consistent hover/focus states.
    - Match button sizes, padding, and border-radius across components.
