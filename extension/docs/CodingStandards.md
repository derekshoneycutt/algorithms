# Coding Standards

This document defines coding and documentation style expectations for the ghcprompter-vscext codebase.
It focuses on quality, readability, and consistency across TypeScript, Markdown, communication contracts, and tests.

## 1. Core Style Principles

1. Keep code intentional and explicit; avoid hidden behavior and implicit coupling.
2. Preserve clear layer boundaries between UI rendering, frontend messaging, host coordination, and shared contracts.
3. Keep behavior scoped to the feature being implemented; avoid unrelated code churn.
4. Prefer deterministic behavior over cleverness, especially in test and data setup code.
5. Centralize reusable constants and conventions to avoid duplicated magic values.

## 2. TypeScript Standards

1. Use explicit interfaces/types for API contracts, schema-client shapes, and component-facing models.
2. Use braces for all control-flow blocks (`if`, `else`, `for`, `while`), including single-line bodies.
3. Use `const` by default; use `let` only when reassignment is required; do not use `var`.
4. Use consistent 2-space indentation for JS/TS/JSON in this repository.
5. **File organization (mandatory):** Each file should have one clear responsibility. If a file contains unrelated concerns, split it.
6. Add JSDoc for exported APIs and all functions; include `@param` and `@returns` when applicable.
7. Prefer explicit object construction where it improves clarity (for example, `const config: Config = { ... }`).
8. Keep function size and complexity reasonable:
   1. Prefer functions with one clear responsibility.
   2. If a function becomes difficult to scan, split it into meaningful sub-functions.
   3. If a function has more than 5 parameters, consider grouping inputs into an object.
9. Keep frontend messaging explicit and contract-based; do not bypass established message types/guards.
10. Keep state management lightweight and explicit for current scope.
11. Prefer named exports; avoid default exports.
12. Use ES module imports/exports; do not use TypeScript namespaces or `require`-style imports.
13. Use `import type` / `export type` for type-only symbols when practical.
14. Avoid `any`; prefer precise types or `unknown` with explicit narrowing.
15. Use `===` / `!==` by default; only use `== null` when intentionally matching both `null` and `undefined`.
16. Throw `Error` (or subclasses of `Error`) only; avoid throwing raw values.
17. Prefer function declarations for named functions and arrow functions for inline callbacks.

## 3. Error Handling and Validation Style

1. Keep error translation centralized so API responses are consistent.
2. Keep timeout values centralized as named constants.
3. Do not add automatic retry behavior unless explicitly required by feature scope.
4. Keep normalization logic isolated to a single maintainable location.
5. Apply existing normalization rules consistently where relevant: whitespace-to-space conversion, collapse repeated spaces, trim ends.

## 4. Test Code Standards

1. Prefer deterministic test setup and assertions.
2. Do not use random test data or random target selection in active tests.
3. Avoid shared mutable fixture state between tests.
4. Seed scenarios explicitly per test to make intent obvious.
5. Keep tests focused on behavior, not implementation details.

## 5. Markdown Standards

Base standard:

1. Write Markdown compatible with CommonMark-style parsing.
2. Follow practical markdownlint-style conventions for consistency.

Document structure:

1. Use exactly one `#` title per file.
2. Keep heading levels ordered (do not skip levels).
3. Avoid duplicate headings at the same level when avoidable.
4. Keep section titles concise and stable for reliable anchor links.

Lists and spacing:

1. Use `1.` numbering style for ordered lists in source Markdown.
2. Keep list indentation consistent within a section.
3. For nested lists, indent child bullets or child ordered items by four spaces under the parent list item.
4. Do not mix list marker styles at the same nesting depth unless intentional for semantics (for example ordered parent with unordered detail bullets).
5. Surround lists with blank lines when they are adjacent to paragraphs, tables, or code fences.
6. Keep list items concise; move long details into short follow-up lines or sublists.
7. When a paragraph label ending with a colon introduces a list (for example `Required elements:`), add one blank line before the list and one blank line after the list.
8. Do not rely on a single newline after a colon to create a new block, list, or paragraph in rendered Markdown; if structural separation is intended, use a blank line and the proper Markdown construct.
9. If content after a colon is meant to render as a list, heading, code block, or separate paragraph, write that construct explicitly instead of assuming the renderer will infer it from line breaks.

Code blocks and inline code:

1. Use fenced code blocks (triple backticks) instead of indentation-based blocks.
2. Always include a language info string on fenced blocks when practical (`csharp`, `ts`, `json`, `text`, etc.).
3. Use inline code for commands, paths, identifiers, relation keys, media types, and literal statuses.
4. In Markdown files, do not use hard tab characters; use spaces so rendered indentation is stable across viewers.

Tables and links:

1. Use pipe tables with consistent spacing around columns.
2. Keep table headers short and semantic.
3. Use relative repository links for internal document and file references.
4. Ensure link text is descriptive enough to understand destination context.

Template placeholders:

1. Use bracket placeholders (for example `[file link]`) in templates.
2. Do not use angle-bracket pseudo-tags for placeholders in Markdown templates.

Content quality guards:

1. Avoid raw HTML in Markdown unless there is a documented, unavoidable need.
2. Do not paste raw transcripts or large logs into primary governance templates; summarize and link to source artifacts.
3. Keep line wrapping and whitespace clean (no trailing spaces, no accidental tab/space mixing).

## 6. Change Hygiene

1. Keep PRs narrowly scoped to the requested feature/fix.
2. Do not reformat unrelated files.
3. Preserve existing public APIs unless the change explicitly requires an API update.
4. When changing contracts, update guards/types/factories/tests together.

## 7. Tooling and Enforcement

This repository uses a small set of automated checks. Some standards are enforced by tools, while others remain review expectations.

Automated checks:

1. TypeScript compile checks run through `npm run typecheck`.
2. TypeScript lint rules run through `npm run lint:ts` using ESLint.
3. Markdown lint rules run through `npm run lint:md` using markdownlint.
4. The full lint pass runs through `npm run lint`.

Current tool coverage:

1. ESLint currently enforces braces for control flow, `const` preference, strict equality, and no `var`.
2. TypeScript itself enforces type syntax and compile-time correctness.
3. Markdownlint enforces basic structure, spacing, heading, list, and fence consistency.

Review-only standards:

1. JSDoc completeness is currently review-enforced.
2. File responsibility and function complexity are currently review-enforced.
3. Architectural boundary discipline is currently review-enforced.

Maintenance guidance:

1. Prefer adding low-noise lint rules that match actual team practice.
2. Do not enable rules that cause broad churn unless the repo is being intentionally cleaned up.
3. When a rule becomes stable team practice, prefer enforcing it in tooling rather than leaving it only in documentation.
