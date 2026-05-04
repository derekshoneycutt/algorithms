import type { IAlgorithmsIndex } from "../../algorithms";
import type { ILanguages } from "../../languages";
import type { WorkspaceTreeNode } from "./types";

/**
 * Filter mode for tree visibility.
 */
type FilterMode = "all" | "problems";

/**
 * View mode for tree presentation.
 */
type ViewMode = "files" | "language";

/**
 * Returns true when one algorithm has missing or flagged language rows.
 *
 * @param {IAlgorithmsIndex} algorithmsIndex Algorithms index dependency.
 * @param {ILanguages} languages Languages dependency.
 * @param {string} algorithmPath Algorithm path.
 * @param {ViewMode} viewMode Current view mode.
 * @returns {Promise<boolean>} True when the algorithm has at least one problem row.
 */
export async function hasProblemRowsForAlgorithm(
  algorithmsIndex: IAlgorithmsIndex,
  algorithmPath: string,
  viewMode: ViewMode
): Promise<boolean> {
  return algorithmsIndex.hasProblemRowsForAlgorithm(algorithmPath, viewMode);
}

/**
 * Filters rows to include only problem rows when in problems mode.
 *
 * @param {WorkspaceTreeNode[]} rows Rows to filter.
 * @param {FilterMode} filterMode Current filter mode.
 * @returns {WorkspaceTreeNode[]} Filtered rows.
 */
export function filterProblemRows(
  rows: WorkspaceTreeNode[],
  filterMode: FilterMode
): WorkspaceTreeNode[] {
  if (filterMode !== "problems") {
    return rows;
  }
  return rows.filter((row) => row.isMissing === true || row.isFlagged === true);
}

/**
 * Gets child nodes for the root element (returns categories).
 *
 * @param {IAlgorithmsIndex} algorithmsIndex Algorithms index dependency.
 * @param {ILanguages} languages Languages dependency.
 * @param {FilterMode} filterMode Current filter mode.
 * @param {ViewMode} viewMode Current view mode.
 * @returns {Promise<WorkspaceTreeNode[]>} Root level category nodes.
 */
export async function getChildrenRoot(
  algorithmsIndex: IAlgorithmsIndex,
  languages: ILanguages,
  filterMode: FilterMode,
  viewMode: ViewMode
): Promise<WorkspaceTreeNode[]> {
  const categories = await algorithmsIndex.getCategories();
  const categoryRows = categories.map((category) => ({
    kind: "directory" as const,
    filePath: category.path,
  }));

  if (filterMode !== "problems") {
    return categoryRows;
  }
  const hasProblemsByCategory = await Promise.all(categoryRows.map(async (row) => {
    const algorithms = await algorithmsIndex.getAlgorithms(row.filePath);
    if (algorithms.length === 0) {
      return false;
    }

    const byAlgorithm = await Promise.all(algorithms.map(async (algorithm) => {
      return hasProblemRowsForAlgorithm(algorithmsIndex, algorithm.path, viewMode);
    }));

    return byAlgorithm.some((value) => value);
  }));

  return categoryRows.filter((_, index) => hasProblemsByCategory[index]);
}

/**
 * Gets child nodes for a category directory (returns algorithm directories).
 *
 * @param {string} categoryPath Category directory path.
 * @param {IAlgorithmsIndex} algorithmsIndex Algorithms index dependency.
 * @param {ILanguages} languages Languages dependency.
 * @param {FilterMode} filterMode Current filter mode.
 * @param {ViewMode} viewMode Current view mode.
 * @returns {Promise<WorkspaceTreeNode[]>} Algorithm directory nodes.
 */
export async function getChildrenCategory(
  categoryPath: string,
  algorithmsIndex: IAlgorithmsIndex,
  languages: ILanguages,
  filterMode: FilterMode,
  viewMode: ViewMode
): Promise<WorkspaceTreeNode[]> {
  const algorithms = await algorithmsIndex.getAlgorithms(categoryPath);
  const algorithmRows = algorithms.map((algo) => ({
    kind: "algorithmDir" as const,
    filePath: algo.path,
  }));

  if (filterMode !== "problems") {
    return algorithmRows;
  }

  const hasProblemsByAlgorithm = await Promise.all(algorithmRows.map(async (row) => {
    return hasProblemRowsForAlgorithm(algorithmsIndex, row.filePath, viewMode);
  }));

  return algorithmRows.filter((_, index) => hasProblemsByAlgorithm[index]);
}

/**
 * Gets child nodes for an algorithm directory (returns language summaries or main files).
 *
 * @param {string} algorithmPath Algorithm directory path.
 * @param {IAlgorithmsIndex} algorithmsIndex Algorithms index dependency.
 * @param {ILanguages} languages Languages dependency.
 * @param {FilterMode} filterMode Current filter mode.
 * @param {ViewMode} viewMode Current view mode.
 * @returns {Promise<WorkspaceTreeNode[]>} Language summary or main file nodes.
 */
