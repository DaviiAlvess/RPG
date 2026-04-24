import { useState } from 'react';

// Character system constants
const CHARACTER_CONSTANTS = {
  MIN_ATTRIBUTE_VALUE: 1,
  MAX_ATTRIBUTE_VALUE: 20,
  MIN_SKILL_LEVEL: 1,
  MAX_SKILL_LEVEL: 10,
  BASE_ATTRIBUTE_VALUE: 10,
  XP_PER_LEVEL: 100,
  MAX_CHARACTER_NAME_LENGTH: 50,
  MAX_BIOGRAPHY_LENGTH: 500,
};

// Attribute definitions
const ATTRIBUTES = {
  STRENGTH: {
    name: 'Força',
    key: 'strength',
    icon: '💪',
    description: 'Poder físico, capacidade de carga e dano corpo a corpo'
  },
  DEXTERITY: {
    name: 'Destreza',
    key: 'dexterity',
    icon: '🤸',
    description: 'Agilidade, reflexos e precisão'
  },
  MIND: {
    name: 'Mente',
    key: 'mind',
    icon: '🧠',
    description: 'Inteligência, percepção e resistência mental'
  },
  CHARISMA: {
    name: 'Carisma',
    key: 'charisma',
    icon: '✨',
    description: 'Liderança, persuasão e influência social'
  }
};

// Skill definitions
const SKILLS = {
  COMBAT: {
    name: 'Luta',
    key: 'combat',
    icon: '⚔️',
    description: 'Proficiência em combate corpo a corpo',
    attribute: 'strength'
  },
  STEALTH: {
    name: 'Furtividade',
    key: 'stealth',
    icon: '🥷',
    description: 'Capacidade de se mover sem ser detectado',
    attribute: 'dexterity'
  },
  MAGIC: {
    name: 'Magia',
    key: 'magic',
    icon: '🔮',
    description: 'Conhecimento e uso de poderes mágicos',
    attribute: 'mind'
  },
  PERSUASION: {
    name: 'Persuasão',
    key: 'persuasion',
    icon: '🗣️',
    description: 'Habilidade de convencer e influenciar outros',
    attribute: 'charisma'
  },
  SURVIVAL: {
    name: 'Sobrevivência',
    key: 'survival',
    icon: '🏕️',
    description: 'Conhecimento para sobreviver na natureza',
    attribute: 'mind'
  },
  PERCEPTION: {
    name: 'Percepção',
    key: 'perception',
    icon: '👁️',
    description: 'Capacidade de notar detalhes e perigos',
    attribute: 'mind'
  }
};

// Character validation utilities
class CharacterValidator {
  static validateAttribute(value) {
    const num = Number(value);
    
    if (isNaN(num)) {
      return { isValid: false, error: 'Valor deve ser um número' };
    }
    
    if (num < CHARACTER_CONSTANTS.MIN_ATTRIBUTE_VALUE || num > CHARACTER_CONSTANTS.MAX_ATTRIBUTE_VALUE) {
      return { 
        isValid: false, 
        error: `Valor deve estar entre ${CHARACTER_CONSTANTS.MIN_ATTRIBUTE_VALUE} e ${CHARACTER_CONSTANTS.MAX_ATTRIBUTE_VALUE}` 
      };
    }
    
    return { isValid: true, value: num };
  }

  static validateSkill(value) {
    const num = Number(value);
    
    if (isNaN(num)) {
      return { isValid: false, error: 'Nível deve ser um número' };
    }
    
    if (num < CHARACTER_CONSTANTS.MIN_SKILL_LEVEL || num > CHARACTER_CONSTANTS.MAX_SKILL_LEVEL) {
      return { 
        isValid: false, 
        error: `Nível deve estar entre ${CHARACTER_CONSTANTS.MIN_SKILL_LEVEL} e ${CHARACTER_CONSTANTS.MAX_SKILL_LEVEL}` 
      };
    }
    
    return { isValid: true, value: num };
  }

