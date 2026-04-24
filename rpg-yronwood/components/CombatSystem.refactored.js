import { useState, useEffect } from 'react';

// Combat system constants
const COMBAT_CONSTANTS = {
  DICE_SIDES: 20,
  CRITICAL_MULTIPLIER: 2,
  DEFENSE_DAMAGE_REDUCTION: 0.5,
  COMBAT_TIMEOUT: 25000,
  ANIMATION_DURATION: 1000,
  NOTIFICATION_DURATION: 3000,
  XP_BASE_MULTIPLIER: 2,
  LEVEL_UP_HP_RECOVERY: 25,
};

// Enemy templates with balanced stats
const ENEMY_TEMPLATES = [
  {
    name: 'Goblin',
    baseStats: { hp: 15, damage: 3, defense: 2 },
    icon: '👺',
    xpValue: 30,
    difficulty: 'Easy'
  },
  {
    name: 'Orc',
    baseStats: { hp: 25, damage: 5, defense: 3 },
    icon: '👹',
    xpValue: 50,
    difficulty: 'Medium'
  },
  {
    name: 'Esqueleto',
    baseStats: { hp: 20, damage: 4, defense: 1 },
    icon: '💀',
    xpValue: 40,
    difficulty: 'Easy'
  },
  {
    name: 'Lobo',
    baseStats: { hp: 18, damage: 4, defense: 2 },
    icon: '🐺',
    xpValue: 36,
    difficulty: 'Easy'
  },
  {
    name: 'Bandido',
    baseStats: { hp: 22, damage: 4, defense: 3 },
    icon: '🥷',
    xpValue: 44,
    difficulty: 'Medium'
  },
];

// Combat result types
const COMBAT_RESULTS = {
  CRITICAL_SUCCESS: 'critical_success',
  SUCCESS: 'success',
  PARTIAL_SUCCESS: 'partial_success',
  FAILURE: 'failure',
  CRITICAL_FAILURE: 'critical_failure'
};

// Dice rolling utility
class DiceRoller {
  static roll(sides = COMBAT_CONSTANTS.DICE_SIDES) {
    return Math.floor(Math.random() * sides) + 1;
  }

  static getCombatResult(roll) {
    if (roll >= 19) return COMBAT_RESULTS.CRITICAL_SUCCESS;
    if (roll >= 16) return COMBAT_RESULTS.SUCCESS;
    if (roll >= 11) return COMBAT_RESULTS.PARTIAL_SUCCESS;
    if (roll >= 6) return COMBAT_RESULTS.FAILURE;
    return COMBAT_RESULTS.CRITICAL_FAILURE;
  }

  static calculateDamage(attackerDamage, defenderDefense, result) {
    let baseDamage = attackerDamage || COMBAT_CONSTANTS.DICE_SIDES;
    
    switch (result) {
      case COMBAT_RESULTS.CRITICAL_SUCCESS:
        return Math.floor(baseDamage * COMBAT_CONSTANTS.CRITICAL_MULTIPLIER);
      case COMBAT_RESULTS.SUCCESS:
        return Math.max(1, baseDamage - (defenderDefense || 0));
      case COMBAT_RESULTS.PARTIAL_SUCCESS:
        return Math.max(1, Math.floor(baseDamage * 0.7) - (defenderDefense || 0));
      case COMBAT_RESULTS.FAILURE:
        return 0;
      case COMBAT_RESULTS.CRITICAL_FAILURE:
        return 0;
      default:
        return 0;
    }
  }

  static calculateFleeSuccess(roll) {
    return roll >= 12;
  }
}

// Combat state manager
class CombatStateManager {
  static createEnemy(template) {
    if (!template || !template.baseStats) {
      throw new Error('Invalid enemy template');
    }

    return {
      ...template,
      currentHp: template.baseStats.hp,
      maxHp: template.baseStats.hp,
      ...template.baseStats
    };
  }

  static validateCharacter(character) {
    if (!character || typeof character !== 'object') {
      throw new Error('Invalid character data');
    }

    if (typeof character.hp !== 'number' || character.hp < 0) {
      throw new Error('Invalid character HP');
    }

    return true;
  }

