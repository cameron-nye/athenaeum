# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation

- [Changelog](CHANGELOG.md) - Version history and changes

## Commands

- `npm run dev` - Start development server at <http://localhost:3000>
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run typecheck` - Run TypeScript type check
- `npm run format` - Format code with Prettier
- `npm run test` - Run Vitest once
- `npm run test:watch` - Run Vitest in watch mode
- `npm run test:coverage` - Run Vitest with coverage

## Tech Stack

- **Next.js 16** with App Router
- **React 19** with React Compiler enabled (`reactCompiler: true` in next.config.ts)
- **Tailwind CSS v4** (uses `@import "tailwindcss"` and `@theme` directive)
- **TypeScript** with strict mode
- **Vitest** + React Testing Library for unit/component tests
- **Husky** + lint-staged for pre-commit hooks

## Browser Automation

Use `agent-browser` for web automation. Run `agent-browser --help` for all commands.

Core workflow:

1. `agent-browser open <url>` - Navigate to page
2. `agent-browser snapshot -i` - Get interactive elements with refs (@e1, @e2)
3. `agent-browser click @e1` / `fill @e2 "text"` - Interact using refs
4. Re-snapshot after page changes

## Design Style Guide

- Use the Shadcn UI design system
- Use the Lucide icons
- Use the Tailwind CSS utility classes
- Use an 8-point grid for layout

## Path Aliases

`@/*` maps to the project root (configured in tsconfig.json).

## Testing

- Unit/component tests: co-locate with source files as `*.test.tsx`

**When implementing features:**

- Write unit tests alongside implementation (not after)
- Each component/function should have basic coverage before marking task complete
- Run `npm run test` to verify tests pass before committing

## Repository Etiquette

- Always create a feature branch before starting major changes.
- Branch naming: `feature/<short-description>` or `fix/<short-description>`

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.
