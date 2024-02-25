const patchMarker = 'ZoteroReadingListPatch';

export function patch(methodObject: any, methodName: string, patcher: Function) {
	if (methodObject[methodName][patchMarker]) throw new Error(`${methodObject}${methodName} is already patched by ${patchMarker}`)
	methodObject[methodName] = patcher(methodObject[methodName])
	methodObject[methodName][patchMarker] = true
}	