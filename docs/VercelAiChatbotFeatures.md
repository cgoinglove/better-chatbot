# Vercel AI Chatbot Features Migration

This document tracks the features being ported from Vercel's AI Chatbot reference implementation to MCP Client Chatbot.

## Current State

### Authentication

- ✅ Migrated from next-auth to better-auth
- ✅ All routes updated to use better-auth
- ✅ Auth middleware properly configured

### UI Components

- ✅ Ported shadcn/ui components
- ✅ Basic chat interface working
- ✅ Basic artifacts UI implemented

### Artifacts

- ✅ Basic artifact support implemented
- ✅ Text artifacts working
- ✅ Code artifacts working
- ⚠️ Sheet artifacts partially working
- ❌ Image artifacts not implemented

### Model Integration

- ⚠️ Need to ensure ported features use our model registry
- ⚠️ Review model selection in artifact generation
- ✅ Basic model selection working

## Feature Status and Migration Plan

### Phase 0 – Pre-Merge Essentials (THIS branch)

#### Projects UI
- [ ] Projects UI components
- [ ] MCP Configuration (admin-only access)
- [ ] Temporary chat functionality
- [ ] Command menu
- [ ] Sharing features (public/anonymous access)
- [ ] Guest access functionality

#### Artifacts System
- [x] Basic artifact support implemented
- [x] Text artifacts working
- [x] Code artifacts working
- [ ] Sheet artifact improvements (validation, UI/UX, parity)
- [ ] Fix suggestion generation
- [ ] Add proper error handling
- [ ] Improve artifact detection for code and rich text
- [ ] Test artifact actions
- [ ] Image artifacts implementation

#### Tool Call UI
- [ ] Better tool call UI implementation
- [ ] Enhanced error handling
- [ ] Improved user feedback

#### Menu Features (ai-chatbot parity/must-have)
- [ ] Complete voting system
- [ ] Chat preferences dialog
- [ ] Keyboard shortcuts dialog
- [ ] Auto guest avatar

#### Model Registry
- [ ] Ensure all ported features use our model registry
- [ ] Review model selection in artifact generation
- [x] Basic model selection working
- [ ] Ensure model configuration system is preserved

---

### Phase 1 – Post-Merge Core Features

#### Document Processing
- [ ] File upload functionality (hide until ready)
- [ ] PDF processing
- [ ] Document chunking
- [ ] RAG implementation

#### UX Improvements
- [ ] Resizable sidebar
- [ ] Better tooling for voice interactions
- [ ] Enhanced code editor

#### Search and Research
- [ ] Advanced search UI
- [ ] Deep research capabilities
- [ ] Context-aware suggestions

### Completed Features

#### Weather Widget
- [x] Weather API integration working
- [x] Weather component UI ported
- [x] Added to default toolkit
- [x] Properly integrated with chat interface

## Notes

- All ported features must maintain compatibility with our model registry
- New features should use better-auth
- Preserve existing functionality while adding new features
- Regular testing needed to ensure stability
- User menu implementation:
  - Using our sophisticated app-sidebar-user.tsx with multiple themes, chat preferences, keyboard shortcuts
  - Removed duplicate simpler sidebar-user-nav.tsx from inspiration project
  - Features beyond reference implementation:
    - Multiple theme selection (not just light/dark)
    - Chat preferences
    - Keyboard shortcuts
    - Better profile display

## Reference

- [Vercel AI Chatbot Repository](https://github.com/vercel/ai-chatbot)
- Location: `/inspiration/ai-chatbot` in our project
