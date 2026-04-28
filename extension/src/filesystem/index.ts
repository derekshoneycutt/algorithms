export type { IFilesystem } from "./IFilesystem";
export { createFilesystem, joinHomePath } from "./filesystem";
export type {
  CanaryResult,
  EligibilityStatus,
  MarkerPresenceMap,
  WorkspaceEligibilityEvaluation,
  WorkspaceEligibilityState,
} from "./eligibilityTypes";
export {
  invalidateCanaryCache,
  isSupportedSidebarFolder,
  resolveEligibilityState,
  resolveSidebarState,
} from "./eligibilityResolver";
export type { IEligibilityResolver } from "./IEligibilityResolver";
export { createEligibilityResolver } from "./eligibilityResolverProvider";
export type {
  CreateFilesystemInput,
  DeletePathOptions,
  FilesystemCacheOptions,
  FilesystemStateBridge,
  FilesystemTextEncoding,
  ListDirectoryOptions,
  ListDirectoryResult,
  PathLookupOptions,
  ReadTextOptions,
} from "./types";
