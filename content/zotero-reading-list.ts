import PreferencesManager from './preferences-manager';
import ZoteroOverlay from './overlay';

declare const Zotero: any;

export class ReadingList { // tslint:disable-line:variable-name
	private initialized = false;

	private overlay: ZoteroOverlay;

	public prefs: PreferencesManager;

	// eslint-disable-next-line require-await, @typescript-eslint/require-await
	public load() {
		if (this.initialized) return;
		this.initialized = true;

		this.prefs = new PreferencesManager();
		this.overlay = new ZoteroOverlay(this.prefs);
	}
}

Zotero.readingList = new ReadingList();
Zotero.readingList.load();
