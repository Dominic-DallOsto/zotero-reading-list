/* global Components, Services */
/* global APP_SHUTDOWN */
Components.utils.import("resource://gre/modules/Services.jsm");

const PREF_BRANCH = 'extensions.zotero-reading-list.';

// eslint-disable-next-line no-unused-vars
function install(data, reason) {

}

// eslint-disable-next-line no-unused-vars
function startup(data, reason) {
	ZoteroReadingList.init();
}

// eslint-disable-next-line no-unused-vars
function shutdown(data, reason) {
	if (reason == APP_SHUTDOWN) {
		return;
	}

	const windows = Services.wm.getEnumerator('navigator:browser');
	while (windows.hasMoreElements()) {
		const tmpWin=windows.getNext();

		tmpWin.ZoteroReadingListChrome.removeXUL();
		if (typeof tmpWin.ZoteroReadingListChrome.zoteroOverlay != 'undefined') {
			tmpWin.ZoteroReadingListChrome.zoteroOverlay.unload();
		}
		delete tmpWin.ZoteroReadingListChrome;
		delete tmpWin.ZoteroReadingList;
	}

	ZoteroReadingList.cleanup();

	Services.strings.flushBundles();
}

// eslint-disable-next-line no-unused-vars
function uninstall(data, reason) {

}

const ZoteroReadingList = {
	/********************************************/
	// ZoteroReadingList setup functions
	/********************************************/
	init: function() {
		// Register observers that will respond to notifications triggered by preference changes
		// this.observers.register()

		// Set default preferences and watch changes
		this.Prefs.init()

		this.prepareWindows()
	},

	cleanup: function() {
		// this.Prefs.unregister();
		// this.observers.unregister();
		Services.wm.removeListener(this.windowListener);
	},

	prepareWindows: function() {
		// Load scripts for previously opened windows
		const windows = Services.wm.getEnumerator('navigator:browser');
		while (windows.hasMoreElements()) {
			this.loadWindowChrome(windows.getNext());
		}

		// Add listener to load scripts in windows opened in the future
		Services.wm.addListener(this.windowListener);
	},

	// Why does wm.addListener's listener object's onOpenWindow method
	// expect a xulWindow that I have to convert to a domWindow,
	// whereas wm.getEnumerator returns domWindows (or at least windows
	// I can provide directly to loadWindowChrome?
	windowListener: {
		onOpenWindow: function(xulWindow) {
			// Wait for the window to finish loading
			var domWindow = xulWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindow)

			domWindow.addEventListener('load', function listener() {
				domWindow.removeEventListener('load', listener, false)
				if (domWindow.document.documentElement.getAttribute('windowtype') == 'navigator:browser') {
					ZoteroReadingList.loadWindowChrome(domWindow);
				}
			}, false)
		},
		onCloseWindow: function(_xulWindow) {},
		onWindowTitleChange: function(_xulWindow, _newTitle) {}
	},

	loadWindowChrome: function(scope) {
		scope.ZoteroReadingList = {};
		scope.ZoteroReadingList.Prefs = this.Prefs;

		// Define ZoteroReadingListChrome as window property so it can be deleted on shutdown
		scope.ZoteroReadingListChrome = {};
		Services.scriptloader.loadSubScript('chrome://zotero-reading-list/content/main.js', scope);
		scope.ZoteroReadingListChrome.zoteroOverlay.init();
	}
}

ZoteroReadingList.Prefs = {
	init: function() {
		this.prefBranch = Services.prefs.getBranch(PREF_BRANCH);
		this.setDefaults()

		// Register observer to handle pref changes
		this.register()
	},

	setDefaults: function() {
		const defaults = Services.prefs.getDefaultBranch(PREF_BRANCH);
		defaults.setBoolPref('showIcons', true);
	},

	get: function(pref, global) {
		let prefVal;
		try {
			let branch;
			if (global) {
				branch = Services.prefs.getBranch('');
			} else {
				branch = this.prefBranch;
			}

			switch (branch.getPrefType(pref)){
				case branch.PREF_BOOL:
					prefVal = branch.getBoolPref(pref);
					break;
				case branch.PREF_STRING:
					prefVal = branch.getCharPref(pref);
					break;
				case branch.PREF_INT:
					prefVal = branch.getIntPref(pref);
					break;
			}
		}
		catch (e) {
			throw new Error('Invalid pref call for ' + pref);
		}

		return prefVal;
	},

	set: function(pref, value) {
		switch (this.prefBranch.getPrefType(pref)){
			case this.prefBranch.PREF_BOOL:
				return this.prefBranch.setBoolPref(pref, value);
			case this.prefBranch.PREF_STRING:
				return this.prefBranch.setCharPref(pref, value);
			case this.prefBranch.PREF_INT:
				return this.prefBranch.setIntPref(pref, value);
		}

		return false;
	},

	clear: function(pref) {
		try {
			this.prefBranch.clearUserPref(pref);
		}
		catch (e) {
			throw new Error('Invalid preference "' + pref + '"');
		}
	},

	//
	// Methods to register a preferences observer
	//
	register: function() {
		this.prefBranch.addObserver('', this, false);
	},

	unregister: function() {
		if (!this.prefBranch) {
			return;
		}
		this.prefBranch.removeObserver('', this);
	}
}
