
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Canonical file name used to persist flagged language keys per algorithm.
 */
export const FLAGGED_LANGUAGES_FILE_NAME = ".flag-lang";

/**
 * Reads and updates per-algorithm flagged language state with a local cache.
 */
export class FlagHandler {
	private cacheByAlgorithmDirectory: Map<string, Set<string>>;

	/**
	 * Creates the flag handler.
	 */
	public constructor() {
		this.cacheByAlgorithmDirectory = new Map<string, Set<string>>();
	}

	/**
	 * Resolves one algorithm directory to its .flag-lang file path.
	 *
	 * @param {string} algorithmDirectoryPath Algorithm directory path.
	 * @returns {string} Absolute .flag-lang file path.
	 */
	private resolveFlagFilePath(algorithmDirectoryPath: string): string {
		return path.join(algorithmDirectoryPath, FLAGGED_LANGUAGES_FILE_NAME);
	}

	/**
	 * Normalizes one language key for persistence and lookup.
	 *
	 * @param {string} languageKey Raw key value.
	 * @returns {string} Trimmed, lowercase key.
	 */
	private normalizeLanguageKey(languageKey: string): string {
		return languageKey.trim().toLowerCase();
	}

	/**
	 * Returns a cloned set so callers cannot mutate internal cache state.
	 *
	 * @param {ReadonlySet<string>} languageKeys Source keys.
	 * @returns {Set<string>} Cloned key set.
	 */
	private cloneLanguageKeySet(languageKeys: ReadonlySet<string>): Set<string> {
		return new Set(languageKeys);
	}

	/**
	 * Reads flagged language keys for one algorithm directory.
	 *
	 * Uses cached data when present; otherwise loads from disk and stores in cache.
	 *
	 * @param {string} algorithmDirectoryPath Algorithm directory path.
	 * @returns {Set<string>} Flagged language keys.
	 */
	public readFlaggedLanguageKeys(algorithmDirectoryPath: string): Set<string> {
		const cached = this.cacheByAlgorithmDirectory.get(algorithmDirectoryPath);
		if (cached !== undefined) {
			return this.cloneLanguageKeySet(cached);
		}

		const filePath = this.resolveFlagFilePath(algorithmDirectoryPath);
		let fileContent = "";
		try {
			fileContent = fs.readFileSync(filePath, "utf8");
		}
		catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			if (code !== "ENOENT") {
				throw error;
			}
		}

		const flaggedLanguageKeys = new Set(
			fileContent
				.split(/\r?\n/)
				.map((line) => this.normalizeLanguageKey(line))
				.filter((line) => line.length > 0),
		);

		this.cacheByAlgorithmDirectory.set(
			algorithmDirectoryPath,
			this.cloneLanguageKeySet(flaggedLanguageKeys),
		);

		return flaggedLanguageKeys;
	}

	/**
	 * Writes flagged language keys for one algorithm directory and updates cache.
	 *
	 * Empty input deletes .flag-lang to match run.sh behavior for clearing flags.
	 *
	 * @param {string} algorithmDirectoryPath Algorithm directory path.
	 * @param {ReadonlySet<string>} flaggedLanguageKeys New flagged key set.
	 * @returns {void} No return value.
	 */
	public writeFlaggedLanguageKeys(
		algorithmDirectoryPath: string,
		flaggedLanguageKeys: ReadonlySet<string>,
	): void {
		const normalizedKeys = new Set(
			[...flaggedLanguageKeys]
				.map((key) => this.normalizeLanguageKey(key))
				.filter((key) => key.length > 0),
		);

		const filePath = this.resolveFlagFilePath(algorithmDirectoryPath);
		if (normalizedKeys.size === 0) {
			fs.rmSync(filePath, { force: true });
			this.cacheByAlgorithmDirectory.set(algorithmDirectoryPath, new Set());
			return;
		}

		const sortedKeys = [...normalizedKeys].sort((leftKey, rightKey) => leftKey.localeCompare(rightKey));
		fs.writeFileSync(filePath, `${sortedKeys.join("\n")}\n`, "utf8");
		this.cacheByAlgorithmDirectory.set(algorithmDirectoryPath, new Set(sortedKeys));
	}

	/**
	 * Adds or removes one language key flag for one algorithm directory.
	 *
	 * @param {string} algorithmDirectoryPath Algorithm directory path.
	 * @param {string} languageKey Language key to update.
	 * @param {boolean} isFlagged True to ensure present; false to ensure absent.
	 * @returns {Set<string>} Updated flagged language key set.
	 */
	public updateFlaggedLanguageKey(
		algorithmDirectoryPath: string,
		languageKey: string,
		isFlagged: boolean,
	): Set<string> {
		const normalizedLanguageKey = this.normalizeLanguageKey(languageKey);
		const flaggedLanguageKeys = this.readFlaggedLanguageKeys(algorithmDirectoryPath);

		if (normalizedLanguageKey.length > 0) {
			if (isFlagged) {
				flaggedLanguageKeys.add(normalizedLanguageKey);
			}
			else {
				flaggedLanguageKeys.delete(normalizedLanguageKey);
			}
		}

		this.writeFlaggedLanguageKeys(algorithmDirectoryPath, flaggedLanguageKeys);
		return this.cloneLanguageKeySet(flaggedLanguageKeys);
	}

	/**
	 * Clears one cached algorithm entry, or the full cache when no path is given.
	 *
	 * @param {string | undefined} algorithmDirectoryPath Optional algorithm directory path.
	 * @returns {void} No return value.
	 */
	public clearCache(algorithmDirectoryPath?: string): void {
		if (algorithmDirectoryPath) {
			this.cacheByAlgorithmDirectory.delete(algorithmDirectoryPath);
			return;
		}

		this.cacheByAlgorithmDirectory.clear();
	}
}
