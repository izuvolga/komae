## Project Overview (Plan)

This software is designed to create illustration collections that merge illustrations and manga. Currently, in the doujinshi industry, works are sold in the form of manga or illustration collections. Particularly, those who want the flexibility of manga or wish to reduce the number of drawings they need to create choose to draw in the form of illustration collections. However, many creators who make illustration collections are actually telling stories.

In such cases, they express stories by reusing almost identical illustrations while slightly changing mouth positions, body movements, or adding speech bubbles. This can be described as a static novel game.

Currently, there is no specialized software to support creating works in this format. Therefore, we aim to create software that supports the creation of such works.

The name "komae" comes from "コマ絵綴り" (sequential panel illustrations).


## Project Architecture (Plan)

This software is designed as an application with the following characteristics:

- GUI application
- UI similar to an Excel spreadsheet
  - 1 row = 1 page
  - Each column allows registration of which layer images to use, what dialogue to include, etc.
- Ability to register image files as assets
  - These assets can be used as layers and registered on specific pages
  - Multiple assets can be grouped together
- Preview the entire story
- Story files are structured based on YAML files
  - Text-based editing is possible, excluding binary information like images
- Output files can be exported as HTML files
  - Each page becomes an SVG file
  - Page navigation is possible with HTML and JavaScript

## Technical Overview

Development of a frontend application based on Electron + React + TypeScript.

## Project Status

The project has been successfully initialized with a complete Electron + React + TypeScript development environment:
- ✅ Complete development environment setup (Electron + React + TypeScript)
- ✅ Working build system with webpack configuration
- ✅ Development workflow with hot reload
- ✅ Security-focused architecture with context isolation
- ✅ GPL v3 LICENSE and documentation

## Development Setup

**Prerequisites:**
- Node.js v16 or later
- npm

**Quick Start:**
```bash
npm install
npm run dev  # Start development server + Electron app
```

**Development Workflow:**
- User will run `npm run dev` command for testing
- **IMPORTANT**: Never commit changes without explicit user permission
- Always stop and wait for user instructions before committing
- Commit changes only after user confirms functionality works correctly and explicitly asks for commit

**Architecture:**
- Main Process: Electron main (Node.js environment)
- Preload Script: API bridge using contextBridge
- Renderer Process: React UI (web environment)

**Key Design Decisions:**
- Renderer uses `target: 'web'` for maximum React compatibility
- Node.js functionality accessed via preload script only
- Context isolation enabled for security

## Issue Management

**GitHub Issues & gh CLI:**
- All project tasks and features are managed as GitHub Issues
- Use `gh` command-line tool for issue operations:
  ```bash
  gh issue list                    # List all issues
  gh issue view <number>           # View specific issue
  gh issue create --title "..." --body "..."  # Create new issue
  gh issue edit <number> --body "..."         # Edit issue content
  gh issue close <number> --comment "..."     # Close with comment
  ```
- Issues should be written in English for broader accessibility
- Use clear titles with appropriate emoji prefixes (🔗, 💾, 🧪, etc.)
- Include detailed implementation requirements and success criteria
- Reference related files and dependencies in issue descriptions

## Documentation and Design

**docs/worklog/ Directory:**
All design documents, technical notes, and troubleshooting records are stored in the `worklog/` directory:
- `docs/worklog/electron-react-setup.md` - Development environment setup and troubleshooting
- `docs/worklog/` - Store design mockups, wireframes, and UI specifications here
- `docs/worklog/` - Technical decisions and architecture discussions

**Design Assets:**
When creating UI designs or mockups, place them in `docs/design/` with descriptive names:
- `docs/design/ui-mockup-main-spreadsheet.png` - Main spreadsheet interface
- `docs/design/ui-mockup-asset-library.png` - Asset management interface  
- `docs/design/ui-mockup-preview.png` - Story preview interface

## AI-Optimized Logging System

**Overview:**
The project implements a comprehensive logging system optimized for AI analysis and LLM-assisted development. This system provides structured, JSON-formatted logs that enable Claude and other AI models to effectively analyze application behavior, debug issues, and optimize performance.

**Key Components:**

