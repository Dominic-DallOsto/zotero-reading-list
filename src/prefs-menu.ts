import {
	STATUS_NAME_AND_ICON_LIST_PREF,
	DEFAULT_STATUS_NAMES,
	DEFAULT_STATUS_ICONS,
	STATUS_CHANGE_ON_OPEN_ITEM_LIST_PREF,
	LABEL_ITEMS_WHEN_OPENING_FILE_PREF,
	DEFAULT_STATUS_CHANGE_FROM,
	DEFAULT_STATUS_CHANGE_TO,
	FORBIDDEN_PREF_STRING_CHARACTERS,
	LABEL_NEW_ITEMS_PREF,
	LABEL_NEW_ITEMS_PREF_DISABLED,
	prefStringToList,
	listToPrefString,
	KEYBOARD_SHORTCUTS_PREF,
	CLEAR_STATUS_KEYBOARD_SHORTCUT_PREF,
	MODIFIER_MASK_ALT,
	MODIFIER_MASK_CTRL,
	MODIFIER_MASK_SHIFT,
	MODIFIER_MASK_META,
	shortcutToList,
	parseShortcutEntry,
	formatShortcut,
	defaultShortcutsForStatusCount,
	formatKeyCode,
} from "./modules/overlay";
import { getPref, setPref } from "./utils/prefs";
import { config } from "../package.json";
import { getString } from "./utils/locale";

const STATUS_NAMES_TABLE_BODY = "statusnames-table-body";
const CLEAR_STATUS_SHORTCUT_INPUT = "clear-status-shortcut-input";
const OPEN_ITEM_TABLE_BODY = "openitem-table-body";
const OPEN_ITEM_HIDDEN_ROW = "openitem-table-hidden-row";
const OPEN_ITEM_CHECKBOX =
	"zotero-prefpane-zotero-reading-list-label-items-when-opening-file";
const LABEL_NEW_ITEMS_MENU_LIST = "automatically-label-new-items-menulist";

const TAG_SYNCHRONISATION_CHECKBOX =
	"zotero-prefpane-zotero-reading-list-tag-synchronisation";
function onPrefsLoad(window: Window) {
	setTableStatusNames(window);
	setClearStatusShortcut(window);
	setTableOpenItem(window);
	fillAutomaticallyLabelNewItemsMenuList(window);
}

function resetPrefsMenu(window: Window) {
	clearTableOpenItem(window);
	setTableOpenItem(window);
	clearAutomaticallyLabelNewItemsMenuList(window);
	fillAutomaticallyLabelNewItemsMenuList(window);
}

function setTableStatusNames(window: Window) {
	const tableBodyStatusNames = window.document.getElementById(
		STATUS_NAMES_TABLE_BODY,
	);
	for (const row of createTableRowsStatusNames(window)) {
		tableBodyStatusNames?.append(row);
	}
	const clearStatusShortcutInput = window.document.getElementById(
		CLEAR_STATUS_SHORTCUT_INPUT,
	) as HTMLInputElement;
	addShortcutCaptureListeners(clearStatusShortcutInput);
}

function setTableOpenItem(window: Window) {
	const tableBodyOpenItem =
		window.document.getElementById(OPEN_ITEM_TABLE_BODY);
	for (const row of createTableRowsOpenItem(window)) {
		tableBodyOpenItem?.append(row);
	}
	if (tableBodyOpenItem?.parentElement) {
		tableBodyOpenItem.parentElement.hidden = !getPref(
			LABEL_ITEMS_WHEN_OPENING_FILE_PREF,
		);
	}
}

function setTableVisibilityOpenItem(window: Window) {
	const tableBody = window.document.getElementById(OPEN_ITEM_TABLE_BODY);
	const checkBox = window.document.getElementById(
		OPEN_ITEM_CHECKBOX,
	) as HTMLInputElement;
	if (tableBody?.parentElement && checkBox) {
		tableBody.parentElement.hidden = checkBox.checked;
	}
}

