import * as vscode from 'vscode';

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

  register(context: vscode.ExtensionContext) : void;
  
  getAlgorithmCategories() : IAlgorithmCategory[];

  getAlgorithmsInCategory(category: IAlgorithmCategory) : IAlgorithmDirectory[];

  getAlgorithmImplementations(algorithmDirectory: IAlgorithmDirectory) : IAlgorithmImplementation[];

  getAlgorithmImplementationChildren(
    algorithmDirectory: IAlgorithmDirectory,
    implementation: IAlgorithmImplementation) : IAlgorithmImplementationChild[];
  
  getStandardLibraryCategories() : IStdLibCategory[];

  getStandardLibraryFiles(category: IStdLibCategory) : IStdLibCategoryFile[];
}
