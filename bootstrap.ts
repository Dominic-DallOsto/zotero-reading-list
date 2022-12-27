/* eslint-disable @typescript-eslint/no-empty-function */

declare const Services: any;
declare const Components: any;
Components.utils.import('resource://gre/modules/Services.jsm');

enum Reason {
	APP_STARTUP     = 1, // The application is starting up.
	APP_SHUTDOWN    = 2, // The application is shutting down.
	ADDON_ENABLE    = 3, // The add-on is being enabled.
	ADDON_DISABLE   = 4, // The add-on is being disabled. (Also sent during uninstallation)
	ADDON_INSTALL   = 5, // The add-on is being installed.
	ADDON_UNINSTALL = 6, // The add-on is being uninstalled.
	ADDON_UPGRADE   = 7, // The add-on is being upgraded.
	ADDON_DOWNGRADE = 8, // The add-on is being downgraded.
}

type BootstrapData = {
	id:           string  // The ID of the add-on being bootstrapped.
	version:      string  // The version of the add-on being bootstrapped.
	installPath:  any     // nsIFile; The installation location of the add-on being bootstrapped. This may be a directory or an XPI file depending on whether the add-on is installed unpacked or not.
	resourceURI:  any     // nsIURI; A URI pointing at the root of the add-ons files, this may be a jar: or file: URI depending on whether the add-on is installed unpacked or not.
	oldVersion:   string  // The previously installed version, if the reason is ADDON_UPGRADE or ADDON_DOWNGRADE, and the method is install or startup.
	newVersion:   string  // The version to be installed, if the reason is ADDON_UPGRADE or ADDON_DOWNGRADE, and the method is shutdown or uninstall.
};

const patch_marker = 'UnpatchedZoteroReadingList';
function patch(object, method, patcher) {
	if (object[method][patch_marker]) return;
	object[method][patch_marker] = object[method];
	object[method] = patcher(object[method]);
}

class ZoteroApiEndpoint {
	public install(_data: BootstrapData, _reason: Reason) {
		// await Zotero.Schema.schemaUpdatePromise;
	}

	public uninstall(_data: BootstrapData, _reason: Reason) {
		// await Zotero.Schema.schemaUpdatePromise;
	}

	public async startup(_data: BootstrapData, _reason: Reason) {
		const window = await this.waitForWindow() as {Zotero: any};

		// If we load a module as a subscript, it will have access to Zotero as a global variable
		Services.scriptloader.loadSubScript('chrome://zotero-reading-list/content/zotero-reading-list.js', window);
	}

	async waitForWindow() {
		return new Promise((resolve) => {
			// Check if window is already loaded
			const windows = Services.wm.getEnumerator('navigator:browser');
			while (windows.hasMoreElements()) {
				resolve(windows.getNext());
			}
			// If not, add a listener for when the window does load
			const windowListener = {
				onOpenWindow: (xulWindow) => {
					// Wait for the window to finish loading
					const domWindow = xulWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindow);

					// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
					domWindow.addEventListener('load', function listener() {
						domWindow.removeEventListener('load', listener, false);
						if (domWindow.document.documentElement.getAttribute('windowtype') === 'navigator:browser') {
							resolve(domWindow);
						}
					}, false);
				},
				onCloseWindow: (_xulWindow) => {},
				onWindowTitleChange: (_xulWindow, _newTitle) => {}
			};

			// Add listener to load scripts in windows opened in the future
			Services.wm.addListener(windowListener);
		});
	}

	public shutdown(_data: BootstrapData, _reason: Reason) {
		// await Zotero.Schema.schemaUpdatePromise;
	}

}

const ApiEndpoint = new ZoteroApiEndpoint;

export const install = ApiEndpoint.install.bind(ApiEndpoint);
export const uninstall = ApiEndpoint.uninstall.bind(ApiEndpoint);
export const startup = ApiEndpoint.startup.bind(ApiEndpoint);
export const shutdown = ApiEndpoint.shutdown.bind(ApiEndpoint);
