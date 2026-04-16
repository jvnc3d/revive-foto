export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image, mimeType } = req.body;
  if (!image) return res.status(400).json({ error: 'Imagem não enviada' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key não configurada' });

  const prompt = `Enhance the portrait while strictly preserving the subject's identity with accurate facial geometry. Do not change their expression or face shape. Only allow subtle feature cleanup without altering who they are.
Keep the exact same background from the reference image. No replacements, no changes, no new objects, no layout shifts. The environment must look identical. The image must be recreated as if it was shot on a Sony A1, using an 85mm f1.4 lens, at f1.6, ISO 100, 1/200 shutter speed, cinematic shallow depth of field, perfect facial focus, and an editorial-neutral color profile. This Sony A1 + 85mm f1.4 setup is mandatory. The final image must clearly look like premium full-frame Sony A1 quality.
Lighting must match the exact direction, angle, and mood of the reference photo. Upgrade the lighting into a cinematic, subject-focused style: soft directional light, warm highlights, cool shadows, deeper contrast, expanded dynamic range, micro-contrast boost, smooth gradations, and zero harsh shadows.
Maintain neutral premium color tone, cinematic contrast curve, natural saturation, real skin texture (not plastic), and subtle film grain. No fake glow, no runway lighting, no over smoothing. Render in 4K resolution, 10-bit color, cinematic editorial style, premium clarity, portrait crop, and keep the original environmental vibe untouched.
Re-render the subject with improved realism, depth, texture, and lighting while keeping identity and background fully preserved.
NEGATIVE INSTRUCTIONS: No new background. No background change. No overly dramatic lighting. No face morphing. No fake glow. No flat lighting. No over-smooth skin.`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: image } }
          ]}],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] }
        })
      }
    );

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}));
      return res.status(500).json({ error: errData.error?.message || 'Erro na API do Gemini' });
    }

    const data = await geminiRes.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inline_data?.mime_type?.startsWith('image/'));

    if (!imagePart) return res.status(500).json({ error: 'Gemini não retornou imagem. Tente com outra foto.' });

    return res.status(200).json({ image: imagePart.inline_data.data });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
}
