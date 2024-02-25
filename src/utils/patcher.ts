/* eslint-disable @typescript-eslint/no-unsafe-member-access */
const patchMarker = "ZoteroReadingListPatch";

export function patch(
	methodObject: any,
	methodName: string,
	// eslint-disable-next-line @typescript-eslint/ban-types
	patcher: Function,
) {
	if (methodObject[methodName][patchMarker])
		throw new Error(
			`${methodObject}${methodName} is already patched by ${patchMarker}`,
		);
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	methodObject[methodName] = patcher(methodObject[methodName]);
	methodObject[methodName][patchMarker] = true;
}
