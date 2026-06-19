export default function handler(_req, res) {
  res.status(410).json({
    error: "Campanhas são salvas direto no Firebase (Firestore) pelo navegador.",
  });
}
