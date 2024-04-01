import { MenuitemOptions } from "zotero-plugin-toolkit/dist/managers/menu";
import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { patch as $patch$ } from "../utils/patcher";
import {
	setPref,
	getPref,
	initialiseDefaultPref,
	getPrefGlobalName,
} from "../utils/prefs";

const READ_STATUS_COLUMN_ID = "readstatus";
const READ_STATUS_COLUMN_NAME = "Read Status";
const READ_STATUS_EXTRA_FIELD = "Read_Status";
const READ_DATE_EXTRA_FIELD = "Read_Status_Date";

export const DEFAULT_STATUS_NAMES = [
	"New",
	"To Read",
	"In Progress",
	"Read",
	"Not Reading",
];
export const DEFAULT_STATUS_ICONS = ["⭐", "📙", "📖", "📗", "📕"];

export const SHOW_ICONS_PREF = "show-icons";
export const LABEL_NEW_ITEMS_PREF = "label-new-items";
export const LABEL_ITEMS_WHEN_OPENING_FILE = "label-items-when-opening-file";
export const ENABLE_KEYBOARD_SHORTCUTS_PREF = "enable-keyboard-shortcuts";
export const STATUS_NAME_AND_ICON_LIST_PREF = "statuses-and-icons-list";

function isString(argument: any): argument is string {
	return typeof argument == "string";
}

function getFieldValueFromExtraData(extraData: string, fieldName: string) {
	const pattern = new RegExp(`^${fieldName}:(.+)$`, "i");
	return extraData
		.split(/\n/g)
		.map((line: string) => {
			const lineMatch = line.match(pattern);
			if (lineMatch)
				return lineMatch[1].trim(); //what our capture group found, with whitespace trimmed
			else return false;
		})
		.filter(isString);
}

function removeFieldValueFromExtraData(extraData: string, fieldName: string) {
	const pattern = new RegExp(`^${fieldName}:(.+)$`, "i");
	return extraData
		.split(/\n/g)
		.filter((line) => !line.match(pattern))
		.join("\n");
}

/**
 * Return values for extra field fields.
 * @param {Zotero.Item} item - A Zotero item.
 * @param {string} fieldName - The extra field field name desired.
 * @returns {String[]} values - Array of values for the desired extra field field.
 */
function getItemExtraProperty(item: Zotero.Item, fieldName: string): string[] {
	return getFieldValueFromExtraData(item.getField("extra"), fieldName);
}

/**
 * Set field value in extra field item.
 * It sets: therefore, if already exists, replaces
 * @param {Zotero.Item} item - A Zotero item.
 * @param {string} fieldName - The name of the extra field to be set.
 * @param {String[]} values - An array of values for the field to be set.
 */
function setItemExtraProperty(
	item: Zotero.Item,
	fieldName: string,
	values: string | string[],
) {
	if (!Array.isArray(values)) values = [values];
	let restOfExtraField = removeFieldValueFromExtraData(
		item.getField("extra"),
		fieldName,
	);

	for (const value of values) {
		if (value) {
			// make sure there are no new lines!
			restOfExtraField += `\n${fieldName}: ${value.trim()}`;
		}
	}
	item.setField("extra", restOfExtraField);
}

/**
 * Remove field value in extra field item.
 * @param {Zotero.Item} item - A Zotero item.
 * @param {string} fieldName - The name of the extra field to be set.
 */
function clearItemExtraProperty(item: Zotero.Item, fieldName: string) {
	item.setField(
		"extra",
		removeFieldValueFromExtraData(item.getField("extra"), fieldName),
	);
}

function getItemReadStatus(item: Zotero.Item) {
	const statusField = getItemExtraProperty(item, READ_STATUS_EXTRA_FIELD);
	if (statusField.length == 1) {
		return statusField[0];
	}
	return "";
}

function setItemReadStatus(item: Zotero.Item, statusName: string) {
	setItemExtraProperty(item, READ_STATUS_EXTRA_FIELD, statusName);
	setItemExtraProperty(
		item,
		READ_DATE_EXTRA_FIELD,
		new Date(Date.now()).toISOString(),
	);
	void item.saveTx();
}

function setItemsReadStatus(items: Zotero.Item[], statusName: string) {
	for (const item of items) {
		setItemReadStatus(item, statusName);
	}
}