function addTableRowStatusNames(window: Window) {
	const tableBody = window.document.getElementById(STATUS_NAMES_TABLE_BODY);
	// default the new row's shortcut to the "next" default shortcut
	// (Alt+1, Alt+2, ..., Alt+9, Alt+A, ...)
	const rowIndex = tableBody?.children.length ?? 0;
	const defaultShortcut = shortcutToList(
		defaultShortcutsForStatusCount(rowIndex + 1),
	)[rowIndex];
	const shortcutEntry = defaultShortcut
		? `${defaultShortcut.mask}:${defaultShortcut.code}`
		: "";
	tableBody?.append(createTableRowStatusNames(window, "", "", shortcutEntry));
}

function addTableRowOpenItem(window: Window) {
	window.document
		.getElementById(OPEN_ITEM_TABLE_BODY)
		?.append(createTableRowOpenItem(window, "", ""));
}

function resetTableStatusNames(window: Window) {
	const tableRows = window.document.getElementById(
		STATUS_NAMES_TABLE_BODY,
	)?.children;
	Array.from(tableRows ?? []).map((row) => {
		row.remove();
	});
	// recreate the clear status shortcut input to remove event listeners
	const clearStatusShortcutInput = window.document.getElementById(
		CLEAR_STATUS_SHORTCUT_INPUT,
	) as HTMLInputElement;
	clearStatusShortcutInput.replaceWith(
		clearStatusShortcutInput.cloneNode(true),
	);

	setPref(
		STATUS_NAME_AND_ICON_LIST_PREF,
		listToPrefString(DEFAULT_STATUS_NAMES, DEFAULT_STATUS_ICONS),
	);
	setPref(
		KEYBOARD_SHORTCUTS_PREF,
		defaultShortcutsForStatusCount(DEFAULT_STATUS_NAMES.length),
	);
	setPref(CLEAR_STATUS_KEYBOARD_SHORTCUT_PREF, `${MODIFIER_MASK_ALT}:Digit0`);
	setTableStatusNames(window);
	setClearStatusShortcut(window);
	// if we change the statuses, need to reset the status lists here
	resetPrefsMenu(window);
}

function resetTableOpenItem(window: Window) {
	setPref(
		STATUS_CHANGE_ON_OPEN_ITEM_LIST_PREF,
		listToPrefString(DEFAULT_STATUS_CHANGE_FROM, DEFAULT_STATUS_CHANGE_TO),
	);
	clearTableOpenItem(window);
	setTableOpenItem(window);
}

function clearTableOpenItem(window: Window) {
	const tableRows =
		window.document.getElementById(OPEN_ITEM_TABLE_BODY)?.children;
	// leave the hidden row there so we can still clone it
	(Array.from(tableRows ?? []) as HTMLTableRowElement[])
		.filter((row) => !row.hidden)
		.map((row) => row.remove());
}

function getTableStatusRows(window: Window) {
	const tableRows = window.document.getElementById(
		STATUS_NAMES_TABLE_BODY,
	)?.children;
	const names: string[] = [];
	const icons: string[] = [];
	for (const row of tableRows ?? []) {
		icons.push((row.children[0].firstChild as HTMLInputElement).value);
		names.push((row.children[1].firstChild as HTMLInputElement).value);
	}
	return { names, icons };
}

/**
 * Collect the "{modifierMask}:{code}" shortcut entries for all the status
 * rows (in table order). Rows whose shortcut hasn't been captured are
 * skipped.
 */
function getTableShortcutEntries(window: Window): string[] {
	const tableRows = window.document.getElementById(
		STATUS_NAMES_TABLE_BODY,
	)?.children;
	const entries: string[] = [];
	for (const row of tableRows ?? []) {
		const input = row.children[2].firstChild as HTMLInputElement;
		if (input.dataset.shortcutMask && input.dataset.shortcutCode) {
			entries.push(
				`${input.dataset.shortcutMask}:${input.dataset.shortcutCode}`,
			);
		}
	}
	return entries;
}

function getClearStatusShortcutEntry(window: Window): string | undefined {
	const input = window.document.getElementById(
		CLEAR_STATUS_SHORTCUT_INPUT,
	) as HTMLInputElement | null;
	if (input?.dataset.shortcutMask && input?.dataset.shortcutCode) {
		return `${input.dataset.shortcutMask}:${input.dataset.shortcutCode}`;
	}
	return undefined;
}

