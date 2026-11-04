// Runs inside the "Log place" dialog webview.
interface Place { name: string; lat: number; lon: number; radius: number }
interface Data { places: Place[]; defaultRadius: number; platform: string }


function distanceMetres(aLat: number, aLon: number, bLat: number, bLon: number): number {
	const R = 6371000;
	const toRad = (d: number) => d * Math.PI / 180;
	const dLat = toRad(bLat - aLat);
	const dLon = toRad(bLon - aLon);
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(h));
}

function fmtDist(m: number): string {
	return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

(function main() {
	const data: Data = JSON.parse(document.getElementById('placelog-data')!.textContent || '{}');
	const status = document.getElementById('status')!;
	const choice = document.getElementById('choice') as HTMLSelectElement;
	const latEl = document.getElementById('lat') as HTMLInputElement;
	const lonEl = document.getElementById('lon') as HTMLInputElement;
	const accEl = document.getElementById('accuracy') as HTMLInputElement;
	const debugEl = document.getElementById('debug')!;

	function setStatus(text: string, cls: string) {
		status.textContent = text;
		status.className = `status ${cls}`;
	}

	function rebuildChoices(pos: { lat: number; lon: number } | null) {
		const ranked = data.places.map((p, i) => ({
			p, i, d: pos ? distanceMetres(pos.lat, pos.lon, p.lat, p.lon) : NaN,
		}));
		if (pos) ranked.sort((a, b) => a.d - b.d);
		else ranked.sort((a, b) => a.p.name.localeCompare(b.p.name));

		choice.innerHTML = '';
		const auto = document.createElement('option');
		auto.value = '__auto__';
		auto.textContent = pos ? 'Automatic (nearest known place)' : 'Automatic (needs a position)';
		choice.appendChild(auto);
		for (const r of ranked) {
			const o = document.createElement('option');
			o.value = String(r.i);
			o.textContent = pos ? `${r.p.name} (${fmtDist(r.d)})` : r.p.name;
			choice.appendChild(o);
		}
		const none = document.createElement('option');
		none.value = '__none__';
		none.textContent = 'Unknown place (keep coordinates in a hidden comment)';
		choice.appendChild(none);

		if (pos && ranked.length && ranked[0].d <= ranked[0].p.radius) {
			setStatus(`You are at ${ranked[0].p.name} (${fmtDist(ranked[0].d)} from its centre, accuracy ±${Math.round(parseFloat(accEl.value) || 0)} m).`, 'ok');
		} else if (pos) {
			const near = ranked.length ? ` Nearest known place: ${ranked[0].p.name}, ${fmtDist(ranked[0].d)} away.` : '';
			setStatus(`Position found (accuracy ±${Math.round(parseFloat(accEl.value) || 0)} m), but no known place is within range.${near} Pick a place below, or name this one to save it.`, '');
		}
	}

	rebuildChoices(null);

	if (!navigator.geolocation) {
		setStatus('This Joplin build does not expose geolocation to plugins. Pick a place from the list.', 'error');
		debugEl.textContent = `platform=${data.platform}; navigator.geolocation is undefined`;
		return;
	}

	setStatus('Getting your position…', '');
	navigator.geolocation.getCurrentPosition(
		(p) => {
			latEl.value = String(p.coords.latitude);
			lonEl.value = String(p.coords.longitude);
			accEl.value = String(p.coords.accuracy);
			debugEl.textContent = `platform=${data.platform}; lat=${p.coords.latitude.toFixed(5)} lon=${p.coords.longitude.toFixed(5)} ±${Math.round(p.coords.accuracy)} m`;
			rebuildChoices({ lat: p.coords.latitude, lon: p.coords.longitude });
		},
		(err) => {
			setStatus(`Could not get a position (${err.message || 'error ' + err.code}). Pick a place from the list.`, 'error');
			debugEl.textContent = `platform=${data.platform}; geolocation error code=${err.code} message=${err.message}`;
		},
		{ enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
	);
})();
