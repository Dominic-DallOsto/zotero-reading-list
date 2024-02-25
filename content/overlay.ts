import ChromeManager from './chromeManager';
import PreferencesManager from './preferences-manager';
import {patch} from './patcher';

declare const Zotero: any;
declare const ZoteroPane: any;
declare const window: any;

const READ_STATUS_COLUMN_ID = 'readstatus';
const READ_STATUS_COLUMN_NAME = 'Read Status';
const READ_STATUS_EXTRA_FIELD = 'Read_Status';
const READ_DATE_EXTRA_FIELD = 'Read_Status_Date';
const STATUS_NAMES = ["New", "To Read", "In Progress", "Read", "Not Reading"];
const STATUS_ICONS = ["\u2B50", "\uD83D\uDCD9", "\uD83D\uDCD6", "\uD83D\uDCD7", "\uD83D\uDCD5"];

let ENABLE_ICONS: boolean;
let LABEL_NEW_ITEMS: boolean;
let ENABLE_KEYBOARD_SHORTCUTS: boolean;
const ENABLE_ICONS_PREF = "showIcons";
const LABEL_NEW_ITEMS_PREF = "labelNewItems";
const ENABLE_KEYBOARD_SHORTCUTS_PREF = "enableKeyboardShortcuts";

/**
 * Return values for extra field fields.
 * @param {Zotero.Item} item - A Zotero item.
 * @param {string} fieldName - The extra field field name desired.
 * @returns {String[]} values - Array of values for the desired extra field field.
 */
function getItemExtraProperty (item, fieldName:string): string[] {
	const pattern = new RegExp(`^${fieldName}:(.+)$`, 'i')
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return item.getField('extra')
		.split(/\n/g)
		.map((line: string) => {
			const lineMatch = line.match(pattern);
			if(lineMatch) return lineMatch[1].trim(); //what our capture group found, with whitespace trimmed
			else return false;
		})
		.filter(Boolean);
}

/**
 * Set field value in extra field item.
 * It sets: therefore, if already exists, replaces
 * @param {Zotero.Item} item - A Zotero item.
 * @param {string} fieldName - The name of the extra field to be set.
 * @param {String[]} values - An array of values for the field to be set.
 */
function setItemExtraProperty (item, fieldName, values) {
	const pattern = new RegExp(`^${fieldName}:.+$`, 'i')
	if (!Array.isArray(values)) values = [values];
	let restOfExtraField = item.getField('extra')
		.split(/\n/g)
		.filter((line) => !(line.match(pattern)))
		.join('\n');

	for (let value of values) {
		if (value) {
			// make sure there are no new lines!
			restOfExtraField += `\n${fieldName}: ${value.trim()}`;
		}
	}
	item.setField('extra', restOfExtraField);
}

/**
 * Format name of status to include icon if enabled.
 * @param {string} statusName - The name of the status.
 * @returns {String} values - Name of the status, possibly prefixed with the corresponding icon.
 */
function formatStatusName(statusName: string): string{
	if(ENABLE_ICONS){
		const statusIndex = STATUS_NAMES.indexOf(statusName);
		if (statusIndex > -1){
			return `${STATUS_ICONS[statusIndex]} ${statusName}`;
		}
	}
	return statusName;
}

function getItemReadStatus(item){
	const statusField = getItemExtraProperty(item, READ_STATUS_EXTRA_FIELD);
	if (statusField.length == 1){
		return statusField[0];
	}
	return "";
}

function createElementWithAttributes(name:string, attributes:Record<string, string>, document:Document){
	const element = document.createElement(name);
	for (let [attributeName, attributeValue] of Object.entries(attributes)){
		element.setAttribute(attributeName, attributeValue);
	}
	return element;
}

export default class ZoteroOverlay {
	public prefs: PreferencesManager;

	private itemAddedID: string;

	constructor(prefs: PreferencesManager) {
		this.prefs = prefs;
		ENABLE_ICONS = this.initialisePreference(ENABLE_ICONS_PREF, true) as boolean;
		LABEL_NEW_ITEMS = this.initialisePreference(LABEL_NEW_ITEMS_PREF, false) as boolean;
		ENABLE_KEYBOARD_SHORTCUTS = this.initialisePreference(ENABLE_KEYBOARD_SHORTCUTS_PREF, true) as boolean;

		ChromeManager.init();
		this.fullOverlay();
		this.addReadStatusColumn();

		if (LABEL_NEW_ITEMS) {
			this.addNewItemObserver();
		}
		if (ENABLE_KEYBOARD_SHORTCUTS){
			this.addKeyboardShortcutListener();
		}
	}

	public unload() {
		ChromeManager.removeXUL();
		this.removeNewItemObserver();
		this.removeKeyboardShortcutListener();
	}

