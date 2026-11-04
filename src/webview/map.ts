// Runs inside the map dialog webview. Uses Leaflet loaded from vendor/leaflet.js.
interface Entry { noteId: string; noteTitle: string; time: string | null; place: string; lat: number | null; lon: number | null }
interface Data { entries: Entry[]; unresolved: number; places: { name: string; lat: number; lon: number; radius: number }[]; showPlaces: boolean }


function esc(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function render() {
	const L = (window as any).L;
	const data: Data = JSON.parse(document.getElementById('placelog-data')!.textContent || '{}');
	const openNote = document.getElementById('openNoteId') as HTMLInputElement;
	const info = document.getElementById('mapinfo')!;

	const map = L.map('map', { zoomControl: true });
	L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
	}).addTo(map);

	const bounds = L.latLngBounds([]);
	const palette = ['#d7301f', '#1f78b4', '#33a02c', '#ff7f00', '#6a3d9a', '#b15928', '#e7298a', '#1b9e77'];
	const noteColour = new Map<string, string>();
	const byNote = new Map<string, Entry[]>();

	for (const e of data.entries) {
		if (e.lat === null || e.lon === null) continue;
		if (!byNote.has(e.noteId)) {
			byNote.set(e.noteId, []);
			noteColour.set(e.noteId, palette[noteColour.size % palette.length]);
		}
		byNote.get(e.noteId)!.push(e);
	}

	// Group entries at the same spot into one marker.
	const groups = new Map<string, Entry[]>();
	for (const e of data.entries) {
		if (e.lat === null || e.lon === null) continue;
		const key = `${e.lat.toFixed(5)},${e.lon.toFixed(5)}`;
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key)!.push(e);
	}

	for (const [, list] of groups) {
		const first = list[0];
		const colour = byNote.size === 1 ? palette[0] : noteColour.get(first.noteId)!;
		const marker = L.circleMarker([first.lat, first.lon], {
			radius: 8, color: colour, fillColor: colour, fillOpacity: 0.7, weight: 2,
		}).addTo(map);
		bounds.extend([first.lat, first.lon]);

		const lines = list.map(e => `<div><b>${esc(e.time || '')}</b> ${esc(e.place)} <span style="opacity:.7">— ${esc(e.noteTitle)}</span></div>`);
		marker.bindPopup(`<div>${lines.join('')}</div>`);
		marker.on('click', () => {
			openNote.value = first.noteId;
			info.textContent = `Selected: ${first.noteTitle}. Press "Open note" to go there.`;
		});
	}

	// Draw the day's path for each note, in order of appearance.
	for (const [noteId, list] of byNote) {
		if (list.length < 2) continue;
		L.polyline(list.map(e => [e.lat, e.lon]), {
			color: noteColour.get(noteId), weight: 2, opacity: 0.6, dashArray: '4 6',
		}).addTo(map);
	}

	if (data.showPlaces) {
		for (const p of data.places) {
			L.circle([p.lat, p.lon], { radius: p.radius, color: '#888', weight: 1, fillOpacity: 0.05 })
				.addTo(map).bindTooltip(p.name);
		}
	}

	if (bounds.isValid()) {
		map.fitBounds(bounds.pad(0.2), { maxZoom: 16 });
	} else {
		map.setView([0, 0], 2);
	}

	const n = data.entries.filter(e => e.lat !== null).length;
	let text = `${n} logged place${n === 1 ? '' : 's'} in ${byNote.size} note${byNote.size === 1 ? '' : 's'}.`;
	if (data.unresolved) text += ` ${data.unresolved} entr${data.unresolved === 1 ? 'y' : 'ies'} could not be placed (unknown place name, no coordinates).`;
	info.textContent = text;

	// Leaflet needs a size recalculation once the dialog has its final size.
	setTimeout(() => map.invalidateSize(), 200);
	setTimeout(() => map.invalidateSize(), 1000);
}

(function waitForLeaflet(tries = 0) {
	if ((window as any).L) return render();
	if (tries > 100) {
		document.getElementById('mapinfo')!.textContent = 'Leaflet did not load.';
		return;
	}
	setTimeout(() => waitForLeaflet(tries + 1), 50);
})();
