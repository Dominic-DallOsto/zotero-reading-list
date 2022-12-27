
declare const Components: any;
Components.utils.import('resource://gre/modules/AddonManager.jsm');

export default class ChromeManager {
	private static chromeManager: ChromeManager;

	private static XULRootElements:string[] = [];

	public static init() {
		window.setTimeout(function () {
			if (typeof this.chromeManager != 'undefined') {
				ChromeManager.showUpgradeMessage();
			}
		}, 500);
	}

	private static showUpgradeMessage() {
		//
	}

	// Track XUL elements with ids elementIDs that were added to document doc, so
	// that they may be removed on shutdown
	public static registerXULElement(element:HTMLElement, doc) {
		if (typeof doc.ZoteroReadingListXULRootElements == 'undefined') {
			doc.ZoteroReadingListXULRootElements = [];
		}

		var xulRootElements;
		if (doc == document) {
			xulRootElements = ChromeManager.XULRootElements;
		} else {
			xulRootElements = doc.ZoteroReadingListXULRootElements;
		}

		xulRootElements.push(element.id);
	}

	// Remove all root XUL elements from main document and any Zotero tab documents
	public static removeXUL() {
		this.removeDocumentXUL(document, this.XULRootElements);
	}

	public static removeDocumentXUL(doc:Document, XULRootElementIDs:string[]) {
		while (XULRootElementIDs.length > 0) {
			const element = doc.getElementById(XULRootElementIDs.pop());
			if (element) {
				element.parentNode.removeChild(element);
			}
		}
	}
}