  static calculateExperience(enemy, result) {
    const baseXp = enemy.xpValue || 0;
    
    switch (result) {
      case COMBAT_RESULTS.CRITICAL_SUCCESS:
        return Math.floor(baseXp * 1.5);
      case COMBAT_RESULTS.SUCCESS:
        return baseXp;
      case COMBAT_RESULTS.PARTIAL_SUCCESS:
        return Math.floor(baseXp * 0.7);
      default:
        return 0;
    }
  }
}

// Combat effects manager
class CombatEffectsManager {
  static createEffect(type, duration = COMBAT_CONSTANTS.ANIMATION_DURATION) {
    return {
      id: Date.now() + Math.random(),
      type,
      duration,
      startTime: Date.now()
    };
  }

  static isEffectActive(effect) {
    return Date.now() - effect.startTime < effect.duration;
  }

  static getEffectStyle(type) {
    const styles = {
      [COMBAT_RESULTS.CRITICAL_SUCCESS]: {
        color: '#ffd700',
        textShadow: '0 0 15px #ff8c00',
        fontWeight: 'bold',
        animation: 'criticalHit 0.5s ease'
      },
      [COMBAT_RESULTS.SUCCESS]: {
        color: '#4a8a14',
        textShadow: '0 0 10px #2a6a0a',
        animation: 'success 0.3s ease'
      },
      [COMBAT_RESULTS.PARTIAL_SUCCESS]: {
        color: '#8b8a14',
        textShadow: '0 0 8px #5a5a0a',
        animation: 'partial 0.3s ease'
      },
      [COMBAT_RESULTS.FAILURE]: {
        color: '#888',
        textDecoration: 'line-through',
        animation: 'failure 0.3s ease'
      },
      [COMBAT_RESULTS.CRITICAL_FAILURE]: {
        color: '#8b1414',
        textShadow: '0 0 10px #8b0000',
        animation: 'criticalFailure 0.5s ease'
      },
      'defend': {
        color: '#4a9eff',
        textShadow: '0 0 10px #2a6acc',
        animation: 'defend 0.4s ease'
      },
      'flee': {
        color: '#cc9900',
        textShadow: '0 0 8px #996600',
        animation: 'flee 0.3s ease'
      }
    };

    return styles[type] || {};
  }
}

// Combat logger
class CombatLogger {
  static createLogEntry(message, type = 'normal', effect = null) {
    return {
      id: Date.now() + Math.random(),
      message,
      type,
      effect,
      timestamp: Date.now()
    };
  }

  static formatCombatMessage(actor, action, result, target = null) {
    const actorName = typeof actor === 'string' ? actor : actor.name || 'Desconhecido';
    const targetName = target ? (typeof target === 'string' ? target : target.name || 'Desconhecido') : '';
    
    switch (action) {
      case 'attack':
        return `${actorName} ataca${targetName ? ` ${targetName}` : ''}! ${result}`;
      case 'defend':
        return `${actorName} assume posição defensiva!`;
      case 'flee':
        return `${actorName} tenta fugir! ${result}`;
      case 'damage':
        return `${targetName} recebe ${result} de dano!`;
      case 'victory':
        return `Vitória! ${actorName} derrotou ${targetName}!`;
      case 'defeat':
        return `${targetName} derrotou ${actorName}!`;
      default:
        return `${actorName} ${action}! ${result}`;
    }
  }
}

