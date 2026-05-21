import * as vscode from 'vscode';

/**
 * Top-level scopes used when broadcasting language data changes.
 */
export type LanguagesDataChangeScope = "algorithms" | "stdlib" | "workspace";

/**
 * Reasons used when broadcasting language data changes.
 */
export type LanguagesDataChangeReason = "fs-create" | "fs-delete" | "flag-change" | "workspace-change";

/**
 * Language data-change payload emitted to subscribers.
 */
export interface ILanguagesDataChangeEvent {
  scope: LanguagesDataChangeScope;
  reason: LanguagesDataChangeReason;
  path: string | undefined;
}

/**
 * One top-level algorithm category.
 */
export interface IAlgorithmCategory {
  displayName: string;
  directoryPath: string;
}

/**
 * One algorithm directory inside a category.
 */
export interface IAlgorithmDirectory {
  displayName: string;
  directoryPath: string;
}

/**
 * One language implementation row under an algorithm.
 */
export interface IAlgorithmImplementation {
  languageKey: string;
  languageDisplayName: string;
  languageIconFileName: string;
  isFlagged: boolean;
  hasImplementation: boolean;
  hasChildren: boolean;
  fileName: string | undefined;
  filePath: string | undefined;
}

/**
 * One child file under an algorithm implementation row.
 */
export interface IAlgorithmImplementationChild {
  displayName: string;
  filePath: string;
}

/**
 * One top-level Standard Library category.
 */
export interface IStdLibCategory {
  displayName: string;
  directoryPath: string;
}

/**
 * One file under a Standard Library category.
 */
export interface IStdLibCategoryFile {
  displayName: string;
  filePath: string;
  languageIconFileName: string | undefined;
}

/**
 * One runtime constraint entry describing where a language can run.
 */
export interface ISupportedLanguageConstraint {
  platform: string[];
  arch: string[];
  note: string | undefined;
}

/**
 * One supported language descriptor from generated language metadata.
 */
export interface ISupportedLanguage {
  key: string;
  displayName: string;
  extension: string;
  sampleOutputTemplate: string;
  iconFileName: string;
  languageIds: string[];
  fileExtensions: string[];
  smokeVisible: boolean;
  smokeDefaultEnabled: boolean;
  smokeReasonIfDisabledByDefault: string | undefined;
  hostCanRun: boolean;
  hostCannotRunReason: string | undefined;
  runConstraints: ISupportedLanguageConstraint[];
}

/**
 * Contract for language/category discovery and state updates.
 */
export interface ILanguages extends vscode.Disposable {

  /**
   * Activates language discovery and workspace watchers.
   *
   * @param {vscode.ExtensionContext} context Extension lifecycle context.
   * @returns {void} No return value.
   */
  activate(context: vscode.ExtensionContext) : void;

  /**
   * Subscribes to language data-change events.
   *
   * @param {(event: ILanguagesDataChangeEvent) => void} listener Listener invoked on data changes.
   * @returns {vscode.Disposable} Subscription disposable.
   */
  subscribeToDataChanges(
    listener: (event: ILanguagesDataChangeEvent) => void,
  ) : vscode.Disposable;

  /**
   * Returns whether a file path is recognized by this extension.
   *
   * @param {string} filePath Absolute file path to evaluate.
   * @returns {Promise<boolean>} True when the file is recognized.
   */
  isRecognizedFile(filePath: string) : Promise<boolean>;

  /**
   * Returns all discovered algorithm categories.
   *
   * @returns {Promise<IAlgorithmCategory[]>} Discovered algorithm categories.
   */
  getAlgorithmCategories() : Promise<IAlgorithmCategory[]>;

  /**
   * Returns all algorithms in one category.
   *
   * @param {IAlgorithmCategory} category Category to enumerate.
   * @returns {Promise<IAlgorithmDirectory[]>} Algorithms in the provided category.
   */
  getAlgorithmsInCategory(
    category: IAlgorithmCategory) : Promise<IAlgorithmDirectory[]>;

  /**
   * Returns implementation rows for one algorithm directory.
   *
   * @param {IAlgorithmDirectory} algorithmDirectory Algorithm directory to inspect.
   * @returns {Promise<IAlgorithmImplementation[]>} Implementation rows.
   */
  getAlgorithmImplementations(
    algorithmDirectory: IAlgorithmDirectory) : Promise<IAlgorithmImplementation[]>;

  /**
   * Returns child files for one algorithm implementation row.
   *
   * @param {IAlgorithmDirectory} algorithmDirectory Parent algorithm directory.
   * @param {IAlgorithmImplementation} implementation Implementation row to inspect.
   * @returns {Promise<IAlgorithmImplementationChild[]>} Child files for the row.
   */
  getAlgorithmImplementationChildren(
    algorithmDirectory: IAlgorithmDirectory,
    implementation: IAlgorithmImplementation) : Promise<IAlgorithmImplementationChild[]>;

  /**
   * Persists one flagged/unflagged state change for an algorithm implementation.
   *
   * @param {IAlgorithmDirectory} algorithmDirectory Parent algorithm directory.
   * @param {IAlgorithmImplementation} implementation Implementation row to update.
   * @param {boolean} isFlagged True to mark flagged, false to clear flagged.
   * @returns {Promise<void>} Resolves when the update is persisted.
   */
  setAlgorithmImplementationFlagged(
    algorithmDirectory: IAlgorithmDirectory,
    implementation: IAlgorithmImplementation,
    isFlagged: boolean) : Promise<void>;

  /**
   * Returns all discovered Standard Library categories.
   *
   * @returns {Promise<IStdLibCategory[]>} Standard Library categories.
   */
  getStandardLibraryCategories() : Promise<IStdLibCategory[]>;

  /**
   * Returns all files in one Standard Library category.
   *
   * @param {IStdLibCategory} category Category to enumerate.
   * @returns {Promise<IStdLibCategoryFile[]>} Files in the provided category.
   */
  getStandardLibraryFiles(
    category: IStdLibCategory) : Promise<IStdLibCategoryFile[]>;

  /**
   * Returns all generated supported languages.
   *
   * @returns {Promise<ISupportedLanguage[]>} Supported language descriptors.
   */
  getSupportedLanguages() : Promise<ISupportedLanguage[]>;
}
