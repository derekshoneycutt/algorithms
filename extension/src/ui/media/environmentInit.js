const vscodeApi = acquireVsCodeApi();
const app = document.getElementById("app");
const initialStateNode = document.getElementById("environmentInitialState");
const templatesNode = document.getElementById("environmentTemplates");
let state = {};
let templates = {};

if (initialStateNode) {
  try {
    state = JSON.parse(initialStateNode.textContent || "{}");
  } catch (_) {
    state = {};
  }
}

if (templatesNode) {
  try {
    templates = JSON.parse(templatesNode.textContent || "{}");
  } catch (_) {
    templates = {};
  }
}

const requiredTemplateNames = [
  "panel",
  "profileSection",
  "checkEnvSection",
  "copyIconsSection",
  "variablesSection",
  "routingSection",
  "batchSection",
  "variableCard",
  "languageRow",
];

// Browser-side copy of escapeHtml from webviewHostUtils.js.
// These two implementations must stay in sync — any fix here must be applied there too.
/**
 * Escapes user-provided text for safe HTML interpolation in the webview client.
 *
 * @param {string} text Raw text value.
 * @returns {string} Escaped HTML-safe text.
 */
function escapeHtmlClient(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Renders a status badge element, or an empty string if there is no text.
 *
 * @param {string} statusKind CSS class name for the status kind (e.g. "idle", "error", "success").
 * @param {string} statusText Human-readable status message.
 * @returns {string} Status badge HTML, or empty string.
 */
function renderStatus(statusKind, statusText) {
  const resolvedKind = String(statusKind || "idle");
  const resolvedText = String(statusText || "").trim();

  if (!resolvedText) {
    return "";
  }

  return '<div class="status ' + escapeHtmlClient(resolvedKind) + '">' + escapeHtmlClient(resolvedText) + '</div>';
}

// Browser-side copy of renderTemplate from webviewHostUtils.js.
// These two implementations must stay in sync — any fix here must be applied there too.
/**
 * Renders one tokenized HTML template with replacement values in the webview client.
 *
 * @param {string} template Raw template source containing {{key}} placeholders.
 * @param {Record<string, string>} replacements Placeholder replacement values.
 * @returns {string} Rendered HTML with all known placeholders substituted.
 */
function renderTemplateClient(template, replacements) {
  return String(template || "").replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(replacements, key)) {
      return String(replacements[key]);
    }

    return "";
  });
}

/**
 * Returns the source string for a named template from the bootstrapped templates object.
 *
 * @param {string} templateName Template key as declared in requiredTemplateNames.
 * @returns {string} Template source, or empty string if not found.
 */
function getTemplateSource(templateName) {
  return String(templates[templateName] || "");
}

/**
 * Returns whether all required templates are present and non-empty.
 *
 * @returns {boolean} True if every entry in requiredTemplateNames has source.
 */
function hasRequiredTemplates() {
  return requiredTemplateNames.every((templateName) => {
    return getTemplateSource(templateName).trim().length > 0;
  });
}

/**
 * Returns the names of any required templates that are absent or empty.
 *
 * @returns {string[]} Names of missing templates.
 */
function getMissingTemplateNames() {
  return requiredTemplateNames.filter(
    (templateName) => getTemplateSource(templateName).trim().length === 0
  );
}

/**
 * Builds the combined HTML for all environment variable cards using the variableCard template.
 *
 * @returns {string} Concatenated variable card HTML.
 */
function buildVariableCardsHtml() {
  const variableCardTemplate = getTemplateSource("variableCard");

  return state.variables.map((variable) => {
    return renderTemplateClient(variableCardTemplate, {
      variableLabel: escapeHtmlClient(variable.label),
      variableKey: escapeHtmlClient(variable.key),
      variableValue: escapeHtmlClient(variable.value),
      variableStatus: renderStatus(variable.statusKind, variable.statusText),
    });
  }).join("");
}

