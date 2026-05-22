/// <reference lib="dom" />

import { html, render, TemplateResult } from "lit";

export interface WebviewScaffoldConfig {
  appRootId: string;
  viewTitle: string;
  viewDescription: string;
  ariaLabel: string;
}

/**
 * Creates the shared scaffold template for a webview.
 *
 * @param {WebviewScaffoldConfig} config Scaffold configuration.
 * @returns {TemplateResult} Renderable Lit template.
 */
export function createWebviewScaffoldTemplate(
  config: WebviewScaffoldConfig,
): TemplateResult {
  return html`
    <main class="panel" aria-label="${config.ariaLabel}">
      <section class="section">
        <header class="sectionHeader">
          <h2 class="sectionTitle">${config.viewTitle}</h2>
        </header>
        <p class="panelDescription">${config.viewDescription}</p>
      </section>
    </main>
  `;
}

/**
 * Mounts a shared scaffold template into a webview root container.
 *
 * @param {WebviewScaffoldConfig} config Scaffold configuration.
 * @returns {void}
 */
export function mountWebviewScaffold(config: WebviewScaffoldConfig): void {
  const appRootElement = document.getElementById(config.appRootId);
  if (appRootElement === null) {
    return;
  }

  render(createWebviewScaffoldTemplate(config), appRootElement);
}
