export default function handler(_req, res) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyC3ImOHIc0ugpnmxsIJbcdfQDuakGAv9rU";
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "siterpg32";
  res.status(200).json({
    configured: !!(apiKey && projectId),
    provider: "firebase",
    projectId,
  });
}