export async function getChildrenAlgorithmDir(
  algorithmPath: string,
  algorithmsIndex: IAlgorithmsIndex,
  languages: ILanguages,
  filterMode: FilterMode,
  viewMode: ViewMode
): Promise<WorkspaceTreeNode[]> {
  const documentationFiles = filterMode === "problems"
    ? []
    : await algorithmsIndex.getDocumentationFiles(algorithmPath);
  const documentationFolderRows: WorkspaceTreeNode[] = documentationFiles.length > 0
    ? [
        {
          kind: "docsFolder",
          filePath: algorithmPath,
          parentAlgorithmPath: algorithmPath,
          docsFileCount: documentationFiles.length,
        },
      ]
    : [];

  const implementations = await algorithmsIndex.getImplementations(algorithmPath);
  const implementationsByLanguage = new Map(
    implementations.map((implementation) => {
      return [implementation.languageKey, implementation] as const;
    })
  );

  if (viewMode === "language") {
    const languageRows = languages.getAll().map((languageRecord) => {
      const implementation = implementationsByLanguage.get(languageRecord.key);
      const isMissing = implementation === undefined;
      const isFlagged = implementation?.isFlagged === true;
      return {
        kind: "languageSummary" as const,
        filePath: implementation?.filePath ?? algorithmPath,
        filePathsByLanguage:
          implementation !== undefined
            ? { [implementation.languageKey]: implementation.filePaths }
            : undefined,
        languageKey: languageRecord.key,
        parentAlgorithmPath: algorithmPath,
        hasIncludes: (implementation?.includeFilePaths.length ?? 0) > 0,
        languageFileCount: (implementation?.filePaths.length ?? 0)
          + (implementation?.includeFilePaths.length ?? 0),
        isFlagged,
        isMissing,
        hasOpenTarget: implementation !== undefined,
      };
    });

    const filteredLanguageRows = filterProblemRows(languageRows, filterMode);
    return [...documentationFolderRows, ...filteredLanguageRows];
  }

  // FILES view: return main files and extra files
  const mainFileNodes = implementations.map((impl) => ({
    kind: "mainFile" as const,
    filePath: impl.filePath,
    filePathsByLanguage: { [impl.languageKey]: impl.filePaths },
    languageKey: impl.languageKey,
    parentAlgorithmPath: algorithmPath,
    isFlagged: impl.isFlagged,
    hasIncludes: impl.hasIncludes,
  }));

  const representativePathSet = new Set(
    implementations.map((implementation) => implementation.filePath)
  );
  const extraFilePaths = implementations
    .flatMap((implementation) => implementation.filePaths)
    .filter((filePath) => !representativePathSet.has(filePath))
    .sort((leftPath, rightPath) => leftPath.localeCompare(rightPath));

  const extraFileNodes = extraFilePaths.map((filePath) => ({
    kind: "file" as const,
    filePath,
    languageKey: languages.normalizeFileExtension(filePath),
    parentAlgorithmPath: algorithmPath,
    isFlagged: (() => {
      const languageKey = languages.normalizeFileExtension(filePath);
      if (languageKey === undefined) {
        return false;
      }
      return implementationsByLanguage.get(languageKey)?.isFlagged === true;
    })(),
  }));

  const fileRows = [...mainFileNodes, ...extraFileNodes];
  const filteredFileRows = filterProblemRows(fileRows, filterMode);
  return [...documentationFolderRows, ...filteredFileRows];
}

/**
 * Gets documentation file children for one docs folder row.
 *
 * @param {WorkspaceTreeNode} element Docs folder node.
 * @param {IAlgorithmsIndex} algorithmsIndex Algorithms index dependency.
 * @returns {Promise<WorkspaceTreeNode[]>} Documentation file nodes.
 */
export async function getChildrenDocsFolder(
  element: WorkspaceTreeNode,
  algorithmsIndex: IAlgorithmsIndex
): Promise<WorkspaceTreeNode[]> {
  const algorithmPath = element.parentAlgorithmPath ?? element.filePath;
  const documentationFiles = await algorithmsIndex.getDocumentationFiles(algorithmPath);

  return documentationFiles.map((filePath) => ({
    kind: "docsFile" as const,
    filePath,
    parentAlgorithmPath: algorithmPath,
  }));
}

/**
 * Gets include file children for a language summary or main file node.
 *
 * @param {WorkspaceTreeNode} element Language summary or main file node.
 * @param {IAlgorithmsIndex} algorithmsIndex Algorithms index dependency.
 * @returns {Promise<WorkspaceTreeNode[]>} Include file nodes.
 */
export async function getChildrenLanguageOrMainFile(
  element: WorkspaceTreeNode,
  algorithmsIndex: IAlgorithmsIndex
): Promise<WorkspaceTreeNode[]> {
  if (!element.languageKey || !element.parentAlgorithmPath) {
    return [];
  }

  const implementations = await algorithmsIndex.getImplementations(element.parentAlgorithmPath);
  const impl = implementations.find((i) => i.languageKey === element.languageKey);

  if (impl === undefined) {
    return [];
  }

  return impl.includeFilePaths.map((filePath) => ({
    kind: "file" as const,
    filePath,
    languageKey: element.languageKey,
    isIncludeFile: true,
  }));
}
