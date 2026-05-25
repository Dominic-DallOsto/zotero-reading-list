import {
	CUSTOM_COLUMNS_PREF,
	DEFAULT_CUSTOM_COLUMNS,
	parseCustomColumnsPref,
	serializeCustomColumnsPref,
	type CustomColumnConfig,
} from "./modules/overlay";
import { getPref, setPref } from "./utils/prefs";
import { getString } from "./utils/locale";

const CUSTOM_COLUMNS_TABLE_BODY = "custom-columns-table-body";
const CUSTOM_COLUMN_SECTIONS_CONTAINER = "custom-column-sections";
const CUSTOM_COLUMN_VALUES_TABLE_BODY_PREFIX =
	"custom-column-values-table-body-";

function onPrefsLoad(window: Window) {
	setTableCustomColumns(window);
	setCustomColumnSections(window);
}

function setTableCustomColumns(window: Window) {
	const tableBodyCustomColumns = window.document.getElementById(
		CUSTOM_COLUMNS_TABLE_BODY,
	);
	for (const row of createTableRowsCustomColumns(window)) {
		tableBodyCustomColumns?.append(row);
	}
}

function setCustomColumnSections(window: Window) {
	clearCustomColumnSections(window);
	const container = window.document.getElementById(
		CUSTOM_COLUMN_SECTIONS_CONTAINER,
	);
	const customColumns = parseCustomColumnsPref(
		getPref(CUSTOM_COLUMNS_PREF) as string,
	);
	for (const column of customColumns) {
		container?.append(createCustomColumnSection(window, column));
	}
}

function addTableRowCustomColumns(window: Window) {
	window.document.getElementById(CUSTOM_COLUMNS_TABLE_BODY)?.append(
		createTableRowCustomColumns(window, {
			id: "",
			name: "",
			values: [],
		}),
	);
}

function resetTableCustomColumns(window: Window) {
	setPref(
		CUSTOM_COLUMNS_PREF,
		serializeCustomColumnsPref(DEFAULT_CUSTOM_COLUMNS),
	);
	clearTableCustomColumns(window);
	setTableCustomColumns(window);
	setCustomColumnSections(window);
}

function clearTableCustomColumns(window: Window) {
	const tableRows = window.document.getElementById(
		CUSTOM_COLUMNS_TABLE_BODY,
	)?.children;
	Array.from(tableRows ?? []).forEach((row) => {
		row.remove();
	});
}

function clearCustomColumnSections(window: Window) {
	const container = window.document.getElementById(
		CUSTOM_COLUMN_SECTIONS_CONTAINER,
	);
	Array.from(container?.children ?? []).forEach((child) => {
		child.remove();
	});
}

function getTableCustomColumns(window: Window) {
	const tableRows = window.document.getElementById(
		CUSTOM_COLUMNS_TABLE_BODY,
	)?.children;
	const existingColumns = new Map(
		parseCustomColumnsPref(getPref(CUSTOM_COLUMNS_PREF) as string).map(
			(column) => [column.id, column.values],
		),
	);
	const columns: CustomColumnConfig[] = [];
	const names: string[] = [];
	let hasPartialRows = false;
	for (const row of tableRows ?? []) {
		const nameInput = row.children[0].firstChild as HTMLInputElement;
		const name = nameInput.value.trim();
		const columnId = (row as HTMLTableRowElement).dataset.columnId ?? "";
		if (!name) {
			if (columnId) {
				hasPartialRows = true;
			}
			continue;
		}
		names.push(name);
		columns.push({
			id: columnId,
			name,
			values: existingColumns.get(columnId) ?? [],
		});
	}
	return { columns, names, hasPartialRows };
}

function setDuplicateCustomColumnRowsAsInvalid(
	window: Window,
	duplicates: Set<string>,
) {
	const tableRows = window.document.getElementById(
		CUSTOM_COLUMNS_TABLE_BODY,
	)?.children;
	for (const row of tableRows ?? []) {
		const nameInput = row.children[0].firstChild as HTMLInputElement;
		if (duplicates.has(nameInput.value.trim())) {
			nameInput.setCustomValidity("duplicate");
		}
	}
}

