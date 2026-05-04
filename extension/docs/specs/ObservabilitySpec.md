# Observability Spec

Implementation spec for a lightweight observability boundary module.

Related sources of truth:

1. Ownership boundaries: ../ArchitectureSummary.md
2. Dependency contracts: ../DependencyContracts.md

This spec defines the project-standard observability architecture: one small observability provider contract with default low-overhead behavior, wired through bootstrap dependency injection.

## Table of Contents

- [1. Scope](#1-scope)
- [2. Goals and Non-Goals](#2-goals-and-non-goals)
- [3. Module Boundary and Ownership](#3-module-boundary-and-ownership)
- [4. Provider Contract](#4-provider-contract)
- [5. Event and Field Conventions](#5-event-and-field-conventions)
- [6. Performance and Sampling Rules](#6-performance-and-sampling-rules)
- [7. Wiring Plan](#7-wiring-plan)
- [8. Implementation Phases](#8-implementation-phases)
- [9. Implementation Status](#9-implementation-status)
- [10. Privacy and Safety Rules](#10-privacy-and-safety-rules)
- [11. Verification Checklist](#11-verification-checklist)

## 1. Scope

In scope:

1. A dedicated observability boundary module in extension/src/observability.
2. One provider contract for structured logging, counters, and timing.
3. Bootstrap construction in activator and interface injection into selected consumers.
4. Default sink behavior using VS Code log output and no-op controls.
5. Initial instrumentation points for tree performance, invalidation routing, and panel publish paths.

Out of scope:

1. Third-party telemetry SDK integration.
2. New user-facing notifications and message UX.
3. Large analytics schema design.
4. Re-architecting command or conductor policy flow.

## 2. Goals and Non-Goals

Goals:

1. Add practical visibility into extension behavior with low runtime overhead.
2. Keep observability separate from notifications and business logic.
3. Preserve contract-first dependency rules and bootstrap-only construction.
4. Enable future telemetry backends without changing call-site semantics.

Non-goals:

1. Logging every operation at high frequency.
2. Persisting sensitive local filesystem content.
3. Coupling observability to webview transport or UI rendering.

## 3. Module Boundary and Ownership

1. New module category placement: boundary and support module.
2. Module owns:
   - Structured log routing.
   - Counter and timing primitives.
   - Sampling and enablement checks.
3. Module must not own:
   - Workflow policy.
   - User-facing notification policy.
   - Canonical host state.

Rationale:

1. Notifications remain user-experience routing.
2. Observability remains internal diagnostics and performance insight.
3. This follows existing separation guidance in architecture and dependency docs.

## 4. Provider Contract

Contract shape (minimum viable):

1. log(level, eventName, fields)
2. increment(metricName, value, tags)
3. time(operationName, run, tags)
4. isEnabled(category)

Recommended type rules:

1. level is one of trace, debug, info, warn, error.
2. eventName and metricName are dotted identifiers.
3. fields and tags use flat key-value pairs.
4. time wraps sync or async work and auto-records duration.

Implementation notes:

1. Default implementation is lightweight and non-throwing.
2. All methods must fail open (never break caller behavior).
3. No-op implementation must be available for tests and opt-out.

## 5. Event and Field Conventions

Naming:

1. Prefix by domain area:
   - tree.*
   - index.*
   - watcher.*
   - panel.*
   - run.*
2. Keep names stable once introduced.

Field conventions:

1. Use low-cardinality fields by default.
2. Prefer booleans, enums, and bounded numeric values.
3. Avoid raw absolute paths in persistent events.
4. If path context is needed, use summarized descriptors:
   - pathRole: algorithm, stdlib, other
   - depthBucket: root, category, algorithm, file

Starter event list:

1. tree.problems.filter.duration
2. index.problems.cache.hit
3. index.problems.cache.miss
4. watcher.invalidation.accepted
5. watcher.invalidation.skipped
6. panel.snapshot.publish.duration
7. run.command.completed

## 6. Performance and Sampling Rules

1. Default level is info and above.
2. trace and debug are disabled by default.
3. High-frequency events must be sampled.
4. Sampling defaults:
   - tree and panel duration events sampled at low rate in normal mode.
   - warning and error events never sampled out.
5. Timing helper must avoid extra allocations on disabled paths.
6. Caller pattern:
   - check isEnabled when constructing expensive fields.
   - avoid string concatenation when disabled.

## 7. Wiring Plan

Bootstrap and contracts:

1. Add interface and factory exports in extension/src/observability.
2. Construct concrete implementation in activator.
3. Inject contract into modules that need instrumentation via existing input interfaces.
4. Do not create direct concrete imports from non-bootstrap modules.

Initial consumers:

1. algorithms index
   - problem-cache hit or miss counters.
   - problem evaluation timing.
2. conductor workspace invalidation
   - accepted or skipped invalidation decisions.
   - root-scope decision timing.
3. controls snapshot publishing
   - per-panel publish duration and lightweight counts.

Optional follow-up consumers:

1. command execution lifecycle summary.
2. tree reveal path resolution timing.

## 8. Implementation Phases

Phase 1:

1. Introduce observability module and no-op plus default sink implementations.
2. Wire through activator and type-safe contracts only.
3. Add minimal instrumentation to index problem-cache path.

Phase 2:

1. Add watcher invalidation instrumentation in conductor.
2. Add panel publish timing in controls channels.

Phase 3:

1. Tune sampling and level thresholds from real usage.
2. Add optional backend sink adapter if needed.

## 9. Implementation Status

Completed now:

1. Dedicated `observability` boundary module exists with provider contract and implementations.
2. Activator constructs a concrete category-gated provider via a static map in code.
3. Observability is injected through bootstrap wiring into consumers.
4. Algorithms index problem-cache path emits hit/miss/pending and evaluation timing events.
5. Conductor workspace invalidation emits accepted/skipped decisions and decision timing.
6. Controls channel snapshot publishing emits panel publish count and duration events.

Deferred:

1. Settings/env-driven category toggles.
2. External telemetry backend adapter.
3. Additional event families (`run.command.completed`, reveal timing, etc.).

## 10. Privacy and Safety Rules

1. Never log file contents.
2. Never log shell command output payloads by default.
3. Avoid storing raw user paths in persistent telemetry payloads.
4. Keep local debug logs bounded and level-gated.
5. All observability methods must be exception-safe and side-effect isolated.

## 11. Verification Checklist

- [x] Observability is implemented in a dedicated module, not notifications.
- [x] Non-bootstrap modules depend on observability interface only.
- [x] Activator constructs concrete observability implementation.
- [x] No-op implementation exists and is available for tests or opt-out.
- [x] High-frequency instrumentation uses category enablement guards.
- [x] Added events avoid sensitive data and high-cardinality payloads.
- [ ] Extension behavior is unchanged when observability is disabled.
- [ ] Performance overhead remains negligible on hot paths.
