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

- Neun Modi: Ricochet (Standard), Pulsring, Orbit, frei fliegender Hammer, Doppel-Orbit, Laser, Overdrive mit bis zu fünf schneller werdenden Hämmern, Chaos mit zufälligen Impulsen, Richtungswechseln und Tempoereignissen sowie Laserflug mit zwei frei fliegenden, rotierenden Lasern.
- **Laser Flow** startet zwei pinke und mintfarbene Laser mit sechs Kugeln. Die Laser reflektieren an der Kreiswand. Alle Hammermodi haben größere Köpfe für häufigere Treffer. Im Video erscheint als Text ausschließlich die Kugelanzahl.
- Preset auswählen oder Startkugeln, Stoppziel (32–1.200), wachsende Arena, Partikel und Sound einstellen. Physikeinstellungen starten einen neuen Durchlauf.
- Pausieren, fortsetzen und neu starten. Beim Kugelziel endet die Simulation automatisch.
- Video: 720 × 1280 oder 1080 × 1920, 30 oder 60 FPS, 15–60 Sekunden. Export wiederholt den aktuellen Lauf mit derselben Seed und denselben Physikeinstellungen und endet spätestens am Kugelziel. Manuelles Beenden ist möglich.
- Nach Fertigstellung über **Video herunterladen** lokal speichern. Android fragt je nach Browser nach dem Speicherort oder legt die Datei im Downloads-Ordner ab.
- **Clean View** zeigt ausschließlich das vertikale Canvas. Zweimal tippen oder Escape verlässt diese Ansicht. Wenn die Fullscreen-API fehlt, verwendet die App eine bildschirmfüllende CSS-Ansicht. Die Android-Bildschirmaufnahme ist ein unabhängiger Fallback.

## Varianten, Wiederholung und Export

**Ricochet** ist beim ersten Öffnen und nach „Zurücksetzen“ aktiv. Das Startpreset verwendet eine Kugel. Der Laserkopf reflektiert zuerst an der Wand; der erste echte Kugeltreffer erfolgt bei etwa 0,82 Sekunden. Danach bestimmen die Simulation und Seed den Verlauf. Nur der Kopf trifft; der auslaufende Schweif ist rein visuell. Kontinuierliche Wegprüfung erkennt Treffer auch zwischen Physikschritten und nach Wandabprallern. Zwei Kinder starten mit sichtbarem Abstand und kurzem hellem Umriss.

**Pulsring** trifft nur an der expandierenden Kante. Eltern und ihre Kinder sind für den Rest derselben Welle geschützt. Nach Erreichen des Randes pausiert der Ring 0,75 Sekunden, dann dürfen die Kinder bei der nächsten Welle wieder geteilt werden.

- **Neue Variante** erzeugt eine neue Seed und startet mit den aktuellen Einstellungen.
- **Gleichen Lauf wiederholen** startet die gespeicherte aktuelle Laufkonfiguration erneut.
- Die Seed ist sichtbar und editierbar, erscheint aber nie im Video. Zum späteren Nachstellen Seed **und** Modus, Startkugeln, Kugellimit, Wachstum und Videolänge notieren. Reproduzierbarkeit gilt für dieselbe Projektversion.
- **Diesen Lauf exportieren** spielt genau diese Konfiguration von Anfang an ab. Die Dateibezeichnung enthält die Seed. Eine andere Auflösung oder 30/60 FPS würfelt den Lauf nicht neu aus.
- Vorschau und Export enden beim selben Kugelziel oder derselben Simulationsdauer. Während der Aufnahme sind Änderungen gesperrt. Änderungen an Physikeinstellungen starten einen neuen Lauf; vorhandene Videodownloads werden dadurch nicht umgeschrieben.

Feste Schritte von 1/240 s und eine eigene Seed für Effekte halten Physik und Partikel unabhängig von der Darstellungsbildrate. MediaRecorder arbeitet in Echtzeit: ausgelassene Frames, Audiolatenz und Encodierung hängen weiterhin vom Gerät ab. Bei starker Last kann die Aufnahme länger dauern als die eingestellte Simulationsdauer; 720p / 30 FPS reduziert diese Last. Es handelt sich um dieselbe simulierte Ereignisfolge, nicht um einen garantierten, bildgenauen Offline-Encoder.

## Video und Android

