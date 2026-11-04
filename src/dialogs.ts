import joplin from 'api';
import { ViewHandle } from 'api/types';
import { Place } from './geo';
import { LogEntry } from './parse';
import { esc, dataBlock } from './html';

const handles: Record<string, ViewHandle> = {};

async function dialog(id: string, scripts: string[]): Promise<ViewHandle> {
	if (!handles[id]) {
		handles[id] = await joplin.views.dialogs.create(`placelog-${id}`);
		for (const s of scripts) await joplin.views.dialogs.addScript(handles[id], s);
	}
	return handles[id];
}

// ---------------------------------------------------------------- Log place

export interface LogFormData {
	lat: string;
	lon: string;
	accuracy: string;
	choice: string;
	newName: string;
	newRadius: string;
}

export async function showLogDialog(places: Place[], defaultRadius: number, platform: string): Promise<LogFormData | null> {
	const h = await dialog('log', ['webview/dialog.css', 'webview/log.js']);
	const html = `
<div class="placelog">
	<h2>Log place</h2>
	<div id="status" class="status">Preparing…</div>
	${dataBlock('placelog-data', { places, defaultRadius, platform })}
	<form name="main">
		<input type="hidden" id="lat" name="lat" value="">
		<input type="hidden" id="lon" name="lon" value="">
		<input type="hidden" id="accuracy" name="accuracy" value="">
		<label for="choice">Place</label>
		<select id="choice" name="choice"></select>
		<label for="newName">Or save this position as a new place</label>
		<input type="text" id="newName" name="newName" placeholder="Name, e.g. The Library" autocomplete="off">
		<label for="newRadius">Radius for the new place (metres)</label>
		<input type="number" id="newRadius" name="newRadius" value="${esc(defaultRadius)}" min="10" step="10">
		<div class="hint">Typing a name saves the current position under that name and logs it.</div>
	</form>
	<div id="debug" class="hint" style="margin-top:10px"></div>
</div>`;
	await joplin.views.dialogs.setHtml(h, html);
	await joplin.views.dialogs.setButtons(h, [
		{ id: 'insert', title: 'Insert' },
		{ id: 'cancel', title: 'Cancel' },
	]);
	const result = await joplin.views.dialogs.open(h);
	if (result.id !== 'insert' || !result.formData || !result.formData.main) return null;
	return result.formData.main as LogFormData;
}

// ---------------------------------------------------------------- Manage places

export async function showPlacesDialog(places: Place[], defaultRadius: number): Promise<Place[] | null> {
	const h = await dialog('places', ['webview/dialog.css', 'webview/places.js']);
	const rows = places.map((p, i) => `
		<tr>
			<td><input type="text" name="name_${i}" value="${esc(p.name)}"></td>
			<td class="num"><input type="text" name="lat_${i}" value="${esc(p.lat)}"></td>
			<td class="num"><input type="text" name="lon_${i}" value="${esc(p.lon)}"></td>
			<td class="num"><input type="number" name="radius_${i}" value="${esc(p.radius)}" min="10" step="10"></td>
			<td><input type="checkbox" name="del_${i}"></td>
		</tr>`).join('');
	const html = `
<div class="placelog">
	<h2>Known places</h2>
	<form name="main">
		<input type="hidden" name="count" value="${places.length}">
		<table>
			<thead><tr><th>Name</th><th>Latitude</th><th>Longitude</th><th>Radius (m)</th><th>Delete</th></tr></thead>
			<tbody>
				${rows || '<tr><td colspan="5" class="hint">No places yet.</td></tr>'}
				<tr>
					<td><input type="text" name="new_name" placeholder="New place"></td>
					<td class="num"><input type="text" id="new_lat" name="new_lat" placeholder="lat"></td>
					<td class="num"><input type="text" id="new_lon" name="new_lon" placeholder="lon"></td>
					<td class="num"><input type="number" name="new_radius" value="${esc(defaultRadius)}" min="10" step="10"></td>
					<td><button id="use-current" type="button" title="Fill latitude and longitude from GPS">GPS</button></td>
				</tr>
			</tbody>
		</table>
		<div id="gps-info" class="hint"></div>
		<div class="hint" style="margin-top:8px">Places are stored in the note "Placelog places", which syncs with your other devices.</div>
	</form>
</div>`;
	await joplin.views.dialogs.setHtml(h, html);
	await joplin.views.dialogs.setButtons(h, [
		{ id: 'save', title: 'Save' },
		{ id: 'cancel', title: 'Cancel' },
	]);
	const result = await joplin.views.dialogs.open(h);
	if (result.id !== 'save' || !result.formData || !result.formData.main) return null;

	const f = result.formData.main;
	const out: Place[] = [];
	const count = parseInt(f.count, 10) || 0;
	for (let i = 0; i < count; i++) {
		if (f[`del_${i}`]) continue;
		const p = toPlace(f[`name_${i}`], f[`lat_${i}`], f[`lon_${i}`], f[`radius_${i}`], defaultRadius);
		if (p) out.push(p);
	}
	const np = toPlace(f.new_name, f.new_lat, f.new_lon, f.new_radius, defaultRadius);
	if (np) out.push(np);
	return out;
}

function toPlace(name: string, lat: string, lon: string, radius: string, defaultRadius: number): Place | null {
	const n = (name || '').trim();
	const la = parseFloat(String(lat).replace(',', '.'));
	const lo = parseFloat(String(lon).replace(',', '.'));
	if (!n || !isFinite(la) || !isFinite(lo)) return null;
	const r = parseInt(radius, 10);
	return { name: n, lat: la, lon: lo, radius: isFinite(r) && r > 0 ? r : defaultRadius };
}

// ---------------------------------------------------------------- Map

export async function showMapDialog(entries: LogEntry[], places: Place[], title: string): Promise<string | null> {
	const h = await dialog('map', ['webview/dialog.css', 'vendor/leaflet.css', 'vendor/leaflet.js', 'webview/map.js']);
	const unresolved = entries.filter(e => e.lat === null).length;
	const html = `
<div class="placelog" style="min-width:min(90vw,700px)">
	<h2>${esc(title)}</h2>
	${dataBlock('placelog-data', { entries, unresolved, places, showPlaces: true })}
	<div id="map"></div>
	<div id="mapinfo" class="mapinfo">Loading map…</div>
	<form name="main"><input type="hidden" id="openNoteId" name="openNoteId" value=""></form>
</div>`;
	await joplin.views.dialogs.setHtml(h, html);
	await joplin.views.dialogs.setFitToContent(h, false);
	await joplin.views.dialogs.setButtons(h, [
		{ id: 'open', title: 'Open note' },
		{ id: 'close', title: 'Close' },
	]);
	const result = await joplin.views.dialogs.open(h);
	if (result.id === 'open' && result.formData && result.formData.main && result.formData.main.openNoteId) {
		return result.formData.main.openNoteId;
	}
	return null;
}
