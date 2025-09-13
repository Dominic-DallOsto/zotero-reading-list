import { waitUntilAsync } from "./wait";

export async function fixStyleSheetBug(pluginID: string) {
	// make sure we have the style sheet where the buggy rules get added
	await waitUntilAsync(
		() => findStyleSheetIndex(pluginID) != -1,
		100,
		60000,
	).catch(() => {
		throw new Error("Couldn't find Reading List style sheet");
	});

	// it takes some time for the ItemTreeManager to add these rules
	// so we wait until new rules appear and then remove them
	// but rules can be added multiple times so we repeat this process until
	// no new rules have been added for 5 seconds
	const sheet = document.styleSheets[findStyleSheetIndex(pluginID)];
	deleteBrokenStyleSheetRules(sheet, pluginID);

	for (const _repeats of Array(10)) {
		const startingRules = sheet.rules.length;
		ztoolkit.log(`rules before ${sheet.rules.length}`);
		let toBreak = false;
		await waitUntilAsync(
			() => sheet.rules.length > startingRules,
			100,
			5000,
		).then(
			() => {
				deleteBrokenStyleSheetRules(sheet, pluginID);
				ztoolkit.log("New rules were added so deleted them");
			},
			() => {
				ztoolkit.log("No new rules were added, so not doing anything");
				toBreak = true;
			},
		);
		if (toBreak) {
			break;
		}
		ztoolkit.log(`rules after ${sheet.rules.length}`);
	}
}

function findStyleSheetIndex(pluginID: string) {
	for (const [sheetIndex, sheet] of [...document.styleSheets].entries()) {
		if (getSheetFlexBasisRules(sheet, pluginID).length > 0) {
			return sheetIndex;
		}
	}
	return -1;
}

function getSheetFlexBasisRules(
	sheet: CSSStyleSheet,
	pluginID: string,
): number[] {
	const indices: number[] = [];
	for (const [ruleIndex, rule] of [...sheet.rules].entries()) {
		if (
			rule.cssText.includes(pluginID) &&
			rule.cssText.includes("flex-basis")
		) {
			indices[indices.length] = ruleIndex;
		}
	}
	return indices;
}

function deleteBrokenStyleSheetRules(sheet: CSSStyleSheet, pluginID: string) {
	const indices = getSheetFlexBasisRules(sheet, pluginID);
	if (indices.length > 1) {
		for (const index of indices.slice(1).toReversed()) {
			sheet.deleteRule(index);
		}
	}
}
