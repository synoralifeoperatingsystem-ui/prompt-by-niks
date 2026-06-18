import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Sparkles, Copy, Download, Trash2, Sliders, Image, Film, Globe, Languages, Save } from "lucide-react";
import { jsPDF } from "jspdf";

interface MasterPromptEngineProps {
  userId: string;
  userCredits: number;
  onRefreshCredits: () => void;
}

const IMAGE_GENERATOR_LIST = [
  "Midjourney", "DALL-E", "Imagen", "Stable Diffusion", "Adobe Firefly", 
  "Leonardo AI", "Ideogram", "FLUX", "Canva AI", "Recraft", 
  "Microsoft Designer", "Craiyon", "NightCafe", "Artbreeder", "Photoroom", 
  "Picsart AI", "Shutterstock AI", "Getty Images AI", "Runway", "Wombo Dream"
];

const VIDEO_GENERATOR_LIST = [
  "OpenAI Sora", "Google Veo", "Runway", "Kling AI", "Luma Dream Machine", 
  "Pika", "Hailuo", "Wan", "Synthesia", "HeyGen", "InVideo", 
  "Seedance", "PixVerse", "Vyond", "Colossyan", "Adobe Firefly Video", 
  "DeepBrain AI", "Creatify", "Pictory", "CapCut AI", "D-ID", 
  "Haiper AI", "Vidu", "Lumen5"
];

const TARGET_LENGTHS = [1000, 2000, 3000, 5000, 10000];

