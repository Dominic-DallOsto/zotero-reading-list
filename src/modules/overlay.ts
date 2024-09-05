import { MenuitemOptions } from "zotero-plugin-toolkit/dist/managers/menu";
import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { patch as $patch$, unpatch as $unpatch$ } from "../utils/patcher";
import {
	getPref,
	setPref,
	clearPref,
	initialiseDefaultPref,
	getPrefGlobalName,
} from "../utils/prefs";
import {
	getItemExtraProperty,
	setItemExtraProperty,
	clearItemExtraProperty,
	removeFieldValueFromExtraData,
} from "../utils/extraField";

const READ_STATUS_COLUMN_ID = "readstatus";
const READ_STATUS_EXTRA_FIELD = "Read_Status";
const READ_DATE_EXTRA_FIELD = "Read_Status_Date";

const TAG_TYPE_AUTOMATIC = 1;

export const DEFAULT_STATUS_NAMES = [
	"New",
	"To Read",
	"In Progress",
	"Read",
	"Not Reading",
];
export const DEFAULT_STATUS_ICONS = ["⭐", "📙", "📖", "📗", "📕"];

export const DEFAULT_STATUS_CHANGE_FROM = ["New", "To Read"];
export const DEFAULT_STATUS_CHANGE_TO = ["In Progress", "In Progress"];

export const SHOW_ICONS_PREF = "show-icons"; // deprecated
export const READ_STATUS_FORMAT_PREF = "read-status-format";
export const READ_STATUS_FORMAT_HEADER_SHOW_ICON =
	"readstatuscolumn-format-header-showicon";
export const LABEL_NEW_ITEMS_PREF = "label-new-items";
export const LABEL_NEW_ITEMS_PREF_DISABLED = "|none|";
export const LABEL_ITEMS_WHEN_OPENING_FILE_PREF =
	"label-items-when-opening-file";
export const ENABLE_KEYBOARD_SHORTCUTS_PREF = "enable-keyboard-shortcuts";
export const STATUS_NAME_AND_ICON_LIST_PREF = "statuses-and-icons-list";
export const STATUS_CHANGE_ON_OPEN_ITEM_LIST_PREF =
	"status-change-on-open-item-list";
export const TAG_SYNCHRONISATION_PREF = "tag-synchronisation";
export const TAG_SYNCHRONISATION_FORMAT_PREF = "tag-synchronisation-format";

enum ReadStatusFormat {
	ShowBoth = 0,
	ShowText = 1,
	ShowIcon = 2,
}

enum TagSynchronisationFormat {
	ShowEmoji = 0,
	NoEmoji = 1,
}

/**
 * Return selected regular items
 */
function getSelectedItems() {
	return ZoteroPane.getSelectedItems().filter((item) => item.isRegularItem());
}

export const FORBIDDEN_PREF_STRING_CHARACTERS = new Set(";|");

