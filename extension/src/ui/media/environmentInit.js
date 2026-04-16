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

function escapeHtmlClient(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderStatus(statusKind, statusText) {
  const resolvedKind = String(statusKind || "idle");
  const resolvedText = String(statusText || "").trim();

  if (!resolvedText) {
    return "";
  }

  return '<div class="status ' + escapeHtmlClient(resolvedKind) + '">' + escapeHtmlClient(resolvedText) + '</div>';
}

function renderTemplateClient(template, replacements) {
  return String(template || "").replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(replacements, key)) {
      return String(replacements[key]);
    }

    return "";
  });
}

function getTemplateSource(templateName) {
  return String(templates[templateName] || "");
}

function hasRequiredTemplates() {
  return requiredTemplateNames.every((templateName) => {
    return getTemplateSource(templateName).trim().length > 0;
  });
}

/**
 * Returns the inline SVG used for one Environment-pane section header.
 *
 * @param {string} iconName Semantic section icon key.
 * @returns {string} Inline SVG markup.
 */
function getSectionIconSvg(iconName) {
  if (iconName === 'profile') {
    return '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
      + '<path d="M8 8C9.66 8 11 6.66 11 5C11 3.34 9.66 2 8 2C6.34 2 5 3.34 5 5C5 6.66 6.34 8 8 8Z" stroke="currentColor" stroke-width="1.1"/>'
      + '<path d="M3 13C3.55 10.9 5.52 9.5 8 9.5C10.48 9.5 12.45 10.9 13 13" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
      + '</svg>';
  }

  if (iconName === 'check') {
    return '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
      + '<path d="M3 3.5C3 2.67 3.67 2 4.5 2H11.5C12.33 2 13 2.67 13 3.5V12.5C13 13.33 12.33 14 11.5 14H4.5C3.67 14 3 13.33 3 12.5V3.5Z" stroke="currentColor" stroke-width="1"/>'
      + '<path d="M5 8L7 10L11 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
      + '</svg>';
  }

  if (iconName === 'copy') {
    return '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
      + '<path d="M6 3H11.5C12.33 3 13 3.67 13 4.5V10" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'
      + '<rect x="3" y="6" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1"/>'
      + '</svg>';
  }

  if (iconName === 'variables') {
    return '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
      + '<path d="M4 4.5H12" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
      + '<path d="M4 8H12" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
      + '<path d="M4 11.5H12" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
      + '<circle cx="6" cy="4.5" r="1.2" fill="currentColor"/>'
      + '<circle cx="10" cy="8" r="1.2" fill="currentColor"/>'
      + '<circle cx="7.5" cy="11.5" r="1.2" fill="currentColor"/>'
      + '</svg>';
  }

  if (iconName === 'routing') {
    return '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
      + '<circle cx="4" cy="4" r="1.5" stroke="currentColor" stroke-width="1"/>'
      + '<circle cx="12" cy="4" r="1.5" stroke="currentColor" stroke-width="1"/>'
      + '<circle cx="8" cy="12" r="1.5" stroke="currentColor" stroke-width="1"/>'
      + '<path d="M5.2 4.8L6.9 10.8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
      + '<path d="M10.8 4.8L9.1 10.8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
      + '<path d="M5.5 4H10.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
      + '</svg>';
  }

  if (iconName === 'batch') {
    return '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
      + '<rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1"/>'
      + '<rect x="6" y="6" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1"/>'
      + '</svg>';
  }

  return '';
}

/**
 * Renders one Environment-pane section header with an icon and optional actions.
 *
 * @param {string} title Section title.
 * @param {string} iconName Semantic section icon key.
 * @param {string} actionsHtml Optional action markup.
 * @returns {string} Header markup.
 */
function renderSectionHeader(title, iconName, actionsHtml) {
  return '<div class="sectionHeader">'
    + '<div class="sectionTitleGroup">'
    + getSectionIconSvg(iconName)
    + '<div class="sectionTitle">' + escapeHtmlClient(title) + '</div>'
    + '</div>'
    + (actionsHtml || '')
    + '</div>';
}

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

function buildIndicatorHtml(label) {
  return '<span class="indicator">' + escapeHtmlClient(label) + '</span>';
}

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

