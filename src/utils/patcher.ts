/* eslint-disable @typescript-eslint/no-unsafe-member-access */
const patchMarker = "ZoteroReadingListPatch";
const patchMarkerOriginal = "ZoteroReadingListPatch_original";

export function patch(
	methodObject: any,
	methodName: string,
	patcher: (original: (...args: any[]) => any) => (...args: any[]) => any,
) {
	if (typeof methodObject[methodName] !== "function") {
		throw new Error(
			`${methodObject}.${methodName} either isn't a function or doesn't exist`,
		);
	}
	const originalFunction = methodObject[methodName] as (
		...args: any[]
	) => any;
	if (typeof methodObject[methodName][patchMarker] !== "undefined")
		throw new Error(
			`${methodObject}.${methodName} is already patched by ${patchMarker}`,
		);

	methodObject[methodName] = patcher(originalFunction);
	methodObject[methodName][patchMarker] = true;
	methodObject[methodName][patchMarkerOriginal] = originalFunction;
}

export function unpatch(methodObject: any, methodName: string) {
	if (typeof methodObject[methodName] !== "function") {
		throw new Error(
			`${methodObject}.${methodName} either isn't a function or doesn't exist`,
		);
	}
	if (
		methodObject[methodName][patchMarker] == "undefined" ||
		methodObject[methodName][patchMarkerOriginal] == "undefined"
	) {
		throw new Error(
			`${methodObject}.${methodName} isn't already patched by ${patchMarker} so can't be unpatched`,
		);
	} else {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		methodObject[methodName] =
			methodObject[methodName][patchMarkerOriginal];
		delete methodObject[methodName][patchMarker];
		delete methodObject[methodName][patchMarkerOriginal];
	}
}
