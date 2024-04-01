import { config } from "../../package.json";

/**
 * Get preference value.
 * Wrapper of `Zotero.Prefs.get`.
 * @param key
 */
export function getPref(key: string) {
	return Zotero.Prefs.get(`${config.prefsPrefix}.${key}`, true);
}

/**
 * Get global name of preference.
 * @param key
 */
export function getPrefGlobalName(key: string) {
	return `${config.prefsPrefix}.${key}`;
}

/**
 * Set preference value.
 * Wrapper of `Zotero.Prefs.set`.
 * @param key
 * @param value
 */
export function setPref(key: string, value: string | number | boolean) {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return Zotero.Prefs.set(`${config.prefsPrefix}.${key}`, value, true);
}

/**
 * Set preference to a default value if it isn't already set.
 * @param key
 * @param defaultValue
 */
export function initialiseDefaultPref(
	key: string,
	defaultValue: string | number | boolean,
) {
	if (getPref(key) === undefined) {
		setPref(key, defaultValue);
	}
}

/**
 * Clear preference value.
 * Wrapper of `Zotero.Prefs.clear`.
 * @param key
 */
export function clearPref(key: string) {
	return Zotero.Prefs.clear(`${config.prefsPrefix}.${key}`, true);
}
