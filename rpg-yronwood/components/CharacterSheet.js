import { useState } from 'react';

export default function CharacterSheet({ character, onUpdateCharacter, onLevelUp }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(character || {});

  const attributes = [
    { name: 'Força', key: 'strength', icon: '💪', current: character?.attributes?.strength || 10 },
    { name: 'Destreza', key: 'dexterity', icon: '🤸', current: character?.attributes?.dexterity || 10 },
    { name: 'Mente', key: 'mind', icon: '🧠', current: character?.attributes?.mind || 10 },
    { name: 'Carisma', key: 'charisma', icon: '✨', current: character?.attributes?.charisma || 10 },
  ];

  const skills = [
    { name: 'Luta', key: 'combat', icon: '⚔️', level: character?.skills?.combat || 1 },
    { name: 'Furtividade', key: 'stealth', icon: '🥷', level: character?.skills?.stealth || 1 },
    { name: 'Magia', key: 'magic', icon: '🔮', level: character?.skills?.magic || 1 },
    { name: 'Persuasão', key: 'persuasion', icon: '🗣️', level: character?.skills?.persuasion || 1 },
    { name: 'Sobrevivência', key: 'survival', icon: '🏕️', level: character?.skills?.survival || 1 },
    { name: 'Percepção', key: 'perception', icon: '👁️', level: character?.skills?.perception || 1 },
  ];

  const handleSave = () => {
    onUpdateCharacter && onUpdateCharacter(editForm);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm(character || {});
    setIsEditing(false);
  };

  const calculateLevel = () => {
    const totalXp = character?.experience || 0;
    return Math.floor(totalXp / 100) + 1;
  };

  const getXpForNextLevel = () => {
    const currentLevel = calculateLevel();
    return currentLevel * 100;
  };

  const getCurrentXp = () => {
    const totalXp = character?.experience || 0;
    return totalXp % 100;
  };

  const getAttributeModifier = (value) => {
    return Math.floor((value - 10) / 2);
  };

  const getSkillBonus = (skillLevel) => {
    return skillLevel - 1;
  };

  if (!character) {
    return (
      <div className="character-sheet empty">
        <p>Nenhum personagem carregado</p>
      </div>
    );
  }

  return (
    <div className="character-sheet">
      <div className="sheet-header">
        <h2>📜 Ficha de Personagem</h2>
        <button 
          className="btn-edit"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? '✕' : '✏️'}
        </button>
      </div>

      <div className="sheet-content">
        {/* Informações Básicas */}
        <div className="section basic-info">
          <h3>Informações Básicas</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Nome:</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.charName || ''}
                  onChange={(e) => setEditForm({...editForm, charName: e.target.value})}
                  className="edit-input"
                />
              ) : (
                <span>{character.charName}</span>
              )}
            </div>
            <div className="info-item">
              <label>Título:</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.charTitle || ''}
                  onChange={(e) => setEditForm({...editForm, charTitle: e.target.value})}
                  className="edit-input"
                />
              ) : (
                <span>{character.charTitle || 'Nenhum'}</span>
              )}
            </div>
            <div className="info-item">
              <label>Idade:</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.charAge || ''}
                  onChange={(e) => setEditForm({...editForm, charAge: e.target.value})}
                  className="edit-input"
                />
              ) : (
                <span>{character.charAge || 'Desconhecida'}</span>
              )}
            </div>
            <div className="info-item">
              <label>Nível:</label>
              <span className="level">{calculateLevel()}</span>
            </div>
          </div>
        </div>

        {/* Atributos */}
        <div className="section attributes">
          <h3>Atributos</h3>
          <div className="attributes-grid">
            {attributes.map(attr => (
              <div key={attr.key} className="attribute-card">
                <div className="attr-header">
                  <span className="attr-icon">{attr.icon}</span>
                  <span className="attr-name">{attr.name}</span>
                </div>
                <div className="attr-value">
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.attributes?.[attr.key] || attr.current}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        attributes: {
                          ...editForm.attributes,
                          [attr.key]: parseInt(e.target.value) || 10
                        }
                      })}
                      className="attr-input"
                      min="1"
                      max="20"
                    />
                  ) : (
                    <span className="attr-number">{attr.current}</span>
                  )}
                </div>
                <div className="attr-modifier">
                  {getAttributeModifier(attr.current) >= 0 ? '+' : ''}{getAttributeModifier(attr.current)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Habilidades */}
        <div className="section skills">
          <h3>Habilidades</h3>
          <div className="skills-grid">
            {skills.map(skill => (
              <div key={skill.key} className="skill-card">
                <div className="skill-header">
                  <span className="skill-icon">{skill.icon}</span>
                  <span className="skill-name">{skill.name}</span>
                </div>
                <div className="skill-level">
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.skills?.[skill.key] || skill.level}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        skills: {
                          ...editForm.skills,
                          [skill.key]: parseInt(e.target.value) || 1
                        }
                      })}
                      className="skill-input"
                      min="1"
                      max="10"
                    />
                  ) : (
                    <span className="skill-ranks">
                      {'⭐'.repeat(skill.level)}
                    </span>
                  )}
                </div>
                <div className="skill-bonus">
                  +{getSkillBonus(skill.level)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Experiência */}
        <div className="section experience">
          <h3>Experiência</h3>
          <div className="xp-container">
            <div className="xp-bar">
              <div 
                className="xp-fill" 
                style={{ width: `${(getCurrentXp() / 100) * 100}%` }}
              ></div>
            </div>
            <div className="xp-text">
              {getCurrentXp()} / {getXpForNextLevel()} XP
            </div>
          </div>
          {getCurrentXp() >= 100 && (
            <button className="btn-level-up" onClick={onLevelUp}>
              ⬆️ Subir de Nível!
            </button>
          )}
        </div>

        {/* História e Personalidade */}
        <div className="section background">
          <h3>Background</h3>
          <div className="background-content">
            <div className="bg-item">
              <label>Personalidade:</label>
              {isEditing ? (
                <textarea
                  value={editForm.charPersonality || ''}
                  onChange={(e) => setEditForm({...editForm, charPersonality: e.target.value})}
                  className="edit-textarea"
                  rows={2}
                />
              ) : (
                <p>{character.charPersonality || 'Não definida'}</p>
              )}
            </div>
            <div className="bg-item">
              <label>História:</label>
              {isEditing ? (
                <textarea
                  value={editForm.charBg || ''}
                  onChange={(e) => setEditForm({...editForm, charBg: e.target.value})}
                  className="edit-textarea"
                  rows={3}
                />
              ) : (
                <p>{character.charBg || 'Não definida'}</p>
              )}
            </div>
            <div className="bg-item">
              <label>Habilidades Especiais:</label>
              {isEditing ? (
                <textarea
                  value={editForm.charSkills || ''}
                  onChange={(e) => setEditForm({...editForm, charSkills: e.target.value})}
                  className="edit-textarea"
                  rows={2}
                />
              ) : (
                <p>{character.charSkills || 'Não definidas'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Aparência */}
        <div className="section appearance">
          <h3>Aparência</h3>
          <div className="appearance-grid">
            {Object.entries(character.appearance || {}).map(([key, value]) => (
              <div key={key} className="appearance-item">
                <label>{key}:</label>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="edit-actions">
          <button className="btn-save" onClick={handleSave}>💾 Salvar</button>
          <button className="btn-cancel" onClick={handleCancel}>❌ Cancelar</button>
        </div>
      )}

      <style jsx>{`
        .character-sheet {
          background: #0c0700;
          border: 1px solid #180e00;
          border-radius: 8px;
          padding: 16px;
          margin: 12px 0;
        }

        .character-sheet.empty {
          text-align: center;
          padding: 40px;
          color: #4a2c00;
        }

        .sheet-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid #180e00;
          padding-bottom: 12px;
        }

        .sheet-header h2 {
          color: #d4a843;
          margin: 0;
          font-size: 16px;
        }

        .btn-edit {
          background: #2a0d00;
          border: 1px solid #8b5a14;
          color: #d4a843;
          border-radius: 4px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 12px;
        }

        .section {
          margin-bottom: 20px;
        }

        .section h3 {
          color: #d4a843;
          font-size: 12px;
          margin: 0 0 12px 0;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .info-item label {
          color: #6b4a1a;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .info-item span {
          color: #c4a060;
          font-size: 12px;
        }

        .level {
          background: #2a0d00;
          color: #d4a843;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: bold;
          text-align: center;
        }

        .attributes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 8px;
        }

        .attribute-card {
          background: #0a0600;
          border: 1px solid #180e00;
          border-radius: 6px;
          padding: 12px;
          text-align: center;
        }

        .attr-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-bottom: 8px;
        }

        .attr-icon {
          font-size: 16px;
        }

        .attr-name {
          color: #c4a060;
          font-size: 10px;
          font-weight: bold;
        }

        .attr-value {
          margin-bottom: 4px;
        }

        .attr-number {
          color: #d4a843;
          font-size: 18px;
          font-weight: bold;
        }

        .attr-input {
          background: #060407;
          border: 1px solid #180e00;
          color: #d4a843;
          border-radius: 4px;
          padding: 4px;
          width: 40px;
          text-align: center;
          font-size: 16px;
          font-weight: bold;
        }

        .attr-modifier {
          color: #6b4a1a;
          font-size: 10px;
        }

        .skills-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 8px;
        }

        .skill-card {
          background: #0a0600;
          border: 1px solid #180e00;
          border-radius: 6px;
          padding: 12px;
          text-align: center;
        }

        .skill-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-bottom: 8px;
        }

        .skill-icon {
          font-size: 16px;
        }

        .skill-name {
          color: #c4a060;
          font-size: 10px;
          font-weight: bold;
        }

        .skill-ranks {
          color: #d4a843;
          font-size: 12px;
        }

        .skill-input {
          background: #060407;
          border: 1px solid #180e00;
          color: #d4a843;
          border-radius: 4px;
          padding: 4px;
          width: 40px;
          text-align: center;
          font-size: 12px;
        }

        .skill-bonus {
          color: #6b4a1a;
          font-size: 10px;
        }

        .xp-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .xp-bar {
          background: #1a0e00;
          border-radius: 4px;
          height: 12px;
          overflow: hidden;
        }

        .xp-fill {
          background: linear-gradient(90deg, #4a8a14, #6aba34);
          height: 100%;
          transition: width 0.3s;
        }

        .xp-text {
          color: #c4a060;
          font-size: 11px;
          text-align: center;
        }

        .btn-level-up {
          background: linear-gradient(135deg, #2a6a1a, #1a4a0a);
          border: 1px solid #4a8a14;
          color: #d4a843;
          border-radius: 6px;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 12px;
          font-weight: bold;
          margin-top: 8px;
          width: 100%;
        }

        .background-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .bg-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .bg-item label {
          color: #6b4a1a;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .bg-item p {
          color: #c4a060;
          font-size: 11px;
          line-height: 1.4;
          margin: 0;
        }

        .edit-input, .edit-textarea {
          background: #060407;
          border: 1px solid #180e00;
          color: #c4a060;
          border-radius: 4px;
          padding: 6px 8px;
          font-size: 11px;
          outline: none;
          resize: none;
        }

        .edit-textarea {
          line-height: 1.4;
        }

        .appearance-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 8px;
        }

        .appearance-item {
          display: flex;
          justify-content: space-between;
          background: #0a0600;
          padding: 6px 8px;
          border-radius: 4px;
        }

        .appearance-item label {
          color: #6b4a1a;
          font-size: 10px;
          text-transform: capitalize;
        }

        .appearance-item span {
          color: #c4a060;
          font-size: 10px;
        }

        .edit-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #180e00;
        }

        .btn-save, .btn-cancel {
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          border: 1px solid;
        }

        .btn-save {
          background: #2a6a1a;
          border-color: #4a8a14;
          color: #d4a843;
        }

        .btn-cancel {
          background: #6a1a1a;
          border-color: #8a1414;
          color: #d4a843;
        }
      `}</style>
    </div>
  );
}
