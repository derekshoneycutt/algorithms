import * as vscode from "vscode";

export class TemplateLoader {
  private replacementValues: Record<string, string>;

  public constructor(
    replacements: Record<string, string>) {
    this.replacementValues = replacements;
  }

  private overwritePlaceholders(input: string): string {
    let replacedText = input;
    const pattern = /\{\{\{(.*?)\}\}\}/g;
    while (pattern.test(replacedText)) {
      replacedText = replacedText.replace(pattern, (_, captured) => {
        if (captured in this.replacementValues) {
          return this.replacementValues[captured];
        }
        return `&#123;&#123;&#123;${captured}&#125;&#125;&#125;`;
      });
    }
    return replacedText;
  }

  public async loadFile(
    extensionUri: vscode.Uri,
    viewName: string,
    htmlFileName: string): Promise<string> {

    const htmlUri = vscode.Uri.joinPath(
      extensionUri,
      "src",
      "views",
      viewName,
      "ui",
      htmlFileName,
    );
    const htmlBytes = await vscode.workspace.fs.readFile(htmlUri);
  
    const htmlString = new TextDecoder("utf-8").decode(htmlBytes);

    return this.overwritePlaceholders(htmlString);
  }
}
