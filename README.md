# Ball Crusher Simulator

Ein mobiles, vollständig lokales Physics-Studio für vertikale Shorts. Vanilla JavaScript, HTML5 Canvas und Web Audio, ohne Backend, kostenpflichtige APIs, externe Fonts oder Laufzeit-Abhängigkeiten.

## Lokal starten

Node.js 22 oder neuer (CI: Node.js 24). Es ist kein `npm install` notwendig.

```sh
cd /workspace/ball-crusher-factory
npm run dev
```

Den lokalen Entwicklungsserver auf Port 5173 im eigenen Browser öffnen. Für andere Arbeitsverzeichnisse zuerst in den Projektordner wechseln. Das Projekt funktioniert auch unter einem URL-Unterpfad wie `/ball-crusher-factory/`.

```sh
npm test
npm run build
node scripts/server.js --dist
```

Der Build erzeugt ausschließlich statische Dateien in `dist/`. Für den Build-Test zuerst den Entwicklungsserver auf demselben Port beenden. Bereits vorhandene Checkouts verwenden; für Entwicklung in einer isolierten Cloud-Umgebung ist kein zusätzliches Git-Worktree nötig.

## Bedienung

- Sieben Modi: Orbit, frei fliegender Hammer, Doppel-Orbit, Laser, Overdrive mit bis zu fünf schneller werdenden Hämmern Chaos mit zufälligen Impulsen, Richtungswechseln und Tempoereignissen sowie Laserflug mit zwei frei fliegenden, rotierenden Lasern.
- **Laser Flow** startet zwei pinke und mintfarbene Laser mit sechs Kugeln. Die Laser reflektieren an der Kreiswand. Alle Hammermodi haben größere Köpfe für häufigere Treffer. Im Video erscheint als Text ausschließlich die Kugelanzahl.
- Preset auswählen oder Startkugeln, Stoppziel (32–1.200), wachsende Arena, Partikel und Sound einstellen. Physikeinstellungen starten einen neuen Durchlauf.
- Pausieren, fortsetzen und neu starten. Beim Kugelziel endet die Simulation automatisch.
- Video: 720 × 1280 oder 1080 × 1920, 30 oder 60 FPS, 15–60 Sekunden. Aufnahme beginnt mit einer neuen Simulation und endet spätestens am Kugelziel. Manuelles Beenden ist möglich.
- Nach Fertigstellung über **Video herunterladen** lokal speichern. Android fragt je nach Browser nach dem Speicherort oder legt die Datei im Downloads-Ordner ab.
- **Clean View** zeigt ausschließlich das vertikale Canvas. Zweimal tippen oder Escape verlässt diese Ansicht. Wenn die Fullscreen-API fehlt, verwendet die App eine bildschirmfüllende CSS-Ansicht. Die Android-Bildschirmaufnahme ist ein unabhängiger Fallback.

## Video und Android

Ein aktueller Chrome-Browser auf Android wird empfohlen. `MediaRecorder.isTypeSupported()` bestimmt das Format: MP4 bevorzugt, andernfalls WebM. Der tatsächlich verfügbare Encoder hängt von Gerät und Browser ab. Ohne Canvas-Aufnahme/MediaRecorder bleibt die Simulation mit Clean View nutzbar.

Full HD und 60 FPS sind Zielwerte, keine Zusicherung: Codec, Hardware und Last bestimmen die erreichbare Bildrate. Bei Ruckeln 720p / 30 FPS, weniger Kugeln und deaktivierte Partikel verwenden. Das Canvas wird zur Aufnahme auf die gewählte Pixelgröße gestellt; schlägt die Encoderinitialisierung fehl, erscheint ein Fallbackhinweis. Es wird keine serverseitige Konvertierung durchgeführt.

