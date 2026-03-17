import { NextResponse } from "next/server";
import axios from "axios";
import FormDataNode from "form-data";
import { createOpenAI } from '@ai-sdk/openai';
import { generateImage } from 'ai';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const strategy = JSON.parse(formData.get("strategy") as string);
    const metaConfig = JSON.parse(formData.get("metaConfig") as string);
    const creativeMode = formData.get("creativeMode") as string;
    const urlDestination = formData.get("urlDestination") as string;
    const ctaType = formData.get("ctaType") as string;
    const file = formData.get("file") as File | null;

    if (!metaConfig || !metaConfig.token || !metaConfig.adAccountId || !metaConfig.pageId) {
      return NextResponse.json(
        { success: false, error: "Credenziali Meta mancanti (Controlla che la Page ID sia inserita)." },
        { status: 400 }
      );
    }

    const { token, adAccountId, pageId } = metaConfig;
    const API_VERSION = "v19.0";
    const BASE_URL = `https://graph.facebook.com/${API_VERSION}/act_${adAccountId}`;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    let imageHash = null;
    let videoId = null;

    // --- STEP 0: GESTIONE CREATIVITÀ (Upload o AI) prima di creare la campagna ---
    
    // CASO 1: UPLOAD MANUALE
    if (creativeMode === "upload" && file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const isVideo = file.type.startsWith("video/");
      
      const form = new FormDataNode();
      if (isVideo) {
        // Facebook richiede l'endpoint advideos per i video
        form.append("source", buffer, { filename: file.name, contentType: file.type });
        const uploadRes = await axios.post(`${BASE_URL}/advideos`, form, {
            headers: { ...form.getHeaders(), Authorization: headers.Authorization }
        });
        videoId = uploadRes.data.id;
      } else {
        // Facebook richiede l'endpoint adimages per le foto
        form.append("filename", buffer, { filename: file.name, contentType: file.type });
        const uploadRes = await axios.post(`${BASE_URL}/adimages`, form, {
            headers: { ...form.getHeaders(), Authorization: headers.Authorization }
        });
        imageHash = uploadRes.data.images[file.name].hash;
      }
    } 
    // CASO 2: GENERAZIONE AI TRAMITE DALL-E 3
    else if (creativeMode === "ai") {
      // Costruisci il client OpenAI dinamico basato sulla chiave passata dal profilo meta (o usa process.env se non c'è, sebbene l'utente dovrebbe fornirla)
      const openaiClient = createOpenAI({
        apiKey: metaConfig.openAiKey || process.env.OPENAI_API_KEY,
      });

      const promptToGenerate = `Create a highly professional, visually appealing meta ad image for a product. Concept based on this headline: "${strategy.copy.headline}". Make it persuasive, dynamic, and realistic, avoiding any text in the image.`;
      
      const { image } = await generateImage({
        model: openaiClient.image('dall-e-3'),
        prompt: promptToGenerate,
        size: '1024x1024'
      });
      
      // Dall-e ritorna Uint8Array oppure base64, l'SDK ai di solito dà base64 se configurato, ma usiamo la response base.
      // Dobbiamo estrarre i byte e mandarli a FB
      const imageBuffer = Buffer.from(image.base64, 'base64');
      
      const form = new FormDataNode();
      form.append("filename", imageBuffer, { filename: "ai_generated_ad.png", contentType: "image/png" });
      const uploadRes = await axios.post(`${BASE_URL}/adimages`, form, {
          headers: { ...form.getHeaders(), Authorization: headers.Authorization }
      });
      imageHash = uploadRes.data.images["ai_generated_ad.png"].hash;
    }

    if (!imageHash && !videoId) {
      throw new Error("Errore durante la creazione o il caricamento dell'asset creativo (Nessun hash/ID generato).");
    }


    // --- STEP 1: CREAZIONE CAMPAGNA ---
    const campaignName = `[AI Strategist] - Bozza del ${new Date().toISOString().split('T')[0]}`;
    const campaignResponse = await axios.post(
      `${BASE_URL}/campaigns`,
      {
        name: campaignName,
        objective: "OUTCOME_TRAFFIC", 
        status: "PAUSED",
        special_ad_categories: [], 
      },
      { headers }
    );
    const campaignId = campaignResponse.data.id;

    // --- STEP 2: CREAZIONE AD SET ---
    const adSetName = `AI AdSet - Target Broad - €${strategy.budget || 20}/day`;
    const adSetResponse = await axios.post(
      `${BASE_URL}/adsets`,
      {
        name: adSetName,
        campaign_id: campaignId,
        daily_budget: (strategy.budget || 20) * 100,
        billing_event: "IMPRESSIONS",
        optimization_goal: "LINK_CLICKS", 
        bid_amount: 100,
        status: "PAUSED",
        targeting: {
          geo_locations: { countries: ["IT"] }
        },
      },
      { headers }
    );
    const adSetId = adSetResponse.data.id;

    // --- STEP 3: CREAZIONE CREATIVITÁ DELL'INSERZIONE (AD CREATIVE) ---
    // L'Ad Creative unisce il Testo copiato, L'asset Visivo e il collegamento alla Pagina Facebook
    const adCreativeData: any = {
      name: `AI Creative - ${strategy.copy.headline}`,
      page_id: pageId,
      status: "ACTIVE"
    };

    if (videoId) {
       adCreativeData.video_id = videoId;
       adCreativeData.body = strategy.copy.primaryText;
       adCreativeData.title = strategy.copy.headline;
       // Nota: I video per essere inserzioni avrebbero bisogno di parametri diversi (object_story_spec), 
       // semplifichiamo il payload per essere un Post di Pagina o specifichiamo il link.
       // ESEMPIO REALE: Per un ad performante dobbiamo usare object_story_spec.
    }

    // Struttura corretta universale per Link Ads (usando object_story_spec)
    const adCreativePayload: any = {
      name: `AI Creative - ${strategy.copy.headline}`,
      object_story_spec: {
        page_id: pageId,
        link_data: {
          link: urlDestination, // Usa il link del funnel inviato dall'app
          message: strategy.copy.primaryText,
          name: strategy.copy.headline,
          description: strategy.copy.description,
          call_to_action: {
            type: ctaType,
            value: {
              link: urlDestination // Obbligatorio anche dentro la call to action
            }
          },
          ...(imageHash ? { image_hash: imageHash } : {}),
        },
        ...(videoId ? { video_data: { video_id: videoId, call_to_action: { type: ctaType, value: { link: urlDestination } }, title: strategy.copy.headline, message: strategy.copy.primaryText} } : {})
      }
    };
    
    // Fix: Se ho un video, object_story_spec usa video_data invece di link_data
    if (videoId) {
       delete adCreativePayload.object_story_spec.link_data.image_hash;
       delete adCreativePayload.object_story_spec.link_data;
    }

    const creativeResponse = await axios.post(`${BASE_URL}/adcreatives`, adCreativePayload, { headers });
    const creativeId = creativeResponse.data.id;

    // --- STEP 4: CREAZIONE INSERZIONE (AD) ---
    // L'Ad collega finalmente l'Ad Set alla Creatività
    const adResponse = await axios.post(
      `${BASE_URL}/ads`,
      {
        name: `AI Ad - ${strategy.copy.headline}`,
        adset_id: adSetId,
        creative: { creative_id: creativeId },
        status: "PAUSED" // Manteniamo rigorosamente tutto in bozza per sicurezza
      },
      { headers }
    );

    return NextResponse.json({
      success: true,
      message: "Campagna, Pubblico e Inserzione (con Media) creati con successo in Bozza!",
      data: {
        campaignId,
        adSetId,
        adId: adResponse.data.id
      }
    });

  } catch (error: any) {
    console.error("Errore Backend Upload/Meta API:", error.response?.data || error);
    const metaError = error.response?.data?.error?.message || "Errore sconosciuto nella comunicazione con Meta";
    return NextResponse.json({ success: false, error: metaError }, { status: 500 });
  }
}