Ein aktueller Chrome-Browser auf Android wird empfohlen. `MediaRecorder.isTypeSupported()` bestimmt das Format: MP4 bevorzugt, andernfalls WebM. Der tatsächlich verfügbare Encoder hängt von Gerät und Browser ab. Ohne Canvas-Aufnahme/MediaRecorder bleibt die Simulation mit Clean View nutzbar.

Full HD und 60 FPS sind Zielwerte, keine Zusicherung: Codec, Hardware und Last bestimmen die erreichbare Bildrate. Bei Ruckeln 720p / 30 FPS, weniger Kugeln und deaktivierte Partikel verwenden. Das Canvas wird zur Aufnahme auf die gewählte Pixelgröße gestellt; schlägt die Encoderinitialisierung fehl, erscheint ein Fallbackhinweis. Es wird keine serverseitige Konvertierung durchgeführt.

Sound benötigt eine Nutzeraktion (Schalter, Start oder Aufnahme). Kurze synthetische Töne werden lokal erzeugt und bei aktiviertem Sound auch in die Aufnahme gemischt. Ein stummer Export benötigt keine Mikrofonfreigabe. Tab und Display während der Aufnahme aktiv halten. Beim Wechsel in den Hintergrund beendet die App die Aufnahme und pausiert, damit keine irreführenden Hintergrundframes entstehen. Videos werden im Arbeitsspeicher gesammelt; sehr große Exporte können den Gerätespeicher belasten. Dateien werden erst nach Klick auf den Download gespeichert.

## Physik und Performance

Elastische Stöße zwischen gleich schweren Kreisen, Reflexion an der Kreiswand und konstante Geschwindigkeiten ohne Schwerkraft. Die Hämmer sind angetriebene Auslöser. Nur der Hammerkopf bzw. der Laserstrahl verdoppelt Kugeln. Jeder Treffer entfernt genau eine Elternkugel und erzeugt genau zwei neue Kugeln mit unterschiedlichen IDs. Kinder erhalten 480 ms Schutzzeit; im Pulsring gilt stattdessen der Schutz bis zum Ende der jeweiligen Welle. Die Kugelzahl wächst generationsweise exponentiell, bis das eingestellte Limit erreicht ist; das Wachstum über die Zeit hängt von den tatsächlichen Kontakten ab.

Ein räumliches Raster reduziert die Paarvergleiche; feste kleine Teilschritte (höchstens 1/240 s) begrenzen die Bewegung pro Kollisionsprüfung. Nach langen Frames wird die Simulationszeit begrenzt, um eine Aufholspirale zu vermeiden. Das harte Limit von 1.200 und begrenzte Partikel schützen die mobile Performance. Die Arena wächst optional sanft und bleibt vollständig im Bild. Dies ist eine plausible Echtzeitsimulation, keine wissenschaftliche Mehrkörperlösung: in sehr dichten Zuständen können kleine Überlappungen auftreten.

## Tests

`npm test` führt 20 automatisierte Tests mit dem Node-Testmodul aus:

- Exakt zwei Kinder, eindeutige IDs und keine doppelte Elternverarbeitung.
- Generationenwachstum 1 → 2 → 4 → 8 → 16 und Einhaltung des Kugellimits.
- Wandreflexion, Kugelimpuls und Energie, Trennung bei exakt überlappenden Mittelpunkten.
- Segmentabstand, echter Hammerkontakt und Schutzzeit.
- Alle neun Modi über jeweils 20 simulierte Sekunden: Treffer, endliche Zustände, Wandgrenzen und Zählkonsistenz.
- Feste und mitwachsende Arena.
- Ricochet-Eröffnung, schnelle Kopftreffer mit und ohne Abpraller, inaktiver Schweif.
- Pulsring: Vererbung des Wellenschutzes und Teilnahme an der nächsten Welle.
- Identische Physikzustände für dieselbe Seed bei 30 und 60 FPS in allen neun Modi.
- Vergrößerte Hammerköpfe, beide Hälften der fliegenden Laser, gleichzeitige Lasertreffer und vollständige Strahlbegrenzung an der Wand.

Der optionale mobile Integrationstest `python scripts/browser-smoke.py` benötigt Python Playwright und Chromium sowie den laufenden Build-Server auf Port 5173. Er vergleicht tatsächliche Zustände von Vorschau, Wiederholung und Export und prüft Seed-Bedienung, Standardpreset und den Videoexport.

