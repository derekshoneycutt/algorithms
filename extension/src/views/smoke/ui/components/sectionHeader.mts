import { html, type TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import type { SmokeSectionIconName } from "./types.mjs";

const smokeControlsSectionIconSvgByName: Record<SmokeSectionIconName, string> = {
  report:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M4 2H10L12 4V13C12 13.55 11.55 14 11 14H4C3.45 14 3 13.55 3 13V3C3 2.45 3.45 2 4 2Z" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M10 2V4H12" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M5 7H11" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'
    + '<path d="M5 9.5H9" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'
    + "</svg>",
  timeout:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M8 5V8L10 9.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
    + "</svg>",
  languages:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M5 5L2 8L5 11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M11 5L14 8L11 11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M9 3L7 13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'
    + "</svg>",
};

/**
 * Renders one smoke-controls section header.
 *
 * @param {string} title Section title.
 * @param {SmokeSectionIconName} iconName Icon key.
 * @param {TemplateResult | ""} [actionsTemplate] Optional actions template.
 * @returns {TemplateResult} Section header template.
 */
export function renderSectionHeader(
  title: string,
  iconName: SmokeSectionIconName,
  actionsTemplate: TemplateResult | "" = "",
): TemplateResult {
  return html`
    <div class="sectionHeader">
      <div class="sectionTitleGroup">
        ${unsafeHTML(smokeControlsSectionIconSvgByName[iconName])}
        <div class="sectionTitle">${title}</div>
      </div>
      ${actionsTemplate}
    </div>
  `;
}
