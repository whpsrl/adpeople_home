import { NextResponse } from "next/server";
import { generateObject } from 'ai';
import { openai, createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

export async function POST(req: Request) {
  try {
    const { url, budget, goal, openAiKey } = await req.json();

    if (!url) {
       return NextResponse.json({ success: false, error: "L'URL è obbligatorio per l'analisi strategica." }, { status: 400 });
    }

    // Inizializza il client dinamicamente con la chiave cliente (se fornita), oppure col fallback globale env
    const apiKeyToUse = openAiKey || process.env.OPENAI_API_KEY;
    
    const client = createOpenAI({
      apiKey: apiKeyToUse
    });

    const { object } = await generateObject({
      model: client('gpt-4o'),
      schema: z.object({
        angles: z.array(z.string()).length(3).describe('Tre angoli di marketing profondi e psicologici (Marketing Angles). Usa i livelli di consapevolezza di Eugene Schwartz (Unaware, Problem Aware, Solution Aware, Product Aware). Focus sui Pain Points irrisolti e sui Desideri segreti del target. Vieta frasi fatte e generiche.'),
        targeting: z.object({
          broad: z.string().describe('Targeting Broad: Età esatta, sesso, regione e posizionamenti ideali suggeriti dall\'analisi del prodotto.'),
          interests: z.array(z.string()).length(3).describe('Tre Interessi Meta Ads altamente specifici (No interessi ampi come "Sport", sì interessi di nicchia, brand competitor o riviste del settore).'),
          lookalike: z.string().describe('Strategia di retargeting o Pubblico Simile (LAL) consigliata (es. Video views 75%, Add to Cart 30d, LAL 1% Purchasers).')
        }),
        copy: z.object({
          primaryText: z.string().describe('Primary Text per Meta Ads. Inizia con un HOOK di 1 riga che ferma lo scroll (rompe il pattern visivo). Sviluppa poi il body copy usando PAS (Problem, Agitation, Solution) o uno Storytelling emotivo. Frasi brevi, molta aria (spazi), uso strategico di 2-3 emoji. Chiudi con una Call To Action irresistibile verso l\'URL.'),
          headline: z.string().describe('Headline (Titolo Inserzione Meta - Max 40 caratteri). Deve incuriosire brutalmente o promettere un beneficio chiaro. (es. "Il segreto per...").'),
          description: z.string().describe('News Feed Link Description (Testo sotto al tiolo). Massimizza la scarsità, la riprova sociale (es. "⭐ 4.9/5 da 10.000 clienti") o garanzie di rimborso.')
        })
      }),
      system: `Sei uno dei top 10 Media Buyer e Copywriter Direct Response al mondo. Gestisci 50 Milioni di budget all'anno su Meta Ads.
      Hai letto i libri di Dan Kennedy, Eugene Schwartz, David Ogilvy e Russell Brunson.
      Il tuo stile non è mai noioso, corporativo o "da intelligenza artificiale". Scrivi come un essere umano che parla a un altro essere umano con empatia e persuasione chirurgica.
      Devi analizzare l'URL e le informazioni fornite per estrarre l'essenza dell'Offerta Irresistibile. 
      L'output deve essere strettamente in italiano, focalizzato sulle conversioni (CPA) e sul ritorno sulla spesa pubblicitaria (ROAS).`,
      prompt: `Crea la Master Strategy per questo lancio su Facebook e Instagram Ads:
      
      - URL del Sito Internet/Prodotto: ${url}
      - Obiettivo della Campagna (Goal): ${goal}
      - Budget Giornaliero di Test: ${budget}€
      
      Istruzioni Tattiche per Te:
      1. Dedurre cosa vende il sito analizzandone semplicemente l'URL (se l'URL non è autoesplicativo, immagina ipotesi plausibili top-tier).
      2. Crea 3 angoli marketing spietati (non dire "Prodotto bello e utile", di' "Come alleviare [Pain Point] senza dover rinunciare a [Cosa amano fare]").
      3. Scrivi il Primary Copy come se dovesse vendere il prodotto oggi stesso, usando hook psicologici, urgenza reale e bullet points.`
    });

    return NextResponse.json({
      success: true,
      strategy: object
    });
    
  } catch (error) {
    console.error("Errore API OpenAI:", error);
    return NextResponse.json({ success: false, error: "Errore durante l'analisi" }, { status: 500 });
  }
}