function validateCustomColumnsTable(window: Window) {
	const tableRows = window.document.getElementById(
		CUSTOM_COLUMNS_TABLE_BODY,
	)?.children;
	const names: string[] = [];
	for (const row of tableRows ?? []) {
		const nameInput = row.children[0].firstChild as HTMLInputElement;
		const name = nameInput.value.trim();
		const columnId = (row as HTMLTableRowElement).dataset.columnId ?? "";
		nameInput.setCustomValidity(!name && columnId ? "missing-name" : "");
		if (name) {
			names.push(name);
		}
	}
	const duplicates = findDuplicateValues(names);
	if (duplicates.size) {
		setDuplicateCustomColumnRowsAsInvalid(window, duplicates);
	}
}

function customColumnsTableContainsInvalidInput(window: Window) {
	const tableRows = window.document.getElementById(
		CUSTOM_COLUMNS_TABLE_BODY,
	)?.children;
	for (const row of tableRows ?? []) {
		const nameInput = row.children[0].firstChild as HTMLInputElement;
		if (!nameInput.checkValidity()) {
			return true;
		}
	}
	return false;
}

function findDuplicateValues(values: string[]) {
	const unique = new Set<string>();
	const duplicates = new Set<string>();
	for (const value of values) {
		if (unique.has(value)) {
			duplicates.add(value);
		} else {
			unique.add(value);
		}
	}
	return duplicates;
}

function generateCustomColumnId(existingIds: Set<string>) {
	const cryptoApi = globalThis.crypto;
	let columnId = "";
	do {
		columnId =
			cryptoApi && typeof cryptoApi.randomUUID === "function"
				? cryptoApi.randomUUID()
				: `column-${Date.now().toString(36)}-${Math.random()
						.toString(36)
						.slice(2, 8)}`;
	} while (existingIds.has(columnId));
	existingIds.add(columnId);
	return columnId;
}

function saveTableCustomColumns(window: Window) {
	validateCustomColumnsTable(window);
	const { columns, names, hasPartialRows } = getTableCustomColumns(window);
	if (hasPartialRows || customColumnsTableContainsInvalidInput(window)) {
		Services.prompt.alert(
			window as mozIDOMWindowProxy,
			getString("invalid-custom-columns-title"),
			getString("invalid-custom-columns-description"),
		);
		return;
	}
	const duplicateColumns = findDuplicateValues(names);
	if (duplicateColumns.size) {
		Services.prompt.alert(
			window as mozIDOMWindowProxy,
			getString("duplicate-custom-columns-title"),
			getString("duplicate-custom-columns-description"),
		);
		return;
	}
	const existingIds = new Set(
		columns.map((column) => column.id).filter((id) => id),
	);
	const normalizedColumns = columns.map((column) => ({
		...column,
		id: column.id || generateCustomColumnId(existingIds),
	}));
	setPref(CUSTOM_COLUMNS_PREF, serializeCustomColumnsPref(normalizedColumns));
	clearTableCustomColumns(window);
	setTableCustomColumns(window);
	setCustomColumnSections(window);
}

function createElement(elementName: string) {
	return document.createElementNS(
		"http://www.w3.org/1999/xhtml",
		elementName,
	);
}

function createXulElement(window: Window, elementName: string) {
	return window.document.createXULElement
		? window.document.createXULElement(elementName)
		: window.document.createElement(elementName);
}

