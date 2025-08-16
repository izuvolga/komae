# Development Commands and Workflow

## Essential Commands

### Development
```bash
npm install              # Install dependencies
npm run dev             # Start development server + Electron app
npm run build           # Build for production
npm run build:dev       # Build for development
```

### Testing
```bash
npm run test            # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
```

### Individual Components
```bash
npm run start:renderer  # Start only React dev server
npm run start:electron  # Start only Electron app
npm run build:main      # Build main/preload processes only
```

### Template System
```bash
npm run build:templates        # Build HTML viewer templates
npm run build:templates:watch  # Auto-rebuild templates on change
```

## Development Workflow

### Starting Development
1. `npm install` (first time only)
2. `npm run dev` (starts both renderer and electron)
3. Development server runs on http://localhost:3000
4. Hot reload enabled for React components

### Testing Workflow
- Run `npm run test` after completing tasks
- Use `npm run test:watch` during development
- Check coverage with `npm run test:coverage`

### Build Process
1. Templates are built first (`build:templates`)
2. Webpack builds main, preload, and renderer processes
3. Production builds are optimized and minified

## Project Commands
When working on tasks, always run tests after completion to ensure nothing is broken.

## System Utilities (Darwin)
- `ls` - List directory contents
- `find` - Search for files
- `grep` - Search text patterns
- `git` - Version control operations

## Key Files to Know
- `package.json` - Scripts and dependencies
- `webpack.config.js` - Build configuration
- `jest.config.js` - Test configuration
- `CLAUDE.md` - Project documentation for AI