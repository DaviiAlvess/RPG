import { useState } from 'react';

// Constants
const INVENTORY_CONSTANTS = {
  MAX_ITEMS: 50,
  ITEM_NAME_MAX_LENGTH: 50,
  NOTIFICATION_DURATION: 3000,
  ANIMATION_DURATION: 200,
};

// Item categories and their corresponding icons
const ITEM_CATEGORIES = {
  WEAPON: {
    keywords: ['espada', 'arma', 'espada longa', 'faca', 'punhal', 'machado', 'lança'],
    icon: '⚔️',
    color: '#8b4513'
  },
  POTION: {
    keywords: ['poção', 'cura', 'remédio', 'elixir', 'frasco'],
    icon: '🧪',
    color: '#4169e1'
  },
  ARMOR: {
    keywords: ['armadura', 'escudo', 'proteção', 'couraça', 'elmo'],
    icon: '🛡️',
    color: '#708090'
  },
  DOCUMENT: {
    keywords: ['mapa', 'pergaminho', 'livro', 'documento', 'carta'],
    icon: '📜',
    color: '#daa520'
  },
  KEY: {
    keywords: ['chave', 'baú', 'tesouro', 'caixa'],
    icon: '🗝️',
    color: '#ffd700'
  },
  FOOD: {
    keywords: ['comida', 'água', 'racao', 'pão', 'carne', 'fruta'],
    icon: '🍖',
    color: '#8fbc8f'
  },
  LIGHT: {
    keywords: ['tocha', 'lanterna', 'luz', 'vela', 'lamparina'],
    icon: '🔦',
    color: '#ffff00'
  },
  TOOL: {
    keywords: ['corda', 'gancho', 'ferramenta', 'martelo', 'alavanca'],
    icon: '🔧',
    color: '#696969'
  },
  MAGIC: {
    keywords: ['magia', 'amuleto', 'anel', 'runa', 'encantado'],
    icon: '✨',
    color: '#9370db'
  }
};

// Utility functions
class ItemUtils {
  static categorizeItem(itemName) {
    if (!itemName || typeof itemName !== 'string') {
      return { icon: '📦', color: '#808080', category: 'MISC' };
    }

    const normalizedItem = itemName.toLowerCase();
    
    for (const [category, config] of Object.entries(ITEM_CATEGORIES)) {
      if (config.keywords.some(keyword => normalizedItem.includes(keyword))) {
        return { 
          icon: config.icon, 
          color: config.color, 
          category 
        };
      }
    }
    
    return { icon: '📦', color: '#808080', category: 'MISC' };
  }

  static validateItemName(itemName) {
    if (!itemName || typeof itemName !== 'string') {
      return { isValid: false, error: 'Nome do item é obrigatório' };
    }

    const trimmedName = itemName.trim();
    
    if (trimmedName.length === 0) {
      return { isValid: false, error: 'Nome do item não pode estar vazio' };
    }

    if (trimmedName.length > INVENTORY_CONSTANTS.ITEM_NAME_MAX_LENGTH) {
      return { 
        isValid: false, 
        error: `Nome do item não pode ter mais de ${INVENTORY_CONSTANTS.ITEM_NAME_MAX_LENGTH} caracteres` 
      };
    }

    return { isValid: true, value: trimmedName };
  }

  static sanitizeItemName(itemName) {
    if (!itemName || typeof itemName !== 'string') return '';
    
    return itemName
      .trim()
      .slice(0, INVENTORY_CONSTANTS.ITEM_NAME_MAX_LENGTH)
      .replace(/[<>]/g, ''); // Remove potential HTML tags
  }

