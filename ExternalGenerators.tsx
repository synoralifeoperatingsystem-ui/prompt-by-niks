import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Image, 
  Film, 
  Compass, 
  ArrowRight, 
  Play, 
  Loader2, 
  RefreshCw, 
  Upload, 
  Trash2, 
  Eye, 
  FileVideo, 
  FileImage, 
  Maximize2, 
  AlertTriangle, 
  X 
} from "lucide-react";

interface ExternalGeneratorsProps {
  userId: string;
  userCredits: number;
  onRefreshCredits: () => void;
}

const IMAGE_ENGINES = [
  "Midjourney", "DALL-E", "Imagen", "Stable Diffusion", "Leonardo AI", "FLUX"
];

const VIDEO_ENGINES = [
  "OpenAI Sora", "Google Veo", "Runway", "Kling AI", "Luma Dream Machine", "Pika"
];

const IMAGE_REF_MODES = [
  "Prompt + Reference",
  "Reference Only",
  "Multi Reference Fusion",
  "Style Reference",
  "Character Reference",
  "Face Reference",
  "Composition Reference",
  "Lighting Reference",
  "Color Reference",
  "Outfit Reference"
];

const VIDEO_REF_MODES = [
  "Video To Video",
  "Video Style Transfer",
  "Motion Reference",
  "Camera Motion Reference",
  "Character Motion Reference",
  "Scene Reference",
  "Cinematic Reference"
];

