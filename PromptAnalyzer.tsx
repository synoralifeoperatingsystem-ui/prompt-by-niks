import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileImage, Video, Link, Sparkles, Download, Copy, Trash2, Compass, 
  ChevronDown, ChevronUp, Check, X, Edit3, Plus, Save, FileText, Upload, 
  Settings, Languages, HelpCircle, Activity, LayoutGrid, Play, Pause, 
  Volume2, VolumeX, Maximize, RefreshCw, FileQuestion, Monitor, Clock, 
  Film, Smartphone, Database
} from "lucide-react";
import { jsPDF } from "jspdf";

interface PromptAnalyzerProps {
  userId: string;
  userCredits: number;
  onRefreshCredits: () => void;
}

const MODES = [
  "Basic", "Advanced", "Professional", "Expert", "Cinema", 
  "Commercial", "Luxury", "Social Media", "Hollywood"
];

const ENGINES = [
  { name: "Midjourney", type: "image" },
  { name: "DALL-E", type: "image" },
  { name: "Imagen", type: "image" },
  { name: "FLUX", type: "image" },
  { name: "Ideogram", type: "image" },
  { name: "Leonardo AI", type: "image" },
  { name: "Firefly", type: "image" },
  { name: "Stable Diffusion", type: "image" },
  { name: "Runway", type: "video" },
  { name: "Sora", type: "video" },
  { name: "Veo", type: "video" },
  { name: "Kling", type: "video" },
  { name: "Seedance", type: "video" },
  { name: "Wan", type: "video" },
  { name: "PixVerse", type: "video" },
  { name: "Luma", type: "video" },
  { name: "Pika", type: "video" }
];

