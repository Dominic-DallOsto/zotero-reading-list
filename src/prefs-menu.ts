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
} from "./modules/overlay";
import { getPref, setPref } from "./utils/prefs";
import { config } from "../package.json";
import { getString } from "./utils/locale";

const STATUS_NAMES_TABLE_BODY = "statusnames-table-body";
const OPEN_ITEM_TABLE_BODY = "openitem-table-body";
const OPEN_ITEM_HIDDEN_ROW = "openitem-table-hidden-row";
const OPEN_ITEM_CHECKBOX =
	"zotero-prefpane-zotero-reading-list-label-items-when-opening-file";
const LABEL_NEW_ITEMS_MENU_LIST = "automatically-label-new-items-menulist";

const TAG_SYNCHRONISATION_CHECKBOX =
	"zotero-prefpane-zotero-reading-list-set-read-status-tags";
function onPrefsLoad(window: Window) {
	setTableStatusNames(window);
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
		) as boolean;
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
	window.document
		.getElementById(STATUS_NAMES_TABLE_BODY)
		?.append(createTableRowStatusNames(window, "", ""));
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
	setPref(
		STATUS_NAME_AND_ICON_LIST_PREF,
		listToPrefString(DEFAULT_STATUS_NAMES, DEFAULT_STATUS_ICONS),
	);
	setTableStatusNames(window);
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
	}
	setPref(STATUS_NAME_AND_ICON_LIST_PREF, listToPrefString(names, icons));
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
	return statusNames.map((statusName, index) =>
		createTableRowStatusNames(window, statusIcons[index], statusName),
	);
}

function createTableRowsOpenItem(window: Window) {
	const [statusFrom, statusTo] = prefStringToList(
		getPref(STATUS_CHANGE_ON_OPEN_ITEM_LIST_PREF) as string,
	);
	return statusFrom.map((statusName, index) =>
		createTableRowOpenItem(window, statusName, statusTo[index]),
	);
}

function createTableRowStatusNames(window: Window, icon: string, name: string) {
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
	)! as XUL.MenuList;

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