// Main combat system component
function CombatSystem({ 
  character, 
  onCombatStart, 
  onCombatEnd, 
  onDamage, 
  onHeal,
  isActive = false 
}) {
  // State management
  const [isInCombat, setIsInCombat] = useState(false);
  const [currentEnemy, setCurrentEnemy] = useState(null);
  const [combatLog, setCombatLog] = useState([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [activeEffects, setActiveEffects] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [combatResult, setCombatResult] = useState(null);

  // Validate character data
  useEffect(() => {
    if (character) {
      try {
        CombatStateManager.validateCharacter(character);
      } catch (error) {
        console.error('Invalid character data:', error);
      }
    }
  }, [character]);

  // Clean up expired effects
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveEffects(prev => prev.filter(effect => 
        CombatEffectsManager.isEffectActive(effect)
      ));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Add combat log entry
  const addCombatLogEntry = useCallback((message, type = 'normal', effect = null) => {
    const entry = CombatLogger.createLogEntry(message, type, effect);
    setCombatLog(prev => [...prev, entry]);
  }, []);

  // Add visual effect
  const addCombatEffect = useCallback((type) => {
    const effect = CombatEffectsManager.createEffect(type);
    setActiveEffects(prev => [...prev, effect]);
    
    // Auto-remove effect after duration
    setTimeout(() => {
      setActiveEffects(prev => prev.filter(e => e.id !== effect.id));
    }, effect.duration);
  }, []);

  // Start combat with selected enemy
  const startCombat = useCallback((enemyTemplate) => {
    if (isProcessing || !character) return;

    try {
      setIsProcessing(true);
      
      const enemy = CombatStateManager.createEnemy(enemyTemplate);
      setCurrentEnemy(enemy);
      setIsInCombat(true);
      setCombatLog([CombatLogger.formatCombatMessage(character.name || 'Jogador', 'attack', 'inicia o combate', enemy.name)]);
      setIsPlayerTurn(true);
      setActiveEffects([]);
      setCombatResult(null);
      
      onCombatStart?.(enemy);
      addCombatEffect('combat_start');
      
    } catch (error) {
      console.error('Error starting combat:', error);
      addCombatLogEntry('Erro ao iniciar combate', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [character, isProcessing, onCombatStart, addCombatLogEntry, addCombatEffect]);

  // End combat
  const endCombat = useCallback((victory) => {
    setIsInCombat(false);
    setCurrentEnemy(null);
    setCombatLog([]);
    setIsPlayerTurn(true);
    setActiveEffects([]);
    setCombatResult(victory ? 'victory' : 'defeat');
    
    onCombatEnd?.(victory);
    addCombatEffect(victory ? 'victory' : 'defeat');
    
    // Clear combat result after delay
    setTimeout(() => setCombatResult(null), COMBAT_CONSTANTS.NOTIFICATION_DURATION);
  }, [onCombatEnd, addCombatEffect]);

  // Player attack action
  const executePlayerAttack = useCallback(async () => {
    if (!isPlayerTurn || !currentEnemy || isProcessing) return;

    setIsProcessing(true);
    
    try {
      const roll = DiceRoller.roll();
      const result = DiceRoller.getCombatResult(roll);
      const damage = DiceRoller.calculateDamage(
        character.damage || 5, 
        currentEnemy.defense, 
        result
      );

      // Log the action
      const actionMessage = CombatLogger.formatCombatMessage(
        character.name || 'Jogador', 
        'attack', 
        `rolou ${roll}/20`, 
        currentEnemy.name
      );
      addCombatLogEntry(actionMessage, 'player', result);

      // Apply damage if successful
      if (damage > 0) {
        const newHp = Math.max(0, currentEnemy.currentHp - damage);
        setCurrentEnemy(prev => prev ? { ...prev, currentHp: newHp } : null);
        
        const damageMessage = CombatLogger.formatCombatMessage(
          '', 
          'damage', 
          `${damage} de dano!`, 
          currentEnemy.name
        );
        addCombatLogEntry(damageMessage, 'damage', result);

        // Check for victory
        if (newHp <= 0) {
          const experience = CombatStateManager.calculateExperience(currentEnemy, result);
          const victoryMessage = CombatLogger.formatCombatMessage(
            character.name || 'Jogador',
            'victory',
            `Ganhou ${experience} XP!`,
            currentEnemy.name
          );
          addCombatLogEntry(victoryMessage, 'victory', 'victory');
          
          addCombatEffect(result);
          setTimeout(() => endCombat(true), 1500);
          return;
        }
      }

      addCombatEffect(result);
      
      // Switch to enemy turn
      setIsPlayerTurn(false);
      setTimeout(() => executeEnemyTurn(), 1500);
      
    } catch (error) {
      console.error('Error in player attack:', error);
      addCombatLogEntry('Erro ao executar ataque', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [isPlayerTurn, currentEnemy, character, isProcessing, addCombatLogEntry, addCombatEffect, endCombat]);

  // Player defend action
  const executePlayerDefend = useCallback(async () => {
    if (!isPlayerTurn || isProcessing) return;

    setIsProcessing(true);
    
    try {
      addCombatLogEntry(
        CombatLogger.formatCombatMessage(character.name || 'Jogador', 'defend', ''),
        'player',
        'defend'
      );
      
      addCombatEffect('defend');
      
      // Switch to enemy turn with defense bonus
      setIsPlayerTurn(false);
      setTimeout(() => executeEnemyTurn(true), 1000);
      
    } catch (error) {
      console.error('Error in player defend:', error);
      addCombatLogEntry('Erro ao executar defesa', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [isPlayerTurn, character, isProcessing, addCombatLogEntry, addCombatEffect]);

  // Player flee action
  const executePlayerFlee = useCallback(async () => {
    if (!isPlayerTurn || isProcessing) return;

    setIsProcessing(true);
    
    try {
      const roll = DiceRoller.roll();
      const success = DiceRoller.calculateFleeSuccess(roll);
      
      const message = CombatLogger.formatCombatMessage(
        character.name || 'Jogador',
        'flee',
        success ? 'fugiu com sucesso!' : 'não conseguiu fugir!',
        currentEnemy?.name
      );
      
      addCombatLogEntry(message, 'player', success ? 'success' : 'failure');
      addCombatEffect('flee');
      
      if (success) {
        setTimeout(() => endCombat(false), 1000);
      } else {
        setIsPlayerTurn(false);
        setTimeout(() => executeEnemyTurn(), 1500);
      }
      
    } catch (error) {
      console.error('Error in player flee:', error);
      addCombatLogEntry('Erro ao tentar fugir', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [isPlayerTurn, currentEnemy, character, isProcessing, addCombatLogEntry, addCombatEffect, endCombat]);

  // Enemy turn
  const executeEnemyTurn = useCallback(async (isDefending = false) => {
    if (!currentEnemy || isProcessing) return;

    setIsProcessing(true);
    
    try {
      const roll = DiceRoller.roll();
      const result = DiceRoller.getCombatResult(roll);
      let damage = DiceRoller.calculateDamage(currentEnemy.damage, character.defense || 2, result);

      // Apply defense reduction if player is defending
      if (isDefending && damage > 0) {
        damage = Math.max(1, Math.floor(damage * COMBAT_CONSTANTS.DEFENSE_DAMAGE_REDUCTION));
      }

      // Log the action
      const actionMessage = CombatLogger.formatCombatMessage(
        currentEnemy.name,
        'attack',
        `rolou ${roll}/20`,
        character.name || 'Jogador'
      );
      addCombatLogEntry(actionMessage, 'enemy', result);

      // Apply damage if successful
      if (damage > 0) {
        const damageMessage = CombatLogger.formatCombatMessage(
          '',
          'damage',
          `${damage} de dano${isDefending ? ' (reduzido pela defesa)' : ''}!`,
          character.name || 'Jogador'
        );
        addCombatLogEntry(damageMessage, 'damage', result);
        
        onDamage?.(damage);
      }

      addCombatEffect(result);
      
      // Switch back to player turn
      setIsPlayerTurn(true);
      
    } catch (error) {
      console.error('Error in enemy turn:', error);
      addCombatLogEntry('Erro no turno do inimigo', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [currentEnemy, character, isProcessing, onDamage, addCombatLogEntry, addCombatEffect]);

  // Render combat encounter selection
  const renderEncounterSelection = () => {
    return (
      <div className="combat-encounter">
        <h3 className="section-title">Encontro</h3>
        <p className="section-description">Um inimigo aparece!</p>
        
        <div className="enemy-selection">
          {ENEMY_TEMPLATES.map((template, index) => (
            <button
              key={index}
              className="enemy-card"
              onClick={() => startCombat(template)}
              disabled={isProcessing}
            >
              <div className="enemy-icon">{template.icon}</div>
              <div className="enemy-info">
                <div className="enemy-name">{template.name}</div>
                <div className="enemy-stats">
                  <span className="stat">HP: {template.baseStats.hp}</span>
                  <span className="stat">ATK: {template.baseStats.damage}</span>
                  <span className="stat">DEF: {template.baseStats.defense}</span>
                </div>
                <div className="enemy-difficulty">{template.difficulty}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Render active combat
  const renderActiveCombat = () => {
    if (!currentEnemy) return null;

    return (
      <div className="combat-active">
        <div className="combat-header">
          <h3 className="section-title">Combate</h3>
          <button 
            className="flee-button"
            onClick={executePlayerFlee}
            disabled={!isPlayerTurn || isProcessing}
          >
            Fugir
          </button>
        </div>

        <div className="combatants">
          <div className="combatant player">
            <div className="combatant-info">
              <div className="combatant-name">{character.name || 'Jogador'}</div>
              <div className="health-bar">
                <div 
                  className="health-fill player-health" 
                  style={{ width: `${(character.hp / 100) * 100}%` }}
                />
              </div>
              <div className="health-text">HP: {character.hp}/100</div>
            </div>
          </div>

          <div className="versus-indicator">VS</div>

          <div className="combatant enemy">
            <div className="combatant-info">
              <div className="combatant-name">
                {currentEnemy.icon} {currentEnemy.name}
              </div>
              <div className="health-bar">
                <div 
                  className="health-fill enemy-health" 
                  style={{ width: `${(currentEnemy.currentHp / currentEnemy.maxHp) * 100}%` }}
                />
              </div>
              <div className="health-text">
                HP: {currentEnemy.currentHp}/{currentEnemy.maxHp}
              </div>
            </div>
          </div>
        </div>

        <div className="combat-actions">
          <button 
            className="action-button attack-button"
            onClick={executePlayerAttack}
            disabled={!isPlayerTurn || isProcessing}
          >
            Atacar
          </button>
          <button 
            className="action-button defend-button"
            onClick={executePlayerDefend}
            disabled={!isPlayerTurn || isProcessing}
          >
            Defender
          </button>
          <button 
            className="action-button flee-button"
            onClick={executePlayerFlee}
            disabled={!isPlayerTurn || isProcessing}
          >
            Fugir
          </button>
        </div>

        <div className="combat-log">
          {combatLog.map((entry) => (
            <div 
              key={entry.id} 
              className={`log-entry log-${entry.type}`}
              style={CombatEffectsManager.getEffectStyle(entry.effect)}
            >
              {entry.message}
            </div>
          ))}
        </div>

        <div className="turn-indicator">
          {isPlayerTurn ? 'Seu turno' : 'Turno do inimigo'}
        </div>

        {combatResult && (
          <div className={`combat-result ${combatResult}`}>
            {combatResult === 'victory' ? 'Vitória!' : 'Derrota!'}
          </div>
        )}
      </div>
    );
  };

  if (!isActive) return null;

  return (
    <div className="combat-system">
      {!isInCombat ? renderEncounterSelection() : renderActiveCombat()}

      <style jsx>{`
        .combat-system {
          background: #0c0700;
          border: 1px solid #180e00;
          border-radius: 8px;
          padding: 16px;
          margin: 12px 0;
        }

        .section-title {
          color: #d4a843;
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
        }

        .section-description {
          color: #c4a060;
          margin: 0 0 16px 0;
          font-size: 12px;
        }

        .enemy-selection {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .enemy-card {
          background: #0a0600;
          border: 1px solid #180e00;
          border-radius: 6px;
          padding: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s ease;
        }

        .enemy-card:hover:not(:disabled) {
          border-color: #4a2000;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }

        .enemy-card:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .enemy-icon {
          font-size: 32px;
        }

        .enemy-info {
          flex: 1;
        }

        .enemy-name {
          color: #c4a060;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .enemy-stats {
          display: flex;
          gap: 8px;
          margin-bottom: 4px;
        }

        .stat {
          color: #6b4a1a;
          font-size: 10px;
        }

        .enemy-difficulty {
          color: #8b5a14;
          font-size: 10px;
          font-weight: 500;
        }

        .combat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .flee-button {
          background: #6a1a1a;
          border: 1px solid #8a1414;
          color: #d4a843;
          border-radius: 4px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 11px;
        }

        .flee-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .combatants {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          gap: 16px;
        }

        .combatant {
          flex: 1;
          background: #0a0600;
          border: 1px solid #180e00;
          border-radius: 6px;
          padding: 12px;
        }

        .combatant.player {
          border-left: 3px solid #4a8a14;
        }

        .combatant.enemy {
          border-left: 3px solid #8a1414;
        }

        .combatant-info {
          text-align: center;
        }

        .combatant-name {
          color: #c4a060;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .health-bar {
          background: #1a0e00;
          border-radius: 3px;
          height: 8px;
          margin-bottom: 4px;
          overflow: hidden;
        }

        .health-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .player-health {
          background: linear-gradient(90deg, #4a8a14, #6aba34);
        }

        .enemy-health {
          background: linear-gradient(90deg, #8a1414, #aa2424);
        }

        .health-text {
          color: #6b4a1a;
          font-size: 10px;
        }

        .versus-indicator {
          color: #d4a843;
          font-weight: 600;
          font-size: 16px;
        }

        .combat-actions {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .action-button {
          flex: 1;
          background: #2a0d00;
          border: 1px solid #8b5a14;
          color: #d4a843;
          border-radius: 6px;
          padding: 12px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .action-button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .action-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .attack-button:hover:not(:disabled) {
          background: #1a3a0a;
          border-color: #4a8a14;
        }

        .defend-button:hover:not(:disabled) {
          background: #1a2a3a;
          border-color: #4a6a8a;
        }

        .flee-button:hover:not(:disabled) {
          background: #3a1a0a;
          border-color: #8a4a14;
        }

        .combat-log {
          background: #060407;
          border: 1px solid #180e00;
          border-radius: 4px;
          padding: 12px;
          height: 120px;
          overflow-y: auto;
          margin-bottom: 12px;
        }

        .log-entry {
          color: #c4a060;
          font-size: 11px;
          line-height: 1.4;
          margin-bottom: 4px;
          animation: fadeIn 0.3s ease;
        }

        .log-player {
          color: #4a8a14;
        }

        .log-enemy {
          color: #8a1414;
        }

        .log-damage {
          color: #cc6666;
        }

        .turn-indicator {
          text-align: center;
          color: #d4a843;
          font-size: 12px;
          font-weight: 600;
        }

        .combat-result {
          text-align: center;
          padding: 8px;
          border-radius: 4px;
          margin-top: 12px;
          font-weight: 600;
          animation: slideIn 0.5s ease;
        }

        .combat-result.victory {
          background: #1a3a0a;
          color: #4a8a14;
          border: 1px solid #4a8a14;
        }

        .combat-result.defeat {
          background: #3a0a0a;
          color: #8a1414;
          border: 1px solid #8a1414;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes criticalHit {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        @keyframes success {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        @keyframes failure {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }

        @keyframes defend {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        @keyframes flee {
          0% { transform: translateX(0); }
          50% { transform: translateX(10px); }
          100% { transform: translateX(0); }
        }

        .combat-log::-webkit-scrollbar {
          width: 4px;
        }

        .combat-log::-webkit-scrollbar-thumb {
          background: #2a1800;
          border-radius: 2px;
        }

        @media (max-width: 480px) {
          .combatants {
            flex-direction: column;
            gap: 8px;
          }

          .versus-indicator {
            transform: rotate(90deg);
          }

          .combat-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

export default CombatSystem;
