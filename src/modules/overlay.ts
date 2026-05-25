import { MenuitemOptions } from "zotero-plugin-toolkit/dist/managers/menu";
import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { patch as $patch$, unpatch as $unpatch$ } from "../utils/patcher";
import {
	getPref,
	initialiseDefaultPref,
	getPrefGlobalName,
} from "../utils/prefs";
import {
	getItemExtraProperty,
	setItemExtraProperty,
	clearItemExtraProperty,
	removeFieldValueFromExtraData,
} from "../utils/extraField";
const ITEM_TREE_DATA_KEY_PREFIX = config.addonID
	.replaceAll("-", "_")
	.replaceAll("@", "_at_")
	.replaceAll(".", "_");
const CUSTOM_COLUMN_EXTRA_FIELD_PREFIX = `${config.addonRef}_Custom_Column_`;
const CUSTOM_COLUMN_MENU_ID_PREFIX = `${config.addonRef}-custom-column-`;

export const CUSTOM_COLUMNS_PREF = "custom-columns";

export type CustomColumnConfig = {
	id: string;
	name: string;
	values: string[];
};

export const DEFAULT_CUSTOM_COLUMNS: CustomColumnConfig[] = [];

export function parseCustomColumnsPref(
	prefValue: string | undefined,
): CustomColumnConfig[] {
	if (!prefValue) {
		return [...DEFAULT_CUSTOM_COLUMNS];
	}
	try {
		const parsed = JSON.parse(prefValue) as CustomColumnConfig[];
		if (!Array.isArray(parsed)) {
			return [...DEFAULT_CUSTOM_COLUMNS];
		}
		return parsed
			.filter(
				(column) =>
					typeof column.id === "string" &&
					typeof column.name === "string" &&
					Array.isArray(column.values),
			)
			.map((column) => ({
				id: column.id.trim(),
				name: column.name.trim(),
				values: column.values
					.filter((value) => typeof value === "string")
					.map((value) => value.trim())
					.filter((value) => value.length > 0),
			}))
			.filter((column) => column.id && column.name);
	} catch (error) {
		return [...DEFAULT_CUSTOM_COLUMNS];
	}
}

export function serializeCustomColumnsPref(columns: CustomColumnConfig[]) {
	return JSON.stringify(columns);
}

function getCustomColumnExtraFieldName(columnId: string) {
	return `${CUSTOM_COLUMN_EXTRA_FIELD_PREFIX}${columnId}`;
}

function getItemCustomColumnValue(item: Zotero.Item, columnId: string) {
	const fieldName = getCustomColumnExtraFieldName(columnId);
	const values = getItemExtraProperty(item, fieldName);
	return values.length === 1 ? values[0] : "";
}

function setItemCustomColumnValue(
	item: Zotero.Item,
	columnId: string,
	value: string,
) {
	setItemExtraProperty(item, getCustomColumnExtraFieldName(columnId), value);
	void item.saveTx();
}

function setItemsCustomColumnValue(
	items: Zotero.Item[],
	columnId: string,
	value: string,
) {
	for (const item of items) {
		setItemCustomColumnValue(item, columnId, value);
	}
}

function setSelectedItemsCustomColumnValue(columnId: string, value: string) {
	setItemsCustomColumnValue(getSelectedItems(), columnId, value);
}

function clearSelectedItemsCustomColumnValue(columnId: string) {
	const items = getSelectedItems();
	for (const item of items) {
		clearItemExtraProperty(item, getCustomColumnExtraFieldName(columnId));
		void item.saveTx();
	}
}

/**
 * Return selected regular items
 */
function getSelectedItems() {
	return ZoteroPane.getSelectedItems().filter((item) => item.isRegularItem());
}

export default class ZoteroReadingList {
	itemTreeCustomColumnIds?: Array<string | false>;
	customColumnMenuIds?: string[];
	preferenceUpdateObservers?: symbol[];
	customColumns: CustomColumnConfig[];

	constructor() {
		this.initialiseDefaultPreferences();
		this.customColumns = parseCustomColumnsPref(
			getPref(CUSTOM_COLUMNS_PREF) as string,
		);

		this.addCustomColumns();
		this.addPreferencesMenu();
		this.addCustomColumnMenus();
		this.addPreferenceUpdateObservers();
		this.removeCustomColumnsFromExports();
	}

