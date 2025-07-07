// traitConfig.js - Player Trait System Configuration
// Defines specialized player archetypes with stat bonuses and penalties

export const TraitProfiles = {
  // ===== ATTACKING TRAITS =====
  sniper: {
    name: "Sniper",
    description: "Deadly finisher with exceptional shooting accuracy",
    bonuses: {
      shootingAccuracy: +0.20,
      shootingPower: +0.10,
      vision: +0.05
    },
    penalties: {
      tacklingSkill: -0.15,
      fitness: -0.05
    },
    color: "#ff4444"
  },

  playmaker: {
    name: "Playmaker", 
    description: "Creative midfielder with exceptional passing ability",
    bonuses: {
      passingAccuracy: +0.20,
      vision: +0.15,
      intelligence: +0.10,
      technique: +0.05
    },
    penalties: {
      topSpeed: -0.10,
      tacklingSkill: -0.05
    },
    color: "#44ff44"
  },

  speedster: {
    name: "Speedster",
    description: "Lightning-fast winger with explosive pace",
    bonuses: {
      topSpeed: +0.25,
      acceleration: +0.20,
      dribblingSkill: +0.10
    },
    penalties: {
      shootingPower: -0.10,
      tacklingSkill: -0.15
    },
    color: "#ffff44"
  },

  technician: {
    name: "Technician",
    description: "Skillful player with exceptional ball control",
    bonuses: {
      technique: +0.20,
      dribblingSkill: +0.15,
      passingAccuracy: +0.10,
      balance: +0.10
    },
    penalties: {
      athleticism: -0.10,
      tacklingSkill: -0.05
    },
    color: "#ff44ff"
  },

  // ===== DEFENSIVE TRAITS =====
  wall: {
    name: "Wall",
    description: "Defensive stalwart with exceptional tackling ability",
    bonuses: {
      tacklingSkill: +0.25,
      mentality: +0.15,
      balance: +0.10,
      fitness: +0.05
    },
    penalties: {
      acceleration: -0.10,
      dribblingSkill: -0.15
    },
    color: "#4444ff"
  },

  interceptor: {
    name: "Interceptor",
    description: "Intelligent defender who reads the game perfectly",
    bonuses: {
      awareness: +0.20,
      vision: +0.15,
      intelligence: +0.15,
      tacklingSkill: +0.10
    },
    penalties: {
      shootingPower: -0.15,
      topSpeed: -0.05
    },
    color: "#44ffff"
  },

  sweeper: {
    name: "Sweeper",
    description: "Mobile defender with good distribution",
    bonuses: {
      passingAccuracy: +0.15,
      awareness: +0.15,
      tacklingSkill: +0.10,
      topSpeed: +0.05
    },
    penalties: {
      shootingAccuracy: -0.10,
      dribblingSkill: -0.05
    },
    color: "#8844ff"
  },

  // ===== PHYSICAL TRAITS =====
  engine: {
    name: "Engine",
    description: "Tireless workhorse with exceptional stamina",
    bonuses: {
      fitness: +0.25,
      stamina: +0.20,
      workrate: +0.15,
      mentality: +0.10
    },
    penalties: {
      shootingPower: -0.10,
      technique: -0.05
    },
    color: "#ff8844"
  },

  powerhouse: {
    name: "Powerhouse",
    description: "Physical specimen with raw athletic ability",
    bonuses: {
      athleticism: +0.20,
      shootingPower: +0.15,
      tacklingSkill: +0.10,
      balance: +0.10
    },
    penalties: {
      technique: -0.10,
      vision: -0.05
    },
    color: "#ff4488"
  },

  // ===== MENTAL TRAITS =====
  leader: {
    name: "Leader",
    description: "Natural captain who inspires teammates",
    bonuses: {
      mentality: +0.20,
      awareness: +0.15,
      intelligence: +0.15,
      vision: +0.10
    },
    penalties: {
      topSpeed: -0.05,
      acceleration: -0.05
    },
    color: "#ffaa44"
  },

  clutch: {
    name: "Clutch",
    description: "Performs best under pressure in crucial moments",
    bonuses: {
      mentality: +0.25,
      shootingAccuracy: +0.15,
      passingAccuracy: +0.10,
      balance: +0.10
    },
    penalties: {
      fitness: -0.10,
      workrate: -0.05
    },
    color: "#aa44ff"
  },

  // ===== SPECIALIST TRAITS =====
  goalkeeper: {
    name: "Goalkeeper",
    description: "Specialized shot-stopper with unique abilities",
    bonuses: {
      reaction: +0.30,
      awareness: +0.20,
      mentality: +0.15,
      balance: +0.15
    },
    penalties: {
      topSpeed: -0.20,
      dribblingSkill: -0.25
    },
    color: "#44aa88"
  },

  setpiece: {
    name: "Set Piece Specialist",
    description: "Master of free kicks and corner kicks",
    bonuses: {
      technique: +0.25,
      shootingAccuracy: +0.20,
      passingAccuracy: +0.15,
      intelligence: +0.10
    },
    penalties: {
      tacklingSkill: -0.15,
      athleticism: -0.05
    },
    color: "#88aa44"
  }
};

// Helper function to get trait by name
export function getTraitProfile(traitName) {
  return TraitProfiles[traitName] || null;
}

// Get all available trait names
export function getAllTraitNames() {
  return Object.keys(TraitProfiles);
}

// Get traits by category
export function getTraitsByCategory() {
  return {
    attacking: ['sniper', 'playmaker', 'speedster', 'technician'],
    defensive: ['wall', 'interceptor', 'sweeper'],
    physical: ['engine', 'powerhouse'],
    mental: ['leader', 'clutch'],
    specialist: ['goalkeeper', 'setpiece']
  };
}

// Calculate total trait impact on a stat
export function calculateTraitImpact(traitName, statName) {
  const trait = getTraitProfile(traitName);
  if (!trait) return 0;
  
  const bonus = trait.bonuses[statName] || 0;
  const penalty = trait.penalties[statName] || 0;
  return bonus + penalty;
}

// Validate trait configuration
export function validateTraitConfig() {
  const issues = [];
  
  for (const [traitName, trait] of Object.entries(TraitProfiles)) {
    if (!trait.name || !trait.description) {
      issues.push(`Trait ${traitName} missing name or description`);
    }
    
    if (!trait.bonuses || !trait.penalties) {
      issues.push(`Trait ${traitName} missing bonuses or penalties`);
    }
    
    // Check for extreme values
    const allValues = [...Object.values(trait.bonuses || {}), ...Object.values(trait.penalties || {})];
    if (allValues.some(val => Math.abs(val) > 0.5)) {
      issues.push(`Trait ${traitName} has extreme stat modifications (>0.5)`);
    }
  }
  
  return issues;
}

// Get random trait for testing
export function getRandomTrait() {
  const traitNames = getAllTraitNames();
  return traitNames[Math.floor(Math.random() * traitNames.length)];
}
