# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Artifacts

### bot-templates (React + Vite, at `/`)
Python bot templates showcase for Telegram and WhatsApp development.
- **Dark mode** default with light mode toggle
- **Bilingual ES/EN** via `LanguageProvider` context + floating toggle (bottom-right)
- **Pages**: Home, Telegram (5 templates), WhatsApp (8 templates), Setup, Tips, Deploy 24/7, Credentials
- **Syntax highlighter**: Custom Python tokenizer in `code-block.tsx` (no external deps)
- **Key files**: `src/context/language.tsx` (translations), `src/components/layout.tsx`, `src/App.tsx`
- Templates include inline `# MODIFY:` comments in active language (ES/EN) explaining customization
- Credentials page emphasizes NEVER hardcoding tokens — always use `.env` locally / env vars in cloud

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
