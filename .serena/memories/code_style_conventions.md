# Code Style and Conventions

## Language and Framework Conventions

### TypeScript
- Strict type checking enabled
- Interface definitions in `src/types/entities.ts`
- Use Zod for runtime validation
- Prefer explicit types over `any`

### React Components
- Functional components with hooks
- Props interfaces defined inline or in types file
- Use React 19 features
- CSS modules or inline styles

### File Organization
- `src/main/` - Electron main process services
- `src/renderer/` - React UI components and utilities  
- `src/utils/` - Shared utilities between main and renderer
- `src/types/` - TypeScript type definitions
- Tests co-located with source files or in `tests/` directory

### Naming Conventions
- **Files**: kebab-case for components, camelCase for utilities
- **Classes**: PascalCase
- **Functions/Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Interfaces**: PascalCase, often ending with 'Data' or 'Info'

### Code Organization Patterns
- Service classes for main process business logic
- Custom hooks for renderer state management
- Zustand for global state management
- IPC handlers in main process, API calls in renderer

### Error Handling
- Custom error classes extending Error
- Structured error messages with error codes
- Comprehensive logging with AI-optimized format

### Logging
- Use structured logging with `src/utils/logger.ts`
- Include correlation IDs and context
- Log user interactions and performance metrics
- AI-optimized JSON format for analysis

### Testing
- Jest with jsdom environment
- Test files end with `.test.ts` or `.test.tsx`
- Cover main business logic and critical UI flows
- Mock Electron APIs in tests

### Documentation
- JSDoc comments for public APIs
- README files for major features
- Design documentation in `docs/design/`
- Technical notes in `docs/worklog/`

## Specific Patterns
- Asset management through service classes
- Project data validation with Zod schemas
- IPC communication with type-safe APIs
- SVG generation with template system
- Multi-language support infrastructure