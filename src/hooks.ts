import ZoteroReadingList from "./modules/overlay";
import { config } from "../package.json";
import { initLocale } from "./utils/locale";
import { createZToolkit } from "./utils/ztoolkit";

let zoteroReadingList: ZoteroReadingList;

async function onStartup() {
	await Promise.all([
		Zotero.initializationPromise,
		Zotero.unlockPromise,
		Zotero.uiReadyPromise,
	]);

	// TODO: Remove this after zotero#3387 is merged
	if (__env__ === "development") {
		// Keep in sync with the scripts/startup.mjs
		const loadDevToolWhen = `Plugin ${config.addonID} startup`;
		ztoolkit.log(loadDevToolWhen);
	}

	initLocale();

	await onMainWindowLoad(window);
}

// eslint-disable-next-line @typescript-eslint/require-await
async function onMainWindowLoad(win: Window): Promise<void> {
	// Create ztoolkit for every window
	addon.data.ztoolkit = createZToolkit();
	zoteroReadingList = new ZoteroReadingList();
}

// eslint-disable-next-line @typescript-eslint/require-await
async function onMainWindowUnload(win: Window): Promise<void> {
	zoteroReadingList.unload();
	ztoolkit.unregisterAll();
	addon.data.dialog?.window?.close();
}

function onShutdown(): void {
	ztoolkit.unregisterAll();
	addon.data.dialog?.window?.close();
	// Remove addon object
	addon.data.alive = false;
	// @ts-ignore - Plugin instance is not typed
	delete Zotero[config.addonInstance];
}

export default {
	onStartup,
	onShutdown,
	onMainWindowLoad,
	onMainWindowUnload,
};