function setDuplicateShortcutInputsAsInvalid(
	window: Window,
	duplicates: Set<string>,
) {
	const tableRows = window.document.getElementById(
		STATUS_NAMES_TABLE_BODY,
	)?.children;
	for (const row of tableRows ?? []) {
		const input = row.children[2].firstChild as HTMLInputElement;
		if (
			input.dataset.shortcutMask &&
			input.dataset.shortcutCode &&
			duplicates.has(
				`${input.dataset.shortcutMask}:${input.dataset.shortcutCode}`,
			)
		) {
			input.setCustomValidity("duplicate");
		}
	}
	const clearInput = window.document.getElementById(
		CLEAR_STATUS_SHORTCUT_INPUT,
	) as HTMLInputElement | null;
	if (
		clearInput?.dataset.shortcutMask &&
		clearInput?.dataset.shortcutCode &&
		duplicates.has(
			`${clearInput.dataset.shortcutMask}:${clearInput.dataset.shortcutCode}`,
		)
	) {
		clearInput.setCustomValidity("duplicate");
	}
}

function tableContainsInvalidShortcutInput(window: Window) {
	const shortcuts = getTableShortcutEntries(window);
	const clearEntry = getClearStatusShortcutEntry(window);
	if (clearEntry) {
		shortcuts.push(clearEntry);
	}
	if (new Set(shortcuts).size != shortcuts.length) {
		const unique = new Set(shortcuts);
		const duplicates = new Set(
			shortcuts.filter((shortcut) => {
				if (unique.has(shortcut)) {
					unique.delete(shortcut);
				} else {
					return shortcut;
				}
			}),
		);
		setDuplicateShortcutInputsAsInvalid(window, duplicates);
		return true;
	}
	return false;
}

function inputContainsForbiddenCharacters(input: HTMLInputElement) {
	// the pref string is delimited with ; and | characters, so these can't be used in custom status names or icons
	const valueCharacters = new Set(input.value);
	return (
		[...FORBIDDEN_PREF_STRING_CHARACTERS].filter((char) =>
			valueCharacters.has(char),
		).length > 0
	);
}

function setDuplicateTableRowsAsInvalid(
	window: Window,
	duplicates: Set<string>,
) {
	const tableRows = window.document.getElementById(
		STATUS_NAMES_TABLE_BODY,
	)?.children;
	for (const row of tableRows ?? []) {
		const nameInput = row.children[1].firstChild as HTMLInputElement;
		if (duplicates.has(nameInput.value)) {
			nameInput.setCustomValidity("duplicate");
		}
	}
}

function checkAllTableRowsAreValid(window: Window) {
	const tableRows = window.document.getElementById(
		STATUS_NAMES_TABLE_BODY,
	)?.children;
	for (const row of tableRows ?? []) {
		const iconInput = row.children[0].firstChild as HTMLInputElement;
		const nameInput = row.children[1].firstChild as HTMLInputElement;
		iconInput.setCustomValidity(
			inputContainsForbiddenCharacters(iconInput)
				? "invalid-characters"
				: "",
		);
		nameInput.setCustomValidity(
			inputContainsForbiddenCharacters(nameInput)
				? "invalid-characters"
				: "",
		);
	}
}

function validateTableRows(window: Window) {
	checkAllTableRowsAreValid(window);
	// now check for duplicate names
	const { names } = getTableStatusRows(window);
	const unique = new Set(names);
	if (unique.size != names.length) {
		const duplicates = new Set(
			names.filter((item) => {
				if (unique.has(item)) {
					unique.delete(item);
				} else {
					return item;
				}
			}),
		);
		setDuplicateTableRowsAsInvalid(window, duplicates);
	}
}

