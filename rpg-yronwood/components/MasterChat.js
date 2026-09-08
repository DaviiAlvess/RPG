import { useState } from 'react';
import NarrativeContent from './NarrativeContent';

export default function MasterChat({ campaign, busy, onAsk, onSaveGuidance, onClose }) {
  const [draft, setDraft] = useState('');
  const [guidance, setGuidance] = useState(campaign.masterGuidance || '');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const send = async event => {
    event.preventDefault();
    if (busy || !draft.trim()) return;
    if (Date.now() < retryAt) { setError('Aguarde um pouco antes de tentar novamente. Sua mensagem está abaixo.'); return; }
    setError('');
    try { await onAsk(draft.trim()); setDraft(''); }
    catch (failure) { setError(failure.message); setRetryAt(Date.now() + Math.min(300, Math.max(0, Number(failure.retryAfter) || 0)) * 1000); }
  };
  return <div className="modal-overlay"><section className="modal-content master-chat" role="dialog" aria-modal="true" aria-labelledby="master-chat-title">
    <div className="modal-header"><h3 id="master-chat-title">Conversar com o Mestre</h3><button type="button" className="modal-close" aria-label="Fechar conversa" disabled={busy} onClick={onClose}>×</button></div>
    <div className="modal-body">
      <p className="settings-hint">Aqui você fala como jogador. A conversa fica salva, sem avançar a história. As respostas usam a IA e respeitam seu modo economia.</p>
      <div className="master-chat-messages" aria-live="polite">
        {!campaign.masterChat?.length ? <p>Pergunte sobre a cena, uma regra ou como deixar a aventura do seu jeito.</p> : null}
        {(campaign.masterChat || []).map((message, index) => <div key={index} className="master-chat-message"><strong>{message.role === 'user' ? 'Você' : 'Mestre'}</strong><NarrativeContent text={message.content} /></div>)}
        {busy ? <p>O Mestre está respondendo…</p> : null}
      </div>
      <form onSubmit={send}>
        <label htmlFor="master-question">Sua mensagem ao Mestre</label>
        <textarea autoFocus id="master-question" className="time-textarea" rows={3} maxLength={2000} value={draft} disabled={busy} onChange={event => setDraft(event.target.value)} placeholder="Ex.: por que preciso desse teste? Quero mais diálogo e menos combate." />
        {error ? <p role="alert">{error}</p> : null}
        <button className="btn-confirm" type="submit" disabled={busy || !draft.trim()}>{busy ? 'Conversando…' : error ? 'Tentar novamente' : 'Enviar ao Mestre'}</button>
      </form>
      <details className="journey-recap"><summary>Combinados com o Mestre</summary>
        <p>Escreva as preferências que ele deve seguir nas próximas cenas. Salvar aqui não usa tokens.</p>
        <label htmlFor="master-guidance">Como você quer conduzir a aventura?</label>
        <textarea id="master-guidance" className="time-textarea" rows={3} maxLength={1500} value={guidance} disabled={busy} onChange={event => { setGuidance(event.target.value); setSaved(false); }} placeholder="Mais conversas com NPCs, cenas curtas e liberdade para explorar." />
        <button type="button" className="btn-cancel" disabled={busy} onClick={() => { onSaveGuidance(guidance.trim()); setSaved(true); }}>Salvar combinados</button>
        {saved ? <p role="status">Combinados atualizados para as próximas cenas.</p> : null}
      </details>
    </div>
  </section></div>;
}
