import { html, render } from "lit";

/**
 * Shared UI core view model for status-oriented webview panels.
 */
export interface UiCoreStatusViewModel {
  title: string;
  description: string;
  status: string;
}

/**
 * Renders the shared Lit-based status panel template into a target element.
 *
 * @param {Element} target Render target.
 * @param {UiCoreStatusViewModel} viewModel UI core status view model.
 * @returns {void}
 */
export function renderUiCoreStatusPanel(
  target: HTMLElement,
  viewModel: UiCoreStatusViewModel
): void {
  render(
    html`
      <div class="ui-core-card" data-status="${viewModel.status}">
        <p class="ui-core-label">${viewModel.title}</p>
        <p class="ui-core-description">${viewModel.description}</p>
        <p class="ui-core-status" aria-live="polite">Status: ${viewModel.status}</p>
      </div>
    `,
    target
  );
}