Zusätzlich wurde Chromium mit Desktop- und mobilem Viewport geprüft: Moduswechsel, Pause, Fortsetzen, Clean View und ein abspielbarer 720 × 1280 Videoexport. Ein echter Android-Geräte-/Hardwaretest und ein 60-Sekunden-Full-HD-Export bleiben geräteabhängige Prüfungen.

## GitHub Pages veröffentlichen

Die Veröffentlichung ist vorbereitet und wird hierdurch nicht automatisch ausgeführt:

1. Projektdateien in das gewünschte GitHub-Repository übernehmen und auf `main` pushen.
2. Unter **Settings → Pages → Build and deployment → Source** die Option **GitHub Actions** auswählen.
3. Der Workflow `.github/workflows/pages.yml` führt Tests und Build aus, lädt `dist/` hoch und veröffentlicht mit dem Pages-Deploy-Job. Ein manueller Start über **Actions → Deploy GitHub Pages → Run workflow** ist ebenfalls möglich.

Bei einem anderen Standardbranch den `push.branches`-Eintrag anpassen. Es werden keine API-Schlüssel oder zusätzlichen Dienste benötigt. Für eine rein manuelle Veröffentlichung den Inhalt von `dist/` an einen statischen Hoster übertragen.

## ChaosLoop ASMR Audio

Alle Sounds sind lokal mit Web Audio synthetisiert; keine externen Samples, Downloads oder Musiklizenzen. Sound ist zunächst ausgeschaltet. Auf Android zuerst **Sound-Vorschau** oder **Sound an** antippen, um den AudioContext freizugeben.

- **Bubble ASMR** (Standard): kurze weiche, abfallende Pops; Lasertreffer behalten ihren Zap-Charakter.
- **Crystal ASMR**: höhere, weich gefilterte Glasklicks.
- **Laser ASMR**: präzise Tonhöhenabfälle und kurze Bestätigungstöne.
- **Chaos Mix**: wechselnde Varianten aus den drei Klangfamilien.

Master-Lautstärke, Preset, Sound an/aus sowie Kugel/Wand-, Verdopplungs-, Laser- und Hammerkanäle werden im Browser gespeichert. Die Vorschau schaltet Sound ein. Laser- und Hammerteilung sind jeweils ein kombiniertes Ereignis mit Pop/Bestätigung, keine doppelten Simulationstrigger. Der Verdopplungsschalter steuert auch den Bestätigungston. Wenn ein Werkzeugkanal aus ist, bleibt bei aktiviertem Verdopplungskanal der normale Split-Pop.

Aufprallgeschwindigkeit beeinflusst Pegel und Tonhöhe. Kurze Ein-/Ausblendungen, Tiefpass, Kompressor mit hoher Ratio und lineare Ausgangsreserve ohne sättigende Klangverzerrung schützen vor Spitzen. Maximal zwölf Oszillatorstimmen sind aktiv; normale Kugel- und Wandkontakte dürfen nur vier davon belegen. Ereignisse werden pro Simulationszeit gedrosselt und pro Bild priorisiert. Bei großer Dichte werden schwache bzw. überschüssige Kontakte ausgelassen, damit kein Dauerrauschen entsteht. Diese Audiosortierung verändert die Physik nicht.

Lautsprecher und Export erhalten denselben begrenzten Mix. Bei aktiviertem Ton muss vor dem Export ein laufender AudioContext mit lebender Audiospur vorhanden sein; andernfalls wird die Aufnahme mit Hinweis blockiert. MP4/WebM wird nach Browserunterstützung gewählt. Chromium-Integration prüft Replay-Gleichheit, eine Audiospur im Recorder und Export-Metadaten; ein Stresstest mit 500 Ereignisanfragen pro Durchlauf prüft alle Presets auf messbares Signal, begrenzte Peaks und maximal zwölf Stimmen. `npm test` enthält zusätzlich vier Audio-Tests neben den 20 Physiktests.

Android-Bildschirmaufnahmen benötigen die Einstellung **Geräteton/Medienton** im Betriebssystem. Manche Geräte oder Browser erlauben diese Tonaufnahme nicht. Dann den integrierten Export in aktuellem Chrome verwenden. Gerätespezifische Hörqualität, Lautsprecherverzerrungen und Latenzen sind nicht automatisch garantierbar; ein echter Android-Hörtest bleibt erforderlich. Audioereignisse werden im nächsten Renderframe ausgegeben; bei stockender Darstellung können bis zu einem Frame Verzögerung und ausgelassene Kontakte auftreten.