function tableContainsInvalidInput(window: Window) {
	const tableRows = window.document.getElementById(
		STATUS_NAMES_TABLE_BODY,
	)?.children;
	for (const row of tableRows ?? []) {
		const iconInput = row.children[0].firstChild as HTMLInputElement;
		const nameInput = row.children[1].firstChild as HTMLInputElement;
		if (inputContainsForbiddenCharacters(iconInput)) {
			return true;
		}
		if (inputContainsForbiddenCharacters(nameInput)) {
			return true;
		}
	}
	return false;
}

function saveTableStatusNames(window: Window) {
	const { names, icons } = getTableStatusRows(window);
	if (new Set(names).size != names.length) {
		Services.prompt.alert(
			window as mozIDOMWindowProxy,
			getString("duplicate-status-names-title"),
			getString("duplicate-status-names-description"),
		);
		return;
	} else if (tableContainsInvalidInput(window)) {
		Services.prompt.alert(
			window as mozIDOMWindowProxy,
			getString("invalid-status-names-title"),
			getString("invalid-status-names-description"),
		);
		return;
	} else if (tableContainsInvalidShortcutInput(window)) {
		Services.prompt.alert(
			window as mozIDOMWindowProxy,
			getString("duplicate-keyboard-shortcuts-title"),
			getString("duplicate-keyboard-shortcuts-description"),
		);
		return;
	}
	setPref(STATUS_NAME_AND_ICON_LIST_PREF, listToPrefString(names, icons));
	setPref(KEYBOARD_SHORTCUTS_PREF, getTableShortcutEntries(window).join(";"));
	const clearEntry = getClearStatusShortcutEntry(window);
	if (clearEntry) {
		setPref(CLEAR_STATUS_KEYBOARD_SHORTCUT_PREF, clearEntry);
	}
	// if we change the statuses, need to reset the status lists here
	resetPrefsMenu(window);
}

function saveTableOpenItem(window: Window) {
	const tableRows =
		window.document.getElementById(OPEN_ITEM_TABLE_BODY)?.children;
	const statusesFrom: string[] = [];
	const statusesTo: string[] = [];
	for (const row of tableRows ?? []) {
		if (!(row as HTMLTableRowElement).hidden) {
			statusesFrom.push(
				(row.children[0].firstChild as HTMLInputElement).value,
			);
			statusesTo.push(
				(row.children[1].firstChild as HTMLInputElement).value,
			);
		}
	}
	setPref(
		STATUS_CHANGE_ON_OPEN_ITEM_LIST_PREF,
		listToPrefString(statusesFrom, statusesTo),
	);
}

function createElement(elementName: string) {
	return document.createElementNS(
		"http://www.w3.org/1999/xhtml",
		elementName,
	);
}

function moveElementHigher(element: HTMLElement) {
	if (element != element.parentElement?.firstChild) {
		element.parentElement?.insertBefore(element, element.previousSibling);
	}
}

function moveElementLower(element: HTMLElement) {
	if (element.nextSibling) {
		element.parentElement?.insertBefore(
			element,
			element.nextSibling?.nextSibling,
		);
	}
}

function createTableRowsStatusNames(window: Window) {
	const [statusNames, statusIcons] = prefStringToList(
		getPref(STATUS_NAME_AND_ICON_LIST_PREF) as string,
	);
	const statusShortcuts = shortcutToList(
		(getPref(KEYBOARD_SHORTCUTS_PREF) as string) ?? "",
	);
	// if the stored shortcut list is shorter than the status list, fall back
	// to the default shortcuts for the missing entries
	const defaultShortcuts = shortcutToList(
		defaultShortcutsForStatusCount(statusNames.length),
	);
	return statusNames.map((statusName, index) => {
		const shortcut = statusShortcuts[index] ?? defaultShortcuts[index];
		const shortcutEntry = shortcut
			? `${shortcut.mask}:${shortcut.code}`
			: "";
		return createTableRowStatusNames(
			window,
			statusIcons[index],
			statusName,
			shortcutEntry,
		);
	});
}

