export type Role =
  | "TW" | "IV" | "LIV" | "RIV" | "LV" | "RV"
  | "DM" | "ZM" | "OM" | "LM" | "RM"
  | "LF" | "RF" | "LS" | "RS" | "MS" | "ST";

export interface FormationPlayer {
  x: number;
  y: number;
  role: Role;
  style?: string;
}

export interface Formation {
  name: string;
  description?: string;
  players: FormationPlayer[];
}

export interface ZoneCfg {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export interface ZoneRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const DEFAULT_ROLE_CONFIG: Record<Role, ZoneCfg> = {
  TW: { width: 100, height: 150, offsetX: -300, offsetY: 0 },
  IV: { width: 140, height: 200, offsetX: -150, offsetY: 0 },
  LIV: { width: 140, height: 200, offsetX: -150, offsetY: 0 },
  RIV: { width: 140, height: 200, offsetX: -150, offsetY: 0 },
  LV: { width: 135, height: 220, offsetX: -120, offsetY: 0 },
  RV: { width: 135, height: 220, offsetX: -120, offsetY: 0 },
  DM: { width: 170, height: 210, offsetX: -80, offsetY: 0 },
  ZM: { width: 250, height: 250, offsetX: 0, offsetY: 0 },
  OM: { width: 250, height: 250, offsetX: 0, offsetY: 0 },
  LM: { width: 200, height: 300, offsetX: 0, offsetY: -150 },
  RM: { width: 200, height: 300, offsetX: 0, offsetY: 150 },
  LF: { width: 200, height: 180, offsetX: 100, offsetY: -80 },
  RF: { width: 200, height: 180, offsetX: 100, offsetY: 80 },
  LS: { width: 180, height: 150, offsetX: 160, offsetY: -40 },
  RS: { width: 180, height: 150, offsetX: 160, offsetY: 40 },
  MS: { width: 180, height: 150, offsetX: 160, offsetY: 0 },
  ST: { width: 180, height: 150, offsetX: 160, offsetY: 0 },
};

export type ZoneOverride = Partial<Record<Role, Partial<ZoneCfg>>>;

export const FORMATION_ZONE_CONFIGS: Record<string, ZoneOverride> = {};

export function mergeZones(
  base: Record<Role, ZoneCfg>,
  override?: ZoneOverride
): Record<Role, ZoneCfg> {
  if (!override) return { ...base };
  const result: Record<Role, ZoneCfg> = { ...base };
  for (const role of Object.keys(override) as Role[]) {
    result[role] = { ...result[role], ...override[role]! };
  }
  return result;
}

export function loadFormations(json: string): Formation[] {
  const data = JSON.parse(json);
  if (!Array.isArray(data)) throw new Error("invalid formation data");
  return data.map((f) => {
    if (!Array.isArray(f.players)) throw new Error("invalid players array");
    return {
      name: String(f.name),
      description: f.description ? String(f.description) : undefined,
      players: f.players.map((p: any) => ({
        x: Number(p.x),
        y: Number(p.y),
        role: p.role as Role,
        style: p.style ? String(p.style) : undefined,
      })),
    } as Formation;
  });
}

export interface DynamicWorld {
  ball?: { x: number; y: number } | null;
}

export interface DynamicPlayer {
  formationX: number;
  formationY: number;
  role: Role;
  side: "home" | "away";
}

export function getDynamicZone(
  player: DynamicPlayer,
  world: DynamicWorld,
  cfg: Record<Role, ZoneCfg> = DEFAULT_ROLE_CONFIG
): ZoneRect {
  const base = cfg[player.role];
  const centerX = world.ball ? world.ball.x : player.formationX;
  const centerY = world.ball ? world.ball.y : player.formationY;
  const sign = player.side === "home" ? 1 : -1;
  const x = centerX + base.offsetX * sign - base.width / 2;
  const y = centerY + base.offsetY - base.height / 2;
  return { x, y, width: base.width, height: base.height };
}

export interface SpawnedPlayer extends FormationPlayer {
  formationX: number;
  formationY: number;
  color: string;
}

export function spawnPlayers(
  formation: Formation,
  side: "home" | "away",
  color = side === "home" ? "blue" : "red"
): SpawnedPlayer[] {
  return formation.players.map((p) => ({
    ...p,
    formationX: side === "home" ? p.x : 1050 - p.x,
    formationY: p.y,
    color,
  }));
}