### Korrekte Videodauer

Nach dem Stoppen werden die Container-Zeitinformationen mit der tatsächlich aufgenommenen Echtzeitdauer finalisiert. MP4 erhält korrigierte Movie-/Track-/Media-Dauern; WebM eine explizite Duration. Optionale WebM-Indizes mit durch die Änderung ungültigen Positionen werden entfernt. Die kodierten Audio-/Videodaten werden unverändert übernommen. Die Aufnahme wird ohne periodische Fragmentanforderung gestartet. Das behebt fehlende bzw. zu kurze Dauerangaben in Playern und Upload-Apps; bestehende Downloads werden nicht nachträglich verändert.

`python scripts/video-duration.py` prüft mit Playwright/Chromium und ffprobe jeweils einen MP4- und WebM-Export mit Ton über sechs Sekunden, inklusive der vom Browser und ffprobe gelesenen Dauer. Der statische Build-Server muss auf Port 5173 laufen. Zusätzlich prüfen drei Node-Tests die Headerkorrektur und Fehlerbehandlung. Ein direkter TikTok-/Android-Galerietest bleibt geräteabhängig.

Audio-Glättung: Beim Neustart werden geplante Gain-Verläufe vor einem 20-ms-Ausblenden abgebrochen. Ein kurzer Planungsvorlauf, weichere Anschläge und ein größerer Audiopuffer reduzieren Knack- und Lastspitzen. Der Ausgang arbeitet ohne WaveShaper-Sättigung.

### TikTok akzeptiert einen langen Clip als „unter 1 Sekunde“

Die Dateiendung MP4 allein reicht nicht aus: Ein generischer `video/mp4`-MediaRecorder kann VP9/Opus statt H.264/AAC wählen. Der Export fordert deshalb nur noch explizites H.264/AAC für MP4 an und lehnt gemeldetes VP9/Opus/AV1 in MP4 ab. Fehlt diese Browserfähigkeit, bleibt WebM mit deutlichem Hinweis auf eingeschränkte Upload-Kompatibilität verfügbar. Für TikTok dann Clean View mit der nativen Android-Bildschirmaufnahme und Geräteton verwenden oder das Video in einem lokalen Editor als H.264/AAC-MP4 neu kodieren. Umbenennen der Endung konvertiert nichts. Eine erfolgreiche Browser-/ffprobe-Prüfung ist kein bestätigter TikTok-Uploadtest.

`python scripts/video-duration.py 22` prüft zwei 22-Sekunden-Aufnahmen (automatische Auswahl und erzwungenes WebM), Dauer und vorhandene Tonspur. Falls MP4 verfügbar ist, müssen ffprobe zufolge H.264 und AAC vorliegen. Auf Browsern ohne diese Encoder wird der WebM-Fallback getestet.

## Escape, Color Clash und Sound Garden

Das Studio enthält zwölf Modi. Die drei neuen Modi liegen in `src/studio.js`, verwenden den vorhandenen festen 1/240-s-Takt und nutzen den bestehenden lokalen Audio- und Exportpfad. Es gibt keine neuen Laufzeitabhängigkeiten. Seed und vollständige Laufkonfiguration werden gemeinsam unter `chaosloop-run` in localStorage gespeichert und beim nächsten Öffnen wiederhergestellt. Änderungen starten eine neue Konfiguration; Wiederholung und Aufnahme verwenden den gespeicherten aktuellen Lauf. Browserdaten löschen entfernt auch diese Speicherung.

**Escape:** Die Öffnung und die Kollisionsprüfung verwenden dieselbe Winkelbreite. Bewegung wird zusätzlich nach Weglänge (maximal 1,5 Welteinheiten einschließlich Torbewegung) unterteilt. Während der vollständigen Passage muss der Kugelradius durch die Öffnung passen. Erst außerhalb von Arenaradius plus Kugelradius wird die Kugel einmalig entfernt und durch zwei innen platzierte Kinder ersetzt. Kollisionskorrekturen dürfen Kugeln nicht durch geschlossene Wandteile schieben. Ausfliegende Kugeln blenden über 0,7 s aus. Das Limit ist auf 96 begrenzt. Kugelzahl und Entkommen-Zähler bleiben im sicheren unteren Bildbereich.