export default function MasterPromptEngine({ userId, userCredits, onRefreshCredits }: MasterPromptEngineProps) {
  const [engineType, setEngineType] = useState<"image" | "video">("image");
  const [selectedEngine, setSelectedEngine] = useState("Midjourney");
  
  // Custom inputs
  const [baseConcept, setBaseConcept] = useState("");
  const [selectedLength, setSelectedLength] = useState(2000);
  const [selectedLanguage, setSelectedLanguage] = useState<"id" | "en">("en");
  
  // High fidelity sub parameters for prompt customizer
  const [shotType, setShotType] = useState("Cinematic Portrait");
  const [lighting, setLighting] = useState("Soft Golden Hour");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [aestheticVibe, setAestheticVibe] = useState("Hyperrealistic dreamlike pastel pink");
  
  const [result, setResult] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Automatically switch active engine when type changes
    setSelectedEngine(engineType === "image" ? "Midjourney" : "OpenAI Sora");
  }, [engineType]);

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/user/master-prompt/history/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!baseConcept.trim()) {
      setError("Gagasan konsep utama wajib diisi terlebih dahulu.");
      return;
    }

    if (userCredits < 5) {
      setError("Kredit kurang! Pengoptimalan membutuhkan 5 kredit.");
      return;
    }

    setLoading(true);
    try {
      const inputParameters = {
        baseConcept,
        shotType,
        lighting,
        aspectRatio,
        aestheticVibe,
        targetLength: selectedLength,
      };

      const res = await fetch("/api/user/master-prompt/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title: `Master ${selectedEngine}: ${baseConcept.substring(0, 20)}...`,
          engine: selectedEngine,
          maxLength: selectedLength,
          language: selectedLanguage,
          inputParameters,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kesalahan perumusan prompt.");

      setResult(data.masterPrompt);
      onRefreshCredits();
      fetchHistory();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    try {
      const res = await fetch(`/api/user/master-prompt/delete/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchHistory();
        if (result && result.id === id) {
          setResult(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.generatedPrompt);
    alert("Berhasil menyalin Master Prompt ke Clipboard!");
  };

  const exportPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(225, 119, 137);
    doc.text("PROMPT BY NIKS - OPTIMIZED MASTER PROMPT", 15, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 48, 50);
    doc.text(`Target Engine: ${result.engine} (${result.maxLength} Karakter)`, 15, 27);
    doc.text(`Bahasa: ${result.language === 'id' ? 'Indonesia' : 'Inggris'}`, 15, 32);
    doc.text(`Waktu Pembuatan: ${new Date(result.createdAt).toLocaleString("id-ID")}`, 15, 37);
    doc.line(15, 41, 195, 41);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("HASIL KREASI MASTER PROMPT:", 15, 50);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(result.generatedPrompt, 180);
    doc.text(splitText, 15, 57);

    doc.save(`Niks-MasterPrompt-${Date.now()}.pdf`);
  };

  const exportDOCX = () => {
    if (!result) return;
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><title>Optimasi Master Prompt</title>
      <style>
        body { font-family: Arial; color: #413032; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #FBE6E8; margin-bottom: 20px; }
        .engine { font-size: 14px; font-weight: bold; color: #E17789; }
        .prompt-body { font-size: 12px; background: #FAF3F4; padding: 15px; border-radius: 8px; border: 1px solid #E9D2D4; line-height: 1.6; }
      </style>
      </head>
      <body>
        <div class="header">
          <h1 style="color: #E17789;">PROMPT BY NIKS - MASTER PROMPT</h1>
          <p>Designed By Gara - Neumorphism Feminim 4D</p>
        </div>
        <p class="engine">Target Engine: ${result.engine} | Bahasa: ${result.language.toUpperCase()}</p>
        <div class="prompt-body">
          ${result.generatedPrompt.replace(/\n/g, "<br/>")}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Niks-MasterPrompt-${Date.now()}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-8" id="master_prompt_module">
      {/* Visual Header Banner */}
      <div className="flex bg-feminine-bg p-2 rounded-2xl shadow-inner border border-feminine-dark/5 w-full md:max-w-md mx-auto">
        <button
          onClick={() => setEngineType("image")}
          className={`flex-1 py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${
            engineType === "image"
              ? "bg-white text-feminine-accent shadow-md border border-white"
              : "text-feminine-dark/60 hover:text-feminine-dark"
          }`}
        >
          <Image className="w-4 h-4" />
          <span>IMAGE ENGINE</span>
        </button>
        <button
          onClick={() => setEngineType("video")}
          className={`flex-1 py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${
            engineType === "video"
              ? "bg-white text-feminine-accent shadow-md border border-white"
              : "text-feminine-dark/60 hover:text-feminine-dark"
          }`}
        >
          <Film className="w-4 h-4" />
          <span>VIDEO ENGINE</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* INPUT CONFIGURATIONS: Left Grid */}
        <div className="lg:col-span-5 bg-white rounded-[2rem_1.5rem_2.5rem_1.5rem] p-6 lg:p-8 border border-white/60 neu-panel-emboss relative">
          <div className="absolute top-4 right-4 bg-feminine-rose px-3 py-1 rounded-full text-[10px] font-bold text-feminine-accent tracking-wider border border-white uppercase shadow-sm">
            Biaya: 5 Kredit
          </div>

          <h3 className="text-lg font-bold text-feminine-dark mb-5 flex items-center gap-2 border-b border-feminine-dark/5 pb-3">
            <Sliders className="w-5 h-5 text-feminine-accent" />
            <span>Formulasi Kreatif</span>
          </h3>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs px-3.5 py-2.5 rounded-xl mb-4 border border-red-100 font-medium">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleGenerate} className="space-y-4">
            {/* Target Generator Dropdown Selector */}
            <div>
              <label className="block text-xs font-bold text-feminine-dark/70 uppercase tracking-wider mb-2 pl-1">
                Pilih Engine Target ({engineType.toUpperCase()})
              </label>
              <select
                value={selectedEngine}
                onChange={(e) => setSelectedEngine(e.target.value)}
                className="w-full h-11 px-3 rounded-xl text-sm bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-inner focus:outline-none"
              >
                {engineType === "image"
                  ? IMAGE_GENERATOR_LIST.map((eng) => (
                      <option key={eng} value={eng}>{eng}</option>
                    ))
                  : VIDEO_GENERATOR_LIST.map((eng) => (
                      <option key={eng} value={eng}>{eng}</option>
                    ))}
              </select>
            </div>

            {/* Base Core Concept Description */}
            <div>
              <label className="block text-xs font-bold text-feminine-dark/70 uppercase tracking-wider mb-2 pl-1">
                Gagasan Inti Adegan / Subyek
              </label>
              <textarea
                required
                value={baseConcept}
                onChange={(e) => setBaseConcept(e.target.value)}
                placeholder="Tulis gagasan sederhana... Contoh: Kucing tidur di atas tumpukan berkas, memakai kacamata baca kecil."
                className="w-full h-24 p-3 rounded-xl text-sm bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-[inset_2px_2px_4px_#dfccd0,inset_-2px_-2px_4px_#ffffff] focus:outline-none focus:ring-1 focus:ring-feminine-accent/40 resize-none font-medium leading-relaxed"
              />
            </div>

            {/* Tuning custom options slider style */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-feminine-dark/70 uppercase tracking-widest mb-1.5 pl-1">
                  Sudut / Jenis Bidik
                </label>
                <input
                  type="text"
                  value={shotType}
                  onChange={(e) => setShotType(e.target.value)}
                  placeholder="Cinematic, Close Up"
                  className="w-full h-10 px-3 rounded-xl text-xs bg-feminine-bg border border-feminine-dark/5 shadow-inner focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-feminine-dark/70 uppercase tracking-widest mb-1.5 pl-1">
                  Pencahayaan
                </label>
                <input
                  type="text"
                  value={lighting}
                  onChange={(e) => setLighting(e.target.value)}
                  placeholder="Golden hour, Neon glow"
                  className="w-full h-10 px-3 rounded-xl text-xs bg-feminine-bg border border-feminine-dark/5 shadow-inner focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-feminine-dark/70 uppercase tracking-widest mb-1.5 pl-1">
                  Dimensi / Rasio
                </label>
                <input
                  type="text"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  placeholder="16:9, 1:1, 9:16"
                  className="w-full h-10 px-3 rounded-xl text-xs bg-feminine-bg border border-feminine-dark/5 shadow-inner focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-feminine-dark/70 uppercase tracking-widest mb-1.5 pl-1">
                  Nuansa / Estetika
                </label>
                <input
                  type="text"
                  value={aestheticVibe}
                  onChange={(e) => setAestheticVibe(e.target.value)}
                  placeholder="Feminine pastel soft glow"
                  className="w-full h-10 px-3 rounded-xl text-xs bg-feminine-bg border border-feminine-dark/5 shadow-inner focus:outline-none"
                />
              </div>
            </div>

            {/* Target length character box */}
            <div>
              <label className="block text-xs font-bold text-feminine-dark/70 uppercase tracking-wider mb-2 pl-1">
                Target Panjang Prompt
              </label>
              <div className="flex bg-feminine-bg p-1 rounded-xl shadow-inner border border-feminine-dark/5 justify-between">
                {TARGET_LENGTHS.map((len) => (
                  <button
                    key={len}
                    type="button"
                    onClick={() => setSelectedLength(len)}
                    className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all duration-200 ${
                      selectedLength === len
                        ? "bg-white text-feminine-accent shadow-sm"
                        : "text-feminine-dark/55 hover:text-feminine-dark"
                    }`}
                  >
                    {len} Chars
                  </button>
                ))}
              </div>
            </div>

            {/* Multilingual Mode */}
            <div>
              <label className="block text-xs font-bold text-feminine-dark/70 uppercase tracking-wider mb-2 pl-1">
                Output Bahasa Prompt Hasil
              </label>
              <div className="flex gap-4 p-1">
                <button
                  type="button"
                  onClick={() => setSelectedLanguage("id")}
                  className={`flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border select-none transition-all ${
                    selectedLanguage === "id"
                      ? "bg-feminine-rose text-feminine-accent border-feminine-accent/40"
                      : "bg-white text-feminine-dark/65 border-feminine-dark/10"
                  }`}
                >
                  <Languages className="w-4 h-4" />
                  <span>INDONESIA</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLanguage("en")}
                  className={`flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border select-none transition-all ${
                    selectedLanguage === "en"
                      ? "bg-feminine-rose text-feminine-accent border-feminine-accent/40"
                      : "bg-white text-feminine-dark/65 border-feminine-dark/10"
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>ENGLISH</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-sm font-semibold select-none text-white bg-feminine-accent hover:bg-feminine-accent-hover active:bg-feminine-accent neu-btn-rose-emboss cursor-pointer flex items-center justify-center gap-2 transform transition-all active:scale-[0.98] mt-4"
            >
              <Sparkles className="w-4 h-4 animate-spin-slow" />
              <span>{loading ? "Merespons Parameter..." : "Formulasikan Prompt"}</span>
            </button>
          </form>
        </div>

        {/* RESULTS AND HISTORY LISTS: Right Grid */}
        <div className="lg:col-span-7 space-y-6">
          {result ? (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[2rem_1.5rem_2.5rem_1.5rem] p-6 lg:p-8 border border-white/60 neu-panel-emboss relative"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-feminine-dark/5 pb-4 mb-4">
                <div>
                  <h4 className="text-sm font-bold text-feminine-dark uppercase tracking-wider text-feminine-accent">
                    MASTER PROMPT OPTIMIZED SHEET
                  </h4>
                  <p className="text-[11px] text-feminine-dark/50">
                    Dikuasai formulasi gaya khusus untuk {result.engine}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="p-2.5 rounded-lg bg-white neu-btn-white-emboss border border-white text-feminine-accent hover:text-feminine-accent-hover transform active:scale-95"
                    title="Salin Prompt"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={exportPDF}
                    className="p-2.5 rounded-lg bg-white neu-btn-white-emboss border border-white text-feminine-accent hover:text-feminine-accent-hover transform active:scale-95 flex items-center gap-1.5 text-xs font-semibold"
                    title="Export PDF"
                  >
                    <Download className="w-4 h-4" />
                    <span>PDF</span>
                  </button>
                  <button
                    onClick={exportDOCX}
                    className="p-2.5 rounded-lg bg-white neu-btn-white-emboss border border-white text-feminine-accent hover:text-feminine-accent-hover transform active:scale-95 flex items-center gap-1.5 text-xs font-semibold"
                    title="Export Word"
                  >
                    <Download className="w-4 h-4" />
                    <span>Word</span>
                  </button>
                </div>
              </div>

              {/* Master Prompt Result Box Textarea Style */}
              <div className="p-5 rounded-2xl bg-feminine-bg text-xs font-medium text-feminine-dark leading-relaxed font-mono shadow-inner border border-feminine-dark/5 whitespace-pre-wrap select-all relative overflow-hidden max-h-[350px] overflow-y-auto">
                {result.generatedPrompt}
              </div>
            </motion.div>
          ) : (
            <div className="bg-feminine-bg/50 border-2 border-dashed border-feminine-dark/10 rounded-[2rem_1.5rem_2.5rem_1.5rem] p-12 text-center h-[350px] flex flex-col items-center justify-center">
              <Sparkles className="w-12 h-12 text-feminine-dark/20 animate-pulse mb-3" />
              <p className="text-sm font-semibold text-feminine-dark/60">
                Pilih tab engine & rancang spesifikasi prompt optimal Anda.
              </p>
              <p className="text-xs text-feminine-dark/45 mt-1 max-w-sm mx-auto leading-relaxed">
                Gemini akan merumuskan sintaksis parameter mutakhir (seperti aspect ratio, lighting tokens, camera weights, negative tags) sesuai mesin generator gambar / video yang Anda tunjuk.
              </p>
            </div>
          )}

          {/* HISTORIES */}
          {history.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-feminine-dark/60 uppercase tracking-widest pl-1">
                KOTAK MASTER PROMPT SAYA
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="p-4 bg-white rounded-2xl border border-white neu-panel-emboss flex justify-between items-center group relative overflow-hidden"
                  >
                    <div
                      onClick={() => setResult(h)}
                      className="flex-1 cursor-pointer pr-4"
                    >
                      <p className="text-xs font-bold text-feminine-dark truncate hover:text-feminine-accent">
                        {h.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="px-2 py-0.5 bg-feminine-rose rounded text-[9px] font-bold text-feminine-accent uppercase tracking-wider border border-white">
                          {h.engine}
                        </span>
                        <span className="text-[10px] text-feminine-dark/40 font-semibold font-mono uppercase">
                          {h.language}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteHistory(h.id)}
                      className="p-2 text-feminine-dark/30 hover:text-red-500 rounded-lg hover:bg-red-50 active:scale-95 transition-all relative z-10"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
