import OpenAI from 'openai'
import { NextResponse } from 'next/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request) {
  try {
    const { messages } = await request.json()

    // Prepara i messaggi per OpenAI
    const openaiMessages = messages.map(msg => {
      let content = msg.content

      // Se ci sono file allegati, aggiungi il loro contenuto al messaggio
      if (msg.files && msg.files.length > 0) {
        const fileContents = msg.files.map(file => 
          `\n\n--- INIZIO DOCUMENTO: ${file.name} ---\n${file.content}\n--- FINE DOCUMENTO: ${file.name} ---`
        ).join('')
        content += fileContents
      }

      return {
        role: msg.role,
        content: content
      }
    })

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Sei un assistente AI professionale specializzato nell'analisi di documenti. 

ISTRUZIONI:
- Rispondi sempre in italiano a meno che non ti venga esplicitamente richiesto di usare un'altra lingua
- Quando ti vengono forniti documenti, analizzali attentamente e fornisci risposte dettagliate basate sul loro contenuto
- Se un documento contiene informazioni strutturate (tabelle, liste, dati), presentale in modo chiaro e organizzato
- Cita sempre le parti specifiche del documento quando fai riferimento al contenuto
- Se il documento non è chiaro o sembra corrotto, segnalalo all'utente
- Fornisci sempre analisi approfondite e utili dei documenti caricati
- Se ti viene chiesto di riassumere, estrai i punti chiave più importanti
- Per documenti tecnici o legali, mantieni un linguaggio preciso ma accessibile`
        },
        ...openaiMessages
      ],
      temperature: 0.3, // Più bassa per analisi precise dei documenti
      max_tokens: 4000, // Aumentato per risposte più dettagliate
    })

    return NextResponse.json({
      message: completion.choices[0].message.content
    })
  } catch (error) {
    console.error('Errore API OpenAI:', error)
    
    // Gestione errori specifici
    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'Quota API OpenAI esaurita. Controlla il tuo account.' },
        { status: 402 }
      )
    }
    
    if (error.code === 'invalid_api_key') {
      return NextResponse.json(
        { error: 'Chiave API OpenAI non valida.' },
        { status: 401 }
      )
    }
    
    if (error.code === 'context_length_exceeded') {
      return NextResponse.json(
        { error: 'Il documento è troppo lungo. Prova con un file più piccolo.' },
        { status: 413 }
      )
    }
    
    return NextResponse.json(
      { error: 'Errore nel processare la richiesta', details: error.message },
      { status: 500 }
    )
  }
}