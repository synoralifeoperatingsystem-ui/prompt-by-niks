import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { User, Ticket, Award, RefreshCw, Compass, Edit3, Save, Phone, Mail, BookOpen, UserCheck } from "lucide-react";

interface UserDashboardProps {
  userSession: any;
  userCredits: number;
  onRefreshCredits: () => void;
  onUpdateSessionProfile: (profile: any) => void;
}

export default function UserDashboard({
  userSession,
  userCredits,
  onRefreshCredits,
  onUpdateSessionProfile,
}: UserDashboardProps) {
  const [activeMenu, setActiveMenu] = useState<"profile" | "redeem" | "credits">("redeem");
  
  // Profile Form States
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Redeem token voucher state
  const [voucherCode, setVoucherCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (userSession?.profile) {
      const p = userSession.profile;
      setFullName(p.fullName || "");
      setPhone(p.phone || "");
      setBio(p.bio || "");
      setAvatarUrl(p.avatarUrl || "");
    }
  }, [userSession]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      const res = await fetch("/api/user/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userSession.user.id,
          fullName,
          phone,
          bio,
          avatarUrl,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onUpdateSessionProfile(data.profile);
        alert("Profil berhasil diperbarui!");
      } else {
        alert(data.error || "Gagal memperbarui profil.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleRedeemVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    
    if (!voucherCode.trim()) {
      setErrorMsg("Kode voucher wajib diisi.");
      return;
    }

    setRedeeming(true);
    try {
      const res = await fetch("/api/user/tokens/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userSession.user.id,
          code: voucherCode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menukarkan voucher.");

      setSuccessMsg(`Berhasil! Akun Anda memperoleh tambahan +${data.redeemedCredits} kredit gratis.`);
      setVoucherCode("");
      onRefreshCredits();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto" id="user_dashboard_module">
      {/* Neumorphic Tab Controller */}
      <div className="flex bg-feminine-bg p-2 rounded-2xl shadow-inner border border-feminine-dark/5 gap-2 max-w-md mx-auto">
        <button
          onClick={() => setActiveMenu("redeem")}
          className={`flex-1 py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all duration-300 ${
            activeMenu === "redeem"
              ? "bg-white text-feminine-accent shadow-md border border-white"
              : "text-feminine-dark/60 hover:text-feminine-dark"
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>AKTIVASI TOKEN</span>
        </button>
        <button
          onClick={() => setActiveMenu("profile")}
          className={`flex-1 py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all duration-300 ${
            activeMenu === "profile"
              ? "bg-white text-feminine-accent shadow-md border border-white"
              : "text-feminine-dark/60 hover:text-feminine-dark"
          }`}
        >
          <User className="w-4 h-4" />
          <span>PROFIL SAYA</span>
        </button>
        <button
          onClick={() => setActiveMenu("credits")}
          className={`flex-1 py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all duration-300 ${
            activeMenu === "credits"
              ? "bg-white text-feminine-accent shadow-md border border-white"
              : "text-feminine-dark/60 hover:text-feminine-dark"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>KREDIT SAYA</span>
        </button>
      </div>

      {/* ----------------------------------------------- */}
      {/* 1. TOKENS ACTIVATOR REDEEM FORM */}
      {/* ----------------------------------------------- */}
      {activeMenu === "redeem" && (
        <div className="bg-white rounded-[2rem_1.5rem_2.5rem_1.5rem] p-6 lg:p-8 border border-white/60 neu-panel-emboss max-w-lg mx-auto animate-fadeIn relative">
          <h3 className="text-md font-bold text-feminine-dark uppercase tracking-wider text-feminine-accent border-b border-feminine-rose/50 pb-3 mb-5 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-feminine-accent" />
            <span>Klaim Voucher & Aktivasi Kredit</span>
          </h3>

          {errorMsg && (
            <div className="bg-red-50 text-red-600 text-xs px-3.5 py-2.5 rounded-xl mb-4 border border-red-100 font-medium font-sans">
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 text-emerald-700 text-xs px-3.5 py-2.5 rounded-xl mb-4 border border-emerald-100 font-medium">
              🎉 {successMsg}
            </div>
          )}

          <form onSubmit={handleRedeemVoucher} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-feminine-dark/70 uppercase tracking-wider mb-2 pl-1">
                Masukkan Kode Voucher Token Anda
              </label>
              <input
                type="text"
                required
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                placeholder="Contoh: NIKS-4D-GOLD atau GARA-PREMIUM-ART"
                className="w-full h-12 px-4 rounded-xl text-sm bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-[inset_3px_3px_6px_#dfccd0,inset_-3px_-3px_6px_#ffffff] focus:outline-none focus:ring-1 focus:ring-feminine-accent/40 font-mono font-bold uppercase tracking-wider"
              />
              <p className="text-[10px] text-feminine-dark/45 mt-1.5 pl-1 leading-relaxed">
                *Token voucher dikoordinasikan langsung oleh Administrator sistem (Admin Niks). Anda dapat menyalin voucher aktif yang terpampang di dasbor admin untuk keperluan demonstrasi pengujian!
              </p>
            </div>

            <button
              type="submit"
              disabled={redeeming}
              className="w-full h-12 rounded-xl text-sm font-semibold select-none text-white bg-feminine-accent hover:bg-feminine-accent-hover active:bg-feminine-accent neu-btn-rose-emboss cursor-pointer flex items-center justify-center gap-2 transform transition-all active:scale-[0.98]"
            >
              {redeeming ? "Menukarkan..." : "Klaim Kredit Tambahan"}
            </button>
          </form>
        </div>
      )}

      {/* ----------------------------------------------- */}
      {/* 2. PROFILES EDIT VIEW */}
      {/* ----------------------------------------------- */}
      {activeMenu === "profile" && (
        <form onSubmit={handleUpdateProfile} className="bg-white rounded-[2rem_1.5rem_2.5rem_1.5rem] p-6 lg:p-8 border border-white/60 neu-panel-emboss max-w-xl mx-auto animate-fadeIn space-y-6">
          <div className="flex items-center gap-4 border-b border-feminine-rose/50 pb-4 mb-2">
            <img
              src={avatarUrl || "https://api.dicebear.com/7.x/adventurer/svg?seed=niks"}
              alt="Avatar profil"
              className="w-16 h-16 rounded-[1.2rem_0.8rem_1.4rem_0.9rem] object-cover neu-emboss p-1 border border-white"
            />
            <div>
              <h3 className="text-md font-bold text-feminine-dark flex items-center gap-1.5">
                <UserCheck className="w-5 h-5 text-feminine-accent" />
                <span>Ubah Detail Profil Anggota</span>
              </h3>
              <p className="text-xs text-feminine-dark/55">@{userSession?.user?.username} ({userSession?.user?.role})</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-feminine-dark/70 uppercase pl-1 tracking-wider mb-2">
                Nama Lengkap
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-11 px-4 rounded-xl text-sm bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-inner focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-feminine-dark/70 uppercase pl-1 tracking-wider mb-2">
                Nomor Handphone (Telepon)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+62..."
                className="w-full h-11 px-4 rounded-xl text-sm bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-inner focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-feminine-dark/70 uppercase pl-1 tracking-wider mb-2">
              URL Link Foto Profil (Avatar)
            </label>
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://images.unsplash..."
              className="w-full h-11 px-4 rounded-xl text-xs bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-inner focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-feminine-dark/70 uppercase pl-1 tracking-wider mb-2">
              Biografi Singkat
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Ceritakan ketertarikan Anda dalam prompt engineering..."
              className="w-full h-24 p-3 rounded-xl text-sm bg-feminine-bg text-feminine-dark border border-feminine-dark/5 shadow-[inset_2px_2px_4px_#dfccd0,inset_-2px_-2px_4px_#ffffff] focus:outline-none focus:ring-1 focus:ring-feminine-accent/40 resize-none font-medium leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={updatingProfile}
            className="w-full h-12 rounded-xl text-sm font-semibold select-none text-white bg-feminine-accent hover:bg-feminine-accent-hover active:bg-feminine-accent neu-btn-rose-emboss cursor-pointer flex items-center justify-center gap-2 transform transition-all active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            <span>{updatingProfile ? "Menyimpan data..." : "Perbarui Akun Profil"}</span>
          </button>
        </form>
      )}

      {/* ----------------------------------------------- */}
      {/* 3. CREDITS BALANCES MATRIX DISPLAY */}
      {/* ----------------------------------------------- */}
      {activeMenu === "credits" && (
        <div className="bg-white rounded-[2rem_1.5rem_2.5rem_1.5rem] p-6 lg:p-8 border border-white/60 neu-panel-emboss max-w-lg mx-auto animate-fadeIn relative text-center">
          <h3 className="text-md font-bold text-feminine-dark uppercase tracking-wider text-feminine-accent border-b border-feminine-rose/50 pb-3 mb-6 flex items-center justify-center gap-2">
            <Award className="w-5 h-5 text-feminine-accent animate-pulse" />
            <span>Kalkulator & Informasi Saldo</span>
          </h3>

          <div className="w-32 h-32 mx-auto bg-feminine-rose rounded-full flex flex-col items-center justify-center border border-white neu-emboss relative mb-4">
            <span className="text-[10px] font-bold text-feminine-dark/45 uppercase tracking-wider">Saldo Aktif</span>
            <span className="text-3xl font-black text-feminine-dark">{userCredits}</span>
            <span className="text-[10px] font-bold text-feminine-accent">Kredit</span>
          </div>

          <p className="text-xs text-feminine-dark/65 max-w-sm mx-auto leading-relaxed mb-6">
            Setiap pendaftaran baru diberikan modal awal sebesar <strong className="text-feminine-dark">50 kredit</strong>. Anda dapat mengisinya menggunakan voucher token dari administrator.
          </p>

          <div className="text-left bg-feminine-bg p-4 rounded-xl border border-feminine-dark/5 text-xs font-semibold space-y-2 max-w-xs mx-auto">
            <div className="flex justify-between">
              <span className="text-feminine-dark/65">Analisis Prompt Multi-Modal</span>
              <span className="text-red-500">-10 Kredit</span>
            </div>
            <div className="flex justify-between">
              <span className="text-feminine-dark/65">Formula Master Prompt</span>
              <span className="text-red-500">-5 Kredit</span>
            </div>
            <div className="flex justify-between">
              <span className="text-feminine-dark/65">Generator Gambar AI</span>
              <span className="text-red-500">-15 Kredit</span>
            </div>
            <div className="flex justify-between">
              <span className="text-feminine-dark/65">Generator Video AI (Pika/Sora)</span>
              <span className="text-red-500">-30 Kredit</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
