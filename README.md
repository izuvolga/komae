# komae

## Project Overview

This software is designed to create illustration collections that merge illustrations and manga. Currently, in the doujinshi industry, works are sold in the form of manga or illustration collections. Particularly, those who want the flexibility of manga or wish to reduce the number of drawings they need to create choose to draw in the form of illustration collections. However, many creators who make illustration collections are actually telling stories.

In such cases, they express stories by reusing almost identical illustrations while slightly changing mouth positions, body movements, or adding speech bubbles. This can be described as a static novel game.

Currently, there is no specialized software to support creating works in this format. Therefore, we aim to create software that supports the creation of such works.

The name "komae" comes from "コマ" (koma) and "絵" (e).
"koma" meaning "panel" in Japanese, which is a common term in manga and comics.
"e" meaning "picture" or "illustration".

The name reflects the software's purpose of creating illustrated stories with a focus on panels and images, similar to manga but with a unique approach to storytelling through illustrations.

## Project Architecture

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

The project has been initialized with a basic Electron + React + TypeScript setup including:
- Complete development environment configuration
- Basic React application structure
- Electron main and preload processes
- Webpack build configuration
- Development and build scripts

## Development Setup

### Prerequisites
- Node.js (v16 or later)
- npm

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd komae
```

2. Install dependencies:
```bash
npm install
```

### Development

Start the development server:
```bash
npm run dev
```

This will:
- Start the webpack development server on http://localhost:3000
- Launch the Electron application automatically
- Enable hot reload for development

### Build

Build the application for production:
```bash
npm run build
```

### Available Scripts

- `npm run dev` - Start development server and Electron app
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run start:renderer` - Start only the React development server
- `npm run start:electron` - Start only the Electron app

## License

This project is licensed under the GNU General Public License v3.0. All code contributions must be compatible with GPL v3.0 licensing requirements.
