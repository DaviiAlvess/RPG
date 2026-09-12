import { useState } from 'react';
import NarrativeContent from './NarrativeContent';
import { listMasterAgreements, mergeMasterAgreements, stripAcordoTags } from '../lib/master-chat.mjs';

export default function MasterChat({ campaign, busy, onAsk, onSaveAgreements, onClose }) {
  const [draft, setDraft] = useState('');
  const [newAgreement, setNewAgreement] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [retryAt, setRetryAt] = useState(0);
  const agreements = listMasterAgreements(campaign);
  const send = async event => {
    event.preventDefault();
    if (busy || !draft.trim()) return;
    if (Date.now() < retryAt) { setError('Aguarde um pouco antes de tentar novamente. Sua mensagem está abaixo.'); return; }
    setError('');
    setStatus('');
    try {
      const added = await onAsk(draft.trim());
      setDraft('');
      if (added) setStatus('Acordo salvo');
    }
    catch (failure) { setError(failure.message); setRetryAt(Date.now() + Math.min(300, Math.max(0, Number(failure.retryAfter) || 0)) * 1000); }
  };
  const addAgreement = () => {
    const text = newAgreement.trim();
    if (busy || !text) return;
    const { list, added } = mergeMasterAgreements(campaign, [text]);
    onSaveAgreements(list);
    setNewAgreement('');
    setStatus(added.length ? 'Acordo salvo' : 'Esse combinado já estava na lista.');
  };
  const removeAgreement = index => {
    if (busy) return;
    onSaveAgreements(agreements.filter((_, current) => current !== index));
    setStatus('Acordo removido.');
  };
  return <div className="modal-overlay"><section className="modal-content master-chat" role="dialog" aria-modal="true" aria-labelledby="master-chat-title">
    <div className="modal-header"><h3 id="master-chat-title">Falar com o Mestre</h3><button type="button" className="modal-close" aria-label="Fechar conversa" disabled={busy} onClick={onClose}>×</button></div>
    <div className="modal-body">
      <p className="settings-hint">Aqui você fala como jogador, fora da história. Pedidos que mudam a mesa viram acordos e passam a valer nos próximos turnos. A conversa não entra no narrador.</p>
      <div className="master-chat-messages" aria-live="polite">
        {!campaign.masterChat?.length ? <p>Pergunte sobre a cena, uma regra ou como deixar a aventura do seu jeito.</p> : null}
        {(campaign.masterChat || []).map((message, index) => <div key={index} className="master-chat-message"><strong>{message.role === 'user' ? 'Você' : 'Mestre'}</strong><NarrativeContent text={stripAcordoTags(message.content)} /></div>)}
        {busy ? <p>O Mestre está respondendo…</p> : null}
      </div>
      <form onSubmit={send}>
        <label htmlFor="master-question">Sua mensagem ao Mestre</label>
        <textarea autoFocus id="master-question" className="time-textarea" rows={3} maxLength={2000} value={draft} disabled={busy} onChange={event => setDraft(event.target.value)} placeholder="Ex.: por que preciso desse teste? Quero mais diálogo e menos combate." />
        {error ? <p role="alert">{error}</p> : null}
        <button className="btn-confirm" type="submit" disabled={busy || !draft.trim()}>{busy ? 'Conversando…' : error ? 'Tentar novamente' : 'Enviar ao Mestre'}</button>
      </form>
      <section className="master-agreements" aria-labelledby="master-agreements-title">
        <h4 id="master-agreements-title">Acordos da mesa</h4>
        <p>Estes combinados entram na narração dos próximos turnos. Apague um se não quiser mais.</p>
        {agreements.length ? <ul className="master-agreement-list">
          {agreements.map((text, index) => <li key={`${index}-${text.slice(0, 24)}`} className="master-agreement">
            <p>{text}</p>
            <button type="button" className="btn-cancel" disabled={busy} onClick={() => removeAgreement(index)} aria-label={`Remover acordo: ${text}`}>Remover</button>
          </li>)}
        </ul> : <p>Nenhum acordo salvo ainda. Peça ao Mestre ou escreva abaixo.</p>}
        <label htmlFor="master-guidance">Novo acordo</label>
        <textarea id="master-guidance" className="time-textarea" rows={2} maxLength={400} value={newAgreement} disabled={busy} onChange={event => { setNewAgreement(event.target.value); setStatus(''); }} placeholder="Mais conversas com NPCs, cenas curtas e liberdade para explorar." />
        <button type="button" className="btn-cancel" disabled={busy || !newAgreement.trim()} onClick={addAgreement}>Adicionar acordo</button>
        {status ? <p role="status">{status}</p> : null}
      </section>
    </div>
  </section></div>;
}