async function setSelectedItemsReadStatus(
	menuName: string,
	statusName: string,
) {
	const items = await getSelectedItems(menuName);
	setItemsReadStatus(items, statusName);
}

async function clearSelectedItemsReadStatus(menuName: string) {
	const items = await getSelectedItems(menuName);
	for (const item of items) {
		clearItemExtraProperty(item, READ_STATUS_EXTRA_FIELD);
		clearItemExtraProperty(item, READ_DATE_EXTRA_FIELD);
		void item.saveTx();
	}
}

/******************************************/
// Functions for item tree batch actions
/******************************************/
/**
 * Return selected regular items
 * @param {String} menuName Zotero popup menu firing the action: 'item' or 'collection'
 * @return {Array} Array of selected regular items
 */
async function getSelectedItems(menuName: string) {
	let items: Zotero.Item[] = [];
	switch (menuName) {
		case "item": {
			items = ZoteroPane.getSelectedItems();
			break;
		}
		case "collection": {
			const collectionTreeRow = ZoteroPane.getCollectionTreeRow();
			if (collectionTreeRow) {
				// enable type checks when zotero types file is updated
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				if (collectionTreeRow.isCollection()) {
					const collection = ZoteroPane.getSelectedCollection();
					if (collection) {
						items = collection.getChildItems();
					}
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				} else if (collectionTreeRow.isLibrary()) {
					const libraryID = ZoteroPane.getSelectedLibraryID();
					items = await Zotero.Items.getAll(libraryID);
				}
				break;
			}
		}
	}
	return items.filter((item) => item.isRegularItem() as boolean);
}

export function prefStringToList(
	prefString: string | number | boolean | undefined,
) {
	const [statusString, iconString] = (prefString as string).split("|");
	return [statusString.split(";"), iconString.split(";")];
}

export function listToPrefString(stringList: string[], iconList: string[]) {
	return stringList.join(";") + "|" + iconList.join(";");
}

export default class ZoteroReadingList {
	itemAddedListenerID?: string;
	fileOpenedListenerID?: string;
	itemTreeReadStatusColumnId?: string | false;
	preferenceUpdateObservers?: symbol[];
	statusNames: string[];
	statusIcons: string[];

	constructor() {
		this.initialiseDefaultPreferences();
		[this.statusNames, this.statusIcons] = prefStringToList(
			getPref(STATUS_NAME_AND_ICON_LIST_PREF),
		);

		void this.addReadStatusColumn();
		this.addPreferencesMenu();
		this.addRightClickMenuPopup();

		if (getPref(ENABLE_KEYBOARD_SHORTCUTS_PREF)) {
			this.addKeyboardShortcutListener();
		}
		if (getPref(LABEL_NEW_ITEMS_PREF)) {
			this.addNewItemLabeller();
		}
		if (getPref(LABEL_ITEMS_WHEN_OPENING_FILE)) {
			this.addFileOpenedListener();
		}

		this.addPreferenceUpdateObservers();
		this.removeReadStatusFromExports();
	}

	public unload() {
		this.removeReadStatusColumn();
		this.removePreferenceMenu();
		this.removeRightClickMenu();
		this.removeKeyboardShortcutListener();
		this.removeNewItemLabeller();
		this.removeFileOpenedListener();
		this.removePreferenceUpdateObservers();
	}

	initialiseDefaultPreferences() {
		initialiseDefaultPref(SHOW_ICONS_PREF, true);
		initialiseDefaultPref(ENABLE_KEYBOARD_SHORTCUTS_PREF, true);
		initialiseDefaultPref(LABEL_NEW_ITEMS_PREF, false);
		initialiseDefaultPref(LABEL_ITEMS_WHEN_OPENING_FILE, false);
		initialiseDefaultPref(
			STATUS_NAME_AND_ICON_LIST_PREF,
			listToPrefString(DEFAULT_STATUS_NAMES, DEFAULT_STATUS_ICONS),
		);
	}

