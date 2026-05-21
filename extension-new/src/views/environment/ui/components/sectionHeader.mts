import { html, nothing, type TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import type { EnvironmentSectionIconName } from "./types.mjs";

const sectionIconSvgByName: Record<EnvironmentSectionIconName, string> = {
  session:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M8 2.5L12.5 4.5V8.8C12.5 11 10.95 13.02 8 13.8C5.05 13.02 3.5 11 3.5 8.8V4.5L8 2.5Z" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M6.1 8.1L7.4 9.3L10.1 6.7" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>'
    + "</svg>",
  profile:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M8 8C9.66 8 11 6.66 11 5C11 3.34 9.66 2 8 2C6.34 2 5 3.34 5 5C5 6.66 6.34 8 8 8Z" stroke="currentColor" stroke-width="1.1"/>'
    + '<path d="M3 13C3.55 10.9 5.52 9.5 8 9.5C10.48 9.5 12.45 10.9 13 13" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    + "</svg>",
  check:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M3 3.5C3 2.67 3.67 2 4.5 2H11.5C12.33 2 13 2.67 13 3.5V12.5C13 13.33 12.33 14 11.5 14H4.5C3.67 14 3 13.33 3 12.5V3.5Z" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M5 8L7 10L11 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
    + "</svg>",
  copy:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M6 3H11.5C12.33 3 13 3.67 13 4.5V10" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'
    + '<rect x="3" y="6" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1"/>'
    + "</svg>",
  variables:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M4 4.5H12" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    + '<path d="M4 8H12" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    + '<path d="M4 11.5H12" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    + '<circle cx="6" cy="4.5" r="1.2" fill="currentColor"/>'
    + '<circle cx="10" cy="8" r="1.2" fill="currentColor"/>'
    + '<circle cx="7.5" cy="11.5" r="1.2" fill="currentColor"/>'
    + "</svg>",
  routing:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<circle cx="4" cy="4" r="1.5" stroke="currentColor" stroke-width="1"/>'
    + '<circle cx="12" cy="4" r="1.5" stroke="currentColor" stroke-width="1"/>'
    + '<circle cx="8" cy="12" r="1.5" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M5.2 4.8L6.9 10.8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    + '<path d="M10.8 4.8L9.1 10.8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    + '<path d="M5.5 4H10.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    + "</svg>",
};

/**
 * Renders one section header with icon and optional actions.
 *
 * @param {string} title Section title.
 * @param {EnvironmentSectionIconName} iconName Icon key.
 * @param {TemplateResult | typeof nothing} [actionsTemplate] Optional actions template.
 * @returns {TemplateResult} Header template.
 */
export function renderSectionHeader(
  title: string,
  iconName: EnvironmentSectionIconName,
  actionsTemplate: TemplateResult | typeof nothing = nothing,
): TemplateResult {
  return html`
    <div class="sectionHeader">
      <div class="sectionTitleGroup">
        ${unsafeHTML(sectionIconSvgByName[iconName])}
        <div class="sectionTitle">${title}</div>
      </div>
      ${actionsTemplate}
    </div>
  `;
}
