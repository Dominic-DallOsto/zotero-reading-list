function isString(argument: any): argument is string {
	return typeof argument == "string";
}

export function getFieldValueFromExtraData(
	extraData: string,
	fieldName: string,
) {
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

export function removeFieldValueFromExtraData(
	extraData: string,
	fieldName: string,
) {
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
export function getItemExtraProperty(
	item: Zotero.Item,
	fieldName: string,
): string[] {
	return getFieldValueFromExtraData(item.getField("extra"), fieldName);
}

/**
 * Set field value in extra field item.
 * It sets: therefore, if already exists, replaces
 * @param {Zotero.Item} item - A Zotero item.
 * @param {string} fieldName - The name of the extra field to be set.
 * @param {String[]} values - An array of values for the field to be set.
 */
export function setItemExtraProperty(
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
export function clearItemExtraProperty(item: Zotero.Item, fieldName: string) {
	item.setField(
		"extra",
		removeFieldValueFromExtraData(item.getField("extra"), fieldName),
	);
}
