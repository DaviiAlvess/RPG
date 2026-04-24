import { useState, useEffect } from 'react';

export default function CombatSystem({ 
  character, 
  onCombatStart, 
  onCombatEnd, 
  onDamage, 
  onHeal,
  isActive 
}) {
  const [inCombat, setInCombat] = useState(false);
  const [currentEnemy, setCurrentEnemy] = useState(null);
  const [combatLog, setCombatLog] = useState([]);
  const [playerTurn, setPlayerTurn] = useState(true);
  const [combatEffects, setCombatEffects] = useState([]);

  const enemies = [
    { name: 'Goblin', hp: 15, maxHp: 15, damage: 3, defense: 2, icon: '👺' },
    { name: 'Orc', hp: 25, maxHp: 25, damage: 5, defense: 3, icon: '👹' },
    { name: 'Esqueleto', hp: 20, maxHp: 20, damage: 4, defense: 1, icon: '💀' },
    { name: 'Lobo', hp: 18, maxHp: 18, damage: 4, defense: 2, icon: '🐺' },
    { name: 'Bandido', hp: 22, maxHp: 22, damage: 4, defense: 3, icon: '🥷' },
  ];

  const startCombat = (enemy) => {
    const enemyData = { ...enemy };
    setCurrentEnemy(enemyData);
    setInCombat(true);
    setCombatLog([`⚔️ Combate iniciado contra ${enemyData.name}!`]);
    setPlayerTurn(true);
    setCombatEffects([]);
    onCombatStart && onCombatStart(enemyData);
  };

  const endCombat = (victory) => {
    setInCombat(false);
    setCurrentEnemy(null);
    setCombatLog([]);
    setPlayerTurn(true);
    setCombatEffects([]);
    onCombatEnd && onCombatEnd(victory);
  };

  const rollDice = (sides = 20) => {
    return Math.floor(Math.random() * sides) + 1;
  };

  const calculateDamage = (attacker, defender, roll) => {
    let baseDamage = attacker.damage || 5;
    let defense = defender.defense || 0;
    
    // Crítico (roll 19-20)
    if (roll >= 19) {
      baseDamage *= 2;
      return { damage: Math.max(1, baseDamage - defense), critical: true };
    }
    
    // Falha (roll 1-5)
    if (roll <= 5) {
      return { damage: 0, failed: true };
    }
    
    return { damage: Math.max(1, baseDamage - defense), normal: true };
  };

  const playerAttack = () => {
    if (!playerTurn || !currentEnemy) return;
    
    const roll = rollDice();
    const result = calculateDamage(character || { damage: 6, defense: 2 }, currentEnemy, roll);
    
    let logMessage = `🎲 Você rolou ${roll}/20 para atacar! `;
    
    if (result.critical) {
      logMessage += `⚡ CRÍTICO! Você causou ${result.damage} de dano!`;
      addCombatEffect('critical');
    } else if (result.failed) {
      logMessage += `❌ Falha! Você errou o ataque!`;
      addCombatEffect('miss');
    } else {
      logMessage += `⚔️ Você causou ${result.damage} de dano!`;
      addCombatEffect('hit');
    }
    
    setCombatLog(prev => [...prev, logMessage]);
    
    if (result.damage > 0) {
      const newHp = Math.max(0, currentEnemy.hp - result.damage);
      setCurrentEnemy(prev => prev ? { ...prev, hp: newHp } : null);
      
      if (newHp <= 0) {
        setCombatLog(prev => [...prev, `🎉 Vitória! Você derrotou o ${currentEnemy.name}!`]);
        setTimeout(() => endCombat(true), 1500);
        return;
      }
    }
    
    setPlayerTurn(false);
    setTimeout(() => enemyTurn(), 1500);
  };

  const playerDefend = () => {
    if (!playerTurn || !currentEnemy) return;
    
    setCombatLog(prev => [...prev, '🛡️ Você assume posição defensiva!']);
    addCombatEffect('defend');
    
    // Reduz dano do próximo ataque
    setTimeout(() => {
      setPlayerTurn(false);
      enemyTurn(true); // Modo defensivo
    }, 1000);
  };

  const playerFlee = () => {
    if (!playerTurn || !currentEnemy) return;
    
    const fleeRoll = rollDice();
    if (fleeRoll >= 12) {
      setCombatLog(prev => [...prev, `🏃 Você rolou ${fleeRoll}/20 e fugiu com sucesso!`]);
      setTimeout(() => endCombat(false), 1000);
    } else {
      setCombatLog(prev => [...prev, `🏃 Você rolou ${fleeRoll}/20 mas não conseguiu fugir!`]);
      setPlayerTurn(false);
      setTimeout(() => enemyTurn(), 1500);
    }
  };

  const enemyTurn = (defending = false) => {
    if (!currentEnemy) return;
    
    const roll = rollDice();
    const result = calculateDamage(currentEnemy, character || { defense: 2 }, roll);
    
    let logMessage = `🎲 ${currentEnemy.name} rolou ${roll}/20! `;
    
    if (result.critical) {
      logMessage += `⚡ CRÍTICO! Causou ${result.damage} de dano!`;
      addCombatEffect('enemy-critical');
    } else if (result.failed) {
      logMessage += `❌ Falha! Errou o ataque!`;
      addCombatEffect('enemy-miss');
    } else {
      logMessage += `⚔️ Causou ${result.damage} de dano!`;
      if (defending) {
        result.damage = Math.max(1, Math.floor(result.damage / 2));
        logMessage += ` (reduzido pela defesa para ${result.damage})`;
      }
      addCombatEffect('enemy-hit');
    }
    
    setCombatLog(prev => [...prev, logMessage]);
    
    if (result.damage > 0) {
      onDamage && onDamage(result.damage);
    }
    
    setPlayerTurn(true);
  };

  const addCombatEffect = (type) => {
    const effect = { id: Date.now(), type };
    setCombatEffects(prev => [...prev, effect]);
    setTimeout(() => {
      setCombatEffects(prev => prev.filter(e => e.id !== effect.id));
    }, 1000);
  };

  const getEffectStyle = (type) => {
    const styles = {
      'hit': 'color: #a0d060; text-shadow: 0 0 10px #4a8a14;',
      'critical': 'color: #ffd700; text-shadow: 0 0 15px #ff8c00; font-weight: bold;',
      'miss': 'color: #888; text-decoration: line-through;',
      'defend': 'color: #4a9eff; text-shadow: 0 0 10px #2a6acc;',
      'enemy-hit': 'color: #ff6b6b; text-shadow: 0 0 10px #cc0000;',
      'enemy-critical': 'color: #ff0000; text-shadow: 0 0 15px #800000; font-weight: bold;',
      'enemy-miss': 'color: #888; text-decoration: line-through;'
    };
    return styles[type] || '';
  };

  if (!isActive) return null;

  return (
    <div className="combat-system">
      {!inCombat ? (
        <div className="combat-encounter">
          <h3>⚔️ Encontro</h3>
          <p>Um inimigo aparece!</p>
          <div className="enemy-selection">
            {enemies.map((enemy, index) => (
              <button
                key={index}
                className="enemy-card"
                onClick={() => startCombat(enemy)}
              >
                <div className="enemy-icon">{enemy.icon}</div>
                <div className="enemy-info">
                  <div className="enemy-name">{enemy.name}</div>
                  <div className="enemy-stats">❤️ {enemy.hp} ⚔️ {enemy.damage} 🛡️ {enemy.defense}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="combat-active">
          <div className="combat-header">
            <h3>⚔️ Combate</h3>
            <button className="btn-flee" onClick={playerFlee} disabled={!playerTurn}>
              🏃 Fugir
            </button>
          </div>

          <div className="combatants">
            <div className="combatant player">
              <div className="combatant-info">
                <div className="name">{character?.charName || 'Jogador'}</div>
                <div className="hp-bar">
                  <div className="hp-fill" style={{ width: `${(character?.hp || 100) / 1}%` }}></div>
                </div>
                <div className="hp-text">❤️ {character?.hp || 100}/100</div>
              </div>
            </div>

            <div className="vs">VS</div>

            <div className="combatant enemy">
              <div className="combatant-info">
                <div className="name">{currentEnemy.icon} {currentEnemy.name}</div>
                <div className="hp-bar">
                  <div className="hp-fill enemy" style={{ width: `${(currentEnemy.hp / currentEnemy.maxHp) * 100}%` }}></div>
                </div>
                <div className="hp-text">❤️ {currentEnemy.hp}/{currentEnemy.maxHp}</div>
              </div>
            </div>
          </div>

          <div className="combat-actions">
            <button 
              className="combat-btn attack"
              onClick={playerAttack}
              disabled={!playerTurn}
            >
              ⚔️ Atacar
            </button>
            <button 
              className="combat-btn defend"
              onClick={playerDefend}
              disabled={!playerTurn}
            >
              🛡️ Defender
            </button>
            <button 
              className="combat-btn flee"
              onClick={playerFlee}
              disabled={!playerTurn}
            >
              🏃 Fugir
            </button>
          </div>

          <div className="combat-log">
            {combatLog.map((log, index) => (
              <div 
                key={index} 
                className={`log-entry ${combatEffects.find(e => e.id === Date.now() - index * 100)?.type || ''}`}
                style={getEffectStyle(combatEffects.find(e => e.id === Date.now() - index * 100)?.type || '')}
              >
                {log}
              </div>
            ))}
          </div>

          <div className="turn-indicator">
            {playerTurn ? '🟢 Seu turno' : '🔴 Turno do inimigo'}
          </div>
        </div>
      )}

      <style jsx>{`
        .combat-system {
          background: #0c0700;
          border: 1px solid #180e00;
          border-radius: 8px;
          padding: 16px;
          margin: 12px 0;
        }

        .combat-encounter h3, .combat-active h3 {
          color: #d4a843;
          margin: 0 0 12px 0;
          font-size: 14px;
        }

        .enemy-selection {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 8px;
        }

        .enemy-card {
          background: #0a0600;
          border: 1px solid #180e00;
          border-radius: 6px;
          padding: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s;
        }

        .enemy-card:hover {
          border-color: #4a2000;
          transform: translateY(-2px);
        }

        .enemy-icon {
          font-size: 32px;
        }

        .enemy-info {
          flex: 1;
        }

        .enemy-name {
          color: #c4a060;
          font-weight: bold;
          margin-bottom: 4px;
        }

        .enemy-stats {
          color: #6b4a1a;
          font-size: 11px;
        }

        .combat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .btn-flee {
          background: #3a0a0a;
          border: 1px solid #8a1414;
          color: #d06060;
          border-radius: 4px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 11px;
        }

        .btn-flee:disabled {
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

        .name {
          color: #c4a060;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .hp-bar {
          background: #1a0e00;
          border-radius: 3px;
          height: 8px;
          margin-bottom: 4px;
          overflow: hidden;
        }

        .hp-fill {
          background: #4a8a14;
          height: 100%;
          transition: width 0.3s;
        }

        .hp-fill.enemy {
          background: #8a1414;
        }

        .hp-text {
          color: #6b4a1a;
          font-size: 11px;
        }

        .vs {
          color: #d4a843;
          font-weight: bold;
          font-size: 18px;
        }

        .combat-actions {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .combat-btn {
          flex: 1;
          background: #2a0d00;
          border: 1px solid #8b5a14;
          color: #d4a843;
          border-radius: 6px;
          padding: 12px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }

        .combat-btn:hover:not(:disabled) {
          background: #3a1a00;
          border-color: #ab7a24;
        }

        .combat-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .combat-btn.attack:hover:not(:disabled) {
          background: #1a3a0a;
          border-color: #4a8a14;
        }

        .combat-btn.defend:hover:not(:disabled) {
          background: #1a2a3a;
          border-color: #4a6a8a;
        }

        .combat-btn.flee:hover:not(:disabled) {
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
          animation: fadeIn 0.3s;
        }

        .turn-indicator {
          text-align: center;
          color: #d4a843;
          font-size: 12px;
          font-weight: bold;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .combat-log::-webkit-scrollbar {
          width: 4px;
        }

        .combat-log::-webkit-scrollbar-thumb {
          background: #2a1800;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
