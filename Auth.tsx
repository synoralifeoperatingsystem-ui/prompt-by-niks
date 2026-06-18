import React, { useState } from "react";
import { motion } from "motion/react";
import { Eye, EyeOff, UserPlus, LogIn, Key, Sparkles, Heart } from "lucide-react";

interface AuthProps {
  onSuccess: (data: { user: any; profile: any; credits: number }) => void;
  adminProfile?: any;
}

export default function Auth({ onSuccess, adminProfile }: AuthProps) {
  const [view, setView] = useState<"login" | "register" | "forgot">("login");
  
  // Login State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  // Register State
  const [regUsername, setRegUsername] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  
  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const resetMessages = () => {
    setError(null);
    setInfo(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      console.log("[Auth API] Initiating POST /api/auth/login", { username });
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      console.log(`[Auth API] Response status: ${res.status} ${res.statusText}`);
      const headersObj: Record<string, string> = {};
      res.headers.forEach((val, key) => { headersObj[key] = val; });
      console.log("[Auth API] Response headers:", headersObj);

      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        const textBody = await res.text();
        console.error("[Auth API] Expected application/json format but received content body:", textBody);
        throw new Error(`Server returned HTML/Text instead of JSON (Status ${res.status}). Body snippet: ${textBody.substring(0, 300)}`);
      }

      const data = await res.json();
      console.log("[Auth API] Received login metadata response:", data);

      if (!res.ok) throw new Error(data.error || "Gagal masuk.");

      onSuccess(data);
    } catch (err: any) {
      console.error("[Auth API] Error in login endpoint:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      console.log("[Auth API] Initiating POST /api/auth/register", { regUsername, regEmail, regFullName });
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername,
          email: regEmail,
          password: regPassword,
          fullName: regFullName,
        }),
      });

      console.log(`[Auth API] Response status: ${res.status} ${res.statusText}`);
      const headersObj: Record<string, string> = {};
      res.headers.forEach((val, key) => { headersObj[key] = val; });
      console.log("[Auth API] Response headers:", headersObj);

      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        const textBody = await res.text();
        console.error("[Auth API] Expected application/json format but received content body:", textBody);
        throw new Error(`Server returned HTML/Text instead of JSON (Status ${res.status}). Body snippet: ${textBody.substring(0, 300)}`);
      }

      const data = await res.json();
      console.log("[Auth API] Received registration response:", data);

      if (!res.ok) {
        throw new Error(data.error || data.message || "Gagal registrasi.");
      }

      setInfo("Registrasi berhasil! Silakan masuk menggunakan akun baru Anda.");
      setUsername(regUsername);
      setPassword(regPassword);
      setView("login");
    } catch (err: any) {
      console.error("[Auth API] Error in registration endpoint:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      console.log("[Auth API] Initiating POST /api/auth/forgot-password", { forgotEmail });
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });

      console.log(`[Auth API] Response status: ${res.status} ${res.statusText}`);
      const headersObj: Record<string, string> = {};
      res.headers.forEach((val, key) => { headersObj[key] = val; });
      console.log("[Auth API] Response headers:", headersObj);

      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        const textBody = await res.text();
        console.error("[Auth API] Expected application/json format but received content body:", textBody);
        throw new Error(`Server returned HTML/Text instead of JSON (Status ${res.status}). Body snippet: ${textBody.substring(0, 300)}`);
      }

      const data = await res.json();
      console.log("[Auth API] Received forgot password response:", data);

      if (!res.ok) throw new Error(data.error || "Kesalahan proses.");

      setInfo(data.message);
    } catch (err: any) {
      console.error("[Auth API] Error in forgot password endpoint:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center relative p-6 overflow-hidden">
      {/* Premium organic floating shapes for 4D background visual depth */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          x: [0, 40, 0],
          y: [0, -30, 0],
          rotate: [0, 180, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute -top-16 -left-16 w-80 h-80 bg-feminine-rose rounded-full mix-blend-multiply filter blur-xl opacity-50"
      />
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          x: [0, -50, 0],
          y: [0, 50, 0],
          rotate: [0, -180, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-24 -right-24 w-96 h-96 bg-feminine-lilac rounded-full mix-blend-multiply filter blur-xl opacity-50"
      />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Logo Card is an abstract asymmetrically bounded neumorphism visual banner */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 mx-auto bg-feminine-rose neu-emboss rounded-[2rem_1rem_2.5rem_1rem] flex items-center justify-center text-feminine-accent mb-4 border border-white/40 overflow-hidden"
          >
            {adminProfile?.companyLogo ? (
              <img
                src={adminProfile.companyLogo}
                alt="Logo"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <Sparkles className="w-10 h-10 animate-pulse text-feminine-accent" />
            )}
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight text-feminine-dark">
            {adminProfile?.appName ? (
              <span>{adminProfile.appName}</span>
            ) : (
              <>Prompt By <span className="text-feminine-accent">Niks</span></>
            )}
          </h1>
          <p className="text-xs font-semibold text-feminine-dark/60 tracking-wider uppercase mt-1 flex items-center justify-center gap-1">
            {adminProfile?.designedBy ? (
              <span>Designed By {adminProfile.designedBy}</span>
            ) : (
              <>
                <span>Designed By</span>
                <Heart className="w-3 h-3 fill-feminine-accent text-feminine-accent inline" />
                <span className="font-bold text-feminine-dark">Gara</span>
              </>
            )}
          </p>
        </div>

        {/* Action Container Card: Organic asymmetric, double layer shadows */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-feminine-panel neu-panel-emboss rounded-[2rem_1.5rem_2.5rem_1.5rem] p-8 mt-2 border border-white/60 relative"
          id="auth_form_container"
        >
          {/* Header Switcher */}
          <div className="flex bg-feminine-bg/80 p-1.5 rounded-2xl mb-6 shadow-inner border border-feminine-dark/5">
            <button
              onClick={() => { setView("login"); resetMessages(); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                view === "login"
                  ? "bg-white text-feminine-accent shadow-sm border border-white"
                  : "text-feminine-dark/60 hover:text-feminine-dark"
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk</span>
            </button>
            <button
              onClick={() => { setView("register"); resetMessages(); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                view === "register"
                  ? "bg-white text-feminine-accent shadow-sm border border-white"
                  : "text-feminine-dark/60 hover:text-feminine-dark"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Register</span>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs px-4 py-2.5 rounded-xl mb-4 border border-red-100 font-medium">
              ⚠️ {error}
            </div>
          )}

          {info && (
            <div className="bg-emerald-50 text-emerald-700 text-xs px-4 py-2.5 rounded-xl mb-4 border border-emerald-100 font-medium">
              💡 {info}
            </div>
          )}

          {/* LOGIN VIEW */}
          {view === "login" && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-feminine-dark/70 uppercase tracking-wider mb-2 pl-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin atau gara atau username baru"
                  className="w-full h-12 px-4 rounded-xl text-sm bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-[inset_3px_3px_6px_#dfccd0,inset_-3px_-3px_6px_#ffffff] focus:outline-none focus:ring-1 focus:ring-feminine-accent/40"
                />
              </div>

              <div>
                <div className="flex justify-between mb-2 px-1">
                  <label className="text-xs font-semibold text-feminine-dark/70 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setView("forgot"); resetMessages(); }}
                    className="text-xs text-feminine-accent hover:underline font-semibold"
                  >
                    Lupa Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="admin123 atau user123"
                    className="w-full h-12 pl-4 pr-11 rounded-xl text-sm bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-[inset_3px_3px_6px_#dfccd0,inset_-3px_-3px_6px_#ffffff] focus:outline-none focus:ring-1 focus:ring-feminine-accent/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-feminine-dark/40 hover:text-feminine-dark/70"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl text-sm font-semibold select-none text-white bg-feminine-accent hover:bg-feminine-accent-hover active:bg-feminine-accent neu-btn-rose-emboss cursor-pointer flex items-center justify-center gap-2 transform transition-all active:scale-[0.98]"
              >
                {loading ? "Menghubungkan..." : "Masuk Aplikasi"}
              </button>
              
              {(!adminProfile || !adminProfile.profileCompleted) && (
                <div className="bg-feminine-bg/50 p-3 rounded-lg border border-feminine-dark/5 text-[11px] text-feminine-dark/60 text-center leading-relaxed">
                  Tip Demo: Gunakan akun Administrator: <strong className="text-feminine-dark">admin</strong> / password: <strong className="text-feminine-dark">admin123</strong>, atau akun desainer: <strong className="text-feminine-dark">gara</strong> / <strong className="text-feminine-dark">user123</strong>.
                </div>
              )}
            </form>
          )}

          {/* REGISTER VIEW */}
          {view === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-feminine-dark/70 uppercase tracking-wider mb-2 pl-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="Contoh: Niks Gara"
                  className="w-full h-11 px-4 rounded-xl text-sm bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-[inset_3px_3px_6px_#dfccd0,inset_-3px_-3px_6px_#ffffff] focus:outline-none focus:ring-1 focus:ring-feminine-accent/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-feminine-dark/70 uppercase tracking-wider mb-2 pl-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="Contoh: niksgara"
                  className="w-full h-11 px-4 rounded-xl text-sm bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-[inset_3px_3px_6px_#dfccd0,inset_-3px_-3px_6px_#ffffff] focus:outline-none focus:ring-1 focus:ring-feminine-accent/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-feminine-dark/70 uppercase tracking-wider mb-2 pl-1">
                  Alamat Email
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="email@domain.com"
                  className="w-full h-11 px-4 rounded-xl text-sm bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-[inset_3px_3px_6px_#dfccd0,inset_-3px_-3px_6px_#ffffff] focus:outline-none focus:ring-1 focus:ring-feminine-accent/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-feminine-dark/70 uppercase tracking-wider mb-2 pl-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Buat sandi aman"
                  className="w-full h-11 px-4 rounded-xl text-sm bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-[inset_3px_3px_6px_#dfccd0,inset_-3px_-3px_6px_#ffffff] focus:outline-none focus:ring-1 focus:ring-feminine-accent/40"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl text-sm font-semibold text-white bg-feminine-accent hover:bg-feminine-accent-hover active:bg-feminine-accent neu-btn-rose-emboss cursor-pointer flex items-center justify-center gap-2 transform transition-all active:scale-[0.98] mt-2"
              >
                {loading ? "Mendaftar..." : "Daftar Akun Baru"}
              </button>
            </form>
          )}

          {/* FORGOT VIEW */}
          {view === "forgot" && (
            <form onSubmit={handleForgot} className="space-y-5">
              <div className="text-center text-xs text-feminine-dark/70 mb-2 leading-relaxed">
                Masukkan alamat email yang terdaftar. Kami akan mencarikan kredensial password Anda dari sistem database secara langsung.
              </div>

              <div>
                <label className="block text-xs font-semibold text-feminine-dark/70 uppercase tracking-wider mb-2 pl-1">
                  Alamat Email Terdaftar
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="email@domain.com"
                  className="w-full h-12 px-4 rounded-xl text-sm bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-[inset_3px_3px_6px_#dfccd0,inset_-3px_-3px_6px_#ffffff] focus:outline-none focus:ring-1 focus:ring-feminine-accent/40"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl text-sm font-semibold text-white bg-feminine-accent hover:bg-feminine-accent-hover active:bg-feminine-accent neu-btn-rose-emboss cursor-pointer flex items-center justify-center gap-2 transform transition-all active:scale-[0.98]"
              >
                {loading ? "Mengirim..." : "Dapatkan Link Skenario"}
              </button>

              <button
                type="button"
                onClick={() => { setView("login"); resetMessages(); }}
                className="w-full text-center text-xs text-feminine-accent font-semibold hover:underline mt-2 block"
              >
                Kembali ke Login
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
