import { Type } from "typescript";

declare const Services: any;
declare const Components: any;
Components.utils.import('resource://gre/modules/Services.jsm');

const PREF_BRANCH = 'extensions.zotero-reading-list.';

export class Preference {
	public name: string;

	public castType: (_: any) => boolean|string|number;

	public defaultValue: boolean|string|number;

	public description: string;

	constructor(name: string, defaultValue: boolean|string|number, description: string) {
		this.name = name;
		this.defaultValue = defaultValue;
		this.description = description;
	}

	public set: (branch, value: boolean|string|number) => void;
}

class BooleanPreference extends Preference{
	constructor(name: string, defaultValue: boolean, description: string) {
		super(name, defaultValue, description)
		this.castType = (x: any) => x as boolean;
		this.set = function (branch, value: boolean) {
			branch.setBoolPref(name, value)
		};
	}
}

class StringPreference extends Preference{
	constructor(name: string, defaultValue: string, description: string) {
		super(name, defaultValue, description)
		this.castType = (x: any) => x as string;
		this.set = function (branch, value: boolean) {
			branch.setCharPref(name, value)
		};
	}
}

class IntPreference extends Preference{
	constructor(name: string, defaultValue: number, description: string) {
		super(name, defaultValue, description)
		this.castType = (x: any) => x as number;
		this.set = function (branch, value: boolean) {
			branch.setIntPref(name, value)
		};
	}
}

export class PreferencesManager {
	private prefBranch: any;

	public preferenceList = {
		SHOW_ICONS: new BooleanPreference("showIcons", true, "Show Read Status Icons in Item Tree"),
		LABEL_NEW_ITEMS: new BooleanPreference("labelNewItems", false, "Automatically Label New Items"),
		ENABLE_KEYBOARD_SHORTCUTS: new BooleanPreference("enableKeyboardShortcuts", true, "Enable Keyboard Shortcuts")
	}

	constructor() {
		this.prefBranch = Services.prefs.getBranch(PREF_BRANCH);
		this.setDefaults()

		// Register observer to handle pref changes
		this.register()
	}

	setDefaults() {
		const defaults = Services.prefs.getDefaultBranch(PREF_BRANCH);
		for (const [, preference] of Object.entries(this.preferenceList)){
			preference.set(defaults, preference.defaultValue);
		}
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
