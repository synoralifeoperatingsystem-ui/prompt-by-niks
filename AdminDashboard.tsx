import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Database, ShieldAlert, ShieldCheck, Key, Settings, Ticket, RefreshCw, Layers, Terminal, AlertTriangle, Play, HelpCircle, Check, Copy, PlusCircle, Save, Search, Activity, Edit, Trash, Video, Eye, EyeOff, User, Upload, Sparkles } from "lucide-react";

interface AdminDashboardProps {
  onRefreshRunningText: () => void;
  userSession?: any;
}

export default function AdminDashboard({ onRefreshRunningText, userSession }: AdminDashboardProps) {
  const [activeMenu, setActiveMenu] = useState<"monitor" | "sandbox" | "tokens" | "running-text" | "sql-deploy" | "video" | "settings" | "profile">("monitor");
  const [loading, setLoading] = useState(false);
  const [monitorData, setMonitorData] = useState<any | null>(null);

  // My Profile Admin States
  const [profFullName, setProfFullName] = useState("");
  const [profAppName, setProfAppName] = useState("");
  const [profBrandName, setProfBrandName] = useState("");
  const [profDesignedBy, setProfDesignedBy] = useState("");
  const [profEmail, setProfEmail] = useState("");
  const [profWhatsapp, setProfWhatsapp] = useState("");
  const [profWebsite, setProfWebsite] = useState("");
  const [profBio, setProfBio] = useState("");
  const [profPhoto, setProfPhoto] = useState("");
  const [profCompanyLogo, setProfCompanyLogo] = useState("");
  const [profCompleted, setProfCompleted] = useState(false);
  const [profCreatedAt, setProfCreatedAt] = useState("");
  const [uploadingProfLogo, setUploadingProfLogo] = useState(false);
  const [uploadingProfPhoto, setUploadingProfPhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Eye/reveal states for global API credentials
  const [revealGemini, setRevealGemini] = useState(false);
  const [revealSupabaseAnon, setRevealSupabaseAnon] = useState(false);
  const [revealSupabaseService, setRevealSupabaseService] = useState(false);

  // Connection test states
  const [geminiTestStatus, setGeminiTestStatus] = useState<{ loading: boolean; success?: boolean; msg?: string }>({ loading: false });
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<{ loading: boolean; success?: boolean; msg?: string }>({ loading: false });

  // Video limit controls
  const [videoSizeLimit, setVideoSizeLimit] = useState<number>(100);
  const [customLimitVal, setCustomLimitVal] = useState<string>("100");
  const [selectedVideoLog, setSelectedVideoLog] = useState<any | null>(null);
  const [savingVideoLimit, setSavingVideoLimit] = useState(false);

  // Sandbox States
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [supabaseServiceRoleKey, setSupabaseServiceRoleKey] = useState("");
  
  // Custom API integration endpoints
  const [midjourneyKey, setMidjourneyKey] = useState("");
  const [stabilityKey, setStabilityKey] = useState("");

  const [testResults, setTestResults] = useState<{ [key: string]: { loading: boolean; success?: boolean; msg?: string } }>({});

  // Token States
  const [tokenCredits, setTokenCredits] = useState(100);
  const [tokenQty, setTokenQty] = useState(1);
  const [tokenPrefix, setTokenPrefix] = useState("NIKS");
  const [newlyGeneratedTokens, setNewlyGeneratedTokens] = useState<string[]>([]);

  // Running text State
  const [annText, setAnnText] = useState("");
  const [submittingAnn, setSubmittingAnn] = useState(false);

  // SQL schema State
  const [sqlSchema, setSqlSchema] = useState("");
  const [dbStatus, setDbStatus] = useState<any | null>(null);
  const [dbStatusLoading, setDbStatusLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationLogs, setMigrationLogs] = useState<any[]>([]);
  const [rlsAudit, setRlsAudit] = useState<any | null>(null);
  const [auditingRls, setAuditingRls] = useState(false);
  const [enforcingRls, setEnforcingRls] = useState(false);

  // AI Global Providers dynamic states
  const [providers, setProviders] = useState<any[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providerMonitor, setProviderMonitor] = useState<any>({
    total: 0,
    online: 0,
    offline: 0,
    errorCount: 0,
    usageHarian: 0,
    usageBulanan: 0,
    totalSuccess: 0,
    totalFailed: 0
  });
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [editorMode, setEditorMode] = useState<"create" | "edit" | null>(null);
  const [editorData, setEditorData] = useState<any>({
    provider_name: "",
    provider_category: "IMAGE GENERATOR",
    api_endpoint: "",
    api_key: "",
    model_name: "",
    region: "",
    status: "active",
    version: "",
    organization_id: "",
    project_id: "",
    webhook_url: "",
    callback_url: "",
    custom_header: "",
    custom_parameter: ""
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchProviders = async () => {
    setProvidersLoading(true);
    try {
      const res = await fetch("/api/admin/providers");
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProvidersLoading(false);
    }
  };

  const fetchProviderMonitor = async () => {
    try {
      const res = await fetch("/api/admin/providers/monitoring");
      if (res.ok) {
        const data = await res.json();
        setProviderMonitor(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editorMode === "create" ? "/api/admin/providers" : `/api/admin/providers/${selectedProvider.id}`;
      const method = editorMode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editorData)
      });

      if (res.ok) {
        alert(editorMode === "create" ? "Provider berhasil ditambahkan!" : "Konfigurasi provider berhasil diperbarui!");
        setEditorMode(null);
        setSelectedProvider(null);
        fetchProviders();
        fetchProviderMonitor();
      } else {
        const data = await res.json();
        alert(data.error || "Gagal menyimpan konfigurasi.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus provider ini secara permanen?")) return;
    try {
      const res = await fetch(`/api/admin/providers/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        alert("Provider berhasil dihapus!");
        setSelectedProvider(null);
        fetchProviders();
        fetchProviderMonitor();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`/api/admin/providers/${id}/test-connection`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Hasil Uji Koneksi ${data.provider.provider_name}: ${data.provider.connection_status}\nResponse delay: ${data.provider.response_time}ms`);
        fetchProviders();
        fetchProviderMonitor();
        if (selectedProvider && selectedProvider.id === id) {
          setSelectedProvider(data.provider);
        }
      } else {
        alert("Gagal melakukan tes koneksi.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTestingId(null);
    }
  };

  const handleToggleProvider = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/providers/${id}/toggle`, {
        method: "POST"
      });
      if (res.ok) {
        fetchProviders();
        fetchProviderMonitor();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdminProfileOnDashboard = async () => {
    try {
      const res = await fetch("/api/admin/profile");
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          const p = data.profile;
          setProfFullName(p.fullName || "");
          setProfAppName(p.appName || "");
          setProfBrandName(p.brandName || "");
          setProfDesignedBy(p.designedBy || "");
          setProfEmail(p.email || "");
          setProfWhatsapp(p.whatsapp || "");
          setProfWebsite(p.website || "");
          setProfBio(p.bio || "");
          setProfPhoto(p.profilePhoto || "");
          setProfCompanyLogo(p.companyLogo || "");
          setProfCompleted(p.profileCompleted || false);
          setProfCreatedAt(p.createdAt || "");
        }
      }
    } catch (e) {
      console.error("Gagal memuat profil admin:", e);
    }
  };

  const handleProfFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "photo" | "logo") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert("Berkas terlalu besar! Maksimal 50 MB.");
      return;
    }

    if (type === "logo") setUploadingProfLogo(true);
    else setUploadingProfPhoto(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/profile/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (type === "logo") setProfCompanyLogo(data.publicUrl);
        else setProfPhoto(data.publicUrl);
      } else {
        alert(data.error || "Gagal mengupload logo.");
      }
    } catch (err) {
      console.error(err);
      alert("Kesalahan koneksi saat upload.");
    } finally {
      setUploadingProfLogo(false);
      setUploadingProfPhoto(false);
    }
  };

  const handleSaveProfileForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profFullName) return alert("Nama Lengkap wajib diisi.");
    if (!profEmail) return alert("Email Admin wajib diisi.");

    setSavingProfile(true);
    try {
      const res = await fetch("/api/admin/profile/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: profFullName,
          appName: profAppName,
          brandName: profBrandName,
          designedBy: profDesignedBy,
          email: profEmail,
          whatsapp: profWhatsapp,
          website: profWebsite,
          bio: profBio,
          profilePhoto: profPhoto,
          companyLogo: profCompanyLogo,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Profil Administrator berhasil disimpan!");
        fetchAdminProfileOnDashboard();
        onRefreshRunningText(); // Force parent App.tsx update
      } else {
        alert(data.error || "Gagal menyimpan profil.");
      }
    } catch (err) {
      console.error(err);
      alert("Kesalahan jaringan.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResetProfileForm = async () => {
    if (!confirm("Apakah Anda yakin ingin mereset profil admin kembali ke setelan awal?")) return;
    try {
      const res = await fetch("/api/admin/profile/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userSession?.user?.id || ""
        }
      });
      if (res.ok) {
        alert("Profil berhasil direset!");
        fetchAdminProfileOnDashboard();
        onRefreshRunningText();
      } else {
        alert("Gagal mereset profil.");
      }
    } catch (err) {
      console.error(err);
      alert("Kesalahan jaringan.");
    }
  };

  useEffect(() => {
    fetchMonitorData();
    fetchApiSettings();
    fetchSqlSchema();
    fetchDbSchemaStatus();
    fetchProviders();
    fetchProviderMonitor();
    fetchAdminProfileOnDashboard();
  }, []);

  const fetchMonitorData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/live-monitor");
      if (res.ok) {
        const data = await res.json();
        setMonitorData(data);
        setAnnText(data.announcementText || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchApiSettings = async () => {
    try {
      const res = await fetch("/api/admin/api-settings");
      if (res.ok) {
        const data = await res.json();
        const s = data.settings;
        setGeminiApiKey(s.geminiApiKey || "");
        setSupabaseUrl(s.supabaseUrl || "");
        setSupabaseAnonKey(s.supabaseAnonKey || "");
        setSupabaseServiceRoleKey(s.supabaseServiceRoleKey || "");
        setMidjourneyKey(s.midjourneyKey || "");
        setStabilityKey(s.stabilityKey || "");
        if (s.videoSizeLimitMB) {
          setVideoSizeLimit(Number(s.videoSizeLimitMB));
          setCustomLimitVal(String(s.videoSizeLimitMB));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestGemini = async () => {
    setGeminiTestStatus({ loading: true, msg: "" });
    try {
      const res = await fetch("/api/admin/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "gemini",
          payload: { geminiApiKey }
        })
      });
      if (res.ok) {
        const data = await res.json();
        setGeminiTestStatus({
          loading: false,
          success: data.success,
          msg: data.message
        });
      } else {
        setGeminiTestStatus({
          loading: false,
          success: false,
          msg: "Gagal berkomunikasi dengan server pengujian."
        });
      }
    } catch (e: any) {
      setGeminiTestStatus({
        loading: false,
        success: false,
        msg: `Kesalahan: ${e.message}`
      });
    }
  };

  const handleTestSupabase = async () => {
    setSupabaseTestStatus({ loading: true, msg: "" });
    try {
      const res = await fetch("/api/admin/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "supabase",
          payload: {
            url: supabaseUrl,
            anonKey: supabaseAnonKey || supabaseServiceRoleKey
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSupabaseTestStatus({
          loading: false,
          success: data.success,
          msg: data.message
        });
      } else {
        setSupabaseTestStatus({
          loading: false,
          success: false,
          msg: "Gagal berkomunikasi dengan server pengujian."
        });
      }
    } catch (e: any) {
      setSupabaseTestStatus({
        loading: false,
        success: false,
        msg: `Kesalahan: ${e.message}`
      });
    }
  };

  const fetchSqlSchema = async () => {
    try {
      const res = await fetch("/api/admin/sql-schema");
      if (res.ok) {
        const data = await res.json();
        setSqlSchema(data.sql);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRlsAudit = async () => {
    setAuditingRls(true);
    try {
      const headers: any = {};
      if (userSession?.user?.id) {
        headers["x-user-id"] = userSession.user.id;
      }
      const res = await fetch("/api/admin/database/rls-audit", { headers });
      if (res.ok) {
        const data = await res.json();
        setRlsAudit(data);
      }
    } catch (e) {
      console.error("Gagal menarik audit RLS:", e);
    } finally {
      setAuditingRls(false);
    }
  };

  const fetchMigrationLogs = async () => {
    try {
      const headers: any = {};
      if (userSession?.user?.id) {
        headers["x-user-id"] = userSession.user.id;
      }
      const res = await fetch("/api/admin/database/migrations-log", { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.logs) {
          setMigrationLogs(data.logs);
        }
      }
    } catch (e) {
      console.error("Gagal menarik log migrasi:", e);
    }
  };

  const enforceRlsPolicies = async () => {
    setEnforcingRls(true);
    try {
      const headers: any = { "Content-Type": "application/json" };
      if (userSession?.user?.id) {
        headers["x-user-id"] = userSession.user.id;
      }
      const res = await fetch("/api/admin/database/rls-enforce", {
        method: "POST",
        headers
      });
      const data = await res.json();
      alert(data.message || (data.success ? "Row Level Security berhasil diperkeras!" : "Gagal memperkeras RLS."));
      fetchRlsAudit();
    } catch (e) {
      console.error(e);
      alert("Kesalahan jaringan saat melakukan pengerasan kebijakan RLS.");
    } finally {
      setEnforcingRls(false);
    }
  };

  const fetchDbSchemaStatus = async () => {
    setDbStatusLoading(true);
    fetchRlsAudit();
    fetchMigrationLogs();
    try {
      const headers: any = {};
      if (userSession?.user?.id) {
        headers["x-user-id"] = userSession.user.id;
      }
      const res = await fetch("/api/admin/database/status", { headers });
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (e) {
      console.error("Gagal menarik status database:", e);
    } finally {
      setDbStatusLoading(false);
    }
  };

  const applyDbMigration = async (sqlToApply: string) => {
    if (!sqlToApply) return;
    setMigrating(true);
    try {
      const headers: any = { "Content-Type": "application/json" };
      if (userSession?.user?.id) {
        headers["x-user-id"] = userSession.user.id;
      }
      const res = await fetch("/api/admin/database/apply-migrations", {
        method: "POST",
        headers,
        body: JSON.stringify({ sql: sqlToApply })
      });
      const data = await res.json();
      alert(data.message || (data.success ? "Migrasi berhasil diterapkan!" : "Gagal menerapkan migrasi."));
      fetchDbSchemaStatus();
    } catch (e) {
      console.error(e);
      alert("Kesalahan jaringan saat menerapkan migrasi.");
    } finally {
      setMigrating(false);
    }
  };

  const syncDbSchema = async () => {
    setMigrating(true);
    try {
      const headers: any = { "Content-Type": "application/json" };
      if (userSession?.user?.id) {
        headers["x-user-id"] = userSession.user.id;
      }
      const res = await fetch("/api/admin/database/sync-schema", {
        method: "POST",
        headers
      });
      const data = await res.json();
      alert(data.message || (data.success ? "Sinkronisasi skema berhasil!" : "Gagal sinkronisasi."));
      fetchDbSchemaStatus();
    } catch (e) {
      console.error(e);
      alert("Kesalahan jaringan saat mensinkronkan skema.");
    } finally {
      setMigrating(false);
    }
  };

  const saveApiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/api-settings/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            geminiApiKey,
            supabaseUrl,
            supabaseAnonKey,
            supabaseServiceRoleKey,
            midjourneyKey,
            stabilityKey,
            videoSizeLimitMB: videoSizeLimit,
          },
        }),
      });
      if (res.ok) {
        alert("Konfigurasi API Sandbox berhasil disimpan!");
        fetchApiSettings();
        fetchMonitorData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Real connection diagnostics for sandbox keys
  const testConnection = async (type: string) => {
    setTestResults((prev) => ({ ...prev, [type]: { loading: true } }));
    
    let payloadEntry: any = {};
    if (type === "gemini") {
      payloadEntry = { geminiApiKey };
    } else if (type === "supabase") {
      payloadEntry = { url: supabaseUrl, anonKey: supabaseAnonKey };
    } else {
      // midjourney stability etc
      payloadEntry = { key: type === "midjourney" ? midjourneyKey : stabilityKey };
    }

    try {
      const res = await fetch("/api/admin/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, payload: payloadEntry }),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [type]: { loading: false, success: data.success, msg: data.message },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [type]: { loading: false, success: false, msg: err.message },
      }));
    }
  };

  // Generate voucher token code
  const handleGenerateTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/tokens/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credits: tokenCredits,
          qty: tokenQty,
          customPrefix: tokenPrefix,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNewlyGeneratedTokens(data.tokens);
        fetchMonitorData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Changing announcement text
  const handleUpdateAnn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAnn(true);
    try {
      const res = await fetch("/api/admin/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: annText }),
      });
      if (res.ok) {
        alert("Running text berhasil diubah secara realtime!");
        onRefreshRunningText();
        fetchMonitorData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingAnn(false);
    }
  };

  const copySqlToClipboard = () => {
    if (!sqlSchema) return;
    navigator.clipboard.writeText(sqlSchema);
    alert("Skema PostgreSQL Supabase berhasil disalin!");
  };

  return (
    <div className="space-y-8" id="admin_dashboard_module">
      {/* Dynamic Tab Bar for Admin Modules of Gara Neumorphic Form */}
      <div className="flex flex-wrap bg-feminine-bg p-2 rounded-2xl shadow-inner border border-feminine-dark/5 gap-2 max-w-4xl mx-auto">
        <button
          onClick={() => setActiveMenu("monitor")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-300 flex-1 min-w-[120px] justify-center ${
            activeMenu === "monitor"
              ? "bg-white text-feminine-accent shadow-md border border-white"
              : "text-feminine-dark/65 hover:text-feminine-dark"
          }`}
        >
          <Database className="w-4 h-4" />
          <span>LIVE MONITOR</span>
        </button>
        <button
          onClick={() => setActiveMenu("sandbox")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-300 flex-1 min-w-[120px] justify-center ${
            activeMenu === "sandbox"
              ? "bg-white text-feminine-accent shadow-md border border-white"
              : "text-feminine-dark/65 hover:text-feminine-dark"
          }`}
        >
          <Key className="w-4 h-4" />
          <span>API SANDBOX</span>
        </button>
        <button
          onClick={() => setActiveMenu("tokens")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-300 flex-1 min-w-[120px] justify-center ${
            activeMenu === "tokens"
              ? "bg-white text-feminine-accent shadow-md border border-white"
              : "text-feminine-dark/65 hover:text-feminine-dark"
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>TOKEN KREDIT</span>
        </button>
        <button
          onClick={() => setActiveMenu("running-text")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-300 flex-1 min-w-[120px] justify-center ${
            activeMenu === "running-text"
              ? "bg-white text-feminine-accent shadow-md border border-white"
              : "text-feminine-dark/65 hover:text-feminine-dark"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>TEKS BERJALAN</span>
        </button>
        <button
          onClick={() => setActiveMenu("sql-deploy")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-300 flex-1 min-w-[120px] justify-center ${
            activeMenu === "sql-deploy"
              ? "bg-white text-feminine-accent shadow-md border border-white"
              : "text-feminine-dark/65 hover:text-feminine-dark"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>SUPABASE SQL</span>
        </button>
        <button
          onClick={() => setActiveMenu("video")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-300 flex-1 min-w-[120px] justify-center ${
            activeMenu === "video"
              ? "bg-white text-feminine-accent shadow-md border border-white"
              : "text-feminine-dark/65 hover:text-feminine-dark"
          }`}
        >
          <Video className="w-4 h-4" />
          <span>VIDEO MANAGER</span>
        </button>
        <button
          onClick={() => setActiveMenu("settings")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-300 flex-1 min-w-[120px] justify-center ${
            activeMenu === "settings"
              ? "bg-white text-feminine-accent shadow-md border border-white"
              : "text-feminine-dark/65 hover:text-feminine-dark"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>SETTINGS</span>
        </button>
        <button
          onClick={() => setActiveMenu("profile")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-300 flex-1 min-w-[120px] justify-center ${
            activeMenu === "profile"
              ? "bg-white text-feminine-accent shadow-md border border-white"
              : "text-feminine-dark/65 hover:text-feminine-dark"
          }`}
        >
          <User className="w-4 h-4" />
          <span>MY PROFILE</span>
        </button>
      </div>

      {/* ----------------------------------------------- */}
      {/* 1. MONITOR VIEW */}
      {/* ----------------------------------------------- */}
      {activeMenu === "monitor" && (
        <div className="space-y-8 animate-fadeIn">
          {/* Static metric display cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-white neu-panel-emboss relative overflow-hidden flex flex-col gap-1">
              <div className="absolute right-3 top-3 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
              <div className="text-[10px] font-bold text-feminine-dark/45 uppercase tracking-wider">User Online</div>
              <div className="text-2xl font-bold text-feminine-dark">{monitorData?.usersOnline || 1}</div>
              <div className="text-[9px] font-bold text-emerald-600">AKTIF SEKARANG</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-white neu-panel-emboss flex flex-col gap-1">
              <div className="text-[10px] font-bold text-feminine-dark/45 uppercase tracking-wider">Total User</div>
              <div className="text-2xl font-bold text-feminine-dark">{monitorData?.activeUsersCount || 0}</div>
              <div className="text-[9px] font-bold text-feminine-accent">RBAC ROLES STATUS</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-white neu-panel-emboss flex flex-col gap-1">
              <div className="text-[10px] font-bold text-feminine-dark/45 uppercase tracking-wider">Gemini API Requests</div>
              <div className="text-2xl font-bold text-feminine-dark">{monitorData?.geminiRequests || 0}</div>
              <div className="text-[9px] font-bold text-blue-500">KONEKSI NYATA 100%</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-white neu-panel-emboss flex flex-col gap-1">
              <div className="text-[10px] font-bold text-feminine-dark/45 uppercase tracking-wider">Query DB Skenario</div>
              <div className="text-2xl font-bold text-feminine-dark">{monitorData?.databaseRequests || 0}</div>
              <div className="text-[9px] font-bold text-purple-500">JSON TABLE POOL</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-white neu-panel-emboss flex flex-col gap-1">
              <div className="text-[10px] font-bold text-feminine-dark/45 uppercase tracking-wider">Token Terpakai</div>
              <div className="text-2xl font-bold text-feminine-dark">{monitorData?.tokenUsage || 0}</div>
              <div className="text-[9px] font-bold text-pink-500">AKTIVASI VOUCHER</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-white neu-panel-emboss flex flex-col gap-1">
              <div className="text-[10px] font-bold text-feminine-dark/45 uppercase tracking-wider">Total Kredit Spend</div>
              <div className="text-2xl font-bold text-feminine-dark">{monitorData?.creditUsage || 0}</div>
              <div className="text-[9px] font-bold text-orange-500">OPTIMASI KONSUMSI</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Activity Logs Console */}
            <div className="bg-white rounded-[2rem_1.5rem_2.5rem_1.5rem] p-6 lg:p-8 border border-white/60 neu-panel-emboss flex flex-col h-[400px]">
              <div className="flex justify-between items-center border-b border-feminine-dark/5 pb-3 mb-4">
                <h4 className="text-xs font-bold text-feminine-accent uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-feminine-accent" />
                  <span>Daftar Aktivitas User (Realtime)</span>
                </h4>
                <button onClick={fetchMonitorData} className="p-1 text-feminine-dark/40 hover:text-feminine-accent transform active:rotate-180 transition-all">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 font-mono text-xs">
                {monitorData?.activityLogs && monitorData.activityLogs.length > 0 ? (
                  monitorData.activityLogs.map((log: any) => (
                    <div key={log.id} className="p-2.5 rounded-lg bg-feminine-bg border border-feminine-dark/5 shadow-inner">
                      <div className="flex justify-between items-center text-[10px] text-feminine-dark/50 mb-1">
                        <span className="font-bold text-feminine-accent">@{log.username || "system"}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="font-bold text-feminine-dark">{log.action}</div>
                      <div className="text-[11px] text-feminine-dark/75 mt-0.5">{log.details || "-"}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-feminine-dark/30">Belum ada rekaman log aktivitas.</div>
                )}
              </div>
            </div>

            {/* System Logs console */}
            <div className="bg-white rounded-[2rem_1.5rem_2.5rem_1.5rem] p-6 lg:p-8 border border-white/60 neu-panel-emboss flex flex-col h-[400px]">
              <div className="flex justify-between items-center border-b border-feminine-dark/5 pb-3 mb-4">
                <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  <span>Log Keamanan & Sistem Utama</span>
                </h4>
                <div className="w-2.5 h-2.5 bg-red-400 rounded-full animate-pulse" />
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 font-mono text-xs">
                {monitorData?.systemLogs && monitorData.systemLogs.length > 0 ? (
                  monitorData.systemLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className={`p-2.5 rounded-lg border flex flex-col gap-0.5 ${
                        log.level === "error"
                          ? "bg-red-50 border-red-100 text-red-900"
                          : log.level === "warn"
                          ? "bg-amber-50 border-amber-100 text-amber-900"
                          : "bg-feminine-bg border-feminine-dark/5 text-feminine-dark"
                      }`}
                    >
                      <div className="flex justify-between items-center text-[9px] opacity-60">
                        <span className="font-bold uppercase">[{log.level}] {log.service}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-xs font-semibold leading-relaxed">{log.message}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-feminine-dark/30">Sistem berjalan dengan aman dan lancar.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------- */}
      {/* 2. SANDBOX VIEW / GLOBAL PROVIDER MANAGER */}
      {/* ----------------------------------------------- */}
      {activeMenu === "sandbox" && (
        <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
          
          {/* ----- SECTION A: DYNAMIC REALTIME MONITORING BAR ----- */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-white neu-panel-emboss flex flex-col gap-1">
              <div className="text-[10px] font-bold text-feminine-dark/45 uppercase tracking-wider">Total Provider</div>
              <div className="text-2xl font-bold text-feminine-dark">{providerMonitor.total || 0}</div>
              <div className="text-[9px] font-bold text-feminine-accent">TERINTEGRASI DI DB</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-white neu-panel-emboss flex flex-col gap-1">
              <div className="text-[10px] font-bold text-feminine-dark/45 uppercase tracking-wider font-mono text-emerald-600">● Provider Online</div>
              <div className="text-2xl font-bold text-emerald-700">{providerMonitor.online || 0}</div>
              <div className="text-[9px] font-bold text-emerald-500 font-mono">STATUS AKTIF & READY</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-white neu-panel-emboss flex flex-col gap-1">
              <div className="text-[10px] font-bold text-feminine-dark/45 uppercase tracking-wider font-mono text-rose-500">○ Provider Offline / Inactive</div>
              <div className="text-2xl font-bold text-rose-700">{providerMonitor.offline || 0}</div>
              <div className="text-[9px] font-bold text-rose-400 font-mono">MEMBUTUHKAN DIAGNOSIS</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-white neu-panel-emboss flex flex-col gap-1">
              <div className="text-[10px] font-bold text-feminine-dark/45 uppercase tracking-wider">Kinerja Error Rate</div>
              <div className="text-2xl font-bold text-orange-600">
                {providerMonitor.totalFailed || 0} <span className="text-xs text-feminine-dark/40 font-normal">Gagal</span>
              </div>
              <div className="text-[9px] font-bold text-emerald-600 font-mono">{providerMonitor.totalSuccess || 0} Berhasil</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-white/60 neu-panel-emboss flex flex-col">
              <span className="text-[9px] text-feminine-dark/50 font-bold uppercase">Estimasi Usage Harian</span>
              <span className="text-lg font-extrabold text-feminine-dark">{providerMonitor.usageHarian || 0} Hit</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-white/60 neu-panel-emboss flex flex-col">
              <span className="text-[9px] text-feminine-dark/50 font-bold uppercase">Estimasi Usage Bulanan</span>
              <span className="text-lg font-extrabold text-feminine-dark">{providerMonitor.usageBulanan || 0} Hit</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-white/60 neu-panel-emboss flex flex-col">
              <span className="text-[9px] text-feminine-dark/50 font-bold uppercase">Success Requests</span>
              <span className="text-lg font-extrabold text-emerald-600">{providerMonitor.totalSuccess || 0} OK</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-white/60 neu-panel-emboss flex flex-col">
              <span className="text-[9px] text-feminine-dark/50 font-bold uppercase">Failed Requests</span>
              <span className="text-lg font-extrabold text-rose-600">{providerMonitor.totalFailed || 0} ERR</span>
            </div>
          </div>

          {/* ----- SECTION B: EDITOR FORM (CREATE & EDIT) ----- */}
          {editorMode && (
            <div className="bg-white rounded-[2rem_1.5rem_2.5rem_1.5rem] p-6 lg:p-8 border-2 border-feminine-accent/20 neu-panel-emboss space-y-6 relative animate-fadeIn">
              <div className="flex justify-between items-center border-b border-feminine-rose/30 pb-4">
                <h3 className="text-sm font-bold text-feminine-dark uppercase tracking-wider flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-feminine-accent" />
                  <span>{editorMode === "create" ? "Tambah AI Provider Baru" : `Edit AI Provider: ${editorData.provider_name}`}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditorMode(null);
                    setSelectedProvider(null);
                  }}
                  className="px-3 py-1 text-xs font-bold text-feminine-dark/50 hover:text-rose-500 border border-feminine-dark/10 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                >
                  Batal
                </button>
              </div>

              <form onSubmit={handleSaveProvider} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-feminine-dark/70 uppercase tracking-widest mb-1.5 pl-1">
                      Kategori AI Provider
                    </label>
                    <select
                      value={editorData.provider_category}
                      onChange={(e) => setEditorData({ ...editorData, provider_category: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl text-xs bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-inner focus:outline-none font-semibold"
                    >
                      <option value="IMAGE GENERATOR">IMAGE GENERATOR</option>
                      <option value="VIDEO GENERATOR">VIDEO GENERATOR</option>
                      <option value="PROMPT GENERATOR">PROMPT GENERATOR</option>
                      <option value="LLM">LLM</option>
                      <option value="EMBEDDING">EMBEDDING</option>
                      <option value="UPSCALER">UPSCALER</option>
                      <option value="IMAGE EDITOR">IMAGE EDITOR</option>
                      <option value="VIDEO EDITOR">VIDEO EDITOR</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-feminine-dark/70 uppercase tracking-widest mb-1.5 pl-1">
                      Nama AI Provider
                    </label>
                    <input
                      type="text"
                      required
                      value={editorData.provider_name}
                      onChange={(e) => setEditorData({ ...editorData, provider_name: e.target.value })}
                      placeholder="Contoh: HuggingFace SD3, OpenAI Dall-E 3, Runaway Gen-3"
                      className="w-full h-11 px-4 rounded-xl text-xs bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-inner focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-feminine-dark/70 uppercase tracking-widest mb-1.5 pl-1">
                      API Endpoint URL
                    </label>
                    <input
                      type="url"
                      required
                      value={editorData.api_endpoint}
                      onChange={(e) => setEditorData({ ...editorData, api_endpoint: e.target.value })}
                      placeholder="https://api.yourprovider.com/v1/generate"
                      className="w-full h-11 px-4 rounded-xl text-xs bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-inner focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-feminine-dark/70 uppercase tracking-widest mb-1.5 pl-1">
                      API Authorization Key (Secret Token)
                    </label>
                    <input
                      type="password"
                      value={editorData.api_key}
                      onChange={(e) => setEditorData({ ...editorData, api_key: e.target.value })}
                      placeholder="sk-xxxxxxxxxxxxxxxx"
                      className="w-full h-11 px-4 rounded-xl text-xs bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-inner focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-feminine-dark/70 uppercase tracking-widest mb-1.5 pl-1">
                      Model Name
                    </label>
                    <input
                      type="text"
                      value={editorData.model_name}
                      onChange={(e) => setEditorData({ ...editorData, model_name: e.target.value })}
                      placeholder="dall-e-3, flux-1-dev, etc."
                      className="w-full h-11 px-4 rounded-xl text-xs bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-inner focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-feminine-dark/70 uppercase tracking-widest mb-1.5 pl-1">
                      Region / Cloud Zone
                    </label>
                    <input
                      type="text"
                      value={editorData.region}
                      onChange={(e) => setEditorData({ ...editorData, region: e.target.value })}
                      placeholder="us-central1, ap-southeast-1"
                      className="w-full h-11 px-4 rounded-xl text-xs bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-inner focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-feminine-dark/70 uppercase tracking-widest mb-1.5 pl-1">
                      Version String
                    </label>
                    <input
                      type="text"
                      value={editorData.version}
                      onChange={(e) => setEditorData({ ...editorData, version: e.target.value })}
                      placeholder="v2.1, 2026-06-15"
                      className="w-full h-11 px-4 rounded-xl text-xs bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-inner focus:outline-none"
                    />
                  </div>
                </div>

                {/* ADVANCED CATEGORY-SPECIFIC FORM BOUNDARIES */}
                <div className="bg-feminine-bg/50 p-5 rounded-2xl border border-feminine-dark/5 space-y-4 shadow-inner">
                  <h4 className="text-[10px] font-bold text-feminine-dark/80 uppercase tracking-widest border-b border-feminine-dark/5 pb-2">
                    {editorData.provider_category === "VIDEO GENERATOR" ? "🎬 VIDEO PROVIDER SANDBOX PARAMETERS" : "🎨 IMAGE PROVIDER SANDBOX PARAMETERS"}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-feminine-dark/65 uppercase tracking-wide mb-1">
                        Organization ID (Optional)
                      </label>
                      <input
                        type="text"
                        value={editorData.organization_id}
                        onChange={(e) => setEditorData({ ...editorData, organization_id: e.target.value })}
                        placeholder="org-xxxxx"
                        className="w-full h-10 px-3 rounded-lg text-xs bg-white text-feminine-dark border border-feminine-dark/5 shadow-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-feminine-dark/65 uppercase tracking-wide mb-1">
                        Project ID (Optional)
                      </label>
                      <input
                        type="text"
                        value={editorData.project_id}
                        onChange={(e) => setEditorData({ ...editorData, project_id: e.target.value })}
                        placeholder="proj-xxxxx"
                        className="w-full h-10 px-3 rounded-lg text-xs bg-white text-feminine-dark border border-feminine-dark/5 shadow-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-feminine-dark/65 uppercase tracking-wide mb-1">
                        Webhook Notification URL
                      </label>
                      <input
                        type="url"
                        value={editorData.webhook_url}
                        onChange={(e) => setEditorData({ ...editorData, webhook_url: e.target.value })}
                        placeholder="https://mywebsite.com/webhook/receive"
                        className="w-full h-10 px-3 rounded-lg text-xs bg-white text-feminine-dark border border-feminine-dark/5 shadow-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      {editorData.provider_category === "VIDEO GENERATOR" ? (
                        <>
                          <label className="block text-[9px] font-bold text-feminine-dark/65 uppercase tracking-wide mb-1">
                            Callback Completion URL
                          </label>
                          <input
                            type="url"
                            value={editorData.callback_url}
                            onChange={(e) => setEditorData({ ...editorData, callback_url: e.target.value })}
                            placeholder="https://mywebsite.com/api/video/callback"
                            className="w-full h-10 px-3 rounded-lg text-xs bg-white text-feminine-dark border border-feminine-dark/5 shadow-sm focus:outline-none"
                          />
                        </>
                      ) : (
                        <div className="opacity-40">
                          <label className="block text-[9px] font-bold text-feminine-dark/65 uppercase tracking-wide mb-1">
                            Callback URL (Hanya Video)
                          </label>
                          <input
                            type="text"
                            disabled
                            placeholder="Kategori ini tidak mendukung callback"
                            className="w-full h-10 px-3 rounded-lg text-xs bg-gray-100 text-feminine-dark/50 border border-feminine-dark/5 shadow-sm outline-none cursor-not-allowed"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[9px] font-bold text-feminine-dark/65 uppercase tracking-wide">
                          Custom Headers (JSON format)
                        </label>
                        <span className="text-[8px] opacity-60">{"{ \"X-Custom-Header\": \"Value\" }"}</span>
                      </div>
                      <textarea
                        value={editorData.custom_header}
                        onChange={(e) => setEditorData({ ...editorData, custom_header: e.target.value })}
                        placeholder='{ "X-Developer-Token": "test-token" }'
                        rows={3}
                        className="w-full p-3 rounded-lg text-xs bg-white text-feminine-dark border border-feminine-dark/10 shadow-sm focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[9px] font-bold text-feminine-dark/65 uppercase tracking-wide">
                          Custom Parameters Payload overrides (JSON format)
                        </label>
                        <span className="text-[8px] opacity-60">{"{ \"inference_steps\": 50 }"}</span>
                      </div>
                      <textarea
                        value={editorData.custom_parameter}
                        onChange={(e) => setEditorData({ ...editorData, custom_parameter: e.target.value })}
                        placeholder='{ "num_inference_steps": 30, "guidance_scale": 7.5 }'
                        rows={3}
                        className="w-full p-3 rounded-lg text-xs bg-white text-feminine-dark border border-feminine-dark/10 shadow-sm focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="flex-1 h-12 rounded-xl text-xs font-bold text-white bg-feminine-accent hover:bg-feminine-accent-hover active:bg-feminine-accent shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>Lanjutkan Simpan Konfigurasi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditorMode(null);
                      setSelectedProvider(null);
                    }}
                    className="px-6 h-12 bg-gray-100 hover:bg-gray-200 text-feminine-dark/70 font-semibold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ----- SECTION C: SEARCH, CATEGORY TABS & ADD CTAs ----- */}
          <div className="bg-white rounded-2xl p-5 border border-white/60 neu-panel-emboss flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-feminine-dark/40 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari provider berdasarkan nama atau model..."
                  className="w-full h-10 pl-10 pr-4 rounded-xl text-xs bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-inner focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-10 px-3 py-1 rounded-xl bg-feminine-bg border border-feminine-dark/5 text-xs text-feminine-dark font-bold focus:outline-none"
              >
                <option value="ALL">SEMUA KATEGORI</option>
                <option value="IMAGE GENERATOR">IMAGE GENERATOR</option>
                <option value="VIDEO GENERATOR">VIDEO GENERATOR</option>
                <option value="PROMPT GENERATOR">PROMPT GENERATOR</option>
                <option value="LLM">LLM</option>
                <option value="EMBEDDING">EMBEDDING</option>
                <option value="UPSCALER">UPSCALER</option>
                <option value="IMAGE EDITOR">IMAGE EDITOR</option>
                <option value="VIDEO EDITOR">VIDEO EDITOR</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setEditorMode("create");
                  setSelectedProvider(null);
                  setEditorData({
                    provider_name: "",
                    provider_category: categoryFilter !== "ALL" ? categoryFilter : "IMAGE GENERATOR",
                    api_endpoint: "",
                    api_key: "",
                    model_name: "",
                    region: "",
                    status: "active",
                    version: "",
                    organization_id: "",
                    project_id: "",
                    webhook_url: "",
                    callback_url: "",
                    custom_header: "",
                    custom_parameter: ""
                  });
                }}
                className="h-10 px-4 bg-feminine-accent hover:bg-feminine-accent-hover text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm cursor-pointer transform active:scale-95 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Custom Provider</span>
              </button>
            </div>
          </div>

          {/* ----- SECTION D: AI PROVIDERS BENTO LIST ----- */}
          {providersLoading ? (
            <div className="text-center py-20 text-feminine-dark/40 font-semibold text-xs">
              Sedang memuat daftar AI Providers nyata dari Supabase...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {providers
                .filter(p => {
                  const matchSearch = p.provider_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                      (p.model_name || "").toLowerCase().includes(searchQuery.toLowerCase());
                  const matchCategory = categoryFilter === "ALL" || p.provider_category === categoryFilter;
                  return matchSearch && matchCategory;
                })
                .map((p) => {
                  const isTesting = testingId === p.id;
                  const isClosed = selectedProvider?.id !== p.id;
                  return (
                    <div
                      key={p.id}
                      className={`bg-white rounded-3xl border border-white p-6 neu-panel-emboss flex flex-col gap-4 relative transition-all duration-300 ${
                        p.status !== "active" ? "opacity-65 saturate-[0.25]" : "hover:border-feminine-accent/20"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3.5">
                          <img
                            src={p.provider_logo}
                            alt="logo"
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-xl bg-feminine-bg border border-feminine-dark/5 p-1 flex-shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-feminine-dark">{p.provider_name}</h4>
                              <span
                                className={`text-[8px] px-2 py-0.5 font-extrabold rounded-full font-mono uppercase tracking-wide ${
                                  p.provider_category === "VIDEO GENERATOR" ? "bg-purple-100 text-purple-700" : "bg-feminine-rose/30 text-feminine-accent"
                                }`}
                              >
                                {p.provider_category}
                              </span>
                            </div>
                            <p className="text-[10px] text-feminine-dark/50 font-semibold mt-0.5 font-mono truncate max-w-[220px]">
                              API: {p.api_endpoint}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          {/* Connection Badge */}
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                p.connection_status === "Online"
                                  ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse"
                                  : p.connection_status === "Unauthorized"
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                            />
                            <span className="text-[9px] font-bold text-feminine-dark/60 uppercase font-mono">
                              {p.connection_status || "Offline"}
                            </span>
                          </div>

                          {/* Quick Enable/Disable toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleProvider(p.id)}
                            className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-md border tracking-wider transition-all cursor-pointer ${
                              p.status === "active"
                                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                : "bg-gray-100 border-gray-300 text-gray-800"
                            }`}
                          >
                            {p.status === "active" ? "ENABLED" : "DISABLED"}
                          </button>
                        </div>
                      </div>

                      {/* STATS FOOTER METRICS BAR */}
                      <div className="grid grid-cols-4 gap-2 bg-feminine-bg/40 p-3 rounded-2xl border border-feminine-dark/5 text-center">
                        <div>
                          <p className="text-[8px] font-bold text-feminine-dark/50 uppercase">Requests</p>
                          <p className="text-xs font-bold text-feminine-dark">{p.request_counter || 0}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-feminine-dark/50 uppercase">Success Log</p>
                          <p className="text-xs font-bold text-emerald-600">{p.success_count || 0}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-feminine-dark/50 uppercase font-mono text-rose-500">Error Log</p>
                          <p className="text-xs font-bold text-rose-600">{p.error_count || 0}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-feminine-dark/50 uppercase">Delay</p>
                          <p className="text-xs font-bold text-feminine-dark font-mono">{p.response_time || 0}ms</p>
                        </div>
                      </div>

                      {/* QUICK SETTINGS EXPANSION ACTIONS */}
                      <div className="flex gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleTestConnection(p.id)}
                          disabled={isTesting}
                          className="flex-1 h-9 bg-white border border-feminine-accent/20 hover:bg-feminine-rose/10 text-feminine-accent font-extrabold text-[10px] rounded-xl flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                        >
                          <Activity className={`w-3 h-3 ${isTesting ? "animate-spin text-feminine-accent" : ""}`} />
                          <span>{isTesting ? "Testing..." : "TEST CONNECTION"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProvider(p);
                            setEditorMode("edit");
                            setEditorData({
                              provider_name: p.provider_name,
                              provider_category: p.provider_category,
                              api_endpoint: p.api_endpoint,
                              api_key: p.api_key,
                              model_name: p.model_name || "",
                              region: p.region || "",
                              status: p.status,
                              version: p.version || "",
                              organization_id: p.organization_id || "",
                              project_id: p.project_id || "",
                              webhook_url: p.webhook_url || "",
                              callback_url: p.callback_url || "",
                              custom_header: p.custom_header || "",
                              custom_parameter: p.custom_parameter || ""
                            });
                          }}
                          className="px-3.5 h-9 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-feminine-dark/70 font-bold text-[10px] rounded-xl flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                        >
                          <Edit className="w-3 h-3" />
                          <span>EDIT</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (p.id === selectedProvider?.id) {
                              setSelectedProvider(null);
                            } else {
                              setSelectedProvider(p);
                            }
                          }}
                          className="px-3 h-9 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-feminine-dark/70 font-bold text-[10px] rounded-xl flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                        >
                          <span>{p.id === selectedProvider?.id ? "SEMBUNYIKAN DATA" : "INFO INTEGRASI"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteProvider(p.id)}
                          className="px-2.5 h-9 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shadow-sm cursor-pointer transition-all"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* EXPANDABLE INTEGRATION DETAILS & SANDBOX PRELOADS */}
                      {!isClosed && (
                        <div className="border-t border-feminine-dark/5 pt-4 space-y-3.5 text-xs animate-slideDown">
                          <h5 className="font-extrabold uppercase text-[9px] text-feminine-accent tracking-widest pl-1">
                            DETAILED INTEGRATION METRICS & ENDPOINT SPECS
                          </h5>

                          <div className="grid grid-cols-2 gap-4 text-[11px] bg-feminine-bg/40 p-4 rounded-2xl border border-feminine-dark/5">
                            <div>
                              <span className="block font-bold text-feminine-dark/50">Model Name:</span>
                              <span className="font-semibold text-feminine-dark">{p.model_name || "default"}</span>
                            </div>
                            <div>
                              <span className="block font-bold text-feminine-dark/50">Version:</span>
                              <span className="font-semibold text-feminine-dark">{p.version || "n/a"}</span>
                            </div>
                            <div>
                              <span className="block font-bold text-feminine-dark/50">Region / Cloud Zone:</span>
                              <span className="font-semibold text-feminine-dark font-mono">{p.region || "Anywhere"}</span>
                            </div>
                            <div>
                              <span className="block font-bold text-feminine-dark/50">Last Connection Check:</span>
                              <span className="font-semibold text-feminine-dark font-mono">
                                {p.last_check ? new Date(p.last_check).toLocaleTimeString() : "-"}
                              </span>
                            </div>
                            <div>
                              <span className="block font-bold text-feminine-dark/50">Webhook URL:</span>
                              <span className="font-mono text-[10px] text-feminine-dark truncate block max-w-[200px]" title={p.webhook_url}>
                                {p.webhook_url || "Disabled"}
                              </span>
                            </div>
                            <div>
                              <span className="block font-bold text-feminine-dark/50">
                                {p.provider_category === "VIDEO GENERATOR" ? "Callback URL:" : "Org State:"}
                              </span>
                              <span className="font-mono text-[10px] text-feminine-dark truncate block max-w-[200px]" title={p.callback_url || p.organization_id}>
                                {(p.provider_category === "VIDEO GENERATOR" ? p.callback_url : p.organization_id) || "None"}
                              </span>
                            </div>
                          </div>

                          {/* Secrets review */}
                          <div className="p-3 bg-red-50/40 rounded-xl border border-red-100 text-[10px] font-mono leading-relaxed space-y-1">
                            <div className="font-bold text-red-900 uppercase">🔑 API Secret Credentials Shield:</div>
                            <div className="text-red-800 break-all">
                              Endpoint URL: <span className="font-bold">{p.api_endpoint}</span>
                            </div>
                            <div className="text-red-800">
                              Secret API Key:{" "}
                              <span className="font-bold">
                                {p.api_key ? `•••••••••••••••• ${p.api_key.substring(Math.max(0, p.api_key.length - 4))}` : "(KOSONG - Menggunakan Environment Bawaan)"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              {providers.length === 0 && (
                <div className="lg:col-span-2 text-center py-20 text-feminine-dark/40 font-semibold text-xs bg-white rounded-3xl p-8 shadow-sm">
                  Tidak ada provider yang cocok dengan filter pencarian dan kategori Anda.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------- */}
      {/* 3. TOKENS VIEW */}
      {/* ----------------------------------------------- */}
      {activeMenu === "tokens" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-5xl mx-auto animate-fadeIn">
          {/* Generation form */}
          <div className="lg:col-span-5 bg-white rounded-[2rem_1.5rem_2.5rem_1.5rem] p-6 lg:p-8 border border-white/60 neu-panel-emboss relative">
            <h3 className="text-md font-bold text-feminine-dark uppercase tracking-wider text-feminine-accent border-b border-feminine-dark/5 pb-3 mb-5 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-feminine-accent" />
              <span>Generate Voucher Token</span>
            </h3>

            <form onSubmit={handleGenerateTokens} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-feminine-dark/75 uppercase tracking-wider mb-2 pl-1">
                  Prefix Kode Voucher
                </label>
                <input
                  type="text"
                  required
                  value={tokenPrefix}
                  onChange={(e) => setTokenPrefix(e.target.value)}
                  placeholder="NIKS, GARA, PROMO"
                  className="w-full h-11 px-4 rounded-xl text-xs bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-inner focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-feminine-dark/75 uppercase tracking-wider mb-2 pl-1">
                  Nilai Kredit per Voucher
                </label>
                <select
                  value={tokenCredits}
                  onChange={(e) => setTokenCredits(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-xl text-xs bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-inner focus:outline-none"
                >
                  <option value={50}>50 Kredit (Standar)</option>
                  <option value={100}>100 Kredit (Silver)</option>
                  <option value={500}>500 Kredit (Gold)</option>
                  <option value={1000}>1000 Kredit (Platinum)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-feminine-dark/75 uppercase tracking-wider mb-2 pl-1">
                  Jumlah Voucher Yang Dibuat (QTY)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={50}
                  value={tokenQty}
                  onChange={(e) => setTokenQty(Number(e.target.value))}
                  className="w-full h-11 px-4 rounded-xl text-xs bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-inner focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl text-xs font-semibold text-white bg-feminine-accent hover:bg-feminine-accent-hover select-none neu-btn-rose-emboss cursor-pointer flex items-center justify-center gap-2 transform transition-all active:scale-[0.98]"
              >
                Hasilkan Voucher
              </button>
            </form>

            {newlyGeneratedTokens.length > 0 && (
              <div className="mt-5 p-4 rounded-xl bg-feminine-rose/30 border border-feminine-accent/15">
                <span className="text-[10px] font-bold text-feminine-accent uppercase tracking-widest block mb-2">
                  🎉 Baru Dihasilkan:
                </span>
                <div className="space-y-1 max-h-[150px] overflow-y-auto font-mono text-xs text-feminine-dark font-semibold">
                  {newlyGeneratedTokens.map((tokStr) => (
                    <div key={tokStr} className="flex justify-between items-center bg-white p-1.5 rounded border border-white">
                      <span>{tokStr}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(tokStr);
                          alert("Token disalin!");
                        }}
                        className="text-[9px] text-feminine-accent hover:underline font-bold"
                      >
                        SALIN
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Token active statistics sheet */}
          <div className="lg:col-span-7 bg-white rounded-[2rem_1.5rem_2.5rem_1.5rem] p-6 lg:p-8 border border-white/60 neu-panel-emboss flex flex-col h-[400px]">
            <h3 className="text-xs font-bold text-feminine-dark/50 uppercase tracking-widest mb-4">
              DAFTAR SELURUH VOUCHER TOKENS KREDIT
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {monitorData?.tokens && monitorData.tokens.length > 0 ? (
                monitorData.tokens.map((tok: any) => (
                  <div key={tok.code} className="p-3 rounded-xl bg-feminine-bg text-xs flex justify-between items-center border border-feminine-dark/5 font-medium relative overflow-hidden">
                    <div>
                      <div className="font-mono font-bold text-feminine-dark flex items-center gap-1.5">
                        <span>{tok.code}</span>
                        <span className={`w-2 h-2 rounded-full ${tok.isActive ? "bg-emerald-500" : "bg-red-400"}`} />
                      </div>
                      <div className="text-[10px] text-feminine-dark/55 mt-0.5">
                        Kredit: <strong className="text-feminine-accent">+{tok.credits}</strong> | Dibuat: {new Date(tok.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      {tok.isActive ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold uppercase tracking-wider">Tersedia</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-[9px] font-bold uppercase tracking-wider">Ditukarkan</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-feminine-dark/30">Belum ada token yang dibuat.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------- */}
      {/* 4. RUNNING TEXT MODIFIER */}
      {/* ----------------------------------------------- */}
      {activeMenu === "running-text" && (
        <form onSubmit={handleUpdateAnn} className="space-y-6 max-w-xl mx-auto animate-fadeIn">
          <div className="bg-white rounded-[2rem_1.5rem_2.5rem_1.5rem] p-6 lg:p-8 border border-white/60 neu-panel-emboss space-y-6">
            <h3 className="text-md font-bold text-feminine-dark uppercase tracking-wider text-feminine-accent border-b border-feminine-rose/50 pb-3 flex items-center gap-2">
              <Settings className="w-5 h-5 text-feminine-accent" />
              <span>Running Text Marquee Console</span>
            </h3>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-feminine-dark/70 uppercase tracking-wider pl-1">
                Isi Teks Berjalan Utama
              </label>
              <textarea
                value={annText}
                onChange={(e) => setAnnText(e.target.value)}
                maxLength={400}
                placeholder="Tulis pengumuman global..."
                className="w-full h-28 p-3 rounded-xl text-sm bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-[inset_2px_2px_4px_#dfccd0,inset_-2px_-2px_4px_#ffffff] focus:outline-none focus:ring-1 focus:ring-feminine-accent/40 resize-none font-semibold leading-relaxed"
              />
              <div className="text-[10px] text-feminine-dark/50 text-right">
                {annText.length}/400 Karakter (Teks akan diperbarui di seluruh aplikasi secara instan)
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingAnn}
              className="w-full h-11 rounded-xl text-xs font-semibold text-white bg-feminine-accent hover:bg-feminine-accent-hover select-none neu-btn-rose-emboss cursor-pointer flex items-center justify-center gap-2 transform transition-all active:scale-[0.98]"
            >
              Update Teks Berjalan
            </button>
          </div>
        </form>
      )}

      {/* ----------------------------------------------- */}
      {/* 5. SQL DEPLOY VIEW */}
      {/* ----------------------------------------------- */}
      {activeMenu === "sql-deploy" && (
        <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
          {/* Version alerting for schema mismatch */}
          {dbStatus?.versionMismatch && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
              <ShieldAlert className="w-8 h-8 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-rose-800 uppercase tracking-wide">Schema Update Available</h4>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  Ditemukan perbedaan antara versi skema aplikasi (<strong>{dbStatus?.appSchemaVersion}</strong>) dengan skema database Supabase aktif Anda (<strong>{dbStatus?.dbSchemaVersion}</strong>). Klik tombol <strong>Sync Schema</strong> atau pilih migrasi penyeimbang secara instan.
                </p>
              </div>
            </div>
          )}

          {/* Database Version Info & Control Actions Card */}
          <div className="bg-white rounded-[2rem_1.5rem_2.5rem_1.5rem] p-6 lg:p-8 border border-white/60 neu-panel-emboss space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-feminine-dark/5 pb-4">
              <div>
                <h3 className="text-md font-bold text-feminine-dark uppercase tracking-wider text-feminine-accent flex items-center gap-2 animate-pulse">
                  <Database className="w-5 h-5 text-feminine-accent animate-spin-slow" />
                  <span>Manajer Versi & Sinkronisasi DB</span>
                </h3>
                <p className="text-xs text-feminine-dark/50 mt-1">
                  Verifikasi kemurnian skema, sinkronisasikan metadata, dan naikkan tingkat versi database secara otomatis di database Supabase Anda.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={fetchDbSchemaStatus}
                  disabled={dbStatusLoading || migrating}
                  className="px-3 py-1.5 bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 flex items-center gap-1.5 text-xs font-bold rounded-lg shadow-sm transform active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${dbStatusLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh Schema</span>
                </button>

                <button
                  type="button"
                  onClick={syncDbSchema}
                  disabled={migrating}
                  className="px-3 py-1.5 bg-feminine-accent text-white flex items-center gap-1.5 text-xs font-bold rounded-lg shadow-sm transform active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${migrating ? 'animate-spin' : ''}`} />
                  <span>Sync Schema</span>
                </button>
              </div>
            </div>

            {/* Version Diagnostics grid & Audit Validation Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-150 flex flex-col justify-center">
                <span className="text-[10px] text-feminine-accent font-black uppercase tracking-widest font-sans">Current App Version</span>
                <span className="text-xl font-mono font-extrabold text-feminine-dark mt-1">{dbStatus?.currentAppVersion || "1.1.0"}</span>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-150 flex flex-col justify-center">
                <span className="text-[10px] text-feminine-accent font-black uppercase tracking-widest font-sans">Current DB Version</span>
                <span className="text-xl font-mono font-extrabold text-feminine-dark mt-1 flex items-center gap-2">
                  <span>{dbStatus?.currentDbVersion || "Mendeteksi..."}</span>
                  {dbStatus?.versionMismatch ? (
                    <span className="inline-flex px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[8px] font-bold uppercase tracking-wide rounded border border-rose-200">OUTDATED</span>
                  ) : (
                    <span className="inline-flex px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] font-bold uppercase tracking-wide rounded border border-emerald-200 animate-pulse">In Sync</span>
                  )}
                </span>
              </div>
            </div>

            {/* Audit & Verification Lists (Pending, Executed, Failed) */}
            <div className="bg-feminine-rose/10 rounded-2xl p-4 border border-feminine-rose/25 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-feminine-accent flex items-center gap-1.5 border-b border-feminine-rose/20 pb-2">
                <span>📋 Audit & Verifikasi Engine Migrasi (Idempotent Setup)</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pending */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Pending Migrations ({dbStatus?.pendingMigrations?.length || 0})
                  </span>
                  <div className="bg-white/75 border border-amber-100 rounded-xl p-2.5 h-[120px] overflow-y-auto scrollbar-thin text-[9px] font-mono leading-relaxed text-amber-800">
                    {dbStatus?.pendingMigrations?.length > 0 ? (
                      dbStatus.pendingMigrations.map((m: string, i: number) => <div key={i} className="py-0.5 border-b border-amber-50/50">✦ {m}</div>)
                    ) : (
                      <span className="text-gray-400 italic">Tidak ada migrasi tertunda.</span>
                    )}
                  </div>
                </div>

                {/* Executed */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Executed Migrations ({dbStatus?.executedMigrations?.length || 0})
                  </span>
                  <div className="bg-white/75 border border-emerald-100 rounded-xl p-2.5 h-[120px] overflow-y-auto scrollbar-thin text-[9px] font-mono leading-relaxed text-emerald-800">
                    {dbStatus?.executedMigrations?.length > 0 ? (
                      dbStatus.executedMigrations.map((m: string, i: number) => <div key={i} className="py-0.5 border-b border-emerald-50/50 font-medium">✓ {m}</div>)
                    ) : (
                      <span className="text-gray-400 italic">Mendeteksi tabel skema...</span>
                    )}
                  </div>
                </div>

                {/* Failed */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                    Failed Migrations ({dbStatus?.failedMigrations?.length || 0})
                  </span>
                  <div className="bg-white/75 border border-red-150 rounded-xl p-2.5 h-[120px] overflow-y-auto scrollbar-thin text-[9px] font-mono leading-relaxed text-red-600">
                    {dbStatus?.failedMigrations?.length > 0 ? (
                      dbStatus.failedMigrations.map((m: string, i: number) => <div key={i} className="py-0.5 border-b border-red-50/30">❌ {m}</div>)
                    ) : (
                      <span className="text-gray-400 italic">Zero failures (Idempotency Active)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Migration Report statistics */}
              {dbStatus?.migrationReport && (
                <div className="bg-white/65 border border-feminine-accent/5 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs font-semibold leading-none mt-2">
                  <div className="bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                    <div className="text-[8px] text-gray-400 uppercase font-black">Created Tables</div>
                    <div className="text-sm font-black text-feminine-accent mt-1">{dbStatus.migrationReport.tablesCreated}</div>
                  </div>
                  <div className="bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                    <div className="text-[8px] text-gray-400 uppercase font-black">Updated Tables</div>
                    <div className="text-sm font-black text-feminine-accent mt-1">{dbStatus.migrationReport.tablesUpdated}</div>
                  </div>
                  <div className="bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                    <div className="text-[8px] text-gray-400 uppercase font-black">Added Columns</div>
                    <div className="text-sm font-black text-feminine-accent mt-1">{dbStatus.migrationReport.columnsAdded}</div>
                  </div>
                  <div className="bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                    <div className="text-[8px] text-gray-400 uppercase font-black">Added Policies</div>
                    <div className="text-sm font-black text-emerald-600 mt-1">{dbStatus.migrationReport.policiesCreated}</div>
                  </div>
                  <div className="bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                    <div className="text-[8px] text-gray-400 uppercase font-black">Skipped (Dupes)</div>
                    <div className="text-sm font-black text-amber-500 mt-1">{dbStatus.migrationReport.policiesSkipped}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Migration Details Action Panel */}
            {dbStatus?.sqlToApply ? (
              <div className="p-4 rounded-2xl bg-[#FFF9FA] border border-[#FFD9DF] space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <h5 className="text-[11px] font-bold text-rose-900 uppercase tracking-wide">Query Perbaikan Skema Mendatang</h5>
                    <p className="text-[10px] text-feminine-dark/70 leading-relaxed">
                      Dideteksi adanya kolom baru atau perubahan skema yang belum terbuat sempurna di Supabase. Eksekusi cepat melalui form di bawah:
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-gray-950 text-emerald-400 font-mono text-[10px] rounded-xl overflow-x-auto max-h-[140px] scrollbar-thin shadow-inner leading-relaxed">
                  <pre>{dbStatus?.sqlToApply}</pre>
                </div>

                <button
                  type="button"
                  onClick={() => applyDbMigration(dbStatus.sqlToApply)}
                  disabled={migrating}
                  className="w-full py-2.5 bg-feminine-accent hover:opacity-90 text-white flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl shadow-sm transform active:scale-[0.98] transition disabled:opacity-50"
                >
                  <Play className="w-4 h-4 text-white" />
                  <span>Apply Migration</span>
                </button>
              </div>
            ) : dbStatus ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-150 flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs text-emerald-800 font-medium">Luar biasa! Seluruh konfigurasi tabel, skema DB, dan penanda versi Anda di Supabase saat ini telah 100% selaras.</span>
              </div>
            ) : null}
          </div>

          {/* RLS SECURITY AUDITOR & HARDENER PANEL */}
          <div className="bg-white rounded-[2rem_1.5rem_2.5rem_1.5rem] p-6 lg:p-8 border border-white/60 neu-panel-emboss space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-feminine-dark/5 pb-4">
              <div>
                <h3 className="text-md font-bold text-feminine-dark uppercase tracking-wider text-feminine-accent flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-feminine-accent" />
                  <span>Audit Kebijakan Keamanan RLS</span>
                </h3>
                <p className="text-xs text-feminine-dark/50 mt-1">
                  Pantau kepatuhan Row Level Security (RLS) di database Supabase Anda secara real-time untuk mencegah bypass autentikasi.
                </p>
              </div>

              <button
                type="button"
                onClick={enforceRlsPolicies}
                disabled={enforcingRls || auditingRls}
                className="px-4 py-2 bg-emerald-600 font-bold text-white text-xs rounded-xl flex items-center gap-1.5 shadow-md hover:bg-emerald-700 transition transform active:scale-95 disabled:opacity-50 select-none cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 animate-pulse" />
                <span>{enforcingRls ? "Memperkeras..." : "Perkeras & Jalankan RLS"}</span>
              </button>
            </div>

            {rlsAudit ? (
              <div className="space-y-4">
                {/* Score Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-feminine-rose/30 to-rose-50 border border-feminine-rose/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-black text-feminine-dark uppercase tracking-wide">Skor Keamanan Skema DB</h4>
                    <p className="text-[10px] text-feminine-dark/60 mt-0.5">Dihitung berdasarkan jumlah tabel yang mengaktifkan RLS dan memiliki setidaknya satu kebijakan.</p>
                  </div>
                  <div className="flex items-baseline gap-1 bg-white border border-feminine-rose/30 rounded-xl px-4 py-2 shrink-0">
                    <span className="text-2xl font-mono font-black text-feminine-accent">{rlsAudit.overallScore}%</span>
                    <span className="text-[10px] text-feminine-dark/40 font-bold uppercase tracking-wider">Secure</span>
                  </div>
                </div>

                {/* Audit Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
                  {rlsAudit.auditReport?.map((tbl: any, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-gray-50/50 border border-gray-150 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-feminine-dark font-mono bg-white px-2 py-0.5 rounded border border-gray-100">{tbl.tableName}</span>
                        {tbl.rlsEnabled ? (
                          <span className="inline-flex px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[8px] font-black uppercase rounded tracking-wide">RLS ACTIVE</span>
                        ) : (
                          <span className="inline-flex px-1.5 py-0.5 bg-rose-50 border border-rose-200 text-rose-800 text-[8px] font-black uppercase rounded tracking-wide animate-pulse">RLS INACTIVE</span>
                        )}
                      </div>

                      {/* Warnings or Policy lists */}
                      {tbl.issues && tbl.issues.length > 0 ? (
                        <div className="space-y-1">
                          {tbl.issues.map((iss: string, i: number) => (
                            <div key={i} className="text-[9px] text-rose-600 font-medium flex items-center gap-1 leading-normal">
                              <span>⚠</span>
                              <span>{iss}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-[8px] text-gray-400 uppercase font-black tracking-widest block">Kebijakan Aktif ({tbl.policies?.length || 0}):</span>
                          {tbl.policies?.map((pol: any, i: number) => (
                            <div key={i} className="text-[9px] text-feminine-dark/75 bg-white p-1.5 rounded border border-gray-100 font-mono leading-tight space-y-0.5">
                              <div className="font-bold text-feminine-accent flex items-center justify-between text-[8px]">
                                <span>✦ {pol.policyName}</span>
                                <span className="bg-gray-100 px-1 rounded text-gray-500 uppercase">{pol.command}</span>
                              </div>
                              {pol.usingExpression && <div className="text-[8px] text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">USING: {pol.usingExpression}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : auditingRls ? (
              <div className="py-8 text-center text-xs text-feminine-dark/50 font-bold uppercase tracking-wider animate-pulse flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-feminine-accent" />
                <span>Melakukan Audit Keamanan RLS di Seluruh Tabel...</span>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-gray-50 text-center text-xs text-gray-400 italic">
                Klik Refresh Schema untuk memulai penarikan laporan audit keamanan Supabase.
              </div>
            )}
          </div>

          {/* HISTORICAL TRANSACTION & MIGRATIONS LOG TIMELINE */}
          <div className="bg-white rounded-[2rem_1.5rem_2.5rem_1.5rem] p-6 lg:p-8 border border-white/60 neu-panel-emboss space-y-6">
            <div>
              <h3 className="text-md font-bold text-feminine-dark uppercase tracking-wider text-feminine-accent flex items-center gap-2">
                <Database className="w-5 h-5 text-feminine-accent" />
                <span>Linimasa Migrasi Transaksional V2</span>
              </h3>
              <p className="text-xs text-feminine-dark/50 mt-1">
                Laporan audit real-time dari tabel database <code>public.migration_history</code>. Menunjukkan status dan hash checksum biner file migrasi demi mencegah schema drift.
              </p>
            </div>

            {migrationLogs && migrationLogs.length > 0 ? (
              <div className="border-l border-feminine-rose/30 ml-3 pl-5 space-y-4 max-h-[250px] overflow-y-auto scrollbar-thin pr-1">
                {migrationLogs.map((log: any, idx: number) => (
                  <div key={idx} className="relative space-y-1">
                    {/* Bullet circle indicator */}
                    <div className={`absolute -left-[26px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm font-mono ${
                      log.status === "success" ? "bg-emerald-500" : "bg-rose-500"
                    }`} />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-xs font-black text-feminine-dark font-mono">{log.migration_id}</span>
                      <span className="text-[9px] text-feminine-dark/40 font-semibold">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[8px] font-bold">
                      {log.status === "success" ? (
                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-250 rounded uppercase">SUCCESS</span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-250 rounded uppercase">FAILED</span>
                      )}
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 border border-gray-150 rounded font-mono">MD5: {log.checksum?.substring(0, 8)}...</span>
                      <span className="px-1.5 py-0.5 bg-pink-50 text-feminine-accent border border-pink-100 rounded font-mono">SPEED: {log.execution_time}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-gray-50 text-center text-xs text-gray-400 italic">
                Belum ada timelogs migrasi tercatat di database atau direct connection belum terhubung.
              </div>
            )}
          </div>

          <div className="bg-white rounded-[2rem_1.5rem_2.5rem_1.5rem] p-6 lg:p-8 border border-white/60 neu-panel-emboss space-y-4">
            <div className="flex justify-between items-center border-b border-feminine-dark/5 pb-3">
              <div>
                <h3 className="text-md font-bold text-feminine-dark uppercase tracking-wider text-feminine-accent flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  <span>Manual Supabase SQL DDL Schema</span>
                </h3>
                <p className="text-xs text-feminine-dark/50 mt-0.5">
                  Salin skema tabel di bawah ini dan tempel di editor SQL Supabase Anda untuk meluncurkan sisa penataan database Anda.
                </p>
              </div>

              <button
                onClick={copySqlToClipboard}
                className="px-3.5 py-1.5 bg-feminine-rose text-feminine-accent border border-white flex items-center gap-1.5 text-xs font-bold rounded-lg shadow-sm hover:opacity-90 transform active:scale-95"
              >
                <Copy className="w-4 h-4" />
                <span>Salin SQL</span>
              </button>
            </div>

            {/* SQL content display */}
            <div className="p-4 rounded-xl bg-feminine-dark font-mono text-[11px] text-pink-150 leading-relaxed overflow-x-auto h-[350px] scrollbar-thin shadow-inner select-all">
              <pre className="text-[#FBC3CB]">{sqlSchema}</pre>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------- */}
      {/* 6. VIDEO CONFIGURATOR & MONITOR VIEW */}
      {/* ----------------------------------------------- */}
      {activeMenu === "video" && (
        <div className="space-y-8 max-w-6xl mx-auto animate-fadeIn">
          {/* A. Limit Configuration Panel */}
          <div className="bg-white rounded-[2rem_1.5rem_2.5rem_1.5rem] p-6 lg:p-8 border border-white/60 neu-panel-emboss space-y-6">
            <div className="border-b border-feminine-rose/30 pb-3">
              <h3 className="text-md font-bold text-feminine-dark uppercase tracking-wider text-feminine-accent flex items-center gap-2">
                <Video className="w-5 h-5 text-feminine-accent" />
                <span>Pengaturan Batas Ukuran File Video</span>
              </h3>
              <p className="text-xs text-feminine-dark/50 mt-1">
                Atur kapasitas berkas maksimal yang dapat diunggah pengguna ke storage proxy secara dinamis tanpa perlu rebuild aplikasi.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-3">
                <label className="block text-xs font-bold text-feminine-dark/70 uppercase">Pilih Batas Maksimal</label>
                <div className="flex flex-wrap gap-2">
                  {[50, 100, 250, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setVideoSizeLimit(preset);
                        setCustomLimitVal(String(preset));
                      }}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                        videoSizeLimit === preset && customLimitVal === String(preset)
                          ? "bg-feminine-accent text-white shadow-md"
                          : "bg-feminine-bg text-feminine-dark/80 hover:bg-feminine-rose/10 border border-feminine-dark/5"
                      }`}
                    >
                      {preset} MB
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setVideoSizeLimit(Number(customLimitVal) || 120);
                    }}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      ![50, 100, 250, 500].includes(videoSizeLimit)
                        ? "bg-feminine-accent text-white shadow-md"
                        : "bg-feminine-bg text-feminine-dark/80 border border-feminine-dark/5"
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {/* Custom input panel */}
                {![50, 100, 250, 500].includes(videoSizeLimit) && (
                  <div className="pt-2 animate-fadeIn">
                    <input
                      type="number"
                      value={customLimitVal}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomLimitVal(val);
                        setVideoSizeLimit(Number(val) || 0);
                      }}
                      placeholder="Masukkan batas MB (Contoh: 150)"
                      className="w-full h-11 px-4 rounded-xl text-xs bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-inner focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="bg-feminine-bg p-4 rounded-xl text-xs border border-feminine-dark/5 shadow-inner text-left space-y-1">
                <p className="font-bold text-feminine-dark text-feminine-accent">Informasi Alokasi Storage & Cloud:</p>
                <p className="text-feminine-dark/70 leading-relaxed font-semibold">
                  Semua video yang lolos validasi ukuran akan disimpan sementara dalam local storage server dan diunggah secara asinkron ke bucket Supabase Storage yang terlindungi RLS Policy otomatis.
                </p>
                <p className="text-feminine-dark/50 mt-1 font-mono text-[9px]">
                  Config Aktif: {videoSizeLimit} MB | Limit Maksimal: HMR 500 MB limit global.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-feminine-dark/5">
              <button
                type="button"
                onClick={async (e) => {
                  setSavingVideoLimit(true);
                  await saveApiSettings(e);
                  setSavingVideoLimit(false);
                }}
                disabled={savingVideoLimit}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-feminine-accent hover:bg-feminine-accent-hover shadow-md active:scale-95 transition-all flex items-center gap-1.5"
              >
                {savingVideoLimit ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Simpan Batas Video
                  </>
                )}
              </button>
            </div>
          </div>

          {/* B. Video Monitor Live Lists */}
          <div className="bg-white rounded-[2rem_1.5rem_2.5rem_1.5rem] p-6 lg:p-8 border border-white/60 neu-panel-emboss space-y-6">
            <div className="flex justify-between items-center border-b border-feminine-rose/30 pb-3">
              <div>
                <h3 className="text-md font-bold text-feminine-dark uppercase tracking-wider text-feminine-accent flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  <span>Daftar Unggahan & Live Analisis Video</span>
                </h3>
                <p className="text-xs text-feminine-dark/50 mt-0.5">
                  Monitor log berkas video rill yang diunggah pengguna beserta status pemecahan parameter Gemini API aslinya.
                </p>
              </div>
              <button
                onClick={fetchMonitorData}
                type="button"
                className="p-1 text-feminine-dark/40 hover:text-feminine-accent transform active:rotate-180 transition-all flex h-10 w-10 items-center justify-center bg-feminine-bg border border-feminine-dark/5 rounded-xl text-xs"
                title="Refresh Monitor Data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-feminine-dark">
                <thead>
                  <tr className="bg-feminine-bg text-[10px] font-bold text-feminine-dark/60 uppercase tracking-widest border-b border-feminine-dark/5">
                    <th className="p-3">Video metadata</th>
                    <th className="p-3">Info File</th>
                    <th className="p-3">User & Tanggal</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-feminine-dark/5">
                  {monitorData?.videoUploads && monitorData.videoUploads.length > 0 ? (
                    monitorData.videoUploads.map((log: any) => (
                      <tr key={log.id} className="hover:bg-feminine-rose/5 transition-all">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-10 rounded bg-gray-900 border border-feminine-dark/10 flex items-center justify-center text-[10px] text-white flex-shrink-0 font-bold overflow-hidden relative">
                              {log.publicUrl ? (
                                <video src={log.publicUrl} className="w-full h-full object-cover" preload="none" muted />
                              ) : (
                                <Video className="w-4 h-4 text-white/55" />
                              )}
                            </div>
                            <div className="min-w-0 max-w-[180px]">
                              <p className="font-bold truncate" title={log.fileName}>{log.fileName}</p>
                              <p className="text-[10px] text-feminine-dark/45 font-semibold">Codec: {log.codec || "Standard"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-feminine-accent">{log.sizeStr || "n/a"}</p>
                          <p className="text-[10px] text-feminine-dark/50">{log.duration ? `${log.duration} dtk` : "-"} | {log.resolution || "Unknown"}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-extrabold text-[11px] text-feminine-dark/70 truncate max-w-[120px]">@{log.username || "client_app"}</p>
                          <p className="text-[9px] text-feminine-dark/45 font-mono">{new Date(log.createdAt).toLocaleString("id-ID")}</p>
                        </td>
                        <td className="p-3 font-semibold">
                          {log.analysisCompletedAt ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-700 uppercase">
                              <Check className="w-2.5 h-2.5" /> Complete
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 border border-amber-100 text-amber-700 uppercase">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Processed
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVideoLog(log === selectedVideoLog ? null : log);
                            }}
                            className="px-3 py-1 bg-white text-feminine-accent border border-feminine-accent/10 rounded-lg text-[10px] font-bold shadow-sm hover:bg-feminine-rose/20 active:scale-95 transition-all"
                          >
                            {log === selectedVideoLog ? "Tutup Info" : "Hasil Gemini"}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-feminine-dark/30 font-bold">
                        Belum ada riwayat aktivitas video upload.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Expandable JSON Viewer Component */}
            {selectedVideoLog && (
              <div className="p-5 rounded-2xl bg-feminine-dark/5 border border-feminine-dark/10 shadow-inner space-y-3 animate-slideDown text-left">
                <div className="flex justify-between items-center text-xs">
                  <h4 className="font-extrabold uppercase text-[10px] text-feminine-accent tracking-widest pl-1">
                    DETAIL HASIL ANALISIS RAW PARAMETER GEMINI (ID: {selectedVideoLog.id})
                  </h4>
                  <button
                    onClick={() => setSelectedVideoLog(null)}
                    className="p-1 hover:text-rose-500 transition-all font-bold"
                  >
                    Tutup Windows
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-feminine-dark text-[#FBC3CB] text-xs font-mono h-[280px] overflow-y-auto shadow-inner">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(selectedVideoLog, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------- */}
      {/* 7. SYSTEM SETTINGS & CREDENTIALS VIEW */}
      {/* ----------------------------------------------- */}
      {activeMenu === "settings" && (
        <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
          <div className="bg-white rounded-[2rem_1.5rem_2.5rem_1.5rem] p-6 lg:p-8 border-2 border-feminine-accent/20 neu-panel-emboss space-y-6 relative text-left">
            <div className="flex justify-between items-center border-b border-feminine-rose/30 pb-4">
              <div>
                <h3 className="text-md font-bold text-feminine-dark uppercase tracking-widest flex items-center gap-2">
                  <Settings className="w-5 h-5 text-feminine-accent" />
                  <span>Sistem Global API & Sandbox Settings</span>
                </h3>
                <p className="text-xs text-feminine-dark/50 mt-1">
                  Atur kunci API Gemini dan Supabase Cloud yang terintegrasi secara langsung di server.
                </p>
              </div>
            </div>

            <form onSubmit={saveApiSettings} className="space-y-6">
              {/* GEMINI SECTION */}
              <div className="space-y-3 p-5 rounded-2xl bg-feminine-bg border border-feminine-accent/10">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-feminine-accent uppercase tracking-wider">
                    1. Gemini AI API Key
                  </h4>
                  <button
                    type="button"
                    onClick={handleTestGemini}
                    disabled={geminiTestStatus.loading}
                    className="px-3 py-1 bg-white hover:bg-feminine-rose/10 text-feminine-accent border border-feminine-accent/15 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                  >
                    <Activity className={`w-3.5 h-3.5 ${geminiTestStatus.loading ? "animate-spin" : ""}`} />
                    <span>{geminiTestStatus.loading ? "Menguji..." : "TEST CONNECTION"}</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={revealGemini ? "text" : "password"}
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="Masukkan Gemini API Key (e.g. AIzaSy...)"
                    className="w-full h-11 pl-4 pr-12 rounded-xl text-xs bg-white text-feminine-dark border border-feminine-dark/15 shadow-inner focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setRevealGemini(!revealGemini)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-feminine-dark/40 hover:text-feminine-accent"
                    title={revealGemini ? "Sembunyikan" : "Tampilkan"}
                  >
                    {revealGemini ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>

                {geminiTestStatus.msg && (
                  <div className={`p-3 rounded-xl text-[11px] font-medium leading-relaxed border ${
                    geminiTestStatus.success 
                      ? "bg-emerald-55 border-emerald-300 text-emerald-900" 
                      : "bg-rose-55 border-rose-300 text-rose-900"
                  }`}>
                    <p className="font-bold uppercase tracking-wider text-[9px] mb-0.5">
                      {geminiTestStatus.success ? "✓ Test Sukses" : "✗ Gagal Hubungan"}
                    </p>
                    {geminiTestStatus.msg}
                  </div>
                )}
              </div>

              {/* SUPABASE CLOUD SECTION */}
              <div className="space-y-4 p-5 rounded-2xl bg-feminine-bg border border-feminine-accent/10">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-feminine-accent uppercase tracking-wider">
                    2. Supabase Integration
                  </h4>
                  <button
                    type="button"
                    onClick={handleTestSupabase}
                    disabled={supabaseTestStatus.loading}
                    className="px-3 py-1 bg-white hover:bg-feminine-rose/10 text-feminine-accent border border-feminine-accent/15 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                  >
                    <Activity className={`w-3.5 h-3.5 ${supabaseTestStatus.loading ? "animate-spin" : ""}`} />
                    <span>{supabaseTestStatus.loading ? "Menguji..." : "TEST CONNECTION"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-feminine-dark/70 uppercase tracking-widest mb-1 pl-1">
                      Supabase Client Host URL
                    </label>
                    <input
                      type="url"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="Masukkan Host URL (e.g. https://xxxx.supabase.co)"
                      className="w-full h-11 px-4 rounded-xl text-xs bg-white text-feminine-dark border border-feminine-dark/15 shadow-inner focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-feminine-dark/70 uppercase tracking-widest mb-1 pl-1">
                      Supabase Anon / Public Key
                    </label>
                    <div className="relative">
                      <input
                        type={revealSupabaseAnon ? "text" : "password"}
                        value={supabaseAnonKey}
                        onChange={(e) => setSupabaseAnonKey(e.target.value)}
                        placeholder="Masukkan Public Anon Key"
                        className="w-full h-11 pl-4 pr-12 rounded-xl text-xs bg-white text-feminine-dark border border-feminine-dark/15 shadow-inner focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setRevealSupabaseAnon(!revealSupabaseAnon)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-feminine-dark/40 hover:text-feminine-accent"
                        title={revealSupabaseAnon ? "Sembunyikan" : "Tampilkan"}
                      >
                        {revealSupabaseAnon ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-feminine-dark/70 uppercase tracking-widest mb-1 pl-1">
                      Supabase Service Role Key (Database Admin Key)
                    </label>
                    <div className="relative">
                      <input
                        type={revealSupabaseService ? "text" : "password"}
                        value={supabaseServiceRoleKey}
                        onChange={(e) => setSupabaseServiceRoleKey(e.target.value)}
                        placeholder="Masukkan Service Role Key"
                        className="w-full h-11 pl-4 pr-12 rounded-xl text-xs bg-white text-feminine-dark border border-feminine-dark/15 shadow-inner focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setRevealSupabaseService(!revealSupabaseService)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-feminine-dark/40 hover:text-feminine-accent"
                        title={revealSupabaseService ? "Sembunyikan" : "Tampilkan"}
                      >
                        {revealSupabaseService ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {supabaseTestStatus.msg && (
                  <div className={`p-3 rounded-xl text-[11px] font-medium leading-relaxed border ${
                    supabaseTestStatus.success 
                      ? "bg-emerald-55 border-emerald-300 text-emerald-900" 
                      : "bg-rose-55 border-rose-300 text-rose-900"
                  }`}>
                    <p className="font-bold uppercase tracking-wider text-[9px] mb-0.5">
                      {supabaseTestStatus.success ? "✓ Test Sukses" : "✗ Gagal Hubungan"}
                    </p>
                    {supabaseTestStatus.msg}
                  </div>
                )}
              </div>

              {/* SAVE FORM ACTIONS */}
              <div className="pt-4 border-t border-feminine-dark/5 flex justify-end">
                <button
                  type="submit"
                  className="px-8 py-3 rounded-xl text-xs font-bold text-white bg-feminine-accent hover:bg-feminine-accent-hover shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Pengaturan API</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------- */}
      {/* 8. MY PROFILE VIEW */}
      {/* ----------------------------------------------- */}
      {activeMenu === "profile" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start animate-fadeIn">
          {/* LEFT COLUMN: EDIT FORM */}
          <div className="xl:col-span-8 bg-feminine-panel neu-panel-emboss border border-white p-6 md:p-8 rounded-[2rem_1.5rem_2.5rem_1.5rem] relative space-y-6">
            <div>
              <h2 className="text-xl font-black text-feminine-dark tracking-tight flex items-center gap-2">
                <User className="w-5 h-5 text-feminine-accent animate-pulse" />
                <span>My Profile Admin</span>
              </h2>
              <p className="text-xs text-feminine-dark/60 mt-1 leading-normal">
                Kustomisasikan seluruh data visual brand, logo, hak cipta rancangan ("Designed By"), serta data administratif kontak Anda secara dinamis.
              </p>
            </div>

            <form onSubmit={handleSaveProfileForm} className="space-y-6">
              {/* Profile Photo and Logo Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                {/* 1. Foto Profil Admin */}
                <div className="bg-white/65 p-4 rounded-2xl border border-feminine-dark/5 flex flex-col items-center justify-between text-center min-h-[220px] shadow-sm select-none">
                  <span className="text-[10px] font-extrabold uppercase text-feminine-dark/50 tracking-wider">Foto Profil Administrator</span>
                  
                  {profPhoto ? (
                    <div className="relative w-24 h-24 my-3 rounded-full border border-feminine-dark/10 overflow-hidden shadow-sm">
                      <img src={profPhoto} alt="Profil" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setProfPhoto("")}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-sm"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-feminine-rose/30 flex items-center justify-center text-feminine-accent border border-white my-3 shadow-inner">
                      <User className="w-8 h-8" />
                    </div>
                  )}

                  <input
                    type="file"
                    id="prof-avatar-file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={(e) => handleProfFileUpload(e, "photo")}
                  />

                  <button
                    type="button"
                    onClick={() => document.getElementById("prof-avatar-file")?.click()}
                    disabled={uploadingProfPhoto}
                    className="h-9 px-4 rounded-xl bg-feminine-rose text-feminine-accent border border-white text-xs font-bold shadow-sm active:scale-95 transition-all w-full flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {uploadingProfPhoto ? "Mengunggah..." : <>Pilih Berkas Foto</>}
                  </button>
                </div>

                {/* 2. Logo Perusahaan / Brand */}
                <div className="bg-white/65 p-4 rounded-2xl border border-feminine-dark/5 flex flex-col items-center justify-between text-center min-h-[220px] shadow-sm select-none">
                  <span className="text-[10px] font-extrabold uppercase text-feminine-dark/50 tracking-wider">Logo Perusahaan / Brand</span>
                  
                  {profCompanyLogo ? (
                    <div className="relative w-24 h-24 my-3 rounded-xl border border-feminine-dark/10 overflow-hidden shadow-sm bg-feminine-bg">
                      <img src={profCompanyLogo} alt="Logo Perusahaan/Brand" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setProfCompanyLogo("")}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-sm"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-feminine-rose/30 flex items-center justify-center text-feminine-accent border border-white my-3 shadow-inner">
                      <Upload className="w-8 h-8 animate-bounce" />
                    </div>
                  )}

                  <input
                    type="file"
                    id="prof-logo-file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={(e) => handleProfFileUpload(e, "logo")}
                  />

                  <button
                    type="button"
                    onClick={() => document.getElementById("prof-logo-file")?.click()}
                    disabled={uploadingProfLogo}
                    className="h-9 px-4 rounded-xl bg-feminine-rose text-feminine-accent border border-white text-xs font-bold shadow-sm active:scale-95 transition-all w-full flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {uploadingProfLogo ? "Mengunggah..." : <>Pilih Berkas Logo</>}
                  </button>
                </div>
              </div>

              {/* General Info Form inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-feminine-dark/60 uppercase tracking-widest pl-1 mb-1">Nama Lengkap Admin *</label>
                  <input
                    type="text"
                    required
                    value={profFullName}
                    onChange={(e) => setProfFullName(e.target.value)}
                    placeholder="Contoh: Niks Gara"
                    className="w-full h-11 px-4 text-xs rounded-xl bg-white text-feminine-dark border border-feminine-dark/15 shadow-sm focus:outline-none focus:ring-1 focus:ring-feminine-accent"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-feminine-dark/60 uppercase tracking-widest pl-1 mb-1">Email Kontak Admin *</label>
                  <input
                    type="email"
                    required
                    value={profEmail}
                    onChange={(e) => setProfEmail(e.target.value)}
                    placeholder="admin@brand.com"
                    className="w-full h-11 px-4 text-xs rounded-xl bg-white text-feminine-dark border border-feminine-dark/15 shadow-sm focus:outline-none focus:ring-1 focus:ring-feminine-accent"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-feminine-dark/60 uppercase tracking-widest pl-1 mb-1">Nama Aplikasi Kustom</label>
                  <input
                    type="text"
                    value={profAppName}
                    onChange={(e) => setProfAppName(e.target.value)}
                    placeholder="Contoh: Prompt By Niks"
                    className="w-full h-11 px-4 text-xs rounded-xl bg-white text-feminine-dark border border-feminine-dark/15 shadow-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-feminine-dark/60 uppercase tracking-widest pl-1 mb-1">Nama Perusahaan / Brand</label>
                  <input
                    type="text"
                    value={profBrandName}
                    onChange={(e) => setProfBrandName(e.target.value)}
                    placeholder="Contoh: Neumorph Art Studio"
                    className="w-full h-11 px-4 text-xs rounded-xl bg-white text-feminine-dark border border-feminine-dark/15 shadow-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-feminine-dark/60 uppercase tracking-widest pl-1 mb-1">Designed By (Copyright Label)</label>
                  <input
                    type="text"
                    value={profDesignedBy}
                    onChange={(e) => setProfDesignedBy(e.target.value)}
                    placeholder="Contoh: Gara Designer"
                    className="w-full h-11 px-4 text-xs rounded-xl bg-white text-feminine-dark border border-feminine-dark/15 shadow-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-feminine-dark/60 uppercase tracking-widest pl-1 mb-1">Nomor WhatsApp Admin</label>
                  <input
                    type="text"
                    value={profWhatsapp}
                    onChange={(e) => setProfWhatsapp(e.target.value)}
                    placeholder="Contoh: +628..."
                    className="w-full h-11 px-4 text-xs rounded-xl bg-white text-feminine-dark border border-feminine-dark/15 shadow-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-feminine-dark/60 uppercase tracking-widest pl-1 mb-1">Alamat Website</label>
                  <input
                    type="text"
                    value={profWebsite}
                    onChange={(e) => setProfWebsite(e.target.value)}
                    placeholder="https://google.com"
                    className="w-full h-11 px-4 text-xs rounded-xl bg-white text-feminine-dark border border-feminine-dark/15 shadow-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-feminine-dark/60 uppercase tracking-widest pl-1 mb-1">Tanggal Pembuatan Profil</label>
                  <input
                    type="text"
                    disabled
                    value={profCreatedAt ? new Date(profCreatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Belum Tersimpan"}
                    className="w-full h-11 px-4 text-xs rounded-xl bg-gray-100 text-gray-500 border border-gray-200 shadow-inner outline-none cursor-not-allowed select-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-feminine-dark/60 uppercase tracking-widest pl-1 mb-1">Bio Singkat Admin</label>
                <textarea
                  value={profBio}
                  onChange={(e) => setProfBio(e.target.value)}
                  placeholder="Deskripsikan riwayat atau bio singkat administrator ini..."
                  rows={2}
                  className="w-full p-4 text-xs rounded-xl bg-white text-feminine-dark border border-feminine-dark/15 shadow-sm focus:outline-none"
                />
              </div>

              {/* SAVE & RESET ACTIONS */}
              <div className="pt-4 border-t border-feminine-dark/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={handleResetProfileForm}
                  className="px-6 h-11 rounded-xl text-xs font-bold text-red-500 bg-red-50 border border-red-200 hover:bg-red-100 transition-all select-none cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reset Setelan Default</span>
                </button>

                <div className="flex gap-4 w-full sm:w-auto sm:justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-8 h-11 rounded-xl text-xs font-extrabold text-white bg-feminine-accent hover:bg-feminine-accent-hover shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
                  >
                    <Save className="w-4 h-4 animate-pulse" />
                    <span>{savingProfile ? "Menyimpan..." : "Update Profil Admin"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* RIGHT COLUMN: BRAND PREVIEW STICKER */}
          <div className="xl:col-span-4 space-y-6 sticky top-24">
            <span className="text-[10px] font-extrabold text-feminine-dark/40 uppercase tracking-widest pl-2 block">
              Pratinjau Kustomisasi Terkini
            </span>

            {/* Login branding component reproduction */}
            <div className="bg-feminine-bg border border-feminine-dark/10 p-6 rounded-[2rem_1rem_2rem_1rem] shadow-md select-none text-center space-y-4 font-sans max-w-sm mx-auto">
              <span className="text-[8px] font-black uppercase text-feminine-accent tracking-widest block">
                Tampilan Desain Halaman Login
              </span>

              <div className="w-16 h-16 mx-auto bg-feminine-rose rounded-2xl border border-white flex items-center justify-center text-feminine-accent shadow-sm overflow-hidden mt-2">
                {profCompanyLogo ? (
                  <img src={profCompanyLogo} alt="Logo" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <Sparkles className="w-8 h-8 text-feminine-accent animate-pulse" />
                )}
              </div>

              <div>
                <h3 className="text-lg font-black text-feminine-dark">
                  {profAppName || "Prompt By Niks"}
                </h3>
                <div className="text-[9px] font-bold text-feminine-dark/50 leading-none mt-1 uppercase tracking-wider">
                  Designed By {profDesignedBy || "Gara"}
                </div>
              </div>

              <div className="bg-white/50 p-3 rounded-xl border border-feminine-dark/5 space-y-2 text-left text-[10px] text-feminine-dark/65 font-medium leading-relaxed">
                <div>
                  <span className="text-feminine-dark font-bold text-[9px] uppercase block">Bio Administrator:</span>
                  <span className="italic">{profBio || "Tidak ada rincian bio singkat."}</span>
                </div>
                {profWebsite && (
                  <div className="text-[9px] text-feminine-accent underline truncate">
                    {profWebsite}
                  </div>
                )}
              </div>

              <div className="text-[9px] text-feminine-dark/35 font-semibold">
                © {new Date().getFullYear()} {profBrandName || "Neumorph Studio"} | Gated Authentication Gara
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