  static formatItemName(itemName) {
    if (!itemName) return '';
    
    // Capitalize first letter of each word
    return itemName
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

// Error handling
class InventoryErrorHandler {
  static handleItemOperationError(error, operation, itemName = '') {
    const context = itemName ? `${operation} for item "${itemName}"` : operation;
    console.error(`Inventory ${context}:`, error);
    
    // Could integrate with error reporting service here
    return {
      message: `Erro ao ${operation.toLowerCase()}${itemName ? ` o item "${itemName}"` : ''}`,
      type: 'error'
    };
  }

  static handleValidationError(validationError) {
    return {
      message: validationError.error,
      type: 'warning'
    };
  }
}

// Main inventory component
function Inventory({ items = [], onAddItem, onRemoveItem, onUseItem, maxItems = INVENTORY_CONSTANTS.MAX_ITEMS }) {
  const [newItemName, setNewItemName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Clear notification after duration
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, INVENTORY_CONSTANTS.NOTIFICATION_DURATION);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Show notification to user
  const showNotificationMessage = useCallback((message, type = 'info') => {
    setNotification({ message, type });
  }, []);

  // Add new item to inventory
  const handleAddItem = useCallback(async () => {
    if (isProcessing) return;
    
    const validation = ItemUtils.validateItemName(newItemName);
    if (!validation.isValid) {
      showNotificationMessage(validation.error, 'warning');
      return;
    }

    if (items.length >= maxItems) {
      showNotificationMessage(`Inventário cheio. Máximo de ${maxItems} itens.`, 'warning');
      return;
    }

    setIsProcessing(true);
    
    try {
      const sanitizedItem = ItemUtils.sanitizeItemName(validation.value);
      const formattedItem = ItemUtils.formatItemName(sanitizedItem);
      
      // Check for duplicates
      const existingItem = items.find(item => 
        item.toLowerCase() === formattedItem.toLowerCase()
      );
      
      if (existingItem) {
        showNotificationMessage(`Item "${formattedItem}" já existe no inventário.`, 'warning');
        return;
      }

      await onAddItem?.(formattedItem);
      showNotificationMessage(`Item "${formattedItem}" adicionado com sucesso.`, 'success');
      setNewItemName('');
      setShowAddForm(false);
      
    } catch (error) {
      const errorInfo = InventoryErrorHandler.handleItemOperationError(error, 'add', newItemName);
      showNotificationMessage(errorInfo.message, errorInfo.type);
    } finally {
      setIsProcessing(false);
    }
  }, [newItemName, items, maxItems, onAddItem, showNotificationMessage, isProcessing]);

  // Remove item from inventory
  const handleRemoveItem = useCallback(async (itemIndex) => {
    if (isProcessing || itemIndex < 0 || itemIndex >= items.length) return;
    
    setIsProcessing(true);
    
    try {
      const itemToRemove = items[itemIndex];
      await onRemoveItem?.(itemIndex);
      showNotificationMessage(`Item "${itemToRemove}" removido com sucesso.`, 'success');
      
    } catch (error) {
      const errorInfo = InventoryErrorHandler.handleItemOperationError(error, 'remove', items[itemIndex]);
      showNotificationMessage(errorInfo.message, errorInfo.type);
    } finally {
      setIsProcessing(false);
    }
  }, [items, onRemoveItem, showNotificationMessage, isProcessing]);

  // Use item from inventory
  const handleUseItem = useCallback(async (itemIndex) => {
    if (isProcessing || itemIndex < 0 || itemIndex >= items.length) return;
    
    setIsProcessing(true);
    
    try {
      const itemToUse = items[itemIndex];
      await onUseItem?.(itemToUse);
      showNotificationMessage(`Item "${itemToUse}" usado.`, 'success');
      
    } catch (error) {
      const errorInfo = InventoryErrorHandler.handleItemOperationError(error, 'use', items[itemIndex]);
      showNotificationMessage(errorInfo.message, errorInfo.type);
    } finally {
      setIsProcessing(false);
    }
  }, [items, onUseItem, showNotificationMessage, isProcessing]);

  // Handle form submission
  const handleFormSubmit = useCallback((event) => {
    event.preventDefault();
    handleAddItem();
  }, [handleAddItem]);

  // Handle input changes
  const handleInputChange = useCallback((event) => {
    const value = event.target.value;
    setNewItemName(value);
  }, []);

  // Toggle add form
  const toggleAddForm = useCallback(() => {
    if (!showAddForm) {
      setNewItemName('');
    }
    setShowAddForm(!showAddForm);
  }, [showAddForm]);

  // Get item display info
  const getItemDisplayInfo = useCallback((itemName) => {
    return ItemUtils.categorizeItem(itemName);
  }, []);

  // Render item grid
  const renderItems = () => {
    if (items.length === 0) {
      return (
        <div className="inventory-empty">
          <div className="empty-icon">📦</div>
          <p className="empty-title">Inventário vazio</p>
          <p className="empty-description">
            Adicione itens clicando no botão adicionar
          </p>
        </div>
      );
    }

    return (
      <div className="items-grid">
        {items.map((item, index) => {
          const itemInfo = getItemDisplayInfo(item);
          
          return (
            <div 
              key={`${item}-${index}`} 
              className="inventory-item"
              style={{ '--item-color': itemInfo.color }}
            >
              <div className="item-icon">{itemInfo.icon}</div>
              <div className="item-name" title={item}>
                {item}
              </div>
              <div className="item-actions">
                <button
                  className="action-button use-button"
                  onClick={() => handleUseItem(index)}
                  disabled={isProcessing}
                  title="Usar item"
                  aria-label={`Usar ${item}`}
                >
                  ✓
                </button>
                <button
                  className="action-button remove-button"
                  onClick={() => handleRemoveItem(index)}
                  disabled={isProcessing}
                  title="Remover item"
                  aria-label={`Remover ${item}`}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render add form
  const renderAddForm = () => {
    if (!showAddForm) return null;

    return (
      <form className="add-item-form" onSubmit={handleFormSubmit}>
        <div className="form-input-group">
          <input
            type="text"
            value={newItemName}
            onChange={handleInputChange}
            placeholder="Nome do item..."
            className="item-input"
            maxLength={INVENTORY_CONSTANTS.ITEM_NAME_MAX_LENGTH}
            disabled={isProcessing}
            autoFocus
          />
        </div>
        <div className="form-actions">
          <button
            type="submit"
            className="form-button confirm-button"
            disabled={isProcessing || !newItemName.trim()}
          >
            {isProcessing ? 'Adicionando...' : 'Adicionar'}
          </button>
          <button
            type="button"
            className="form-button cancel-button"
            onClick={toggleAddForm}
            disabled={isProcessing}
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  };

  // Render notification
  const renderNotification = () => {
    if (!notification) return null;

    return (
      <div className={`notification notification-${notification.type}`}>
        {notification.message}
      </div>
    );
  };

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h2 className="inventory-title">
          Inventário 
          <span className="item-count">({items.length}/{maxItems})</span>
        </h2>
        <button
          className="add-item-button"
          onClick={toggleAddForm}
          disabled={isProcessing}
          aria-label={showAddForm ? 'Fechar formulário' : 'Adicionar item'}
        >
          {showAddForm ? '✕' : '+'}
        </button>
      </div>

      {renderNotification()}
      {renderAddForm()}
      {renderItems()}

      <style jsx>{`
        .inventory-container {
          background: #0c0700;
          border: 1px solid #180e00;
          border-radius: 8px;
          padding: 16px;
          margin: 12px 0;
          position: relative;
        }

        .inventory-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid #180e00;
        }

        .inventory-title {
          color: #d4a843;
          font-size: 14px;
          font-weight: 600;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .item-count {
          font-size: 12px;
          opacity: 0.8;
        }

        .add-item-button {
          background: #2a0d00;
          border: 1px solid #8b5a14;
          color: #d4a843;
          border-radius: 4px;
          width: 32px;
          height: 32px;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .add-item-button:hover:not(:disabled) {
          background: #3a1a00;
          border-color: #ab7a24;
          transform: scale(1.05);
        }

        .add-item-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .notification {
          padding: 8px 12px;
          border-radius: 4px;
          margin-bottom: 12px;
          font-size: 12px;
          animation: slideIn 0.3s ease;
        }

        .notification-success {
          background: #1a3a0a;
          border: 1px solid #4a8a14;
          color: #a0d060;
        }

        .notification-warning {
          background: #3a3a0a;
          border: 1px solid #8a8a14;
          color: #d0d060;
        }

        .notification-error {
          background: #3a0a0a;
          border: 1px solid #8a1414;
          color: #d06060;
        }

        .add-item-form {
          background: #0a0600;
          border: 1px solid #180e00;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 16px;
        }

        .form-input-group {
          margin-bottom: 12px;
        }

        .item-input {
          width: 100%;
          background: #060407;
          border: 1px solid #180e00;
          border-radius: 4px;
          padding: 8px 12px;
          color: #c4a060;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s ease;
        }

        .item-input:focus {
          border-color: #8b5a14;
        }

        .item-input::placeholder {
          color: #4a2c00;
        }

        .form-actions {
          display: flex;
          gap: 8px;
        }

        .form-button {
          flex: 1;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .confirm-button {
          background: #2a6a1a;
          border: 1px solid #4a8a14;
          color: #d4a843;
        }

        .confirm-button:hover:not(:disabled) {
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

        .form-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 12px;
          max-height: 400px;
          overflow-y: auto;
          padding: 4px;
        }

        .inventory-item {
          background: #0a0600;
          border: 1px solid #180e00;
          border-radius: 6px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
          position: relative;
        }

        .inventory-item:hover {
          border-color: var(--item-color, #4a2000);
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }

        .item-icon {
          font-size: 28px;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
        }

        .item-name {
          color: #c4a060;
          font-size: 11px;
          text-align: center;
          line-height: 1.3;
          word-break: break-word;
          flex: 1;
          width: 100%;
        }

        .item-actions {
          display: flex;
          gap: 6px;
          width: 100%;
          justify-content: center;
        }

        .action-button {
          background: transparent;
          border: 1px solid #180e00;
          border-radius: 3px;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .use-button:hover:not(:disabled) {
          background: #1a3a0a;
          border-color: #4a8a14;
          color: #a0d060;
        }

        .remove-button:hover:not(:disabled) {
          background: #3a0a0a;
          border-color: #8a1414;
          color: #d06060;
        }

        .action-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .inventory-empty {
          text-align: center;
          padding: 40px 20px;
          color: #4a2c00;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 8px 0;
        }

        .empty-description {
          font-size: 12px;
          margin: 0;
          opacity: 0.8;
        }

        .items-grid::-webkit-scrollbar {
          width: 6px;
        }

        .items-grid::-webkit-scrollbar-thumb {
          background: #2a1800;
          border-radius: 3px;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 480px) {
          .items-grid {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 8px;
          }

          .inventory-item {
            padding: 8px;
          }

          .item-icon {
            font-size: 24px;
          }

          .item-name {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
}

export default Inventory;