export function prefStringToList(prefString: string) {
	const [statusString, iconString] = prefString.split("|");
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
			getPref(STATUS_NAME_AND_ICON_LIST_PREF)! as string,
		);

		void this.addReadStatusColumn();
		this.addPreferencesMenu();
		this.addRightClickMenuPopup();

		if (getPref(ENABLE_KEYBOARD_SHORTCUTS_PREF)) {
			this.addKeyboardShortcutListener();
		}
		if (getPref(LABEL_NEW_ITEMS_PREF) != LABEL_NEW_ITEMS_PREF_DISABLED) {
			this.addNewItemLabeller();
		}
		if (getPref(LABEL_ITEMS_WHEN_OPENING_FILE_PREF)) {
			this.addFileOpenedListener();
		}

		this.addPreferenceUpdateObservers();
		this.removeReadStatusFromExports();
	}

	public unload() {
		void this.removeReadStatusColumn();
		this.removePreferenceMenu();
		this.removeRightClickMenu();
		this.removeKeyboardShortcutListener();
		this.removeNewItemLabeller();
		this.removeFileOpenedListener();
		this.removePreferenceUpdateObservers();
		this.unpatchExportFunction();
	}

	initialiseDefaultPreferences() {
		// for migrating from old format pref (show icon or not) to new format pref (show both, text, or icon)
		// show icon -> show both
		// don't show icon -> show text
		// otherwise, default is show both
		const oldReadStatusColumnFormatPref_showIcons =
			getPref(SHOW_ICONS_PREF);
		if (
			typeof oldReadStatusColumnFormatPref_showIcons == "boolean" &&
			!oldReadStatusColumnFormatPref_showIcons
		) {
			initialiseDefaultPref(
				READ_STATUS_FORMAT_PREF,
				ReadStatusFormat.ShowText,
			);
		} else {
			initialiseDefaultPref(
				READ_STATUS_FORMAT_PREF,
				ReadStatusFormat.ShowBoth,
			);
		}
		initialiseDefaultPref(READ_STATUS_FORMAT_HEADER_SHOW_ICON, false);
		initialiseDefaultPref(ENABLE_KEYBOARD_SHORTCUTS_PREF, true);
		initialiseDefaultPref(LABEL_ITEMS_WHEN_OPENING_FILE_PREF, false);
		initialiseDefaultPref(
			STATUS_NAME_AND_ICON_LIST_PREF,
			listToPrefString(DEFAULT_STATUS_NAMES, DEFAULT_STATUS_ICONS),
		);
		initialiseDefaultPref(
			STATUS_CHANGE_ON_OPEN_ITEM_LIST_PREF,
			listToPrefString(
				DEFAULT_STATUS_CHANGE_FROM,
				DEFAULT_STATUS_CHANGE_TO,
			),
		);
		// for migrating from old label new items pref (true or false) to new format pref (disabled or choose read status to use)
		// true -> automatically label as first read status
		// false -> disabled
		const oldLabelNewItemsPref = getPref(LABEL_NEW_ITEMS_PREF);
		if (typeof oldLabelNewItemsPref == "boolean") {
			// need to clear then set Pref when changing type from bool to string
			clearPref(LABEL_NEW_ITEMS_PREF);
			if (oldLabelNewItemsPref) {
				setPref(
					LABEL_NEW_ITEMS_PREF,
					prefStringToList(
						getPref(STATUS_NAME_AND_ICON_LIST_PREF)! as string,
					)[0][0],
				);
			} else {
				setPref(LABEL_NEW_ITEMS_PREF, LABEL_NEW_ITEMS_PREF_DISABLED);
			}
		} else {
			initialiseDefaultPref(
				LABEL_NEW_ITEMS_PREF,
				LABEL_NEW_ITEMS_PREF_DISABLED,
			);
		}
		initialiseDefaultPref(TAG_SYNCHRONISATION_PREF, false);
		initialiseDefaultPref(
			TAG_SYNCHRONISATION_FORMAT_PREF,
			TagSynchronisationFormat.NoEmoji,
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
			),
			Zotero.Prefs.registerObserver(
				getPrefGlobalName(LABEL_NEW_ITEMS_PREF),
				(value: string) => {
					if (value == LABEL_NEW_ITEMS_PREF_DISABLED) {
						this.removeNewItemLabeller();
					} else if (typeof this.itemAddedListenerID == "undefined") {
						this.addNewItemLabeller();
					}
				},
				true,
			),
			Zotero.Prefs.registerObserver(
				getPrefGlobalName(LABEL_ITEMS_WHEN_OPENING_FILE_PREF),
				(value: boolean) => {
					if (value) {
						this.addFileOpenedListener();
					} else {
						this.removeFileOpenedListener();
					}
				},
				true,
			),
			// refresh read status column on format change
			Zotero.Prefs.registerObserver(
				getPrefGlobalName(READ_STATUS_FORMAT_PREF),
				async (value: boolean) => {
					await this.removeReadStatusColumn();
					await this.addReadStatusColumn();
				},
				true,
			),
			Zotero.Prefs.registerObserver(
				getPrefGlobalName(READ_STATUS_FORMAT_HEADER_SHOW_ICON),
				async (value: boolean) => {
					await this.removeReadStatusColumn();
					await this.addReadStatusColumn();
				},
				true,
			),
			Zotero.Prefs.registerObserver(
				getPrefGlobalName(STATUS_NAME_AND_ICON_LIST_PREF),
				async (value: string) => {
					[this.statusNames, this.statusIcons] =
						prefStringToList(value);
					this.removeRightClickMenu();
					this.addRightClickMenuPopup();
					this.removeKeyboardShortcutListener();
					this.addKeyboardShortcutListener();
					await this.removeReadStatusColumn();
					await this.addReadStatusColumn();
				},
				true,
			),
		];
	}

	removePreferenceUpdateObservers() {
		if (this.preferenceUpdateObservers) {
			for (const preferenceUpdateObserverSymbol of this
				.preferenceUpdateObservers) {
				Zotero.Prefs.unregisterObserver(preferenceUpdateObserverSymbol);
			}
			this.preferenceUpdateObservers = undefined;
		}
	}

	async addReadStatusColumn() {
		const formatStatusName = (statusName: string) =>
			this.formatStatusName(statusName);
		this.itemTreeReadStatusColumnId =
			await Zotero.ItemTreeManager.registerColumns({
				dataKey: READ_STATUS_COLUMN_ID,
				label: getString("read-status"),
				// If we just want to show the icon, overwrite the label with htmlLabel (#40)
				htmlLabel: getPref(READ_STATUS_FORMAT_HEADER_SHOW_ICON)
					? `<span class="icon icon-css icon-16" style="background: url(chrome://${config.addonRef}/content/icons/favicon.png) content-box no-repeat center/contain;" />`
					: undefined,
				pluginID: config.addonID,
				dataProvider: (item: Zotero.Item, dataKey: string) => {
					return item.isRegularItem()
						? this.getItemReadStatus(item) || ""
						: "";
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
				zoteroPersist: ["width", "hidden", "sortDirection"],
			});
	}

	/**
	 * Format name of status to include icon if enabled.
	 * @param {string} statusName - The name of the status.
	 * @returns {String} Name of the status, possibly prefixed with the corresponding icon.
	 */
	formatStatusName(statusName: string): string {
		switch (getPref(READ_STATUS_FORMAT_PREF) as ReadStatusFormat) {
			case ReadStatusFormat.ShowBoth: {
				const statusIndex = this.statusNames.indexOf(statusName);
				return statusIndex > -1
					? `${this.statusIcons[statusIndex]} ${statusName}`
					: statusName;
			}
			case ReadStatusFormat.ShowText: {
				return statusName;
			}
			case ReadStatusFormat.ShowIcon: {
				const statusIndex = this.statusNames.indexOf(statusName);
				return statusIndex > -1
					? `${this.statusIcons[statusIndex]}`
					: statusName;
			}
		}
	}

	/**
	 * Format tag to include icon if enabled.
	 * @param {string} statusName - The name of the status.
	 * @returns {String} Name of the status, possibly prefixed with the corresponding icon.
	 */
	formatTag(statusName: string): string {
		switch (
			getPref(TAG_SYNCHRONISATION_FORMAT_PREF) as TagSynchronisationFormat
		) {
			case TagSynchronisationFormat.ShowEmoji: {
				const statusIndex = this.statusNames.indexOf(statusName);
				return statusIndex > -1
					? `${this.statusIcons[statusIndex]} ${statusName}`
					: statusName;
			}
			case TagSynchronisationFormat.NoEmoji: {
				return statusName;
			}
		}
	}

	async removeReadStatusColumn() {
		if (this.itemTreeReadStatusColumnId) {
			await Zotero.ItemTreeManager.unregisterColumns(
				this.itemTreeReadStatusColumnId,
			);
			this.itemTreeReadStatusColumnId = undefined;
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
						void this.clearSelectedItemsReadStatus(),
				} as MenuitemOptions,
			].concat(
				this.statusNames.map((status_name: string) => {
					return {
						tag: "menuitem",
						label: status_name,
						commandListener: (event) =>
							this.setSelectedItemsReadStatus(status_name),
					};
				}),
			),
			getVisibility: (element, event) => {
				return getSelectedItems().length > 0;
			},
		});
	}

	removeRightClickMenu() {
		ztoolkit.Menu.unregister("zotero-reading-list-right-click-item-menu");
	}

	addNewItemLabeller() {
		const addItemHandler = (
			action: _ZoteroTypes.Notifier.Event,
			type: _ZoteroTypes.Notifier.Type,
			ids: string[] | number[],
			extraData: _ZoteroTypes.anyObj,
		) => {
			if (action == "add") {
				const items = Zotero.Items.get(ids).filter((item) =>
					item.isRegularItem(),
				);

				this.setItemsReadStatus(
					items,
					getPref(LABEL_NEW_ITEMS_PREF)! as string,
				);
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
			this.itemAddedListenerID = undefined;
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

				const [statusFrom, statusTo] = prefStringToList(
					getPref(STATUS_CHANGE_ON_OPEN_ITEM_LIST_PREF) as string,
				);

				for (const item of items) {
					const itemReadStatusIndex = statusFrom.indexOf(
						this.getItemReadStatus(item) || "",
					);
					if (itemReadStatusIndex > -1) {
						this.setItemReadStatus(
							item,
							statusTo[itemReadStatusIndex],
						);
					}
				}
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
			this.fileOpenedListenerID = undefined;
		}
	}

	keyboardEventHandler = (keyboardEvent: KeyboardEvent) => {
		// Check modifiers - want Alt+{1,2,3,4,5} to label the currently selected items
		// Or Alt+0 to clear the current read status
		const possibleKeyCombinations = [
			...Array(Math.min(8, this.statusNames.length)).keys(),
		].map((num) => (num + 1).toString());
		// On Mac, Alt is equivalent to Opt but this changes the key of the event
		// eg. 1 -> ¡
		// see #9
		const possibleKeyCombinationsMac = [
			"¡",
			"™",
			"£",
			"¢",
			"∞",
			"§",
			"¶",
			"•",
			"ª",
		].slice(0, possibleKeyCombinations.length);
		const clearStatusKeyCombinations = ["0", "º"];
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
				this.setSelectedItemsReadStatus(selectedStatus);
			} else if (possibleKeyCombinationsMac.includes(keyboardEvent.key)) {
				const selectedStatus =
					this.statusNames[
						possibleKeyCombinationsMac.indexOf(keyboardEvent.key)
					];
				this.setSelectedItemsReadStatus(selectedStatus);
			} else if (clearStatusKeyCombinations.includes(keyboardEvent.key)) {
				this.clearSelectedItemsReadStatus();
			}
		}
	};

	addKeyboardShortcutListener() {
		// disable Zotero's column sorting (also uses Alt+Num shortcut keys) #30
		document
			.getElementById("sortSubmenuKeys")
			?.setAttribute("disabled", "true");
		// different approach compared to Zutilo https://github.com/wshanks/Zutilo/issues/71#issuecomment-360986808
		document.addEventListener("keydown", this.keyboardEventHandler);
	}

	removeKeyboardShortcutListener() {
		document.removeEventListener("keydown", this.keyboardEventHandler);
		// reenable Zotero's column sorting
		document
			.getElementById("sortSubmenuKeys")
			?.setAttribute("disabled", "false");
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

	unpatchExportFunction() {
		$unpatch$(Zotero.Utilities.Internal, "itemToExportFormat");
	}

	getItemReadStatus(item: Zotero.Item) {
		const statusField = getItemExtraProperty(item, READ_STATUS_EXTRA_FIELD);
		return statusField.length == 1 ? statusField[0] : undefined;
	}

	setItemReadStatus(
		item: Zotero.Item,
		statusName: string,
		save: boolean = true,
	) {
		setItemExtraProperty(item, READ_STATUS_EXTRA_FIELD, statusName);
		setItemExtraProperty(
			item,
			READ_DATE_EXTRA_FIELD,
			new Date(Date.now()).toISOString(),
		);
		if (getPref(TAG_SYNCHRONISATION_PREF)) {
			this.setItemReadStatusTag(item, statusName, false);
		}
		if (save) {
			void item.saveTx();
		}
	}

	setItemReadStatusTag(
		item: Zotero.Item,
		statusName: string,
		save: boolean = true,
	) {
		this.clearItemReadStatusTags(item);
		item.setTags([
			{ tag: this.formatTag(statusName), type: TAG_TYPE_AUTOMATIC },
		]);
		if (save) {
			void item.saveTx();
		}
	}

	setItemsReadStatus(items: Zotero.Item[], statusName: string) {
		for (const item of items) {
			this.setItemReadStatus(item, statusName);
		}
	}

	setSelectedItemsReadStatus(statusName: string) {
		this.setItemsReadStatus(getSelectedItems(), statusName);
	}

	clearItemReadStatus(item: Zotero.Item) {
		clearItemExtraProperty(item, READ_STATUS_EXTRA_FIELD);
		clearItemExtraProperty(item, READ_DATE_EXTRA_FIELD);
		if (getPref(TAG_SYNCHRONISATION_PREF)) {
			this.clearItemReadStatusTags(item);
		}
		void item.saveTx();
	}

	clearSelectedItemsReadStatus() {
		const items = getSelectedItems();
		for (const item of items) {
			this.clearItemReadStatus(item);
		}
	}

	clearItemReadStatusTags(item: Zotero.Item) {
		item.getTags()
			.filter((tag) => this.statusNames.indexOf(tag.tag) != -1)
			.forEach((tag) => item.removeTag(tag.tag));
	}

	getItemReadStatusTags(item: Zotero.Item) {
		return item
			.getTags()
			.map((tag) => tag.tag)
			.filter((tag) => this.statusNames.indexOf(tag) != -1);
	}

	createProgressPopup() {
		const progressWindow = new Zotero.ProgressWindow();
		progressWindow.changeHeadline(getString("addon-title"));
		return progressWindow;
	}

	// update all items' read statuses to match their tags, or clear their read status if they have no tags
	async updateAllItemsReadStatusesToMatchTags() {
		const progressWindow = this.createProgressPopup();
		const allItems = await Zotero.Items.getAll(
			Zotero.Libraries.userLibraryID,
		);
		const progress = new progressWindow.ItemProgress(
			"",
			getString("tags-to-readstatus-message-progress", {
				args: { numItems: allItems.length },
			}),
		);
		progress.setProgress(0);
		progressWindow.show();
		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
			await Zotero.DB.executeTransaction(() => {
				for (const item of allItems) {
					const readStatusTags = this.getItemReadStatusTags(item);
					const currentReadStatus = this.getItemReadStatus(item);
					const newReadStatus =
						readStatusTags.length == 1
							? readStatusTags[0]
							: undefined;
					if (newReadStatus && currentReadStatus != newReadStatus) {
						this.setItemReadStatus(item, newReadStatus);
					} else if (
						newReadStatus == undefined &&
						currentReadStatus
					) {
						this.clearItemReadStatus(item);
					}
				}
				progress.setText(
					getString("tags-to-readstatus-message-done", {
						args: { numItems: allItems.length },
					}),
				);
				progress.setProgress(100);
			});
		} catch (e) {
			ztoolkit.log("Error updating read statuses to match tags");
			progress.setText(getString("tags-to-readstatus-message-error"));
			progress.setError();
		}
		progressWindow.startCloseTimer(3000);
	}

	// update all items' tags to match their read statuses, or clear them if they have no read status
	async updateAllItemsTagsToMatchReadStatuses() {
		const progressWindow = this.createProgressPopup();
		const allItems = await Zotero.Items.getAll(
			Zotero.Libraries.userLibraryID,
		);
		const progress = new progressWindow.ItemProgress(
			"",
			getString("readstatus-to-tags-message-progress", {
				args: { numItems: allItems.length },
			}),
		);
		try {
			progress.setProgress(0);
			progressWindow.show();
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
			await Zotero.DB.executeTransaction(() => {
				for (const item of allItems) {
					const itemReadStatus = this.getItemReadStatus(item);
					this.clearItemReadStatusTags(item);
					if (itemReadStatus) {
						this.setItemReadStatusTag(item, itemReadStatus);
					}
				}
				progress.setText(
					getString("readstatus-to-tags-message-done", {
						args: { numItems: allItems.length },
					}),
				);
				progress.setProgress(100);
			});
		} catch (e) {
			ztoolkit.log("Error updating read tags to match read statuses");
			progress.setText(getString("readstatus-to-tags-message-error"));
			progress.setError();
		}
		progressWindow.startCloseTimer(3000);
	}
}