	public unload() {
		this.removeCustomColumns();
		this.removePreferenceMenu();
		this.removeCustomColumnMenus();
		this.removePreferenceUpdateObservers();
		this.unpatchExportFunction();
	}

	initialiseDefaultPreferences() {
		initialiseDefaultPref(
			CUSTOM_COLUMNS_PREF,
			serializeCustomColumnsPref(DEFAULT_CUSTOM_COLUMNS),
		);
	}

	addPreferenceUpdateObservers() {
		this.preferenceUpdateObservers = [
			Zotero.Prefs.registerObserver(
				getPrefGlobalName(CUSTOM_COLUMNS_PREF),
				(value: string) => {
					this.customColumns = parseCustomColumnsPref(value);
					this.removeCustomColumnMenus();
					this.removeCustomColumns();
					this.addCustomColumns();
					this.addCustomColumnMenus();
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

	addCustomColumns() {
		this.itemTreeCustomColumnIds = this.customColumns.map((column) =>
			Zotero.ItemTreeManager.registerColumn({
				dataKey: `${ITEM_TREE_DATA_KEY_PREFIX}_custom_${column.id}`,
				label: column.name,
				pluginID: config.addonID,
				dataProvider: (item: Zotero.Item, dataKey: string) => {
					return item.isRegularItem()
						? getItemCustomColumnValue(item, column.id)
						: "";
				},
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
					text.innerText = data;

					const cell = document.createElementNS(
						"http://www.w3.org/1999/xhtml",
						"span",
					);
					cell.className = `cell ${column.className}`;
					cell.append(text);

					return cell;
				},
				zoteroPersist: ["width", "hidden", "sortDirection"],
			}),
		);
	}

	removeCustomColumns() {
		if (this.itemTreeCustomColumnIds) {
			for (const columnId of this.itemTreeCustomColumnIds) {
				if (columnId) {
					Zotero.ItemTreeManager.unregisterColumn(columnId);
				}
			}
			this.itemTreeCustomColumnIds = undefined;
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
		void Zotero.PreferencePanes.register(prefOptions);
	}

	removePreferenceMenu() {
		Zotero.PreferencePanes.unregister(config.addonID);
	}

	addCustomColumnMenus() {
		this.customColumnMenuIds = [];
		for (const column of this.customColumns) {
			const menuId = `${CUSTOM_COLUMN_MENU_ID_PREFIX}${column.id}`;
			const menuItems: MenuitemOptions[] = [
				{
					tag: "menuitem",
					label: getString("status-none"),
					commandListener: (event) =>
						void clearSelectedItemsCustomColumnValue(column.id),
				} as MenuitemOptions,
			].concat(
				column.values.map((value) => {
					return {
						tag: "menuitem",
						label: value,
						commandListener: (event) =>
							void setSelectedItemsCustomColumnValue(
								column.id,
								value,
							),
					};
				}),
			);
			ztoolkit.Menu.register("item", {
				id: menuId,
				tag: "menu",
				label: column.name,
				children: menuItems,
				getVisibility: (element, event) => {
					return getSelectedItems().length > 0;
				},
			});
			this.customColumnMenuIds.push(menuId);
		}
	}

	removeCustomColumnMenus() {
		if (this.customColumnMenuIds) {
			for (const menuId of this.customColumnMenuIds) {
				ztoolkit.Menu.unregister(menuId);
			}
			this.customColumnMenuIds = undefined;
		}
	}

	getCustomColumnExtraFieldNames() {
		return this.customColumns.map((column) =>
			getCustomColumnExtraFieldName(column.id),
		);
	}

	removeCustomColumnsFromExports() {
		const getCustomColumnExtraFieldNames = () =>
			this.getCustomColumnExtraFieldNames();
		// need to specify that `this` is an Object (ie. it's Zotero.Utilities.Internal) for TS to be happy
		$patch$(
			Zotero.Utilities.Internal,
			"itemToExportFormat",
			// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
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
						for (const fieldName of getCustomColumnExtraFieldNames()) {
							extraText = removeFieldValueFromExtraData(
								extraText,
								fieldName,
							);
						}
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
}
