PoTB Weather 4.0.7

Offline-first Trail Companion.

Wichtig:
- Für GPS + Service Worker/PWA über HTTPS bereitstellen (z. B. GitHub Pages).
- Die einzelne HTML-Datei kann ohne PWA-Service-Worker getestet werden.
- Standortaktualisierung lädt keine Wetterdaten.
- Wetter/Radar werden nur über den Wetter-Button aktualisiert.
- Route: Grau = abgeschlossen, Gelb = aktuelle Etappe, Blau = noch zu gehen.
- Schutzhütten/Wasserpunkte werden lokal gespeichert.
- Normale betrachtete Kartenkacheln werden begrenzt zwischengespeichert (bis 500 Kacheln); kein Massendownload.
- Wetterdaten werden auf die nächsten 12 Stunden ausgewertet und mit kleinem Datenbedarf abgerufen.

- Route abgeschlossen: sehr dunkles Grau (#18191b).
- Auf Touch-Geräten: ein Finger scrollt die Seite, Kartenbewegung über Zwei-Finger-Geste; Zoom bleibt aktiv.

- Overpass: private.coffee → VK Maps → overpass-api.de als Fallback.
- Overpass-Abfragen erfolgen per GET und haben pro Server 18 s Timeout.
- Bei Fehlern bleiben bereits lokal gespeicherte Hütten/Wasserpunkte erhalten.

- Wasseranzeige standardmäßig: als Trinkwasser kartiert, robust gefiltert, maximal 1 km von der GPX-Route.
- Sonstige/unbestätigte Wasserquellen standardmäßig ausgeblendet.
- Eigene Wasserbestätigungen werden offline mit GPS-Koordinate, Zeit und GPS-Genauigkeit gespeichert.
- Eigene Bestätigungen sind bewusst noch keiner OSM-Wasserstelle automatisch zugeordnet.

- Neue OSM-Filter: bewirtschaftete Hütten, Guesthouses, Supermarkt/Lebensmittelladen, Kioske, Cafés.
- Service-POIs standardmäßig ausgeblendet, eigener Routenradius standardmäßig 2 km.
- shop=convenience wird zusammen mit shop=supermarket als Lebensmittelversorgung geführt.
- Beim Wetterupdate wird im PWA-Modus der neueste RainViewer-Frame für Route + 50 km auf nativer Radar-Zoomstufe 7 vorgeladen.
- Kein automatischer OpenTopoMap/OSM-Komplettdownload Route + 5 km: die verwendeten öffentlichen Raster-Kachelserver erlauben kein Bulk-Prefetching.

- Lange Funktions-/Hinweistexte sind standardmäßig eingeklappt.
- Hinweise werden über kompakte ?-Bereiche per Klick geöffnet; dadurch mobil besser als Hover-Tooltips.
