export async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'your_gemini_api_key') {
    return 'LogiBot is initializing... Please check your Gemini API key in .env.local';
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('Gemini API error:', err);
      return 'LogiBot is temporarily unavailable. Please try again.';
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || 
           'I was unable to generate a response. Please try again.';
  } catch (err) {
    console.error('Gemini fetch error:', err);
    return 'LogiBot connection error. Please check your internet connection.';
  }
}