Sound benötigt eine Nutzeraktion (Schalter, Start oder Aufnahme). Kurze synthetische Töne werden lokal erzeugt und bei aktiviertem Sound auch in die Aufnahme gemischt. Ein stummer Export benötigt keine Mikrofonfreigabe. Tab und Display während der Aufnahme aktiv halten. Beim Wechsel in den Hintergrund beendet die App die Aufnahme und pausiert, damit keine irreführenden Hintergrundframes entstehen. Videos werden im Arbeitsspeicher gesammelt; sehr große Exporte können den Gerätespeicher belasten. Dateien werden erst nach Klick auf den Download gespeichert.

## Physik und Performance

Elastische Stöße zwischen gleich schweren Kreisen, Reflexion an der Kreiswand und konstante Geschwindigkeiten ohne Schwerkraft. Die Hämmer sind angetriebene Auslöser. Nur der Hammerkopf bzw. der Laserstrahl verdoppelt Kugeln. Jeder Treffer entfernt genau eine Elternkugel und erzeugt genau zwei neue Kugeln mit unterschiedlichen IDs. Kinder erhalten 480 ms Schutzzeit. Die Kugelzahl wächst generationsweise exponentiell, bis das eingestellte Limit erreicht ist; das Wachstum über die Zeit hängt von den tatsächlichen Kontakten ab.

Ein räumliches Raster reduziert die Paarvergleiche; feste kleine Teilschritte (höchstens 1/240 s) begrenzen die Bewegung pro Kollisionsprüfung. Nach langen Frames wird die Simulationszeit begrenzt, um eine Aufholspirale zu vermeiden. Das harte Limit von 1.200 und begrenzte Partikel schützen die mobile Performance. Die Arena wächst optional sanft und bleibt vollständig im Bild. Dies ist eine plausible Echtzeitsimulation, keine wissenschaftliche Mehrkörperlösung: in sehr dichten Zuständen können kleine Überlappungen auftreten.

## Tests

`npm test` führt 15 automatisierte Tests mit dem Node-Testmodul aus:

- Exakt zwei Kinder, eindeutige IDs und keine doppelte Elternverarbeitung.
- Generationenwachstum 1 → 2 → 4 → 8 → 16 und Einhaltung des Kugellimits.
- Wandreflexion, Kugelimpuls und Energie, Trennung bei exakt überlappenden Mittelpunkten.
- Segmentabstand, echter Hammerkontakt und Schutzzeit.
- Alle sieben Modi über jeweils 20 simulierte Sekunden: Treffer, endliche Zustände, Wandgrenzen und Zählkonsistenz.
- Feste und mitwachsende Arena.
- Vergrößerte Hammerköpfe, beide Hälften der fliegenden Laser, gleichzeitige Lasertreffer und vollständige Strahlbegrenzung an der Wand.

Zusätzlich wurde Chromium mit Desktop- und mobilem Viewport geprüft: Moduswechsel, Pause, Fortsetzen, Clean View und ein abspielbarer 720 × 1280 Videoexport. Ein echter Android-Geräte-/Hardwaretest und ein 60-Sekunden-Full-HD-Export bleiben geräteabhängige Prüfungen.

## GitHub Pages veröffentlichen

Die Veröffentlichung ist vorbereitet und wird hierdurch nicht automatisch ausgeführt:

1. Projektdateien in das gewünschte GitHub-Repository übernehmen und auf `main` pushen.
2. Unter **Settings → Pages → Build and deployment → Source** die Option **GitHub Actions** auswählen.
3. Der Workflow `.github/workflows/pages.yml` führt Tests und Build aus, lädt `dist/` hoch und veröffentlicht mit dem Pages-Deploy-Job. Ein manueller Start über **Actions → Deploy GitHub Pages → Run workflow** ist ebenfalls möglich.

Bei einem anderen Standardbranch den `push.branches`-Eintrag anpassen. Es werden keine API-Schlüssel oder zusätzlichen Dienste benötigt. Für eine rein manuelle Veröffentlichung den Inhalt von `dist/` an einen statischen Hoster übertragen.