**Color Clash:** Beide Teams verwenden identische Radien, Geschwindigkeiten und Energiepunktparameter. Die Energiepunkte werden an derselben Position gezeichnet, an der die Treffer geprüft werden. Die Trefferliste wird vor allen Farbänderungen erfasst. Gegenseitige gleichzeitige Treffer neutralisieren sich; geschützte Kugeln können weder angreifen noch umgefärbt werden. Weiße Umrisse und abgeblendete Energiepunkte zeigen den Schutz. Maximal 24 Kugeln pro Team. Sieger oder Zeit-Endstand werden eine Sekunde stehen gelassen; Gleichstände heißen ausdrücklich „Unentschieden“.

**Sound Garden:** Zwei Anordnungen (Kaskade und Zickzack) mit 4–12 Klangkörpern und maximal 24 Kugeln. Kontakte verwenden eine Sperrzeit von 180 ms pro Kugel/Klangkörper und werden nur nach erneutem Kontaktbeginn ausgelöst. Die C-D-E-G-A-Pentatonik, weiche Hüllkurven, begrenzte Stärke und bis zu acht Gartenstimmen ergeben ein zurückhaltendes Klangbild. Farben kennzeichnen die Tonklassen, Treffer hellen nur den jeweiligen Klangkörper auf. Stereoposition folgt der horizontalen Position. Holz und Marimba unterscheiden sich in Ausklang und Lautstärke. Klangvariation verwendet den getrennten Audiozähler; Physik hängt nicht von Audioeinstellungen ab. Neue Kugeln lassen sich optional periodisch ergänzen. Der bestehende Master-Lautstärkeregler gilt auch hier.

Drei Presets pro Modus:

| Modus | Presets |
| --- | --- |
| Escape | Erster Ausbruch / Breites Tor / Nadelöhr |
| Color Clash | Duell / Nahkampf / Zeitlupe |
| Sound Garden | Pentatonische Kaskade / Holz-Zickzack / Wachsender Garten |

Erprobte Startempfehlungen (30 s maximale Simulationsdauer, ggf. plus 1 s Abschluss):

- Escape: **Erster Ausbruch**, Seed **1**, 3 Startkugeln, 70° Öffnung, +12°/s, Tempo 150, Limit 24. Erster Ausbruch nach etwa 1,13 s; Limit mit 21 Entkommenen erreicht, Abschluss nach etwa 27,71 s.
- Color Clash: **Duell**, Seed **1**, 8 Kugeln pro Team, Tempo 95, Umlauf 2 rad/s, Reichweite 22, Schutz 0,8 s. Im gemessenen 30-s-Lauf 32 Farbwechsel und tatsächlicher Endstand 8:8. Kein geskripteter Sieger.
- Sound Garden: **Pentatonische Kaskade**, Seed **1**, 8 Klangkörper, 3 Kugeln, Schwerkraft 100, keine zusätzlichen Kugeln, Marimba, Master zunächst 55 %. Im 30-s-Lauf 25 Kontakte, erster Ton nach etwa 1,15 s. **Holz-Zickzack**, Seed 17, erzeugte mit seinen Presetwerten 52 Kontakte in 30 s.

Prüfung: `npm test` ergänzt acht gezielte Tests für Entkommen, Öffnungsränder/hohes Tempo, rotierende Öffnung, faire Farbwechsel, Schutz, Endstände, Garten-Kontaktbeginn, Recycling, Limits und Replay bei 30/60 FPS. `python scripts/studio-smoke.py` prüft auf einem 393×852-Viewport alle drei Abläufe bis zum exportierten Video, vergleicht tatsächliche Replay-Zustände, prüft Audio mit ffprobe und dekodiert das Gartensignal auf nichtstummen Inhalt. Benötigt lokal Playwright, Chromium und ffmpeg/ffprobe sowie den Build-Server.

Prüfgrenzen: Keine Hörbeurteilung auf echten Android-Lautsprechern, kein bestätigter TikTok-Upload. Im Testbrowser ohne H.264/AAC wird WebM verwendet; für TikTok gelten weiterhin die Hinweise zum nativen Bildschirmrecorder. Die Gartenklänge sind weich synthetisierte Holz-/Marimba-Anklänge, keine Instrumentensamples. Wand- und Kugelkontakte sind eine diskrete Echtzeitnäherung; hohe Last kann die Wiedergabe verlangsamen. Die Abschlusssekunde kommt zur eingestellten Laufzeit hinzu.
