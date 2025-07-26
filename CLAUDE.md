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

## License

This project is licensed under the GNU General Public License v3.0. All code contributions must be compatible with GPL v3.0 licensing requirements.
