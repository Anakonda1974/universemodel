🧭 Leitfaden — Formation × Behavior Tree × Skill
Ziel: Jeder Spieler soll

seine Rolle in der Formation wahren,

situationsabhängig (Ball, Pressing, Spielstand …) abweichen dürfen und

dabei individuelle Stärken/Schwächen (Skill-Profile) ausspielen.

1 | Ebenen-Architektur
mathematica
Kopieren
Bearbeiten
┌────────────┐
│  COACH AI  │      (Taktische Umschalt-Trigger: Pressing, Risk, Shape …)
└─────┬──────┘
      ▼
┌────────────┐   Formation-Engine  ➜  dynamische Ziel-Zonen  (rx/ry, centerX/Y)
│ Formation  │
└─────┬──────┘
      ▼
┌────────────┐   Behavior Tree  ➜  Aktion (shoot, pass, press, hold …)
│   Player   │
└─────┬──────┘
      ▼
┌────────────┐   Low-Level Motion  ➜  Interpolation, Kollision, Stamina
│  Motorik   │
└────────────┘
Coach AI (Team-Ebene) setzt Pressing-Level, taktische Phase, Formation

Formation-Engine berechnet pro Spieler eine dynamische Ellipse/Rect

Inputs: Formations-Spot + Ball-Distanz + Pressing

Behavior Tree entscheidet innerhalb dieser Zone, wohin und was

Skill beeinflusst: Auswahl­wahrscheinlichkeit, Entscheidungs­intervall, Risikobereitschaft

Motorik führt Bewegung aus (Speed, Turn-Rate, Stamina-Drain)

2 | Dynamische Zonen
Formel: zone = f(role, formationX/Y, ballPos, pressing)

Basiskern = formationX/Y (Grundordnung)

Ball-Pull = Interpolate( formation, ball, factor )

factor skaliert mit Awareness-Skill (kluger Spieler rückt früher)

Pressing = Zone-Radii ÷ Pressing-Level (hohes Pressing → kleinere Ellipse)

Confidence = guter Spieler bekommt + 20 % Puffer nach vorne/außen

js
Kopieren
Bearbeiten
const awareness = player.derived.awareness;          // 0..1
const press     = coach.pressing;                    // 0.5..2
const center    = interpolate(formation, ball, 0.1 + 0.1*awareness);
const radii     = computeEllipseRadii(role, press);
if (player.skill.dribbling > 0.7) radii.rx *= 1.2;   // Offensivkünstler
3 | Behavior-Tree Integration
Grund-Skeleton
txt
Kopieren
Bearbeiten
Selector
├─ Condition(player.stamina < 0.3)  →  restInZone
├─ Sequence(hasBall)
│   ├─ Selector
│   │   ├─ canShoot   →  shoot()
│   │   ├─ canPass    →  pass(bestMate)
│   │   └─ dribbleIntoSpace
│   └─ fallbackHold
├─ Sequence(isClosestToBall && skill.sprint>0.6) →  chaseBall
└─ holdFormation
Skill-Hooks
SkillWo einbauenEffekt
VisionfindBestPass()Weitet Suchkegel / erhöht Scoring
TechniquecanShoot / shoot()Größerer Schuss-Radius, Spin, Genauigkeit
StaminaCondition zur AktionLow Stamina → Presse seltener
AwarenessUpdate-IntervallreactionInterval = base * (1 - awareness*0.6)

Entscheidungsfrequenz: Besserer Awareness → schnellere Ticks → flüssigere Reaktion.

4 | Kombi-Regeln „Zone first, Tactic second“
Jede BT-Action ruft boundedIntent() auf
→ clamp zu getDynamicZone() (außer allowOutside=true bei Press/Tackle).

allowOutside‐Radius abhängig von Skill + Phase

Verteidiger mit tacklingSkill > 0.8: +30 px

Coach-Events (z. B. Gegenpressing) dürfen pressing+=0.5 pushen
→ Zonen schrumpfen sofort, BT bleibt ungeändert.

5 | Skill-basierter Risikoregler
js
Kopieren
Bearbeiten
function shouldAttemptRiskyPass(player) {
  const base = 0.2;                     // 20 % Grundrisiko
  return Math.random() < base + player.derived.passingAccuracy*0.5;
}
In BT-Pass-Node: nur, falls shouldAttemptRiskyPass() true.

Schlechter Passer hält Ball → dribbelt oder back-pass.

6 | Testing-Matrix
SzenarioErwartung
Kick-offSpieler exakt auf Formation-Spots
Ball links außen, Pressing 1.5LF/LV Zone verschiebt sich ~ +25 px, IV kaum
Müder DM (<30 % stamina)bleibt in Zone, vermeidet Press
High-Skill STweitet eigene Zone Richtung Tor, versucht Risk-Pass/Schuss öfter

Nutze das Debug-Overlay:

Ellipse = Zone, Punkt = Target, Farbe = Action

Heatmap nach Hz1 prüfen → sollten ~80 % in Zone liegen

7 | Schritt-für-Schritt Umsetzung
getDynamicZone() skill-aware machen (Awareness, Pressing).

BT-Actions alle durch boundedIntent() leiten.

Clamp-Logik: default strict, allowOutside nur für chase/press/tackle.

Skill-Weighting-Helpers (risk, shootRadius, staminaGate) zentral anlegen.

Coach-API: coach.setPressing(level) + coach.setPhase("offense").

Debug-Tools an: showZones + showTargets, Heatmaps.

Testmatrix durchspielen, Parameter feinjustieren.

Fazit
Formation liefert Positions-Rahmen,
Behavior-Tree füllt ihn situativ aus,
Skill moduliert Freiheitsgrad + Entscheidungs​häufigkeit.

So bekommst du ein glaubwürdiges, taktisch sauberes, aber dennoch individuelles Spielerverhalten.