function setClearStatusShortcut(window: Window) {
	const input = window.document.getElementById(
		CLEAR_STATUS_SHORTCUT_INPUT,
	) as HTMLInputElement | null;
	if (!input) {
		return;
	}
	const parsed = parseShortcutEntry(
		(getPref(CLEAR_STATUS_KEYBOARD_SHORTCUT_PREF) as string) ?? "",
	);
	if (parsed) {
		input.value = formatShortcut(parsed.mask, parsed.code);
		input.dataset.shortcutMask = parsed.mask.toString();
		input.dataset.shortcutCode = parsed.code;
	}
}

/**
 * Create a keyboard shortcut "capture" input: the user clicks the input and
 * presses the desired key combination, which is stored as a
 * "{modifierMask}:{code}" entry in the `dataset` and displayed in the input
 * value.
 */
function createShortcutCaptureInput(window: Window, shortcutEntry: string) {
	const input = createElement("html:input") as HTMLInputElement;
	input.type = "text";
	input.setAttribute("class", "shortcut-capture");

	const parsed = parseShortcutEntry(shortcutEntry);
	if (parsed) {
		input.value = formatShortcut(parsed.mask, parsed.code);
		input.dataset.shortcutMask = parsed.mask.toString();
		input.dataset.shortcutCode = parsed.code;
	}
	return input;
}

function addShortcutCaptureListeners(input: HTMLInputElement) {
	input.addEventListener("keydown", (keyboardEvent: KeyboardEvent) => {
		if (keyboardEvent.key === "Escape") {
			// pressing Escape cancels the capture
			keyboardEvent.preventDefault();
			input.blur();
			return;
		}
		// ignore modifier-only key presses (e.g. pressing and releasing Alt)
		if (
			/^(Alt|Control|Shift|Meta|OS)(Left|Right)$/.test(keyboardEvent.code)
		) {
			keyboardEvent.preventDefault();
			return;
		}
		const mask =
			(keyboardEvent.altKey ? MODIFIER_MASK_ALT : 0) |
			(keyboardEvent.ctrlKey ? MODIFIER_MASK_CTRL : 0) |
			(keyboardEvent.shiftKey ? MODIFIER_MASK_SHIFT : 0) |
			(keyboardEvent.metaKey ? MODIFIER_MASK_META : 0);
		const code = formatKeyCode(keyboardEvent.code);
		input.value = formatShortcut(mask, code);
		input.dataset.shortcutMask = mask.toString();
		input.dataset.shortcutCode = code;
		keyboardEvent.preventDefault();
		keyboardEvent.stopPropagation();
		input.blur();
	});
	// while focused, ask the user to enter a key combination
	input.addEventListener("focusin", (focusEvent: FocusEvent) => {
		input.value = getString("pref-keyboard-shortcut-capture-placeholder");
	});
	// set text to shortcut when losing focus
	input.addEventListener("blur", (focusEvent: FocusEvent) => {
		if (input.dataset.shortcutMask && input.dataset.shortcutCode) {
			input.value = formatShortcut(
				Number(input.dataset.shortcutMask),
				input.dataset.shortcutCode,
			);
		} else {
			input.value = "";
		}
	});
}

function createTableRowsOpenItem(window: Window) {
	const [statusFrom, statusTo] = prefStringToList(
		getPref(STATUS_CHANGE_ON_OPEN_ITEM_LIST_PREF) as string,
	);
	return statusFrom.map((statusName, index) =>
		createTableRowOpenItem(window, statusName, statusTo[index]),
	);
}

function createTableRowStatusNames(
	window: Window,
	icon: string,
	name: string,
	shortcutEntry: string,
) {
	const row = createElement("html:tr");

	const iconCell = createElement("html:td");
	const iconInput = createElement("html:input") as HTMLInputElement;
	iconInput.type = "text";
	iconInput.value = icon;
	iconInput.oninput = () => validateTableRows(window);
	iconCell.append(iconInput);

	const nameCell = createElement("html:td");
	const nameInput = createElement("html:input") as HTMLInputElement;
	nameInput.type = "text";
	nameInput.value = name;
	nameInput.oninput = () => validateTableRows(window);
	nameCell.append(nameInput);

	const shortcutCell = createElement("html:td");
	const input = createShortcutCaptureInput(window, shortcutEntry);
	addShortcutCaptureListeners(input);
	shortcutCell.append(input);

	const settings = createElement("html:td");
	const upButton = createElement("html:button");
	const downButton = createElement("html:button");
	const binButton = createElement("html:button");
	upButton.textContent = "⬆";
	downButton.textContent = "⬇";
	binButton.textContent = "🗑";
	upButton.onclick = () => {
		moveElementHigher(row);
	};
	downButton.onclick = () => {
		moveElementLower(row);
	};
	binButton.onclick = () => {
		row.remove();
	};
	settings.append(upButton);
	settings.append(downButton);
	settings.append(binButton);

	row.append(iconCell);
	row.append(nameCell);
	row.append(shortcutCell);
	row.append(settings);
	return row;
}

