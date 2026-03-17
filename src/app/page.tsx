"use client";

import { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Target, MonitorPlay, Zap, CheckCircle2, Settings, X, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [url, setUrl] = useState("");
  const [budget, setBudget] = useState("");
  const [goal, setGoal] = useState("conversion");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Modello dei profili Meta
  type MetaProfile = {
    id: string;
    name: string;
    appId: string;
    appSecret: string;
    token: string;
    adAccountId: string;
  };

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [profiles, setProfiles] = useState<MetaProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>("");
  
  // State per il form di editing (profilo correntemente selezionato o nuovo)
  const [editingProfile, setEditingProfile] = useState<MetaProfile>({
    id: "new",
    name: "",
    appId: "",
    appSecret: "",
    token: "",
    adAccountId: ""
  });

  // Load settings on mount
  useEffect(() => {
    const savedProfiles = localStorage.getItem("metaProfiles");
    const savedActiveId = localStorage.getItem("metaActiveProfileId");

    if (savedProfiles) {
      try {
        const parsed = JSON.parse(savedProfiles);
        setProfiles(parsed);
        if (savedActiveId && parsed.find((p: MetaProfile) => p.id === savedActiveId)) {
          setActiveProfileId(savedActiveId);
          setEditingProfile(parsed.find((p: MetaProfile) => p.id === savedActiveId));
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
        adAccountId: ""
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
    
    setShowSettings(false);
    alert("Profilo Meta salvato correttamente!");
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setResult(null);
    
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, budget, goal })
      });
      
      const data = await response.json();
      if(data.success) {
        // Uniamo il budget alla risposta strategica per passarlo a Meta dopo
        setResult({ ...data.strategy, budget: parseInt(budget) });
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
    
    setIsPublishing(true);
    try {
      const response = await fetch("/api/meta/create-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy: result,
          metaConfig: activeProfile,
          url: url
        })
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
          Impostazioni Meta
        </button>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowSettings(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X size={24} />
              </button>
              
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Settings className="text-indigo-400" />
                Profili Meta API
              </h2>
              <p className="text-sm text-slate-400 mb-4">
                Salva diverse chiavi per gestire gli account di più clienti separatamente.
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
              </div>

              <div className="space-y-4 border-t border-slate-800 pt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Nome Profilo / Cliente</label>
                  <input 
                    type="text" 
                    value={editingProfile.name}
                    onChange={(e) => setEditingProfile({...editingProfile, name: e.target.value})}
                    placeholder="es. Bar Mario Srl"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Meta App ID</label>
                  <input 
                    type="text" 
                    value={editingProfile.appId}
                    onChange={(e) => setEditingProfile({...editingProfile, appId: e.target.value})}
                    placeholder="es. 1029384756"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">App Secret</label>
                  <input 
                    type="password" 
                    value={editingProfile.appSecret}
                    onChange={(e) => setEditingProfile({...editingProfile, appSecret: e.target.value})}
                    placeholder="Il tuo App Secret"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Access Token (Long Lived)</label>
                  <input 
                    type="password" 
                    value={editingProfile.token}
                    onChange={(e) => setEditingProfile({...editingProfile, token: e.target.value})}
                    placeholder="EAAI..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Account Pubblicitario ID (senza 'act_')</label>
                  <input 
                    type="text" 
                    value={editingProfile.adAccountId}
                    onChange={(e) => setEditingProfile({...editingProfile, adAccountId: e.target.value.replace('act_', '')})}
                    placeholder="es. 1234567890123"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
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
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Obiettivo Campagna
                </label>
                <select 
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all pr-8 [&>option]:bg-slate-900"
                >
                  <option value="conversion">Acquisti (E-commerce)</option>
                  <option value="lead">Generazione Contatti (Lead)</option>
                  <option value="traffic">Traffico al Sito</option>
                  <option value="engagement">Interazioni / Messaggi</option>
                </select>
              </div>
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
