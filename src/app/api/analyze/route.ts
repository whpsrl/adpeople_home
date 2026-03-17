import { NextResponse } from "next/server";
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export async function POST(req: Request) {
  try {
    const { url, budget, goal } = await req.json();

    if (!url) {
       return NextResponse.json({ success: false, error: "L'URL è obbligatorio" }, { status: 400 });
    }

    const { object } = await generateObject({
      model: openai('gpt-4o'),
      schema: z.object({
        angles: z.array(z.string()).length(3).describe('Tre angoli di marketing diversi e persuasivi per promuovere il prodotto o servizio, focalizzandoti sui benefici per il cliente.'),
        targeting: z.object({
          broad: z.string().describe('Il targeting broad (età, sesso, posizione) ottimale per iniziare a testare il prodotto su Meta Ads.'),
          interests: z.array(z.string()).length(3).describe('Tre interessi specifici (massimo 3) su Facebook/Instagram che potrebbero convertire.'),
          lookalike: z.string().describe('Suggerimento su che pubblico simile (Lookalike) creare in futuro (es. LAL 1% Acquisti 180gg).')
        }),
        copy: z.object({
          primaryText: z.string().describe('Il testo principale (Primary Text) dell\'inserzione. Usa il framework AIDA o PAS. Scrivi in ottica persuasiva, non troppo lungo ma accattivante. Aggiungi emoji pertinenti e una call to action chiara.'),
          headline: z.string().describe('Un titolo (Headline) breve, d\'impatto e cliccabile (max 40 caratteri).'),
          description: z.string().describe('La descrizione che va sotto il titolo (News Feed Link Description), breve e che rinforzi l\'offerta o ponga urgenza.')
        })
      }),
      system: `Sei un Media Buyer Senior e Copywriter esperto in Meta Ads (Facebook & Instagram). 
      Il tuo compito è analizzare il business (fornito dal sito web o descrizione), l'obiettivo e il budget del cliente
      per generare la migliore strategia di lancio possibile per una campagna direct response. 
      L'output deve essere strettamente in italiano, altamente persuasivo e orientato alle conversioni.`,
      prompt: `Analizza questa richiesta e crea la strategia Meta Ads:
      - URL Prodotto/Sito: ${url}
      - Obiettivo Campagna: ${goal}
      - Budget Giornaliero di Test: ${budget}€
      
      Per l'analisi, deduci il più possibile dal tipo di URL o dal dominio. Quali pain points risolve? A chi si rivolge?`
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
