import { useState } from 'react';

export default function Inventory({ items, onAddItem, onRemoveItem, onUseItem }) {
  const [newItem, setNewItem] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddItem = () => {
    if (newItem.trim()) {
      onAddItem(newItem.trim());
      setNewItem('');
      setShowAddForm(false);
    }
  };

  const getItemIcon = (item) => {
    const icons = {
      'espada': '⚔️', 'arma': '⚔️', 'espada longa': '🗡️',
      'poção': '🧪', 'cura': '💊', 'remédio': '💊',
      'armadura': '🛡️', 'escudo': '🛡️', 'proteção': '🛡️',
      'mapa': '🗺️', 'pergaminho': '📜', 'livro': '📚',
      'chave': '🗝️', 'baú': '📦', 'tesouro': '💰',
      'comida': '🍖', 'água': '💧', 'racao': '🥖',
      'tocha': '🔦', 'lanterna': '🔦', 'luz': '💡',
      'corda': '🪢', 'gancho': '🪝', 'ferramenta': '🔧',
      'magia': '✨', 'amuleto': '📿', 'anel': '💍',
    };

    const itemLower = item.toLowerCase();
    for (const [key, icon] of Object.entries(icons)) {
      if (itemLower.includes(key)) return icon;
    }
    return '📦'; // Ícone padrão
  };

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h3>🎒 Inventário ({items?.length || 0} itens)</h3>
        <button 
          className="btn-add-item"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '✕' : '+'}
        </button>
      </div>

      {showAddForm && (
        <div className="add-item-form">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Nome do item..."
            className="item-input"
            onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
          />
          <button onClick={handleAddItem} className="btn-confirm">Adicionar</button>
        </div>
      )}

      <div className="items-grid">
        {items?.length > 0 ? (
          items.map((item, index) => (
            <div key={index} className="inventory-item">
              <div className="item-icon">{getItemIcon(item)}</div>
              <div className="item-name">{item}</div>
              <div className="item-actions">
                <button 
                  className="btn-use"
                  onClick={() => onUseItem && onUseItem(item)}
                  title="Usar item"
                >
                  ✓
                </button>
                <button 
                  className="btn-remove"
                  onClick={() => onRemoveItem && onRemoveItem(index)}
                  title="Remover item"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-inventory">
            <p>Nenhum item no inventário</p>
            <small>Adicione itens clicando no botão +</small>
          </div>
        )}
      </div>

      <style jsx>{`
        .inventory-container {
          background: #0c0700;
          border: 1px solid #180e00;
          border-radius: 8px;
          padding: 12px;
          margin-top: 12px;
        }

        .inventory-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .inventory-header h3 {
          color: #d4a843;
          font-size: 12px;
          margin: 0;
          letter-spacing: 1px;
        }

        .btn-add-item {
          background: #2a0d00;
          border: 1px solid #8b5a14;
          color: #d4a843;
          border-radius: 4px;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .add-item-form {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .item-input {
          flex: 1;
          background: #0a0600;
          border: 1px solid #180e00;
          border-radius: 4px;
          padding: 6px 8px;
          color: #c4a060;
          font-size: 11px;
          outline: none;
        }

        .btn-confirm {
          background: #2a0d00;
          border: 1px solid #8b5a14;
          color: #d4a843;
          border-radius: 4px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 10px;
        }

        .items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 8px;
          max-height: 200px;
          overflow-y: auto;
        }

        .inventory-item {
          background: #0a0600;
          border: 1px solid #180e00;
          border-radius: 6px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          transition: all 0.2s;
        }

        .inventory-item:hover {
          border-color: #4a2000;
          transform: translateY(-1px);
        }

        .item-icon {
          font-size: 24px;
        }

        .item-name {
          color: #c4a060;
          font-size: 10px;
          text-align: center;
          line-height: 1.3;
          word-break: break-word;
        }

        .item-actions {
          display: flex;
          gap: 4px;
        }

        .btn-use, .btn-remove {
          background: transparent;
          border: 1px solid #180e00;
          border-radius: 3px;
          color: #6b4a1a;
          width: 20px;
          height: 20px;
          cursor: pointer;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-use:hover {
          background: #1a3a0a;
          border-color: #4a8a14;
          color: #a0d060;
        }

        .btn-remove:hover {
          background: #3a0a0a;
          border-color: #8a1414;
          color: #d06060;
        }

        .empty-inventory {
          text-align: center;
          padding: 20px;
          color: #4a2c00;
        }

        .empty-inventory p {
          margin: 0 0 4px 0;
          font-size: 11px;
        }

        .empty-inventory small {
          font-size: 9px;
          opacity: 0.7;
        }

        .items-grid::-webkit-scrollbar {
          width: 4px;
        }

        .items-grid::-webkit-scrollbar-thumb {
          background: #2a1800;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
