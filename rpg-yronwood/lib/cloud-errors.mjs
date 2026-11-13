// Erros do banco da nuvem (Firebase) explicados para o jogador.

/** Traduz o erro do Firebase para o jogador: o que houve e o que fazer. */
export function explainCloudError(err) {
  const raw = `${err?.code || ""} ${err?.message || err || ""}`;
  if (/permission[_ ]denied|permission-denied/i.test(raw)) {
    return {
      code: "PERMISSION_DENIED",
      error: "O banco da nuvem (Firebase) recusou a gravação: as regras de segurança do banco estão vencidas ou não foram publicadas.",
      fix: "No console do Firebase, abra Realtime Database → Regras, cole as regras do jogo e toque em Publicar.",
    };
  }
  if (/too_big|maximum size|too large|exceeds/i.test(raw)) {
    return { code: "TOO_BIG", error: "A história ficou grande demais para um envio à nuvem.", fix: "Apague saves antigos em Arquivo e tente de novo." };
  }
  if (/TIMEOUT|timeout/.test(raw)) {
    return { code: "TIMEOUT", error: "O banco da nuvem não respondeu a tempo.", fix: "Confira a internet. Se continuar, o banco do Firebase pode estar desligado ou sem cota." };
  }
  if (/disabled|locked|quota/i.test(raw)) {
    return { code: "DISABLED", error: "O banco do Firebase está desligado (cota grátis estourada ou desativado no console).", fix: "Abra o console do Firebase e veja o aviso do Realtime Database." };
  }
  if (/offline|network|unavailable/i.test(raw)) {
    return { code: "OFFLINE", error: "Sem conexão com o banco da nuvem.", fix: "Confira a internet e tente de novo." };
  }
  return { code: err?.code || "CLOUD_ERROR", error: String(err?.message || err || "Erro ao salvar na nuvem."), fix: "" };
}