  static validateCharacterName(name) {
    if (!name || typeof name !== 'string') {
      return { isValid: false, error: 'Nome é obrigatório' };
    }
    
    const trimmedName = name.trim();
    
    if (trimmedName.length === 0) {
      return { isValid: false, error: 'Nome não pode estar vazio' };
    }
    
    if (trimmedName.length > CHARACTER_CONSTANTS.MAX_CHARACTER_NAME_LENGTH) {
      return { 
        isValid: false, 
        error: `Nome não pode ter mais de ${CHARACTER_CONSTANTS.MAX_CHARACTER_NAME_LENGTH} caracteres` 
      };
    }
    
    return { isValid: true, value: trimmedName };
  }

  static validateBiography(text) {
    if (!text || typeof text !== 'string') {
      return { isValid: true, value: '' };
    }
    
    if (text.length > CHARACTER_CONSTANTS.MAX_BIOGRAPHY_LENGTH) {
      return { 
        isValid: false, 
        error: `Biografia não pode ter mais de ${CHARACTER_CONSTANTS.MAX_BIOGRAPHY_LENGTH} caracteres` 
      };
    }
    
    return { isValid: true, value: text.trim() };
  }

  static sanitizeInput(input, maxLength = null) {
    if (!input || typeof input !== 'string') return '';
    
    let sanitized = input.trim();
    
    // Remove potential HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    
    // Apply length limit if specified
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.slice(0, maxLength);
    }
    
    return sanitized;
  }
}

// Character calculation utilities
class CharacterCalculator {
  static getAttributeModifier(attributeValue) {
    return Math.floor((attributeValue - CHARACTER_CONSTANTS.BASE_ATTRIBUTE_VALUE) / 2);
  }

  static getSkillBonus(skillLevel) {
    return skillLevel - CHARACTER_CONSTANTS.MIN_SKILL_LEVEL;
  }

  static calculateLevel(experience) {
    return Math.floor(experience / CHARACTER_CONSTANTS.XP_PER_LEVEL) + 1;
  }

  static getExperienceForNextLevel(currentLevel) {
    return currentLevel * CHARACTER_CONSTANTS.XP_PER_LEVEL;
  }

  static getCurrentLevelExperience(totalExperience) {
    return totalExperience % CHARACTER_CONSTANTS.XP_PER_LEVEL;
  }

  static canLevelUp(totalExperience) {
    return this.getCurrentLevelExperience(totalExperience) === 0 && totalExperience > 0;
  }

  static calculateTotalSkillBonus(skills, relatedAttribute) {
    const skillBonus = this.getSkillBonus(skills[relatedAttribute] || 1);
    const attributeModifier = this.getAttributeModifier(relatedAttribute);
    return skillBonus + attributeModifier;
  }
}

// Error handling
class CharacterErrorHandler {
  static handleValidationError(error, field) {
    console.error(`Validation error in ${field}:`, error);
    return {
      message: error.error || `Erro ao validar ${field}`,
      type: 'validation',
      field
    };
  }

  static handleOperationError(error, operation) {
    console.error(`Error in ${operation}:`, error);
    return {
      message: `Erro ao ${operation}`,
      type: 'operation',
      operation
    };
  }
}