/**
 * Renders a small indicator badge with an escaped label.
 *
 * @param {string} label Indicator label text.
 * @returns {string} Indicator span HTML.
 */
function buildIndicatorHtml(label) {
  return '<span class="indicator">' + escapeHtmlClient(label) + '</span>';
}

/**
 * Builds the combined HTML for all language routing rows using the languageRow template.
 *
 * @returns {string} Concatenated language row HTML.
 */
function buildLanguageRowsHtml() {
  const languageRowTemplate = getTemplateSource("languageRow");

  return state.languages.map((language) => {
    const conflictClass = language.isConflict ? ' conflict' : '';
    const indicators = [
      language.dockerEnabled ? buildIndicatorHtml('docker') : '',
      language.sshEnabled ? buildIndicatorHtml('ssh') : ''
    ].join('');

    return renderTemplateClient(languageRowTemplate, {
      conflictClass,
      languageIconUri: escapeHtmlClient(language.iconUri),
      languageLabel: escapeHtmlClient(language.label),
      languageIndicators: indicators,
      languageKey: escapeHtmlClient(language.key),
      dockerChecked: language.dockerEnabled ? 'checked' : '',
      dockerValue: escapeHtmlClient(language.dockerValue),
      dockerDisabledAttr: language.dockerEnabled ? '' : 'disabled',
      sshChecked: language.sshEnabled ? 'checked' : '',
      sshValue: escapeHtmlClient(language.sshValue),
      sshDisabledAttr: language.sshEnabled ? '' : 'disabled',
      languageStatus: renderStatus(language.statusKind, language.statusText),
    });
  }).join('');
}

/**
 * Fully re-renders the environment pane into the app element using current state and templates.
 * All section header HTML values are produced locally; leaf data values arrive pre-escaped.
 *
 * @returns {void}
 */
function render() {
  if (!hasRequiredTemplates()) {
    const missingNames = getMissingTemplateNames();
    console.error('[algorithms-runner] Environment pane missing templates: ' + missingNames.join(', '));
    app.innerHTML = '<div class="panel"><section class="section"><div class="status error">Environment templates failed to load.</div></section></div>';
    return;
  }

  const sectionHeaders = state.sectionHeaders || {};

  const profileSectionHtml = renderTemplateClient(getTemplateSource('profileSection'), {
    profileHeader: String(sectionHeaders.profile || ''),
    profilePath: escapeHtmlClient(state.profilePath),
    profilePlaceholder: escapeHtmlClient(state.profilePlaceholder),
    effectiveProfilePath: escapeHtmlClient(state.effectiveProfilePath || state.profilePlaceholder),
  });
  const checkEnvSectionHtml = renderTemplateClient(getTemplateSource('checkEnvSection'), {
    checkEnvHeader: String(sectionHeaders.checkEnv || ''),
    checkEnvStatus: renderStatus(state.checkEnv.kind, state.checkEnv.text),
    checkEnvFilteredOutput: escapeHtmlClient(state.checkEnv.filteredOutput || 'No check-environment output yet.'),
    checkEnvRawOutput: escapeHtmlClient(state.checkEnv.rawOutput || 'No raw output yet.'),
  });
  const copyIconsSectionHtml = renderTemplateClient(getTemplateSource('copyIconsSection'), {
    copyIconsHeader: String(sectionHeaders.copyIcons || ''),
    copyIconsPath: escapeHtmlClient(state.copyIconsPath),
    copyIconsPlaceholder: escapeHtmlClient(state.copyIconsPlaceholder),
    copyIconsStatus: renderStatus(state.copyIconsResult.kind, state.copyIconsResult.text),
  });
  const variablesSectionHtml = renderTemplateClient(getTemplateSource('variablesSection'), {
    variablesHeader: String(sectionHeaders.variables || ''),
    variableCardsHtml: buildVariableCardsHtml(),
  });
  const batchSectionHtml = renderTemplateClient(getTemplateSource('batchSection'), {
    batchHeader: String(sectionHeaders.batch || ''),
    batchDockerChecked: state.batch.dockerEnabled ? 'checked' : '',
    batchDockerValue: escapeHtmlClient(state.batch.dockerValue),
    batchDockerDisabledAttr: state.batch.dockerEnabled ? '' : 'disabled',
    batchSshChecked: state.batch.sshEnabled ? 'checked' : '',
    batchSshValue: escapeHtmlClient(state.batch.sshValue),
    batchSshDisabledAttr: state.batch.sshEnabled ? '' : 'disabled',
    batchStatus: renderStatus(state.batch.statusKind, state.batch.statusText),
  });
  const routingSectionHtml = renderTemplateClient(getTemplateSource('routingSection'), {
    routingHeader: String(sectionHeaders.routing || ''),
    batchSection: batchSectionHtml,
    languageRowsHtml: buildLanguageRowsHtml(),
  });

  app.innerHTML = renderTemplateClient(getTemplateSource('panel'), {
    profileSection: profileSectionHtml,
    checkEnvSection: checkEnvSectionHtml,
    copyIconsSection: copyIconsSectionHtml,
    variablesSection: variablesSectionHtml,
    routingSection: routingSectionHtml,
  });
}

