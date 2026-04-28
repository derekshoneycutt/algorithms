import type { Dirent } from "node:fs";

/**
 * Encodings supported by filesystem text reads.
 */
export type FilesystemTextEncoding = BufferEncoding;

/**
 * Shared cache-control options for filesystem reads.
 */
export interface FilesystemCacheOptions {
  useCache?: boolean;
}

/**
 * Options for reading text files.
 */
export interface ReadTextOptions {
  encoding?: FilesystemTextEncoding;
  useCache?: boolean;
}

/**
 * Options for checking one path type.
 */
export type PathLookupOptions = FilesystemCacheOptions;

/**
 * Options for directory listing.
 */
export interface ListDirectoryOptions extends FilesystemCacheOptions {
  withFileTypes?: boolean;
}

/**
 * Options for deleting files or directories.
 */
export interface DeletePathOptions {
  recursive?: boolean;
  useTrash?: boolean;
}

/**
 * Optional host-state bridge for filesystem cache and operation metadata.
 */
export interface FilesystemStateBridge {
  onCacheTtlSet?(ttlMs: number): void;
  onCacheCleared?(targetPath?: string): void;
  onStatCacheEntrySet?(
    targetPath: string,
    exists: boolean,
    kind: "file" | "directory" | "other" | "missing",
    updatedAt: number
  ): void;
  onDirectoryCacheEntrySet?(
    targetPath: string,
    entryCount: number,
    updatedAt: number
  ): void;
  onPendingOperationSet?(
    operationId: string,
    operationType: string,
    targetPath: string,
    status: "pending",
    updatedAt: number
  ): void;
  onPendingOperationCleared?(operationId: string): void;
  onOperationErrorSet?(targetPath: string, message: string): void;
}

/**
 * Optional construction input for filesystem module behavior.
 */
export interface CreateFilesystemInput {
  cacheTtlMs?: number;
  stateBridge?: FilesystemStateBridge;
}

/**
 * Directory listing result when `withFileTypes` is true.
 */
export type ListDirectoryDirentResult = Dirent[];

/**
 * Directory listing result when `withFileTypes` is false or omitted.
 */
export type ListDirectoryNameResult = string[];

/**
 * Directory listing result union.
 */
export type ListDirectoryResult =
  | ListDirectoryDirentResult
  | ListDirectoryNameResult;