	initialisePreference(preferenceKey: string, defaultValue: string | number | boolean) {
		let value: string | number | boolean;
		value = this.prefs.get(preferenceKey);
		if (value === undefined) {
			value = defaultValue;
			this.prefs.set(preferenceKey, defaultValue);
		}
		return value;
	}

	addNewItemObserver() {
		const addItemHandler = (action: string, type: string, ids: number[]) => {
			if (action == 'add') {
				const items = Zotero.Items.get(ids);

				for (const item of items) {
					setItemExtraProperty(item, READ_STATUS_EXTRA_FIELD, "New");
					setItemExtraProperty(item, READ_DATE_EXTRA_FIELD, new Date(Date.now()).toISOString());
					item.saveTx();
				}
			}
		};

		this.itemAddedID = Zotero.Notifier.registerObserver({
			notify(...args) {
				// eslint-disable-next-line prefer-spread
				addItemHandler.apply(null, args);
			}
		}, ['item'], 'zotero-reading-list', 1);
	}

	removeNewItemObserver() {
		if (this.itemAddedID) {
			Zotero.Notifier.unregisterObserver(this.itemAddedID);
		}
	}

	// needs to be an arrow function, else the linter will complain about it resetting the `this`
	keyboardEventHandler = (keyboardEvent: KeyboardEvent) => {
		// Check modifiers - want Alt+{1,2,3,4,5} to label the currently selected items
		if (!keyboardEvent.ctrlKey && !keyboardEvent.shiftKey && keyboardEvent.altKey){
			if (['1', '2', '3', '4', '5'].includes(keyboardEvent.key)){
				const selectedStatus = STATUS_NAMES[['1', '2', '3', '4', '5'].indexOf(keyboardEvent.key)];
				// eslint-disable-next-line no-void
				void this.setSelectedItemsReadStatus('item', selectedStatus);
			}
		}
	}

	addKeyboardShortcutListener() {
		// different approach compared to Zutilo https://github.com/wshanks/Zutilo/issues/71#issuecomment-360986808
		document.addEventListener("keydown", this.keyboardEventHandler);
	}

	removeKeyboardShortcutListener() {
		document.removeEventListener("keydown", this.keyboardEventHandler);
	}

