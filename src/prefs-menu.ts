import {
	STATUS_NAME_AND_ICON_LIST_PREF,
	DEFAULT_STATUS_NAMES,
	DEFAULT_STATUS_ICONS,
	STATUS_CHANGE_ON_OPEN_ITEM_LIST_PREF,
	LABEL_ITEMS_WHEN_OPENING_FILE_PREF,
	DEFAULT_STATUS_CHANGE_FROM,
	DEFAULT_STATUS_CHANGE_TO,
	prefStringToList,
	listToPrefString,
} from "./modules/overlay";
import { getPref, setPref } from "./utils/prefs";

function onPrefsLoad(window: Window) {
	setTableStatusNames(window);
	setTableOpenItem(window);
}

function setTableStatusNames(window: Window) {
	const tableBodyStatusNames = window.document.getElementById(
		"statusnames-table-body",
	);
	for (const row of createTableRowsStatusNames()) {
		tableBodyStatusNames?.append(row);
	}
}

function setTableOpenItem(window: Window) {
	const tableBodyOpenItem = window.document.getElementById(
		"openitem-table-body",
	);
	for (const row of createTableRowsOpenItem()) {
		tableBodyOpenItem?.append(row);
	}
	if (tableBodyOpenItem?.parentElement) {
		tableBodyOpenItem.parentElement.hidden = !getPref(
			LABEL_ITEMS_WHEN_OPENING_FILE_PREF,
		) as boolean;
	}
}

function setTableVisibilityOpenItem(window: Window) {
	const tableBody = window.document.getElementById("openitem-table-body");
	const checkBox = window.document.getElementById(
		"zotero-prefpane-zotero-reading-list-label-items-when-opening-file",
	) as HTMLInputElement;
	if (tableBody?.parentElement && checkBox) {
		tableBody.parentElement.hidden = checkBox.checked;
	}
}

function addTableRowStatusNames(window: Window) {
	const tableBody = window.document.getElementById("statusnames-table-body");
	tableBody?.append(createTableRowStatusNames("", ""));
}

function addTableRowOpenItem(window: Window) {
	const tableBody = window.document.getElementById("openitem-table-body");
	tableBody?.append(createTableRowOpenItem("", ""));
}

function resetTableStatusNames(window: Window) {
	const tableRows = window.document.getElementById(
		"statusnames-table-body",
	)?.children;
	if (tableRows != undefined) {
		for (let i = tableRows.length - 1; i >= 0; i--) {
			tableRows[i].remove();
		}
	}
	setPref(
		STATUS_NAME_AND_ICON_LIST_PREF,
		listToPrefString(DEFAULT_STATUS_NAMES, DEFAULT_STATUS_ICONS),
	);
	setTableStatusNames(window);
}

function resetTableOpenItem(window: Window) {
	const tableRows = window.document.getElementById(
		"openitem-table-body",
	)?.children;
	if (tableRows != undefined) {
		for (let i = tableRows.length - 1; i >= 0; i--) {
			tableRows[i].remove();
		}
	}
	setPref(
		STATUS_CHANGE_ON_OPEN_ITEM_LIST_PREF,
		listToPrefString(DEFAULT_STATUS_CHANGE_FROM, DEFAULT_STATUS_CHANGE_TO),
	);
	setTableOpenItem(window);
}

function saveTableStatusNames(window: Window) {
	const tableRows = window.document.getElementById(
		"statusnames-table-body",
	)?.children;
	const names: string[] = [];
	const icons: string[] = [];
	if (tableRows != undefined) {
		for (let i = 0; i < tableRows.length; i++) {
			icons.push(
				(tableRows[i].children[0].firstChild as HTMLInputElement).value,
			);
			names.push(
				(tableRows[i].children[1].firstChild as HTMLInputElement).value,
			);
		}
	}
	setPref(STATUS_NAME_AND_ICON_LIST_PREF, listToPrefString(names, icons));
}

function saveTableOpenItem(window: Window) {
	const tableRows = window.document.getElementById(
		"openitem-table-body",
	)?.children;
	const statusesFrom: string[] = [];
	const statusesTo: string[] = [];
	if (tableRows != undefined) {
		for (let i = 0; i < tableRows.length; i++) {
			statusesFrom.push(
				(tableRows[i].children[0].firstChild as HTMLInputElement).value,
			);
			statusesTo.push(
				(tableRows[i].children[1].firstChild as HTMLInputElement).value,
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

function createTableRowsStatusNames() {
	const [statusNames, statusIcons] = prefStringToList(
		getPref(STATUS_NAME_AND_ICON_LIST_PREF) as string,
	);
	return statusNames.map((statusName, index) =>
		createTableRowStatusNames(statusIcons[index], statusName),
	);
}

function createTableRowsOpenItem() {
	const [statusFrom, statusTo] = prefStringToList(
		getPref(STATUS_CHANGE_ON_OPEN_ITEM_LIST_PREF) as string,
	);
	return statusFrom.map((statusName, index) =>
		createTableRowOpenItem(statusName, statusTo[index]),
	);
}

function createTableRowStatusNames(icon: string, name: string) {
	const row = createElement("html:tr");

	const iconCell = createElement("html:td");
	const iconInput = createElement("html:input") as HTMLInputElement;
	iconInput.type = "text";
	iconInput.value = icon;
	iconCell.append(iconInput);

	const nameCell = createElement("html:td");
	const nameInput = createElement("html:input") as HTMLInputElement;
	nameInput.type = "text";
	nameInput.value = name;
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

function createTableRowOpenItem(icon: string, name: string) {
	const row = createElement("html:tr");

	const fromCell = createElement("html:td");
	const fromInput = createElement("html:input") as HTMLInputElement;
	fromInput.type = "text";
	fromInput.value = icon;
	fromCell.append(fromInput);

	const toCell = createElement("html:td");
	const toInput = createElement("html:input") as HTMLInputElement;
	toInput.type = "text";
	toInput.value = name;
	toCell.append(toInput);

	const settings = createElement("html:td");
	const binButton = createElement("html:button");
	binButton.textContent = "🗑";
	binButton.onclick = () => {
		row.remove();
	};
	settings.append(binButton);

	row.append(fromCell);
	row.append(toCell);
	row.append(settings);
	return row;
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
};
