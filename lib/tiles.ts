// Basemap for every Leaflet map on the site.
// OpenStreetMap's own tile server: free, no key, allowed for light use from a site like this as long as the
// credit stays on the map (https://operations.osmfoundation.org/policies/tiles/). CARTO's free basemaps started
// answering every request with an "API key required" tile in October 2026, which is why we moved off them.
// The `rr-tiles` class mutes the colours to sit on the paper palette (see app/globals.css).
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
export const TILE_OPTIONS = { attribution: TILE_ATTRIBUTION, maxZoom: 19, className: 'rr-tiles' }
