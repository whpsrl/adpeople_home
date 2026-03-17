import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const { strategy, metaConfig, url } = await req.json();

    if (!metaConfig || !metaConfig.token || !metaConfig.adAccountId) {
      return NextResponse.json(
        { success: false, error: "Credenziali Meta mancanti." },
        { status: 400 }
      );
    }

    const { token, adAccountId } = metaConfig;
    const API_VERSION = "v19.0";
    const BASE_URL = `https://graph.facebook.com/${API_VERSION}/act_${adAccountId}`;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // 1. CREAZIONE CAMPAGNA (Bozza)
    const campaignName = `[AI Strategist] Promo: ${new URL(url).hostname} - ${new Date().toISOString().split('T')[0]}`;
    
    // Obiettivo: OUTCOME_SALES, OUTCOME_LEADS, OUTCOME_TRAFFIC a seconda dello "scopo" (Per ora hardcodiamo OUTCOME_TRAFFIC o generico, ma idealmente andrebbe derivato)
    const campaignResponse = await axios.post(
      `${BASE_URL}/campaigns`,
      {
        name: campaignName,
        objective: "OUTCOME_TRAFFIC", // Esempio semplificato
        status: "PAUSED",
        special_ad_categories: [], // Nessuna categoria speciale (Credito, Alloggi, ecc.)
      },
      { headers }
    );

    const campaignId = campaignResponse.data.id;

    // 2. CREAZIONE GRUPPO INSERZIONI (Ad Set)
    const adSetName = `AI AdSet - Broad/Interests - €${strategy.budget || 20}/day`;
    
    const adSetResponse = await axios.post(
      `${BASE_URL}/adsets`,
      {
        name: adSetName,
        campaign_id: campaignId,
        daily_budget: (strategy.budget || 20) * 100, // Meta vuole i centesimi
        billing_event: "IMPRESSIONS",
        optimization_goal: "LINK_CLICKS", // Ottimizzazione coerente con OUTCOME_TRAFFIC
        bid_amount: 100, // Bid opzionale per certe ottimizzazioni
        status: "PAUSED",
        targeting: {
          geo_locations: {
            countries: ["IT"], // Target Italia base
          },
          // Qui in futuro si passano gli interests di `strategy.targeting.interests` (richiede mapping degli ID)
        },
      },
      { headers }
    );

    const adSetId = adSetResponse.data.id;

    // 3. CREAZIONE INSERZIONE (Ad)
    const adName = `AI Copy: ${strategy.copy.headline}`;
    
    // N.B: Per creare l'inserzione serve una Facebook Page correlata all'account.
    // L'utente dovrebbe inserirla nei settings. Per saltare l'errore senza pagina, creiamo almeno la creatività (Ad Creative)
    
    // Per un'app reale, l'Ad necessita del 'page_id' del cliente.
    // Simuliamo il successo per il front-end, notificando all'utente che serve l'ID della Pagina.

    return NextResponse.json({
      success: true,
      message: "Campagna e AdSet creati in Bozza! L'inserzione richiede l'ID della Pagina Facebook (Feature in arrivo).",
      data: {
        campaignId,
        adSetId
      }
    });

  } catch (error: any) {
    console.error("Errore Meta API:", error.response?.data || error.message);
    const metaError = error.response?.data?.error?.message || "Errore sconosciuto nella comunicazione con Meta";
    return NextResponse.json({ success: false, error: metaError }, { status: 500 });
  }
}
