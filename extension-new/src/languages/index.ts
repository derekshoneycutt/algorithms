import * as vscode from 'vscode';

export type LanguagesDataChangeScope = "algorithms" | "stdlib" | "workspace";
export type LanguagesDataChangeReason = "fs-create" | "fs-delete" | "flag-change" | "workspace-change";

export interface ILanguagesDataChangeEvent {
  scope: LanguagesDataChangeScope;
  reason: LanguagesDataChangeReason;
  path: string | undefined;
}

export interface IAlgorithmCategory {
  displayName: string;
  directoryPath: string;
}

export interface IAlgorithmDirectory {
  displayName: string;
  directoryPath: string;
}

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

export interface IAlgorithmImplementationChild {
  displayName: string;
  filePath: string;
}

export interface IStdLibCategory {
  displayName: string;
  directoryPath: string;
}

export interface IStdLibCategoryFile {
  displayName: string;
  filePath: string;
  languageIconFileName: string | undefined;
}

export interface ILanguages extends vscode.Disposable {

  activate(context: vscode.ExtensionContext) : void;

  subscribeToDataChanges(
    listener: (event: ILanguagesDataChangeEvent) => void,
  ) : vscode.Disposable;

  isRecognizedFile(filePath: string) : Promise<boolean>;
  
  getAlgorithmCategories() : Promise<IAlgorithmCategory[]>;

  getAlgorithmsInCategory(
    category: IAlgorithmCategory) : Promise<IAlgorithmDirectory[]>;

  getAlgorithmImplementations(
    algorithmDirectory: IAlgorithmDirectory) : Promise<IAlgorithmImplementation[]>;

  getAlgorithmImplementationChildren(
    algorithmDirectory: IAlgorithmDirectory,
    implementation: IAlgorithmImplementation) : Promise<IAlgorithmImplementationChild[]>;

  setAlgorithmImplementationFlagged(
    algorithmDirectory: IAlgorithmDirectory,
    implementation: IAlgorithmImplementation,
    isFlagged: boolean) : Promise<void>;
  
  getStandardLibraryCategories() : Promise<IStdLibCategory[]>;

  getStandardLibraryFiles(
    category: IStdLibCategory) : Promise<IStdLibCategoryFile[]>;
}
