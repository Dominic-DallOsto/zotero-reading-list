import { waitUntilAsync } from "./wait";
import { patch as $patch$, unpatch as $unpatch$ } from "./patcher";

// the problem is that duplicate flex-basis rules get added every time the columns are updated
// and these cause the column resizing to break
// so we stop any duplicate rules being added

export async function fixStyleSheetBug(addonID: string) {
	// make sure we have the style sheet where the buggy rules get added
	await waitUntilAsync(
		() => findStyleSheetIndex(addonID) != -1,
		100,
		60000,
	).catch(() => {
		throw new Error("Couldn't find Reading List style sheet");
	});
	const sheet = document.styleSheets[findStyleSheetIndex(addonID)];

	$patch$(
		sheet,
		"insertRule",
		// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
		(original: Function) =>
			function insertRulePatch(this: CSSStyleSheet) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, prefer-rest-params
				const ruleString: string = arguments[0];
				if (
					ruleMatches(ruleString, addonID) &&
					getSheetAddonFlexBasisRules(this, addonID).length > 0
				) {
					// we already have one copy of this rule so don't add it again
					return;
				}
				// otherwise, add this rule like normal
				// eslint-disable-next-line prefer-rest-params
				original.apply(this, arguments);
			},
	);
}

export function cleanupStyleSheetBugFix(addonID: string) {
	const sheet = document.styleSheets[findStyleSheetIndex(addonID)];
	$unpatch$(sheet, "insertRule");
}

function findStyleSheetIndex(addonID: string) {
	for (const [sheetIndex, sheet] of [...document.styleSheets].entries()) {
		if (getSheetAddonFlexBasisRules(sheet, addonID).length > 0) {
			return sheetIndex;
		}
	}
	return -1;
}

function getSheetAddonFlexBasisRules(
	sheet: CSSStyleSheet,
	addonID: string,
): number[] {
	const indices: number[] = [];
	for (const [ruleIndex, rule] of [...sheet.rules].entries()) {
		if (ruleMatches(rule.cssText, addonID)) {
			indices[indices.length] = ruleIndex;
		}
	}
	return indices;
}

function ruleMatches(ruleString: string, addonID: string) {
	// need to unescape the addonID in the CSS string because it includes @ and . characters
	return (
		ruleString.replaceAll("\\", "").includes(addonID) &&
		ruleString.includes("flex-basis")
	);
}
