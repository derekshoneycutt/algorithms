# Algorithms Module Spec

Implementation spec for algorithm discovery, implementation indexing, problem-row evaluation, standard library enumeration, root path resolution, and language-flag persistence.

Related sources of truth:

1. Ownership boundaries: `../ArchitectureSummary.md`
2. Dependency contracts: `../DependencyContracts.md`

This spec defines behavior details only and does not restate architecture or dependency policy.

## Table of Contents

- [1. Scope](#1-scope)
- [2. Internal Structure](#2-internal-structure)
- [3. Root Path Resolution](#3-root-path-resolution)
- [4. Discovery and Listing](#4-discovery-and-listing)
- [5. Implementation Enumeration](#5-implementation-enumeration)
- [6. Problem Row Evaluation](#6-problem-row-evaluation)
- [7. File Lookup](#7-file-lookup)
- [8. Standard Library Enumeration](#8-standard-library-enumeration)
- [9. Cache Invalidation](#9-cache-invalidation)
- [10. Flagged Languages Persistence](#10-flagged-languages-persistence)
- [11. Observability Integration](#11-observability-integration)
- [12. IRootPathResolver](#12-irootpathresolver)
- [13. Verification Checklist](#13-verification-checklist)

## 1. Scope

In scope:

1. Lazy resolution of the algorithms source root (`src/`) and stdlib root (`stdlib/`) from workspace folder paths.
2. Category and algorithm directory listing.
3. Per-language implementation enumeration including representative file selection and `_include` directory handling.
4. Problem-row evaluation for the Problems tree view mode.
5. Reverse file-path lookup (`getImplementationByFilePath`).
6. Standard library directory listing.
7. Cache invalidation at algorithm, category, and full levels.
8. `.flag-lang` file read and write for language flagging.
9. `IRootPathResolver` provider contract for conductor and commandline use.

Out of scope:

1. Tree data provider rendering and node construction (owned by `views` module).
2. Intent reactions and run orchestration (owned by `conductor` module).
3. Language key registry and file-extension normalization (owned by `languages` module).
4. Filesystem abstraction (owned by `filesystem` module).

## 2. Internal Structure

| File | Responsibility |
|---|---|
| `IAlgorithmsIndex.ts` | DI contract for the domain index; all dependency types for construction |
| `algorithmsIndex.ts` | `createAlgorithmsIndex` factory with all caching and lazy resolution logic |
| `IRootPathResolver.ts` | DI contract for root path resolution used by external modules |
| `rootPathResolver.ts` | `createRootPathResolver` factory backed by the same resolution logic |
| `flaggedLanguages.ts` | `.flag-lang` file read/write helpers and `IFlaggedLanguagesService` contract |
| `types.ts` | Shared domain types: `AlgorithmCategory`, `AlgorithmEntry`, `AlgorithmImplementation`, `AlgorithmFileLookup`, `StandardLibEntry` |
| `index.ts` | Module barrel export |

## 3. Root Path Resolution

### 3.0 Algorithms source root

Resolution order for `src/` root from a list of workspace folder paths:

1. For each workspace folder path (in order), call `filesystem.realpath` then check whether `<realpath>/src` is a directory. Return the first match.
2. If no folder has a sibling `src/`, check whether the folder's realpath itself contains a `src` segment in the path. Return the first match.
3. Return `null` when no root is found.

### 3.1 Stdlib root

Resolution order for `stdlib/` root from a list of workspace folder paths:

1. For each workspace folder path, check whether `<realpath>/stdlib` is a directory. Return the first match.
2. When the folder path contains a `src` segment, walk up to find the repository root (the ancestor named `src`'s parent). Check `<repositoryRoot>/stdlib`. Return the first match.
3. Return `null` when no stdlib root is found.

### 3.2 Lazy caching

1. Both roots are resolved on first access and cached for the lifetime of the index instance.
2. `undefined` means "not yet resolved"; `null` means "resolved but not found".
3. Root cache is cleared on a full `clearCache()` call with no argument.
4. Root cache is **not** cleared on scoped `clearCache(targetPath)` calls, since root paths do not change with individual file mutations.

### 3.3 IRootPathResolver resolution order

`IRootPathResolver.resolveAlgorithmsRoot` and `resolveStdlibRoot` follow the same resolution logic but accept an optional `owningWorkspaceFolderPath` hint. When supplied, the owning folder is tried first before the remaining workspace folders.

## 4. Discovery and Listing

### 4.0 Category listing (`getCategories`)

1. Lists the direct subdirectories of the algorithms source root.
2. Excludes entries where `isDirectory()` is false.
3. Excludes names beginning with `.` (hidden).
4. Excludes names whose trimmed lowercase value is `"output"`.
5. Sorts results by name (locale compare).
6. Caches the result keyed by the canonical root path.
7. Returns shallow object copies from the cache; callers receive independent value objects.

### 4.1 Algorithm listing (`getAlgorithms`)

1. Lists the direct subdirectories of the given category path.
2. Applies the same exclusion rules as category listing (hidden, `output`).
3. Additionally excludes names matching the `{key}_include` pattern (trailing `_include` after a non-empty prefix).
4. Sorts results by name (locale compare).
5. Caches results keyed by canonical category path.
6. Returns shallow object copies.

### 4.2 Directory listing internals

1. `listDirents` always calls `filesystem.listDirectory` with `{ withFileTypes: true }`.
2. Returns an empty array when the directory does not exist or listing fails.
3. Sorts directories before files; within the same kind, sorts by name (locale compare).

## 5. Implementation Enumeration

### 5.0 Overview

`getImplementations(algorithmPath)` returns all per-language implementations inside one algorithm directory.

### 5.1 Discovery

1. Lists all files in the algorithm directory (non-hidden, non-directory).
2. For each file, calls `languages.normalizeFileExtension(filePath)` to obtain a language key; files with no matching language key are skipped.
3. Groups file paths by language key.
4. Sorts language keys alphabetically; within a language, sorts file paths by locale compare.

### 5.2 Representative file selection

1. When a language has exactly one file, that file is the representative.
2. When multiple files exist, each file's base name (without extension) is scored against the algorithm directory base name using `scoreFileBasenameForAlgorithmName`.
3. Scoring priorities (lower is better):
   - 0: exact match
   - 1: case-insensitive match
   - 2: alphanumeric-normalized match
   - 3: algorithm name ends with file name (normalized)
   - 4: algorithm name contains file name (normalized)
   - 5: file name contains algorithm name (normalized)
   - 99: no match
4. Ties broken by locale compare on full file path.

### 5.3 Include directories

1. For each language key, checks whether `<algorithmPath>/<languageKey>_include/` is a directory.
2. When present, lists non-hidden files inside the include directory whose extension resolves to the same language key.
3. Include file paths are sorted by locale compare.
4. `hasIncludes` is `true` when at least one include file was found.

### 5.4 Flagged languages

1. `readFlaggedLanguageKeys` reads `.flag-lang` from the algorithm directory.
2. Each line is trimmed and lowercased; empty lines are ignored.
3. Returns a `Set<string>` of flagged language keys.
4. `isFlagged` on each `AlgorithmImplementation` is set from this set.

### 5.5 Caching

1. Implementation lists are cached keyed by canonical algorithm path.
2. Returned values are always shallow copies with `filePaths` and `includeFilePaths` array-spread.
3. When an implementation list is built, `cacheFileLookupEntries` is called for each implementation, populating the reverse file-path map.

## 6. Problem Row Evaluation

### 6.0 Definition

`hasProblemRowsForAlgorithm(algorithmPath, viewMode)` returns `true` when at least one "problem row" would be displayed for the given algorithm in the given tree view mode.

- **`"files"` view mode**: a problem row exists when any implementation has `isFlagged: true`.
- **`"language"` view mode**: a problem row exists when any implementation is flagged, or when the known-languages set has at least one language key absent from the algorithm's implementations.

### 6.1 Cache key

The cache key is `"<canonicalAlgorithmPath>|<viewMode>"`.

### 6.2 Resolution flow

1. Check `problemRowsByAlgorithmAndViewMode` for a cached boolean. Return immediately on hit.
2. Check `pendingProblemRowsByAlgorithmAndViewMode` for an in-flight promise. Await and return the pending result on hit (in-flight deduplication).
3. On a full miss: construct and store a new resolution promise in the pending map, then `await` it.
4. On promise resolution, store the boolean in the settled cache, remove from the pending map, and return the result.
5. On promise rejection, remove from the pending map and rethrow.

### 6.3 Language-mode evaluation

1. Calls `getImplementations(algorithmPath)` to obtain the full implementation list.
2. Calls `languages.getLanguageKeys()` to obtain the full known-language key set.
3. A missing-language check: if any known language key is absent from the implementation list and is not disabled, returns `true`.
4. A flagged check: if any implementation has `isFlagged: true`, returns `true`.
5. Returns `false` only when neither condition is met.

## 7. File Lookup

### 7.0 `getImplementationByFilePath`

Returns an `AlgorithmFileLookup` descriptor for a given absolute file path, or `null` when not found.

### 7.1 Cache population

1. Populated as a side effect of `getImplementations`: each main file, implementation file, and include file gets an entry.
2. Keyed by absolute file path.
3. `fileKind` is `"main"` for the representative file, `"implementation"` for other files in the algorithm root, and `"include"` for files inside `_include/` directories.

### 7.2 Cache lookup

1. `getImplementationByFilePath` first checks `fileLookupByPath`.
2. On a miss, calls `getImplementations` for the file's parent directory to populate the cache, then re-checks.
3. Returns a shallow copy via spread; callers receive independent value objects.

### 7.3 Tracked paths

`filePathsByAlgorithmPath` maps algorithm directory path to the `Set<string>` of all file paths that were cached during `getImplementations` for that directory. Used during scoped cache eviction to clean up stale file-lookup entries.

## 8. Standard Library Enumeration

### 8.0 `getStandardLibraryEntries`

Returns visible entries (directories and supported files) under a stdlib directory.

1. When `dirPath` is omitted, the stdlib root is used.
2. When the stdlib root is `null`, returns an empty array.
3. Lists all entries via `listDirents`.
4. Excludes hidden names.
5. Excludes files with `.md` or `.sh` extensions.
6. Includes directories and any file whose extension is not excluded.
7. Caches results keyed by the canonical directory path.
8. Returns shallow object copies.

## 9. Cache Invalidation

### 9.0 `clearCache(targetPath?)`

When called with no argument, `clearCache()` performs a full cache flush:
- Resets `cachedAlgorithmsRoot` and `cachedStdlibRoot` to `undefined`.
- Clears all five discovery caches: `categoriesByRoot`, `algorithmsByCategoryPath`, `implementationsByAlgorithmPath`, `fileLookupByPath`, `filePathsByAlgorithmPath`.
- Clears both problem-row caches: `problemRowsByAlgorithmAndViewMode`, `pendingProblemRowsByAlgorithmAndViewMode`.
- Clears `standardLibraryEntriesByPath`.

### 9.1 Scoped invalidation

When `clearCache(targetPath)` is called with a path:

1. Check whether `targetPath` is a known algorithm directory (key in `implementationsByAlgorithmPath`). If yes, apply algorithm-level eviction:
   - Delete `implementationsByAlgorithmPath[targetPath]`.
   - Delete all problem-row cache entries (both `files` and `language` keys) for the algorithm.
   - Delete all in-flight pending problem-row entries for the algorithm.
   - Delete all `fileLookupByPath` entries tracked under the algorithm.
   - Delete `filePathsByAlgorithmPath[targetPath]`.

2. Otherwise, check whether `path.dirname(targetPath)` is a known algorithm directory. If yes, apply algorithm-level eviction using the parent directory.

3. Otherwise, check whether `targetPath` is a known category directory (key in `algorithmsByCategoryPath`). If yes, apply category-level eviction:
   - Delete `algorithmsByCategoryPath[targetPath]`.
   - Delete all problem-row cache entries for algorithm paths that begin with `<targetPath><sep>`.

4. When none of the above match, fall back to a full cache flush.

### 9.2 Root cache persistence

Scoped cache eviction never resets `cachedAlgorithmsRoot` or `cachedStdlibRoot`. Root paths are stable within a session.

## 10. Flagged Languages Persistence

### 10.0 File location

Flagged language keys are stored in `<algorithmDirectory>/.flag-lang`. The constant `FLAGGED_LANGUAGES_FILE_NAME = ".flag-lang"` is the canonical file name.

### 10.1 Read

1. Read file content via `IFilesystem.readText`.
2. When the file does not exist (`null` result), return an empty `Set`.
3. Split on `\r?\n`, trim each line, lowercase, filter empty lines.
4. Return the resulting `Set<string>`.

### 10.2 Write

1. Join the provided `ReadonlySet<string>` values with newline.
2. Write via `IFilesystem.writeText`.
3. Callers are responsible for re-invalidating the relevant `getImplementations` cache entry after writing.

### 10.3 `IFlaggedLanguagesService`

Provides `readFlaggedLanguageKeys` and `writeFlaggedLanguageKeys` as a DI contract for callers that cannot import from the algorithms module directly.

## 11. Observability Integration

The index accepts an optional `observability?: IObservability` in `AlgorithmsIndexDependencies`. All instrumentation is gated on `observability` being present.

| Event | Kind | Emitted when |
|---|---|---|
| `index.problems.cache.hit` | increment | `hasProblemRowsForAlgorithm` returns from settled cache |
| `index.problems.cache.pending` | increment | `hasProblemRowsForAlgorithm` joins an in-flight dedup promise |
| `index.problems.cache.miss` | increment | `hasProblemRowsForAlgorithm` starts a new resolution |
| `index.problems.evaluation.duration` | time | Full resolution time for one cache-miss evaluation |

Tags on all events include `viewMode`.

## 12. IRootPathResolver

`IRootPathResolver` is the external-facing DI contract for root resolution. It is used by conductor and commandline modules that need root paths without importing from algorithms directly.

### 12.1 Workspace folder resolution order

When `owningWorkspaceFolderPath` is supplied to either resolver method, it is tried first. All other workspace folders follow in their original order. When no owning folder is specified, the original order is used unchanged.

### 12.2 Relationship to algorithmsIndex root resolution

`IRootPathResolver` uses the same underlying path logic as `algorithmsIndex.ts`. The two implementations are independent; `IRootPathResolver` does **not** share cache state with any `IAlgorithmsIndex` instance.

## 13. Verification Checklist

### Root resolution

- [ ] `getCategories` returns empty array when no algorithms root is found.
- [ ] Root is resolved at most once per index instance lifetime (subsequent calls use cached value).
- [ ] Stdlib root resolved independently of algorithms root; one can be `null` while the other is not.
- [ ] `IRootPathResolver` tries `owningWorkspaceFolderPath` first when supplied.

### Discovery and listing

- [ ] Hidden names (leading `.`) excluded from categories, algorithms, and stdlib entries.
- [ ] `output` directory excluded from category and algorithm listings.
- [ ] `_include` directories excluded from algorithm listings.
- [ ] Returned items are shallow copies; mutations do not affect the cache.

### Implementation enumeration

- [ ] Files with no matching language key are silently skipped.
- [ ] Language keys sorted alphabetically; file paths within a language sorted by locale compare.
- [ ] Representative file selected by scoring; ties broken by full path locale compare.
- [ ] `_include` directory scanned only for files matching the same language key.
- [ ] `hasIncludes: false` when include directory does not exist or is empty.
- [ ] `isFlagged` reflects `.flag-lang` content at enumeration time.
- [ ] Returned implementations have `filePaths` and `includeFilePaths` as independent array copies.

### Problem row evaluation

- [ ] Cache hit returns immediately without calling `getImplementations`.
- [ ] Parallel calls for the same key join the same in-flight promise (deduplication).
- [ ] `"files"` mode: returns `true` only when at least one implementation is flagged.
- [ ] `"language"` mode: returns `true` when any known language is absent or any implementation is flagged.
- [ ] Failed evaluation removes entry from pending map and rethrows.

### File lookup

- [ ] `getImplementationByFilePath` returns `null` for an unknown file path that is not inside any cached algorithm directory.
- [ ] `fileKind` is `"main"` for representative file, `"implementation"` for other root files, `"include"` for include-directory files.
- [ ] Returned descriptor is a shallow copy.

### Cache invalidation

- [ ] `clearCache()` with no argument resets all caches including roots.
- [ ] `clearCache(targetPath)` for a known algorithm directory evicts only that algorithm.
- [ ] `clearCache(targetPath)` for a file inside a known algorithm directory evicts the parent algorithm.
- [ ] `clearCache(targetPath)` for a known category directory evicts only that category and its problem-row entries.
- [ ] Unrecognized path falls back to full flush.
- [ ] Root cache (`cachedAlgorithmsRoot`, `cachedStdlibRoot`) survives scoped eviction.

### Flagged languages

- [ ] `.flag-lang` read returns empty `Set` when file does not exist.
- [ ] Each line is trimmed and lowercased before insertion into the set.
- [ ] Empty lines after trimming are excluded.
- [ ] Write joins keys with newline and delegates to `IFilesystem.writeText`.