	addPreferenceUpdateObservers() {
		this.preferenceUpdateObservers = [
			Zotero.Prefs.registerObserver(
				getPrefGlobalName(ENABLE_KEYBOARD_SHORTCUTS_PREF),
				(value: boolean) => {
					if (value) {
						this.addKeyboardShortcutListener();
					} else {
						this.removeKeyboardShortcutListener();
					}
				},
				true,
			) as symbol,
			Zotero.Prefs.registerObserver(
				getPrefGlobalName(LABEL_NEW_ITEMS_PREF),
				(value: boolean) => {
					if (value) {
						this.addNewItemLabeller();
					} else {
						this.removeNewItemLabeller();
					}
				},
				true,
			) as symbol,
			Zotero.Prefs.registerObserver(
				getPrefGlobalName(LABEL_ITEMS_WHEN_OPENING_FILE),
				(value: boolean) => {
					if (value) {
						this.addFileOpenedListener();
					} else {
						this.removeFileOpenedListener();
					}
				},
				true,
			) as symbol,
			Zotero.Prefs.registerObserver(
				getPrefGlobalName(STATUS_NAME_AND_ICON_LIST_PREF),
				(value: string) => {
					[this.statusNames, this.statusIcons] =
						prefStringToList(value);
					this.removeRightClickMenu();
					this.addRightClickMenuPopup();
					this.removeKeyboardShortcutListener();
					this.addKeyboardShortcutListener();
					this.removeReadStatusColumn();
					void this.addReadStatusColumn();
				},
				true,
			) as symbol,
		];
	}

	removePreferenceUpdateObservers() {
		if (this.preferenceUpdateObservers) {
			for (const preferenceUpdateObserverSymbol of this
				.preferenceUpdateObservers) {
				Zotero.Prefs.unregisterObserver(preferenceUpdateObserverSymbol);
			}
		}
	}

	async addReadStatusColumn() {
		const formatStatusName = (statusName: string) =>
			this.formatStatusName(statusName);
		this.itemTreeReadStatusColumnId =
			await Zotero.ItemTreeManager.registerColumns({
				dataKey: READ_STATUS_COLUMN_ID,
				label: READ_STATUS_COLUMN_NAME,
				pluginID: config.addonID,
				dataProvider: (item: Zotero.Item, dataKey: string) => {
					return getItemReadStatus(item);
				},
				// if we put the icon in the dataprovider, it only gets updated when the read status changes
				// putting the icon in the render function updates when the row is clicked or column is sorted
				renderCell: function (
					index: number,
					data: string,
					column: { className: string },
				) {
					const text = document.createElementNS(
						"http://www.w3.org/1999/xhtml",
						"span",
					);
					text.className = "cell-text";
					text.innerText = formatStatusName(data);

					const cell = document.createElementNS(
						"http://www.w3.org/1999/xhtml",
						"span",
					);
					cell.className = `cell ${column.className}`;
					cell.append(text);

					return cell;
				},
			});
	}

	/**
	 * Format name of status to localise text and include icon if enabled.
	 * @param {string} statusName - The name of the status.
	 * @returns {String} values - Name of the status, possibly prefixed with the corresponding icon.
	 */
	formatStatusName(statusName: string): string {
		if (getPref(SHOW_ICONS_PREF)) {
			const statusIndex = this.statusNames.indexOf(statusName);
			if (statusIndex > -1) {
				return `${this.statusIcons[statusIndex]} ${statusName}`;
			}
		}
		return statusName;
	}

	removeReadStatusColumn() {
		if (this.itemTreeReadStatusColumnId) {
			void Zotero.ItemTreeManager.unregisterColumns(
				this.itemTreeReadStatusColumnId,
			);
		}
	}

	addPreferencesMenu() {
		const prefOptions = {
			pluginID: config.addonID,
			src: rootURI + "chrome/content/preferences.xhtml",
			label: getString("prefs-title"),
			image: `chrome://${config.addonRef}/content/icons/favicon.png`,
			defaultXUL: true,
		};
		ztoolkit.PreferencePane.register(prefOptions);
	}

	removePreferenceMenu() {
		ztoolkit.PreferencePane.unregister(config.addonID);
	}

	addRightClickMenuPopup() {
		ztoolkit.Menu.register("item", {
			id: "zotero-reading-list-right-click-item-menu",
			tag: "menu",
			label: getString("menupopup-label"),
			children: [
				{
					tag: "menuitem",
					label: getString("status-none"),
					commandListener: (event) =>
						void clearSelectedItemsReadStatus("item"),
				} as MenuitemOptions,
			].concat(
				this.statusNames.map((status_name: string) => {
					return {
						tag: "menuitem",
						label: status_name,
						commandListener: (event) =>
							setSelectedItemsReadStatus("item", status_name),
					};
				}),
			),
		});
	}

