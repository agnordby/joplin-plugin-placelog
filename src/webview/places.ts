// Runs inside the "Manage places" dialog webview. Fills coordinates of the "new place" row from GPS when asked.

(function main() {
	const btn = document.getElementById('use-current') as HTMLButtonElement | null;
	const lat = document.getElementById('new_lat') as HTMLInputElement;
	const lon = document.getElementById('new_lon') as HTMLInputElement;
	const info = document.getElementById('gps-info')!;
	if (!btn) return;
	btn.addEventListener('click', (e) => {
		e.preventDefault();
		if (!navigator.geolocation) {
			info.textContent = 'Geolocation is not available here.';
			return;
		}
		info.textContent = 'Getting position…';
		navigator.geolocation.getCurrentPosition(
			(p) => {
				lat.value = p.coords.latitude.toFixed(6);
				lon.value = p.coords.longitude.toFixed(6);
				info.textContent = `Position set (±${Math.round(p.coords.accuracy)} m).`;
			},
			(err) => { info.textContent = `Could not get a position: ${err.message || err.code}`; },
			{ enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
		);
	});
})();