function createTableRowOpenItem(
	window: Window,
	statusFrom: string,
	statusTo: string,
) {
	const row = window.document
		.getElementById(OPEN_ITEM_HIDDEN_ROW)
		?.cloneNode(true) as HTMLTableRowElement;
	row.id = "";
	row.hidden = false;

	const fromMenuList = row?.childNodes[0]?.firstChild as XUL.MenuList;
	const toMenuList = row?.childNodes[1]?.firstChild as XUL.MenuList;
	const deleteButton = row?.childNodes[2]?.firstChild as HTMLButtonElement;

	const [statusNames, statusIcons] = prefStringToList(
		getPref(STATUS_NAME_AND_ICON_LIST_PREF) as string,
	);

	statusNames.forEach((statusName, index) => {
		const statusString = `${statusIcons[index]} ${statusName}`;
		fromMenuList.appendItem(statusString, statusName);
		toMenuList.appendItem(statusString, statusName);
	});

	fromMenuList.selectedIndex = statusNames.indexOf(statusFrom);
	toMenuList.selectedIndex = statusNames.indexOf(statusTo);

	if (row && deleteButton) {
		deleteButton.onclick = () => {
			row.remove();
		};
	}

	return row;
}

function fillAutomaticallyLabelNewItemsMenuList(window: Window) {
	const menuList = window.document.getElementById(
		LABEL_NEW_ITEMS_MENU_LIST,
	)! as unknown as XULMenuListElement;

	menuList.appendItem(
		getString("autolabelnewitems-disabled"),
		LABEL_NEW_ITEMS_PREF_DISABLED,
	); // | isn't valid in a status name

	const [statusNames, statusIcons] = prefStringToList(
		getPref(STATUS_NAME_AND_ICON_LIST_PREF) as string,
	);

	statusNames.forEach((statusName, index) => {
		const statusString = `${statusIcons[index]} ${statusName}`;
		menuList.appendItem(statusString, statusName);
	});

	menuList.selectedIndex = statusNames.indexOf(
		getPref(LABEL_NEW_ITEMS_PREF)! as string,
	);
}

function clearAutomaticallyLabelNewItemsMenuList(window: Window) {
	const listRows = window.document.getElementById(
		LABEL_NEW_ITEMS_MENU_LIST,
	)?.children;
	Array.from(listRows ?? []).map((row) => row.remove());
}

function tagSynchronisationToggled(window: Window) {
	const checkBox = window.document.getElementById(
		TAG_SYNCHRONISATION_CHECKBOX,
	) as HTMLInputElement;
	// checkBox.checked doesn't change until after this event
	if (!checkBox.checked) {
		if (
			Services.prompt.confirm(
				window as mozIDOMWindowProxy,
				getString("enable-tag-synchronisation-title"),
				getString("enable-tag-synchronisation-prompt"),
			)
		) {
			// @ts-ignore - Plugin instance is not typed
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			void Zotero[
				config.addonInstance
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			].data.zoteroReadingListOverlay.updateAllItemsTagsToMatchReadStatuses();
		}
	}
}

export default {
	onPrefsLoad,
	addTableRowStatusNames,
	resetTableStatusNames,
	saveTableStatusNames,
	addTableRowOpenItem,
	resetTableOpenItem,
	saveTableOpenItem,
	setTableVisibilityOpenItem,
	tagSynchronisationToggled,
};