function moveElementHigher(element: HTMLElement) {
	if (element !== element.parentElement?.firstChild) {
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

function createTableRowsCustomColumns(window: Window) {
	const customColumns = parseCustomColumnsPref(
		getPref(CUSTOM_COLUMNS_PREF) as string,
	);
	return customColumns.map((column) =>
		createTableRowCustomColumns(window, column),
	);
}

function createTableRowCustomColumns(
	window: Window,
	column: CustomColumnConfig,
) {
	const row = createElement("html:tr");
	row.dataset.columnId = column.id;

	const nameCell = createElement("html:td");
	const nameInput = createElement("html:input") as HTMLInputElement;
	nameInput.type = "text";
	nameInput.value = column.name;
	nameInput.oninput = () => validateCustomColumnsTable(window);
	nameCell.append(nameInput);

	const settings = createElement("html:td");
	const upButton = createElement("html:button");
	const downButton = createElement("html:button");
	const binButton = createElement("html:button");
	upButton.textContent = "⬆";
	downButton.textContent = "⬇";
	binButton.textContent = "🗑";
	upButton.setAttribute("aria-label", getString("table-row-move-up"));
	downButton.setAttribute("aria-label", getString("table-row-move-down"));
	binButton.setAttribute("aria-label", getString("table-row-delete"));
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

	row.append(nameCell);
	row.append(settings);
	return row;
}

function getCustomColumnValuesTableBodyId(columnId: string) {
	return `${CUSTOM_COLUMN_VALUES_TABLE_BODY_PREFIX}${columnId}`;
}

function getCustomColumnValuesTableBody(window: Window, columnId: string) {
	return window.document.getElementById(
		getCustomColumnValuesTableBodyId(columnId),
	) as HTMLTableSectionElement | null;
}

function setCustomColumnValuesTable(
	window: Window,
	column: CustomColumnConfig,
) {
	const tableBody = getCustomColumnValuesTableBody(window, column.id);
	for (const row of createCustomColumnValueRows(window, column.id, column)) {
		tableBody?.append(row);
	}
}

function clearCustomColumnValuesTable(window: Window, columnId: string) {
	const tableRows = getCustomColumnValuesTableBody(
		window,
		columnId,
	)?.children;
	Array.from(tableRows ?? []).forEach((row) => row.remove());
}

function addCustomColumnValueRow(window: Window, columnId: string) {
	getCustomColumnValuesTableBody(window, columnId)?.append(
		createCustomColumnValueRow(window, columnId, ""),
	);
}

function resetCustomColumnValues(window: Window, columnId: string) {
	const customColumns = parseCustomColumnsPref(
		getPref(CUSTOM_COLUMNS_PREF) as string,
	);
	const column = customColumns.find((entry) => entry.id === columnId);
	if (!column) {
		return;
	}
	clearCustomColumnValuesTable(window, columnId);
	setCustomColumnValuesTable(window, column);
}

function getCustomColumnValues(window: Window, columnId: string) {
	const tableRows = getCustomColumnValuesTableBody(
		window,
		columnId,
	)?.children;
	const values: string[] = [];
	let hasEmptyRows = false;
	for (const row of tableRows ?? []) {
		const valueInput = row.children[0].firstChild as HTMLInputElement;
		const value = valueInput.value.trim();
		if (!value) {
			hasEmptyRows = true;
			continue;
		}
		values.push(value);
	}
	return { values, hasEmptyRows };
}

function setDuplicateCustomColumnValueRowsAsInvalid(
	window: Window,
	columnId: string,
	duplicates: Set<string>,
) {
	const tableRows = getCustomColumnValuesTableBody(
		window,
		columnId,
	)?.children;
	for (const row of tableRows ?? []) {
		const valueInput = row.children[0].firstChild as HTMLInputElement;
		if (duplicates.has(valueInput.value.trim())) {
			valueInput.setCustomValidity("duplicate");
		}
	}
}

function validateCustomColumnValuesTable(window: Window, columnId: string) {
	const tableRows = getCustomColumnValuesTableBody(
		window,
		columnId,
	)?.children;
	const values: string[] = [];
	for (const row of tableRows ?? []) {
		const valueInput = row.children[0].firstChild as HTMLInputElement;
		const value = valueInput.value.trim();
		valueInput.setCustomValidity(value ? "" : "missing-value");
		if (value) {
			values.push(value);
		}
	}
	const duplicates = findDuplicateValues(values);
	if (duplicates.size) {
		setDuplicateCustomColumnValueRowsAsInvalid(
			window,
			columnId,
			duplicates,
		);
	}
}

function customColumnValuesTableContainsInvalidInput(
	window: Window,
	columnId: string,
) {
	const tableRows = getCustomColumnValuesTableBody(
		window,
		columnId,
	)?.children;
	for (const row of tableRows ?? []) {
		const valueInput = row.children[0].firstChild as HTMLInputElement;
		if (!valueInput.checkValidity()) {
			return true;
		}
	}
	return false;
}

function saveCustomColumnValues(window: Window, columnId: string) {
	validateCustomColumnValuesTable(window, columnId);
	const { values, hasEmptyRows } = getCustomColumnValues(window, columnId);
	if (
		hasEmptyRows ||
		customColumnValuesTableContainsInvalidInput(window, columnId)
	) {
		Services.prompt.alert(
			window as mozIDOMWindowProxy,
			getString("invalid-custom-column-values-title"),
			getString("invalid-custom-column-values-description"),
		);
		return;
	}
	const duplicateValues = findDuplicateValues(values);
	if (duplicateValues.size) {
		Services.prompt.alert(
			window as mozIDOMWindowProxy,
			getString("duplicate-custom-column-values-title"),
			getString("duplicate-custom-column-values-description"),
		);
		return;
	}
	const customColumns = parseCustomColumnsPref(
		getPref(CUSTOM_COLUMNS_PREF) as string,
	);
	const updatedColumns = customColumns.map((column) =>
		column.id === columnId ? { ...column, values } : column,
	);
	setPref(CUSTOM_COLUMNS_PREF, serializeCustomColumnsPref(updatedColumns));
	clearCustomColumnValuesTable(window, columnId);
	const updatedColumn = updatedColumns.find(
		(column) => column.id === columnId,
	);
	if (updatedColumn) {
		setCustomColumnValuesTable(window, updatedColumn);
	}
}

function createCustomColumnValueRows(
	window: Window,
	columnId: string,
	column: CustomColumnConfig,
) {
	return column.values.map((value) =>
		createCustomColumnValueRow(window, columnId, value),
	);
}

function createCustomColumnValueRow(
	window: Window,
	columnId: string,
	value: string,
) {
	const row = createElement("html:tr");

	const valueCell = createElement("html:td");
	const valueInput = createElement("html:input") as HTMLInputElement;
	valueInput.type = "text";
	valueInput.value = value;
	valueInput.oninput = () =>
		validateCustomColumnValuesTable(window, columnId);
	valueCell.append(valueInput);

	const settings = createElement("html:td");
	const upButton = createElement("html:button");
	const downButton = createElement("html:button");
	const binButton = createElement("html:button");
	upButton.textContent = "⬆";
	downButton.textContent = "⬇";
	binButton.textContent = "🗑";
	upButton.setAttribute("aria-label", getString("table-row-move-up"));
	downButton.setAttribute("aria-label", getString("table-row-move-down"));
	binButton.setAttribute("aria-label", getString("table-row-delete"));
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

	row.append(valueCell);
	row.append(settings);
	return row;
}

function createCustomColumnSection(window: Window, column: CustomColumnConfig) {
	const groupbox = createXulElement(window, "groupbox") as HTMLElement;
	groupbox.dataset.columnId = column.id;

	const label = createXulElement(window, "label");
	const heading = createElement("html:h2");
	heading.textContent = getString("custom-column-values-title", {
		args: { name: column.name },
	});
	label.append(heading);
	groupbox.append(label);

	const table = createElement("html:table");
	const thead = createElement("html:thead");
	const headerRow = createElement("html:tr");
	const valueHeader = createElement("html:th");
	valueHeader.textContent = getString("custom-column-values-header-value");
	const reorderHeader = createElement("html:th");
	reorderHeader.textContent = getString(
		"custom-column-values-header-reorder",
	);
	headerRow.append(valueHeader);
	headerRow.append(reorderHeader);
	thead.append(headerRow);
	table.append(thead);

	const tbody = createElement("html:tbody");
	tbody.id = getCustomColumnValuesTableBodyId(column.id);
	table.append(tbody);
	groupbox.append(table);

	const addButton = createElement("html:button");
	addButton.textContent = getString("custom-column-values-button-add");
	addButton.onclick = () => addCustomColumnValueRow(window, column.id);
	groupbox.append(addButton);
	groupbox.append(createElement("html:br"));

	const saveButton = createElement("html:button");
	saveButton.textContent = getString("custom-column-values-button-save");
	saveButton.onclick = () => saveCustomColumnValues(window, column.id);
	groupbox.append(saveButton);

	const resetButton = createElement("html:button");
	resetButton.textContent = getString("custom-column-values-button-reset");
	resetButton.onclick = () => resetCustomColumnValues(window, column.id);
	groupbox.append(resetButton);

	setCustomColumnValuesTable(window, column);

	return groupbox;
}

export default {
	onPrefsLoad,
	addTableRowCustomColumns,
	resetTableCustomColumns,
	saveTableCustomColumns,
};