function render() {
  if (!hasRequiredTemplates()) {
    app.innerHTML = '<div class="panel"><section class="section"><div class="status error">Environment templates failed to load.</div></section></div>';
    return;
  }

  const profileSectionHtml = renderTemplateClient(getTemplateSource('profileSection'), {
    profileHeader: renderSectionHeader('Profile', 'profile', '<div class="buttonRow"><button class="button secondary" data-action="refresh-state">Refresh</button></div>'),
    profilePath: escapeHtmlClient(state.profilePath),
    profilePlaceholder: escapeHtmlClient(state.profilePlaceholder),
    effectiveProfilePath: escapeHtmlClient(state.effectiveProfilePath || state.profilePlaceholder),
  });
  const checkEnvSectionHtml = renderTemplateClient(getTemplateSource('checkEnvSection'), {
    checkEnvHeader: renderSectionHeader('Check Environment', 'check', '<div class="buttonRow"><button class="button" data-action="check-env">Check Environment</button></div>'),
    checkEnvStatus: renderStatus(state.checkEnv.kind, state.checkEnv.text),
    checkEnvFilteredOutput: escapeHtmlClient(state.checkEnv.filteredOutput || 'No check-environment output yet.'),
    checkEnvRawOutput: escapeHtmlClient(state.checkEnv.rawOutput || 'No raw output yet.'),
  });
  const copyIconsSectionHtml = renderTemplateClient(getTemplateSource('copyIconsSection'), {
    copyIconsHeader: renderSectionHeader('Copy Icons', 'copy', '<div class="buttonRow"><button class="button" data-action="copy-icons">Copy Icons</button></div>'),
    copyIconsPath: escapeHtmlClient(state.copyIconsPath),
    copyIconsPlaceholder: escapeHtmlClient(state.copyIconsPlaceholder),
    copyIconsStatus: renderStatus(state.copyIconsResult.kind, state.copyIconsResult.text),
  });
  const variablesSectionHtml = renderTemplateClient(getTemplateSource('variablesSection'), {
    variablesHeader: renderSectionHeader('Use Environment Variables', 'variables'),
    variableCardsHtml: buildVariableCardsHtml(),
  });
  const batchSectionHtml = renderTemplateClient(getTemplateSource('batchSection'), {
    batchHeader: renderSectionHeader('Batch All', 'batch'),
    batchDockerChecked: state.batch.dockerEnabled ? 'checked' : '',
    batchDockerValue: escapeHtmlClient(state.batch.dockerValue),
    batchDockerDisabledAttr: state.batch.dockerEnabled ? '' : 'disabled',
    batchSshChecked: state.batch.sshEnabled ? 'checked' : '',
    batchSshValue: escapeHtmlClient(state.batch.sshValue),
    batchSshDisabledAttr: state.batch.sshEnabled ? '' : 'disabled',
    batchStatus: renderStatus(state.batch.statusKind, state.batch.statusText),
  });
  const routingSectionHtml = renderTemplateClient(getTemplateSource('routingSection'), {
    routingHeader: renderSectionHeader('Language Routing', 'routing'),
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

function getProfilePath() {
  const profileInput = document.getElementById('profilePath');
  return profileInput ? profileInput.value : '';
}

function getCopyIconsPath() {
  const copyIconsInput = document.getElementById('copyIconsPath');
  return copyIconsInput ? copyIconsInput.value : '';
}

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

function updateVariableDraft(target) {
  const variableKey = target.getAttribute('data-variable-key');
  const variable = state.variables.find((item) => item.key === variableKey);

  if (variable) {
    variable.value = target.value;
  }
}

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

function handleRefreshStateAction() {
  vscodeApi.postMessage({
    type: 'refreshState',
    profilePath: getProfilePath(),
    copyIconsPath: getCopyIconsPath(),
  });
}

function handleCheckEnvAction() {
  vscodeApi.postMessage({
    type: 'runCheckEnv',
    profilePath: getProfilePath(),
    copyIconsPath: getCopyIconsPath(),
  });
}

function handleCopyIconsAction() {
  vscodeApi.postMessage({
    type: 'runCopyIcons',
    profilePath: getProfilePath(),
    copyIconsPath: getCopyIconsPath(),
  });
}

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
  'refresh-state': () => {
    handleRefreshStateAction();
  },
  'check-env': () => {
    handleCheckEnvAction();
  },
  'copy-icons': () => {
    handleCopyIconsAction();
  },
  'save-variable': (target) => {
    handleSaveVariableAction(target);
  },
  'save-language': (target) => {
    handleSaveLanguageAction(target);
  },
  'save-batch': () => {
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
