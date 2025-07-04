Konzept eines Top-Down-Fußballspiels 
Steuerung (Gamepad- und Tastatureingaben)
Die Spielsteuerung erfolgt wahlweise über ein Gamepad (z.B. Xbox/PS5 Controller via Gamepad API) oder per Tastatur. Ein analoger Stick bzw. die Pfeiltasten steuern die Laufrichtung des aktuell aktiven Spielers, während Aktionstasten für Schuss, Pass und Tackling genutzt werden. Über die Gamepad API können wir Controller-Eingaben direkt im Browser erfassen. Zum Beispiel liefert der linke Analog-Stick zwei Werte axes[0] (horizontal) und axes[1] (vertikal) im Bereich -1.0 bis 1.0, wobei -1.0 und 1.0 jeweils die maximale Auslenkung in eine Richtung anzeigen (z.B. -1.0 links, +1.0 rechts auf der X-Achse)
alvaromontoro.com
. Die folgende Abbildung veranschaulicht dieses Achsen-System des Joysticks – hier ist der Stick leicht nach oben-links geneigt, was etwa den Werten axes: [-0.52, -0.78] entspricht
https://alvaromontoro.com/blog/68044/playing-with-the-gamepad-api
. Anhand dieser kontinuierlichen Werte kann die Spielerbewegung im Spiel entsprechend stufenlos gesteuert werden. Um den Controller zu verwenden, registrieren wir einen Event-Listener für "gamepadconnected", um zu erkennen, wenn ein Gamepad verbunden wird. Im Spielloop (z.B. via requestAnimationFrame) werden dann die aktuellen Eingabewerte abgefragt:
```javascript
// Gamepad-Initialisierung
window.addEventListener("gamepadconnected", (e) => {
  console.log("Gamepad verbunden:", e.gamepad.id);
});

// Eingabezustand repräsentieren
let inputState = { dx: 0, dy: 0, shoot: false, pass: false, tackle: false };

function gameLoop() {
  const gp = navigator.getGamepads()[0];         // erstes Gamepad auslesen
  if (gp) {
    // Analog-Stick: Achsen [-1,1] für X (links/rechts) und Y (oben/unten)
    inputState.dx = gp.axes[0];                  // horizontaler Stick-Wert
    inputState.dy = gp.axes[1];                  // vertikaler Stick-Wert
    // Buttons: z.B. Button 0 = Schuss, 1 = Pass, 2 = Tackling
    inputState.shoot  = gp.buttons[0].pressed;
    inputState.pass   = gp.buttons[1].pressed;
    inputState.tackle = gp.buttons[2].pressed;
  }
  // (Tastatur-Eingaben würden ähnlich in inputState einfließen)

  // Spieler bewegen basierend auf Input (einfaches Beispiel ohne Physik):
  aktiveSpieler.vx = inputState.dx * spielerMaxSpeed;
  aktiveSpieler.vy = inputState.dy * spielerMaxSpeed;
  aktiveSpieler.x += aktiveSpieler.vx;
  aktiveSpieler.y += aktiveSpieler.vy;

  // ... weitere Spiel-Updates (Ball, Kollisionsabfragen etc.) ...

  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
```
Kommentar: Im obigen Code wird kontinuierlich das erste Gamepad aus navigator.getGamepads() ausgelesen. Die Achsenwerte steuern die Geschwindigkeit (vx, vy) des aktiven Spielers. Wir multiplizieren die normierten Achsenwerte mit einer Maximalgeschwindigkeit. Ähnliche Logik würde für Tastatureingaben gelten (z.B. Pfeiltasten setzen dx/dy auf -1,0 oder 1,0). Wichtig ist auch, einen Totzonen-Threshold zu berücksichtigen – minimale Joystick-Werte werden ignoriert, damit der Spieler bei neutraler Stickstellung stillsteht
alvaromontoro.com
. Die Buttons werden hier mit Spielaktionen verknüpft (Schuss, Pass, Grätsche). In einer echten Implementierung sollte man die Button-Belegung (Input-Mapping) konfigurierbar gestalten und das Standard-Layout der Controller (z.B. Xbox vs. PlayStation) berücksichtigen.
Spielerwechsel (manuell & automatisch)
In einem Fußballspiel muss der menschliche Spieler die Kontrolle zwischen verschiedenen Feldspielern wechseln können. Dies kann manuell auf Tastendruck geschehen oder automatisch beim Verlust des Ballbesitzes:
Manueller Wechsel: Durch Drücken einer Umschalttaste (z.B. LB/L1 auf dem Gamepad oder eine Tastaturtaste) wird der aktive Spieler gewechselt. Typischerweise wird dabei auf den nächstgelegenen Spieler zum Ball umgeschaltet. Die Logik könnte alle Spieler des eigenen Teams durchgehen und denjenigen mit minimaler Distanz zum Ball wählen. Ein kurzer Indikator (z.B. kurzes Aufblinken der Markierung) zeigt den Wechsel an.
Automatischer Wechsel: Wenn der eigene Spieler den Ball verliert (z.B. an den Gegner abgegeben) oder bei einem losen Ball, kann automatisch der dem Ball am nächsten stehende eigene Spieler übernommen werden. Dadurch behält der Spieler stets die Kontrolle über den relevantesten Akteur in der Situation, ohne manuell eingreifen zu müssen. Diese Funktion verbessert den Spielfluss, erfordert aber eine zuverlässige Ballbesitz-Überwachung.
Implementierungs-Hinweis: Man kann einen Zustand ballBesitzTeam = {0,1,null} führen (0 = Team des Spielers, 1 = Gegner, null = kein Besitz). Bei Wechsel von 0 auf 1 (Ballverlust) würde eine Funktion switchToNearestPlayer(team=0, ballPos) aufgerufen, die aktiveSpieler neu setzt. Manuell könnte eine Funktion cycleControlledPlayer() den nächsten Spieler in einer internen Liste auswählen oder ebenfalls den nächsten zum Ball. Beispiel (Pseudo-Code):
```javascript
function switchToNearestPlayer(team, ball) {
  let nearest = null;
  let minDist = Infinity;
  for (let p of team.players) {
    const dist = distance(p, ball);
    if (dist < minDist) { minDist = dist; nearest = p; }
  }
  aktiveSpieler = nearest;
}
```
Hier würde distance(a,b) die euklidische Distanz berechnen. In Realität sollte man ggf. zusätzlich sicherstellen, dass der Spieler in Ballnähe auch sinnvoll für die Situation ist (nicht z.B. der Torwart, außer wenn gewollt).
Spieleraktionen
Präziser Schuss (Schießen aufs Tor)
Die Schussaktion ermöglicht es, den Ball kräftig in eine Richtung zu schießen – typischerweise aufs Tor oder in eine gewünschte Richtung. Der präzise Schuss soll steuerbar sein in Richtung und Stärke:
Richtungskontrolle: Die Schussrichtung kann durch den aktuellen Bewegungsvektor oder gezielte Controller-Eingabe vor dem Schuss bestimmt werden. Beispielsweise kann der Spieler den linken Stick in die gewünschte Schussrichtung drücken. Alternativ kann ein automatisches Zielen implementiert werden, das bei Tastendruck den Ball grob in Richtung des gegnerischen Tores fliegen lässt. Für mehr Präzision bietet sich jedoch an, die analoge Eingaberichtung auszuwerten.
Schussstärke (Kraft): Indem der Spieler die Schusstaste hält, kann eine Kraft aufgebaut werden. Ein längeres Gedrückthalten füllt eine Schusskraft-Anzeige (Power-Bar) bis zu einem Maximum. Beim Loslassen wird der Schuss mit entsprechend gespeicherter Kraft ausgeführt. So kann man präzise Flachschüsse oder harte Distanzschüsse unterscheiden. Die Aufladung erfolgt über Interpolation pro Frame – z.B. pro gameLoop-Tick wird shotPower += chargeRate * deltaTime erhöht bis zu einem Limit.
Schuss-Implementierung: Wenn der Spieler den Ball besitzt und die Schusstaste auslöst, wird dem Ball eine Geschwindigkeit in Schussrichtung verliehen und der Ball vom Spieler gelöst. Ein einfaches Modell:
```javascript
if (inputState.shoot && aktiveSpieler.hatBall) {
  // Richtung: Vektor vom Spieler zum Ziel (z.B. Tor Mitte oder analoger Stick)
  let dirX = inputState.dx;
  let dirY = inputState.dy;
  if (dirX === 0 && dirY === 0) {
    // Falls kein Stick-Ausschlag, standardmäßig zum gegnerischen Tor zielen
    dirX = (gegnTor.x - ball.x);
    dirY = (gegnTor.y - ball.y);
  }
  // Normieren des Richtungsvektors
  const len = Math.hypot(dirX, dirY);
  const normX = len > 0 ? dirX/len : 0;
  const normY = len > 0 ? dirY/len : 0;

  // Schusskraft bestimmen (z.B. basierend auf Haltezeit oder fixe Stärke)
  const shotSpeed = maxShotSpeed * aktuellerSchussPower; 
  ball.vx = normX * shotSpeed;
  ball.vy = normY * shotSpeed;
  aktiveSpieler.hatBall = false;
  ball.freierBall = true;  // Ball ist nun frei bewegt sich
  aktuellerSchussPower = 0; // Power-Bar zurücksetzen
}
```
Kommentar: Hier wird, falls kein expliziter Stickinput erfolgt, als Default Richtung zum gegnerischen Tor genommen. aktuellerSchussPower würde separat hochgezählt werden, während die Schusstaste gedrückt ist, und kann z.B. von 0 bis 1 normiert sein. maxShotSpeed definiert die maximale Ballgeschwindigkeit. Nach dem Schuss fliegt der Ball mit Anfangsgeschwindigkeit (und könnte durch Luftwiderstand oder Reibung langsam abgebremst werden). Für präzise Ergebnisse kann man eine Ballphysik mit Reibung implementieren, damit der Ball realistisch rollt/ausklingt.
Zielgerichteter Pass (Abspiel zum Mitspieler)
Beim Passspiel soll der Ball zielgerichtet zu einem Mitspieler gespielt werden. Im Gegensatz zum Schuss (der meist frei in Richtung Tor geht) ist der Pass idealerweise adressiert an einen bestimmten Teamkollegen:
Empfängerauswahl: Die einfachste Variante ist, den Pass in die aktuelle Blick-/Laufrichtung des aktiven Spielers auszuführen. Befindet sich ein Mitspieler ungefähr in dieser Richtung, wird der Ball zu ihm gespielt. Alternativ kann man den rechten Analog-Stick zur Auswahl verwenden oder das System automatisch den nächstliegenden freien Mitspieler anspielen lassen. Eine automatische Auswahl könnte z.B. durch Bewerten aller Teamkollegen erfolgen (Winkel zur gewünschten Richtung, Distanz, Gegner-Abstand) und denjenigen mit bestem Score auswählen.
Passausführung: Ist der Empfänger bestimmt, wird die Ballgeschwindigkeit so festgelegt, dass der Ball den Mitspieler erreicht. Hier kann man abhängig von Distanz und gewünschtem Pass-Typ (Kurzpass vs. Steilpass) die Stärke variieren. Bei flachen Kurzpässen eventuell weniger Kraft, bei langen Pässen oder Seitenwechseln mehr. Gegebenenfalls wird der Ball leicht vor den Mitspieler gespielt (in seinen Laufweg), um den Spielfluss zu fördern.
Pass-Implementierung: Wenn die Passtaste gedrückt wird, etwa so:
```javascript
if (inputState.pass && aktiveSpieler.hatBall) {
  // Mitspieler in Passrichtung finden
  let targetPlayer = findeMitspielerInRichtung(aktiveSpieler, inputState.dx, inputState.dy);
  if (!targetPlayer) {
    targetPlayer = findeNächstenFreienMitspieler(aktiveSpieler);
  }
  if (targetPlayer) {
    // Richtung vom aktiven Spieler zum Zielspieler
    const dirX = targetPlayer.x - ball.x;
    const dirY = targetPlayer.y - ball.y;
    const dist  = Math.hypot(dirX, dirY);
    const normX = dirX / dist;
    const normY = dirY / dist;
    // Passstärke je nach Distanz (z.B. so dass Ball beim Empfänger ankommt)
    const passSpeed = calcPassSpeedForDistance(dist);
    ball.vx = normX * passSpeed;
    ball.vy = normY * passSpeed;
    aktiveSpieler.hatBall = false;
    ball.freierBall = true;
    // Optional: zukünftiger Ballbesitz vormerken, sodass targetPlayer den Ball annimmt, wenn erreicht
    ball.angepeilterEmpfaenger = targetPlayer;
  }
}
```
In dieser Pseudocode-Logik sucht findeMitspielerInRichtung zunächst nach einem Mitspieler innerhalb eines bestimmten Winkels der Eingaberichtung. Wenn keiner gefunden wird, könnte findeNächstenFreienMitspieler z.B. den dem Spieler am nächsten stehenden freien Mitspieler wählen (als Fallback). calcPassSpeedForDistance(dist) berechnet eine Geschwindigkeit, die auf die Distanz abgestimmt ist – eventuell linear skaliert oder anhand von Tests justiert. Der Ball erhält dann einen Velocity-Vektor in Richtung des Empfängers und wird freigegeben. Idealerweise sollte man Abfangen durch Gegner berücksichtigen: Während der Ball unterwegs ist, könnten Gegner dazwischengehen. Dies erfordert Kollisionserkennung zwischen Ball und gegnerischen Spielern entlang der Flugbahn.
Kontextsensitives Tackling & Grätsche
Die Verteidigungsaktion (Tackling) wird mit einer Taste ausgelöst und soll kontextsensitiv entweder ein stehendes Tackling (Ballenabnahme im Laufduell) oder eine Grätsche (gleitendes Tackling) ausführen – abhängig von Abstand und Situation:
Stehendes Tackling: Befindet sich der aktive Spieler sehr nah am ballführenden Gegner (im Kampf um den Ball), führt ein Tastendruck zu einem direkten Tackling-Versuch. Hierbei versucht der Spieler, dem Gegner den Ball abzuluchsen, ohne zu Boden zu gehen. Implementierungstechnisch könnte man prüfen, ob der Abstand zum Ball bzw. Gegner < Tackling-Reichweite ist. Ist das der Fall, wechselt Ballbesitz sofort (wenn erfolgreich) oder es entsteht ein Zweikampf (z.B. 50/50-Chance, Foul etc., je nach Spielmechanik).
Grätsche: Ist der Gegner etwas weiter entfernt oder bereits an unserem Spieler vorbei, soll die gleiche Taste eine Grätsche auslösen. Bei einer Grätsche legt sich der Spieler hin und schlittert ein Stück nach vorn. Wir können dies simulieren, indem der Spieler einen Slide-Zustand bekommt und für kurze Zeit mit erhöhter Geschwindigkeit in Blickrichtung bewegt wird, während seine Kollisionsbox flach am Boden liegt. Trifft er während dieser Bewegung den Ball oder den Gegner, kann entweder der Ball erobert werden (bei Ballberührung) oder ein Foul gepfiffen werden (bei Gegnerberührung ohne Ball).
Tackling-Implementierung: Pseudocode für die Unterscheidung:
```javascript
if (inputState.tackle && !aktiveSpieler.hatBall) {  // Tackling nur, wenn Spieler dem Ball hinterherjagt
    const gegnerMitBall = findeGegnerMitBall();
    if (gegnerMitBall) {
        const dist = distance(aktiveSpieler, gegnerMitBall);
        if (dist < tackleRadius) {
            // Stehendes Tackling
            versucheBallZuStehlen(aktiveSpieler, gegnerMitBall);
        } else if (dist < slideRadius) {
            // Grätsche ausführen
            aktiveSpieler.status = 'grätsche';
            aktiveSpieler.slideTimer = slideDuration;
            // Setze Grätsch-Geschwindigkeit in Richtung Gegner/Ball
            const dirX = gegnerMitBall.x - aktiveSpieler.x;
            const dirY = gegnerMitBall.y - aktiveSpieler.y;
            const norm = 1/Math.hypot(dirX, dirY);
            aktiveSpieler.vx = dirX * norm * slideSpeed;
            aktiveSpieler.vy = dirY * norm * slideSpeed;
        }
    }
}
```
Hier werden zwei Distanzen verglichen: tackleRadius (sehr klein, z.B. 1-2m im Spielmaßstab) und slideRadius (etwas größer, z.B. 3-4m). Innerhalb der kleinen Distanz wird direkt versucheBallZuStehlen aufgerufen – diese Funktion könnte z.B. den Ballbesitz an aktiveSpieler übertragen und den Gegner verlangsamen. Im mittleren Abstand wird status = 'grätsche' gesetzt, was im Bewegungs-Update dafür sorgt, dass der Spieler eine Rutschbewegung macht. Man würde zudem eine Animation für die Grätsche abspielen. Während slideTimer läuft, ignoriert man normale Steuerung für diesen Spieler. Trifft der rutschende Spieler auf den Ball, kann man Ballbesitz wechseln; trifft er nur den Gegner, könnte ein Foul registriert werden. Nach Ablauf der Grätschdauer (slideDuration) steht der Spieler wieder auf (Status normal, vx/vy = 0). Kontextsensitiv bedeutet auch: Befindet sich der Spieler von vorne am Gegner, ist ein stehendes Tackling wahrscheinlicher erfolgreich; kommt er von der Seite/hinten, sollte eher die Grätsche eingesetzt werden. Solche Feinheiten können über zusätzliche Bedingungen oder Winkelberechnungen einbezogen werden.
Dynamische Spielerbewegungs-Zonen und Formation
Damit nicht alle KI-Mitspieler ungeordnet dem Ball hinterherlaufen, bewegen sie sich innerhalb dynamisch begrenzter Zonen, die sich je nach Spielsituation verschieben. Das Konzept orientiert sich an realen Formationen und Raumaufteilungen:
Formation & Grundpositionen: Jedem KI-Spieler wird eine Grundposition auf dem Feld gemäß der gewählten Formation (z.B. 4-4-2, 3-5-2 etc.) zugewiesen. Diese Position dient als Anker bzw. Mittelpunkt seiner Zone. Beispielsweise hat ein linker Verteidiger eine Grundposition links hinten.
Zonenbegrenzung: Um die Formation zu halten, hat jeder Spieler eine virtuelle Bewegungszone um seine Grundposition – etwa ein rechteckiger oder kreisförmiger Bereich. Innerhalb dieser Zone kann er sich frei bewegen, verlässt sie aber ungern. Die Zone kann sich situativ verschieben, bleibt aber begrenzt, damit die Formation nicht auseinanderfällt. Beispiel: Wenn der Ball auf der rechten Spielfeldseite ist, könnte die gesamte Mannschaft etwas nach rechts schieben (die Zonen wandern mit), aber die linken Spieler bleiben immer noch ungefähr auf ihrer linken Hälfte, nur leicht rübergezogen.
Kontextabhängige Verschiebung: Abhängig von Ballnähe, Spielphase (Ballbesitz vs. Verteidigung) und Gegnerposition passen die Spieler ihre Zielposition an. In Ballbesitz (Offensive) dehnen die Spieler die Formation vielleicht etwas in die Tiefe (Stürmer rücken vor, Abwehr hält Abstand). In Defensive ziehen sie sich kompakt zurück in die eigene Hälfte. Ballnähe: Ist ein Spieler sehr nah am Ball (z.B. <5m), darf er seine Zone auch verlassen, um aktiv ins Geschehen einzugreifen (Pressing). Die anderen halten derweil ihre Positionen, um anspielbar zu bleiben oder Räume abzudecken
reddit.com
. Sobald der Ball weiter weg ist, kehren Spieler in ihre Zone zurück bzw. nehmen ihre Grundposition ein.
Um dies umzusetzen, kann man einen zweistufigen Ansatz wählen:
Teamweite Formation berechnen: Eine Team-KI bestimmt je nach Ballposition und Ballbesitz eine Verschiebung der Formation. Beispielsweise: Bei eigenem Ballbesitz hoch in der gegnerischen Hälfte könnten die Verteidiger ihre Grundposition um 20% nach vorne verlagern (Team rückt auf). Bei gegnerischem Ballbesitz in unserer Hälfte ziehen sich alle um X Meter zurück zum eigenen Tor. Seitliche Verschiebung: Liegt der Ball auf dem linken Flügel, kann die Formation um ein paar Meter nach links rotieren/verschoben werden, sodass die ballferne Seite einrückt.
Individuelles Verhalten innerhalb der Zone: Jeder Spieler erhält aus der Team-Formation eine Zielposition. Diese ergibt sich aus seiner Grundposition plus der teamweiten Verschiebung und ggf. kleinen individuellen Anpassungen. Der Spieler bewegt sich mit einer bestimmten Geschwindigkeit in Richtung dieser Zielkoordinate, sofern er nicht gerade eine andere wichtige Aufgabe hat (z.B. Ball erobern oder angespielt werden). Zusätzlich fügt man verhaltensbasierte Regeln hinzu: Ist ein Gegner in unmittelbarer Nähe, kann ein Verteidiger seine Position verlassen, um Druck auszuüben (solange kein anderer Mitspieler das tut, um Doppelungen zu vermeiden). Prioritäten helfen hier: Die Formationstreue hat hohe Priorität, wenn kein akuter Anlass besteht, aber Ballgewinn oder Gegenspieler abdecken hat höhere Priorität, wenn nötig
gamedev.net
.
Ein exemplarischer Update-Schritt für einen KI-Mitspieler:
```javascript
for (let player of team.players) {
  // Ziel aus Formation (Grundposition + Teamverschiebung)
  const basePos = player.formationPos; 
  let targetX = basePos.x + formationOffset.x;
  let targetY = basePos.y + formationOffset.y;
  // Anpassung: falls Ball in Nähe seiner Zone, leicht in Richtung Ball ziehen
  const ballDx = ball.x - basePos.x;
  const ballDy = ball.y - basePos.y;
  if (Math.hypot(ballDx, ballDy) < 200) { // Ball relativ nah an seiner Zone
    targetX += ballDx * 0.2;  // rücke 20% des Abstands zum Ball vor
    targetY += ballDy * 0.2;
  }
  // Bewegung des Spielers Richtung Zielposition (wenn er nicht Ballführender ist etc.)
  if (!player.hatBall) {
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    // Nur bewegen, wenn deutlich von Ziel entfernt, um Oszillieren zu vermeiden
    if (Math.hypot(dx, dy) > 5) {
      player.x += dx * 0.05;  // 5% des Abstands pro Frame zurücklegen (glatt Interpolation)
      player.y += dy * 0.05;
    }
  }
}
```
Kommentar: Hier wird formationOffset vom Team-KI bestimmt (z.B. formationOffset.x könnte +20 bedeuten, dass alle etwas nach rechts verschoben sind). Die Faktoren und Distanzen im Beispiel sind abzuschätzen und zu tunen (200 könnte z.B. ~ in Pixeln oder Einheiten einer Spielfeldhälfte sein). Wichtig: Diese Logik sorgt dafür, dass Spieler allmählich zu ihren Soll-Positionen zurückkehren und nicht chaotisch dem Ball nachlaufen. Formationstreue macht das Spiel übersichtlicher. In echten Spielen wie FIFA ist die Positionierung stark von der Formation getrieben – jeder KI-Spieler hat eine bestimmte Position, die er basierend auf Formation und Ballposition hält oder wieder einnimmt, selbst wenn der menschliche Spieler seinen eigenen Spieler aus der Position zieht
reddit.com
. So bleibt die Grundordnung erhalten.
Aufgabenliste (Schritt-für-Schritt Integration)
Die folgende Aufgabenliste zeigt in sinnvoller Reihenfolge, wie die oben genannten Funktionen in ein bestehendes HTML5 Canvas/JavaScript-Projekt integriert werden können:
Grundgerüst & Spielfeldaufbau: Canvas initialisieren, Spielfeld zeichnen (evtl. ein einfaches grünes Feld mit Markierungen), Spielobjekte definieren (Spieler-Objekte mit Eigenschaften wie Position, Geschwindigkeit, Status; Ball-Objekt mit Position, Velocity).
Game Loop einrichten: Eine update() Funktion via requestAnimationFrame, die Spielzustand aktualisiert und dann das Feld und alle Objekte rendert. Hier bereits sicherstellen, dass feste Zeitschritte oder Delta-Zeit verwendet werden, um Frame-Unterschiede auszugleichen.
Gamepad- und Tastatureingaben anbinden: Verwendung der Gamepad API (window.addEventListener("gamepadconnected", ...)) sowie keydown/keyup Events für Tastatur. Einrichtung einer Input-State-Struktur, wie oben gezeigt, um analoge Stickwerte und Button-Drücke zu speichern. Sicherstellen, dass bei nicht verbundenem Gamepad die Tastatursteuerung greift.
Spielerbewegung umsetzen: Im Update-Step den aktiven Spieler basierend auf dem Input bewegen. Kollision mit Feldrand berücksichtigen (Spieler darf Feld nicht verlassen). Optional: Animation der Spielfigur in Bewegungsrichtung (z.B. Laufrichtung ändern).
Aktiven Spieler wechseln: Mechanik implementieren, um via Tastendruck den aktiveSpieler zu ändern (Rotation durch ein Array von Spielern, oder Auswahl des nächstgelegenen zum Ball). Zusätzlich Logik für automatischen Wechsel bei Ballverlust: Überwachen, ob ballBesitzTeam wechselt, dann switchToNearestPlayer(Team) aufrufen.
Ball-Besitz und -Bewegung: Logik, dass der Ball am Fuß des Spielers bleibt, solange spieler.hatBall = true (Position des Balls an Spielerposition binden oder leicht vor dem Spieler halten). Bei Schuss/Pass den Ball vom Spieler lösen (hatBall = false) und mit gegebener ball.vx, ball.vy frei bewegen. Kollision zwischen Ball und Spielern implementieren, sodass Ball aufgenommen werden kann (Ballbesitz wechselt, hatBall true beim aufnehmenden Spieler, Ball wird an dessen Fuß positioniert).
Schuss-Mechanik integrieren: Schusstaste auswerten – bei Druck beginnen, aktuellerSchussPower aufzuladen (z.B. in update() solange Taste gehalten wird, bis Maximum). Bei Loslassen ball.vx, vy gemäß Power und Richtung setzen. Ballflug und ggf. Torerkennung (Kollision Ball mit Torraum/Tornetz) ergänzen.
Pass-Mechanik integrieren: Passtaste auswerten – Zielspieler bestimmen (zunächst einfach: nächster in Blickrichtung), Ball entsprechend spielen. Empfangende Spieler sollten den Ball annehmen können: d.h. erkennen, wenn Ball in Reichweite kommt, dann hatBall=true setzen und Ballgeschwindigkeit nullen (Ball „festmachen“). Evtl. einen Passindikator anzeigen (siehe Visualisierung).
Tackling/Grätsche hinzufügen: Tackletaste behandeln – je nach Distanz entweder Gegner den Ball abnehmen (Ballbesitz umschalten) oder Grätsche: Spieler in Rutschmodus versetzen und Bewegung ausführen. Kollision während Grätsche prüfen (Ball oder Gegner getroffen) und Konsequenzen (Ball erobert oder Foul = z.B. Freistoß, was hier aber vllt. zu komplex ist für den Prototyp).
KI-Bewegung & Formation: Für alle nicht vom Spieler gesteuerten Figuren die Bewegungslogik gemäß Formation/Zonen implementieren. Zunächst einfache Variante: Spieler bewegen sich zu ihren Grundpositionen (Formation halten). Dann schrittweise verfeinern: Berücksichtigung von Ballnähe (Pressing) und Teamphasen (Angriff/Verteidigung Verschiebung). Diese KI kann zunächst rudimentär sein, um überhaupt ein 11vs11 Verhalten zu haben.
Performance-Optimierungen: Falls die Anzahl Objekte hoch ist (22 Spieler + Ball), sicherstellen, dass die Schleifen effizient sind (z.B. einfache Distanzberechnungen, keine unnötig schweren Kollisionschecks). Verwendung von Canvas: nur das neu zeichnen, was nötig ist (ganzer Frame neu zeichnen ist i.d.R. ok, aber auf Effizienz achten). Physikupdates mit fixem Zeitstep für Konsistenz, Render-Interpolation falls Frame-Time schwankt.
Feinschliff & Interpolation: Animations-Details verbessern: z.B. Spielerbewegungen glätten (Inertiasimulation – abrupten Richtungswechsel ggf. mit kurzem Ausrutschen animieren oder mittels Interpolation Geschwindigkeit nicht instant wechseln lassen). Schuss- und Passanimationen hinzufügen (Schussbein ausholen, etc., kann aber auch rein optisch sein). Interpolation verwenden, um abrupte Änderungen sanfter zu gestalten (z.B. lerp für Richtungswechsel der Spielerfigur, Kamera-Verfolgung des Balls etc.).
Visualisierungen & User-Feedback: Anzeigen implementieren, die dem Spieler helfen: Aktuellen Spieler markieren (farbiger Ring oder Pfeil über dem Spieler), Pass-Ziel anzeigen (Linie oder Pfeil zum anvisierten Mitspieler), Schusskraft als Leiste über dem Spieler oder am HUD, Ballindikator, wer Ball hat (vielleicht ein kleiner Kreis am Fuß des ballführenden Spielers). Ebenso Replay- oder Highlight-Funktionen bei Toren optional.
Testen und Balancieren: Alle Funktionen im Zusammenspiel testen. Parameter anpassen (Spieler-Geschwindigkeiten, Schussstärken, KI-Reaktionszeiten etc.), bis sich ein realistisches und spielbares Gefühl einstellt.
Diese Aufgabenliste ergibt eine mögliche Reihenfolge für die schrittweise Entwicklung. Selbstverständlich können einige Schritte (z.B. 7,8,9 für die verschiedenen Aktionen) auch parallel entwickelt und dann integriert werden. Wichtig ist, zunächst die Grundlage (Bewegung, Ballphysik, Input) stabil hinzubekommen, bevor die komplexere KI und Feinheiten hinzukommen.
Performance und Animation (Interpolation)
Gerade bei einem actionreichen Spiel auf Canvas müssen Performance und flüssige Darstellung beachtet werden:
Update-Frequenz & Timing: Verwende requestAnimationFrame für den Game Loop, da dieser synchron zur Bildschirm-Refresh-Rate läuft (meist 60 FPS) und so für flüssige Bewegungen sorgt. In jeder Frame-Update sollte die Spielzeit gemessen werden (Delta-Time zwischen Frames), um bewegungsabhängige Berechnungen zeitbasiert zu machen. Beispielsweise bewegt man den Ball um ball.vx * dt pro Frame, damit das Spiel bei 30 FPS genauso läuft wie bei 60 FPS.
Optimierung der Logik: Bei 22 Spielern + Ball können pro Frame viele Berechnungen anfallen. Achte darauf, Algorithmen in O(n) oder O(n log n) zu halten. Z.B. Kollisionsprüfungen: anstatt jeden Spieler mit jedem zu prüfen (O(n^2)), reicht es hier evtl., nur Ball mit Spielern zu checken (O(n)). Für Tackling reicht es, den aktiven Spieler mit Ballträger zu checken, nicht alle. Nutze einfache geometrische Berechnungen (Abstände, Bounding-Box) bevor teuerere Berechnungen erfolgen.
Zeichnen optimieren: Das Rendering auf Canvas kann optimiert werden, indem z.B. Sprites für Spieler vorab geladen werden und dann nur noch mit drawImage gerendert. Komplexe Zeichnungen (z.B. Schatten, Lichteffekte) minimieren. Wenn möglich, statische Elemente (Spielfeld, Tore) als Hintergrund nur einmal zeichnen oder auf einen Offscreen-Canvas rendern und dann jedes Frame blittten, statt immer neu zu zeichnen.
Interpolation und weiche Animationen: Um ruckartige Bewegungen zu vermeiden, können Werte linear interpoliert werden. Beispielsweise kann man den Richtungswechsel eines Spielers smooth gestalten, indem die Änderung der Geschwindigkeit nicht instant passiert. Im Code könnte eine einfache lineare Interpolation (LERP) genutzt werden:
```javascript
// Zwischen aktueller Geschwindigkeit und Zielgeschwindigkeit interpolieren
const smooth = 0.2; // Interpolationsfaktor 0.0-1.0
player.vx = player.vx + (desiredVx - player.vx) * smooth;
player.vy = player.vy + (desiredVy - player.vy) * smooth;
```
Dadurch folgt der Spielerinput mit einem Hauch Verzögerung, was realistischere Beschleunigungs- und Abbremsvorgänge simuliert. Ähnlich kann man die Spielerrotation (Blickrichtung) anpassen: statt sofort in neue Richtung zu springen, inkrementell drehen.
Schusskraft-Anzeige interpolieren: Die Power-Bar für den Schuss wird pro Frame stufenlos erhöht (siehe oben), was eine Form von interpolation über die Zeit darstellt. Wichtig ist, beim Loslassen eventuell die letzte Teilsekunde mit einzuberechnen, damit kein Eingabeverzögerungsgefühl entsteht.
Netzwerk-Interpolation (falls Multiplayer geplant): Für ein reines Singleplayer-gegen-KI Spiel nicht relevant, aber erwähnenswert: Wenn man Online-Multiplayer hätte, müsste man Positionsdaten extrapolieren/interpolieren, um Lags zu kaschieren. In unserem Kontext genügt die lokale Interpolation zur optischen Glättung.
Zusammenfassend sorgen durchdachte Interpolationen und ein auf Performance getrimmter Game-Loop dafür, dass das Spielerlebnis flüssig wirkt und auf verschiedenen Geräten konsistent läuft. Insbesondere die Kombination aus fester Logikrate (z.B. 60 Updates pro Sekunde) und weicher Interpolation in Darstellung/Animation ist ein gängiges Muster, um Responsiveness und Stabilität zu vereinen.
Visualisierungen und UI-Feedback
Um dem Spieler wichtige Informationen visuell zu vermitteln, sind einige grafische Indikatoren und Effekte hilfreich:
Aktiver Spieler Markierung: Der vom Spieler gesteuerte Charakter sollte deutlich hervorgehoben sein. Üblich ist ein farbiger Ring oder Pfeil über/unter dem Spieler. Dies kann per Canvas gezeichnet werden, z.B. ein Kreis um den Spieler:
```javascript
ctx.strokeStyle = "yellow";
ctx.beginPath();
ctx.arc(aktiveSpieler.x, aktiveSpieler.y, 15, 0, 2*Math.PI);
ctx.stroke();
```
Dadurch erhält der aktive Spieler eine gelbe Umrandung. Alternativ ein kleiner Pfeil über dem Kopf oder ein schwebendes Namensschild.
Pass-Zielindikator: Wenn die Passtaste gedrückt wird (und evtl. gehalten, falls man Richtung auswählt), kann ein Indikator für den anvisierten Mitspieler erscheinen. Das könnte ein zweiter farbiger Ring um den potenziellen Empfänger sein oder eine Linie/Passpfeil vom Passgeber zum Empfänger. Eine Linie könnte man mit ctx.moveTo(start.x, start.y) und ctx.lineTo(target.x, target.y) zeichnen, ggf. gestrichelt, um einen geplanten Pass zu symbolisieren. So erkennt der Spieler, wohin der Ball gespielt wird, bevor er die Taste loslässt. Wenn kein konkreter Empfänger, aber eine Richtung anvisiert wird, könnte stattdessen ein Zielkreis auf dem Boden in dieser Richtung gezeichnet werden (der Punkt, an dem der Ball bei vollem Pass landen würde).
Schusskraft-Leiste: Bei aufgeladenen Schüssen sollte der Spieler eine visuelle Rückmeldung der Schussstärke erhalten. Eine einfache Implementierung: am unteren Bildschirmrand oder über dem aktiven Spieler eine kleine Leiste, die sich füllt. Beispielsweise ein 100px breites, 10px hohes Rechteck, das von grün zu rot vollläuft. Zeichnung via ctx.fillRect(x,y, width*power, height) wobei power 0..1 ist. Alternativ Farbumschlag oder vibrierender Controller bei max. Power (Gamepad API unterstützt Vibrationsfeedback auf manchen Geräten).
Ball-Indikatoren: Wenn der Ball frei ist (nicht im Besitz), könnte man einen dezenten Glanz oder Schatten am Ball zeichnen, um Aufmerksamkeit zu erregen. Auch ein kleiner Kreis unter dem Ball (Ballschatten) hilft bei der Orientierung in Top-Down Ansicht, wo der Ball genau ist.
Zusätzliche Effekte: Bei wichtigen Ereignissen (Tor, Foul) können kurze visuelle Effekte das Feedback geben: z.B. Tor: blinkendes Torrahmen oder Partikelkonfetti; Foul: rotes Aufleuchten des gefoulten Spielers oder ein Symbol (Pfiff). Diese gehen über die Grundfunktion hinaus, steigern aber den polish.
HUD-Anzeigen: Auch wenn nicht direkt gefragt, üblich sind Spielstandsanzeigen, Timer, evtl. Radar/Minikarte. In einem Top-Down könnten alle Spieler sichtbar sein, so Radar nicht zwingend nötig. Aber Score und Zeit sollten z.B. oben angezeigt werden.
Bei allen Visualisierungen ist darauf zu achten, dass sie klar erkennbar, aber nicht störend sind. Die Markierung des aktiven Spielers und eines Passziels sollten z.B. eine auffällige Farbe haben, die sich vom Spielfeld abhebt (z.B. gelb oder orange, wenn das Feld grün ist). Transparenz kann genutzt werden, damit Indikatoren nicht komplett die Sicht verdecken (z.B. halbtransparenter Zielkreis). Beispiel: Wenn ein Pass anvisiert wird, könnte der Empfänger einen blinkenden Kreis bekommen und zugleich ein dünner Pfeil den Weg zeigen. Sobald der Pass ausgeführt ist, verschwindet der Pfeil. Ähnlich bleibt der aktive Spieler immer markiert. Solche Feedback-Elemente erhöhen die Spielkontrolle des Nutzers.
Fazit: Dieses Konzept bietet einen umfassenden Überblick über die Entwicklung eines Top-Down-Fußballspiels. Von der Eingabesteuerung (Gamepad/Keyboard) über Spielmechaniken (Schuss, Pass, Tackling) bis hin zur KI-Positionierung und Visualisierung wurden alle Kernaspekte betrachtet. Mit den bereitgestellten Codebeispielen und Kommentaren kann ein Entwickler die wichtigsten Funktionen Schritt für Schritt in ein bestehendes JS/Canvas-Projekt integrieren. Wichtig ist, zunächst die grundlegenden Interaktionen und die Spiellogik stabil umzusetzen, um darauf aufbauend die Tiefe (KI, Animationen, Feintuning) hinzufügen zu können. Viel Erfolg bei der Umsetzung!
Quellenangaben

Playing with the Gamepad API

https://alvaromontoro.com/blog/68044/playing-with-the-gamepad-api

Playing with the Gamepad API

https://alvaromontoro.com/blog/68044/playing-with-the-gamepad-api

AI positioning in sports games (like FIFA) : r/howdidtheycodeit

https://www.reddit.com/r/howdidtheycodeit/comments/vkjoo9/ai_positioning_in_sports_games_like_fifa/

Soccer AI - Artificial Intelligence - GameDev.net

## TODO
- Grundgerüst und Spielfeld aufbauen
- Game Loop mit Input verknüpfen
- Spielerwechsel (manuell/automatisch) implementieren
- Ballbesitz, Schuss- und Passlogik
- Tackling und Grätsche unterscheiden
- KI-Spielerbewegung und Formation
