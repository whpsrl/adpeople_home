"use client";

import { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Target, MonitorPlay, Zap, CheckCircle2, Settings, X, Save, HelpCircle, Key, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as Tooltip from '@radix-ui/react-tooltip';

export default function Home() {
  const [url, setUrl] = useState("");
  const [budget, setBudget] = useState("");
  const [goal, setGoal] = useState("conversion");
  const [urlDestination, setUrlDestination] = useState("");
  const [ctaType, setCtaType] = useState("LEARN_MORE");
  
  const [creativeMode, setCreativeMode] = useState<"upload" | "ai">("upload");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Modello dei profili Clienti completi
  type ClientProfile = {
    id: string;
    name: string;
    appId: string;
    appSecret: string;
    token: string;
    adAccountId: string;
    pageId: string;
    openAiKey: string; // Ogni cliente ha la propria chiave OpenAI se usiamo l'Agente come SaaS
  };

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [profiles, setProfiles] = useState<ClientProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>("");
  const [openAiKey, setOpenAiKey] = useState("");
  
  // State per il form di editing (profilo correntemente selezionato o nuovo)
  const [editingProfile, setEditingProfile] = useState<ClientProfile>({
    id: "new",
    name: "",
    appId: "",
    appSecret: "",
    token: "",
    adAccountId: "",
    pageId: "",
    openAiKey: ""
  });

  // Load settings on mount
  useEffect(() => {
    const savedProfiles = localStorage.getItem("metaProfiles");
    const savedActiveId = localStorage.getItem("metaActiveProfileId");
    const savedOpenAiKey = localStorage.getItem("openAiApiKey");

    if (savedOpenAiKey) {
      setOpenAiKey(savedOpenAiKey);
    }

    if (savedProfiles) {
      try {
        const parsed = JSON.parse(savedProfiles);
        setProfiles(parsed);
        if (savedActiveId && parsed.find((p: ClientProfile) => p.id === savedActiveId)) {
          setActiveProfileId(savedActiveId);
          setEditingProfile(parsed.find((p: ClientProfile) => p.id === savedActiveId));
        } else if (parsed.length > 0) {
          setActiveProfileId(parsed[0].id);
          setEditingProfile(parsed[0]);
        }
      } catch (e) {
        console.error("Errore nel caricamento dei profili", e);
      }
    }
  }, []);

  const handleProfileSelect = (id: string) => {
    if (id === "new") {
      setEditingProfile({
        id: "new",
        name: "",
        appId: "",
        appSecret: "",
        token: "",
        adAccountId: "",
        pageId: "",
        openAiKey: "" // reset per un nuovo cliente
      });
    } else {
      const selected = profiles.find(p => p.id === id);
      if (selected) {
        setEditingProfile(selected);
      }
    }
    setActiveProfileId(id);
  };

  const saveSettings = () => {
    if (!editingProfile.name.trim()) {
      alert("Dai un nome al profilo per salvarlo.");
      return;
    }

    let updatedProfiles = [...profiles];
    let newId = editingProfile.id;

    if (editingProfile.id === "new") {
      newId = Date.now().toString();
      updatedProfiles.push({ ...editingProfile, id: newId });
    } else {
      updatedProfiles = updatedProfiles.map(p => 
        p.id === editingProfile.id ? editingProfile : p
      );
    }

    setProfiles(updatedProfiles);
    setActiveProfileId(newId);
    
    // Select editingProfile to match the new saved state
    setEditingProfile({ ...editingProfile, id: newId });

    localStorage.setItem("metaProfiles", JSON.stringify(updatedProfiles));
    localStorage.setItem("metaActiveProfileId", newId);
    localStorage.setItem("openAiApiKey", openAiKey); // Salviamo anche la chiave di openAi a livello globale
    
    setShowSettings(false);
    alert("Impostazioni salvate correttamente!");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      // Creiamo un URL locale per visualizzare l'anteprima
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creativeMode === "upload" && !selectedImage) {
      alert("Carica un'immagine o scegli la generazione AI prima di procedere!");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    
    try {
      // Usiamo una chiamata fetch e passiamo la chiave se disponibile nel profilo, o un fallback
      const activeProfile = profiles.find(p => p.id === activeProfileId);
      const reqBody = { 
        url, 
        budget, 
        goal,
        openAiKey: activeProfile?.openAiKey // Passa la chiave del cliente se salvata
      };

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody)
      });
      
      const data = await response.json();
      if(data.success) {
        // Uniamo i dati: budget + opzione creatività
        // In futuro, se "ai", qui chiameremo un'altra API per DALL-E prima di salvare setResult.
        setResult({ 
          ...data.strategy, 
          budget: parseInt(budget),
          creative: {
            mode: creativeMode,
            localImage: imagePreview
          }
        });
      } else {
        alert("Errore nell'analisi.");
      }
    } catch (error) {
      alert("Errore di connessione al server.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePublishMeta = async () => {
    if (!activeProfileId || activeProfileId === "new") {
      alert("Seleziona prima un Profilo Meta valido dalle Impostazioni!");
      setShowSettings(true);
      return;
    }

    const activeProfile = profiles.find(p => p.id === activeProfileId);
    
    if (!activeProfile?.pageId) {
      alert("Per creare un'inserzione è necessario avere la 'Facebook Page ID' compilata nelle Impostazioni del Profilo Meta.");
      setShowSettings(true);
      return;
    }
    
    setIsPublishing(true);
    try {
      const formData = new FormData();
      formData.append("strategy", JSON.stringify(result));
      formData.append("metaConfig", JSON.stringify(activeProfile));
      formData.append("urlanalisi", url); // URL originale analizzato
      formData.append("urlDestination", urlDestination || url); // Se non inserito, usa l'URL analizzato
      formData.append("ctaType", ctaType);
      formData.append("creativeMode", creativeMode);
      
      if (creativeMode === "upload" && selectedImage) {
        formData.append("file", selectedImage);
      }

      const response = await fetch("/api/meta/create-campaign", {
        method: "POST",
        body: formData // non specifichiamo il content type, lo fa il browser in automatico per form-data
      });
      
      const data = await response.json();
      if(data.success) {
        alert(`🎉 Successo! ${data.message}\nCampaign ID: ${data.data.campaignId}`);
      } else {
        alert(`❌ Errore Meta: ${data.error}`);
      }
    } catch (error) {
      alert("Errore di connessione al server durante la pubblicazione.");
    } finally {
      setIsPublishing(false);
    }
  };

  const HelpTooltip = ({ text }: { text: string }) => (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button type="button" className="text-slate-500 hover:text-indigo-400 focus:outline-none ml-2 inline-flex align-middle">
            <HelpCircle size={14} />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content 
            className="bg-slate-800 text-slate-200 text-xs px-3 py-2 rounded shadow-xl max-w-xs leading-relaxed z-[100] border border-slate-700" 
            sideOffset={5}
          >
            {text}
            <Tooltip.Arrow className="fill-slate-800" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-start py-8 px-6 sm:px-12 md:px-24 overflow-hidden">
      <div className="glow-bg"></div>

      {/* Top Navbar */}
      <div className="w-full max-w-7xl flex justify-end relative z-20">
        <button 
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/50 border border-slate-700/50 hover:bg-slate-800 transition-all text-sm font-medium text-slate-300"
        >
          <Settings size={18} />
          Impostazioni Profilo/API
        </button>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl p-6 shadow-2xl relative my-8"
            >
              <button 
                onClick={() => setShowSettings(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X size={24} />
              </button>
              
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Users className="text-indigo-400" />
                Gestione Clienti e Chiavi
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Salva i profili dei tuoi clienti. In futuro ogni cliente avrà il suo database dedicato e il bottone "Accedi con Facebook".
              </p>

              {/* GLOBAL AI SETTINGS */}
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Key className="text-emerald-400" />
                Chiave OpenAI (Universale)
              </h2>
              <p className="text-sm text-slate-400 mb-4">
                Necessaria per far funzionare l'Agente IA Strategico e far generare le immagini a DALL-E 3.
              </p>
              
              <div className="mb-8 border-b border-slate-800 pb-6">
                <label className="text-sm font-medium text-slate-300 mb-1 flex items-center">
                  OpenAI API Key
                  <HelpTooltip text="La trovi su platform.openai.com. Inizia con 'sk-...'. Serve a pagare i centesimi della generazione testo/immagini all'IA." />
                </label>
                <input 
                  type="password" 
                  value={openAiKey}
                  onChange={(e) => setOpenAiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none mt-1"
                />
              </div>

              {/* META PROFILES */}
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Target className="text-indigo-400" />
                Profili Clienti Meta
              </h2>
              <p className="text-sm text-slate-400 mb-4">
                Seleziona o crea un profilo per l'invio diretto a Facebook Ads.
                {/* Future Proofing Token Alert */}
                <span className="block mt-2 text-xs text-indigo-300 bg-indigo-500/10 p-2 rounded">
                  In futuro potrai connettere le pagine semplicemente cliccando "Accedi con Facebook". Nel frattempo usiamo le chiavi da sviluppatore. 
                </span>
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-1">Seleziona Profilo</label>
                <select 
                  value={activeProfileId}
                  onChange={(e) => handleProfileSelect(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none [&>option]:bg-slate-900"
                >
                  <option value="new">+ Crea Nuovo Profilo</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                
                <button 
                  onClick={() => setShowTutorial(true)}
                  className="w-full text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center justify-center gap-2 mt-4 transition-colors p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20"
                  type="button"
                >
                  <HelpCircle size={16} /> Non sai dove trovare queste chiavi Meta? Leggi la Guida Rapida
                </button>
              </div>

              <div className="space-y-4 border-t border-slate-800 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-1 flex items-center">
                      Nome Cliente 
                    </label>
                    <input 
                      type="text" 
                      value={editingProfile.name}
                      onChange={(e) => setEditingProfile({...editingProfile, name: e.target.value})}
                      placeholder="es. Bar Mario Srl"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-sm font-medium text-slate-300 mb-1 flex items-center">
                      Meta App ID
                      <HelpTooltip text="Crea un'app Business su developers.facebook.com per ottenere questo ID numerico." />
                    </label>
                    <input 
                      type="text" 
                      value={editingProfile.appId}
                      onChange={(e) => setEditingProfile({...editingProfile, appId: e.target.value})}
                      placeholder="Codice a 15-16 cifre (es. 1029384756123)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-sm font-medium text-slate-300 mb-1 flex items-center">
                      App Secret
                      <HelpTooltip text="Lo trovi nelle Impostazioni Base dell'App su Facebook. Serve a validare l'uso delle API." />
                    </label>
                    <input 
                      type="password" 
                      value={editingProfile.appSecret}
                      onChange={(e) => setEditingProfile({...editingProfile, appSecret: e.target.value})}
                      placeholder="Il tuo App Secret"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-300 mb-1 flex items-center">
                      Access Token (Lunga durata)
                      <HelpTooltip text="Chiave EAAI... generata nell'Explorer o Users di Sistema del Business Manager che permette di bypassare il click di login utente durante questi test." />
                    </label>
                    <input 
                      type="password" 
                      value={editingProfile.token}
                      onChange={(e) => setEditingProfile({...editingProfile, token: e.target.value})}
                      placeholder="EAAI... (Stringa alfanumerica lunghissima)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-sm font-medium text-slate-300 mb-1 flex items-center">
                      Ad Account ID
                      <HelpTooltip text="L'insegna ID numerica del portafoglio clienti. Rimuovi categoricamente il prefisso 'act_' iniziale!" />
                    </label>
                    <input 
                      type="text" 
                      value={editingProfile.adAccountId}
                      onChange={(e) => setEditingProfile({...editingProfile, adAccountId: e.target.value.replace('act_', '')})}
                      placeholder="es. 1234567890123"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-sm font-medium text-slate-300 mb-1 flex items-center">
                      Facebook Page ID
                      <HelpTooltip text="L'identificativo numerico della Pagina Facebook collegata al Brand da cui parte l'annuncio." />
                    </label>
                    <input 
                      type="text" 
                      value={editingProfile.pageId || ""}
                      onChange={(e) => setEditingProfile({...editingProfile, pageId: e.target.value})}
                      placeholder="Codice numerico lungo della Pagina (Info Pagina FB)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  
                  <div className="md:col-span-2 pt-2 border-t border-slate-800 mt-2">
                    <label className="text-sm font-medium flex items-center text-emerald-400 mb-1">
                      <Key size={14} className="mr-1" />
                      OpenAI API Key (Client-Specific)
                      <HelpTooltip text="Se inserisci qui un token sk-..., i costi AI per questo cliente verranno pagati con il suo account OpenAI anziché con la tua master key globale." />
                    </label>
                    <input 
                      type="password" 
                      value={editingProfile.openAiKey || ""}
                      onChange={(e) => setEditingProfile({...editingProfile, openAiKey: e.target.value})}
                      placeholder="sk-..."
                      className="w-full bg-slate-950 border border-emerald-900/40 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <button 
                  onClick={saveSettings}
                  className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg px-4 py-3 flex justify-center items-center gap-2 transition-colors"
                >
                  <Save size={18} /> Salva Profilo Meta
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tutorial / Guide Modal */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Target className="text-indigo-400" /> Guida: Come configurare Meta per le API?
                </h2>
                <button 
                  onClick={() => setShowTutorial(false)}
                  className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-8 text-slate-300">
                <section>
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><span className="bg-indigo-600 px-2 py-0.5 rounded text-sm">Passo 1</span> App ID & App Secret</h3>
                  <ol className="list-decimal pl-5 space-y-2 text-sm leading-relaxed">
                    <li>Vai su <a href="https://developers.facebook.com" target="_blank" className="text-indigo-400 hover:underline font-semibold">developers.facebook.com</a> e accedi. Clicca "Le mie app" in alto a destra e premi <strong>Crea un'app</strong>.</li>
                    <li>Scrivi il Nome dell'app (es. "Agente Meta").</li>
                    <li>Nella schermata successiva <em>Casi d'uso</em>, spunta <strong>Crea e gestisci le inserzioni con l'API Marketing</strong> e premi Avanti.</li>
                    <li>Nella schermata successiva <em>Azienda</em>, seleziona il tuo Business Manager principale a cui vuoi collegare l'app (es. ADpeople).</li>
                    <li>Terminata la creazione, nel menu a sinistra espandi <strong>Impostazioni dell'app</strong> &gt; clicca su <strong>Di base</strong>. Lì troverai visibili il tuo <strong>App ID (ID App)</strong> e, premendo 'Mostra', l'<strong>App Secret (Segreto app)</strong>.</li>
                  </ol>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><span className="bg-indigo-600 px-2 py-0.5 rounded text-sm">Passo 2</span> Access Token (Lunga durata)</h3>
                  <p className="text-sm mb-2 text-slate-400">Dovrai autorizzare la tua App a toccare l'account pubblicitario tramite un token.</p>
                  <ol className="list-decimal pl-5 space-y-2 text-sm leading-relaxed">
                    <li>Sempre da developers.facebook.com, vai su <strong>Strumenti</strong> (menu in alto) &gt; <strong>Graph API Explorer</strong>.</li>
                    <li>Nella colonna destra seleziona la tua App appena creata.</li>
                    <li>Nel dropdown 'User or Page', seleziona <strong>Token d'accesso utente (Get User Access Token)</strong>.</li>
                    <li>Aggiungi questi permessi: <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-400">ads_management</code>, <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-400">ads_read</code>, <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-400">pages_show_list</code></li>
                    <li>Clicca su "Genera Access Token". Clicca l'icona 'Info/i' accanto alla stringa lunga, apri lo strumento e premi "Extendi Token" in basso per averne uno che non cede in 60 minuti. Quella mega-stringa EAAI... è il tuo <strong>Access Token</strong>.</li>
                  </ol>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><span className="bg-indigo-600 px-2 py-0.5 rounded text-sm">Passo 3</span> Ad Account ID & Page ID</h3>
                  <ol className="list-decimal pl-5 space-y-2 text-sm leading-relaxed">
                    <li>Apri il tuo <strong>Business Manager o Gestione Inserzioni</strong> di Facebook.</li>
                    <li>Guardando l'URL in alto, troverai <code>act_123456789...</code> L'<strong>Ad Account ID</strong> sono esclusivamente i numeri successivi a "act_".</li>
                    <li>Per il <strong>Page ID</strong>: Vai sulla tua pagina Facebook aziendale, su <em>Informazioni &gt; Trasparenza della Pagina</em>, o nella tab "Info", troverai "ID Pagina" in fondo.</li>
                  </ol>
                </section>
                
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 mt-4">
                  <p className="text-sm text-indigo-200">
                    <strong>💡 Nota per le Agenzie SaaS:</strong> Se in futuro vuoi aggiungere un cliente, non cambierai l'App ID/Secret (quella è l'app della tua agenzia software), ma genererai un nuovo <strong>Access Token</strong> per il cliente (o lo farai generare a lui con un click di login) e inserirai qui il suo Ad Account e Page ID!
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Header / Hero */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-4xl text-center mb-12 relative z-10 p-2"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-6 mt-4">
          <Sparkles size={16} />
          <span>Meta Ads Strategist AI</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6">
          Genera campagne vincenti <br className="hidden sm:block" />
          in <span className="gradient-text">pochi secondi</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto">
          Il tuo Media Buyer & Copywriter personale. Analizza il tuo prodotto, definisce il target, scrive i copy e ottimizza le conversioni.
        </p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-5xl relative z-10">
        
        {/* Input Form */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1 glass-panel rounded-2xl p-8 shadow-2xl h-fit w-full"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Target className="text-indigo-400" /> Inizia l'Analisi
          </h2>
          
          <form onSubmit={handleAnalyze} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                URL del Prodotto o Sito Web
              </label>
              <input 
                type="url" 
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://tuosito.com/prodotto"
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-sm"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Budget Giornaliero (€)
                </label>
                <input 
                  type="number" 
                  required
                  min="5"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="es. 50"
                  className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Obiettivo Campagna
                </label>
                <select 
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all pr-8 [&>option]:bg-slate-900"
                >
                  <option value="conversion">Acquisti (E-commerce)</option>
                  <option value="lead">Generazione Contatti (Lead)</option>
                  <option value="traffic">Traffico al Sito</option>
                  <option value="engagement">Interazioni / Messaggi</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 mt-6">
               <div className="flex-1">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  URL del Funnel (Destinazione Finale)
                </label>
                <input 
                  type="url" 
                  value={urlDestination}
                  onChange={(e) => setUrlDestination(e.target.value)}
                  placeholder="Lascia vuoto per usare lo stesso URL in alto"
                  className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Pulsante Azione (CTA)
                </label>
                <select 
                  value={ctaType}
                  onChange={(e) => setCtaType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all pr-8 [&>option]:bg-slate-900"
                >
                  <option value="LEARN_MORE">Scopri di più</option>
                  <option value="SHOP_NOW">Acquista ora</option>
                  <option value="SIGN_UP">Iscriviti</option>
                  <option value="DOWNLOAD">Scarica</option>
                  <option value="CONTACT_US">Contattaci</option>
                  <option value="APPLY_NOW">Candidati ora</option>
                </select>
              </div>
            </div>

            {/* SEZIONE CREATIVITÀ */}
            <div className="border-t border-slate-800 pt-6 mt-2">
              <label className="block text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-400" />
                Materiale Creativo dell'Inserzione
              </label>
              
              <div className="flex bg-slate-950 rounded-xl p-1 mb-4 border border-slate-800 w-full sm:w-fit">
                <button
                  type="button"
                  onClick={() => setCreativeMode("upload")}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                    creativeMode === "upload" 
                      ? "bg-indigo-600 text-white shadow-md" 
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  Carica Immagine
                </button>
                <button
                  type="button"
                  onClick={() => setCreativeMode("ai")}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                    creativeMode === "ai" 
                      ? "bg-fuchsia-600 text-white shadow-md" 
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  Genera con IA
                </button>
              </div>

              {creativeMode === "upload" ? (
                <div className="border-2 border-dashed border-slate-700/80 rounded-xl p-6 text-center hover:bg-slate-900/40 hover:border-indigo-500/50 transition-colors relative">
                  {!imagePreview ? (
                    <>
                      <MonitorPlay className="mx-auto text-slate-500 mb-3" size={32} />
                      <p className="text-sm text-slate-400 mb-1">Trascina un'immagine o video oppure clicca per caricare</p>
                      <p className="text-xs text-slate-500">Formati supportati: JPG, PNG, MP4, MOV (Max 50MB)</p>
                      <input 
                        type="file" 
                        accept="image/*,video/mp4,video/quicktime"
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </>
                  ) : (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden group bg-slate-900 flex justify-center items-center">
                      {selectedImage?.type.startsWith("video/") ? (
                         // eslint-disable-next-line jsx-a11y/media-has-caption
                         <video src={imagePreview} className="w-full h-full object-cover" autoPlay muted loop />
                      ) : (
                         /* eslint-disable-next-line @next/next/no-img-element */
                         <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <p className="text-white text-sm font-medium">Clicca per cambiare file</p>
                      </div>
                      <input 
                        type="file" 
                        accept="image/*,video/mp4,video/quicktime"
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-xl p-4 flex gap-4 items-start">
                  <Sparkles className="text-fuchsia-400 shrink-0 mt-1" size={20} />
                  <div>
                     <p className="text-sm font-medium text-fuchsia-100 mb-1">Creazione Automatica (DALL-E 3)</p>
                     <p className="text-xs text-fuchsia-200/70">
                       L'Agente leggerà la tua strategia e disegnerà un'immagine perfetta per massimizzare le conversioni su Meta. 
                     </p>
                  </div>
                </div>
              )}
            </div>

            <button 
              type="submit"
              disabled={isAnalyzing}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-4 py-4 mt-4 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
            >
              {isAnalyzing ? (
                <>
                  <Zap className="animate-pulse" size={20} />
                  Elaborazione Strategia...
                </>
              ) : (
                <>
                  Genera Strategia & Copy
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Info Box o Risultati */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="lg:w-[45%] flex flex-col gap-6 w-full"
        >
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div 
                key="info"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="glass-panel rounded-2xl p-6 flex items-start gap-4 hover:bg-slate-800/20 transition-colors">
                  <div className="p-3 bg-fuchsia-500/10 rounded-lg text-fuchsia-400 shrink-0">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Angoli Marketing</h3>
                    <p className="text-sm text-slate-400">L'IA analizza il sito per trovare i punti di forza persuasivi del tuo prodotto.</p>
                  </div>
                </div>
                
                <div className="glass-panel rounded-2xl p-6 flex items-start gap-4 hover:bg-slate-800/20 transition-colors">
                  <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 shrink-0">
                    <MonitorPlay size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Copy Pronti</h3>
                    <p className="text-sm text-slate-400">Generazione di testi primari e titoli ottimizzati per Meta (AIDA, PAS framework).</p>
                  </div>
                </div>

                <div className="glass-panel rounded-2xl p-6 flex items-start gap-4 hover:bg-slate-800/20 transition-colors">
                  <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400 shrink-0">
                    <Target size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Targeting Suggerito</h3>
                    <p className="text-sm text-slate-400">Definizione accurata della struttura Broad e interessi da testare per farti risparmiare budget.</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-2xl p-6 space-y-6 bg-slate-900/40 relative"
              >
                <div className="flex items-center gap-3 border-b border-slate-700/50 pb-4">
                  <CheckCircle2 className="text-emerald-400" size={28} />
                  <h3 className="text-xl font-bold">La tua Strategia Meta</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-indigo-400 font-semibold mb-2 flex items-center gap-2">
                      <Target size={16}/> Audience & Targeting
                    </h4>
                    <div className="bg-slate-950/50 p-4 rounded-xl text-sm space-y-2 border border-slate-800">
                      <p><span className="text-slate-400">Broad:</span> {result.targeting.broad}</p>
                      <p><span className="text-slate-400">Interessi (Test):</span> {result.targeting.interests.join(", ")}</p>
                      <p><span className="text-slate-400">Retargeting/LAL:</span> {result.targeting.lookalike}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-fuchsia-400 font-semibold mb-2 flex items-center gap-2">
                      <Sparkles size={16}/> Marketing Angles
                    </h4>
                    <ul className="bg-slate-950/50 p-4 rounded-xl text-sm space-y-2 border border-slate-800">
                      {result.angles.map((angle: string, i: number) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-slate-500">{i+1}.</span> {angle}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                      <MonitorPlay size={16}/> Primary Copy (Winning)
                    </h4>
                    <div className="bg-slate-950/50 p-4 rounded-xl text-sm space-y-3 border border-slate-800 whitespace-pre-line">
                      <p className="text-slate-200 italic">"{result.copy.primaryText}"</p>
                      <div className="pt-2 border-t border-slate-800/50">
                        <p><span className="text-slate-400">Headline:</span> <span className="font-semibold">{result.copy.headline}</span></p>
                        <p><span className="text-slate-400">Descrizione:</span> {result.copy.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Bottone Posta su Meta */}
                <button 
                  onClick={handlePublishMeta}
                  disabled={isPublishing}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl px-4 py-3 transition-all flex items-center justify-center gap-2 group shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isPublishing ? (
                     <>
                        <Zap className="animate-pulse" size={20} /> Creazione Campagna su Meta...
                     </>
                  ) : (
                     <>
                        <Target size={20} />
                        Crea Campagna Bozza su Meta Ads
                        <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                     </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </main>
  );
}