export default function PromptAnalyzer({ userId, userCredits, onRefreshCredits }: PromptAnalyzerProps) {
  const [activeTab, setActiveTab] = useState<"image" | "video" | "url">("image");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // File inputs
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoDesc, setVideoDesc] = useState("");
  const [inputUrl, setInputUrl] = useState("");

  // Professional Video Upload & Analysis states
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [videoMeta, setVideoMeta] = useState<{
    name: string;
    size: number;
    sizeStr: string;
    duration?: number;
    resolution?: string;
    fps?: number;
    codec?: string;
    date: string;
  } | null>(null);

  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "waiting" | "uploading" | "success" | "analyzing" | "complete" | "failed"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState("");
  const [remaining, setRemaining] = useState("");
  const [videoUploadId, setVideoUploadId] = useState<string | null>(null);
  const [remoteVideoUrl, setRemoteVideoUrl] = useState<string | null>(null);
  const [adminLimitMB, setAdminLimitMB] = useState(100);

  // Custom Video Player Controls state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerProgress, setPlayerProgress] = useState(0);
  const [playerVolume, setPlayerVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Debug Panel States
  const [debugRawOutput, setDebugRawOutput] = useState<string>("");
  const [debugParsed, setDebugParsed] = useState<any | null>(null);
  const [debugSaved, setDebugSaved] = useState<any | null>(null);
  const [debugActiveTab, setDebugActiveTab] = useState<"raw" | "parsed" | "saved" | "rendered">("rendered");
  const [geminiSent, setGeminiSent] = useState<boolean>(false);
  const [geminiReceived, setGeminiReceived] = useState<boolean>(false);

  // Analysis result
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [savingParameters, setSavingParameters] = useState(false);

  // Tree interactive state
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [editingField, setEditingField] = useState<{ cat: string; key: string; val: string } | null>(null);
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");

  // Generation Panel states
  const [promptMode, setPromptMode] = useState("Professional");
  const [targetEngine, setTargetEngine] = useState("Midjourney");
  const [targetLength, setTargetLength] = useState(2000);
  const [targetLang, setTargetLang] = useState<"id" | "en">("en");
  
  const [masterPromptResult, setMasterPromptResult] = useState<string | null>(null);
  const [generatingMasterPrompt, setGeneratingMasterPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  // Upload templates state
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchHistory();
    // Load admin limit MB configurations
    fetch("/api/admin/api-settings")
      .then(r => r.json())
      .then(data => {
        if (data.settings?.videoSizeLimitMB) {
          setAdminLimitMB(Number(data.settings.videoSizeLimitMB));
        }
      })
      .catch(e => console.error("Error loading limit settings:", e));
  }, [userId]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/user/prompt-analyzer/history/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleImageChange = (file: File) => {
    const validExtensions = ["jpg", "jpeg", "png", "webp"];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !validExtensions.includes(ext)) {
      setError("Hanya bisa mengunggah berkas gambar (JPG, JPEG, PNG, WEBP).");
      return;
    }
    setError(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVideoChange = (file: File) => {
    const allowedExts = ["mp4", "mov", "avi", "mkv", "webm", "m4v", "mpeg", "3gp"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedExts.includes(ext)) {
      setError(`Format berkas video tidak didukung. Sila gunakan format: ${allowedExts.join(", ").toUpperCase()}`);
      return;
    }

    if (file.size > adminLimitMB * 1024 * 1024) {
      setError(`Ukuran berkas melebihi batas maksimum admin (${adminLimitMB} MB).`);
      return;
    }

    setError(null);
    setVideoFile(file);
    setUploadStatus("waiting");
    setProgress(0);
    setSpeed("");
    setRemaining("");

    const objUrl = URL.createObjectURL(file);
    setVideoPreview(objUrl);

    // Extraction
    const tempVideo = document.createElement("video");
    tempVideo.preload = "metadata";
    tempVideo.src = objUrl;
    tempVideo.muted = true;
    tempVideo.playsInline = true;

    const dateStr = file.lastModified 
      ? new Date(file.lastModified).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });

    tempVideo.onloadedmetadata = () => {
      const duration = tempVideo.duration || 0;
      const width = tempVideo.videoWidth || 0;
      const height = tempVideo.videoHeight || 0;
      const resolution = width && height ? `${width}x${height}` : "Tidak Terdeteksi";
      
      const fileMeta = {
        name: file.name,
        size: file.size,
        sizeStr: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        duration: Math.round(duration),
        resolution,
        fps: 30,
        codec: ext === "webm" ? "VP9 / Vorbis" : ext === "mp4" ? "H.264 / AAC (Standard)" : "Codec Standard (" + ext.toUpperCase() + ")",
        date: dateStr
      };
      setVideoMeta(fileMeta);
      tempVideo.currentTime = Math.min(1, duration / 2);
    };

    tempVideo.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = tempVideo.videoWidth || 320;
        canvas.height = tempVideo.videoHeight || 180;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
          const thumbUrl = canvas.toDataURL("image/jpeg");
          setVideoThumbnail(thumbUrl);
        }
      } catch (err) {
        console.warn("Unable to capture video snapshot in canvas:", err);
      }
    };
  };

  const uploadAndAnalyzeVideo = () => {
    if (!videoFile || !videoMeta) {
      setError("Silakan pilih berkas video telebih dahulu.");
      return;
    }
    
    if (userCredits < 10) {
      setError("Kredit kurang! Analisis membutuhkan 10 kredit.");
      return;
    }

    setUploadStatus("uploading");
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("userId", userId);
    if (videoMeta.duration) formData.append("duration", String(videoMeta.duration));
    if (videoMeta.resolution) formData.append("resolution", videoMeta.resolution);
    if (videoMeta.fps) formData.append("fps", String(videoMeta.fps));
    if (videoMeta.codec) formData.append("codec", videoMeta.codec);

    const xhr = new XMLHttpRequest();
    let startTime = Date.now();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setProgress(percent);

        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed > 0) {
          const speedBytesPerSec = event.loaded / elapsed;
          const speedMBPerSec = speedBytesPerSec / (1024 * 1024);
          let speedStr = "";
          if (speedMBPerSec >= 1) {
            speedStr = speedMBPerSec.toFixed(1) + " MB/s";
          } else {
            speedStr = (speedBytesPerSec / 1024).toFixed(0) + " KB/s";
          }
          setSpeed(speedStr);

          const remainingBytes = event.total - event.loaded;
          const estRemainingSec = Math.round(remainingBytes / speedBytesPerSec);
          if (estRemainingSec < 60) {
            setRemaining(estRemainingSec + " dtk tersisa");
          } else {
            setRemaining(Math.floor(estRemainingSec / 60) + " mnt tersisa");
          }
        }
      }
    };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const uploadRes = JSON.parse(xhr.responseText);
          if (uploadRes.success && uploadRes.videoUpload) {
            const vidId = uploadRes.videoUpload.id;
            setVideoUploadId(vidId);
            setRemoteVideoUrl(uploadRes.videoUpload.publicUrl);
            setUploadStatus("analyzing");
            setProgress(100);
            setGeminiSent(true);
            setGeminiReceived(false);

            // Execute real video prompt analyzer
            const analyzePayload = {
              userId,
              fileType: "video",
              videoUploadId: vidId
            };

            const res = await fetch("/api/user/prompt-analyzer/analyze", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(analyzePayload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal memproses analisis video dengan Gemini.");

            setGeminiReceived(true);
            setCurrentAnalysisId(data.analysis.id);
            setResult(data.analysis.parameters);
            setMasterPromptResult(null);

            // Populate Debug logs for Video
            setDebugRawOutput(data.rawGeminiOutput || JSON.stringify(data.analysis.parameters, null, 2));
            setDebugParsed(data.parsedGeminiParams || data.analysis.parameters);
            setDebugSaved(data.analysis.parameters);

            setUploadStatus("complete");
            
            if (data.analysis.parameters) {
              const firstKey = Object.keys(data.analysis.parameters)[0];
              if (firstKey) {
                setExpandedCategories({ [firstKey]: true });
              }
            }

            onRefreshCredits();
            fetchHistory();
          } else {
            throw new Error(uploadRes.error || "Gagal mengupload berkas.");
          }
        } catch (err: any) {
          setError(err.message);
          setUploadStatus("failed");
        } finally {
          setLoading(false);
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          setError(errData.error || "Gagal menggunggah video.");
        } catch (e) {
          setError("Gagal mengunggah berkas video ke proxy.");
        }
        setUploadStatus("failed");
        setLoading(false);
      }
    };

    xhr.onerror = () => {
      setError("Koneksi internet bermasalah, gagal mengunggah video.");
      setUploadStatus("failed");
      setLoading(false);
    };

    xhr.open("POST", "/api/user/prompt-analyzer/upload-video");
    xhr.send(formData);
  };

  // Drag and drop support
  const [isDragOver, setIsDragOver] = useState(false);

  const executeAnalysis = async () => {
    setError(null);
    if (userCredits < 10) {
      setError("Kredit kurang! Analisis membutuhkan 10 kredit.");
      return;
    }

    if (activeTab === "video") {
      uploadAndAnalyzeVideo();
      return;
    }

    setLoading(true);
    setGeminiSent(true);
    setGeminiReceived(false);
    try {
      let bodyData: any = {
        userId,
        fileType: activeTab,
      };

      if (activeTab === "image") {
        if (!imagePreview) {
          throw new Error("Silakan pilih atau seret gambar terlebih dahulu.");
        }
        bodyData.fileData = imagePreview;
        bodyData.fileName = imageFile?.name || "foto_unggahan.png";
      } else {
        if (!inputUrl.trim() || !inputUrl.startsWith("http")) {
          throw new Error("Format URL situs web tidak valid. Harap gunakan format lengkap http:// atau https://");
        }
        bodyData.url = inputUrl;
        bodyData.fileName = inputUrl;
      }

      const res = await fetch("/api/user/prompt-analyzer/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kesalahan memecahkan parameter visual.");

      setGeminiReceived(true);
      setCurrentAnalysisId(data.analysis.id);
      setResult(data.analysis.parameters);
      setMasterPromptResult(null); // Clear previous output

      // Populate Debug logs in real-time
      setDebugRawOutput(data.rawGeminiOutput || JSON.stringify(data.analysis.parameters, null, 2));
      setDebugParsed(data.parsedGeminiParams || data.analysis.parameters);
      setDebugSaved(data.analysis.parameters);
      
      // Expand first category automatically
      if (data.analysis.parameters) {
        const firstKey = Object.keys(data.analysis.parameters)[0];
        if (firstKey) {
          setExpandedCategories({ [firstKey]: true });
        }
      }

      onRefreshCredits();
      fetchHistory();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setImageFile(null);
    setImagePreview(null);
    setVideoDesc("");
    setInputUrl("");
    setResult(null);
    setCurrentAnalysisId(null);
    setMasterPromptResult(null);
    setError(null);
    setVideoFile(null);
    setVideoPreview(null);
    setVideoThumbnail(null);
    setVideoMeta(null);
    setUploadStatus("idle");
    setProgress(0);
    setSpeed("");
    setRemaining("");
    setVideoUploadId(null);
    setRemoteVideoUrl(null);
  };

  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Apakah Anda yakin ingin menghapus kartu riwayat ini dari database?")) return;
    try {
      const res = await fetch(`/api/user/prompt-analyzer/delete/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchHistory();
        if (currentAnalysisId === id) {
          setResult(null);
          setCurrentAnalysisId(null);
          setMasterPromptResult(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle single field parameter ON/OFF
  const handleToggleField = (catCode: string, fieldKey: string) => {
    if (!result) return;
    const cloned = JSON.parse(JSON.stringify(result));
    if (cloned[catCode]?.fields[fieldKey]) {
      cloned[catCode].fields[fieldKey].enabled = !cloned[catCode].fields[fieldKey].enabled;
      setResult(cloned);
    }
  };

  // Edit inline field value
  const handleStartEdit = (catCode: string, fieldKey: string, currentVal: string) => {
    setEditingField({ cat: catCode, key: fieldKey, val: currentVal });
  };

  const handleSaveEdit = () => {
    if (!result || !editingField) return;
    const cloned = JSON.parse(JSON.stringify(result));
    if (cloned[editingField.cat]?.fields[editingField.key]) {
      cloned[editingField.cat].fields[editingField.key].value = editingField.val;
      // Mark as enabled automatically if edited
      cloned[editingField.cat].fields[editingField.key].enabled = true;
      setResult(cloned);
    }
    setEditingField(null);
  };

  // Add custom parameter
  const handleAddCustomField = (catCode: string) => {
    if (!result || !newFieldName.trim() || !newFieldValue.trim()) return;
    const cloned = JSON.parse(JSON.stringify(result));
    if (cloned[catCode]) {
      cloned[catCode].fields[newFieldName.trim()] = {
        value: newFieldValue.trim(),
        enabled: true
      };
      setResult(cloned);
    }
    setAddingToCategory(null);
    setNewFieldName("");
    setNewFieldValue("");
  };

  // Delete parameter field
  const handleDeleteField = (catCode: string, fieldKey: string) => {
    if (!result) return;
    if (!confirm(`Hapus parameter "${fieldKey}" dari lembar kerja Anda?`)) return;
    const cloned = JSON.parse(JSON.stringify(result));
    if (cloned[catCode]?.fields[fieldKey]) {
      delete cloned[catCode].fields[fieldKey];
      setResult(cloned);
    }
  };

  // Save changes explicitly to Supabase / JSON persistence
  const saveParametersToDatabase = async () => {
    if (!currentAnalysisId || !result) return;
    setSavingParameters(true);
    try {
      const res = await fetch("/api/user/prompt-analyzer/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: currentAnalysisId,
          parameters: result
        })
      });
      if (res.ok) {
        alert("Lembar parameter berhasil disimpan secara permanen ke Database Supabase!");
        fetchHistory();
      } else {
        const d = await res.json();
        alert(`Gagal menyimpan: ${d.error}`);
      }
    } catch (e: any) {
      alert(`Kesalahan menyimpan: ${e.message}`);
    } finally {
      setSavingParameters(false);
    }
  };

  // Export parameter checklist to a JSON file
  const exportTemplateAsJSON = () => {
    if (!result) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `Niks-Template-Parameters-${Date.now()}.json`);
    dlAnchorElem.click();
  };

  // Import parameters from JSON file
  const handleImportJSONClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        // Basic schema verification
        const keys = Object.keys(parsed);
        if (keys.length > 0 && parsed[keys[0]].title && parsed[keys[0]].fields) {
          setResult(parsed);
          setCurrentAnalysisId(`import-${Date.now()}`); // pseudo session id
          setDebugRawOutput(JSON.stringify(parsed, null, 2));
          setDebugParsed(parsed);
          setDebugSaved(parsed);
          alert("Selamat! Templat preset parameter Anda berhasil diimpor ke lembar kerja.");
        } else {
          alert("Format file templat tidak didukung. Verifikasi struktur JSON parameter Niks.");
        }
      } catch (err) {
        alert("Gagal membaca file JSON: " + err);
      }
    };
    reader.readAsText(file);
  };

  // Generate Master Prompt using ALL ENABLED fields
  const triggerMasterPromptGeneration = async () => {
    if (!result) return;
    setGeneratingMasterPrompt(true);
    setPromptError(null);
    setMasterPromptResult(null);

    try {
      // Gather only enabled parameters
      const enabledParams: Record<string, string> = {};
      Object.entries(result).forEach(([_, group]: any) => {
        Object.entries(group.fields).forEach(([fieldName, fieldMeta]: any) => {
          if (fieldMeta.enabled && fieldMeta.value && fieldMeta.value !== "Tidak Terdeteksi" && fieldMeta.value !== "None") {
            enabledParams[fieldName] = fieldMeta.value;
          }
        });
      });

      if (Object.keys(enabledParams).length === 0) {
        throw new Error("Pilih setidaknya 1 parameter penting dengan mencentangnya sebelum memicu Master Prompt.");
      }

      if (userCredits < 5) {
        throw new Error("Kredit tidak mencukupi untuk membuat Master Prompt. Butuh 5 kredit.");
      }

      const compositeInput = {
        baseConcept: `Optimasi visual multimodal pro untuk ${targetEngine}.`,
        promptMode,
        targetEngine,
        enabledChecklist: enabledParams
      };

      const res = await fetch("/api/user/master-prompt/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title: `Optimasi Real-time: ${targetEngine} [Mode: ${promptMode}]`,
          engine: targetEngine,
          maxLength: targetLength,
          language: targetLang,
          inputParameters: compositeInput
        })
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Gagal membangun formulasi prompt.");

      setMasterPromptResult(d.masterPrompt.generatedPrompt);
      onRefreshCredits();
    } catch (e: any) {
      setPromptError(e.message);
    } finally {
      setGeneratingMasterPrompt(false);
    }
  };

  // Copy elements to clipboard
  const copyPromptText = () => {
    if (!masterPromptResult) return;
    navigator.clipboard.writeText(masterPromptResult);
    alert("Master Prompt berhasil disalin ke Clipboard!");
  };

  // EXPORT MASTER PROMPT TO WORD/PDF
  const exportPDFPrompt = () => {
    if (!masterPromptResult) return;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(225, 119, 137);
    doc.text("PROMPT BY NIKS - OPTIMIZED MASTER PROMPT", 15, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 48, 50);
    doc.text(`Target Engine: ${targetEngine} (${targetRangeLabel()})`, 15, 27);
    doc.text(`Metode: ${promptMode} | Bahasa: ${targetLang === 'id' ? 'Indonesia' : 'Inggris'}`, 15, 32);
    doc.text(`Waktu: ${new Date().toLocaleString("id-ID")}`, 15, 37);
    doc.line(15, 41, 195, 41);

    doc.setFont("helvetica", "bold");
    doc.text("HASIL KREASI MASTER PROMPT:", 15, 50);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(masterPromptResult, 180);
    doc.text(splitText, 15, 57);

    doc.save(`Niks-MasterPrompt-${Date.now()}.pdf`);
  };

  const exportWordPrompt = () => {
    if (!masterPromptResult) return;
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
          <p>Created by Prompt Analyzer Engine V3</p>
        </div>
        <p class="engine">Target Engine: ${targetEngine} | Mode: ${promptMode} | Bahasa: ${targetLang.toUpperCase()}</p>
        <div class="prompt-body">
          ${masterPromptResult.replace(/\n/g, "<br/>")}
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

  const targetRangeLabel = () => {
    if (targetLength === 1000) return "Basic (1K Chars)";
    if (targetLength === 2000) return "Medium (2K Chars)";
    if (targetLength === 3000) return "Detailed (3K Chars)";
    if (targetLength === 5000) return "Expressive (5K Chars)";
    return "Ultra Depth (10K Chars)";
  };

  const toggleCategory = (catCode: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catCode]: !prev[catCode]
    }));
  };

  const toggleAllCategories = (expand: boolean) => {
    if (!result) return;
    const state: Record<string, boolean> = {};
    Object.keys(result).forEach(k => {
      state[k] = expand;
    });
    setExpandedCategories(state);
  };

  return (
    <div className="space-y-8 animate-fade-in" id="prompt_analyzer_module">
      {/* Tab bar header designed with tactile 4D neumorphism */}
      <div className="flex bg-feminine-bg p-2 rounded-2xl shadow-inner border border-feminine-dark/5 w-full md:max-w-md mx-auto">
        <button
          onClick={() => { setActiveTab("image"); handleClear(); }}
          className={`flex-1 py-3 text-xs md:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${
            activeTab === "image"
              ? "bg-white text-feminine-accent shadow-md border border-white"
              : "text-feminine-dark/60 hover:text-feminine-dark"
          }`}
        >
          <FileImage className="w-4 h-4" />
          <span>FOTO ENGINE</span>
        </button>
        <button
          onClick={() => { setActiveTab("video"); handleClear(); }}
          className={`flex-1 py-3 text-xs md:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${
            activeTab === "video"
              ? "bg-white text-feminine-accent shadow-md border border-white"
              : "text-feminine-dark/60 hover:text-feminine-dark"
          }`}
        >
          <Video className="w-4 h-4" />
          <span>VIDEO ENGINE</span>
        </button>
        <button
          onClick={() => { setActiveTab("url"); handleClear(); }}
          className={`flex-1 py-3 text-xs md:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${
            activeTab === "url"
              ? "bg-white text-feminine-accent shadow-md border border-white"
              : "text-feminine-dark/60 hover:text-feminine-dark"
          }`}
        >
          <Link className="w-4 h-4" />
          <span>URL TRACKER</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT WORKSPACE CARD */}
        <div className="lg:col-span-4 bg-white rounded-[2rem_1.5rem_2.5rem_1.5rem] p-6 lg:p-8 border border-white/60 neu-panel-emboss relative">
          <div className="absolute top-4 right-4 bg-feminine-rose px-3 py-1 rounded-full text-[10px] font-bold text-feminine-accent tracking-wider border border-white uppercase shadow-sm">
            Biaya: 10 Kredit
          </div>

          <h3 className="text-lg font-bold text-feminine-dark mb-5 flex items-center gap-2">
            <Compass className="w-5 h-5 text-feminine-accent animate-spin-slow" />
            <span>Konteks Input</span>
          </h3>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs px-3.5 py-2.5 rounded-xl mb-4 border border-red-100 font-medium leading-relaxed">
              ⚠️ {error}
            </div>
          )}

          {/* TAB CONTENT: IMAGE UPLOAD */}
          {activeTab === "image" && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleImageChange(e.dataTransfer.files[0]);
                  }
                }}
                className={`w-full h-56 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                  isDragOver 
                    ? "border-feminine-accent bg-feminine-rose/30 scale-95" 
                    : "border-feminine-dark/15 bg-feminine-bg hover:border-feminine-accent"
                }`}
                onClick={() => document.getElementById("img_upload_input")?.click()}
              >
                {imagePreview ? (
                  <div className="relative w-full h-full p-2">
                    <img
                      src={imagePreview}
                      alt="Pratinjau draf"
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <div className="absolute bottom-4 left-4 right-4 bg-black/60 text-white py-1.5 px-3 rounded-md text-[10px] text-center backdrop-blur-sm">
                      Ketuk atau Seret lagi untuk mengganti foto
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <div className="w-12 h-12 bg-white rounded-full neu-btn-white-emboss border border-white flex items-center justify-center text-feminine-accent mx-auto mb-3">
                      <FileImage className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-feminine-dark">
                      Seret & Lepas Foto Anda di Sini
                    </p>
                    <p className="text-xs text-feminine-dark/50 mt-1">
                      PNG, JPG, JPEG, atau WEBP
                    </p>
                  </div>
                )}
                <input
                  id="img_upload_input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImageChange(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB CONTENT: VIDEO SPECIFICATION */}
          {activeTab === "video" && (
            <div className="space-y-6">
              {!videoFile ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleVideoChange(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`w-full h-64 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                    isDragOver 
                      ? "border-feminine-accent bg-feminine-rose/30 scale-95" 
                      : "border-feminine-dark/15 bg-feminine-bg hover:border-feminine-accent"
                  }`}
                  onClick={() => document.getElementById("vid_upload_input")?.click()}
                >
                  <div className="text-center p-6">
                    <div className="w-14 h-14 bg-white rounded-full neu-btn-white-emboss border border-white flex items-center justify-center text-feminine-accent mx-auto mb-4 animate-pulse">
                      <Video className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-bold text-feminine-dark">
                      Seret & Lepas Video Anda di Sini
                    </p>
                    <p className="text-xs text-feminine-dark/50 mt-1 mb-4">
                      Mendukung MP4, MOV, AVI, MKV, WEBM, M4V, MPEG, 3GP
                    </p>
                    <button
                      type="button"
                      className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-feminine-accent hover:bg-feminine-accent-hover shadow-md active:scale-95 transition-all"
                    >
                      Pilih Video
                    </button>
                    <p className="text-[10px] text-feminine-dark/40 mt-3 font-semibold">
                      Batas ukuran maksimal: {adminLimitMB} MB
                    </p>
                  </div>
                  <input
                    id="vid_upload_input"
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleVideoChange(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-5 animate-fade-in">
                  {/* Real-time Video Player Preview */}
                  <div className="relative rounded-2xl overflow-hidden border border-feminine-dark/10 shadow-lg bg-feminine-dark/5 aspect-video w-full">
                    {videoPreview && (
                      <video
                        ref={videoRef}
                        src={videoPreview}
                        controls
                        className="w-full h-full object-contain bg-black"
                        preload="auto"
                      />
                    )}
                  </div>

                  {/* Video Metadata Panel */}
                  <div className="bg-feminine-bg p-4 rounded-2xl border border-feminine-dark/5 shadow-inner">
                    <div className="flex items-start gap-4">
                      {videoThumbnail ? (
                        <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-white shadow flex-shrink-0">
                          <img
                            src={videoThumbnail}
                            alt="Video Frame Thumbnail"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-16 bg-feminine-dark/10 rounded-lg flex items-center justify-center text-feminine-dark/30 flex-shrink-0">
                          <Film className="w-5 h-5 animate-spin-slow" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-feminine-dark truncate" title={videoMeta?.name}>
                          {videoMeta?.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold bg-white text-feminine-accent px-2 py-0.5 rounded-full border border-feminine-accent/15">
                            {videoMeta?.sizeStr}
                          </span>
                          <span className="text-[10px] text-feminine-dark/50 font-medium">
                            {videoMeta?.date}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-feminine-dark/10 text-left">
                      <div className="flex items-center gap-2 bg-white/70 p-2 rounded-xl border border-white">
                        <Clock className="w-3.5 h-3.5 text-feminine-accent flex-shrink-0" />
                        <div>
                          <p className="text-[9px] text-feminine-dark/40 font-bold uppercase">Durasi Video</p>
                          <p className="text-[11px] text-feminine-dark font-extrabold">{videoMeta?.duration || 0} detik</p>
                        </div>
                      </div>
                      <div className="flex-center gap-2 bg-white/70 p-2 rounded-xl border border-white flex items-center">
                        <Monitor className="w-3.5 h-3.5 text-feminine-accent flex-shrink-0" />
                        <div>
                          <p className="text-[9px] text-feminine-dark/40 font-bold uppercase">Resolusi</p>
                          <p className="text-[11px] text-feminine-dark font-extrabold">{videoMeta?.resolution}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-white/70 p-2 rounded-xl border border-white">
                        <Activity className="w-3.5 h-3.5 text-feminine-accent flex-shrink-0" />
                        <div>
                          <p className="text-[9px] text-feminine-dark/40 font-bold uppercase">FPS / Kecepatan</p>
                          <p className="text-[11px] text-feminine-dark font-extrabold">{videoMeta?.fps} fps</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-white/70 p-2 rounded-xl border border-white">
                        <Smartphone className="w-3.5 h-3.5 text-feminine-accent flex-shrink-0" />
                        <div>
                          <p className="text-[9px] text-feminine-dark/40 font-bold uppercase">Format Codec</p>
                          <p className="text-[11px] text-feminine-dark font-extrabold truncate max-w-[100px]" title={videoMeta?.codec}>
                            {videoMeta?.codec}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status, Upload Speed, Progress Bar Tracker */}
                  {uploadStatus !== "idle" && (
                    <div className="bg-white p-4 rounded-2xl border border-feminine-dark/5 shadow-sm space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-feminine-dark flex items-center gap-2">
                          {uploadStatus === "waiting" && (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                              <span className="text-blue-600">Waiting Upload...</span>
                            </>
                          )}
                          {uploadStatus === "uploading" && (
                            <>
                              <Upload className="w-3.5 h-3.5 text-feminine-accent animate-bounce" />
                              <span className="text-feminine-accent font-extrabold">Mengunggah: {progress}%</span>
                            </>
                          )}
                          {uploadStatus === "analyzing" && (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-spin" />
                              <span className="text-purple-600 font-extrabold">Analyzing with Gemini API...</span>
                            </>
                          )}
                          {uploadStatus === "complete" && (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-600 font-extrabold">Analysis Complete!</span>
                            </>
                          )}
                          {uploadStatus === "failed" && (
                            <>
                              <X className="w-3.5 h-3.5 text-red-500" />
                              <span className="text-red-600 font-extrabold">Analysis Failed!</span>
                            </>
                          )}
                        </span>
                        
                        {/* Speed and Time indicators during live uploads */}
                        {uploadStatus === "uploading" && (
                          <span className="text-[10px] text-feminine-dark/40 font-mono font-bold flex gap-2">
                            <span>{speed}</span>
                            <span>|</span>
                            <span>{remaining}</span>
                          </span>
                        )}
                        {uploadStatus === "analyzing" && (
                          <span className="text-[10px] text-purple-500 font-bold animate-pulse">
                            Memindai frame video temporal...
                          </span>
                        )}
                      </div>

                      <div className="w-full bg-feminine-dark/5 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            uploadStatus === "failed" 
                              ? "bg-red-500" 
                              : uploadStatus === "complete" 
                              ? "bg-emerald-500" 
                              : uploadStatus === "analyzing"
                              ? "bg-purple-500 animate-pulse width-full"
                              : "bg-feminine-accent"
                          }`}
                          style={{ width: `${uploadStatus === "analyzing" || uploadStatus === "complete" ? 100 : progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setVideoFile(null);
                        setVideoPreview(null);
                        setVideoThumbnail(null);
                        setVideoMeta(null);
                        setUploadStatus("idle");
                        setProgress(0);
                        setSpeed("");
                        setRemaining("");
                      }}
                      className="px-4 py-2 text-xs font-bold bg-white text-feminine-accent border border-feminine-accent/10 rounded-xl hover:bg-feminine-rose/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      Ganti Video
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: URL TRACKER */}
          {activeTab === "url" && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-feminine-dark/70 uppercase pl-1 tracking-wider">
                Alamat URL Situs Web Estetis
              </label>
              <input
                type="url"
                required
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://id.pinterest.com atau web referensi..."
                className="w-full h-12 px-4 rounded-xl text-sm bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-[inset_3px_3px_6px_#dfccd0,inset_-3px_-3px_6px_#ffffff] focus:outline-none focus:ring-1 focus:ring-feminine-accent/40"
              />
              <p className="text-[10px] text-feminine-dark/50 leading-relaxed px-1">
                Kecerdasan AI akan melacak seluruh struktur tipografi, palette warna, density grid, hingga nuansa layout estetika URL tersebut.
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleClear}
              type="button"
              className="px-4 h-12 rounded-xl text-sm font-semibold border border-feminine-accent/30 text-feminine-accent select-none bg-white hover:bg-feminine-rose/20 active:scale-[0.98] transition-all"
            >
              Reset
            </button>
            <button
              onClick={executeAnalysis}
              disabled={loading}
              className="flex-1 h-12 rounded-xl text-sm font-semibold text-white bg-feminine-accent hover:bg-feminine-accent-hover select-none neu-btn-rose-emboss cursor-pointer flex items-center justify-center gap-2 transform transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4 animate-spin-slow" />
              <span>{loading ? "Menganalisis..." : "Urai Parameter"}</span>
            </button>
          </div>

          {/* HISTORY SHEETS SECTION */}
          {history.length > 0 && (
            <div className="mt-8 pt-6 border-t border-feminine-dark/5 space-y-3">
              <h4 className="text-xs font-bold text-feminine-dark/60 uppercase tracking-widest pl-1 flex items-center justify-between">
                <span>Riwayat Lembar Kerja</span>
                <Activity className="w-3.5 h-3.5 text-feminine-accent" />
              </h4>
              <div className="max-h-60 overflow-y-auto pr-1 space-y-2">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setResult(item.parameters);
                      setCurrentAnalysisId(item.id);
                      setMasterPromptResult(null);
                      
                      // Populate debugger panels with historic parameters
                      setDebugRawOutput(JSON.stringify(item.parameters, null, 2));
                      setDebugParsed(item.parameters);
                      setDebugSaved(item.parameters);
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left relative group flex justify-between items-center ${
                      currentAnalysisId === item.id 
                        ? "bg-feminine-rose border-feminine-accent shadow-sm" 
                        : "bg-feminine-bg/50 hover:bg-feminine-rose/20 border-white"
                    }`}
                  >
                    <div className="pr-2 truncate flex-1">
                      <p className="text-xs font-bold text-feminine-dark truncate">
                        {item.fileName || "analyzer_session"}
                      </p>
                      <p className="text-[9px] text-feminine-dark/40 font-mono mt-0.5 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 bg-white border border-feminine-accent/20 rounded text-[8px] font-bold text-feminine-accent text-center uppercase">
                        {item.fileType === "image" ? "FOTO" : item.fileType === "video" ? "VIDEO" : "URL"}
                      </span>
                      <button
                        onClick={(e) => handleDeleteHistory(item.id, e)}
                        className="p-1 text-feminine-dark/30 hover:text-red-500 rounded-md hover:bg-white active:scale-90 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT ANALYSIS VIEWPORT & MASTER PROMPT BUILDER */}
        <div className="lg:col-span-8 space-y-8">
          {result ? (
            <div className="space-y-6">
              {/* PRIMARY RESULTS DASHBOARD */}
              <div className="bg-white rounded-[2rem_1.5rem_2.5rem_1.5rem] p-6 lg:p-8 border border-white/60 neu-panel-emboss">
                
                {/* Dashboard Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-feminine-dark/5 pb-4 mb-5">
                  <div>
                    <h4 className="text-md font-bold text-feminine-accent uppercase tracking-wider flex items-center gap-2">
                      <LayoutGrid className="w-5 h-5" />
                      <span>Ratusan Parameter Terstruktur</span>
                    </h4>
                    <p className="text-xs text-feminine-dark/50 mt-0.5">
                      Sesi analisis aktif: <span className="font-mono text-[11px] font-bold text-feminine-accent">{currentAnalysisId}</span>
                    </p>
                  </div>
                  
                  {/* UTILITY BUTTONS */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => toggleAllCategories(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-feminine-bg text-[10px] font-bold text-feminine-accent border border-feminine-accent/10 hover:bg-feminine-rose transition-all"
                    >
                      Buka Semua
                    </button>
                    <button
                      onClick={() => toggleAllCategories(false)}
                      className="px-2.5 py-1.5 rounded-lg bg-feminine-bg text-[10px] font-bold text-feminine-accent border border-feminine-accent/10 hover:bg-feminine-rose transition-all"
                    >
                      Tutup Semua
                    </button>
                    <button
                      onClick={exportTemplateAsJSON}
                      className="p-2 rounded-lg bg-white border border-feminine-accent/20 text-feminine-accent hover:bg-feminine-rose/30 transition-all flex items-center gap-1.5 text-xs font-semibold"
                      title="Unduh Preset Parameter JSON"
                    >
                      <Download className="w-4 h-4" />
                      <span>Ekspor</span>
                    </button>
                    <button
                      onClick={handleImportJSONClick}
                      className="p-2 rounded-lg bg-white border border-feminine-accent/20 text-feminine-accent hover:bg-feminine-rose/30 transition-all flex items-center gap-1.5 text-xs font-semibold"
                      title="Impor Preset Parameter JSON"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Impor</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImportFileChange}
                      accept=".json"
                      className="hidden"
                    />
                    
                    {/* PERSIST TO DATABASE TRIGGER */}
                    <button
                      onClick={saveParametersToDatabase}
                      disabled={savingParameters}
                      className="p-2 px-3 rounded-lg bg-feminine-accent text-white font-bold text-xs flex items-center gap-1.5 shadow hover:bg-feminine-accent-hover active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingParameters ? "Menyimpan DB..." : "Simpan DB"}</span>
                    </button>
                  </div>
                </div>

                {/* EDITING DIALOG / INLINE SHEET */}
                {editingField && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="mb-5 p-4 bg-feminine-rose/40 rounded-2xl border border-feminine-accent/30 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-feminine-accent uppercase tracking-wider">
                        Ubah Nilai: {editingField.key} (Grup {editingField.cat})
                      </span>
                      <button onClick={() => setEditingField(null)} className="text-feminine-dark/40 hover:text-feminine-accent">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editingField.val}
                        onChange={(e) => setEditingField(prev => prev ? { ...prev, val: e.target.value } : null)}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-feminine-dark/10 bg-white focus:outline-none focus:ring-1 focus:ring-feminine-accent"
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                      />
                      <button onClick={handleSaveEdit} className="p-1 px-3 bg-feminine-accent hover:bg-feminine-accent-hover text-white text-xs font-bold rounded-lg flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Simpan</span>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* PARAMETERS MULTI-PANEL VIEWPORT */}
                <div className="space-y-6">
                   {/* Parameters Counter/Header widget */}
                   {(() => {
                     const isVideoResult = result && Object.keys(result).length <= 10 && !result["K"] && !result["N"];
                     
                     const countTotalParameters = () => {
                       if (!result) return 0;
                       let cnt = 0;
                       Object.values(result).forEach((cat: any) => {
                         if (cat && cat.fields) {
                           cnt += Object.keys(cat.fields).length;
                         }
                       });
                       return cnt;
                     };

                     const countActiveParameters = () => {
                       if (!result) return 0;
                       let cnt = 0;
                       Object.values(result).forEach((cat: any) => {
                         if (cat && cat.fields) {
                           cnt += Object.values(cat.fields).filter((f: any) => f.enabled).length;
                         }
                       });
                       return cnt;
                     };

                     const totParams = countTotalParameters();
                     const activeParams = countActiveParameters();

                     return (
                       <>
                         <div className="p-6 bg-feminine-rose/30 rounded-2xl border border-feminine-accent/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                           <div className="text-left">
                             <h3 className="text-sm font-extrabold text-feminine-accent uppercase tracking-widest text-left">
                               {isVideoResult ? "VIDEO PARAMETER PANEL" : "PHOTO PARAMETER PANEL"}
                             </h3>
                             <p className="text-[11px] text-feminine-dark/70 font-semibold mt-1 text-left">
                               {isVideoResult 
                                 ? `Video Parameters Found: ${totParams} | Menampilkan Seluruh Kategori Secara Nyata`
                                 : `Photo Parameters Found: ${totParams} | Menampilkan Seluruh Kategori Secara Nyata`
                               }
                             </p>
                           </div>
                           
                           <div className="flex gap-3 items-center self-start sm:self-center">
                             <div className="px-4 py-2 bg-white rounded-xl border border-feminine-accent/15 shadow-sm text-center">
                               <p className="text-[9px] font-extrabold text-feminine-dark/50 uppercase tracking-wider">Photo Parameters</p>
                               <p className="text-sm font-black text-feminine-accent mt-0.5" id="photo_param_counter">
                                 {!isVideoResult ? `${activeParams}/${totParams}` : `0/${totParams || 300}`}
                               </p>
                             </div>
                             
                             <div className="px-4 py-2 bg-white rounded-xl border border-feminine-accent/15 shadow-sm text-center">
                               <p className="text-[9px] font-extrabold text-feminine-dark/50 uppercase tracking-wider font-sans">Video Parameters</p>
                               <p className="text-sm font-black text-feminine-accent mt-0.5" id="video_param_counter">
                                 {isVideoResult ? `${activeParams}/${totParams}` : `0/${totParams || 200}`}
                               </p>
                             </div>
                           </div>
                         </div>

                         {/* Parameters Panels Grid Layout */}
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="parameters_pane_workspace">
                           {Object.entries<any>(result).map(([catCode, category]) => {
                             const fieldsCount = Object.keys(category.fields).length;
                             const activeFieldsCount = Object.values(category.fields).filter((x: any) => x.enabled).length;

                             return (
                               <div key={catCode} className="border border-feminine-accent/15 rounded-3xl bg-white shadow-sm flex flex-col justify-between" id={`panel_${catCode}`}>
                                 
                                 {/* Category Header Row */}
                                 <div className="p-4 bg-feminine-rose/10 flex items-center justify-between border-b border-feminine-accent/10 select-none">
                                   <div className="flex items-center gap-2.5">
                                     <span className="w-6 h-6 rounded-full bg-feminine-accent text-[10px] font-black text-white flex items-center justify-center border border-white shadow-sm font-mono">
                                       {catCode}
                                     </span>
                                     <span className="text-xs font-black text-feminine-dark tracking-wider uppercase text-left">
                                       {category.title}
                                     </span>
                                   </div>
                                   
                                   <span className="text-[10px] font-bold px-2 py-0.5 bg-white border border-feminine-accent/10 text-feminine-accent rounded-full whitespace-nowrap">
                                     {activeFieldsCount}/{fieldsCount} ON
                                   </span>
                                 </div>

                                 {/* Content (Render parameter fields) */}
                                 <div className="p-4 bg-white/70 space-y-2 flex-grow">
                                   <div className="grid grid-cols-1 gap-3">
                                     {Object.entries<any>(category.fields).map(([fieldName, fieldMeta]) => (
                                       <div 
                                         key={fieldName}
                                         className={`p-3 rounded-xl border flex items-start gap-2.5 transition-all relative group ${
                                           fieldMeta.enabled 
                                             ? "bg-white border-feminine-accent/20 shadow-sm" 
                                             : "bg-feminine-bg/40 border-transparent opacity-60"
                                         }`}
                                       >
                                         {/* Checkbox selector */}
                                         <input
                                           type="checkbox"
                                           checked={fieldMeta.enabled}
                                           onChange={() => handleToggleField(catCode, fieldName)}
                                           className="mt-1 accent-feminine-accent w-4.5 h-4.5 rounded border-feminine-dark/15 focus:ring-feminine-accent/30 cursor-pointer"
                                         />

                                         {/* Name & value details */}
                                         <div className="flex-1 min-w-0 text-left">
                                           <p className="text-[10px] font-bold text-feminine-accent uppercase tracking-wider truncate">
                                             {fieldName}
                                           </p>
                                           <p className="text-xs font-semibold text-feminine-dark mt-0.5 break-words">
                                             {fieldMeta.value}
                                           </p>
                                         </div>

                                         {/* Hover Action Sheet */}
                                         <div className="absolute right-2 top-2 bg-white/95 backdrop-blur-sm rounded-lg border border-feminine-accent/10 flex items-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity gap-0.5 p-0.5">
                                           <button
                                             onClick={() => handleStartEdit(catCode, fieldName, fieldMeta.value)}
                                             className="p-1 text-feminine-accent hover:bg-feminine-rose rounded-md"
                                             title="Edit Nilai"
                                           >
                                             <Edit3 className="w-3.5 h-3.5" />
                                           </button>
                                           <button
                                             onClick={() => handleDeleteField(catCode, fieldName)}
                                             className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                                             title="Hapus Parameter"
                                           >
                                             <Trash2 className="w-3.5 h-3.5" />
                                           </button>
                                         </div>
                                       </div>
                                     ))}
                                   </div>

                                   {/* inline form to dynamic add fields */}
                                   {addingToCategory === catCode ? (
                                     <div className="p-3 bg-feminine-rose/10 rounded-xl border border-dashed border-feminine-accent/20 mt-3 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-left">
                                       <div className="sm:col-span-5">
                                         <input
                                           type="text"
                                           placeholder="Nama Parameter"
                                           value={newFieldName}
                                           onChange={(e) => setNewFieldName(e.target.value)}
                                           className="w-full px-2.5 py-1.5 text-[11px] rounded-lg border border-feminine-dark/10 bg-white"
                                         />
                                       </div>
                                       <div className="sm:col-span-5">
                                         <input
                                           type="text"
                                           placeholder="Nilai Atribut"
                                           value={newFieldValue}
                                           onChange={(e) => setNewFieldValue(e.target.value)}
                                           className="w-full px-2.5 py-1.5 text-[11px] rounded-lg border border-feminine-dark/10 bg-white"
                                         />
                                       </div>
                                       <div className="sm:col-span-2 flex gap-1 justify-end">
                                         <button
                                           onClick={() => handleAddCustomField(catCode)}
                                           className="p-1.5 bg-feminine-accent hover:bg-feminine-accent-hover text-white rounded-lg flex items-center justify-center w-8 h-8"
                                           title="OK"
                                         >
                                           <Check className="w-4 h-4" />
                                         </button>
                                         <button
                                           onClick={() => setAddingToCategory(null)}
                                           className="p-1.5 bg-white border border-feminine-dark/10 text-feminine-dark/60 rounded-lg hover:border-feminine-accent w-8 h-8 flex items-center justify-center"
                                           title="Batal"
                                         >
                                           <X className="w-4 h-4" />
                                         </button>
                                       </div>
                                     </div>
                                   ) : (
                                     <button
                                       onClick={() => setAddingToCategory(catCode)}
                                       className="w-full mt-4 py-2.5 rounded-xl border border-dashed border-feminine-accent/30 text-[10px] font-black text-feminine-accent bg-white/50 flex items-center justify-center gap-1.5 hover:bg-feminine-rose/25 hover:border-feminine-accent transition-all"
                                     >
                                       <Plus className="w-3.5 h-3.5" />
                                       <span>TAMBAH KOORDINAT KUSTOM GRUP {catCode}</span>
                                     </button>
                                   )}
                                 </div>
                               </div>
                             );
                           })}
                         </div>

                         {/* TELEMETRY DEBUG PANEL */}
                         <div className="bg-feminine-dark text-white rounded-3xl p-6 border border-white/10 space-y-4 shadow-xl mt-8">
                           {/* SCORECARDS HUD */}
                           {(() => {
                             const countActiveParamsForDebug = (params: any) => {
                               if (!params) return 0;
                               let count = 0;
                               Object.values(params).forEach((cat: any) => {
                                 if (cat && cat.fields) {
                                   Object.values(cat.fields).forEach((f: any) => {
                                     if (f && f.enabled) count++;
                                   });
                                 } else if (cat && typeof cat === "object") {
                                   Object.values(cat).forEach((v: any) => {
                                     const lowerV = String(v).toLowerCase();
                                     if (v && 
                                         v !== "tidak terdeteksi" && 
                                         v !== "tidak_terdeteksi" && 
                                         v !== "tidak berlaku" && 
                                         v !== "tidak_berlaku" && 
                                         v !== "none" && 
                                         v !== "not detected" && 
                                         !lowerV.includes("analisis rill") && 
                                         !lowerV.includes("placeholder")
                                     ) {
                                        count++;
                                     }
                                   });
                                 }
                               });
                               return count;
                             };

                             const parsedCount = countActiveParamsForDebug(debugParsed);
                             const savedCount = countActiveParamsForDebug(debugSaved);
                             const renderedCount = countActiveParamsForDebug(result);
                             const isVideoVal = result && Object.keys(result).length <= 10 && !result["K"] && !result["N"];
                             const totalExpected = isVideoVal ? 77 : 177;

                             return (
                               <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                                 <div className="bg-zinc-950/80 border border-white/5 rounded-xl p-2.5 text-left">
                                   <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block mb-1">Gemini Action</span>
                                   <span className={`text-[10px] font-black uppercase ${geminiSent ? "text-emerald-400 animate-pulse" : "text-zinc-500"}`}>
                                     {geminiSent ? "SENT 🟢" : "PENDING 🕒"}
                                   </span>
                                 </div>
                                 <div className="bg-zinc-950/80 border border-white/5 rounded-xl p-2.5 text-left">
                                   <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block mb-1">Response State</span>
                                   <span className={`text-[10px] font-black uppercase ${geminiReceived ? "text-emerald-400" : "text-zinc-500"}`}>
                                     {geminiReceived ? "RECEIVED ✅" : "WAITING 🕒"}
                                   </span>
                                 </div>
                                 <div className="bg-zinc-950/80 border border-white/5 rounded-xl p-2.5 text-left">
                                   <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block mb-1">Parsed count</span>
                                   <span className="text-[10px] font-black text-indigo-300 font-mono block">
                                     {parsedCount} / {totalExpected}
                                   </span>
                                 </div>
                                 <div className="bg-zinc-950/80 border border-white/5 rounded-xl p-2.5 text-left">
                                   <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block mb-1">Saved count</span>
                                   <span className="text-[10px] font-black text-pink-300 font-mono block">
                                     {savedCount} / {totalExpected}
                                   </span>
                                 </div>
                                 <div className="bg-zinc-950/80 border border-white/5 rounded-xl p-2.5 text-left">
                                   <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block mb-1">Rendered count</span>
                                   <span className="text-[10px] font-black text-amber-400 font-mono block">
                                     {renderedCount} / {totalExpected}
                                   </span>
                                 </div>
                               </div>
                             );
                           })()}
                           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
                             <div className="text-left">
                               <h4 className="text-xs font-black uppercase tracking-wider text-feminine-rose flex items-center gap-1.5 text-left">
                                 <Database className="w-4 h-4 text-feminine-rose animate-pulse" />
                                 <span>Sistem Telemetri Debug API Gemini</span>
                               </h4>
                               <p className="text-[10px] text-zinc-400 mt-1 text-left">
                                 Sinkronisasi data multi-level secara nyata (AI Studio Standard Telemetry).
                               </p>
                             </div>
                             <div className="flex bg-zinc-900 p-1 rounded-xl border border-white/5 gap-1 select-none overflow-x-auto w-full sm:w-auto">
                               <button 
                                 type="button"
                                 onClick={() => setDebugActiveTab("raw")}
                                 className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase transition-all whitespace-nowrap ${debugActiveTab === "raw" ? "bg-feminine-accent text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
                               >
                                 Gemini Raw Output
                               </button>
                               <button 
                                 type="button"
                                 onClick={() => setDebugActiveTab("parsed")}
                                 className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase transition-all whitespace-nowrap ${debugActiveTab === "parsed" ? "bg-feminine-accent text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
                               >
                                 Parameter Parsed
                               </button>
                               <button 
                                 type="button"
                                 onClick={() => setDebugActiveTab("saved")}
                                 className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase transition-all whitespace-nowrap ${debugActiveTab === "saved" ? "bg-feminine-accent text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
                               >
                                 Parameter Saved
                               </button>
                               <button 
                                 type="button"
                                 onClick={() => setDebugActiveTab("rendered")}
                                 className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase transition-all whitespace-nowrap ${debugActiveTab === "rendered" ? "bg-feminine-accent text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
                               >
                                 Parameter Rendered
                               </button>
                             </div>
                           </div>

                           <div className="bg-zinc-950 rounded-2xl border border-white/5 p-4 font-mono text-[11px] max-h-80 overflow-y-auto relative text-left">
                             <div className="absolute right-3 top-3 px-2 py-0.5 bg-zinc-900 border border-white/10 rounded text-[8px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                               JSON Telemetry Logs
                             </div>
                             {debugActiveTab === "raw" && (
                               <pre className="text-teal-400 whitespace-pre-wrap leading-normal break-all font-mono">
                                 {debugRawOutput || "// Belum ada analisis pemicu dalam sesi ini."}
                               </pre>
                             )}
                             {debugActiveTab === "parsed" && (
                               <pre className="text-indigo-300 whitespace-pre-wrap leading-normal font-mono">
                                 {debugParsed ? JSON.stringify(debugParsed, null, 2) : "// Data parsing belum tersedia."}
                               </pre>
                             )}
                             {debugActiveTab === "saved" && (
                               <pre className="text-pink-300 whitespace-pre-wrap leading-normal font-mono">
                                 {debugSaved ? JSON.stringify(debugSaved, null, 2) : "// Belum disimpan di Database JSON lokal."}
                               </pre>
                             )}
                             {debugActiveTab === "rendered" && (
                               <pre className="text-amber-300 whitespace-pre-wrap leading-normal font-mono">
                                 {result ? JSON.stringify(result, null, 2) : "// Belum aman untuk dirender."}
                               </pre>
                             )}
                           </div>
                         </div>
                       </>
                     );
                   })()}
                </div>

              </div>

              {/* MASTER PROMPT GENERATOR SECTION (TARGET ENGINE ADAPTATIONS) */}
              <div className="bg-white rounded-[2rem_1.5rem_2.5rem_1.5rem] p-6 lg:p-8 border border-white/60 neu-panel-emboss space-y-6">
                <div>
                  <h4 className="text-md font-bold text-feminine-dark uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-feminine-accent" />
                    <span>Real-time Master Prompt Engine</span>
                  </h4>
                  <p className="text-xs text-feminine-dark/50 mt-0.5">
                    Rakit ratusan parameter terpilih menjadi format prompt masterpiece yang adaptif dengan provider target Anda.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Prompt Output Mode */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-feminine-dark/65 uppercase tracking-widest pl-1">
                      Mode Output
                    </label>
                    <select
                      value={promptMode}
                      onChange={(e) => setPromptMode(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl text-xs font-semibold bg-feminine-bg text-feminine-dark border border-feminine-dark/5 focus:outline-none focus:ring-1 focus:ring-feminine-accent/40"
                    >
                      {MODES.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Target Engine Provider Adaptation */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-feminine-dark/65 uppercase tracking-widest pl-1">
                      Adaptasi Target Provider
                    </label>
                    <select
                      value={targetEngine}
                      onChange={(e) => setTargetEngine(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl text-xs font-semibold bg-feminine-bg text-feminine-dark border border-feminine-dark/5 focus:outline-none focus:ring-1 focus:ring-feminine-accent/40"
                    >
                      {ENGINES.map((engObj) => (
                        <option key={engObj.name} value={engObj.name}>
                          {engObj.name} ({engObj.type.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Length Target Chars */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-feminine-dark/65 uppercase tracking-widest pl-1">
                      Target Panjang Karakter
                    </label>
                    <select
                      value={targetLength}
                      onChange={(e) => setTargetLength(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl text-xs font-semibold bg-feminine-bg text-feminine-dark border border-feminine-dark/5 focus:outline-none focus:ring-1 focus:ring-feminine-accent/40"
                    >
                      <option value={1000}>1,000 Chars (Basic)</option>
                      <option value={2000}>2,000 Chars (Detail)</option>
                      <option value={3000}>3,000 Chars (Professional)</option>
                      <option value={5000}>5,000 Chars (Epic Studio)</option>
                      <option value={10000}>10,000 Chars (Super Cinema Depth)</option>
                    </select>
                  </div>

                  {/* Prompt Output Language */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-feminine-dark/65 uppercase tracking-widest pl-1">
                      Bahasa Formulasi
                    </label>
                    <div className="flex bg-feminine-bg p-1 rounded-xl h-10">
                      <button
                        type="button"
                        onClick={() => setTargetLang("en")}
                        className={`flex-1 text-[10px] font-bold rounded-lg transition-all ${
                          targetLang === "en" 
                            ? "bg-white text-feminine-accent shadow-sm" 
                            : "text-feminine-dark/50"
                        }`}
                      >
                        EN (Inggris)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetLang("id")}
                        className={`flex-1 text-[10px] font-bold rounded-lg transition-all ${
                          targetLang === "id" 
                            ? "bg-white text-feminine-accent shadow-sm" 
                            : "text-feminine-dark/50"
                        }`}
                      >
                        ID (Indo)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={triggerMasterPromptGeneration}
                    disabled={generatingMasterPrompt}
                    className="w-full h-12 bg-gradient-to-r from-feminine-accent to-pink-500 hover:brightness-105 active:scale-[0.99] text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow shadow-feminine-accent/35 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 animate-bounce" />
                    <span>{generatingMasterPrompt ? "Membentuk Master Prompt..." : "Picu Generasi Ulang Master Prompt"}</span>
                  </button>
                </div>

                {promptError && (
                  <div className="bg-red-50 text-red-600 text-xs px-3.5 py-2.5 rounded-xl border border-red-100 font-medium">
                    ⚠️ {promptError}
                  </div>
                )}

                {/* HIGHLIGHTED MASTER PROMPT OUTPUT ROW */}
                {masterPromptResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-5 rounded-2xl bg-gradient-to-br from-feminine-bg to-feminine-rose/20 border border-white shadow-inner space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-feminine-accent/15 pb-2">
                      <span className="text-xs font-extrabold text-feminine-accent flex items-center gap-1.5 tracking-wider uppercase">
                        <FileText className="w-4 h-4" />
                        <span>Formulasi Master Prompt ({targetEngine})</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={copyPromptText}
                          className="p-1 px-2.5 bg-white border border-feminine-accent/10 rounded-lg text-[10px] font-bold text-feminine-accent hover:bg-feminine-rose shadow-sm flex items-center gap-1 transition-all active:scale-95"
                          title="Salin Prompt"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin</span>
                        </button>
                        <button
                          onClick={exportPDFPrompt}
                          className="p-1 px-2 bg-white border border-feminine-accent/10 rounded-lg text-[10px] font-bold text-feminine-accent hover:bg-feminine-rose shadow-sm flex items-center gap-1 transition-all active:scale-95"
                          title="Ekspor PDF"
                        >
                          <span>PDF</span>
                        </button>
                        <button
                          onClick={exportWordPrompt}
                          className="p-1 px-2 bg-white border border-feminine-accent/10 rounded-lg text-[10px] font-bold text-feminine-accent hover:bg-feminine-rose shadow-sm flex items-center gap-1 transition-all active:scale-95"
                          title="Ekspor DOCX"
                        >
                          <span>DOCX</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/70 border border-white text-xs font-semibold text-feminine-dark leading-relaxed font-mono whitespace-pre-wrap select-all">
                      {masterPromptResult}
                    </div>

                    <div className="flex justify-between items-center text-[9px] text-feminine-dark/40 font-mono">
                      <span>Karakter Generated: {masterPromptResult.length}</span>
                      <span>Ready for Clipboard and Render</span>
                    </div>
                  </motion.div>
                )}

              </div>
            </div>
          ) : (
            <div className="bg-feminine-bg/40 border-2 border-dashed border-feminine-dark/15 rounded-[2rem_1.5rem_2.5rem_1.5rem] p-12 text-center h-[450px] flex flex-col items-center justify-center">
              <Compass className="w-14 h-14 text-feminine-dark/20 animate-spin-slow mb-4" />
              <p className="text-base font-extrabold text-feminine-dark/70">
                Picu Analisis Gemini API Nyata
              </p>
              <p className="text-xs text-feminine-dark/45 mt-2 max-w-sm mx-auto leading-relaxed">
                Pilih tab model di sebelah kiri, unggah visual, isikan deskripsi, atau sertakan link URL, lalu urai lembar parameter tercanggih dengan ratusan sub-faktor real-time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
