declare const Services: any;
declare const Components: any;
Components.utils.import('resource://gre/modules/Services.jsm');

const PREF_BRANCH = 'extensions.zotero-reading-list.';

export default class PreferencesManager {
	private prefBranch: any;

	constructor() {
		this.prefBranch = Services.prefs.getBranch(PREF_BRANCH);
		this.setDefaults()

		// Register observer to handle pref changes
		this.register()
	}

	setDefaults() {
		const defaults = Services.prefs.getDefaultBranch(PREF_BRANCH);
		defaults.setBoolPref('showIcons', true);
	}

	get(pref: string, global = false) {
		let prefVal: boolean|string|number;
		try {
			let branch;
			if (global) {
				branch = Services.prefs.getBranch('');
			} else {
				branch = this.prefBranch;
			}

			switch (branch.getPrefType(pref)){
				case branch.PREF_BOOL:
					prefVal = branch.getBoolPref(pref) as boolean;
					break;
				case branch.PREF_STRING:
					prefVal = branch.getCharPref(pref) as string;
					break;
				case branch.PREF_INT:
					prefVal = branch.getIntPref(pref) as number;
					break;
			}
		}
		catch (e) {
			throw new Error('Invalid pref call for ' + pref);
		}

		return prefVal;
	}

	set(pref: string, value: boolean|string|number) {
		switch (this.prefBranch.getPrefType(pref)){
			case this.prefBranch.PREF_BOOL:
				return this.prefBranch.setBoolPref(pref, value) as boolean;
			case this.prefBranch.PREF_STRING:
				return this.prefBranch.setCharPref(pref, value) as string;
			case this.prefBranch.PREF_INT:
				return this.prefBranch.setIntPref(pref, value) as number;
		}

		return false;
	}

	clear(pref: string) {
		try {
			this.prefBranch.clearUserPref(pref);
		}
		catch (e) {
			throw new Error('Invalid preference "' + pref + '"');
		}
	}

	//
	// Methods to register a preferences observer
	//
	register() {
		this.prefBranch.addObserver('', this, false);
	}

	unregister() {
		if (!this.prefBranch) {
			return;
		}
		this.prefBranch.removeObserver('', this);
	}
}
