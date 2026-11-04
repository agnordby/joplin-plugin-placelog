export interface Place {
	name: string;
	lat: number;
	lon: number;
	radius: number;
}

export interface LatLon {
	lat: number;
	lon: number;
}

/** Distance in metres between two positions (haversine). */
export function distanceMetres(a: LatLon, b: LatLon): number {
	const R = 6371000;
	const toRad = (d: number) => d * Math.PI / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLon = toRad(b.lon - a.lon);
	const la1 = toRad(a.lat);
	const la2 = toRad(b.lat);
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(h));
}

export interface Match {
	place: Place;
	distance: number;
}

/** All places sorted by distance from the position. */
export function rankPlaces(pos: LatLon, places: Place[]): Match[] {
	return places
		.map(place => ({ place, distance: distanceMetres(pos, place) }))
		.sort((a, b) => a.distance - b.distance);
}

/** The nearest place whose radius contains the position, or null. */
export function matchPlace(pos: LatLon, places: Place[]): Match | null {
	const ranked = rankPlaces(pos, places);
	if (!ranked.length) return null;
	return ranked[0].distance <= ranked[0].place.radius ? ranked[0] : null;
}

export function findPlaceByName(name: string, places: Place[]): Place | null {
	const n = name.trim().toLowerCase();
	return places.find(p => p.name.trim().toLowerCase() === n) || null;
}