/**
 * Returns the current value of the profile path input, or an empty string if not present.
 *
 * @returns {string} Profile path input value.
 */
function getProfilePath() {
  const profileInput = document.getElementById('profilePath');
  return profileInput ? profileInput.value : '';
}

/**
 * Returns the current value of the copy-icons path input, or an empty string if not present.
 *
 * @returns {string} Copy-icons path input value.
 */
function getCopyIconsPath() {
  const copyIconsInput = document.getElementById('copyIconsPath');
  return copyIconsInput ? copyIconsInput.value : '';
}

/**
 * Updates the status fields on one state entry and triggers a re-render.
 *
 * @param {"variable"|"language"|"batch"} targetKind Category of the target entry.
 * @param {string} targetKey Key identifying the specific entry (empty string for batch).
 * @param {string} statusKind CSS class for the status kind.
 * @param {string} statusText Human-readable status message.
 * @returns {void}
 */
function setLocalStatus(targetKind, targetKey, statusKind, statusText) {
  if (targetKind === 'variable') {
    const variable = state.variables.find((item) => item.key === targetKey);
    if (variable) {
      variable.statusKind = statusKind;
      variable.statusText = statusText;
    }
    render();
    return;
  }

  if (targetKind === 'language') {
    const language = state.languages.find((item) => item.key === targetKey);
    if (language) {
      language.statusKind = statusKind;
      language.statusText = statusText;
    }
    render();
    return;
  }

  if (targetKind === 'batch') {
    state.batch.statusKind = statusKind;
    state.batch.statusText = statusText;
    render();
  }
}

/**
 * Applies inputs from a language row control to the in-memory state draft without saving.
 *
 * @param {HTMLElement} target Control element carrying data-lang-key and data-input-kind attributes.
 * @returns {void}
 */
function updateLanguageDraft(target) {
  const languageKey = target.getAttribute('data-lang-key');
  const inputKind = target.getAttribute('data-input-kind');
  const language = state.languages.find((item) => item.key === languageKey);

  if (!language) {
    return;
  }

  if (inputKind === 'language-docker-enabled') {
    language.dockerEnabled = target.checked;
  }

  if (inputKind === 'language-docker-value') {
    language.dockerValue = target.value;
  }

  if (inputKind === 'language-ssh-enabled') {
    language.sshEnabled = target.checked;
  }

  if (inputKind === 'language-ssh-value') {
    language.sshValue = target.value;
  }

  language.isConflict = language.dockerEnabled && language.sshEnabled;
}

/**
 * Applies the current input value of a variable card to the in-memory state draft without saving.
 *
 * @param {HTMLElement} target Input element carrying a data-variable-key attribute.
 * @returns {void}
 */