	public addReadStatusColumn() {
		// Code from better Bibtex used as example:
        // https://github.com/retorquere/zotero-better-bibtex/blob/d6b21b855237f05e7ab48b5a52d0188227dd044e/content/better-bibtex.ts#L267
        // This first half of the if statement is for compatibility with newer versions of Zotero after this commit:
        // https://github.com/zotero/zotero/commit/cbbff600a60c9e7a7407d6f2e4053309bf28b872#diff-f9d76d8fc0067fd30009f09edd0404cd7e58fd2b3366cd15bc1982e168da1db9
        if (typeof Zotero.ItemTreeView === 'undefined') {
            // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
            const itemTree = require('zotero/itemTree');

			patch(itemTree.prototype, 'getColumns', (original) => function Zotero_ItemTree_prototype_getColumns() {
				const columns = original.apply(this, arguments);
				columns.push({
					dataKey: READ_STATUS_COLUMN_ID,
					label: READ_STATUS_COLUMN_NAME,
					flex: '1',
					zoteroPersist: new Set(['width', 'ordinal', 'hidden', 'sortActive', 'sortDirection'])
                });

				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				return columns
			})

            patch(itemTree.prototype, '_renderCell', (original) => function Zotero_ItemTree_prototype_renderCell(index, data, col) {
                if (col.id !== READ_STATUS_COLUMN_ID) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    return original.apply(this, arguments);
                }

                const text = document.createElementNS('http://www.w3.org/1999/xhtml', 'span');
                text.className = 'cell-text';
                text.innerText = data;

                const cell = document.createElementNS('http://www.w3.org/1999/xhtml', 'span');
                cell.className = `cell ${col.className}`;
                cell.append(text);

                return cell;
            });
        }
        else {
            patch(Zotero.ItemTreeView.prototype, 'getCellText', (original) => function Zotero_ItemTreeView_prototype_getCellText(row: any, col: { id: string }): string {
                if (col.id !== READ_STATUS_COLUMN_ID) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    return original.apply(this, arguments);
                }

				const item = this.getRow(row).ref;
				return formatStatusName(getItemReadStatus(item));
            });
        }

        patch(Zotero.ItemFields, 'isFieldOfBase', (original) => function Zotero_ItemFields_isFieldOfBase(field: string, _baseField: any) {
            if (field == READ_STATUS_COLUMN_ID) return false
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return original.apply(this, arguments)
        });

        // the value from getField is used by Zotero for sorting the column
		// and in Zotero 6+ for showing the text in the column
        patch(Zotero.Item.prototype, 'getField', (original) => function Zotero_Item_prototype_getField(field: any, unformatted: any, includeBaseMapped: any) {
            if (field != READ_STATUS_COLUMN_ID) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				return original.apply(this, arguments)
			}
			else if(this.isRegularItem()){
				try {
					return formatStatusName(getItemReadStatus(this));
				}
				catch (err) {
					// eslint-disable-next-line no-console
					console.error('patched getField had error:', {field, unformatted, includeBaseMapped, err})
				}
			}
			else {
				return '';
			}
        });
	}


	/******************************************/
	// XUL overlay functions
	/******************************************/
	public fullOverlay() {
		// Add all overlay elements to the window
		this.overlayZoteroPane(document);
	}

	public overlayZoteroPane(doc:Document) {
		this.overlayZoteroPopup('item', doc);

		// add preferences to Tools popup menu
		const menuPopup= doc.getElementById('menu_ToolsPopup');
		this.prefsMenuItem(doc, menuPopup);

		// we only want to run this for older versions of Zotero
		if (typeof Zotero.ItemTreeView !== 'undefined') {
			const itemTreeColumnHeader = doc.getElementById('zotero-items-columns-header');
			this.itemTreeColumnHeaders(doc, itemTreeColumnHeader);
		}
	}

	// Create XUL for Zotero menu elements
	overlayZoteroPopup(menuName:string, doc:Document) {
		const zoteroMenu = doc.getElementById(`zotero-${menuName}menu`);
		if (zoteroMenu === null) {
			// Don't do anything if elements not loaded yet
			return;
		}

		const separator = createElementWithAttributes('menuseparator',
		{
			'id': `readstatus-${menuName}-submenu-separator`
		}, doc)
		zoteroMenu.appendChild(separator);
		ChromeManager.registerXULElement(separator, doc);

		const submenu = createElementWithAttributes('menu',
		{
			'id': `readstatus-${menuName}-submenu`,
			'label': READ_STATUS_COLUMN_NAME
		}, doc)
		zoteroMenu.appendChild(submenu);
		ChromeManager.registerXULElement(submenu, doc);

		// Item menu popup
		const submenuPopup = createElementWithAttributes('menupopup',
		{
			'id': `readstatus-${menuName}-submenu-popup`
		}, doc)
		submenu.appendChild(submenuPopup);
		ChromeManager.registerXULElement(submenuPopup, doc);

		this.createMenuItems(menuName, submenuPopup, `readstatus-${menuName}-submenu-`, false, doc);
	}

	// Create Zotero item menu items as children of menuPopup
	createMenuItems (menuName:string, menuPopup:HTMLElement, IDPrefix:string, elementsAreRoot:boolean, doc:Document) {
		for (const statusName of STATUS_NAMES) {
			const menuFunc = this.setStatusFunction(menuName, statusName, IDPrefix, doc);
			menuPopup.appendChild(menuFunc);
			if (elementsAreRoot) {
				ChromeManager.registerXULElement(menuFunc, doc);
			}
		}
	}

	async setSelectedItemsReadStatus (menuName:string, statusName:string) {
		const items = await this.getSelectedItems(menuName);
		for (const item of items) {
			setItemExtraProperty(item, READ_STATUS_EXTRA_FIELD, statusName);
			setItemExtraProperty(item, READ_DATE_EXTRA_FIELD, new Date(Date.now()).toISOString());
			item.saveTx();
		}
	}

	// Create Zotero item menu item
	setStatusFunction(menuName:string, statusName:string, IDPrefix:string, doc:Document) {
		const menuFunc = createElementWithAttributes('menuitem',
		{
			'id': IDPrefix + statusName,
			'label': statusName
		}, doc)
		menuFunc.addEventListener('command',
			(event) => {
				event.stopPropagation();
				// eslint-disable-next-line no-void
				void this.setSelectedItemsReadStatus(menuName, statusName);
			}, false)
		return menuFunc;
	}

	prefsMenuItem(doc: Document, menuPopup) {
		// Add preferences to Tools menu
		if (menuPopup === null) {
			// Don't do anything if elements not loaded yet
			return;
		}

		const preferencesSubmenu = doc.createElement('menu');
		const preferencesSubmenuID = `zotero-reading-list-preferences-submenu`;
		preferencesSubmenu.setAttribute('id', preferencesSubmenuID);
		preferencesSubmenu.setAttribute('label', 'Zotero Reading List Preferences');
		menuPopup.appendChild(preferencesSubmenu);
		ChromeManager.registerXULElement(preferencesSubmenu, doc);

		const preferencesSubmenuPopup = doc.createElement('menupopup');
		const preferencesSubmenuPopupItemID = `zotero-reading-list-preferences-submenu-popup`
		preferencesSubmenuPopup.setAttribute('id', preferencesSubmenuPopupItemID);
		preferencesSubmenu.appendChild(preferencesSubmenuPopup);

		const showIconPref = doc.createElement('menuitem');
		showIconPref.setAttribute('id', 'zotero-reading-list-preferences-show-icons');
		showIconPref.setAttribute('label', 'Show Read Status Icons in Item Tree');
		showIconPref.setAttribute('type', 'checkbox');
		showIconPref.setAttribute('checked', ENABLE_ICONS.toString());
		showIconPref.addEventListener('command',
			(event) => {
				ENABLE_ICONS = !ENABLE_ICONS
				this.prefs.set(ENABLE_ICONS_PREF, ENABLE_ICONS);
				event.stopPropagation();
			}, false)
		preferencesSubmenuPopup.appendChild(showIconPref);

		const labelNewItemsPref = doc.createElement('menuitem');
		labelNewItemsPref.setAttribute('id', 'zotero-reading-list-preferences-label-new-items');
		labelNewItemsPref.setAttribute('label', 'Automatically Label New Items');
		labelNewItemsPref.setAttribute('type', 'checkbox');
		labelNewItemsPref.setAttribute('checked', LABEL_NEW_ITEMS.toString());
		labelNewItemsPref.addEventListener('command',
			(event) => {
				LABEL_NEW_ITEMS = !LABEL_NEW_ITEMS
				this.prefs.set(LABEL_NEW_ITEMS_PREF, LABEL_NEW_ITEMS);
				if (LABEL_NEW_ITEMS) {
					this.addNewItemObserver();
				}
				else {
					this.removeNewItemObserver();
				}
				event.stopPropagation();
			}, false)
		preferencesSubmenuPopup.appendChild(labelNewItemsPref);

		const enableKeyboardShortcutsPref = doc.createElement('menuitem');
		enableKeyboardShortcutsPref.setAttribute('id', 'zotero-reading-list-preferences-enable-keyboard-shortcuts');
		enableKeyboardShortcutsPref.setAttribute('label', 'Enable Keyboard Shortcuts');
		enableKeyboardShortcutsPref.setAttribute('type', 'checkbox');
		enableKeyboardShortcutsPref.setAttribute('checked', ENABLE_KEYBOARD_SHORTCUTS.toString());
		enableKeyboardShortcutsPref.addEventListener('command',
			(event) => {
				ENABLE_KEYBOARD_SHORTCUTS = !ENABLE_KEYBOARD_SHORTCUTS
				this.prefs.set(ENABLE_KEYBOARD_SHORTCUTS_PREF, ENABLE_KEYBOARD_SHORTCUTS);
				if (ENABLE_KEYBOARD_SHORTCUTS) {
					this.addKeyboardShortcutListener();
				}
				else {
					this.removeKeyboardShortcutListener();
				}
				event.stopPropagation();
			}, false)
		preferencesSubmenuPopup.appendChild(enableKeyboardShortcutsPref);
	}

	/******************************************/
	// Item tree functions
	/******************************************/
	// Create Read Status column header in item tree
	itemTreeColumnHeaders(doc: Document, tree) {
		const getTreecol = (treecolID: string, label: string) => {
			const treecol = doc.createElement('treecol');
			treecol.setAttribute('id', treecolID);
			treecol.setAttribute('label', label);
			treecol.setAttribute('flex', '1');
			treecol.setAttribute('zotero-persist', 'width ordinal hidden sortActive sortDirection');
			return treecol;
		}
		const getSplitter = () => {
			const splitter = doc.createElement('splitter');
			splitter.setAttribute('class', 'tree-splitter');
			return splitter;
		}
		const treecolReadStatus = getTreecol(READ_STATUS_COLUMN_ID, READ_STATUS_COLUMN_NAME);
		tree.appendChild(getSplitter());
		tree.appendChild(treecolReadStatus);
		ChromeManager.registerXULElement(treecolReadStatus, doc);
	}

	/******************************************/
	// Functions for item tree batch actions
	/******************************************/
	/**
	 * Return selected regular items
	 * @param {String} menuName Zotero popup menu firing the action: 'item' or 'collection'
	 * @return {Array} Array of selected regular items
	 */
	async getSelectedItems(menuName) {
		let items;
		switch (menuName) {
			case 'item': {
				items = ZoteroPane.getSelectedItems()
				break;
			}
			case 'collection': {
				const collectionTreeRow = ZoteroPane.getCollectionTreeRow();
				if (collectionTreeRow.isCollection()) {
					const collection = ZoteroPane.getSelectedCollection();
					items = collection.getChildItems();
				} else if (collectionTreeRow.isLibrary()) {
					const libraryID = ZoteroPane.getSelectedLibraryID();
					items = await Zotero.Items.getAll(libraryID);
				}
				break;
			}
		}
		items = items.filter((item) => item.isRegularItem() as boolean);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return items;
	}

}
