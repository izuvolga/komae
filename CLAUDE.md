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

This is a newly initialized repository with minimal content. The project currently contains:
- GPL v3 LICENSE file
- Basic README.md
- No source code or build configuration yet

## Development Setup

No build tools, package managers, or development dependencies have been configured yet. Future development will require establishing:
- Programming language and framework selection
- Build system configuration
- Testing framework setup
- Development workflow and tooling

## License

This project is licensed under the GNU General Public License v3.0. All code contributions must be compatible with GPL v3.0 licensing requirements.
