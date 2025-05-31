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

## Open Issues

### Weather Widget

✅ Feature complete:

1. Weather API integration working
2. Weather component UI ported
3. Added to default toolkit
4. Properly integrated with chat interface

### Artifacts System

1. Sheet artifacts need improvements:
   - Better data validation
   - Enhanced UI/UX
   - Full feature parity with reference
2. Image artifacts missing entirely
3. Suggestion generation needs optimization

### Model Registry

1. Need to verify all ported features use our model registry
2. Ensure model configuration system is preserved
3. Review model selection in new components

## Migration Plan

### Phase 1 - Immediate Tasks

1. Complete Weather Widget

   - [x] Port weather API integration
   - [x] Update Weather component UI
   - [x] Fix get-weather tool implementation

2. Fix Remaining Artifacts Issues
   - [x] Complete sheet artifact improvements
   - [ ] Fix suggestion generation
   - [ ] Add proper error handling

### Phase 2 - Core Features

1. Document Processing

   - [ ] PDF processing
   - [ ] Document chunking
   - [ ] Document search

2. Enhanced UI Components
   - [ ] Improved command palette
   - [ ] Enhanced code editor
   - [ ] Better error handling UI

### Phase 3 - Advanced Features

1. Sheet Improvements

   - [ ] Advanced data validation
   - [ ] Enhanced UI/UX
   - [ ] Formula support

2. Image Artifacts

   - [x] Basic image support
   - [x] Image generation
   - [ ] Image editing

3. Command Palette Enhancements
   - [ ] Advanced command suggestions
   - [ ] Custom command support
   - [ ] Keyboard shortcuts

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
