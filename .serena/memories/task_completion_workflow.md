# Task Completion Workflow

## When Task is Completed

### Always Run Tests
```bash
npm run test
```
- Verify no regressions introduced
- Ensure new functionality works correctly
- Fix any failing tests before considering task complete

### Code Quality Checks
- TypeScript compilation should pass without errors
- No eslint warnings (if configured)
- Follow established code conventions

### Commit Guidelines
- Write descriptive commit messages in English
- Include AI-generated attribution:
  ```
  🤖 Generated with [Claude Code](https://claude.ai/code)
  
  Co-Authored-By: Claude <noreply@anthropic.com>
  ```
- Stage all relevant changes with `git add -A`

### Documentation
- Update relevant documentation if needed
- Add comments for complex logic
- Update type definitions if interfaces changed

### Integration Points
- Verify IPC communication still works (main ↔ renderer)
- Test asset loading and project operations
- Check preview and export functionality

## Validation Steps
1. **Build Success**: `npm run build` completes without errors
2. **Test Pass**: `npm run test` all tests pass
3. **Functionality**: Manual testing of implemented feature
4. **Integration**: Verify system still works as whole

## Special Considerations for Komae
- Asset management operations should be logged
- UI changes should maintain Excel-like spreadsheet UX
- Multi-language support should be preserved
- HTML export functionality should continue working

## Git Workflow
- Work on feature branches when appropriate
- Commit frequently with meaningful messages
- Use conventional commit format when possible
- Include AI collaboration attribution