function updateVariableDraft(target) {
  const variableKey = target.getAttribute('data-variable-key');
  const variable = state.variables.find((item) => item.key === variableKey);

  if (variable) {
    variable.value = target.value;
  }
}

/**
 * Reads the current batch-all form inputs and updates the in-memory state draft without saving.
 *
 * @returns {void}
 */
function updateBatchDraft() {
  const batchDockerEnabled = document.getElementById('batchDockerEnabled');
  const batchDockerValue = document.getElementById('batchDockerValue');
  const batchSshEnabled = document.getElementById('batchSshEnabled');
  const batchSshValue = document.getElementById('batchSshValue');

  state.batch.dockerEnabled = batchDockerEnabled ? batchDockerEnabled.checked : false;
  state.batch.dockerValue = batchDockerValue ? batchDockerValue.value : '';
  state.batch.sshEnabled = batchSshEnabled ? batchSshEnabled.checked : false;
  state.batch.sshValue = batchSshValue ? batchSshValue.value : '';
  state.batch.isConflict = state.batch.dockerEnabled && state.batch.sshEnabled;
}

/**
 * Posts a refreshState message to the extension host using the current path inputs.
 *
 * @returns {void}
 */
function handleRefreshStateAction() {
  vscodeApi.postMessage({
    type: 'refreshState',
    profilePath: getProfilePath(),
    copyIconsPath: getCopyIconsPath(),
  });
}

/**
 * Posts a runCheckEnv message to the extension host to execute the check-environment script.
 *
 * @returns {void}
 */
function handleCheckEnvAction() {
  vscodeApi.postMessage({
    type: 'runCheckEnv',
    profilePath: getProfilePath(),
    copyIconsPath: getCopyIconsPath(),
  });
}

/**
 * Posts a runCopyIcons message to the extension host to copy language icons to the target path.
 *
 * @returns {void}
 */
function handleCopyIconsAction() {
  vscodeApi.postMessage({
    type: 'runCopyIcons',
    profilePath: getProfilePath(),
    copyIconsPath: getCopyIconsPath(),
  });
}

/**
 * Posts a saveVariable message for the variable identified by the target element's data attribute.
 *
 * @param {HTMLElement} target Element carrying a data-variable-key attribute.
 * @returns {void}
 */
function handleSaveVariableAction(target) {
  const variableKey = target.getAttribute('data-variable-key');
  const variable = state.variables.find((item) => item.key === variableKey);

  if (!variable) {
    return;
  }

  vscodeApi.postMessage({
    type: 'saveVariable',
    profilePath: getProfilePath(),
    copyIconsPath: getCopyIconsPath(),
    variableKey,
    value: variable.value,
  });
}

/**
 * Validates a language routing entry before saving; sets a local error status and returns false on failure.
 *
 * @param {string} languageKey Identifier of the language being validated.
 * @param {{dockerEnabled: boolean, dockerValue: string, sshEnabled: boolean, sshValue: string}} language Current language state draft.
 * @returns {boolean} True if the entry is valid and safe to save.
 */
function canSaveLanguage(languageKey, language) {
  if (language.dockerEnabled && language.sshEnabled) {
    setLocalStatus(
      'language',
      languageKey,
      'error',
      'Cannot save with both docker and ssh enabled.'
    );
    return false;
  }

  if (language.dockerEnabled && !String(language.dockerValue || '').trim()) {
    setLocalStatus('language', languageKey, 'error', 'Enter a Docker value before saving.');
    return false;
  }

  if (language.sshEnabled && !String(language.sshValue || '').trim()) {
    setLocalStatus('language', languageKey, 'error', 'Enter an SSH route before saving.');
    return false;
  }

  return true;
}

/**
 * Posts a saveLanguageRouting message for the language row identified by the target element.
 *
 * @param {HTMLElement} target Element carrying a data-lang-key attribute.
 * @returns {void}
 */
