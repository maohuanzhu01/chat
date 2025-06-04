import { NextResponse } from 'next/server';

export async function POST(request) {
  const body = await request.json();
  const userMessage = body.message;

  if (!userMessage) {
    return NextResponse.json({ error: 'Missing message' }, { status: 400 });
  }

  const systemPrompt = `
Sei un assistente che rileva se un messaggio dell'utente implica l'intenzione di generare un file.

Devi rispondere solo con una delle seguenti parole chiave, in minuscolo:
- "pdf" → se l'utente vuole generare un file PDF
- "xlsx" → se vuole un file Excel
- "docx" → se vuole un file Word
- "none" → se non vuole generare alcun file

Esempi:
- "Cos'è un PDF?" → none
- "Crea un PDF con questo testo..." → pdf
- "Vorrei un file Word con queste informazioni" → docx
- "Scrivimi una tabella in Excel" → xlsx
- "Fammi un riepilogo" → none
`;

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    const data = await openaiRes.json();
    const reply = data?.choices?.[0]?.message?.content?.trim().toLowerCase();

    const validIntents = ['pdf', 'xlsx', 'docx', 'none'];
    const intent = validIntents.includes(reply) ? reply : 'none';

    return NextResponse.json({ intent });
  } catch (error) {
    console.error('Errore rilevamento intento:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
