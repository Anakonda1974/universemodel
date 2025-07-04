Design-Dokument: KI-gesteuertes 2D-Fußballsimulationsspiel
Projektziel und Vision
## Aktueller Fortschritt
- [x] Grundlegende Spielzustände implementiert
- [x] Spieler bewegen sich mit Richtungswechseln und Zonenbegrenzung
- [x] Wahrnehmungssystem mit Sichtkegel und Gedächtnis
- [x] Behavior Trees und Entscheidungsregeln aktiv
- [x] Formationen aus JSON werden geladen
- [x] Einfaches Scoreboard vorhanden

## Nächste Schritte
- [x] Verbesserte Ballphysik mit Spin und realistischeren Abprallern
- [x] Kollisionsberechnung für Spieler
- [x] Dynamischer Formationswechsel während des Spiels
- [x] Erweiterte Spielerattribute wie Ausdauer, Schnelligkeit und Technik
- [x] Basis-Soundeffekte für Pfiffe und Torjubel

Das Ziel dieses Projekts ist die Simulation eines dynamischen Fußballspiels mit Fokus auf realitätsnahe taktische und physikalische Abläufe. Im Zentrum steht ein KI-gesteuertes System, das sowohl das Verhalten der Spieler als auch die Ballphysik so authentisch wie möglich nachbildet. Jeder virtuelle Spieler soll realistische Bewegungen ausführen, intelligente Entscheidungen treffen und in einem robusten taktischen Gefüge agieren, das an ein echtes Fußballteam erinnert. Die Vision ist eine Fußballsimulation, in der sich Situationen wie auf einem echten Spielfeld entfalten: Spieler antizipieren Pässe, laufen sich frei, greifen an oder ziehen sich taktisch zurück. Durch authentisches Spieler- und Ballverhalten entsteht ein lebendiges Spielgeschehen. Bewegungen besitzen Schwungmasse und Trägheit, Entscheidungen der KI-Spieler basieren auf Wahrnehmung und Teamtaktik, und das taktische Verhalten der Mannschaft reagiert dynamisch auf Ballbesitzwechsel und Spielphasen. Langfristig soll so ein Fundament geschaffen werden, auf dem später auch erweiterte Features wie 3D-Grafik, komplexe Physik oder Multiplayer aufbauen können.
Architekturüberblick
Um diese Vision umzusetzen, ist das Projekt in mehrere Module aufgeteilt. Jedes Modul übernimmt spezifische Aufgaben, wobei eine klare Trennung von Logik, Darstellung und Entscheidung eingehalten wird. Die Hauptkomponenten und ihre Rollen sind:
main.js: Enthält die Spielschleife, initialisiert alle Objekte und koordiniert den Ablauf. Hier wird der zentrale Spielzustand verwaltet und pro Frame das Update aller Spielbestandteile angestoßen.
player.js: Definiert das Spielerobjekt und dessen Methoden. Hier liegen die Spielerlogik, Attribute (Fähigkeiten) und Zustände der Spieler. Jeder Spieler wird als eigenständiger Agent modelliert, der basierend auf Wahrnehmung und Entscheidungsvorgaben agiert.
decision-rules.js: Beinhaltet die KI-Entscheidungslogik für die Spieler. In dieser Komponente sind die Regeln und Entscheidungsbäume implementiert, die bestimmen, wie ein Spieler in einer bestimmten Situation handelt (z.B. Pass spielen, in einen Zweikampf gehen, Raum decken).
render.js: Kümmert sich um die grafische Darstellung des Spiels. Hier werden das Spielfeld, die Spieler und der Ball gezeichnet, Animationen ausgeführt und ggf. debug-relevante Visualisierungen (wie z.B. Sichtkegel der Spieler) dargestellt.
Ein zentrales Element der Architektur ist die Spielzustandsmaschine (Game-State-Machine). Diese steuert den makroskopischen Ablauf des Spiels, indem sie verschiedene Phasen oder Zustände des Matches unterscheidet. Geplante Zustände sind u.a.:
FORMATION: Aufstellungsphase, in der sich alle Spieler gemäß der gewählten Formation positionieren (z.B. zu Spielbeginn, nach Toren oder Unterbrechungen). Spieler bewegen sich in ihre Ausgangspositionen; das Spiel ist noch nicht freigegeben.
RUNNING: Laufender Spielbetrieb. Der Ball ist im Spiel, die Uhr läuft, und die Spieler handeln dynamisch gemäß ihrer KI-Entscheidungen. Dies ist der Hauptzustand, in dem die meiste Zeit verbracht wird.
TRANSITION: Übergangsphase, z.B. beim Umschalten von Angriff auf Verteidigung oder während kurzer Unterbrechungen. In diesem Zustand können bestimmte Übergangslogiken greifen – etwa wenn der Ball ins Aus geht (kurz anhalten, Zustand wechseln, dann Formation für Einwurf aufbauen) oder bei Ballbesitzwechsel (Mannschaft richtet sich neu aus). Oft wechselt die Zustandsmaschine nach einer Transition in einen anderen Zustand (z.B. zurück zu RUNNING, oder in FORMATION bei längerer Unterbrechung).
Jeder Spieler besitzt intern ebenfalls bestimmte Zustände und ein einfaches Zustandsdiagramm, das sein Verhalten steuert. Beispielsweise kann ein Spielerzustand WARTET (in Formation auf Ballfreigabe wartend), LAEUFT (läuft zum Ball oder zu einer Position), PASS_SPIELT (führt gerade einen Pass aus), SCHIESST, VERTEIDIGT (geht in Zweikampf) usw. umfassen. Zustandsübergänge werden durch Wahrnehmungen und Entscheidungen getriggert – etwa wechselt ein Spieler vom Zustand "WARTET" zu "LAEUFT", sobald das Spiel freigegeben ist und er sich zum Ball oder in eine Position bewegen soll. Wahrnehmung und Gedächtnis spielen in der Architektur eine wichtige Rolle: Jeder Spieler verfügt über ein Modell seiner Umgebung (welche Mit- und Gegenspieler sind in Sicht, wo ist der Ball zuletzt gesehen worden?). Diese Informationen werden pro Frame in player.js aktualisiert und an decision-rules.js weitergereicht. Dadurch basiert die Entscheidungsfindung der KI auf dem aktuellen Spielgeschehen, kombiniert mit einem einfachen Gedächtnis (Erinnerung an kürzlich gesehene Objekte). Die Module interagieren folgendermaßen: main.js ruft in jedem Frame die Update-Funktionen der Spieler (player.update()) sowie des Balls und des Renderers auf. Innerhalb von player.update() wiederum wird auf decision-rules.js zurückgegriffen, um abhängig vom Spielzustand und der Wahrnehmung die nächste Aktion zu bestimmen. Nach der Aktualisierung aller Positionen und Zustände übernimmt render.js die Darstellung. Dieses MVC-ähnliche Muster (Model-View-Controller) sorgt dafür, dass Logik und Rendering getrennt bleiben und vereinfacht das Debugging. Ein Beispiel für die Hauptschleife in main.js könnte so aussehen (Pseudocode):
js
Kopieren
Bearbeiten
function gameLoop() {
  updateGameState();              // Prüft z.B. Timer oder Ereignisse und setzt ggf. neuen Spielzustand
  players.forEach(p => p.update(gameState));  // Aktualisiert jeden Spieler basierend auf aktuellem Zustand
  ball.update();                  // Physikupdate des Balls
  render(gameState);              // Zeichnet Spielfeld, Spieler, Ball etc. basierend auf aktuellen Daten
  requestAnimationFrame(gameLoop);
}
Hier steuert updateGameState() die Zustandsmaschine des Spiels (z.B. Wechsel von FORMATION zu RUNNING, wenn alle bereit sind), während p.update() die Logik pro Spieler abarbeitet. Diese Aufteilung garantiert, dass globale Zustandsänderungen (z.B. Anpfiff, Unterbrechung) synchron mit den individuellen Spieleraktionen ablaufen.
Spielerlogik (player.js)
In der Spielerlogik werden die individuellen Eigenschaften und Verhaltensweisen jedes Spielers definiert. Jeder Spieler ist als eigenständiges Objekt mit bestimmten Fähigkeiten, einer Wahrnehmung der Umgebung, Bewegungs- und Handlungslogiken sowie taktischen Einschränkungen modelliert. Ziel ist es, dass sich jeder Spieler glaubwürdig und unterschiedlich verhält, basierend auf Attributen wie z.B. Schnelligkeit oder Spielintelligenz.
Fähigkeiten und Attribute
Jeder Spieler besitzt ein Set an Fähigkeiten/Attributen, die sein Verhalten und seine Effektivität bestimmen. Geplant sind unter anderem folgende Attribute:
Awareness (Spielwahrnehmung): Regelt, wie aufmerksam der Spieler das Geschehen verfolgt. Ein Spieler mit hoher Awareness nimmt Veränderungen auf dem Feld schneller wahr (z.B. einen plötzlichen Passwechsel) und reagiert prompt. Dieses Attribut kann z.B. die Reaktionszeit oder die Größe seines Sichtbereichs positiv beeinflussen.
Vision (Übersicht): Beschreibt die Fähigkeit, Mitspieler und Lücken zu sehen. Ein Spieler mit hoher Vision erkennt freie Mitspieler für Pässe oder gefährliche Räume beim Angriff besser. Dieses Attribut beeinflusst die Passauswahl – ein Spieler mit guter Übersicht wird eher einen klugen Pass in die Tiefe spielen, während ein Spieler mit niedriger Übersicht viele Möglichkeiten "übersieht".
Teamwork (Teamarbeit): Hohe Teamwork-Werte bedeuten, dass der Spieler man nschaftsdienlich agiert. Er passt häufiger an besser postierte Mitspieler, hält seine Position in der Formation disziplinierter und unterstützt Kollegen (z.B. bietet sich an oder läuft Lücken zu). Ein niedriger Teamwork-Wert könnte bedeuten, dass der Spieler eher eigensinnig dribbelt oder aus der Formation ausbricht.
Courage (Mut): Dieses Attribut bestimmt die Zweikampffreudigkeit und Risikobereitschaft. Ein mutiger Spieler scheut keinen Zweikampf und geht auch mal ins Tackling, selbst auf die Gefahr eines Fouls hin. In Offensive könnte Courage bedeuten, auch aus großer Distanz aufs Tor zu schießen oder ins Dribbling zu gehen. Ein Spieler mit niedrigem Mut wird vorsichtiger agieren, Zweikämpfen eher aus dem Weg gehen und sichere Pässe bevorzugen.
Creativity (Kreativität): Beeinflusst die Unberechenbarkeit und Einfallsreichtum des Spielers. Ein kreativer Spieler versucht ungewöhnliche Lösungswege – z.B. überraschende Pässe, Lupfer, Hackentricks oder unerwartete Laufwege. Dieses Attribut kann die Auswahl an Aktionen vergrößern und führt zu variablerem Angriffsspiel. Ein weniger kreativer Spieler wählt bevorzugt simple, vertraute Aktionen.
Speed (Geschwindigkeit): Einfluss auf Sprinttempo und Beschleunigung. Ein schneller Spieler kann größere Distanzen in kürzerer Zeit überbrücken und hat Vorteile beim Laufduell. Geschwindigkeit wirkt sich direkt auf die Bewegungsroutine im player.js aus, indem sie z.B. die maximal mögliche Laufgeschwindigkeit und Drehgeschwindigkeit (wie schnell ein Spieler die Richtung ändern kann) festlegt.
Diese Fähigkeiten werden im Spiel genutzt, um Unterschiede zwischen Spielertypen zu modellieren. Beispielsweise könnte ein Innenverteidiger (IV) hohe Werte in Courage und Awareness haben, während ein kreativer offensiver Mittelfeldspieler hohe Vision und Creativity besitzt. Die Attribute fließen in die Entscheidungslogik ein (z.B. ob ein Pass riskiert wird) und in physische Aspekte (z.B. Laufgeschwindigkeit). In der Code-Struktur könnten die Fähigkeiten als Eigenschaften des Spielerobjekts gespeichert sein, etwa:
js
Kopieren
Bearbeiten
let player = {
  awareness: 0.8,   // Werte zwischen 0 und 1 oder einer Skala
  vision: 0.7,
  teamwork: 0.9,
  courage: 0.6,
  creativity: 0.5,
  speed: 0.85,
  ... 
};
Wahrnehmung: Field-of-View und Gedächtnis
Jeder Spieler kann nur auf Basis dessen handeln, was er wahrnimmt. Dafür simuliert das System einen Sichtbereich (Field-of-View, FOV) für jeden Spieler. Der FOV kann als Kegel oder Winkel vor dem Spieler definiert sein. Ob ein Spieler ein Objekt (Ball, Mitspieler, Gegner) sieht, hängt von folgenden Faktoren ab:
Sichtwinkel: Z.B. 120° nach vorne – Objekte hinter dem Spieler fallen außerhalb seines FOV (er "hat den Rücken zum Geschehen"). Dreht der Spieler seinen Körper/Kopf (seine Blickrichtung), ändert sich dieser Bereich entsprechend. Ein hoher Vision- oder Awareness-Wert könnte effektiv diesen Winkel etwas erweitern (der Spieler "schaut sich mehr um").
Sichtdistanz: Es gibt eine maximale Distanz, über die ein Spieler Details wahrnehmen kann. Dinge, die sehr weit weg sind, erkennt er eventuell nicht deutlich (insbesondere relevant für den Ball). Awareness könnte diese Distanz beeinflussen (aufmerksame Spieler verfolgen auch weiter entfernte Aktionen).
Sichtlinien/Verdeckungen: In einem 2D-Top-Down-Setting ohne 3D-Verdeckungen gibt es eigentlich keine Hindernisse, außer man führt optional ein, dass ein Spieler hinter vielen anderen Spielern den Ball "verdeckt" haben könnte. In der aktuellen Simulation nehmen wir an, dass jeder innerhalb des Winkels und der Reichweite grundsätzlich gesehen wird.
Zusätzlich zur momentanen Sicht hat jeder Spieler ein Gedächtnis über zuletzt gesehene Objekte. Das heißt, wenn der Ball kurzfristig aus dem Sichtfeld rollt (z.B. hinter dem Spieler), erinnert sich der Spieler für eine gewisse Zeit an die letzte bekannte Position des Balls. Dieses Gedächtnis verhindert komplett unrealistisches Verhalten (z.B. dass ein Spieler sofort "vergisst", wo der Ball ist, sobald er ihm den Rücken zudreht). Stattdessen würde er noch in Richtung der vermuteten Ballposition reagieren, zumindest für kurze Zeit. Ähnlich können Spieler sich erinnern, wo nahe Mit- oder Gegenspieler sich befanden, selbst wenn sie sie gerade nicht im Blick haben – so ist das Defensivverhalten stabiler (der Spieler bleibt an seinem Gegenspieler dran, auch wenn er mal wegschaut). In der Implementierung könnte jeder Spieler dafür eine Struktur wie lastSeen führen, z.B.:
js
Kopieren
Bearbeiten
player.lastSeen = {
  ball: { x: 50, y: 20, time: 1200 },   // Ball zuletzt an (50,20) gesehen um Spielzeit 1200ms
  opponents: { ... },                  // ähnliche Strukturen für Gegner
  teammates: { ... }
};
Beim Wahrnehmungs-Update in player.update() wird die aktuelle Sicht geprüft und dieses Gedächtnis aktualisiert. Objekte, die neu in den FOV kommen, werden mit aktueller Position und Zeitstempel eingetragen, Objekte, die aus dem FOV verschwinden, bleiben noch mit altem Zeitstempel eine Weile im Gedächtnis, bis ein Timeout abläuft. Auf Basis von lastSeen kann der Spieler weiterhin Entscheidungen treffen (z.B. "Ich glaube, der Ball ist da drüben, also laufe ich in diese Richtung"), selbst wenn er den Ball im Moment nicht direkt sieht. Ein Pseudocode für die Sichtprüfung eines Objekts aus Spielersicht könnte so aussehen:
js
Kopieren
Bearbeiten
function canSee(player, object) {
    const dx = object.x - player.x;
    const dy = object.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance > player.sichtweite) return false;    // außerhalb der maximalen Sichtdistanz

    // Winkel zwischen Blickrichtung des Spielers und der Richtung zum Objekt berechnen
    const angleToObject = Math.atan2(dy, dx);          // absolute Richtung zum Objekt
    const angleDiff = Math.abs(normalizeAngle(angleToObject - player.direction));
    return angleDiff < (player.sichtwinkel / 2);
}
Dabei repräsentiert player.direction die aktuelle Blick- bzw. Laufrichtung des Spielers in Radianten, und player.sichtwinkel z.B. 120° (in Radianten). normalizeAngle stellt sicher, dass der Winkelunterschied korrekt im Bereich 0–π gemessen wird. Dieser Code entscheidet, ob ein Spieler ein Objekt aktuell sehen kann. Falls ja, würden wir player.lastSeen.object aktualisieren.
Zielgerichtete Bewegung und weiche Richtungswechsel
Die Spieler bewegen sich zielgerichtet über das Feld, sei es um den Ball zu erobern, einen Pass zu laufen oder ihre Formation zu halten. Wichtig ist, diese Bewegungen physikalisch glaubwürdig erscheinen zu lassen:
Grace-Time bei Richtungswechseln: Spieler reagieren nicht instantan auf neue Situationen, sondern mit leichtem Verzug. Beispielsweise wenn der Ball plötzlich die Richtung ändert (Pass in die Gegenrichtung), wird ein Spieler mit einem Richtungswechsel eine minimale Verzögerung (z.B. einige Frames) haben, bevor er umdreht und hinterher sprintet. Dieses Konzept der Grace Time verhindert auch hektisches Hin- und Her-Zucken der Figur bei schnellen Ballbewegungen und gibt ein realistischeres Verhalten, da echte Spieler auch einen Moment brauchen, um z.B. ihren Schwung abzubremsen und umzudrehen.
Trägheit und Drehgeschwindigkeit: Jeder Spieler hat eine maximale Drehgeschwindigkeit – wie schnell er seine Laufrichtung ändern kann – und eine maximale Beschleunigung. Das bedeutet, wenn ein Spieler in eine Richtung sprintet und plötzlich in die entgegengesetzte möchte, wird er nicht abrupt die Richtung wechseln, sondern über mehrere Schritte allmählich umlenken. In der Umsetzung könnte dies so aussehen, dass pro Frame die Richtungsdifferenz begrenzt wird. Z.B. darf ein Spieler seine Blickrichtung nur um maximal 15° pro Frame ändern. Läuft er also nach Norden und der Ball ist plötzlich im Westen, so braucht er vielleicht ~6–7 Frames um sich voll nach Westen zu drehen, statt sofort in einem Frame zu rotieren.
Gezieltes Anlaufen mit Zielpunkt: Bewegungen erfolgen meist auf ein Ziel hin – z.B. "Laufe zu Ballposition X" oder "Laufe zu deiner Formations-Position Y". Die Spielerlogik berechnet dazu einen Zielpunkt und der Spieler bewegt sich in diese Richtung. Während der Bewegung kann es jedoch neue Einflüsse geben (Ball bewegt sich weiter, Gegner bewegt sich). Hier kommt wieder die Grace-Time ins Spiel: Der Spieler kann z.B. beschließen "ich halte jetzt für mindestens 0,5 Sekunden an meinem aktuellen Ziel fest", bevor er erneut evaluiert, ob er das Ziel ändern muss. So wird vermieden, dass der Spieler bei unklaren Situationen ständig hin- und herläuft.
Geschwindigkeit aus Attribut: Das Attribut Speed bestimmt die maximale Laufgeschwindigkeit. Im Code könnte z.B. player.speedMax = baseSpeed * player.speed berechnet werden, sodass die nominale Geschwindigkeit mit dem Fähigkeitswert skaliert. Ähnlich könnte Agilität (nicht explizit als Attribut genannt, könnte aber aus Kombination von Courage und Speed interpretiert werden) die Drehgeschwindigkeit beeinflussen.
Durch diese Mechanismen entsteht ein flüssigeres Bewegungsbild: Spieler beschleunigen, bremsen und drehen mit sanften Übergängen. Sollte dennoch ein Spieler einmal feststecken (z.B. kollisionsbedingt oder durch KI-Fehler in einer Endlosschleife), greifen Fehlertoleranzmechanismen, die später noch beschrieben werden (Teleport-Fallback bei Timeout etc.).
Taktische Zonen je nach Rolle
Um ein geordnetes taktisches Verhalten zu gewährleisten, hat jeder Spieler abhängig von seiner Rolle eine definierte taktische Zone auf dem Feld. Diese Zone stellt den hauptsächlichen Wirkungsbereich des Spielers dar und begrenzt, wie weit er sich von seiner Position entfernen darf. Die Idee dahinter ist, dass ein Spieler zwar durchaus aus seiner Position herausgehen darf (z.B. ein Verteidiger rückt mal mit auf, um den Ball zu erobern), aber nicht das gesamte Spielfeld herumirrt und seine Position komplett aufgibt.
Für jede Rolle (z.B. IV Innenverteidiger, DM Defensives Mittelfeld, ST Stürmer) wird ein Bereich definiert. Dieser kann z.B. rechteckig oder zirkulär sein. Ein Innenverteidiger könnte einen Bereich haben, der hauptsächlich die eigene Hälfte und das Zentrum abdeckt, während ein Stürmer eher im vorderen Drittel bleibt.
Die Zonen können relativ zur aktuellen Spielfeldhälfte definiert sein. Beispiel: Ein 4-4-2 mit zwei IV – ihre Zone könnte von der eigenen Strafraumgrenze bis zur Mittellinie reichen, und jeweils eine Hälfte der Feldbreite (linker IV links, rechter IV rechts). Ein DM hätte eine Zone im zentralen Mittelfeld, etc.
Boundaries: Spieler sollen diese Zonen in der Regel nicht verlassen. Bounded Intentions (siehe Entscheidungslogik) bedeutet, dass ihre Absichten begrenzt werden, um die Zone einzuhalten. Wenn z.B. der Ball weit außerhalb der eigenen Zone ist, wird der Spieler eher in seiner Zone verbleiben oder nur bis zum Rand laufen und dort warten, statt blind dem Ball überallhin zu folgen.
Diese Zonen dienen der Formationstreue: Die Mannschaft soll ihre Formation halten, um Lücken und Überzahlsituationen zu vermeiden. Beispielsweise: Wenn ein gegnerischer Flügelspieler auf der rechten Außenbahn durchbricht, sollte der linke Verteidiger nicht quer über das Feld rennen, um ihn zu stellen – das wäre Aufgabe des rechten Verteidigers. Die Zoneneinteilung spiegelt solche Zuständigkeiten wider.
In der Implementation können Zonen als einfache Grenzen (xmin, xmax, ymin, ymax) oder als Radien definiert sein. Jeder Spieler kennt seine Zone (evtl. aus der Formationsdefinition). Die Entscheidungslogik prüft vor kritischen Aktionen: "Führt mich diese Aktion aus meiner Zone heraus?". Falls ja, kann der Spieler die Aktion nicht durchführen oder bricht sie frühzeitig ab. Stattdessen vertraut er darauf, dass ein Mitspieler aus der anderen Zone eingreift. Diese Beschränkung fördert ein realistisches Mannschaftsverhalten und verhindert Chaos (z.B. alle Spieler rennen zum Ball).
Cooldown-System für Aktionen
Um unnatürliches Spam-Verhalten zu vermeiden, wird ein Cooldown-System für bestimmte Entscheidungen/Aktionen eingeführt. Das bedeutet: Hat ein Spieler gerade eine bestimmte Aktion ausgeführt, muss er für eine kurze, vordefinierte Zeit warten, bevor er dieselbe Aktion erneut durchführen kann. Dies betrifft besonders Zweikämpfe/Tacklings, aber auch andere sich schnell wiederholende Handlungen.
Tackling: Versucht ein Spieler, dem Gegner den Ball abzunehmen (z.B. per Grätsche oder Pressing), und verfehlt, so kann er nicht direkt in der nächsten Sekunde wieder tacklen. Stattdessen erhält er einen kurzen Cooldown (z.B. 2 Sekunden), in dem er kein zweites Tackling ansetzt. In dieser Zeit muss er andere Maßnahmen ergreifen (weiter mitlaufen, den Gegner stellen, auf Unterstützung warten). Dies simuliert die Erholungszeit nach einem Tackling im echten Fußball, wo ein Spieler nach einer Grätsche auch einen Moment braucht, um aufzustehen und erneut eingreifen zu können.
Schüsse/Pässe: Ähnlich könnte es minimale Abklingzeiten für Schüsse und Pässe geben, vor allem, um ungewollte Doppeleingaben oder KI-Schleifen zu verhindern. Ein Spieler, der gerade gepasst hat, wird nicht unmittelbar sofort nochmals passen (er muss den Ball ja auch erst wieder kontrollieren). Das ergibt sich zum Teil schon aus der Logik (Ballbesitz wechselt etc.), aber ein kurzer Cooldown stellt sicher, dass keine absurden Ping-Pong-Passfolgen entstehen.
Positionswechsel: Sollte ein Spieler seine Aufgabe gewechselt haben (z.B. von "Ball verfolgen" zu "Gegner decken"), könnte man ebenfalls einen kurzen Cooldown einsetzen, bevor er erneut die Aufgabe wechselt. Dies verhindert, dass er in Unsicherheit ständig die Entscheidung hin- und her flippt. Praktisch fällt das aber eher unter die oben erwähnte Grace-Time.
Technisch werden Cooldowns als Timer pro Spieler/Aktion umgesetzt. Im player-Objekt kann man z.B. Zeitstempel der letzten Aktion speichern oder Timer runterzählen. Beispiel: player.tackleCooldown = 0 initial. Wenn ein Tackling ausgeführt wird: player.tackleCooldown = 120 (wenn wir z.B. 60 FPS annehmen, wären 120 Frames = 2 Sekunden). In jedem Frame wird dann tackleCooldown = max(0, tackleCooldown - 1) reduziert. Die Entscheidungslogik prüft vor einem Tackling: if (player.tackleCooldown <= 0) { ... darf tacklen ... } else { ... nicht erlaubt ... }. Ähnlich für andere Aktionen. Durch dieses System wirken Spielerhandlungen über Zeit verteilt realistischer. KI-Spieler müssen ggf. alternative Aktionen ausführen, wenn die präferierte gerade auf Abklingzeit ist (z.B. statt erneut zu tacklen, läuft der Verteidiger dem Gegner erst mal hinterher). Das verleiht dem Spiel mehr strategische Tiefe und verhindert zu monotone oder exploitable Muster.
Entscheidungslogik (decision-rules.js)
Die Entscheidungslogik ist das Herz der KI: Hier wird bestimmt, wie ein Spieler in verschiedenen Situationen agiert. Geplant ist eine strukturierte, rollenbasierte Entscheidungsfindung, die man sich als eine Art Entscheidungsbaum oder Regelwerk vorstellen kann. Jeder Spieler durchläuft pro Frame (oder in Abständen) diesen Entscheidungsbaum, der auf Basis seines Wissens (Wahrnehmung & Gedächtnis), seines Zustands und seiner Rolle eine Aktion auswählt. Wichtige Faktoren bei Entscheidungen sind: Ballbesitz (Team hat Ball oder nicht), Position von Ball und Spielern, Rolle des Spielers, sowie aktuelle Teamtaktik. Außerdem fließen die Spielerfähigkeiten (z.B. Courage für Risikobereitschaft) ein. Man kann die Entscheidungslogik grob in zwei Hauptsituationen unterteilen:
Verhalten bei eigenem Ballbesitz (Offensivspiel)
Wenn das eigene Team im Ballbesitz ist, verhalten sich Spieler offensiv und unterstützen den Ballführenden:
Ballführender Spieler: Befindet sich der Spieler selbst am Ball, entscheidet decision-rules.js, ob er dribbelt, passt oder schießt.
Diese Entscheidung hängt von seiner Position (z.B. in Schussdistanz zum Tor?), seinen Fähigkeiten und der Situation ab.
Beispiel: Ein Stürmer (ST) in der Nähe des Strafraums mit hoher Courage und Schusswinkel wird eher aufs Tor schießen. Ein Mittelfeldspieler mit hoher Teamwork und Vision schaut sich eher nach einem Pass um, insbesondere wenn ein Mitspieler frei steht.
Kreative Spieler ziehen eventuell überraschende Aktionen vor (z.B. Lupfer über die Abwehr).
Ist kein guter Pass und kein Schuss möglich, dribbelt der Spieler den Ball weiter in Richtung eines sinnvollen Bereichs (z.B. Richtung gegnerisches Tor, oder hält den Ball, bis sich Optionen ergeben).
Mitspieler ohne Ball: Alle anderen Spieler im Team ohne Ballbesitz agieren unterstützend:
Freilaufen: Spieler versuchen, sich anbietbar zu machen. Ein Spieler könnte in einen freien Raum laufen, wo er nicht gedeckt ist, um eine Passoption zu bieten. Dabei achtet er auf seinen Sichtkontakt zum Ballführenden (falls er außerhalb des FOV des Ballführenden ist, sinkt die Passwahrscheinlichkeit). Teamwork und Vision spielen hier rein – teamorientierte Spieler laufen aktiv Lücken an, während weniger teamorientierte evtl. in Position verharren.
Formation halten mit leichten Verschiebungen: Spieler, die weiter weg vom Ball sind (z.B. Abwehr, wenn der Ball vorne ist), rücken kontrolliert nach, bleiben aber in ihrer Grundformation, um gegen Konter abgesichert zu sein. Defensive Mittelfeldspieler könnten etwas vorrücken, aber ihre taktische Zone nicht komplett verlassen (Bounded Intention: "unterstütze den Angriff, aber bleibe auf deiner Positionstiefe bereit, um bei Ballverlust zu reagieren").
Pressing vermeiden: Da das Team den Ball hat, geht es nicht ums Pressing auf Gegenspieler, sondern eher um Ballbesitz halten. Spieler ohne Ballbesitz im angreifenden Team achten aber auf nahe Gegner, die Druck machen könnten, und versuchen diese ggf. wegzuziehen (z.B. ein Spieler macht einen Lauf, um einen Verteidiger mitzunehmen und Platz für den Ballführenden zu schaffen).
Zusammengefasst: Im Ballbesitz priorisiert die Entscheidungslogik sichere Pässe und Ballkontrolle. Die Hierarchie könnte etwa so aussehen:
Kann ich einen gefährlichen Pass/Schuss spielen? (führt evtl. direkt zu einer Torchance)
Falls nein: Habe ich eine passsichere Option? (einen freien Mitspieler in guter Position -> Pass dorthin)
Falls nein: Dribbling/Fortbewegung mit Ball in einen Bereich, der das Team voranbringt, aber nicht in einen zweifelhaften Zweikampf führt.
Fallback: Ball halten, abwarten, Gegner locken, bis sich Option ergibt.
Ein Beispiel-Pseudocode für den Ballführenden könnte sein:
js
Kopieren
Bearbeiten
function decideActionWithBall(player) {
  if (player.canShootOnGoal()) {
    return "SCHIESST"; // Logik für Torschuss ausführen
  } 
  let passTarget = player.findBestPassTarget();
  if (passTarget) {
    return "PASST"; // Pass-Logik starten, Ziel = passTarget
  }
  // Sonst keinen Pass: bewege dich mit Ball Richtung gegnerisches Tor oder freier Raum
  return "DRIBBELT";
}
Wo findBestPassTarget() interne Checks macht: es scannt Mitspieler und bewertet, wer am freiesten steht (keine Gegner im Passweg, in Reichweite, sinnvoller Fortschritt). Hier fließen "Vision" und "Teamwork" ein: ein Spieler mit hoher Vision entdeckt mehr potentielle Targets; mit hoher Teamwork wählt er eher einen Mitspieler statt selbst zu dribbeln.
Verhalten bei gegnerischem Ballbesitz (Defensivspiel)
Hat das andere Team den Ball, schalten alle Spieler in den Verteidigungsmodus:
Nächstgelegener Spieler zum Ball: Die KI identifiziert den Spieler, der dem ballführenden Gegner am nächsten bzw. am ehesten in Reichweite ist. Dieser Spieler übernimmt die Pressing-Rolle und versucht, den Gegner unter Druck zu setzen oder den Ball zu erobern. Dabei hängt das Verhalten von Courage und Taktik ab:
Ein mutiger Spieler (hohe Courage) wird direkt in den Zweikampf gehen (Tackling versuchen, sofern sein Tackling-Cooldown es zulässt).
Ein vorsichtigerer oder bereits verwarnter Spieler hält eher etwas Abstand und stellt den Gegner nur, um Zeit zu schinden.
Die Distanz spielt eine Rolle: ist er noch weiter weg, sprintet er zunächst, um aufzuschließen.
Unterstützende Verteidiger: Andere Spieler in der Nähe beteiligen sich indirekt:
Doppeln: Ein zweiter Verteidiger könnte in etwas Abstand mitlaufen, um im Falle eines Dribblings des Gegners eingreifen zu können. (Hier muss man aufpassen, nicht zu viele Spieler aus der Position locken – wahrscheinlich begrenzen wir es, dass maximal 2 Spieler aktiv auf den Ballführenden gehen).
Passwege zustellen: Spieler, die mögliche Pass-Empfänger decken, bleiben bei diesen Empfängern (Manndeckung) oder positionieren sich in den Passweg (Raumdeckung). Beispielsweise, wenn der Gegner am Flügel den Ball hat, wird der Innenverteidiger nicht unbedingt zum Ball sprinten, sondern in der Mitte bleiben und auf den gegnerischen Stürmer achten, damit ein Pass in die Schnittstelle abgefangen werden könnte.
Formation verdichten: Das Team zieht sich je nach Taktik etwas zurück und rückt auf die Ballseite. Spieler bewegen sich in ihre Zonen Richtung Ballseite, um keine Lücken zu lassen (das berühmte "verschieben"). Aber dank Bounded Intentions übertreiben sie es nicht: die andere Spielfeldseite wird nicht völlig aufgegeben, um Seitenwechsel des Gegners nicht unbedrängt zu lassen.
Kein unkontrolliertes Rauslaufen: Hier greift die taktische Zone sehr stark. Spieler verlassen ihre Position nur, wenn es notwendig ist. Ein Stürmer beispielsweise wird bei gegnerischem Ballbesitz vorne bleiben und allenfalls das Anspiel auf gegnerische Aufbauspieler stören, aber er wird nicht tief in die eigene Hälfte rennen (seine Zone begrenzt das). Er übt vielleicht leichten Druck auf die ballbesitzende Abwehr aus (Forechecking), abhängig von Ausdauer und Taktik, aber primär bleibt er anspielbereit für einen Konter.
Umschaltverhalten: Sobald der Ball erobert wird (Team gewinnt Ballbesitz), wechseln alle Spieler mental wieder in Offensivrollen. Dieses Transitionsverhalten (Umschalten) erfolgt fließend und wird ggf. von der Game-State-Machine mit dem Zustand TRANSITION begleitet (um z.B. spezielle Animationen oder kurze Pausen zu erlauben, falls nötig).
Die Prioritäten in der Defensive lassen sich etwa folgendermaßen ordnen:
Ball zurückerobern oder Druck ausüben: (durch den nächstgelegenen Spieler oder mehrere, solange es taktisch passt).
Gefährliche Gegner decken: (der Stürmer des Gegners wird von den Innenverteidigern bewacht, etc. Niemand lässt seinen Gegenspieler völlig frei stehen).
Räume schützen: (wichtige Räume – z.B. Zentrum vor dem Strafraum – dicht machen, auch wenn dort gerade kein Gegner steht, um Durchbrüche zu verhindern).
Formation halten: (sofort wieder in Grundordnung kommen, falls sie durch das Pressing kurz verlassen wurde).
Auch hier ein Pseudocode-Ausschnitt zur Illustration, z.B. für einen Verteidiger:
js
Kopieren
Bearbeiten
function decideActionDefensive(player) {
  if (player.isClosestToBall()) {
    if (player.canTackle()) return "TACKLE";       // gehe in Zweikampf
    else return "PRESSURE";                       // dranbleiben aber (noch) nicht tacklen
  }
  // Nicht der Nächste am Ball:
  let markOpponent = player.findDangerousOpponent();
  if (markOpponent) {
    return "MARKIERT";  // Halte Nähe zu diesem Gegenspieler, bleibe zwischen ihm und Ball
  }
  return "SICHERT_RAUM";  // Standard: bleib in Zone/Formation und halte Raum gedeckt
}
In diesem Pseudocode würde isClosestToBall() prüfen, ob dieser Spieler der nächste aus seinem Team am Ball ist. canTackle() berücksichtigt den Cooldown und vielleicht auch relative Position (nicht tacklen, wenn man noch 5m entfernt ist). findDangerousOpponent() sucht in der Nähe Gegner, die anspielbar sind (z.B. ungedeckte Stürmer in der Nähe des Tores) und priorisiert diese zum Decken. "MARKIERT" bedeutet, der Spieler übernimmt quasi Manndeckung für diesen Gegner. "SICHERT_RAUM" wäre die Default-Aktion: leicht in Richtung Ball verschieben, aber hauptsächlich die eigene Zone und Formation halten.
"Bounded Intentions" – Bewegungen mit Zonenbindung
Der Begriff “Bounded Intentions” beschreibt die Idee, dass ein Spieler zwar eine Absicht (Intention) verfolgt, diese aber gebunden ist durch seine taktische Zone bzw. Rolle. Praktisch heißt das: Ein Spieler kann sich vornehmen "Ich gehe zum Ball und greife an", aber wenn der Ball außerhalb seines Verantwortungsbereichs liegt, begrenzt er diese Aktion. Konkret umgesetzt bedeutet das:
Jeder Spieler erhält durch die Entscheidungslogik ein Ziel oder eine Aktion, z.B. "Laufe zum Ball" oder "Decke Spieler X". Diese Intention wird erzeugt, ohne sofort die Zonenbegrenzung zu berücksichtigen.
Danach erfolgt ein Check: "Liegt dieses Ziel innerhalb meiner erlaubten Zone?".
Wenn ja, wird die Aktion normal ausgeführt.
Wenn nein, wird die Aktion modifiziert:
Entweder wird sie ganz abgebrochen (Spieler bricht das Verfolgen ab und bleibt eher in seiner Position)
oder sie wird auf einen erlaubten Teil beschränkt. Z.B. statt bis zum Ball zu rennen (der weit außerhalb liegt), läuft der Spieler vielleicht bis zum Rand seiner Zone in Richtung Ball und stoppt dort. Er verharrt dann, beobachtet und wartet, ob der Ball (oder ein Mitspieler mit Ball) wieder in seine Zone kommt.
Beispiel: Im 4-4-2 hat der linke Mittelfeldspieler (LM) die Anweisung, einen gegnerischen Spieler zu verfolgen, der aber in Richtung Mitte driftet. Sobald der LM sich der Mittellinie seiner Zone nähert, könnte er entscheiden: "weiter gehe ich nicht rein, sonst fehlt meine Deckung links". Er übergibt die Verantwortung an den zentralen Mittelfeldspieler oder wartet, dass der Gegner eventuell zurück in seine Zone kommt.
Dieses System verhindert extreme Positionsentfremdung (z.B. Außenverteidiger taucht plötzlich als Stürmer in der Mitte auf, weil er einem Ball nachjagt) und hält die Teamstruktur aufrecht. Es bedarf allerdings Abstimmung: Wenn ein Spieler den Ball nicht verfolgt, weil es außerhalb seiner Intention-Bounds liegt, sollte ein anderer (dessen Zone es ist) diese Intention bekommen. Daher spielen Formationen und Zonenzuständigkeiten eng mit der Entscheidungslogik zusammen. Idealerweise decken die Zonen aller Spieler zusammen das ganze Feld ab, sodass für jeden Ballort immer jemand "zuständig" ist.
Entscheidungsprioritäten zusammengefasst
Die Entscheidungsregeln fassen wir hier noch einmal als Prioritätsliste zusammen, die ein Spieler mental durchgehen könnte. Diese Liste unterscheidet sich je nach Ballbesitz, aber allgemein:
Ballbezogene Aktionen haben höchste Priorität:
Eigener Ballbesitz: Was tun mit dem Ball (Schuss, Pass, Dribbling)?
Gegnerischer Ballbesitz: Ball erobern oder Druck machen, falls in Reichweite.
Freier Ball (niemand in Besitz): Den Ball sichern, falls in der Nähe (z.B. nach einem Abpraller).
Unterstützung und Markierung:
Offensiv: Freilaufen für Pass, Anspielstation bieten.
Defensiv: Gegenspieler decken, Passwege zustellen.
Raum und Positionierung:
Offensiv: In gefährliche Räume vorstoßen (aber nicht planlos rumlaufen).
Defensiv: Räume dicht machen, Absicherung (z.B. letzter Mann bleibt hinten).
In beiden Fällen: Formationstreue berücksichtigen – Position nicht aufgeben ohne Grund.
Keine Aktion / Erholung:
Wenn nichts Dringendes ansteht (z.B. Ball auf anderer Feldseite, eigener Spieler hat Ball unter Kontrolle und man ist gedeckt), kann es am besten sein, Position zu halten und sich auf die nächste mögliche Aufgabe vorzubereiten (z.B. anspielbar sein oder Deckungsschatten halten).
Spieler "tun nichts" im Sinne von Aktion, aber behalten ihre Umgebung im Auge (dies ist quasi ein Leerlauf- oder Wartezustand).
Durch diesen priorisierten Ansatz sollte das Verhalten emergent und logisch wirken. Natürlich werden diese Regeln in Code als Kombination aus Bedingungen (If-Abfragen) und Auslösern (Funktionen, die Ziele liefern) implementiert. Ein (vereinfachter) Gesamtablauf in decision-rules.js könnte so aussehen:
js
Kopieren
Bearbeiten
function decideForPlayer(player, gameState) {
  if (gameState == "FORMATION") {
    return player.moveToFormationPosition();
  }
  // Running game
  if (player.team.hasBall) {
    if (player.hasBall) {
      return decideActionWithBall(player);
    } else {
      return decideSupportOffensive(player);
    }
  } else { // eigenes Team hat keinen Ball
    if (player.seesBall() && player.isClosestToBall()) {
      return player.canTackle() ? "TACKLE" : "PRESSURE";
    } else {
      return decideDefense(player);
    }
  }
}
Hier sieht man:
In Formation-Phasen wird pauschal die Aufstellung eingenommen.
In laufenden Spielphasen wird nach Ballbesitz verzweigt, und dann weiter nach Rolle/Zuständigkeit.
decideSupportOffensive würde Logik fürs Freilaufen etc. enthalten.
decideDefense die Logik fürs Decken/Räume sichern etc.
Jede Entscheidung (z.B. "TACKLE") wird dann in player.js in eine konkrete Aktion umgesetzt (Position anvisieren, Animation etc.). Wichtig ist, dass nach einer Entscheidung immer auch die Randbedingungen (Cooldowns, Bounded Intentions) geprüft werden. Z.B., wenn decideForPlayer "TACKLE" zurückgibt, aber player.tackleCooldown > 0, würde player.update() stattdessen vielleicht "PRESSURE" setzen (also es modifizieren). Diese Entscheidungslogik ist rollenbasiert in dem Sinne, dass manche Funktionen wie decideSupportOffensive oder decideDefense intern wiederum nach der Rolle des Spielers unterschiedlich arbeiten. Ein Verteidiger hat bei decideDefense andere Prioritäten (z.B. Stürmer decken) als ein Mittelfeldspieler (vielleicht den ballführenden Spieler doppeln) oder ein Stürmer (nur leichten Druck ausüben). Das kann man z.B. durch Switch-Cases oder separate Funktionen pro Position lösen. Alternativ könnte man pro Rolle ein JSON- oder Daten-getriebenes Regelset definieren, doch zunächst reicht feste Logik.
Ball- und Passlogik
Der Ball ist ein zentrales Objekt der Simulation und hat sowohl physikalische Eigenschaften als auch einen logischen Zustand im Spiel. Parallel dazu muss die Passlogik sicherstellen, dass Zuspiele realistisch entschieden und ausgeführt werden. Hier werden Ball- und Passverhalten sowie ein bekanntes Debug-Problem („Ball verschwindet nach Pass“) erläutert.
Ballobjekt und Physik
In der Simulation wird der Ball als eigenes Objekt (ball) geführt, mit folgenden wesentlichen Eigenschaften:
Position (ball.x, ball.y): die aktuellen Koordinaten des Balls auf dem Feld.
Velocity (Geschwindigkeit) (ball.vx, ball.vy): zweidimensionaler Geschwindigkeitsvektor. Wenn der Ball frei rollt, wird dieser genutzt, um die Position pro Frame zu aktualisieren (ball.x += ball.vx; ball.y += ball.vy).
Zustand: Der Ball kann verschiedene Zustände haben, z.B. "owned" (von einem Spieler am Fuß geführt), "loose" (frei rollend/liegend), evtl. "out" (aus dem Spiel, z.B. ins Aus geflogen) oder "dead" (Spiel unterbrochen, Ball ruht).
Besitzer (ball.owner): Referenz auf den Spieler, der den Ball aktuell kontrolliert, oder null, falls niemand (Ball frei). Im Zustand "owned" ist ball.owner gesetzt.
Die Ballphysik in 2D berücksichtigt vor allem:
Trägheit/Friction: Ein freier Ball wird allmählich langsamer (Rollwiderstand). Das kann einfach als konstanter Faktor pro Frame implementiert werden: z.B. ball.vx *= 0.99 und ball.vy *= 0.99 in jedem Update, um ihn langsam abzubremsen. So kommt der Ball irgendwann zum Liegen, wenn er nicht erneut gekickt wird.
Kollisionen mit Spielfeldgrenzen: Prallt der Ball an den Rand des Spielfelds (Aus-Linien), so wird je nach Situation das Spiel unterbrochen (Einwurf, Ecke, etc., siehe Regellogik) oder er prallt ab (bei Banden, falls implementiert – im Fußball normalerweise keine Banden im Feld außer Hallenfußball).
Kollision mit Spielern: Kommt der Ball in die Nähe eines Spielers, passiert je nach Situation Folgendes:
Wenn der Ball keinen Besitzer hat und rollt, kann ein Spieler ihn kontrollieren. Das könnte man so regeln, dass wenn der Ball innerhalb eines bestimmten Radius um den Spieler ist und dessen relative Geschwindigkeit gering (d.h. der Spieler kann den Ball aufnehmen, nicht dass der Ball mit voller Wucht an ihm vorbeischießt), dann wechselt ball.owner zu diesem Spieler und der Ball klebt quasi am Fuß (ggf. leicht versetzt).
Wenn der Ball besitzt wird (am Fuß eines Spielers) und ein Gegner kommt in Nähe für ein Tackling, entscheidet die Zweikampf-Logik, ob der Ball erobert wird (dann Wechsel ball.owner zum Tackler oder null falls herausgeschlagen) oder beim Spieler bleibt.
Schüsse/Pässe: Wenn der Ball gekickt wird, bekommt er einen Velocity-Impuls. Dieser wird anhand des Abstands zum Ziel und der gewünschten Flugkurve berechnet. In einer einfachen Simulation werden wir Pässe als gerade Bewegung mit konstanter Abnahme (durch Friction) darstellen. Effet/Rotation kommen in späteren Erweiterungen.
Das Rendering des Balls (kurz erwähnt, mehr in Render-Sektion) zeigt den Ball an ball.x, ball.y. Wichtig: Solange ball.owner != null, könnte man den Ball am Spieler zeichnen (z.B. leicht vor den Fuß, abhängig von Spielerorientierung). Wenn ball.owner == null, zeichnet man ihn an seiner freien Position.
Passlogik und Entscheidungsfindung für Pässe
Die KI-Entscheidungslogik (decision-rules) bestimmt wann und wohin ein Pass gespielt wird. Folgende Aspekte sind zentral:
Passentscheidung nur bei freier Sicht: Ein Pass wird von einem KI-Spieler nur gespielt, wenn er eine realistische Chance auf Erfolg sieht. Das heißt konkret:
Der anvisierte Mitspieler darf nicht von einem Gegner gedeckt oder bedrängt sein (sonst riskant).
Auf der direkten Linie zwischen Passgeber und Empfänger sollte kein Gegner stehen, der den Ball abfangen könnte. In der Implementation prüft man bspw. alle Gegner und schaut, ob ihre Position nahe an der Linie zwischen den beiden Spielern liegt. Wenn ein Gegner sehr nah an dieser Linie und auch relativ in der Mitte zwischen den Spielern steht, ist die Wahrscheinlichkeit hoch, dass er den Pass abfangen kann – die KI würde diesen Pass dann meiden.
Entfernung: Zu weite Pässe (über das halbe Feld) werden vermieden, wenn nicht nötig, da die Zeit in der Luft/Rollen groß ist und Gegner eingreifen könnten. Ausnahme: geplanter Befreiungsschlag oder strategischer Seitenwechsel – könnte man später als Sonderfall erlauben.
Realistisches Ziel: Der Empfänger des Passes sollte vorbereitet sein und den Ball erreichen können. Die KI wählt bevorzugt Mitspieler, die:
im Sichtfeld des Passgebers sind (also der Passgeber sieht den Mitspieler tatsächlich, FOV-abhängig).
nicht zu nah neben dem Passgeber stehen (ein 2m Pass macht wenig Sinn außer zum Zeitspiel) und nicht unerreichbar weit weg.
sinnvoll positioniert sind (z.B. Freiraum vor sich haben, oder besser postiert als der Passgeber).
Passart: In 2D simulieren wir zunächst einfache flache Pässe. Spätere Erweiterung könnten hohe Bälle/Lupfer sein, doch aktuell heißt Pass: Der Ball rollt oder fliegt flach zum Mitspieler.
Attribute Einfluss: Die Genauigkeit und Schnelligkeit eines Passes können von Attributen abhängen (z.B. Creativity oder ein separates Pass-Attribut falls ergänzt). Ein kreativer Spieler versucht eher schwierige Pässe (Steilpässe durch enge Lücken), ein weniger kreativer spielt sicher quer. Teamwork beeinflusst, ob er überhaupt passt oder eher selbst versucht zu dribbeln.
Passausführung: Wenn entschieden wurde zu passen, passiert im Spielmodell Folgendes:
Der ball.owner (Passgeber) wird auf null gesetzt, denn der Ball löst sich vom Fuß.
Dem Ball wird eine Geschwindigkeit gegeben, die auf den Empfänger ausgerichtet ist:
Man berechnet den Vektor vom Passgeber zum Empfänger.
Dann normiert man diesen Vektor und multipliziert mit einer Passgeschwindigkeit. Die erforderliche Geschwindigkeit hängt von der Distanz ab – man möchte, dass der Ball ungefähr beim Empfänger ankommt, aber nicht viel weiter rollt. Evtl. kann man eine einfache Formel nutzen, z.B.: passSpeed = k * distance (mit k als Kalibrierungsfaktor), damit weitere Entfernungen auch schnellere Pässe erhalten. Allerdings muss man Friction berücksichtigen, da der Ball ja abbremst: Ein grober Ansatz: initialSpeed = distance / T, wobei T die Zeit sein soll, die der Ball ungefähr unterwegs ist (z.B. 1 Sekunde für typische Pässe über mittlere Distanz). Dann bremst er in der Zeit ab. Das Feintuning dieser Physik kann empirisch erfolgen.
Der Ball erhält also ball.vx und ball.vy gemäß diesem Geschwindigkeitsvektor.
Der anvisierte Empfänger bekommt einen Hinweis, dass ein Pass zu ihm unterwegs ist (z.B. könnte man im Spielerstate vermerken player.expectedBall = true oder den Ball mit Referenz auf Ziel versehen). Dadurch weiß der Mitspieler, dass er auf den Ball zugehen oder sich bereithalten soll.
Während der Ball unterwegs ist, bleibt ball.owner = null. Erst wenn der Ball in Reichweite des Empfängers kommt, wird er den Besitzer wechseln. Kommt der Ball ungünstig oder verpasst der Empfänger ihn, bleibt er eben null (freier Ball).
Problemfall (Debug): Ball “verschwindet” nach Pass – In der Entwicklung wurde beobachtet, dass nach einem Pass der Ball scheinbar verschwand. Mögliche Ursachen und Lösungen:
Ursache 1: Render-Logik Fehler – Ein häufiger Grund kann sein, dass das Rendering den Ball nicht mehr gezeichnet hat, weil ball.owner wechselt. Wenn z.B. die Renderfunktion so geschrieben ist: "Zeichne Ball nur, wenn ball.owner == null" (weil bei ball.owner != null der Ball evtl. am Spieler gezeichnet wird) – und wenn beim Pass ball.owner falsch gesetzt wurde (vielleicht kurzzeitig auf den Empfänger gesetzt, obwohl der ihn noch nicht berührt hat), könnte es passieren, dass der Ball gar nicht gezeichnet wird. Lösung: Sicherstellen, dass beim Pass ball.owner wirklich auf null gesetzt bleibt, bis der Empfänger den Ball erreicht. Und die Renderlogik so gestalten, dass entweder der Ball bei owner==null gezeichnet wird oder beim jeweiligen Besitzer (wenn owner != null). In der Passphase müsste owner null sein, also sollte er regulär gezeichnet werden.
Ursache 2: Physik-Update Fehler – Möglicherweise wurde der Ball-Update nicht korrekt aufgerufen während eines Passes (z.B. weil man dachte, der Besitzer handle es). Lösung: Sicherstellen, dass ball.update() immer aufgerufen wird, auch wenn der Ball gerade gepasst wurde. In ball.update() wird dann ball.x += ball.vx etc. gemacht, sodass er sich bewegt.
Ursache 3: Out-of-bounds – Es könnte sein, dass direkt nach dem Pass der Ball als "aus dem Feld" interpretiert wurde (vielleicht ein Koordinatenfehler), woraufhin eine Spielfortsetzung (Einwurf etc.) getriggert wurde, die den Ball neu positioniert hat (z.B. unsichtbar wartend auf Einwurf). Lösung: Logging einbauen – z.B. in jedem Frame die Ballkoordinaten loggen – um zu sehen, ob sie plötzlich ungültig werden (NaN oder außerhalb). Sollte das passieren, entsprechend die Berechnung anpassen und sicherstellen, dass die Passrichtung korrekt ist.
Generell hilft es beim Debugging solcher Ballprobleme, Zeitlupe oder Einzelschritt-Modus zu nutzen: Frame für Frame schauen, was mit ball.x, ball.y, ball.owner passiert, und eventuell einen Debug-Draw der Flugkurve machen. Sobald der Fehler gefunden und behoben ist, sollte der Ball nach einem Pass korrekt vom Passgeber zum Empfänger rollen und nicht mehr "verschwinden".
Taktische Formationen
Ein Kern der taktischen KI ist die Möglichkeit, verschiedene Formationen zu nutzen. Formationen bestimmen die Grundaufstellung der Spieler auf dem Feld, definieren Rollen und beeinflussen somit sowohl die Startpositionen als auch die Zonen der Spieler. In diesem Projekt sollen Formationen flexibel aus externen Dateien (z.B. JSON) geladen werden, um sie leicht anpassen oder neue hinzufügen zu können.
Formation laden und zuweisen
Formationdaten könnten in einer JSON-Struktur abgelegt sein, beispielsweise:
json
Kopieren
Bearbeiten
{
  "4-4-2": {
    "name": "4-4-2 Standard",
    "roles": [
      { "position": "TW", "x": 0.1, "y": 0.5 },
      { "position": "IV", "x": 0.2, "y": 0.3 },
      { "position": "IV", "x": 0.2, "y": 0.7 },
      { "position": "AV", "x": 0.3, "y": 0.1 },
      { "position": "AV", "x": 0.3, "y": 0.9 },
      { "position": "LM", "x": 0.5, "y": 0.1 },
      { "position": "ZM", "x": 0.5, "y": 0.5 },
      { "position": "RM", "x": 0.5, "y": 0.9 },
      { "position": "ST", "x": 0.7, "y": 0.4 },
      { "position": "ST", "x": 0.7, "y": 0.6 }
    ]
  },
  "...": { }
}
(Erläuterung: Dies ist ein fiktives JSON-Beispiel für eine Formation 4-4-2. x und y sind hier normierte Feldkoordinaten (0.0 = linke/obere Feldseite, 1.0 = rechte/untere Seite aus Perspektive Team A). "TW" = Torwart, "IV" = Innenverteidiger, "AV" = Außenverteidiger, "LM/ZM/RM" = Links-/Zentral-/Rechtsmittelfeld, "ST" = Stürmer.) main.js würde beim Spielstart die gewünschte Formation für Team A und Team B laden. Für Team A werden die angegebenen Positionen direkt übernommen (umgerechnet auf die tatsächlichen Feldkoordinaten in Pixel oder Meter). Automatische Spiegelung für Gegnerteam: Team B (der Gegner) kann automatisch die Formation spiegeln, sodass die Relativanordnung gleich ist, aber auf der anderen Spielfeldhälfte. Spiegeln bedeutet, x wird zu 1.0 - x (Horizontalspiegelung an der Mittellinie), und evtl. bei asymmetrischen Formationen könnte man auch links/rechts tauschen (LM von Team A wird zu RM von Team B etc., je nachdem). Für symmetrische Formationen wie 4-4-2 Standard reicht meist die horizontale Spiegelung, da links/rechts analog vorhanden sind. Jeder Spieler wird mit einer Rolle aus der Formation initialisiert. Die Rolle bestimmt:
Grundposition: wo er in Formation steht, wenn keine besonderen Ereignisse sind (z.B. bei Anstoß, bei Verteidigungsformation).
Taktische Zone: wie zuvor beschrieben, meist abgeleitet aus der Formationsposition (z.B. ein Viereck um diese Grundposition, oder ein Segment des Feldes).
Entscheidungspräferenzen: wie aggressiv oder zurückhaltend die Rolle typischerweise ist. Ein Stürmer wird in Entscheidungslogik anders gewichtet (Offensivdrang, wenig Defensivaufgaben) als ein Verteidiger (Defensivpriorität). Diese Unterschiede kann man explizit codieren oder implizit aus der Position ableiten.
Spezielle Zuständigkeiten: z.B. wer führt Standards aus (vielleicht festlegen, dass LM und RM Ecken treten, STs Anstoß ausführen, etc. – kann in der Formation oder separat definiert sein).
Die Formation fungiert auch als Grundlage für das Positionsspiel. In der State-Machine-Phase FORMATION stellen sich die Spieler gemäß der Formation auf. Während des laufenden Spiels (RUNNING) dient die Formation als Referenz: Spieler orientieren sich daran, wo ihre Position ungefähr sein sollte, insbesondere wenn sie nicht direkt ins Geschehen eingreifen. Nach Ballverlust zum Beispiel "fallen alle in ihre Formation zurück", d.h. sie laufen grob in Richtung ihrer Grundposition, natürlich angepasst an die Situation. Bei Unterbrechungen (Einwurf, Freistoß, etc.) kehren die Spieler in formierte Aufstellungen zurück oder nehmen spezielle Aufstellungen ein (z.B. bei eigenem Eckball rücken die Innenverteidiger vielleicht mit nach vorne ins Strafraum des Gegners – solche Feinheiten können in Zukunft durch erweiterte Formations-/Taktikdefinitionen gesteuert werden).
Auswahl der Formation
Es sollte möglich sein, verschiedene Formationen auszuprobieren. Z.B. 4-4-2, 4-3-3, 3-5-2, etc. Da die Formationen aus JSON geladen werden, kann man zur Laufzeit oder beim Spielstart die Formation wählen. Für das initiale Setup wird wohl im Code festgelegt: Team A nutzt Formation X, Team B spiegelt sie oder nimmt Y. Eine einfache Umsetzung ist, beide Teams dieselbe Formation spiegelverkehrt nutzen zu lassen, um die KI erst mal gegeneinander fair antreten zu lassen. Später kann man Variation reinbringen. Die Formation kann auch im Spiel geändert werden (z.B. taktische Umstellung während der Partie). Dies würde bedeuten:
Spieler bekommen neue Zielpositionen (ggf. im Zustand TRANSITION oder in einer Spielunterbrechung).
Ihre Rollen und Zonen werden aktualisiert.
Möglicherweise muss man darauf achten, dass Trikottausch (nicht im Sinne von Kleidung, sondern wer nun welche Rolle übernimmt) korrekt gemanagt wird. Evtl. hat man pro Spieler eine feste Rolle, dann würde Formation wechseln bedeuten, dass Spieler andere Positionen einnehmen. Alternativ kann man Spieler an feste Positionsslots binden (z.B. Spieler1 ist immer linker Verteidiger, egal welche Formation – was bei Wechsel von 4-4-2 zu 3-5-2 kompliziert wird). Vermutlich bleibt im Projekt zunächst jeder Spieler an "seiner" Rolle aus der Startaufstellung.
Zusammenfassend bieten taktische Formationen den Rahmen, in dem die ganze KI agiert. Sie definieren die Grundordnung der Teams. Durch die in Formation verankerten Rollen bekommen wir automatisch die Parameter für die Bounded Intentions (wer gehört wohin) und können die Entscheidungsbäume daran ausrichten. Teams in unterschiedlichen Formationen werden sich spürbar anders verhalten (z.B. ein 4-3-3 hat mehr Spieler offensiv, die KI für Außenspieler wird häufiger Flanken in den Strafraum suchen, während ein 5-4-1 sehr defensiv dicht steht). Dieses Verhalten emergiert aus der Kombination von definierter Formation + den generellen Entscheidungsregeln.
Animation und Darstellung (render.js)
Die Komponente render.js ist verantwortlich für die grafische Darstellung des Spiels und dient sowohl dem visuellen Feedback für den Nutzer als auch als Hilfsmittel beim Debugging. Obwohl es sich "nur" um eine 2D-Darstellung handelt, legen wir Wert auf klare und informative Visualisierung, damit man das KI-Verhalten nachvollziehen kann. Wichtige Aspekte der Darstellung:
Spielfeld: Zu Beginn zeichnet render.js das Fußballfeld von oben (Top-Down-Ansicht). Dies beinhaltet den grünen Rasen-Hintergrund, Linienmarkierungen (Seitenlinien, Mittellinie, Strafräume, Mittelkreis, Torraum, Tore usw.). Maßstäbe sollten einigermaßen realistisch sein (z.B. Verhältnisse 105m x 68m in Pixel umgerechnet), damit Distanzen und Geschwindigkeiten optisch stimmig wirken.
Spieler: Jeder Spieler wird als Sprite oder einfache Form (z.B. Kreis oder kleines Männchen-Icon) dargestellt. Um Teams zu unterscheiden, erhalten sie verschiedene Farben (Team A z.B. blau, Team B rot) oder Trikots.
Zusätzlich wird die Ausrichtung des Spielers visualisiert: Dies kann durch einen kleinen Pfeil oder eine Linie am Kreisrand geschehen, der die aktuelle Blick-/Laufrichtung anzeigt. So sieht man, wohin ein Spieler gerade schaut bzw. läuft, was relevant ist für FOV und Passrichtung.
Optional kann man jedem Spieler eine ID oder Rückennummer geben, um sie bei Debugging klar auseinanderzuhalten.
Ball: Der Ball wird als kleiner Kreis oder Ball-Icon gezeichnet, deutlich sichtbar (z.B. weiße Farbe mit schwarzem Rand). Wenn der Ball frei ist, sieht man ihn an seiner Position rollen. Befindet er sich im Besitz eines Spielers, kann man ihn auf dem Spieler zeichnen (z.B. einen kleineren Ballpunkt nahe dem Spieler-Kreis) oder als an Spielerfuß positioniert (etwas vor dem Mittelpunkt des Spielers in Blickrichtung). Alternativ kann man auch einfach weiterhin den Ball an ball.x, ball.y zeichnen – wenn der Spieler in Ballbesitz ist, wird ball.x,y sowieso sehr nah an player.x,y sein.
Sichtkegel: Für Debugging-Zwecke (und ggf. optional einblendbar) zeichnet render.js die Field-of-View eines jeden Spielers als transparenten Kegel oder Dreieck vom Spieler aus. Beispielsweise ein leicht halbtransparenter gelber Kegel, der den Bereich markiert, den der Spieler sehen kann. Dies hilft zu verstehen, warum ein Spieler eine bestimmte Entscheidung trifft oder nicht trifft ("er konnte den Pass nicht spielen, weil der Mitspieler nicht im Sichtfeld war").
Ballbesitzanzeige: Irgendwie sollte ersichtlich sein, wer aktuell Ballbesitz hat. Möglichkeiten:
Den Spieler mit Ball optisch hervorheben, z.B. einen farbigen Ring um den Spieler anzeigen.
Oder den Ball symbolisch über dem Spieler schweben lassen o.ä.
Evtl. eine kleine Markierung über dem Kopf des Spielers (ähnlich wie in Computerspielen ein kleiner Pfeil).
Da wir ohnehin oft den Ball am Fuß zeigen, reicht der Ball-Draw eventuell schon aus, um Ballbesitz zu erkennen. Wenn der Ball auf dem Spieler gezeichnet wird, sieht man es direkt.
Aktionsanzeige: Um zu visualisieren, was ein Spieler gerade tut, kann man Text oder Symbole einblenden:
Beispielsweise könnte man über dem Spieler kurz das Wort "Schuss", "Pass", "Tackling" anzeigen, wenn diese Aktion startet (für Debugging).
Oder kleine Icons: ein kleines Fuß-Symbol für Schuss, ein Pass-Pfeil, ein Tackling-Sternchen etc.
Auch könnte man die aktuellen Zustände der Spieler farblich codieren (z.B. Spieler im Zustand VERTEIDIGT rot umrandet, im Zustand GREIFT_AN grün, in WARTET grau).
Solche Darstellungen helfen Entwicklern beim Feintuning, würden im finalen Spiel aber wohl ausgeblendet oder dezenter dargestellt.
Die Darstellung wird typischerweise pro Frame aktualisiert. Im render.js gibt es vermutlich eine Funktion render() oder draw() die von main.js aufgerufen wird. Sie geht alle Entitäten durch und zeichnet sie. Dabei wird das Spielfeld idealerweise zuerst gezeichnet, dann die Spieler, dann der Ball, sodass der Ball nicht unter Spielern "verschwindet" (wobei in Top-Down Sicht, wenn Spieler als Kreise gezeichnet sind, könnte der Ball manchmal unter dem Kreis liegen – hier evtl. Ball immer oben drauf rendern). Animation: Für eine 2D-Simulation werden wir keine extrem komplexen Animationssysteme haben, aber dennoch:
Laufanimation: Falls Sprites mit laufenden Figuren benutzt werden, würde render.js basierend auf Spielerspeed evtl. das Animationssprite wechseln (Schritte).
Schuss/Pass Animation: Evtl. ein einfaches Schwingen des Beines-Sprite, oder nur eine symbolische Darstellung wie oben erwähnt.
Tackling Animation: Könnte eine Grätschpose sein o.ä.
Torjubel: Bei einem Tor könnten Spieler kleine Jubelbewegungen bekommen, oder das Spiel könnte kurz eine Einblendung "Tor!" machen.
Zeitlupen/Highlights: sind future ideas, aber man könnte wie in echten Spielen bei besonderen Ereignissen kurzzeitig animieren (z.B. Kamera blinkt oder so, aber in 2D eher irrelevant).
Kamera/Perspektive: Da wir ein gesamtes Feld auf dem Screen darstellen (so die Annahme), brauchen wir keine Kamera, die mitgeht. Wenn doch das Feld größer ist als der Viewport, müsste render.js auch eine Kameraposition haben, die z.B. dem Ball oder dem aktiven Spieler folgt. Der Einfachheit halber nehmen wir aber an, dass das ganze Feld sichtbar ist (z.B. 800x600 px canvas und Feld skaliert rein). Zusätzlich könnte render.js an die GUI-Elemente andocken: z.B. oben den Spielstand anzeigen, Zeit etc. (siehe nächster Abschnitt). Bei der Implementierung kann HTML5 Canvas verwendet werden, wo render.js z.B.:
js
Kopieren
Bearbeiten
function render(gameState) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawField(); 
  players.forEach(p => drawPlayer(p));
  drawBall(ball);
  if (debugMode) {
    players.forEach(p => drawFOV(p));
  }
  drawScoreBoard();
}
Jede dieser draw-Funktionen kümmert sich um einen Aspekt. In drawPlayer(p) z.B. wird ein farbiger Kreis gemalt und ggf. ein kleiner Strich vom Mittelpunkt nach vorne (für Blickrichtung). Die grafische Darstellung soll nicht nur ansprechend sein, sondern auch das taktische Geschehen verdeutlichen. Durch Sichtkegel, Markierungen und Bewegung auf dem Feld kann man tatsächlich beobachten, ob die KI so agiert wie gedacht (stehen die Verteidiger auf einer Linie, rücken die Mittelfeldspieler nach, etc.). Diese Visualisierungen dienen dem Entwicklungsteam später als Kontrolle und können für Präsentationen genutzt werden, um das Innenleben der KI nachvollziehbar zu machen.
Regellogik und Spielmanagement
Neben der eigentlichen KI-Logik für Spieler braucht das Spiel grundlegende Regeln und ein Spielmanagement, um einen geordneten Match-Verlauf sicherzustellen. Dazu gehören die Behandlung von Spielunterbrechungen (Ausball, Tore, Fouls etc.), das Verwalten der Spielzeit und des Spielstands sowie Mechanismen, die außergewöhnliche Situationen auffangen.
Standardsituationen und Unterbrechungen
Es werden die gängigen Fußball-Spielunterbrechungen unterstützt. Das System erkennt bestimmte Bedingungen (Ball über Linie, Foul etc.) und löst entsprechende Standardsituationen aus. Folgende Szenarien werden betrachtet:
Einwurf: Wenn der Ball die Seitenlinie vollständig überschreitet (und zuvor zuletzt von einem Spieler berührt wurde), wird das Spiel unterbrochen. Die Mannschaft, die nicht zuletzt am Ball war, erhält einen Einwurf.
Umsetzung: Das Spiel wechselt in einen speziellen Zustand (ggf. TRANSITION oder einen Unterzustand "EINWURF"). Der Ball wird zu dem Punkt der Seitenlinie bewegt, wo er ausging. Ein Spieler der einwerfenden Mannschaft (typischerweise der dem Aus-Punkt nächstgelegene Spieler, oder per Rolle Außenverteidiger/Flügel) wird ausgewählt, den Einwurf auszuführen. Alle anderen Spieler stellen sich entsprechend auf (Gegner kommen nicht näher als 2m, etc., solche Feinheiten können abstrahiert werden).
Der Einwerfende kann den Ball dann manuell ins Feld werfen – in unserer Simulation kann man Einwurf wie einen speziellen Pass behandeln, der allerdings mit der Hand ausgeführt wird (physikalisch ähnliche Flugbahn wie ein kurzer hoher Pass).
Nach Ausführung wechselt der Zustand zurück zu RUNNING.
Eckball (Corner): Wenn der Ball über die Torauslinie (Grundlinie) ins Aus geht und zuletzt von einem Abwehrspieler berührt wurde (kein Tor), gibt es Eckstoß für das angreifende Team.
Umsetzung: Ähnlich dem Einwurf: Der Ball wird auf den Eckpunkt der entsprechenden Seite gelegt. Ein vorgesehener Spieler (z.B. der entsprechende Flügelspieler oder ein Standard-Schütze, falls definiert) tritt die Ecke. Die Angreifer postieren sich im Strafraum, Verteidiger decken sie. Nach dem Eckstoß (Ball berührt) Zustand -> RUNNING.
Es kann sinnvoll sein, für Ecken eine eigene Formation oder einfach alle Spieler ähnlich wie Formation aber näher am Tor zu positionieren (z.B. zwei auf kurzen Pfosten, etc. – aber das wäre Detail, eventuell nicht im ersten Wurf nötig).
Abstoß (Goal Kick): Wenn der Ball über die Torauslinie ins Aus geht und zuletzt vom angreifenden Team berührt wurde (kein Tor), gibt es Abstoß für das verteidigende Team.
Umsetzung: Der Ball wird auf den Abstoßpunkt (i.d.R. Fünfmeterraum / Torraumlinie) gelegt, meist mittig oder an der Seite wo er ins Aus ging. Der Torhüter oder ein Abwehrspieler führt den Abstoß aus (ein langer Pass nach vorn). Spieler der Gegenmannschaft müssen den Strafraum verlassen bis der Abstoß ausgeführt ist (Regeldetails – könnte man hier aber auch vereinfachen, indem man einfach alle Spieler positioniert wie bei Formation).
Nach Ausführen -> RUNNING.
Tor: Hat der Ball vollständig die Torlinie zwischen den Pfosten und unter der Latte überquert, zählt ein Tor (sofern nicht Abseits oder Foul - solche Dinge sind in unserer Simulation vermutlich zunächst ignoriert).
Umsetzung: Das Spiel wird unterbrochen (Zustand z.B. TRANSITION oder eigenes "TOR" Event). Ein Tor wird zum Scoreboard hinzugefügt. Die Spielzeit könnte kurz angehalten oder weiterlaufen je nach gewünschter Simulationsgenauigkeit (in echt läuft sie nach Tor weiter bis Anstoß, aber man könnte in der Simulation auch kurz anhalten).
Alle Spieler freuen sich oder ärgern sich (Animation optional). Danach begeben sich alle in Anstoß-Formation zurück: beide Teams stellen sich in ihrer Hälfte auf, Ball wird am Mittelpunkt platziert. Der nicht-torschießende Gegner hat Anstoß.
Spiel geht weiter im Zustand RUNNING sobald Anstoß ausgeführt wurde.
Foul & Freistoß (optional, falls implementiert): Wenn ein Spieler ein Regelverstoß begeht (z.B. Tackling von hinten, sehr harter Zusammenprall abhängig von Courage/Timing), könnte ein Foul erkannt werden.
Umsetzung: Spielunterbrechung, Ball ruht an Foulstelle (bzw. Freistoßort; bei Fouls nahe Strafraum ggf. Elfmeter – das wäre Sonderfall). Das gefoulte Team bekommt einen Freistoß. Mauer stellen etc. wäre sehr komplex, wahrscheinlich sparen wir das in MVP aus. Aber Kartenvergabe (siehe unten) könnte erfolgen.
Nach einer kurzen Unterbrechung führt ein Spieler (vielleicht der gefoulte oder ein Standard-Schütze) den Freistoß aus -> Ball wieder frei, weiter RUNNING.
All diese Unterbrechungen werden in der Game-State-Machine gehandhabt: Die Zustände FORMATION oder TRANSITION können jeweils verwendet werden, um diese Situationen abzubilden. Man könnte auch spezifischere Zustände wie "CORNER_SETUP", "GOALKICK_SETUP" etc. einführen, aber wahrscheinlich reicht ein allgemeiner Unterbrechungszustand, in dem man anhand der Ereignisart entscheidet, was zu tun ist. Während einer Unterbrechung (also nicht RUNNING) ist die Spieler-KI eingeschränkt: Spieler sollen sich dann nicht frei wie verrückt bewegen, sondern folgen dem Unterbrechungs-Skript (z.B. sich aufstellen). Daher könnte man im Code während z.B. eines Eckstoß-Setups die player.update() Logik so steuern, dass Spieler nur zu vorgegebenen Positionen laufen (bzw. formation-ähnlich) und nicht eigenständig Entscheidungen treffen, bis der Ball wieder freigegeben ist.
Spielzeit und Scoreboard
Das Spielmanagement umfasst auch die Verwaltung der Spielzeit, Tore und Karten:
Spielzeit: Üblicherweise 90 Minuten, aber in unserer Simulation können wir diese Zeit beschleunigt oder verkürzt darstellen. Wir halten eine Zeitvariable, z.B. game.time in Sekunden oder Millisekunden. Pro Frame wird sie erhöht, abhängig von der Simulations-Skalierung (Echtzeit oder schneller).
Die Zeit wird im UI dargestellt, typischerweise als MM:SS. Falls Halbzeiten gewollt sind, könnte man bei 45:00 eine Pause einbauen (z.B. State "HALFTIME" wo nichts passiert, oder die Teams tauschen die Seiten).
Am Ende (90:00) könnte das Spiel enden, es sei denn Unentschieden und man will Verlängerung (diese Feinheiten optional).
Scoreboard (Spielstand): Einfacher Zähler der Tore beider Teams. Jedes Team hat einen Namen oder zumindest "Team A / Team B". Nach einem Tor wird der Score aktualisiert (teamA.goals++ oder so). render.js zeichnet z.B. oben links "Team A [Tore] - [Tore] Team B".
Karten: Gelbe und rote Karten werden vergeben, wenn ein Spieler grob oder wiederholt gegen Regeln verstößt (falls Fouls implementiert).
Speicherung: Jeder Spielerobjekt könnte player.yellowCards count haben und player.redCard boolean.
Bei einem Foul entscheidet die Regellogik oder ein Schiedsrichter-Submodul, ob es Verwarnung (Gelb) oder Platzverweis (Rot) gibt.
Darstellung: Wenn eine Karte gegeben wird, könnte man kurz ein Karten-Icon über dem Spieler einblenden (z.B. gelbes Rechteck). Zudem könnte man im Scoreboard eine kleine Anzeige der Karten pro Team machen (z.B. "Gelbe: 2 - 1", "Rote: 0 - 0").
Effekt: Bei roter Karte müsste der Spieler evtl. vom Feld (d.h. er wird aus der Players-Liste entfernt oder markiert und nicht mehr aktiv). Das Team spielt dann mit einem weniger – was in der KI berücksichtigt werden sollte (Formation vielleicht adaptieren oder zumindest die Lücke bemerken).
Diese Detailtiefe können wir als zukünftige Erweiterung sehen, aber es war angedeutet ("Karten").
Teleporting-Fallback nach Timeouts
Ein wichtiger Aspekt für Stabilität ist der Fallback-Mechanismus, der eingreift, wenn etwas zu lange dauert oder schiefgeht. Im Fußball kann es Situationen geben, die in Echtzeit zwar normal sind (z.B. Spieler lässt sich Zeit bei Einwurf), aber in einer Simulation wollen wir unnötige Wartezeiten vermeiden, insbesondere wenn sie durch KI-Probleme entstehen. Das Konzept ist: Timeout-Überwachung für gewisse Phasen mit anschließendem Teleport-Fallback:
Während Formation/Unterbrechungsphasen könnte ein Timer mitlaufen. Beispiel: Bei einem Einwurf – wenn nach 5 Sekunden der Einwurf noch nicht ausgeführt wurde (vielleicht weil der Einwerfende KI-Spieler sich nicht korrekt positioniert hat oder feststeckt), greift das Fallback: Der Spieler oder der Ball wird kurzerhand teleportiert in eine korrekte Position. Z.B. Spieler direkt an die Seitenlinie, Ball in seine Hände, und dann wird der Einwurf ausgeführt. So hängt das Spiel nicht endlos.
Ebenso bei Auswechslung oder Verletzung (falls wir solche Dinge hätten), würde man nicht ewig warten.
Bei Formationsaufstellung (z.B. Start der Halbzeit): Wenn nach X Sekunden ein Spieler seine Position nicht erreicht (vielleicht Kollision mit anderem Spieler?), kann man ihn teleportieren direkt auf seine Position, damit der Anstoß erfolgen kann.
Auch im laufenden Spiel, falls ein seltener Physik-Bug passiert – z.B. Ball klemmt unentschieden zwischen zwei Spielern und bewegt sich nicht – könnte man nach einigen Sekunden Realzeit eingreifen (z.B. Schiedsrichter-Ball: Ballbesitz freigeben, Ball kurz hochwerfen). In Abwesenheit eines Schiri implementieren wir es pragmatisch: Teleportiere Ball einen Meter weiter, damit er frei ist.
Teleportation wird natürlich sparsam eingesetzt, da es visuell auffällig ist. Es ist wirklich nur ein Notnagel, damit die Simulation nicht steckenbleibt. Idealerweise loggen wir solche Vorkommnisse, um die KI weiter zu verbessern, sodass Fallbacks selten nötig sind. Zusammen mit dem Timeout-Fallback gibt es eventuell Reset-Optionen: Beispielsweise Tastendruck "R" könnte jederzeit alle Spieler in Ausgangsformation teleportieren und den Ball auf Mittelpunkt legen (zum schnellen Neustart bei Testläufen). All diese Spielmanagement-Funktionen sorgen dafür, dass aus der Ansammlung von KI-Spielern und Ball eine stimmige Fußball-Partie wird, die klaren Regeln folgt. Es stellt sicher, dass die Simulation vom Anpfiff bis zum Abpfiff durchläuft, Spielstände erfasst werden und keine unauflösbaren Situationen entstehen.
Fehlertoleranz und Debugging-Strategien
Bei der Entwicklung einer komplexen KI-Simulation wie dieser ist es unvermeidlich, auf unvorhergesehene Situationen und Bugs zu stoßen. Daher ist es wichtig, von Anfang an Fehlertoleranz einzubauen und effektive Debugging-Strategien zu nutzen, um Probleme zu erkennen und zu beheben. Einige der bereits identifizierten oder diskutierten Problemfälle und Lösungen dafür:
Spieler "sehen" den Ball nicht
Ein Problem aus ersten Experimenten war, dass Spieler manchmal den Ball sprichwörtlich nicht gesehen haben – z.B. wenn der Ball hinter ihnen war oder schnell an ihnen vorbeiging. Dafür haben wir das Memory-System (Gedächtnis) eingeführt, wie oben beschrieben. Sollte es dennoch vorkommen, dass ein Spieler offensichtlich nicht auf den Ball reagiert, obwohl er sollte, prüfen wir:
FOV-Einstellungen: Ist der Sichtkegel vielleicht zu eng oder kurz? Eventuell justieren wir den Winkel oder die Sichtdistanz nach, wenn es unplausibel wirkt (z.B. ein Spieler ignoriert einen Ball, der eigentlich in seinem peripheren Sichtfeld sein müsste).
Memory-Timeouts: Vielleicht vergisst ein Spieler den Ball zu früh. Wir können die Dauer erhöhen, wie lange ein zuletzt gesehener Ball im Gedächtnis bleibt.
Kommunikation/Teamawareness: In der Realität rufen Spieler sich zu ("Man on!", "Achtung hinter dir!"). Unsere KI hat kein echtes Sprachsystem, aber man könnte implizit machen, dass wenn ein Spieler den Ball sieht, den ein anderer nicht sieht, und es relevant ist, eine Art Info-Sharing stattfindet. Das wäre komplex, doch eventuell reagieren wir auf global bekannte Zustände: z.B. alle wissen, wenn der Gegner Ballbesitz hat, auch wenn sie ihn nicht direkt sehen – sie verfallen dann in Defensive.
Zum Debugging dessen empfiehlt sich:
Visualisierung: Die Sichtkegelanzeige (wie in Render vorgesehen) zeigt deutlich, ob ein Spieler den Ball hätte sehen müssen oder nicht.
Logging: Man kann bei jedem Entscheidungszyklus loggen: console.log(player.name + " sieht Ball: " + seesBall + ", lastSeen vor " + dt + "ms") etc., um nachzuvollziehen, warum er nicht reagiert.
Endlosschleifen oder festgefahrene Zustände
Es kann passieren, dass ein Spieler oder sogar das ganze Spiel in einer Art Endlosschleife hängen bleibt. Beispiel: Zwei Spieler laufen immer im Kreis umeinander, weil jeder auf den anderen reagiert (wie Deadlock), oder ein Spieler wartet auf einen Ball, der aber nie kommt, etc. Für solche Fälle nutzen wir:
Timeouts mit Zustandswechsel: Wie im Spielmanagement erwähnt, setzen wir bei gewissen Aktionen eine maximale Dauer. Wenn diese überschritten ist, wird automatisch eine Lösung forciert. Z.B. Spieler teleportieren, Freistoß trotzdem ausführen, etc.
Zufall einstreuen: Manchmal kann stures deterministisches Verhalten zu Schleifen führen. Ein wenig Noise hilft: z.B. wenn zwei Spieler beide auf einen freien Ball zulaufen, könnte ein Mechanismus greifen, dass einer zufällig leicht verzögert oder abbricht ("Zögerung"), um nicht exakt das Gleiche zu tun.
Zustands-Fallbacks: Jeder Spieler hat ggf. einen Standardzustand. Wenn er z.B. 5 Sekunden lang keine neue Entscheidung getroffen hat (vielleicht weil er immer eine Bedingung nicht erfüllt und in einer Art Idle mit Ball steht), kann man ihn zwingen: "triff jetzt irgendwas, notfalls schieß den Ball weg". Solche Fallbacks kann man in decision-rules.js einbauen, die nach einer Weile greifen. Das garantiert, dass es immer weiter geht.
Debugging-Werkzeuge
Um die KI effektiv zu entwickeln, sollten wir verschiedene Debug-Hilfen nutzen:
Visuelle Overlays: Wie bereits in Render erläutert: Sichtkegel, Aktionstexte, vielleicht Linien für Pässe (wenn ein Pass gespielt wird, zeichne eine Linie vom Passgeber zum Ziel – so kann man sehen, ob der Weg frei war). Auch könnte man Markierungen zeichnen, wenn ein Spieler einen anderen deckt (Linie zwischen Verteidiger und Stürmer).
Zeitlupe/Pause: Möglichkeiten, das Spiel langsamer ablaufen zu lassen oder zu pausieren und frameweise weiterzuschalten. In einem Debug-Modus könnte man z.B. main.js nur auf Tastendruck den nächsten Frame berechnen lassen. So kann man in Ruhe Inspektion machen.
Konsolenausgaben/Logging: Gezieltes Logging der Entscheidungsfindung, z.B.:
"Player 5 decision: TACKLE (cooldown=0, distance=1.2m)"
"Player 7 pass to Player 9 (open? true)"
Solche Logs, am besten konditional (nur im Debug-Modus, damit Performance im Normalbetrieb nicht leidet), helfen bei Nachanalyse.
Replay/State Dump: In späteren Phasen evtl. Möglichkeit, ein Problem zu reproduzieren. Ein deterministischer Ablauf und die Möglichkeit den Random-Seed festzulegen, wäre hilfreich – so kann man einen beobachteten Bug (z.B. ein immer wieder verschwindender Ball in 65. Minute) erneut abspielen und untersuchen.
Fehlertoleranz im Spielbetrieb
Auch während normalem Spiel sollte das System robust sein:
Wenn z.B. ein ungültiger Zustand erkannt wird (Ball.owner zeigt auf einen Spieler, aber Ball ist weit weg von ihm), kann man korrigierend eingreifen: Den Ball zum Spieler teleportieren oder owner auf null setzen, je nachdem, was logisch passt. Solche Korrekturen kann man als Sicherheit in update() einbauen: "if ball.owner != null and distance(ball, ball.owner) > TOLERANZ -> ball.owner = null (Ball löst sich, anscheinend verlorener Ball)".
Physik-Clamps: Falls Koordinaten mal NaN oder unendlich werden (durch einen Fehler in Berechnung), sollte man das abfangen. Ein schneller Fix könnte sein, solche Werte zu erkennen und zu resetten (z.B. Position auf Feldmittelpunkt setzen, mit Log-Meldung).
KI-Aussetzer: Wenn ein Spieler aus irgendeinem Grund mal keine sinnvolle Entscheidung trifft (z.B. alle Optionen in Code gehen auf else ohne Aktion), sollte er nicht einfach gar nichts tun und stehen bleiben (außer das ist im Kontext gewollt). Ein Notfallverhalten könnte sein: "geh zurück in Formation". So hat er zumindest etwas zu tun.
Die Kombination aus designter Fehlertoleranz und systematischem Debugging stellt sicher, dass wir schrittweise die gröbsten Schnitzer ausmerzen. Gerade bei einem so komplexen System muss man iterativ vorgehen: Erst Basisfunktionen (laufen, passen, schießen) stabil hinbekommen, dann taktisches Verhalten, dann Sonderfälle. Dank der debug-Visualisierungen können wir immer überprüfen: Warum hat Spieler X das jetzt gemacht? und die Antwort oft direkt auf dem Bildschirm sehen (z.B. "ah, er hat den Ball nicht gesehen, weil Sichtkegel"). Ziel ist, am Ende ein robustes Spiel zu haben, das auch unter ungewöhnlichen Umständen sinnvoll reagiert, statt abzubrechen. Und falls es doch mal hakt, greifen die beschriebenen Mechanismen, um weiterzumachen.
Zukünftige Erweiterungen
Das hier beschriebene Design legt den Grundstein für ein spannendes KI-Fußballspiel. Darüber hinaus gibt es zahlreiche Möglichkeiten, das Projekt in Zukunft zu erweitern und zu verbessern:
- [ ] Übergang zu 3D: Eine naheliegende Erweiterung ist, von der 2D-Top-Down-Darstellung in eine 3D-Umgebung zu wechseln. Dies würde erheblich aufwändigere Grafiken und Animationen mit sich bringen, eröffnet aber neue Möglichkeiten:
- [ ] 3D-Engine und Kamera: Integration einer Engine (Unity, Unreal oder WebGL-basiert) könnte realistisches Stadion, Spieler in 3D-Modellen und dynamische Kamera-Perspektiven bringen.
- [ ] 3D-Spieleranimationen: Verwendung von echten Bewegungsanimationen (Laufen, Schießen, Grätschen) für bessere Visualisierung. Die KI-Logik bliebe ähnlich, müsste aber eventuell feiner mit Animationsstates synchronisiert werden (z.B. eine Schuss-Entscheidung triggert eine Schussanimation und erst wenn Bein schwingt, bewegt sich der Ball).
- [ ] Z-Achse für Ball: Flugbälle, Kopfbälle etc. würden eingeführt. Spieler müssten Timing für Sprünge haben, Kopfball-Duelle, etc.
- [ ] Physik-Engine für Ball und Spieler: In 2D haben wir einfache Physik, aber man könnte eine Bibliothek wie Box2D (für 2D) oder PhysX/Bullet (in 3D) einbinden.
- [ ] Ballrotation und Effet: Mit einer Physik-Engine ließen sich Effet-Schüsse simulieren – also Bananenflanken, Freistöße mit Unterschnitt, oder Knuckleballs (Bälle ohne Rotation, die flatternd fliegen). Dazu müsste man dem Ball einen Spin-Wert geben und die Physik entsprechend erweitern (Magnus-Effekt in 2D ist schwierig darzustellen, in 3D besser).
- [ ] Kollisionsphysik: Spieler und Ball könnten komplexer interagieren (Ball prallt vom Spieler ab, Abfälschen, Zweikampf mit Körperphysik). Dies erhöht Realismus, aber erfordert robustes Handling, damit KI nicht unvorhersehbar wird.
- [ ] Verbesserte KI durch Machine Learning: Bisherige Logik ist regelbasiert. In Zukunft könnte man Machine-Learning-Methoden einsetzen:
- [ ] Reinforcement Learning: Trainiere KI-Agenten in der Soccer-Simulation wie in der RoboCup 2D Liga. Das wäre ein großes Unterfangen, aber könnte zu sehr menschlich wirkenden Strategien führen.
- [ ] Neuroevolution: Evolutionäre Algorithmen zur Optimierung von Entscheidungsparametern (z.B. Feinjustierung, wann passen vs. schießen).
- [x] Behaviour Trees: Um komplexere Handlungsabfolgen zu managen, könnten wir von simplen Entscheidungsbäumen auf Behavior Trees oder Goal-Oriented Action Planning (GOAP) umstellen. Diese sind flexibler, vor allem wenn die Anzahl möglicher Aktionen steigt.
- [ ] Multiplayer-Modus: Aktuell steuert die KI beide Teams. Ein zukünftiges Feature wäre, Spieler von Menschen steuern zu lassen:
- [ ] Lokaler Multiplayer: Zwei Spieler am selben Rechner, jeder mit einem Gamepad, steuern entweder jeweils einen Spieler (z.B. nur den Stürmer) oder gar das gesamte Team (durch Spielerwechsel wie bei FIFA). Die restlichen Spieler würden von der KI gesteuert bleiben (wie ein Koop-Modus mit der KI).
- [ ] Online Multiplayer: Netzwerkfunktion, wo zwei Spieler über Internet gegeneinander spielen. Das erfordert Synchronisation, Prediction etc., eine erhebliche Erweiterung der Architektur.
- [ ] Hotseat/Coach: Alternativ könnten Spieler auch in Trainer-Rolle agieren, siehe Coach-KI.
- [x] Gamepad-Integration und manuelle Kontrolle: Auch im Singleplayer könnte man ermöglichen, dass der Nutzer einzelne Spieler selbst steuert:
- [x] Dazu braucht es eine Mechanik zum Umschalten des aktiven Spielers (z.B. derjenige dem Ball am nächsten ist oder per Knopfdruck).
- [x] Die KI würde für den aktiv gesteuerten Spieler aussetzen, während der Nutzer lenkt. Alle anderen KI bleiben wie gehabt.
- [x] Das Input-Handling müsste in main.js oder separat eingebunden werden und dann player.controlledByUser = true für den gewählten Spieler setzen, woraufhin in player.update() bei diesem evtl. nur die vom Controller vorgegebenen Bewegungen ausgeführt werden.
- [x] Ziel ist ein fließendes Zusammenspiel aus KI und menschlichem Einfluss, was dem Spielspaß dient.
- [x] Coach-KI und Taktikmodul: Bisher reagiert die KI eher kurzfristig (pro Spieler-Entscheidungen). Ein Coach-Modul könnte höhere Ebene steuern:
- [x] Taktikanpassung: Je nach Spielverlauf (z.B. Rückstand kurz vor Ende) befiehlt der Coach der KI, offensiver zu stehen (Formation weiter nach vorne schieben, mehr Pressing) oder bei Führung defensiver (alle ziehen sich zurück).
- [ ] Wechsel: Coach-KI entscheidet, Spieler auszutauschen (wenn wir einen Kader hätten), z.B. bei Erschöpfung oder taktisch (großer Stürmer rein in Minute 80 für lange Bälle).
- [ ] Formation Switch: Dynamisch während des Spiels die Formation ändern (z.B. von 4-4-2 auf 3-4-3 in der Schlussphase).
- [ ] Gegneranalyse: Coach-KI könnte erkennen "gegnerische rechte Seite ist schwach" und anweisen, mehr Angriffe über links zu fahren (was dann die Spieler-KI in ihrer Entscheidungsgewichtung berücksichtigen müsste).
- [x] Kommunikationssystem: Coach-KI sendet taktische Befehle an Spieler
- [x] Diese Sachen sind sehr komplex, aber auch schon kleine Elemente (z.B. Pressing-Level hoch/runter je nach Befehl) können das Spiel abwechslungsreicher machen.
- [ ] Weitere Regeln und Details: Um näher an echten Fußball zu kommen, könnte man sukzessive weitere Regeln implementieren:
- [ ] Abseits: Sehr schwieriges Thema KI-technisch, aber für Realismus eine große Komponente. Man bräuchte Linienrichter-Logik und KI-Spieler müssten Abseitsfallen stellen oder Offensivspieler sich an der Abseitslinie bewegen.
- [ ] Injuries (Verletzungen): Spieler könnte sich verletzen bei harten Fouls oder hoher Belastung -> Austausch nötig, Leistungsminderung.
- [x] Wetterbedingungen: Regen (rutschiger Boden, Ball schneller?), Wind (Beeinflusst Ballflug in 3D).
- [x] Schiedsrichter-KI: Ein Referee-Agent, der Fouls pfeift, Vorteil abwartet, Karten gibt. (Aktuell würden wir Fouls automatisch sanktionieren, aber ein Schiri-Agent wäre interessant).
- [ ] Audio & Präsentation:
 - [x] Hinzufügen von Publikumssound, Stadionatmosphäre. Torjubel, Pfiffe etc.
