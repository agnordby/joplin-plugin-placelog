import { Place, findPlaceByName } from './geo';

export interface LogEntry {
	noteId: string;
	noteTitle: string;
	/** Line number in the note body, 0-based. */
	line: number;
	time: string | null;
	place: string;
	lat: number | null;
	lon: number | null;
	/** True if the position came from the known places list. */
	resolved: boolean;
}

export const GEO_COMMENT = /<!--\s*geo:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*-->/;

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Parse every log line in a note body. */
export function parseNote(noteId: string, noteTitle: string, body: string, marker: string, places: Place[]): LogEntry[] {
	const out: LogEntry[] = [];
	if (!body || !marker || !body.includes(marker)) return out;
	const markerRe = new RegExp(escapeRegExp(marker) + '\\s*(.+)$');
	const timeRe = /\b(\d{1,2}:\d{2})\b/;

	const lines = body.split('\n');
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const m = line.match(markerRe);
		if (!m) continue;

		let rest = m[1];
		let lat: number | null = null;
		let lon: number | null = null;
		const g = rest.match(GEO_COMMENT);
		if (g) {
			lat = parseFloat(g[1]);
			lon = parseFloat(g[2]);
			rest = rest.replace(GEO_COMMENT, '');
		}
		const place = rest.trim();
		const before = line.slice(0, m.index);
		const t = before.match(timeRe);

		let resolved = false;
		if (lat === null) {
			const known = findPlaceByName(place, places);
			if (known) {
				lat = known.lat;
				lon = known.lon;
				resolved = true;
			}
		}
		out.push({ noteId, noteTitle, line: i, time: t ? t[1] : null, place, lat, lon, resolved });
	}
	return out;
}

function pad(n: number): string {
	return n < 10 ? `0${n}` : String(n);
}

export function formatLine(template: string, place: string, when: Date, geoComment?: { lat: number; lon: number }): string {
	const date = `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}`;
	const time = `${pad(when.getHours())}:${pad(when.getMinutes())}`;
	let line = template
		.replace(/\{date\}/g, date)
		.replace(/\{time\}/g, time)
		.replace(/\{datetime\}/g, `${date} ${time}`)
		.replace(/\{place\}/g, place);
	if (geoComment) {
		line += ` <!-- geo:${geoComment.lat.toFixed(6)},${geoComment.lon.toFixed(6)} -->`;
	}
	return line;
}
