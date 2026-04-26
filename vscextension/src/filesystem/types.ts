import type { Dirent } from "node:fs";

/**
 * Encodings supported by filesystem text reads.
 */
export type FilesystemTextEncoding = BufferEncoding;

/**
 * Options for reading text files.
 */
export interface ReadTextOptions {
  encoding?: FilesystemTextEncoding;
}

/**
 * Options for directory listing.
 */
export interface ListDirectoryOptions {
  withFileTypes?: boolean;
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