// Main character sheet component
function CharacterSheet({ 
  character, 
  onUpdateCharacter, 
  onLevelUp,
  isActive = false 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize edit form when character changes
  useEffect(() => {
    if (character) {
      setEditForm({
        charName: character.charName || '',
        charTitle: character.charTitle || '',
        charAge: character.charAge || '',
        charBg: character.charBg || '',
        charPersonality: character.charPersonality || '',
        charSkills: character.charSkills || '',
        attributes: character.attributes || {},
        skills: character.skills || {}
      });
      setValidationErrors({});
    }
  }, [character]);

  // Validate field value
  const validateField = useCallback((field, value) => {
    let validation = { isValid: true };

    switch (field) {
      case 'charName':
        validation = CharacterValidator.validateCharacterName(value);
        break;
      case 'charBg':
      case 'charPersonality':
      case 'charSkills':
        validation = CharacterValidator.validateBiography(value);
        break;
      default:
        if (field.startsWith('attr_')) {
          validation = CharacterValidator.validateAttribute(value);
        } else if (field.startsWith('skill_')) {
          validation = CharacterValidator.validateSkill(value);
        }
    }

    return validation;
  }, []);

  // Handle form field changes
  const handleFieldChange = useCallback((field, value) => {
    const sanitizedValue = CharacterValidator.sanitizeInput(value);
    
    // Validate the field
    const validation = validateField(field, sanitizedValue);
    
    // Update validation errors
    setValidationErrors(prev => ({
      ...prev,
      [field]: validation.isValid ? null : validation.error
    }));

    // Update form data
    setEditForm(prev => {
      if (field.startsWith('attr_')) {
        const attrKey = field.replace('attr_', '');
        return {
          ...prev,
          attributes: {
            ...prev.attributes,
            [attrKey]: validation.isValid ? validation.value : prev.attributes?.[attrKey] || CHARACTER_CONSTANTS.BASE_ATTRIBUTE_VALUE
          }
        };
      } else if (field.startsWith('skill_')) {
        const skillKey = field.replace('skill_', '');
        return {
          ...prev,
          skills: {
            ...prev.skills,
            [skillKey]: validation.isValid ? validation.value : prev.skills?.[skillKey] || CHARACTER_CONSTANTS.MIN_SKILL_LEVEL
          }
        };
      } else {
        return {
          ...prev,
          [field]: validation.isValid ? validation.value : prev[field] || ''
        };
      }
    });
  }, [validateField]);

  // Save character changes
  const handleSave = useCallback(async () => {
    if (isProcessing) return;

    // Check for validation errors
    const hasErrors = Object.values(validationErrors).some(error => error !== null);
    if (hasErrors) {
      return;
    }

    setIsProcessing(true);

    try {
      const updatedCharacter = {
        ...character,
        ...editForm,
        attributes: editForm.attributes || character.attributes || {},
        skills: editForm.skills || character.skills || {}
      };

      await onUpdateCharacter?.(updatedCharacter);
      setIsEditing(false);
      
    } catch (error) {
      const errorInfo = CharacterErrorHandler.handleOperationError(error, 'salvar personagem');
      console.error(errorInfo.message);
    } finally {
      setIsProcessing(false);
    }
  }, [character, editForm, validationErrors, isProcessing, onUpdateCharacter]);

  // Cancel editing
  const handleCancel = useCallback(() => {
    if (isProcessing) return;
    
    setIsEditing(false);
    setValidationErrors({});
    
    // Reset form to original character data
    if (character) {
      setEditForm({
        charName: character.charName || '',
        charTitle: character.charTitle || '',
        charAge: character.charAge || '',
        charBg: character.charBg || '',
        charPersonality: character.charPersonality || '',
        charSkills: character.charSkills || '',
        attributes: character.attributes || {},
        skills: character.skills || {}
      });
    }
  }, [character, isProcessing]);

  // Toggle edit mode
  const toggleEditMode = useCallback(() => {
    if (!isEditing) {
      setIsEditing(true);
    } else {
      handleCancel();
    }
  }, [isEditing, handleCancel]);

  // Handle level up
  const handleLevelUpAction = useCallback(async () => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      await onLevelUp?.();
    } catch (error) {
      const errorInfo = CharacterErrorHandler.handleOperationError(error, 'subir de nível');
      console.error(errorInfo.message);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, onLevelUp]);

  // Render attribute section
  const renderAttributes = () => {
    return (
      <div className="character-section">
        <h3 className="section-title">Atributos</h3>
        <div className="attributes-grid">
          {Object.values(ATTRIBUTES).map(attribute => {
            const currentValue = character.attributes?.[attribute.key] || CHARACTER_CONSTANTS.BASE_ATTRIBUTE_VALUE;
            const editValue = editForm.attributes?.[attribute.key] || currentValue;
            const modifier = CharacterCalculator.getAttributeModifier(currentValue);
            const fieldKey = `attr_${attribute.key}`;
            const hasError = !!validationErrors[fieldKey];

            return (
              <div key={attribute.key} className="attribute-card">
                <div className="attribute-header">
                  <span className="attribute-icon">{attribute.icon}</span>
                  <span className="attribute-name">{attribute.name}</span>
                </div>
                
                {isEditing ? (
                  <div className="attribute-input-group">
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                      className={`attribute-input ${hasError ? 'error' : ''}`}
                      min={CHARACTER_CONSTANTS.MIN_ATTRIBUTE_VALUE}
                      max={CHARACTER_CONSTANTS.MAX_ATTRIBUTE_VALUE}
                    />
                    {hasError && (
                      <div className="field-error">{validationErrors[fieldKey]}</div>
                    )}
                  </div>
                ) : (
                  <div className="attribute-value">{currentValue}</div>
                )}
                
                <div className="attribute-modifier">
                  {modifier >= 0 ? '+' : ''}{modifier}
                </div>
                
                <div className="attribute-description">
                  {attribute.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render skills section
  const renderSkills = () => {
    return (
      <div className="character-section">
        <h3 className="section-title">Habilidades</h3>
        <div className="skills-grid">
          {Object.values(SKILLS).map(skill => {
            const currentLevel = character.skills?.[skill.key] || CHARACTER_CONSTANTS.MIN_SKILL_LEVEL;
            const editLevel = editForm.skills?.[skill.key] || currentLevel;
            const bonus = CharacterCalculator.getSkillBonus(currentLevel);
            const fieldKey = `skill_${skill.key}`;
            const hasError = !!validationErrors[fieldKey];

            return (
              <div key={skill.key} className="skill-card">
                <div className="skill-header">
                  <span className="skill-icon">{skill.icon}</span>
                  <span className="skill-name">{skill.name}</span>
                </div>
                
                {isEditing ? (
                  <div className="skill-input-group">
                    <input
                      type="number"
                      value={editLevel}
                      onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                      className={`skill-input ${hasError ? 'error' : ''}`}
                      min={CHARACTER_CONSTANTS.MIN_SKILL_LEVEL}
                      max={CHARACTER_CONSTANTS.MAX_SKILL_LEVEL}
                    />
                    {hasError && (
                      <div className="field-error">{validationErrors[fieldKey]}</div>
                    )}
                  </div>
                ) : (
                  <div className="skill-level">
                    {'⭐'.repeat(currentLevel)}
                  </div>
                )}
                
                <div className="skill-bonus">
                  +{bonus}
                </div>
                
                <div className="skill-description">
                  {skill.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render experience section
  const renderExperience = () => {
    const currentLevel = CharacterCalculator.calculateLevel(character.experience || 0);
    const currentXp = CharacterCalculator.getCurrentLevelExperience(character.experience || 0);
    const nextLevelXp = CharacterCalculator.getExperienceForNextLevel(currentLevel);
    const canLevelUp = CharacterCalculator.canLevelUp(character.experience || 0);

    return (
      <div className="character-section">
        <h3 className="section-title">Experiência</h3>
        <div className="experience-container">
          <div className="experience-info">
            <div className="level-display">
              Nível {currentLevel}
            </div>
            <div className="experience-bar">
              <div 
                className="experience-fill" 
                style={{ width: `${(currentXp / CHARACTER_CONSTANTS.XP_PER_LEVEL) * 100}%` }}
              />
            </div>
            <div className="experience-text">
              {currentXp} / {CHARACTER_CONSTANTS.XP_PER_LEVEL} XP
            </div>
          </div>
          
          {canLevelUp && (
            <button 
              className="level-up-button"
              onClick={handleLevelUpAction}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processando...' : 'Subir de Nível'}
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render basic info section
  const renderBasicInfo = () => {
    const fields = [
      { key: 'charName', label: 'Nome', required: true },
      { key: 'charTitle', label: 'Título', required: false },
      { key: 'charAge', label: 'Idade', required: false },
    ];

    return (
      <div className="character-section">
        <h3 className="section-title">Informações Básicas</h3>
        <div className="info-grid">
          {fields.map(field => {
            const fieldKey = field.key;
            const currentValue = character[fieldKey] || '';
            const editValue = editForm[fieldKey] || '';
            const hasError = !!validationErrors[fieldKey];

            return (
              <div key={fieldKey} className="info-item">
                <label className="info-label">
                  {field.label}
                  {field.required && <span className="required">*</span>}
                </label>
                
                {isEditing ? (
                  <div className="info-input-group">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                      className={`info-input ${hasError ? 'error' : ''}`}
                      maxLength={CHARACTER_CONSTANTS.MAX_CHARACTER_NAME_LENGTH}
                    />
                    {hasError && (
                      <div className="field-error">{validationErrors[fieldKey]}</div>
                    )}
                  </div>
                ) : (
                  <div className="info-value">
                    {currentValue || <span className="empty-value">Não definido</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render background section
  const renderBackground = () => {
    const fields = [
      { key: 'charPersonality', label: 'Personalidade' },
      { key: 'charBg', label: 'História' },
      { key: 'charSkills', label: 'Habilidades Especiais' },
    ];

    return (
      <div className="character-section">
        <h3 className="section-title">Background</h3>
        <div className="background-content">
          {fields.map(field => {
            const fieldKey = field.key;
            const currentValue = character[fieldKey] || '';
            const editValue = editForm[fieldKey] || '';
            const hasError = !!validationErrors[fieldKey];

            return (
              <div key={fieldKey} className="background-item">
                <label className="background-label">{field.label}</label>
                
                {isEditing ? (
                  <div className="background-input-group">
                    <textarea
                      value={editValue}
                      onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                      className={`background-textarea ${hasError ? 'error' : ''}`}
                      rows={3}
                      maxLength={CHARACTER_CONSTANTS.MAX_BIOGRAPHY_LENGTH}
                    />
                    {hasError && (
                      <div className="field-error">{validationErrors[fieldKey]}</div>
                    )}
                  </div>
                ) : (
                  <div className="background-value">
                    {currentValue || <span className="empty-value">Não definido</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render appearance section
  const renderAppearance = () => {
    if (!character.appearance) return null;

    return (
      <div className="character-section">
        <h3 className="section-title">Aparência</h3>
        <div className="appearance-grid">
          {Object.entries(character.appearance).map(([key, value]) => (
            <div key={key} className="appearance-item">
              <span className="appearance-label">
                {key.replace(/([A-Z])/g, ' $1').trim()}:
              </span>
              <span className="appearance-value">{value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!character) {
    return (
      <div className="character-sheet empty">
        <div className="empty-state">
          <div className="empty-icon">📜</div>
          <p className="empty-message">Nenhum personagem carregado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="character-sheet">
      <div className="sheet-header">
        <h2 className="sheet-title">Ficha de Personagem</h2>
        <button 
          className="edit-button"
          onClick={toggleEditMode}
          disabled={isProcessing}
        >
          {isEditing ? 'Cancelar' : 'Editar'}
        </button>
      </div>

      <div className="sheet-content">
        {renderBasicInfo()}
        {renderAttributes()}
        {renderSkills()}
        {renderExperience()}
        {renderBackground()}
        {renderAppearance()}
      </div>

      {isEditing && (
        <div className="sheet-actions">
          <button 
            className="save-button"
            onClick={handleSave}
            disabled={isProcessing || Object.values(validationErrors).some(error => error !== null)}
          >
            {isProcessing ? 'Salvando...' : 'Salvar'}
          </button>
          <button 
            className="cancel-button"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            Cancelar
          </button>
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
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .empty-icon {
          font-size: 48px;
          opacity: 0.5;
        }

        .empty-message {
          color: #4a2c00;
          font-size: 14px;
          margin: 0;
        }

        .sheet-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid #180e00;
        }

        .sheet-title {
          color: #d4a843;
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .edit-button {
          background: #2a0d00;
          border: 1px solid #8b5a14;
          color: #d4a843;
          border-radius: 4px;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
        }

        .edit-button:hover:not(:disabled) {
          background: #3a1a00;
          border-color: #ab7a24;
        }

        .edit-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .character-section {
          margin-bottom: 24px;
        }

        .section-title {
          color: #d4a843;
          font-size: 12px;
          margin: 0 0 12px 0;
          letter-spacing: 1px;
          text-transform: uppercase;
          font-weight: 600;
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

        .info-label {
          color: #6b4a1a;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 500;
        }

        .required {
          color: #8b1414;
        }

        .info-value {
          color: #c4a060;
          font-size: 12px;
          padding: 6px 8px;
          background: #0a0600;
          border: 1px solid #180e00;
          border-radius: 4px;
        }

        .empty-value {
          color: #4a2c00;
          font-style: italic;
        }

        .info-input {
          background: #060407;
          border: 1px solid #180e00;
          color: #c4a060;
          border-radius: 4px;
          padding: 6px 8px;
          font-size: 12px;
          outline: none;
          transition: border-color 0.2s ease;
        }

        .info-input:focus {
          border-color: #8b5a14;
        }

        .info-input.error {
          border-color: #8b1414;
        }

        .attributes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
        }

        .attribute-card {
          background: #0a0600;
          border: 1px solid #180e00;
          border-radius: 6px;
          padding: 12px;
          text-align: center;
        }

        .attribute-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-bottom: 8px;
        }

        .attribute-icon {
          font-size: 16px;
        }

        .attribute-name {
          color: #c4a060;
          font-size: 10px;
          font-weight: 600;
        }

        .attribute-value {
          color: #d4a843;
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .attribute-input {
          background: #060407;
          border: 1px solid #180e00;
          color: #d4a843;
          border-radius: 4px;
          padding: 4px;
          width: 40px;
          text-align: center;
          font-size: 16px;
          font-weight: 600;
          outline: none;
        }

        .attribute-input:focus {
          border-color: #8b5a14;
        }

        .attribute-input.error {
          border-color: #8b1414;
        }

        .attribute-modifier {
          color: #6b4a1a;
          font-size: 10px;
          margin-bottom: 4px;
        }

        .attribute-description {
          color: #4a2c00;
          font-size: 8px;
          line-height: 1.3;
        }

        .skills-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
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
          font-weight: 600;
        }

        .skill-level {
          color: #d4a843;
          font-size: 12px;
          margin-bottom: 4px;
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
          outline: none;
        }

        .skill-input:focus {
          border-color: #8b5a14;
        }

        .skill-input.error {
          border-color: #8b1414;
        }

        .skill-bonus {
          color: #6b4a1a;
          font-size: 10px;
          margin-bottom: 4px;
        }

        .skill-description {
          color: #4a2c00;
          font-size: 8px;
          line-height: 1.3;
        }

        .experience-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .experience-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .level-display {
          color: #d4a843;
          font-size: 14px;
          font-weight: 600;
          text-align: center;
        }

        .experience-bar {
          background: #1a0e00;
          border-radius: 4px;
          height: 12px;
          overflow: hidden;
        }

        .experience-fill {
          background: linear-gradient(90deg, #4a8a14, #6aba34);
          height: 100%;
          transition: width 0.3s ease;
        }

        .experience-text {
          color: #c4a060;
          font-size: 11px;
          text-align: center;
        }

        .level-up-button {
          background: linear-gradient(135deg, #2a6a1a, #1a4a0a);
          border: 1px solid #4a8a14;
          color: #d4a843;
          border-radius: 6px;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .level-up-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #3a8a2a, #2a6a1a);
          transform: translateY(-1px);
        }

        .level-up-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .background-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .background-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .background-label {
          color: #6b4a1a;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 500;
        }

        .background-value {
          color: #c4a060;
          font-size: 11px;
          line-height: 1.4;
          padding: 8px 12px;
          background: #0a0600;
          border: 1px solid #180e00;
          border-radius: 4px;
        }

        .background-textarea {
          background: #060407;
          border: 1px solid #180e00;
          color: #c4a060;
          border-radius: 4px;
          padding: 8px 12px;
          font-size: 11px;
          outline: none;
          resize: vertical;
          line-height: 1.4;
          font-family: inherit;
        }

        .background-textarea:focus {
          border-color: #8b5a14;
        }

        .background-textarea.error {
          border-color: #8b1414;
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

        .appearance-label {
          color: #6b4a1a;
          font-size: 10px;
          text-transform: capitalize;
        }

        .appearance-value {
          color: #c4a060;
          font-size: 10px;
        }

        .field-error {
          color: #8b1414;
          font-size: 9px;
          margin-top: 2px;
        }

        .sheet-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #180e00;
        }

        .save-button, .cancel-button {
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .save-button {
          background: #2a6a1a;
          border: 1px solid #4a8a14;
          color: #d4a843;
        }

        .save-button:hover:not(:disabled) {
          background: #3a8a2a;
          border-color: #6aba34;
        }

        .cancel-button {
          background: #6a1a1a;
          border: 1px solid #8a1414;
          color: #d4a843;
        }

        .cancel-button:hover:not(:disabled) {
          background: #8a2a2a;
          border-color: #aa2424;
        }

        .save-button:disabled, .cancel-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 480px) {
          .character-sheet {
            padding: 12px;
          }

          .attributes-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .skills-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default CharacterSheet;