	removeRightClickMenu() {
		ztoolkit.Menu.unregister("zotero-reading-list-right-click-item-menu");
	}

	addNewItemLabeller() {
		const addItemHandler = (
			action: string,
			type: string,
			ids: string[] | number[],
			extraData: any,
		) => {
			if (action == "add") {
				const items = Zotero.Items.get(ids);

				setItemsReadStatus(items, "New");
			}
		};

		this.itemAddedListenerID = Zotero.Notifier.registerObserver(
			{
				notify(...args) {
					// eslint-disable-next-line prefer-spread
					addItemHandler.apply(null, args);
				},
			},
			["item"],
			"zotero-reading-list",
			1,
		);
	}

	removeNewItemLabeller() {
		if (this.itemAddedListenerID) {
			Zotero.Notifier.unregisterObserver(this.itemAddedListenerID);
		}
	}

	addFileOpenedListener() {
		const fileOpenHandler = (
			action: string,
			type: string,
			ids: string[] | number[],
			extraData: any,
		) => {
			if (action == "open") {
				const items = Zotero.Items.getTopLevel(
					Zotero.Items.get(ids as number[]),
				);

				setItemsReadStatus(
					items.filter((item) => getItemReadStatus(item) == "New"),
					"In Progress",
				);
			}
		};

		this.fileOpenedListenerID = Zotero.Notifier.registerObserver(
			{
				notify(...args) {
					// eslint-disable-next-line prefer-spread
					fileOpenHandler.apply(null, args);
				},
			},
			["file"],
			"zotero-reading-list",
			1,
		);
	}

	removeFileOpenedListener() {
		if (this.fileOpenedListenerID) {
			Zotero.Notifier.unregisterObserver(this.fileOpenedListenerID);
		}
	}

	keyboardEventHandler = (keyboardEvent: KeyboardEvent) => {
		// Check modifiers - want Alt+{1,2,3,4,5} to label the currently selected items
		// Or Alt+0 to clear the current read status
		const possibleKeyCombinations = [
			...Array(Math.min(8, this.statusNames.length)).keys(),
		].map((num) => (num + 1).toString());
		if (
			!keyboardEvent.ctrlKey &&
			!keyboardEvent.shiftKey &&
			keyboardEvent.altKey
		) {
			if (possibleKeyCombinations.includes(keyboardEvent.key)) {
				const selectedStatus =
					this.statusNames[
						possibleKeyCombinations.indexOf(keyboardEvent.key)
					];
				void setSelectedItemsReadStatus("item", selectedStatus);
			} else if (keyboardEvent.key == "0") {
				void clearSelectedItemsReadStatus("item");
			}
		}
	};

	addKeyboardShortcutListener() {
		// different approach compared to Zutilo https://github.com/wshanks/Zutilo/issues/71#issuecomment-360986808
		document.addEventListener("keydown", this.keyboardEventHandler);
	}

	removeKeyboardShortcutListener() {
		document.removeEventListener("keydown", this.keyboardEventHandler);
	}

	removeReadStatusFromExports() {
		// need to specify that `this` is an Object (ie. it's Zotero.Utilities.Internal) for TS to be happy
		$patch$(
			Zotero.Utilities.Internal,
			"itemToExportFormat",
			// eslint-disable-next-line @typescript-eslint/ban-types
			(original: Function) =>
				function Zotero_Utilities_Internal_itemToExportFormat(
					this: object,
					zoteroItem: Zotero.Item,
					_legacy: any,
					_skipChildItems: any,
				) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, prefer-rest-params
					const serializedItem = original.apply(this, arguments);
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					if (serializedItem.extra) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						let extraText = serializedItem.extra as string;
						extraText = removeFieldValueFromExtraData(
							extraText,
							READ_STATUS_EXTRA_FIELD,
						);
						extraText = removeFieldValueFromExtraData(
							extraText,
							READ_DATE_EXTRA_FIELD,
						);
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						serializedItem.extra = extraText;
					}
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return
					return serializedItem;
				},
		);
	}
}
