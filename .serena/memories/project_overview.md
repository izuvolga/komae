# Komae Project Overview

## Purpose
Komae is a specialized application for creating illustration collections that merge illustrations and manga. It targets creators in the doujinshi industry who want to create story-driven illustration collections by reusing similar illustrations with slight modifications (mouth positions, body movements, speech bubbles).

## Core Concept
- **Static novel game approach**: Like visual novels but with static illustrations
- **Panel-based storytelling**: "koma" (panel) + "e" (illustration)
- **Asset reuse**: Efficient story creation through illustration variations

## Tech Stack
- **Framework**: Electron + React + TypeScript
- **Build System**: Webpack with multiple configurations
- **State Management**: Zustand
- **Data Validation**: Zod
- **Testing**: Jest with jsdom environment
- **Asset Processing**: image-size, opentype.js for font handling
- **File Format**: YAML for project files
- **Export**: HTML/SVG generation

## Architecture
- **Main Process**: Electron main (Node.js environment)
- **Preload Script**: API bridge using contextBridge
- **Renderer Process**: React UI (web environment)
- **Security**: Context isolation enabled

## Key Features
- Excel-like spreadsheet UI (1 row = 1 page)
- Asset management (images, vectors, fonts, text)
- Multi-layer composition system
- Real-time preview
- HTML/SVG export
- Multi-language support
- AI-optimized logging system

## Project Structure
- `src/main/` - Electron main process services
- `src/renderer/` - React UI components
- `src/utils/` - Shared utilities
- `src/types/` - TypeScript type definitions
- `src/templates/` - HTML export templates
- `docs/` - Documentation and design files
- `tests/` - Test files