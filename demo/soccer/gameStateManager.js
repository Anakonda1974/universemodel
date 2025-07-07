// gameStateManager.js - FIFA Rules Implementation
import { logComment } from './commentary.js';

export class GameStateManager {
  constructor(onGameEvent) {
    this.onGameEvent = onGameEvent;
    
    // Match timing
    this.matchTime = 0;
    this.halfTime = 1; // 1 or 2
    this.halfLength = 45 * 60; // 45 minutes in seconds
    this.addedTime = 0;
    this.matchPaused = false;
    this.matchEnded = false;
    
    // Game state
    this.gameState = 'KICKOFF'; // KICKOFF, PLAYING, THROW_IN, CORNER, FREE_KICK, PENALTY, GOAL_KICK, HALFTIME, FULLTIME
    this.lastEventTime = 0;
    this.restartPosition = null;
    this.restartTeam = null;
    
    // Substitutions
    this.substitutionsUsed = { home: 0, away: 0 };
    this.maxSubstitutions = 5;
    this.substitutionWindows = 0; // FIFA allows 3 substitution windows per team
    
    // Match events log
    this.events = [];
    
    console.log("FIFA Game State Manager initialized");
  }
  
  // Update match time and check for half/full time
  updateMatchTime(deltaSeconds) {
    if (this.matchPaused || this.matchEnded) return;
    
    this.matchTime += deltaSeconds;
    
    // Check for half time
    if (this.halfTime === 1 && this.matchTime >= this.halfLength) {
      this.triggerHalfTime();
    }
    
    // Check for full time
    if (this.halfTime === 2 && this.matchTime >= (this.halfLength * 2 + this.addedTime)) {
      this.triggerFullTime();
    }
  }
  
  // Trigger half time
  triggerHalfTime() {
    this.gameState = 'HALFTIME';
    this.matchPaused = true;
    this.logEvent('HALFTIME', 'Half time');
    logComment("Halbzeit!");
    
    if (this.onGameEvent) {
      this.onGameEvent('halftime', { time: this.matchTime });
    }
  }
  
  // Start second half
  startSecondHalf() {
    this.halfTime = 2;
    this.gameState = 'KICKOFF';
    this.matchPaused = false;
    this.logEvent('SECOND_HALF', 'Second half begins');
    logComment("Zweite Halbzeit beginnt!");
    
    if (this.onGameEvent) {
      this.onGameEvent('secondHalf', { time: this.matchTime });
    }
  }
  
  // Trigger full time
  triggerFullTime() {
    this.gameState = 'FULLTIME';
    this.matchEnded = true;
    this.logEvent('FULLTIME', 'Full time');
    logComment("Abpfiff!");
    
    if (this.onGameEvent) {
      this.onGameEvent('fulltime', { time: this.matchTime });
    }
  }
  
  // Handle goal scored
  handleGoal(scorer, assistPlayer = null) {
    this.gameState = 'GOAL';
    this.addedTime += 1; // Add time for celebration
    
    const goalData = {
      scorer: scorer,
      assist: assistPlayer,
      time: this.getDisplayTime(),
      half: this.halfTime
    };
    
    this.logEvent('GOAL', `Goal by ${scorer.role}`, goalData);
    logComment(`Tor! ${scorer.role} trifft!`);
    
    if (this.onGameEvent) {
      this.onGameEvent('goal', goalData);
    }
    
    // Set up for kickoff
    setTimeout(() => {
      this.gameState = 'KICKOFF';
    }, 3000);
  }
  
  // Handle throw-in
  handleThrowIn(side, position) {
    this.gameState = 'THROW_IN';
    this.restartPosition = position;
    this.restartTeam = side;
    
    this.logEvent('THROW_IN', `Throw-in for ${side}`);
    logComment(`Einwurf für ${side}`);
    
    if (this.onGameEvent) {
      this.onGameEvent('throwIn', { side, position });
    }
  }
  
