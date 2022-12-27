const patchMarker = 'ZoteroReadingListPatch';

export function patch(methodObject, methodName, patcher) {
	if (methodObject[methodName][patchMarker]) throw new Error(`${methodObject}${methodName} is already patched by ${patchMarker}`)
	methodObject[methodName] = patcher(methodObject[methodName])
	methodObject[methodName][patchMarker] = true
}
