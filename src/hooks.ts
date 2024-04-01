import {STATUS_NAME_AND_ICON_LIST_PREF, DEFAULT_STATUS_NAMES, DEFAULT_STATUS_ICONS, prefStringToList, listToPrefString} from "./modules/overlay";
import ZoteroReadingList from "./modules/overlay";
import { config } from "../package.json";
import { initLocale } from "./utils/locale";
import { createZToolkit } from "./utils/ztoolkit";
import { getPref, setPref } from "./utils/prefs";

let zoteroReadingList: ZoteroReadingList;

async function onStartup() {
	await Promise.all([
		Zotero.initializationPromise,
		Zotero.unlockPromise,
		Zotero.uiReadyPromise,
	]);

	// TODO: Remove this after zotero#3387 is merged
	if (__env__ === "development") {
		// Keep in sync with the scripts/startup.mjs
		const loadDevToolWhen = `Plugin ${config.addonID} startup`;
		ztoolkit.log(loadDevToolWhen);
	}

	initLocale();

	await onMainWindowLoad(window);
}

// eslint-disable-next-line @typescript-eslint/require-await
async function onMainWindowLoad(win: Window): Promise<void> {
	// Create ztoolkit for every window
	addon.data.ztoolkit = createZToolkit();
	zoteroReadingList = new ZoteroReadingList();
}

// eslint-disable-next-line @typescript-eslint/require-await
async function onMainWindowUnload(win: Window): Promise<void> {
	zoteroReadingList.unload();
	ztoolkit.unregisterAll();
	addon.data.dialog?.window?.close();
}

function onPrefsLoad(window:Window) {
	const tableBody = window.document.getElementById("statusnames-table-body");
	for (const row of createStatusNamesTableRows()){
		tableBody?.append(row)
	}
}

function addTableRow(window:Window) {
	const tableBody = window.document.getElementById("statusnames-table-body");
	tableBody?.append(createTableRow("", ""));
}

function resetTable(window:Window) {
	const tableRows = window.document.getElementById("statusnames-table-body")?.children;
	if (tableRows != undefined){
		for (let i=tableRows.length-1; i >= 0; i--){
			tableRows[i].remove();
		}
	}
	setPref(STATUS_NAME_AND_ICON_LIST_PREF, listToPrefString(DEFAULT_STATUS_NAMES, DEFAULT_STATUS_ICONS));
	onPrefsLoad(window);
}

function saveTable(window:Window) {
	const tableRows = window.document.getElementById("statusnames-table-body")?.children;
	const names: string[] = [];
	const icons: string[] = [];
	if (tableRows != undefined){
		for (let i=0; i < tableRows.length; i++){
			icons.push((tableRows[i].children[0].firstChild as HTMLInputElement).value);
			names.push((tableRows[i].children[1].firstChild as HTMLInputElement).value);
		}
	}
	setPref(STATUS_NAME_AND_ICON_LIST_PREF, listToPrefString(names, icons));
}

function createElement(elementName: string){
	return document.createElementNS("http://www.w3.org/1999/xhtml", elementName);
}

function moveElementHigher(element: HTMLElement){
	if (element != element.parentElement?.firstChild){
		element.parentElement?.insertBefore(element, element.previousSibling);
	}
}

function moveElementLower(element: HTMLElement){
	if (element.nextSibling){
		element.parentElement?.insertBefore(element, element.nextSibling?.nextSibling);
	}
}

function createStatusNamesTableRows(){
	const [statusNames, statusIcons] = prefStringToList(getPref(STATUS_NAME_AND_ICON_LIST_PREF) as string);
	return statusNames.map((statusName, index) => createTableRow(statusIcons[index], statusName));
}

function createTableRow(icon: string, name: string){
	const row = createElement("html:tr");

	const iconRow = createElement("html:td");
	const iconInput = createElement("html:input") as HTMLInputElement;
	iconInput.type = "text";
	iconInput.value = icon;
	iconRow.append(iconInput);

	const nameRow = createElement("html:td");
	const nameInput = createElement("html:input") as HTMLInputElement;
	nameInput.type = "text";
	nameInput.value = name;
	nameRow.append(nameInput);

	const settings = createElement("html:td");
	const upButton = createElement("html:button");
	const downButton = createElement("html:button");
	const binButton = createElement("html:button");
	upButton.textContent = "⬆";
	downButton.textContent = "⬇";
	binButton.textContent = "🗑";
	upButton.onclick = () => { moveElementHigher(row) };
	downButton.onclick = () => { moveElementLower(row) };
	binButton.onclick = () => { row.remove() };
	settings.append(upButton);
	settings.append(downButton);
	settings.append(binButton);

	row.append(iconRow);
	row.append(nameRow);
	row.append(settings);
	return row;
}

function onShutdown(): void {
	ztoolkit.unregisterAll();
	addon.data.dialog?.window?.close();
	// Remove addon object
	addon.data.alive = false;
	delete Zotero[config.addonInstance];
}

export default {
	onStartup,
	onShutdown,
	onMainWindowLoad,
	onMainWindowUnload,
	onPrefsLoad,
	addTableRow,
	saveTable,
	resetTable,
};