- [x] Kommentator-KI: Ein System, das das Spielgeschehen in Worte fasst ("Ein wunderschöner Pass in die Tiefe... Schuss... Tooor!").
- [x] Menüs, Einstellungen: Benutzeroberfläche, um Formationen zu wählen, Schwierigkeitsgrade (KI-Stärke via Attributen skalieren), Halbzeitlänge etc.
- [x] Optionale Debug-Overlays je Spieler: Laufrichtung per Pfeil darstellen
- [x] Optionale Debug-Overlays je Spieler: Kopf- bzw. Blickrichtung zeigen
- [x] Behavior Tree weiter ausbauen und feingranulare Knoten hinzufügen
Die genannten Erweiterungen haben unterschiedliche Schwierigkeitsgrade – einige sind relativ einfach (Gamepad einlesen und Spieler steuern), andere sehr komplex (Abseits, ML-gelernte KI). Das modulare Design des aktuellen Systems soll aber ermöglichen, Stück für Stück solche Features zu integrieren. Wichtig ist, eine stabile Basis zu haben (und die haben wir mit dieser Architektur skizziert), auf der man aufbauen kann, ohne alles umwerfen zu müssen. Zum Abschluss festgehalten: Dieses Design-Dokument bietet eine umfassende Grundlage für die Entwicklung des KI-gesteuerten 2D-Fußballsimulationsspiels. Klar definierte Module, realitätsnahe Annahmen und Mechanismen zur Fehlertoleranz sorgen dafür, dass das Entwicklerteam – jetzt und in Zukunft – das Projekt effizient umsetzen und erweitern kann. Jeder Aspekt, vom Bewegungsverhalten über die KI-Entscheidungsregeln bis hin zur Darstellung und Regelabwicklung, wurde unter dem Gesichtspunkt der Authentizität und Nachvollziehbarkeit ausgearbeitet. Mit diesem Briefing können alle Beteiligten ein gemeinsames Verständnis der Zielsetzung und Herangehensweise entwickeln, um schließlich ein überzeugendes Fußballsimulationserlebnis zu schaffen.