export default function ExternalGenerators({ userId, userCredits, onRefreshCredits }: ExternalGeneratorsProps) {
  const [activeSegment, setActiveSegment] = useState<"image" | "video">("image");
  const [selectedEngine, setSelectedEngine] = useState("Midjourney");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Custom states for references feature
  const [imageReferences, setImageReferences] = useState<any[]>([]);
  const [videoReferences, setVideoReferences] = useState<any[]>([]);
  const [selectedImageMode, setSelectedImageMode] = useState("Prompt + Reference");
  const [selectedVideoMode, setSelectedVideoMode] = useState("Video To Video");
  const [uploadLoading, setUploadLoading] = useState(false);
  
  // Custom lightbox state
  const [activePreview, setActivePreview] = useState<{ url: string; title: string; type: "image" | "video" } | null>(null);

  const [generatedImgResult, setGeneratedImgResult] = useState<any | null>(null);
  const [generatedVidResult, setGeneratedVidResult] = useState<any | null>(null);

  // Lists of saved master prompts to load them directly!
  const [savedMasterPrompts, setSavedMasterPrompts] = useState<any[]>([]);

  useEffect(() => {
    setSelectedEngine(activeSegment === "image" ? "Midjourney" : "OpenAI Sora");
    fetchSavedMasterPrompts();
  }, [activeSegment]);

  useEffect(() => {
    fetchReferences();
  }, [userId]);

  const fetchSavedMasterPrompts = async () => {
    try {
      const res = await fetch(`/api/user/master-prompt/history/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSavedMasterPrompts(data.history || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReferences = async () => {
    try {
      const res = await fetch(`/api/user/reference/list/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setImageReferences(data.imageReferences || []);
        setVideoReferences(data.videoReferences || []);
      }
    } catch (e) {
      console.error("Gagal mendapatkan daftar referensi file:", e);
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>, type: "image" | "video") => {
    let files: FileList | null = null;
    if ("files" in e.target && e.target.files) {
      files = e.target.files;
    } else if ("dataTransfer" in e && e.dataTransfer.files) {
      e.preventDefault();
      files = e.dataTransfer.files;
    }

    if (!files || files.length === 0) return;

    // Evaluate Limits
    const currentCount = type === "image" ? imageReferences.length : videoReferences.length;
    const maxCount = type === "image" ? 20 : 10;
    if (currentCount + files.length > maxCount) {
      setError(`Maksimal ${maxCount} referensi ${type === "image" ? "gambar" : "video"} diperbolehkan.`);
      return;
    }

    setUploadLoading(true);
    setError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Size bounds check
        const maxMB = type === "image" ? 50 : 500;
        if (file.size > maxMB * 1024 * 1024) {
          throw new Error(`Ukuran berkas "${file.name}" melebihi batas maksimum (${maxMB} MB).`);
        }

        // Run client-side async probe for dimensions and duration
        let duration: number | undefined = undefined;
        let resolution = "1920x1080";

        if (type === "video") {
          resolution = "1920x1080"; // standard default
          try {
            const url = URL.createObjectURL(file);
            const videoEl = document.createElement("video");
            videoEl.src = url;
            await new Promise<void>((resolve) => {
              videoEl.onloadedmetadata = () => {
                duration = videoEl.duration;
                resolution = `${videoEl.videoWidth}x${videoEl.videoHeight}`;
                resolve();
              };
              videoEl.onerror = () => resolve();
            });
            URL.revokeObjectURL(url);
          } catch (probeErr) {
            console.warn("Gagal mengekstrak metadata video di sisi klien:", probeErr);
          }
        } else {
          resolution = "1024x1024"; // standard image default
          try {
            const url = URL.createObjectURL(file);
            const imgEl = new window.Image();
            imgEl.src = url;
            await new Promise<void>((resolve) => {
              imgEl.onload = () => {
                resolution = `${imgEl.width}x${imgEl.height}`;
                resolve();
              };
              imgEl.onerror = () => resolve();
            });
            URL.revokeObjectURL(url);
          } catch (probeErr) {
            console.warn("Gagal mengekstrak metadata gambar di sisi klien:", probeErr);
          }
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("userId", userId);
        formData.append("providerTarget", selectedEngine);
        formData.append("resolution", resolution);
        if (duration !== undefined) {
          formData.append("duration", String(duration));
        }

        const uploadUrl = type === "image" ? "/api/user/reference/upload-image" : "/api/user/reference/upload-video";
        const res = await fetch(uploadUrl, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Proses unggah gagal.");
        }
      }

      await fetchReferences();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteReference = async (type: "image" | "video", id: string) => {
    try {
      const res = await fetch(`/api/user/reference/delete/${type}/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await fetchReferences();
      } else {
        const data = await res.json();
        setError(data.error || "Gagal menghapus file.");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGenerateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGeneratedImgResult(null);

    if (!prompt.trim()) {
      setError("Prompt pembuatan gambar wajib diisi.");
      return;
    }

    if (userCredits < 15) {
      setError("Kredit kurang! Pembuatan gambar membutuhkan 15 kredit.");
      return;
    }

    setLoading(true);
    try {
      // Pack image references from database list relative to target provider
      const serializedImages = imageReferences.map((r) => ({
        fileName: r.fileName,
        size: r.fileSize,
        resolution: r.resolution,
        url: r.publicUrl
      }));

      const res = await fetch("/api/user/generate-image-trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId, 
          prompt, 
          engine: selectedEngine,
          imageReferences: serializedImages,
          mode: selectedImageMode
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kesalahan trigger generator.");

      setGeneratedImgResult(data.result);
      onRefreshCredits();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGeneratedVidResult(null);

    if (!prompt.trim()) {
      setError("Prompt pembuatan video wajib diisi.");
      return;
    }

    if (userCredits < 30) {
      setError("Kredit kurang! Pembuatan video membutuhkan 30 kredit.");
      return;
    }

    setLoading(true);
    try {
      // Pack multi-combinations (Images, Videos, and Prompt)
      const serializedImages = imageReferences.map((r) => ({
        fileName: r.fileName,
        size: r.fileSize,
        resolution: r.resolution,
        url: r.publicUrl
      }));

      const serializedVideos = videoReferences.map((r) => ({
        fileName: r.fileName,
        size: r.fileSize,
        resolution: r.resolution,
        duration: r.duration,
        url: r.publicUrl
      }));

      const res = await fetch("/api/user/generate-video-trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId, 
          prompt, 
          engine: selectedEngine,
          imageReferences: serializedImages,
          videoReferences: serializedVideos,
          mode: selectedVideoMode
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kesalahan trigger generator video.");

      setGeneratedVidResult(data.result);
      onRefreshCredits();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPresetPrompt = (text: string) => {
    setPrompt(text);
  };

  return (
    <div className="space-y-8" id="external_generators_module">
      {/* Segment Switcher */}
      <div className="flex bg-feminine-bg p-2 rounded-2xl shadow-inner border border-feminine-dark/5 w-full md:max-w-md mx-auto">
        <button
          onClick={() => { setActiveSegment("image"); setPrompt(""); setError(null); }}
          className={`flex-1 py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${
            activeSegment === "image"
              ? "bg-white text-feminine-accent shadow-md border border-white"
              : "text-feminine-dark/60 hover:text-feminine-dark"
          }`}
        >
          <Image className="w-4 h-4" />
          <span>IMAGE GENERATOR</span>
        </button>
        <button
          onClick={() => { setActiveSegment("video"); setPrompt(""); setError(null); }}
          className={`flex-1 py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${
            activeSegment === "video"
              ? "bg-white text-feminine-accent shadow-md border border-white"
              : "text-feminine-dark/60 hover:text-feminine-dark"
          }`}
        >
          <Film className="w-4 h-4" />
          <span>VIDEO GENERATOR</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* CONFIG DESIGN LEFT COLUMN */}
        <div className="lg:col-span-5 bg-white rounded-[2rem_1.5rem_2.5rem_1.5rem] p-6 lg:p-8 border border-white/60 neu-panel-emboss relative space-y-6">
          <div className="absolute top-4 right-4 bg-feminine-rose px-3 py-1 rounded-full text-[10px] font-bold text-feminine-accent tracking-wider border border-white uppercase shadow-sm">
            Biaya: {activeSegment === "image" ? "15" : "30"} Kredit
          </div>

          <h3 className="text-lg font-bold text-feminine-dark flex items-center gap-2 border-b border-feminine-dark/5 pb-3">
            <Sparkles className="w-5 h-5 text-feminine-accent animate-pulse" />
            <span>Kirim Instruksi Ke Engine</span>
          </h3>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs px-3.5 py-2.5 rounded-xl border border-red-100 font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Engine Dropdown selection */}
          <div>
            <label className="block text-xs font-bold text-feminine-dark/70 uppercase tracking-wider mb-2 pl-1">
              Daftar API Provider
            </label>
            <select
              value={selectedEngine}
              onChange={(e) => setSelectedEngine(e.target.value)}
              className="w-full h-11 px-3 rounded-xl text-sm bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-inner focus:outline-none focus:ring-1 focus:ring-feminine-accent/40 cursor-pointer"
            >
              {activeSegment === "image"
                ? IMAGE_ENGINES.map((e) => <option key={e} value={e}>{e}</option>)
                : VIDEO_ENGINES.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          {/* Mode Dropdown selection */}
          <div>
            <label className="block text-xs font-bold text-feminine-dark/70 uppercase tracking-wider mb-2 pl-1">
              Mode Generasi Multi-Referensi
            </label>
            {activeSegment === "image" ? (
              <select
                value={selectedImageMode}
                onChange={(e) => setSelectedImageMode(e.target.value)}
                className="w-full h-11 px-3 rounded-xl text-sm bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-inner focus:outline-none focus:ring-1 focus:ring-feminine-accent/40 cursor-pointer"
              >
                {IMAGE_REF_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
              </select>
            ) : (
              <select
                value={selectedVideoMode}
                onChange={(e) => setSelectedVideoMode(e.target.value)}
                className="w-full h-11 px-3 rounded-xl text-sm bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-inner focus:outline-none focus:ring-1 focus:ring-feminine-accent/40 cursor-pointer"
              >
                {VIDEO_REF_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
              </select>
            )}
          </div>

          {/* Preset Prompts shortcut helper panel */}
          {savedMasterPrompts.length > 0 && (
            <div className="bg-feminine-rose/30 p-3 rounded-xl border border-feminine-accent/10">
              <span className="text-[10px] font-bold text-feminine-accent uppercase tracking-widest block mb-2">
                📂 Muat Dari Formula Master Prompt Saya:
              </span>
              <div className="space-y-1.5 max-h-[100px] overflow-y-auto">
                {savedMasterPrompts.map((mp) => (
                  <button
                    key={mp.id}
                    onClick={() => loadPresetPrompt(mp.generatedPrompt)}
                    type="button"
                    className="w-full text-left p-1.5 bg-white text-[10px] font-semibold text-feminine-dark hover:text-feminine-accent truncate rounded border border-white hover:border-feminine-accent/20 block cursor-pointer"
                  >
                    🚀 {mp.title} ({mp.engine})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prompt text area */}
          <form onSubmit={activeSegment === "image" ? handleGenerateImage : handleGenerateVideo} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-feminine-dark/75 uppercase tracking-wider mb-2 pl-1">
                Tulis Prompt Pembuatan Anda
              </label>
              <textarea
                required
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Salin atau ketik prompt visual Anda disini..."
                className="w-full h-32 p-3 rounded-xl text-sm bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-[inset_2px_2px_4px_#dfccd0,inset_-2px_-2px_4px_#ffffff] focus:outline-none focus:ring-1 focus:ring-feminine-accent/40 resize-none leading-relaxed font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading || uploadLoading}
              className="w-full h-12 rounded-xl text-sm font-semibold text-white bg-feminine-accent hover:bg-feminine-accent-hover select-none neu-btn-rose-emboss cursor-pointer flex items-center justify-center gap-2 transform transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Sedang Melukis...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 animate-spin-slow" />
                  <span>Kirim ke {selectedEngine} ({activeSegment === "image" ? selectedImageMode : selectedVideoMode})</span>
                </>
              )}
            </button>
          </form>

          {/* REFERENCE PANEL */}
          <div className="border-t border-feminine-dark/10 pt-4 space-y-4">
            <h4 className="text-xs font-bold text-feminine-accent uppercase tracking-widest flex items-center gap-1.5 pl-1">
              <Upload className="w-4 h-4" />
              <span>DASHBOARD FILE REFERENSI</span>
            </h4>

            {uploadLoading && (
              <div className="flex items-center gap-2 text-xs text-feminine-accent font-semibold p-2.5 bg-feminine-rose/30 rounded-xl justify-center animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses unggah & probing metadata klien...</span>
              </div>
            )}

            {/* Upload Zone Button or Drag (Image) */}
            {activeSegment === "image" ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleUploadFile(e, "image"); }}
                onClick={() => document.getElementById("img-upload-ref")?.click()}
                className="border-2 border-dashed border-feminine-accent/20 rounded-2xl p-5 text-center cursor-pointer bg-feminine-bg/40 hover:bg-feminine-rose/30 transition-all duration-300 shadow-sm relative group"
              >
                <input
                  id="img-upload-ref"
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) => handleUploadFile(e, "image")}
                  className="hidden"
                />
                <FileImage className="w-7 h-7 text-feminine-accent mx-auto mb-2 opacity-70 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-[11px] font-bold text-feminine-dark/80 block uppercase tracking-wider">
                  Select / Drag & Drop Referensi Gambar
                </span>
                <span className="text-[9px] text-feminine-dark/50 block mt-1">
                  JPG, JPEG, PNG, WEBP (Max 20 file • Maks 50MB per gambar)
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Image Reference for Video Combination */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); handleUploadFile(e, "image"); }}
                  onClick={() => document.getElementById("img-upload-combo")?.click()}
                  className="border-2 border-dashed border-feminine-accent/20 rounded-2xl p-4 text-center cursor-pointer bg-feminine-bg/40 hover:bg-feminine-rose/30 transition-all duration-300 shadow-sm relative group"
                >
                  <input
                    id="img-upload-combo"
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={(e) => handleUploadFile(e, "image")}
                    className="hidden"
                  />
                  <FileImage className="w-6 h-6 text-feminine-accent mx-auto mb-1.5 opacity-70 group-hover:scale-110 transition-transform duration-300" />
                  <span className="text-[10px] font-bold text-feminine-dark/80 block uppercase tracking-wider">
                    Upload Referensi Gambar (Untuk Video)
                  </span>
                  <span className="text-[8px] text-feminine-dark/50 block mt-0.5">
                    Maksimal 20 item • Maks 50MB per gambar
                  </span>
                </div>

                {/* Video Reference */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); handleUploadFile(e, "video"); }}
                  onClick={() => document.getElementById("vid-upload-ref")?.click()}
                  className="border-2 border-dashed border-feminine-accent/20 rounded-2xl p-4 text-center cursor-pointer bg-feminine-bg/40 hover:bg-feminine-rose/30 transition-all duration-300 shadow-sm relative group"
                >
                  <input
                    id="vid-upload-ref"
                    type="file"
                    multiple
                    accept=".mp4,.mov,.webm,.avi"
                    onChange={(e) => handleUploadFile(e, "video")}
                    className="hidden"
                  />
                  <FileVideo className="w-6 h-6 text-feminine-accent mx-auto mb-1.5 opacity-70 group-hover:scale-110 transition-transform duration-300" />
                  <span className="text-[10px] font-bold text-feminine-dark/80 block uppercase tracking-wider">
                    Upload Referensi Video ASli
                  </span>
                  <span className="text-[8px] text-feminine-dark/50 block mt-0.5">
                    MP4, MOV, WEBM, AVI (Max 10 file • Maks 500MB per video)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RESULTS RIGHT DISPLAY COLUMN */}
        <div className="lg:col-span-7 space-y-8">
          {/* Render List of References inside results view or next to it for gorgeous bento-grid feel */}
          <div className="space-y-6">
            {/* Image References Section */}
            {imageReferences.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center pl-1">
                  <span className="text-xs font-bold text-feminine-dark/75 uppercase tracking-widest flex items-center gap-1.5">
                    <FileImage className="w-4 h-4 text-feminine-accent" />
                    <span>REFERENSI GAMBAR AKTIF ({imageReferences.length}/20)</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {imageReferences.map((ref) => (
                    <div
                      key={ref.id}
                      className="bg-white rounded-2xl p-4 border border-white/60 shadow-[4px_4px_10px_rgba(223,204,208,0.45),-4px_-4px_10px_#ffffff] hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                    >
                      <div className="flex gap-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden border border-feminine-dark/5 bg-feminine-bg relative flex-shrink-0">
                          <img
                            src={ref.publicUrl}
                            alt={ref.fileName}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <p className="text-xs font-bold text-feminine-dark truncate leading-tight" title={ref.fileName}>
                              {ref.fileName}
                            </p>
                            <p className="text-[9px] text-feminine-dark/45 font-mono mt-0.5">
                              {(ref.fileSize / (1024 * 1024)).toFixed(2)} MB • {ref.resolution || "1024x1024"}
                            </p>
                          </div>
                          <span className="text-[8px] font-bold text-feminine-accent bg-feminine-rose/40 px-2 py-0.5 rounded-full w-max">
                            {ref.providerTarget}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 border-t border-feminine-dark/5 mt-3 pt-2.5 justify-end">
                        <button
                          type="button"
                          onClick={() => setActivePreview({ url: ref.publicUrl, title: ref.fileName, type: "image" })}
                          className="h-7 px-2.5 rounded-lg bg-feminine-bg text-[10px] font-bold text-feminine-dark hover:text-white hover:bg-feminine-accent transition-all duration-200 flex items-center gap-1 cursor-pointer border border-white"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Preview</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReference("image", ref.id)}
                          className="h-7 px-2.5 rounded-lg bg-red-50 text-[10px] font-bold text-red-600 hover:text-white hover:bg-red-500 transition-all duration-200 flex items-center gap-1 cursor-pointer border border-red-100"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video References Section */}
            {activeSegment === "video" && videoReferences.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center pl-1">
                  <span className="text-xs font-bold text-feminine-dark/75 uppercase tracking-widest flex items-center gap-1.5">
                    <FileVideo className="w-4 h-4 text-feminine-accent" />
                    <span>REFERENSI VIDEO AKTIF ({videoReferences.length}/10)</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {videoReferences.map((ref) => (
                    <div
                      key={ref.id}
                      className="bg-white rounded-2xl p-4 border border-white/60 shadow-[4px_4px_10px_rgba(223,204,208,0.45),-4px_-4px_10px_#ffffff] hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                    >
                      <div className="flex gap-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden border border-feminine-dark/5 bg-black relative flex-shrink-0">
                          <video
                            src={ref.publicUrl}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            loop
                            autoPlay
                          />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <p className="text-xs font-bold text-feminine-dark truncate leading-tight" title={ref.fileName}>
                              {ref.fileName}
                            </p>
                            <p className="text-[9px] text-feminine-dark/45 font-mono mt-0.5">
                              {(ref.fileSize / (1024 * 1024)).toFixed(2)} MB • {ref.resolution || "1920x1080"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[8px] font-bold text-feminine-accent bg-feminine-rose/40 px-2 py-0.5 rounded-full">
                              {ref.providerTarget}
                            </span>
                            {ref.duration !== undefined && (
                              <span className="text-[8px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {Number(ref.duration).toFixed(1)}s
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 border-t border-feminine-dark/5 mt-3 pt-2.5 justify-end">
                        <button
                          type="button"
                          onClick={() => setActivePreview({ url: ref.publicUrl, title: ref.fileName, type: "video" })}
                          className="h-7 px-2.5 rounded-lg bg-feminine-bg text-[10px] font-bold text-feminine-dark hover:text-white hover:bg-feminine-accent transition-all duration-200 flex items-center gap-1 cursor-pointer border border-white"
                        >
                          <Play className="w-3 h-3" />
                          <span>Preview</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReference("video", ref.id)}
                          className="h-7 px-2.5 rounded-lg bg-red-50 text-[10px] font-bold text-red-600 hover:text-white hover:bg-red-500 transition-all duration-200 flex items-center gap-1 cursor-pointer border border-red-100"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-b border-feminine-dark/5 my-2" />

          {/* GENERATOR DISPLAYER CONTAINER */}
          <div>
            {activeSegment === "image" ? (
              generatedImgResult ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-[2rem_1.5rem_2.5rem_1.5rem] p-6 lg:p-8 border border-white/60 neu-panel-emboss relative space-y-4 shadow"
                >
                  <div className="border-b border-feminine-dark/5 pb-3">
                    <span className="px-2 py-0.5 bg-feminine-rose text-feminine-accent border border-white rounded font-bold text-[9px] uppercase tracking-wider">
                      {generatedImgResult.engine} ENGINE
                    </span>
                    <h4 className="text-sm font-bold text-feminine-dark uppercase tracking-wider mt-1.5 leading-tight">
                      Sistem Berhasil Mengolah Gambar Melalui API
                    </h4>
                    <p className="text-[10px] text-feminine-dark/40 font-mono mt-0.5">ID: {generatedImgResult.id}</p>
                  </div>

                  {/* High quality image display */}
                  <div className="w-full h-80 rounded-2xl overflow-hidden shadow-inner border border-feminine-dark/5 relative bg-feminine-bg group">
                    <img
                      src={generatedImgResult.imageUrl}
                      alt="Generated artwork output"
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-5">
                      <p className="text-[10px] font-bold text-feminine-accent uppercase tracking-widest pl-1 leading-none mb-1">Prompt Masukan:</p>
                      <p className="text-xs font-semibold text-white/95 leading-relaxed truncate">{generatedImgResult.prompt}</p>
                    </div>
                  </div>

                  {/* Aesthetic parameter analysis */}
                  <div className="p-4 rounded-xl bg-feminine-bg text-xs border border-feminine-dark/5 leading-relaxed font-sans text-feminine-dark">
                    <strong className="text-feminine-accent block text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 animate-spin-slow" />
                      <span>Identitas Estetika Hasil (Analisis Gemini):</span>
                    </strong>
                    {generatedImgResult.aestheticDetails}
                  </div>
                </motion.div>
              ) : (
                <div className="bg-feminine-bg/50 border-2 border-dashed border-feminine-dark/10 rounded-[2rem_1.5rem_2.5rem_1.5rem] p-12 text-center h-[350px] flex flex-col items-center justify-center">
                  <Image className="w-12 h-12 text-feminine-dark/20 animate-pulse mb-3" />
                  <p className="text-sm font-semibold text-feminine-dark/60">
                    Ready to design artwork with {selectedEngine}.
                  </p>
                  <p className="text-xs text-feminine-dark/45 mt-1 max-w-sm mx-auto leading-relaxed">
                    Isi formulir prompt pengiriman, tambahkan file referensi gambar yang diinginkan, lalu luncurkan rendering. Pembuatan gambar nyata akan memotong saldo sebesar <strong className="text-red-500">-15 kredit</strong>.
                  </p>
                </div>
              )
            ) : (
              // VIDEO SECTION RESULT
              generatedVidResult ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-[2rem_1.5rem_2.5rem_1.5rem] p-6 lg:p-8 border border-white/60 neu-panel-emboss relative space-y-4 shadow"
                >
                  <div className="border-b border-feminine-dark/5 pb-3">
                    <span className="px-2 py-0.5 bg-feminine-rose text-feminine-accent border border-white rounded font-bold text-[9px] uppercase tracking-wider">
                      {generatedVidResult.engine} CINEMATIC
                    </span>
                    <h4 className="text-sm font-bold text-feminine-dark uppercase tracking-wider mt-1.5 leading-tight">
                      Sistem Berhasil Mengolah Cuplikan Video Studio
                    </h4>
                    <p className="text-[10px] text-feminine-dark/40 font-mono mt-0.5">ID: {generatedVidResult.id}</p>
                  </div>

                  {/* video loop rendering */}
                  <div className="w-full h-80 rounded-2xl overflow-hidden shadow-inner border border-feminine-dark/5 relative bg-feminine-bg">
                    <video
                      src={generatedVidResult.videoUrl}
                      controls
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4 py-1 px-2.5 bg-black/60 text-white rounded text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm shadow">
                      <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                      <span>REAL-TIME VIDEO STREAM</span>
                    </div>
                  </div>

                  {/* Video movement and cinematic analysis */}
                  <div className="p-4 rounded-xl bg-feminine-bg text-xs border border-feminine-dark/5 leading-relaxed font-sans text-feminine-dark">
                    <strong className="text-feminine-accent block text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 animate-spin-slow" />
                      <span>Dinamika Gerakan & Kamera (Analisis Gemini):</span>
                    </strong>
                    {generatedVidResult.cinematicDetails}
                  </div>
                </motion.div>
              ) : (
                <div className="bg-feminine-bg/50 border-2 border-dashed border-feminine-dark/10 rounded-[2rem_1.5rem_2.5rem_1.5rem] p-12 text-center h-[350px] flex flex-col items-center justify-center">
                  <Film className="w-12 h-12 text-feminine-dark/20 animate-pulse mb-3" />
                  <p className="text-sm font-semibold text-feminine-dark/60">
                    Ready to render cinematics with {selectedEngine}.
                  </p>
                  <p className="text-xs text-feminine-dark/45 mt-1 max-w-sm mx-auto leading-relaxed">
                    Kombinasikan prompt, gambar referensi, dan video referensi Anda. Proses rendering video rill dari provider terpilih akan memotong saldo sebesar <strong className="text-red-500">-30 kredit</strong>.
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* LIGHTBOX MODAL PREVIEW */}
      <AnimatePresence>
        {activePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-4"
          >
            <button
              onClick={() => setActivePreview(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer shadow-lg"
              title="Close Preview"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="max-w-4xl w-full flex flex-col items-center space-y-4">
              <h3 className="text-base font-bold text-white tracking-wide truncate max-w-lg text-center">
                {activePreview.title}
              </h3>
              
              <div className="w-full h-[65vh] bg-neutral-950/40 rounded-3xl overflow-hidden border border-white/10 flex items-center justify-center relative shadow-2xl">
                {activePreview.type === "image" ? (
                  <img
                    src={activePreview.url}
                    alt={activePreview.title}
                    className="max-w-full max-h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <video
                    src={activePreview.url}
                    controls
                    autoPlay
                    loop
                    className="max-w-full max-h-full object-contain"
                  />
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setActivePreview(null)}
                  className="px-6 py-2 rounded-xl bg-white text-feminine-accent font-semibold text-xs border border-white hover:bg-neutral-100 transition shadow cursor-pointer uppercase tracking-wider"
                >
                  Selesai Menonton
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