1. **KomaeLogger (`src/utils/logger.ts`)**
   - Custom logger implementation with AI-native JSON output
   - Structured logging with correlation IDs and session tracking
   - Automatic file output to `logs/komae-YYYY-MM-DD.log`
   - Environment-aware configuration (development vs production)

2. **RendererLogger (`src/renderer/utils/logger.ts`)**
   - Bridge for UI operations logging from renderer process
   - IPC communication with main process logger
   - Performance tracking with UIPerformanceTracker
   - Component-level error handling and user interaction tracking

**Logging Categories:**

- **Development Logs**: TDD support, debugging, development workflow tracking
- **Error Logs**: Exception tracking, problem analysis with stack traces
- **User Interaction Logs**: UI usage patterns, workflow analysis, UX optimization
- **Performance Logs**: Operation timing, bottleneck identification
- **Asset Operation Logs**: Import, delete, validation tracking with success/failure status
- **Project Operation Logs**: Save, load, create, export workflow monitoring
- **System Logs**: Environment information, resource usage patterns

**Usage Examples:**

```typescript
// Main Process (Node.js environment)
import { getLogger, PerformanceTracker } from '../utils/logger';
const logger = getLogger();

// Performance tracking
const tracker = new PerformanceTracker('asset_import');
await logger.logDevelopment('asset_import_start', 'Starting asset import', { filePath });
// ... operation code ...
await tracker.end({ success: true, assetId });

// Error logging
await logger.logError('asset_validation', error, { filePath, projectPath });

// Asset operations
await logger.logAssetOperation('import', { id, name, filePath, type }, context, success);
```

```typescript
// Renderer Process (React components)
import { getRendererLogger, UIPerformanceTracker } from '../../utils/logger';
const logger = getRendererLogger();

// UI interaction tracking
await logger.logUserInteraction('asset_select', 'AssetLibrary', {
  assetId, selectionType, currentSelection
});

// Performance measurement
const tracker = new UIPerformanceTracker('asset_import_dialog');
// ... UI operation ...
await tracker.end({ dialogResult: 'confirmed' });
```

**Log Structure:**
Each log entry contains:
- `timestamp`: ISO timestamp
- `level`: debug, info, warning, error, critical
- `operation`: Specific operation identifier
- `message`: Human-readable description
- `context`: Detailed operation context and metadata
- `humanNote`: AI instruction for human developers
- `aiTodo`: Specific AI analysis suggestions
- `sessionId`: Session correlation tracking
- `correlationId`: Operation correlation tracking

**Integration Points:**
- **AssetManager**: Import, delete, validation operations (`src/main/services/AssetManager.ts`)
- **ProjectManager**: Save, load, create operations (`src/main/services/ProjectManager.ts`)
- **AssetLibrary**: User interactions, drag/drop, import workflows (`src/renderer/components/asset/AssetLibrary.tsx`)
- **Main Process**: IPC handlers for renderer logging (`src/main/main.ts`)
- **Preload**: IPC bridge for logger communication (`src/preload/preload.ts`)

**Log File Location:**
- Development: `logs/` directory in project root
- Production: `~/.komae/logs/` directory
- Format: `komae-YYYY-MM-DD.log` (one file per day)

**AI Analysis Benefits:**
- **Pattern Recognition**: Identify user workflow patterns and bottlenecks
- **Error Analysis**: Correlate errors across operations with full context
- **Performance Optimization**: Track operation timing and resource usage
- **UX Improvement**: Analyze user interaction patterns for UI optimization
- **Development Support**: TDD assistance and debugging support with detailed context

**Dependencies:**
- `vibelogger`: AI-optimized logging library (fallback to custom implementation)
- Automatic log directory creation and file management
- Thread-safe operations for concurrent logging

**Maintenance:**
- Log files are automatically created and rotated daily
- No manual cleanup required - logs accumulate for historical analysis
- All logging operations are non-blocking and error-tolerant
- Failed logging attempts are handled gracefully without affecting app functionality

## License

This project is licensed under the GNU General Public License v3.0. All code contributions must be compatible with GPL v3.0 licensing requirements.