function handleSaveLanguageAction(target) {
  const languageKey = target.getAttribute('data-lang-key');
  const language = state.languages.find((item) => item.key === languageKey);

  if (!language || !canSaveLanguage(languageKey, language)) {
    return;
  }

  vscodeApi.postMessage({
    type: 'saveLanguageRouting',
    profilePath: getProfilePath(),
    copyIconsPath: getCopyIconsPath(),
    languageKey,
    dockerEnabled: language.dockerEnabled,
    dockerValue: language.dockerValue,
    sshEnabled: language.sshEnabled,
    sshValue: language.sshValue,
  });
}

/**
 * Validates the batch-all state before saving; sets a local error status and returns false on failure.
 *
 * @returns {boolean} True if the batch entry is valid and safe to save.
 */
function canSaveBatch() {
  if (state.batch.dockerEnabled && state.batch.sshEnabled) {
    setLocalStatus('batch', '', 'error', 'Cannot save Batch All with both docker and ssh enabled.');
    return false;
  }

  if (state.batch.dockerEnabled && !String(state.batch.dockerValue || '').trim()) {
    setLocalStatus('batch', '', 'error', 'Enter a Docker value before saving Batch All.');
    return false;
  }

  if (state.batch.sshEnabled && !String(state.batch.sshValue || '').trim()) {
    setLocalStatus('batch', '', 'error', 'Enter an SSH route before saving Batch All.');
    return false;
  }

  return true;
}

/**
 * Reads the current batch form state, validates it, and posts a saveBatchRouting message.
 *
 * @returns {void}
 */
function handleSaveBatchAction() {
  updateBatchDraft();

  if (!canSaveBatch()) {
    return;
  }

  vscodeApi.postMessage({
    type: 'saveBatchRouting',
    profilePath: getProfilePath(),
    copyIconsPath: getCopyIconsPath(),
    dockerEnabled: state.batch.dockerEnabled,
    dockerValue: state.batch.dockerValue,
    sshEnabled: state.batch.sshEnabled,
    sshValue: state.batch.sshValue,
  });
}

const clickActionHandlers = {
  refreshState: () => {
    handleRefreshStateAction();
  },
  runCheckEnv: () => {
    handleCheckEnvAction();
  },
  runCopyIcons: () => {
    handleCopyIconsAction();
  },
  saveVariable: (target) => {
    handleSaveVariableAction(target);
  },
  saveLanguage: (target) => {
    handleSaveLanguageAction(target);
  },
  saveBatch: () => {
    handleSaveBatchAction();
  },
};

app.addEventListener('input', (event) => {
  const target = event.target;

  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (target.getAttribute('data-input-kind') && target.getAttribute('data-lang-key')) {
    updateLanguageDraft(target);
    return;
  }

  if (target.getAttribute('data-input-kind') === 'variable') {
    updateVariableDraft(target);
    return;
  }

  if (
    target.id === 'batchDockerEnabled'
    || target.id === 'batchDockerValue'
    || target.id === 'batchSshEnabled'
    || target.id === 'batchSshValue'
  ) {
    updateBatchDraft();
  }
});

app.addEventListener('change', (event) => {
  const target = event.target;

  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (target.getAttribute('data-input-kind') && target.getAttribute('data-lang-key')) {
    updateLanguageDraft(target);
    render();
    return;
  }

  if (
    target.id === 'batchDockerEnabled'
    || target.id === 'batchDockerValue'
    || target.id === 'batchSshEnabled'
    || target.id === 'batchSshValue'
  ) {
    updateBatchDraft();
    render();
  }
});

app.addEventListener('click', (event) => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const action = target.getAttribute('data-action');

  if (!action) {
    return;
  }

  const clickActionHandler = clickActionHandlers[action];

  if (clickActionHandler) {
    clickActionHandler(target);
  }
});

window.addEventListener('message', (event) => {
  const message = event.data;

  if (message?.type !== 'environmentState') {
    return;
  }

  state = message.state;
  render();
});

render();
