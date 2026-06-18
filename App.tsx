import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogOut, Sparkles, User, Database, Ticket, Heart, Code2, Globe, Command, Compass, HelpCircle, ShieldCheck } from "lucide-react";
import Auth from "./components/Auth";
import SetupWizard from "./components/SetupWizard";
import RunningText from "./components/RunningText";
import PromptAnalyzer from "./components/PromptAnalyzer";
import MasterPromptEngine from "./components/MasterPromptEngine";
import UserDashboard from "./components/UserDashboard";
import AdminDashboard from "./components/AdminDashboard";
import ExternalGenerators from "./components/ExternalGenerators";

type MenuTab = "analyzer" | "master" | "playground" | "user-board" | "admin-board";

export default function App() {
  const [session, setSession] = useState<any | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<MenuTab>("analyzer");
  const [adminProfile, setAdminProfile] = useState<any | null>(null);
  const [systemState, setSystemState] = useState<any | null>(null);
  const [adminProfileLoaded, setAdminProfileLoaded] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  
  // Refresh ticker trigger
  const [refreshTicker, setRefreshTicker] = useState(0);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
      setCurrentPath(path);
    }
  };

  // Enforce URL path routing and lock security rules
  useEffect(() => {
    if (!adminProfileLoaded) return;

    const isSetupCompleted = !!systemState?.setup_completed;

    if (!isSetupCompleted) {
      // Setup not complete: Force URL pathname to /setup
      if (currentPath !== "/setup") {
        navigateTo("/setup");
      }
    } else {
      // Setup completed successfully: /setup route is locked permanently & can't be bypassed
      if (currentPath === "/setup") {
        navigateTo("/login");
      }

      if (!session) {
        // Unauthenticated users are strictly locked to /login
        if (currentPath !== "/login") {
          navigateTo("/login");
        }
      } else {
        // Authenticated users are navigated to the core dashboard / app view
        if (currentPath !== "/dashboard") {
          navigateTo("/dashboard");
        }
      }
    }
  }, [systemState, session, currentPath, adminProfileLoaded]);

  const fetchAdminProfile = async () => {
    try {
      console.log("[STARTUP] SETUP STATUS: Querying backend state...");
      const res = await fetch("/api/admin/profile");
      if (res.ok) {
        const data = await res.json();
        const sysState = data.systemState;
        
        console.log("SETUP LOADED: Data setup berhasil ditarik.");
        if (sysState) {
          console.log(`SETUP STATUS FOUND: setup_completed = ${sysState.setup_completed}, profile_completed = ${sysState.profile_completed}, database_connected = ${sysState.database_connected}`);
        } else {
          console.log("SETUP STATUS FOUND: system_state tidak ditemukan/kosong di database (null).");
        }
        
        const isCompleted = sysState ? !!sysState.setup_completed : false;
        const redirectTarget = isCompleted ? "Login Page (Auth)" : "Setup Wizard";
        console.log(`REDIRECT TARGET: ${redirectTarget}`);
        
        setAdminProfile(data.profile || null);
        setSystemState(sysState || null);
      }
    } catch (e) {
      console.error("Gagal memuat profil admin:", e);
    } finally {
      setAdminProfileLoaded(true);
    }
  };

  useEffect(() => {
    fetchAdminProfile();
  }, []);

  const handleSetupComplete = () => {
    fetchAdminProfile().then(() => {
      setSession(null);
      setCredits(0);
      setActiveTab("analyzer");
      triggerRunningTextUpdate();
    });
  };

  // Auto load demo session if not logged in to make experience seamless out-of-the-box
  // But requiring login first is extremely standard and beautiful
  const handleAuthSuccess = (data: { user: any; profile: any; credits: number }) => {
    setSession(data);
    setCredits(data.credits);
    fetchAdminProfile();
    // Greet admin with administrative panel default, user with analyzer
    setActiveTab(data.profile?.role === "super_admin" ? "admin-board" : "analyzer");
  };

  const handleLogout = () => {
    if (confirm("Apakah Anda yakin ingin keluar dari Prompt By Niks?")) {
      setSession(null);
      setCredits(0);
      setActiveTab("analyzer");
    }
  };

  const handleRefreshCredits = async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch(`/api/user/credits/${session.user.id}`);
      if (res.ok) {
        const data = await res.json();
        setCredits(data.balance);
      }
    } catch (e) {
      console.error("Gagal memperbarui saldo kredit:", e);
    }
  };

  const handleUpdateProfile = (newProfile: any) => {
    if (session) {
      setSession({
        ...session,
        profile: newProfile,
      });
    }
  };

  // Keep credit indicator polling smoothly for high-fidelity realtime experience
  useEffect(() => {
    if (session) {
      const interval = setInterval(handleRefreshCredits, 5000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const triggerRunningTextUpdate = () => {
    setRefreshTicker((prev) => prev + 1);
  };

  if (!adminProfileLoaded) {
    return (
      <div className="min-h-screen bg-feminine-bg flex items-center justify-center text-feminine-dark">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-feminine-rose rounded-xl mx-auto flex items-center justify-center border border-white text-feminine-accent animate-spin-slow shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="text-xs font-extrabold tracking-widest uppercase text-feminine-dark/70">Memuat Sistem...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-feminine-bg text-feminine-dark selection:bg-feminine-rose relative overflow-x-hidden flex flex-col justify-between">
      {/* HEADER BAR GARA NEUMORPHIC FEMININ DESIGN */}
      <header className="bg-white/80 backdrop-blur-md border-b border-feminine-dark/5 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-feminine-rose neu-emboss rounded-[0.9rem_0.6rem_1.1rem_0.7rem] flex items-center justify-center text-feminine-accent border border-white overflow-hidden">
              {adminProfile?.companyLogo ? (
                <img
                  src={adminProfile.companyLogo}
                  alt="Logo"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Sparkles className="w-5 h-5 text-feminine-accent animate-pulse" />
              )}
            </div>
            <div>
              <span className="font-extrabold text-md tracking-tight uppercase">
                {adminProfile?.appName ? (
                  <span>{adminProfile.appName}</span>
                ) : (
                  <>Prompt By <span className="text-feminine-accent">Niks</span></>
                )}
              </span>
              <div className="text-[9px] font-bold text-feminine-dark/50 leading-none">
                {adminProfile?.designedBy ? `Designed By ${adminProfile.designedBy}` : "Designed By Gara"}
              </div>
            </div>
          </div>

          {session ? (
            <div className="flex items-center gap-4">
              {/* Dynamic credits badge */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={handleRefreshCredits}
                className="px-3 py-1.5 bg-feminine-rose text-feminine-accent text-xs font-bold rounded-xl border border-white cursor-pointer select-none shadow-sm flex items-center gap-1.5 font-mono"
              >
                <div className="w-2 h-2 bg-feminine-accent rounded-full animate-ping" />
                <span>Kredit:</span>
                <span className="text-feminine-dark font-black">{credits}</span>
              </motion.div>

              {/* Avatar and Info */}
              <div className="hidden md:flex items-center gap-2">
                <img
                  src={session.profile?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${session.user.username}`}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full border border-feminine-accent/20 shadow-sm object-cover"
                />
                <div className="text-left text-xs font-semibold leading-none">
                  <div className="text-feminine-dark font-black">{session.profile?.fullName || session.user.username}</div>
                  <div className="text-[9px] text-feminine-dark/45 mt-0.5 uppercase tracking-wider">
                    {session.profile?.role === "super_admin" ? "Super Admin" : session.profile?.role === "admin" ? "Sistem Administrator" : "Premium Member"}
                  </div>
                </div>
              </div>

              {/* Logout tactile button */}
              <button
                onClick={handleLogout}
                className="p-2 bg-white hover:bg-feminine-rose/30 border border-feminine-dark/15 text-feminine-dark/65 hover:text-red-500 rounded-lg active:scale-95 transition-all text-xs font-bold"
                title="Keluar dari sistem"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-xs font-semibold text-feminine-dark/55 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-feminine-accent" />
              <span>Gated Auth Layer Online</span>
            </div>
          )}
        </div>
      </header>

      {/* DYNAMIC ANNOUNCEMENT TICKER */}
      <RunningText refreshTrigger={refreshTicker} />

      {/* MAIN CONTAINER */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {currentPath === "/setup" && !systemState?.setup_completed ? (
          <SetupWizard onComplete={handleSetupComplete} />
        ) : currentPath === "/login" || !session ? (
          <Auth onSuccess={handleAuthSuccess} adminProfile={adminProfile} />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            {/* LEFT NAVIGATION LINKS SYSTEM - GARA'S PREMIUM NEUMORPHIC 4D ASYMMETRICAL CARDS */}
            <div className="xl:col-span-3 space-y-4">
              <span className="text-[10px] font-black text-feminine-dark/40 uppercase tracking-widest pl-2">
                Menu Navigasi 4D
              </span>

              <div className="grid grid-cols-2 xl:grid-cols-1 gap-4">
                {/* 1. Prompt Analyzer Link */}
                <button
                  onClick={() => setActiveTab("analyzer")}
                  className={`w-full p-4 text-left rounded-[1.8rem_1rem_2.2rem_1.2rem] transition-all border outline-none ${
                    activeTab === "analyzer"
                      ? "bg-white border-feminine-accent text-feminine-accent shadow-md md:shadow-lg translate-y-[-1px]"
                      : "bg-white border-white text-feminine-dark hover:border-feminine-rose shadow-sm"
                  }`}
                  style={{ boxShadow: activeTab === "analyzer" ? "5px 5px 12px #dfccd0, -5px -5px 12px #ffffff" : undefined }}
                >
                  <div className="w-8 h-8 rounded-xl bg-feminine-rose border border-white flex items-center justify-center mb-2 shadow-sm text-feminine-accent">
                    <Compass className="w-4 h-4 animate-spin-slow" />
                  </div>
                  <div className="text-xs font-extrabold uppercase tracking-wide">Prompt Analyzer</div>
                  <div className="text-[10px] text-feminine-dark/50 mt-0.5 leading-tight font-medium">Ulas Foto, Video, Web</div>
                </button>

                {/* 2. Master Prompt Engine Link */}
                <button
                  onClick={() => setActiveTab("master")}
                  className={`w-full p-4 text-left rounded-[1.2rem_1.8rem_1rem_2.2rem] transition-all border outline-none ${
                    activeTab === "master"
                      ? "bg-white border-feminine-accent text-feminine-accent shadow-md md:shadow-lg translate-y-[-1px]"
                      : "bg-white border-white text-feminine-dark hover:border-feminine-rose shadow-sm"
                  }`}
                  style={{ boxShadow: activeTab === "master" ? "5px 5px 12px #dfccd0, -5px -5px 12px #ffffff" : undefined }}
                >
                  <div className="w-8 h-8 rounded-xl bg-feminine-rose border border-white flex items-center justify-center mb-2 shadow-sm text-feminine-accent">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-extrabold uppercase tracking-wide">Formula Master</div>
                  <div className="text-[10px] text-feminine-dark/50 mt-0.5 leading-tight font-medium">Buat Kode Parameter</div>
                </button>

                {/* 3. External Generation link */}
                <button
                  onClick={() => setActiveTab("playground")}
                  className={`w-full p-4 text-left rounded-[2rem_1.2rem_1.8rem_1.4rem] transition-all border outline-none ${
                    activeTab === "playground"
                      ? "bg-white border-feminine-accent text-feminine-accent shadow-md md:shadow-lg translate-y-[-1px]"
                      : "bg-white border-white text-feminine-dark hover:border-feminine-rose shadow-sm"
                  }`}
                  style={{ boxShadow: activeTab === "playground" ? "5px 5px 12px #dfccd0, -5px -5px 12px #ffffff" : undefined }}
                >
                  <div className="w-8 h-8 rounded-xl bg-feminine-rose border border-white flex items-center justify-center mb-2 shadow-sm text-feminine-accent">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-extrabold uppercase tracking-wide">Generator AI</div>
                  <div className="text-[10px] text-feminine-dark/50 mt-0.5 leading-tight font-medium">Grup Canvas Seni Gambar</div>
                </button>

                {/* 4. User settings claims */}
                <button
                  onClick={() => setActiveTab("user-board")}
                  className={`w-full p-4 text-left rounded-[1.4rem_2rem_1.2rem_1.8rem] transition-all border outline-none ${
                    activeTab === "user-board"
                      ? "bg-white border-feminine-accent text-feminine-accent shadow-md md:shadow-lg translate-y-[-1px]"
                      : "bg-white border-white text-feminine-dark hover:border-feminine-rose shadow-sm"
                  }`}
                  style={{ boxShadow: activeTab === "user-board" ? "5px 5px 12px #dfccd0, -5px -5px 12px #ffffff" : undefined }}
                >
                  <div className="w-8 h-8 rounded-xl bg-feminine-rose border border-white flex items-center justify-center mb-2 shadow-sm text-feminine-accent">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-extrabold uppercase tracking-wide">Klaim Kredit</div>
                  <div className="text-[10px] text-feminine-dark/50 mt-0.5 leading-tight font-medium">Buku Profil & Voucher</div>
                </button>

                {/* 5. GATED ADMIN CONSOLE PANEL (RBAC checks) */}
                {session?.profile?.role === "super_admin" && (
                  <button
                    onClick={() => setActiveTab("admin-board")}
                    className={`col-span-2 xl:col-span-1 w-full p-4 text-left rounded-[1.5rem_1.5rem_2.5rem_1.5rem] transition-all border outline-none ${
                      activeTab === "admin-board"
                        ? "bg-white border-red-400 text-red-500 shadow-md md:shadow-lg translate-y-[-1px]"
                        : "bg-feminine-rose/30 border-feminine-rose text-red-700 hover:border-red-300 shadow-sm"
                    }`}
                    style={{ boxShadow: activeTab === "admin-board" ? "5px 5px 12px #fac9cf, -5px -5px 12px #ffffff" : undefined }}
                  >
                    <div className="w-8 h-8 rounded-xl bg-white border border-red-200 flex items-center justify-center mb-2 shadow-sm text-red-500">
                      <Database className="w-4 h-4 animate-bounce" />
                    </div>
                    <div className="text-xs font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                      <span>Dasbor Admin</span>
                      <span className="px-1.5 py-0.5 bg-red-400 text-white rounded text-[8px] font-bold font-sans">CONTROL</span>
                    </div>
                    <div className="text-[10px] text-feminine-dark/50 mt-0.5 leading-tight font-medium">Live logs, Tokenizer, Sandbox</div>
                  </button>
                )}
              </div>
            </div>

            {/* RIGHT WORKSPACE CONSOLE VIEWPORT SLOT */}
            <div className="xl:col-span-9" id="workspace_viewport">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {activeTab === "analyzer" && (
                    <PromptAnalyzer
                      userId={session.user.id}
                      userCredits={credits}
                      onRefreshCredits={handleRefreshCredits}
                    />
                  )}

                  {activeTab === "master" && (
                    <MasterPromptEngine
                      userId={session.user.id}
                      userCredits={credits}
                      onRefreshCredits={handleRefreshCredits}
                    />
                  )}

                  {activeTab === "playground" && (
                    <ExternalGenerators
                      userId={session.user.id}
                      userCredits={credits}
                      onRefreshCredits={handleRefreshCredits}
                    />
                  )}

                  {activeTab === "user-board" && (
                    <UserDashboard
                      userSession={session}
                      userCredits={credits}
                      onRefreshCredits={handleRefreshCredits}
                      onUpdateSessionProfile={handleUpdateProfile}
                    />
                  )}

                  {activeTab === "admin-board" && session?.profile?.role === "super_admin" && (
                    <AdminDashboard 
                      onRefreshRunningText={triggerRunningTextUpdate} 
                      userSession={session}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* STARTUP DEBUG PANEL - restricted to super_admin as per requirement 7 */}
      {session?.profile?.role === "super_admin" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4 w-full relative z-10">
          <div className="bg-white/90 border border-feminine-accent/10 rounded-2xl p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-feminine-dark/5 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
                <span className="text-[11px] font-black uppercase text-feminine-dark/70 tracking-widest font-sans">
                  🎛️ Startup & DB Debugger Panel
                </span>
              </div>
              <span className="text-[10px] font-mono text-feminine-dark/40 bg-feminine-rose/40 px-2 py-0.5 rounded-full font-bold">
                Single Source of Truth: Supabase / PostgreSQL DB
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-semibold">
              <div className="bg-feminine-rose/10 p-3 rounded-xl border border-feminine-rose/25">
                <div className="text-[9px] text-feminine-dark/45 uppercase font-bold">Setup Status:</div>
                <div className="font-mono text-xs font-extrabold mt-0.5 text-feminine-accent flex items-center gap-1.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${systemState?.setup_completed ? "bg-green-500" : "bg-yellow-500"}`} />
                  {systemState?.setup_completed ? "FINISHED (True)" : "PENDING (False)"}
                </div>
              </div>
              <div className="bg-feminine-rose/10 p-3 rounded-xl border border-feminine-rose/25">
                <div className="text-[9px] text-feminine-dark/45 uppercase font-bold">Profile Status:</div>
                <div className="font-mono text-xs font-extrabold mt-0.5 text-feminine-accent flex items-center gap-1.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${adminProfile?.profileCompleted ? "bg-green-500" : "bg-yellow-500"}`} />
                  {adminProfile?.profileCompleted ? "COMPLETED (True)" : "NOT COMPLETED (False)"}
                </div>
              </div>
              <div className="bg-feminine-rose/10 p-3 rounded-xl border border-feminine-rose/25">
                <div className="text-[9px] text-feminine-dark/45 uppercase font-bold">Database Status:</div>
                <div className="font-mono text-xs font-extrabold mt-0.5 text-feminine-accent flex items-center gap-1.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${systemState?.database_connected ? "bg-green-500" : "bg-red-500"}`} />
                  {systemState?.database_connected ? "CONNECTED (Supabase)" : "DISCONNECTED (Local FS)"}
                </div>
              </div>
              <div className="bg-feminine-rose/10 p-3 rounded-xl border border-feminine-rose/25">
                <div className="text-[9px] text-feminine-dark/45 uppercase font-bold">Current Route / State:</div>
                <div className="font-mono text-xs font-extrabold mt-0.5 text-feminine-accent">
                  {!systemState?.setup_completed ? (
                    <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Setup Wizard</span>
                  ) : !session ? (
                    <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Login Page (Auth)</span>
                  ) : (
                    <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{`Dashboard - Tab [${activeTab.toUpperCase()}]`}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-feminine-dark/50">
              <span>Status logs dikoordinasikan secara real-time via REST endpoints & direct database queries.</span>
              <button 
                onClick={async () => {
                  if (confirm("Peringatan: Tindakan ini akan menghapus profile lokal dan mereset status setup_completed. Lanjutkan ke Setup Wizard kembali?")) {
                    try {
                      const res = await fetch("/api/admin/database/reset-setup-wizard", { 
                        method: "POST", 
                        headers: {
                          "Content-Type": "application/json",
                          "x-user-id": session.user.id
                        }
                      });
                      const dat = await res.json();
                      if (dat.success) {
                        alert(dat.message);
                        window.location.href = "/setup";
                      } else {
                        alert(dat.error || "Gagal mereset status setup.");
                      }
                    } catch (e) {
                      alert("Gagal mereset setup wizard.");
                    }
                  }
                }}
                className="font-extrabold text-[9px] text-red-500 hover:underline uppercase tracking-wide cursor-pointer ml-auto bg-transparent border-0 outline-none"
              >
                ⚠️ Reset Setup Wizard & Data Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER COZY BRAND GARA */}
      <footer className="bg-white/45 py-6 border-t border-feminine-dark/5 mt-12 text-center text-xs text-feminine-dark/45 select-none relative z-10 font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <span>{adminProfile?.appName ? adminProfile.appName.toUpperCase() : "PROMPT BY NIKS"}</span>
            <span>★</span>
            <span className="font-bold text-feminine-dark">
              {adminProfile?.designedBy ? `Designed By ${adminProfile.designedBy}` : "Designed By Gara"}
            </span>
          </div>
          <div>
            100% Premium Neumorphism 4D | Dilengkapi Real-Time Gemini AI & Supabase Systems
          </div>
          <div className="flex items-center gap-1 text-[10px] text-feminine-dark/35">
            <span>Versi Produksi 1.0.0</span>
            <span>-</span>
            <span>ID: {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