  // Handle corner kick
  handleCorner(side, position) {
    this.gameState = 'CORNER';
    this.restartPosition = position;
    this.restartTeam = side;
    
    this.logEvent('CORNER', `Corner kick for ${side}`);
    logComment(`Eckstoß für ${side}`);
    
    if (this.onGameEvent) {
      this.onGameEvent('corner', { side, position });
    }
  }
  
  // Handle goal kick
  handleGoalKick(side) {
    this.gameState = 'GOAL_KICK';
    this.restartTeam = side;
    
    this.logEvent('GOAL_KICK', `Goal kick for ${side}`);
    logComment(`Abstoß für ${side}`);
    
    if (this.onGameEvent) {
      this.onGameEvent('goalKick', { side });
    }
  }
  
  // Handle free kick
  handleFreeKick(side, position, type = 'direct') {
    this.gameState = 'FREE_KICK';
    this.restartPosition = position;
    this.restartTeam = side;
    
    this.logEvent('FREE_KICK', `${type} free kick for ${side}`);
    logComment(`${type === 'direct' ? 'Direkter' : 'Indirekter'} Freistoß für ${side}`);
    
    if (this.onGameEvent) {
      this.onGameEvent('freeKick', { side, position, type });
    }
  }
  
  // Handle penalty
  handlePenalty(side, fouler, victim) {
    this.gameState = 'PENALTY';
    this.restartTeam = side;
    this.addedTime += 1; // Add time for penalty setup
    
    const penaltyData = { side, fouler, victim };
    this.logEvent('PENALTY', `Penalty for ${side}`, penaltyData);
    logComment(`Elfmeter für ${side}!`);
    
    if (this.onGameEvent) {
      this.onGameEvent('penalty', penaltyData);
    }
  }
  
  // Handle substitution
  handleSubstitution(team, playerOut, playerIn) {
    if (this.substitutionsUsed[team] >= this.maxSubstitutions) {
      logComment(`${team} hat bereits alle Wechsel aufgebraucht!`);
      return false;
    }
    
    this.substitutionsUsed[team]++;
    this.addedTime += 0.5; // Add time for substitution
    
    const subData = { team, playerOut, playerIn, time: this.getDisplayTime() };
    this.logEvent('SUBSTITUTION', `${team} substitution`, subData);
    logComment(`Wechsel ${team}: ${playerOut.role} raus, ${playerIn.role} rein`);
    
    if (this.onGameEvent) {
      this.onGameEvent('substitution', subData);
    }
    
    return true;
  }
  
  // Resume play after restart
  resumePlay() {
    this.gameState = 'PLAYING';
    this.restartPosition = null;
    this.restartTeam = null;
  }
  
  // Get display time (MM:SS format)
  getDisplayTime() {
    const totalMinutes = Math.floor(this.matchTime / 60);
    const seconds = Math.floor(this.matchTime % 60);
    return `${totalMinutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // Get current half display
  getCurrentHalf() {
    if (this.halfTime === 1) return "1st Half";
    if (this.halfTime === 2) return "2nd Half";
    return "Pre-match";
  }
  
  // Log match event
  logEvent(type, description, data = null) {
    const event = {
      type,
      description,
      time: this.getDisplayTime(),
      matchTime: this.matchTime,
      half: this.halfTime,
      data
    };
    
    this.events.push(event);
    console.log(`Match Event: ${description} (${this.getDisplayTime()})`);
  }
  
  // Check if substitutions are allowed
  canSubstitute(team) {
    return this.substitutionsUsed[team] < this.maxSubstitutions && 
           !this.matchEnded && 
           this.gameState === 'PLAYING';
  }
  
  // Get match statistics
  getMatchStats() {
    return {
      time: this.getDisplayTime(),
      half: this.getCurrentHalf(),
      addedTime: Math.floor(this.addedTime),
      substitutions: this.substitutionsUsed,
      events: this.events.length,
      gameState: this.gameState
    };
  }
}
