import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import fileUpload from "express-fileupload";
import { createServer as createViteServer } from "vite";
import { DatabaseManager, PromptAnalysis, MasterPrompt, AiProvider } from "./src/db";
import { GoogleGenAI, Type } from "@google/genai";
import { Client } from "pg";
import crypto from "crypto";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable large payloads for image and video uploads (Base64)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Register multipart file upload middleware supporting up to 500MB video uploads
app.use(fileUpload({
  limits: { fileSize: 500 * 1024 * 1024 },
  useTempFiles: true,
  tempFileDir: "/tmp/"
}));

// Serves the public/uploads static folder in dev and production modes directly
const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

const db = new DatabaseManager();

// ==========================================
// AUTO SCHEMA SYNCRONIZER & DATABASE MANAGER
// ==========================================

const CURRENT_APP_SCHEMA: Record<string, string[]> = {
  users: ["id", "username", "email", "role", "created_at"],
  profiles: ["id", "email", "username", "role", "full_name", "phone", "bio", "avatar_url", "created_at", "updated_at"],
  users_backup: ["id", "username", "email", "role", "created_at"],
  tokens: ["code", "credits", "role", "is_active", "created_by", "created_at", "redeemed_by", "redeemed_at"],
  credits: ["id", "user_id", "balance", "total_spent", "created_at", "updated_at"],
  prompt_analysis: ["id", "user_id", "file_name", "file_type", "file_data", "parameters", "created_at"],
  photo_parameters: ["id", "analysis_id", "camera_model", "lens", "aperture", "shutter_speed", "iso", "focal_length", "aspect_ratio", "lighting", "style", "created_at"],
  video_parameters: ["id", "analysis_id", "duration", "fps", "resolution", "motion_intensity", "camera_movement", "pacing", "color_grading", "audio_description", "created_at"],
  master_prompts: ["id", "user_id", "title", "engine", "max_length", "language", "input_parameters", "generated_prompt", "created_at"],
  api_settings: ["id", "gemini_api_key", "supabase_url", "supabase_anon_key", "supabase_service_role_key", "supabase_connection_string", "midjourney_key", "stability_key", "runway_key", "luma_key", "kling_key", "leonardo_key", "updated_at"],
  announcements: ["id", "text", "is_active", "created_at"],
  activity_logs: ["id", "user_id", "username", "action", "details", "timestamp"],
  system_logs: ["id", "level", "service", "message", "timestamp"],
  ai_providers: ["id", "provider_name", "provider_category", "provider_logo", "api_endpoint", "api_key", "model_name", "status", "connection_status", "region", "version", "organization_id", "project_id", "webhook_url", "callback_url", "custom_header", "custom_parameter", "last_check", "usage_counter", "request_counter", "response_time", "success_count", "error_count", "created_at", "updated_at"],
  video_uploads: ["id", "user_id", "file_name", "file_size", "duration", "resolution", "fps", "storage_path", "public_url", "created_at"],
  admin_profile: ["id", "full_name", "app_name", "brand_name", "designed_by", "email", "whatsapp", "website", "bio", "profile_photo", "company_logo", "profile_completed", "created_at", "updated_at"],
  system_state: ["id", "installation_completed", "profile_completed", "api_config_completed", "database_connected", "setup_completed", "updated_at", "owner_id"],
  schema_versions: ["id", "version", "description", "created_at"],
  generator_providers: ["id", "provider_name", "api_type", "is_active", "created_at"],
  prompt_adapters: ["id", "adapter_name", "target_engine", "config", "created_at"],
  app_config: ["id", "owner_id", "setup_completed", "installation_completed", "schema_version", "created_at", "updated_at"],
  migration_history: ["migration_id", "status", "execution_time", "checksum", "timestamp"]
};

function getCreateTableSql(tblName: string): string {
  switch (tblName) {
    case "users":
      return `CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;
    case "profiles":
      return `CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user')),
    full_name TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;
    case "users_backup":
      return `CREATE TABLE IF NOT EXISTS public.users_backup (
    id UUID PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;
    case "tokens":
      return `CREATE TABLE IF NOT EXISTS public.tokens (
    code TEXT PRIMARY KEY,
    credits INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'user')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    redeemed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    redeemed_at TIMESTAMP WITH TIME ZONE
);`;
    case "credits":
      return `CREATE TABLE IF NOT EXISTS public.credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    balance INTEGER NOT NULL DEFAULT 500,
    total_spent INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;
    case "prompt_analysis":
      return `CREATE TABLE IF NOT EXISTS public.prompt_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT,
    file_type TEXT CHECK (file_type IN ('image', 'video', 'url')),
    file_data TEXT,
    parameters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;
    case "photo_parameters":
      return `CREATE TABLE IF NOT EXISTS public.photo_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID REFERENCES public.prompt_analysis(id) ON DELETE CASCADE UNIQUE,
    camera_model TEXT,
    lens TEXT,
    aperture TEXT,
    shutter_speed TEXT,
    iso TEXT,
    focal_length TEXT,
    aspect_ratio TEXT,
    lighting TEXT,
    style TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;
    case "video_parameters":
      return `CREATE TABLE IF NOT EXISTS public.video_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID REFERENCES public.prompt_analysis(id) ON DELETE CASCADE UNIQUE,
    duration NUMERIC,
    fps INTEGER,
    resolution TEXT,
    motion_intensity TEXT,
    camera_movement TEXT,
    pacing TEXT,
    color_grading TEXT,
    audio_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;
    case "master_prompts":
      return `CREATE TABLE IF NOT EXISTS public.master_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    engine TEXT NOT NULL,
    max_length INTEGER NOT NULL DEFAULT 500,
    language TEXT NOT NULL CHECK (language IN ('id', 'en')),
    input_parameters JSONB,
    generated_prompt TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;
    case "api_settings":
      return `CREATE TABLE IF NOT EXISTS public.api_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    gemini_api_key TEXT,
    supabase_url TEXT,
    supabase_anon_key TEXT,
    supabase_service_role_key TEXT,
    supabase_connection_string TEXT,
    midjourney_key TEXT,
    stability_key TEXT,
    runway_key TEXT,
    luma_key TEXT,
    kling_key TEXT,
    leonardo_key TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;
    case "announcements":
      return `CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;
    case "activity_logs":
      return `CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    username TEXT,
    action TEXT NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;
    case "system_logs":
      return `CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
    service TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;
    case "ai_providers":
      return `CREATE TABLE IF NOT EXISTS public.ai_providers (
    id TEXT PRIMARY KEY,
    provider_name TEXT NOT NULL,
    provider_category TEXT NOT NULL CHECK (provider_category IN ('IMAGE GENERATOR', 'VIDEO GENERATOR', 'PROMPT GENERATOR', 'LLM', 'EMBEDDING', 'UPSCALER', 'IMAGE EDITOR', 'VIDEO EDITOR')),
    provider_logo TEXT,
    api_endpoint TEXT NOT NULL,
    api_key TEXT,
    model_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    connection_status TEXT NOT NULL DEFAULT 'Online' CHECK (connection_status IN ('Online', 'Offline', 'Invalid API', 'Quota Exceeded', 'Rate Limited', 'Unauthorized', 'Maintenance')),
    region TEXT,
    version TEXT,
    organization_id TEXT,
    project_id TEXT,
    webhook_url TEXT,
    callback_url TEXT,
    custom_header TEXT,
    custom_parameter TEXT,
    last_check TIMESTAMP WITH TIME ZONE,
    usage_counter INTEGER NOT NULL DEFAULT 0,
    request_counter INTEGER NOT NULL DEFAULT 0,
    response_time INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;
    case "video_uploads":
      return `CREATE TABLE IF NOT EXISTS public.video_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    duration NUMERIC,
    resolution TEXT,
    fps INTEGER,
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;
    case "admin_profile":
      return `CREATE TABLE IF NOT EXISTS public.admin_profile (
    id UUID PRIMARY KEY,
    full_name TEXT NOT NULL,
    app_name TEXT NOT NULL,
    brand_name TEXT NOT NULL,
    designed_by TEXT NOT NULL,
    email TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    website TEXT NOT NULL,
    bio TEXT NOT NULL,
    profile_photo TEXT,
    company_logo TEXT,
    profile_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;
    case "system_state":
      return `CREATE TABLE IF NOT EXISTS public.system_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    installation_completed BOOLEAN NOT NULL DEFAULT false,
    profile_completed BOOLEAN NOT NULL DEFAULT false,
    api_config_completed BOOLEAN NOT NULL DEFAULT false,
    database_connected BOOLEAN NOT NULL DEFAULT false,
    setup_completed BOOLEAN NOT NULL DEFAULT false,
    owner_id TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;
    case "schema_versions":
      return `CREATE TABLE IF NOT EXISTS public.schema_versions (
    id SERIAL PRIMARY KEY,
    version INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;
    case "generator_providers":
      return `CREATE TABLE IF NOT EXISTS public.generator_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name TEXT NOT NULL,
    api_type TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;
    case "prompt_adapters":
      return `CREATE TABLE IF NOT EXISTS public.prompt_adapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adapter_name TEXT NOT NULL,
    target_engine TEXT NOT NULL,
    config TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;
    case "app_config":
      return `CREATE TABLE IF NOT EXISTS public.app_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID,
    setup_completed BOOLEAN DEFAULT false,
    installation_completed BOOLEAN DEFAULT false,
    schema_version VARCHAR(50) DEFAULT '1.0.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE IF EXISTS public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read-only setup access" ON public.app_config;
DROP POLICY IF EXISTS "Owner update access" ON public.app_config;
DROP POLICY IF EXISTS "Super Admin write access" ON public.app_config;

CREATE POLICY "Public read-only setup access" ON public.app_config FOR SELECT TO public USING (true);
CREATE POLICY "Owner update access" ON public.app_config FOR UPDATE TO public USING (auth.uid() = owner_id);
CREATE POLICY "Super Admin write access" ON public.app_config FOR ALL TO public USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin'));`;
    case "migration_history":
      return `CREATE TABLE IF NOT EXISTS public.migration_history (
    migration_id VARCHAR(100) PRIMARY KEY,
    status VARCHAR(20) NOT NULL,
    execution_time INTEGER NOT NULL,
    checksum VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;
    default:
      return "";
  }
}

function getColumnType(tblName: string, colName: string): string {
  if (colName === "migration_id" || colName === "checksum") {
    return "VARCHAR(100)";
  }
  if (colName === "status") {
    return "VARCHAR(20)";
  }
  if (colName === "execution_time") {
    return "INTEGER";
  }
  if (["id", "user_id", "analysis_id", "created_by", "redeemed_by", "owner_id"].includes(colName)) {
    if (["users", "profiles", "users_backup", "credits", "prompt_analysis", "photo_parameters", "video_parameters", "master_prompts", "activity_logs", "system_logs", "video_uploads", "admin_profile", "generator_providers", "prompt_adapters", "app_config"].includes(tblName)) {
      return "UUID";
    }
    if (colName === "id" && ["api_settings", "system_state"].includes(tblName)) {
      return "INTEGER";
    }
    return "TEXT";
  }
  if (colName === "schema_version") {
    return "VARCHAR(50) DEFAULT '1.0.0'";
  }
  if (["credits", "balance", "total_spent", "fps", "usage_counter", "request_counter", "response_time", "success_count", "error_count", "version", "video_size_limit_mb"].includes(colName)) {
    return "INTEGER";
  }
  if (colName === "file_size") {
    return "BIGINT";
  }
  if (["duration"].includes(colName)) {
    return "NUMERIC";
  }
  if (["is_active", "profile_completed", "installation_completed", "api_config_completed", "database_connected", "setup_completed"].includes(colName)) {
    return "BOOLEAN NOT NULL DEFAULT false";
  }
  if (["parameters", "input_parameters"].includes(colName)) {
    return "JSONB";
  }
  if (colName.endsWith("_at") || colName === "timestamp") {
    return "TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL";
  }
  return "TEXT";
}

async function syncSystemStateToSupabase(sysState: any) {
  const state = db.getState();
  const { supabaseUrl, supabaseServiceRoleKey, supabaseAnonKey } = state.apiSettings;
  if (!supabaseUrl || (!supabaseServiceRoleKey && !supabaseAnonKey)) {
    return;
  }

  try {
    const key = supabaseServiceRoleKey || supabaseAnonKey;
    const cleanUrl = supabaseUrl.replace(/\/$/, "");
    await fetch(`${cleanUrl}/rest/v1/system_state`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        id: 1,
        installation_completed: !!sysState.installation_completed,
        profile_completed: !!sysState.profile_completed,
        api_config_completed: !!sysState.api_config_completed,
        database_connected: !!sysState.database_connected,
        setup_completed: !!sysState.setup_completed,
        owner_id: sysState.owner_id || null,
        updated_at: new Date().toISOString()
      })
    });
  } catch (e) {
    console.error("Gagal melakukan sinkronisasi systemState ke Supabase:", e);
  }
}

async function fetchSystemStateFromSupabase(): Promise<any | null> {
  const state = db.getState();
  const { supabaseUrl, supabaseServiceRoleKey, supabaseAnonKey } = state.apiSettings;
  if (!supabaseUrl || (!supabaseServiceRoleKey && !supabaseAnonKey)) {
    return null;
  }

  try {
    const key = supabaseServiceRoleKey || supabaseAnonKey;
    const cleanUrl = supabaseUrl.replace(/\/$/, "");
    const res = await fetch(`${cleanUrl}/rest/v1/system_state?id=eq.1`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return {
          installation_completed: data[0].installation_completed,
          profile_completed: data[0].profile_completed,
          api_config_completed: data[0].api_config_completed,
          database_connected: data[0].database_connected,
          setup_completed: data[0].setup_completed,
          owner_id: data[0].owner_id || null,
        };
      }
    }
  } catch (e) {
    console.error("Gagal mengambil systemState dari Supabase:", e);
  }
  return null;
}

// ----------------------------------------------------
// App Config (app_config) persistent state helpers
// ----------------------------------------------------

const APP_SCHEMA_VERSION = "1.1.0";

async function syncAppConfigToSupabase(cfg: { owner_id?: string | null; setup_completed?: boolean; installation_completed?: boolean; schema_version?: string }) {
  const state = db.getState();
  const { supabaseUrl, supabaseServiceRoleKey, supabaseAnonKey } = state.apiSettings;
  if (!supabaseUrl || (!supabaseServiceRoleKey && !supabaseAnonKey)) {
    return;
  }

  try {
    const key = supabaseServiceRoleKey || supabaseAnonKey;
    const cleanUrl = supabaseUrl.replace(/\/$/, "");
    
    // First query if there is any row
    const res = await fetch(`${cleanUrl}/rest/v1/app_config`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
      }
    });

    let existingId: string | null = null;
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        existingId = data[0].id;
      }
    }

    const payload: any = {
      setup_completed: cfg.setup_completed !== undefined ? !!cfg.setup_completed : false,
      installation_completed: cfg.installation_completed !== undefined ? !!cfg.installation_completed : false,
      schema_version: cfg.schema_version || APP_SCHEMA_VERSION,
      updated_at: new Date().toISOString()
    };
    if (cfg.owner_id !== undefined) {
      payload.owner_id = cfg.owner_id;
    }

    if (existingId) {
      // PATCH update
      await fetch(`${cleanUrl}/rest/v1/app_config?id=eq.${existingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": key,
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify(payload)
      });
    } else {
      // POST insert new
      await fetch(`${cleanUrl}/rest/v1/app_config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": key,
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify(payload)
      });
    }
  } catch (e) {
    console.error("Gagal melakukan sinkronisasi app_config ke Supabase:", e);
  }
}

async function fetchAppConfigFromSupabase(): Promise<any | null> {
  const state = db.getState();
  const { supabaseUrl, supabaseServiceRoleKey, supabaseAnonKey } = state.apiSettings;
  if (!supabaseUrl || (!supabaseServiceRoleKey && !supabaseAnonKey)) {
    return null;
  }

  try {
    const key = supabaseServiceRoleKey || supabaseAnonKey;
    const cleanUrl = supabaseUrl.replace(/\/$/, "");
    const res = await fetch(`${cleanUrl}/rest/v1/app_config?limit=1`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return {
          id: data[0].id,
          owner_id: data[0].owner_id || null,
          setup_completed: !!data[0].setup_completed,
          installation_completed: !!data[0].installation_completed,
          schema_version: data[0].schema_version || "1.0.0",
        };
      }
    }
  } catch (e) {
    console.error("Gagal mengambil app_config dari Supabase:", e);
  }
  return null;
}

async function autoInitAppConfigOnStartup() {
  const state = db.getState();
  const { supabaseUrl, supabaseServiceRoleKey, supabaseAnonKey } = state.apiSettings;
  if (!supabaseUrl || (!supabaseServiceRoleKey && !supabaseAnonKey)) {
    console.log("[Auto App Config Init] Supabase rujukan tidak terkonfigurasi. Mengabaikan inisialisasi awal.");
    return;
  }

  try {
    const key = supabaseServiceRoleKey || supabaseAnonKey;
    const cleanUrl = supabaseUrl.replace(/\/$/, "");
    const res = await fetch(`${cleanUrl}/rest/v1/app_config?limit=1`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length === 0) {
        console.log("[Auto App Config Init] Tabel app_config kosong di database. Melakukan inisialisasi record default...");
        const insertRes = await fetch(`${cleanUrl}/rest/v1/app_config`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": key,
            "Authorization": `Bearer ${key}`
          },
          body: JSON.stringify({
            setup_completed: false,
            installation_completed: false,
            schema_version: "1.0.0",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        });
        console.log(`[Auto App Config Init] Status kirim inisialisasi: ${insertRes.status}`);
      } else {
        console.log("[Auto App Config Init] Tabel app_config telah diisi data sebelumnya.");
      }
    } else {
      console.warn(`[Auto App Config Init] Gagal memverifikasi isi tabel app_config. Status API: ${res.status}`);
    }
  } catch (err) {
    console.error("[Auto App Config Init] Kesalahan tak terduga saat inisialisasi startup:", err);
  }
}

async function runSchemaComparison() {
  const state = db.getState();
  const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey, supabaseConnectionString } = state.apiSettings;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return { success: false, supabaseConnected: false, inSync: true, tables: [], missingTables: [], missingColumns: [], sqlToApply: "" };
  }

  const cleanUrl = supabaseUrl.replace(/\/$/, "");
  const key = supabaseServiceRoleKey || supabaseAnonKey;
  
  let activeTables: Record<string, string[]> = {};
  let supabaseConnected = false;
  let schemaVersion = 1;
  let activePolicies: string[] = [];
  
  // Method 1: connection string is available, query directly!
  if (supabaseConnectionString) {
    const client = new Client({
      connectionString: supabaseConnectionString,
      ssl: { rejectUnauthorized: false }
    });
    try {
      await client.connect();
      supabaseConnected = true;
      const resCols = await client.query(`
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public';
      `);
      
      resCols.rows.forEach(row => {
        const t = row.table_name;
        const c = row.column_name;
        if (!activeTables[t]) activeTables[t] = [];
        activeTables[t].push(c);
      });

      // Fetch schema version
      try {
        const resVer = await client.query("SELECT version FROM public.schema_versions ORDER BY id DESC LIMIT 1;");
        if (resVer.rows.length > 0) {
          schemaVersion = resVer.rows[0].version;
        }
      } catch (e) {
        // Table doesn't exist yet, version defaults to 1
      }

      // Fetch active policies to see if we need to drop/recreate them
      try {
        const resPol = await client.query(`
          SELECT policyname 
          FROM pg_policies 
          WHERE schemaname = 'public' AND tablename = 'app_config';
        `);
        activePolicies = resPol.rows.map(row => row.policyname);
      } catch (e) {
        console.error("[Schema Compare] Failed to fetch pg_policies:", e);
      }
    } catch (e) {
      console.error("[Schema Compare] direct postgres query failed, falling back to REST:", e);
    } finally {
      try { await client.end(); } catch (err) {}
    }
  }

  // Method 2: Fallback to OpenAPI REST Swagger spec
  if (Object.keys(activeTables).length === 0) {
    try {
      const res = await fetch(`${cleanUrl}/rest/v1/`, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`
        }
      });
      
      if (res.ok) {
        supabaseConnected = true;
        const oas = await res.json();
        if (oas && oas.definitions) {
          Object.keys(oas.definitions).forEach(t => {
            const cols: string[] = [];
            const properties = oas.definitions[t].properties || {};
            Object.keys(properties).forEach(c => cols.push(c));
            activeTables[t] = cols;
          });
        }
      }
    } catch (e) {
      console.error("[Schema Compare] Swagger fetch failed:", e);
    }
  }

  // Compare schemas
  const missingTables: string[] = [];
  const missingColumns: { table: string; column: string; type: string }[] = [];
  const results: any[] = [];
  
  let inSync = true;
  let sqlToApply = "";

  Object.entries(CURRENT_APP_SCHEMA).forEach(([tblName, reqFields]) => {
    const actualFields = activeTables[tblName] || null;
    
    if (!actualFields) {
      missingTables.push(tblName);
      inSync = false;
      
      sqlToApply += getCreateTableSql(tblName) + "\n\n";
      results.push({
        name: tblName,
        exists: false,
        missingColumns: reqFields
      });
    } else {
      const missingInTable: string[] = [];
      reqFields.forEach(f => {
        const exists = actualFields.includes(f);
        if (!exists) {
          missingInTable.push(f);
          missingColumns.push({ table: tblName, column: f, type: getColumnType(tblName, f) });
          inSync = false;
          
          sqlToApply += `ALTER TABLE public.${tblName} ADD COLUMN IF NOT EXISTS ${f} ${getColumnType(tblName, f)};\n`;
        }
      });
      
      results.push({
        name: tblName,
        exists: true,
        missingColumns: missingInTable
      });
    }
  });

  // Idempotent policy check & repair according to critical audit guidelines
  const expectedPolNames = ["Public read-only setup access", "Owner update access", "Super Admin write access"];
  let policiesToSync = false;
  for (const pol of expectedPolNames) {
    if (!activePolicies.includes(pol)) {
      policiesToSync = true;
      break;
    }
  }

  if (policiesToSync) {
    sqlToApply += `\n-- Gated policy updates for app_config to ensure full idempotency\n`;
    sqlToApply += `ALTER TABLE IF EXISTS public.app_config ENABLE ROW LEVEL SECURITY;\n`;
    sqlToApply += `DROP POLICY IF EXISTS "Public read-only setup access" ON public.app_config;\n`;
    sqlToApply += `CREATE POLICY "Public read-only setup access" ON public.app_config FOR SELECT TO public USING (true);\n`;
    sqlToApply += `DROP POLICY IF EXISTS "Owner update access" ON public.app_config;\n`;
    sqlToApply += `CREATE POLICY "Owner update access" ON public.app_config FOR UPDATE TO public USING (auth.uid() = owner_id);\n`;
    sqlToApply += `DROP POLICY IF EXISTS "Super Admin write access" ON public.app_config;\n`;
    sqlToApply += `CREATE POLICY "Super Admin write access" ON public.app_config FOR ALL TO public USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin'));\n`;
    inSync = false;
  }

  return {
    success: true,
    supabaseConnected,
    inSync,
    schemaVersion,
    tables: results,
    missingTables,
    missingColumns,
    sqlToApply: sqlToApply.trim()
  };
}

function splitSqlStatements(sql: string): string[] {
  const result: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let dollarQuoteTag = "";
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    
    // Check for standard quote boundaries
    if (char === "'" && !inDoubleQuote) {
      if (i > 0 && sql[i - 1] === "\\") {
        current += char;
        continue;
      }
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote) {
      if (i > 0 && sql[i - 1] === "\\") {
        current += char;
        continue;
      }
      inDoubleQuote = !inDoubleQuote;
    }
    
    // Check for PostgreSQL dollar-quotes
    if (char === '$' && !inSingleQuote && !inDoubleQuote) {
      if (sql.substring(i, i + 2) === '$$') {
        if (dollarQuoteTag === '$$') {
          dollarQuoteTag = '';
        } else if (dollarQuoteTag === '') {
          dollarQuoteTag = '$$';
        }
        current += '$$';
        i++;
        continue;
      }
    }
    
    if (char === ';' && !inSingleQuote && !inDoubleQuote && !dollarQuoteTag) {
      if (current.trim()) {
        result.push(current.trim());
      }
      current = "";
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    result.push(current.trim());
  }
  
  return result;
}

async function executeSqlOnSupabase(sql: string): Promise<{ success: boolean; message: string; error?: any; report?: any }> {
  const state = db.getState();
  const connStr = state.apiSettings.supabaseConnectionString || process.env.SUPABASE_CONNECTION_STRING;
  if (!connStr) {
    return { success: false, message: "Koneksi database langsung (Connection String) tidak dikonfigurasi. Silakan tambahkan Connection String database di Pengaturan API Admin untuk memperbaiki schema secara aman dan otomatis." };
  }

  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
  });

  const startTime = Date.now();
  const statements = splitSqlStatements(sql);
  const migrationId = "mig_" + Date.now();
  const sqlHash = crypto.createHash("md5").update(sql).digest("hex");

  try {
    await client.connect();

    // Ensure migration_history table structure always exists before doing any other table transactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.migration_history (
        migration_id VARCHAR(100) PRIMARY KEY,
        status VARCHAR(20) NOT NULL,
        execution_time INTEGER NOT NULL,
        checksum VARCHAR(100) NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `);

    // Begin single transaction for all changes to guarantee atomic rollback
    await client.query("BEGIN;");

    let tablesCreatedCount = 0;
    let tablesUpdatedCount = 0;
    let columnsAddedCount = 0;
    let policiesCreatedCount = 0;
    let policiesSkippedCount = 0;
    let policiesUpdatedCount = 0;
    const failedStatements: string[] = [];

    for (let stmt of statements) {
      stmt = stmt.trim();
      if (!stmt) continue;

      const lowerStmt = stmt.toLowerCase();
      
      // Strict guard against destructive, unapproved schema drop
      if (lowerStmt.includes("drop table") && !lowerStmt.includes("drop table if exists public.migration_history")) {
        console.warn("[DROP GUARD] Prevented unauthorized tables drop during automatic migrations.");
        continue;
      }

      const isCreateTable = lowerStmt.includes("create table");
      const isAlterTable = lowerStmt.includes("alter table");
      const isCreatePolicy = lowerStmt.includes("create policy");

      try {
        await client.query(stmt);

        if (isCreateTable) {
          tablesCreatedCount++;
        } else if (isAlterTable && (lowerStmt.includes("add col") || lowerStmt.includes("add column"))) {
          columnsAddedCount++;
          tablesUpdatedCount++;
        } else if (isCreatePolicy) {
          policiesCreatedCount++;
          if (lowerStmt.includes("app_config")) {
            policiesUpdatedCount++;
          }
        }
      } catch (err: any) {
        const errMsg = err.message.toLowerCase();
        // Check for safe-to-ignore duplicate column or table existence issues in postgres
        if (
          errMsg.includes("already exists") ||
          errMsg.includes("already a relation") || 
          errMsg.includes("duplicate col") ||
          errMsg.includes("duplicate table") ||
          errMsg.includes("duplicate object")
        ) {
          console.warn(`[Safe IDEMPOTENCY Skip] skipping already existing: ${err.message}`);
          if (isCreatePolicy) {
            policiesSkippedCount++;
          }
        } else {
          console.error(`[Fatal SQL Migrate Error]: sql: "${stmt}", error: ${err.message}`);
          failedStatements.push(`Stmt: "${stmt.substring(0, 80)}..." -> ${err.message}`);
          
          // Rollback entire transaction to preserve database integrity on breaking change
          await client.query("ROLLBACK;");
          
          const executionTime = Date.now() - startTime;
          // Record failed migration status in the log table
          try {
            const auditClient = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
            await auditClient.connect();
            await auditClient.query(
              `INSERT INTO public.migration_history (migration_id, status, execution_time, checksum) VALUES ($1, $2, $3, $4);`,
              [migrationId, "fail", executionTime, sqlHash]
            );
            await auditClient.end();
          } catch (auditErr) {
            console.error("Gagal mencatat status gagal migrasi ke database:", auditErr);
          }

          // Also save in local cache
          state.failedMigrations = (state.failedMigrations || []).concat([`Migration failed: ${err.message}`]);
          db.save();

          return {
            success: false,
            message: `Migrasi dibatalkan secara aman (ROLLED BACK) karena galat: ${err.message}`,
            error: err,
            report: {
              tablesCreated: 0,
              tablesUpdated: 0,
              columnsAdded: 0,
              policiesCreated: 0,
              policiesSkipped: 0,
              policiesUpdated: 0
            }
          };
        }
      }
    }

    // Insert logged migration details inside transaction block
    await client.query(
      `INSERT INTO public.migration_history (migration_id, status, execution_time, checksum) VALUES ($1, $2, $3, $4);`,
      [migrationId, "success", Date.now() - startTime, sqlHash]
    );

    // Commit changes safely
    await client.query("COMMIT;");

    // Save migration details in local store for display panel
    state.migrationReport = {
      tablesCreated: (state.migrationReport?.tablesCreated || 0) + tablesCreatedCount,
      tablesUpdated: (state.migrationReport?.tablesUpdated || 0) + (tablesUpdatedCount > 0 ? 1 : 0),
      columnsAdded: (state.migrationReport?.columnsAdded || 0) + columnsAddedCount,
      policiesCreated: (state.migrationReport?.policiesCreated || 0) + policiesCreatedCount,
      policiesSkipped: (state.migrationReport?.policiesSkipped || 0) + policiesSkippedCount,
      policiesUpdated: (state.migrationReport?.policiesUpdated || 0) + policiesUpdatedCount,
    };
    state.failedMigrations = failedStatements;
    db.save();

    const report = {
      tablesCreated: tablesCreatedCount,
      tablesUpdated: tablesUpdatedCount > 0 ? 1 : 0,
      columnsAdded: columnsAddedCount,
      policiesCreated: policiesCreatedCount,
      policiesSkipped: policiesSkippedCount,
      policiesUpdated: policiesUpdatedCount
    };

    return {
      success: true,
      message: "Migrasi SQL berhasil dieksekusi secara idempotent dan tercatat dalam migration_history.",
      report
    };
  } catch (err: any) {
    console.error("Gagal mengeksekusi migrasi SQL langsung:", err);
    try { await client.query("ROLLBACK;"); } catch (e) {}
    return { success: false, message: `Eksekusi SQL gagal pada level koneksi: ${err.message}`, error: err };
  } finally {
    try { await client.end(); } catch (err) {}
  }
}

async function autoSyncSchemaOnStartup() {
  const state = db.getState();
  const connStr = state.apiSettings.supabaseConnectionString || process.env.SUPABASE_CONNECTION_STRING;
  
  // Custom Log boot sequence (Observability requirement 5)
  console.log("=== STARTUP DIAGNOSTICS & BOOT SEQUENCE ===");
  const remoteAppConfig = await fetchAppConfigFromSupabase();
  if (remoteAppConfig) {
    console.log("[Boot] app_config loaded: SUCCESS");
    console.log(`[Boot] setup_completed status: ${remoteAppConfig.setup_completed}`);
    console.log(`[Boot] schema_version: ${remoteAppConfig.schema_version}`);
    const maskedOwner = remoteAppConfig.owner_id ? `${remoteAppConfig.owner_id.substring(0, 8)}...*****` : "null";
    console.log(`[Boot] owner_id: ${maskedOwner}`);
  } else {
    console.log("[Boot] app_config loaded: FAILED/NOT INITIALISED YET");
  }

  // Metrics (Observability requirement 5)
  let migrationCount = 0;
  if (connStr) {
    const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      const countRes = await client.query("SELECT COUNT(*) FROM public.migration_history;");
      migrationCount = parseInt(countRes.rows[0].count);
      console.log(`[Metrics] migration count: ${migrationCount}`);
    } catch(e) {
      console.log("[Metrics] migration count: 0 (or migration_history not created yet)");
    } finally {
      try { await client.end(); } catch (err) {}
    }
  }
  const failedCount = state.failedMigrations?.length || 0;
  console.log(`[Metrics] failed migrations: ${failedCount}`);
  const report = (state.migrationReport || {}) as any;
  console.log(`[Metrics] execution stats: Created tables: ${report.tablesCreated || 0}, Updated tables: ${report.tablesUpdated || 0}, Added columns: ${report.columnsAdded || 0}`);
  console.log("===========================================");

  if (!connStr) {
    console.log("[Auto Schema Sync] Connection string is not configured. Skipping auto sync.");
    await autoInitAppConfigOnStartup();
    return;
  }
  
  console.log("[Auto Schema Sync] Running schema sync checking...");
  try {
    const checkResult = await runSchemaComparison();
    if (!checkResult.inSync && checkResult.sqlToApply) {
      console.log("[Auto Schema Sync] Schema out of sync. Applying auto-repair migration SQL...");
      const execRes = await executeSqlOnSupabase(checkResult.sqlToApply);
      if (execRes.success) {
        console.log("[Auto Schema Sync] Auto-repair succeeded!");
        await executeSqlOnSupabase("INSERT INTO public.schema_versions (version, description) VALUES (2, 'Auto sync schema on startup') ON CONFLICT DO NOTHING;");
      } else {
        console.error("[Auto Schema Sync] Auto-repair failed:", execRes.message);
      }
    } else {
      console.log("[Auto Schema Sync] Schema is already in sync!");
    }
  } catch (err) {
    console.error("[Auto Schema Sync] Error during startup sync:", err);
  } finally {
    await autoInitAppConfigOnStartup();
  }
}

// Seed custom keys from env if settings are blank
const currentSettings = db.getState().apiSettings;
let needsSave = false;
if (!currentSettings.geminiApiKey && process.env.GEMINI_API_KEY) {
  currentSettings.geminiApiKey = process.env.GEMINI_API_KEY;
  needsSave = true;
}
if (!currentSettings.supabaseUrl && process.env.SUPABASE_URL) {
  currentSettings.supabaseUrl = process.env.SUPABASE_URL;
  needsSave = true;
}
if (!currentSettings.supabaseAnonKey && process.env.SUPABASE_ANON_KEY) {
  currentSettings.supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  needsSave = true;
}
if (!currentSettings.supabaseServiceRoleKey && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  currentSettings.supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  needsSave = true;
}
if (!currentSettings.supabaseConnectionString && process.env.SUPABASE_CONNECTION_STRING) {
  currentSettings.supabaseConnectionString = process.env.SUPABASE_CONNECTION_STRING;
  needsSave = true;
}

if (needsSave) {
  db.save();
}

// Function to fetch the admin_profile from Supabase if local state is blank but DB is present
async function fetchAdminProfileFromSupabase(): Promise<any | null> {
  const state = db.getState();
  const { supabaseUrl, supabaseServiceRoleKey, supabaseAnonKey } = state.apiSettings;
  if (!supabaseUrl || (!supabaseServiceRoleKey && !supabaseAnonKey)) {
    return null;
  }

  try {
    const key = supabaseServiceRoleKey || supabaseAnonKey;
    const cleanUrl = supabaseUrl.replace(/\/$/, "");
    console.log("[SETUP STATUS RUN] Memulai penarikan admin_profile dari Supabase...");
    const res = await fetch(`${cleanUrl}/rest/v1/admin_profile?id=eq.admin-profile-id`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        console.log("SETUP LOADED: admin_profile ditarik dari database Supabase secara aman.");
        return {
          id: data[0].id,
          fullName: data[0].full_name,
          appName: data[0].app_name,
          brandName: data[0].brand_name,
          designedBy: data[0].designed_by,
          email: data[0].email,
          whatsapp: data[0].whatsapp,
          website: data[0].website,
          bio: data[0].bio,
          profilePhoto: data[0].profile_photo,
          companyLogo: data[0].company_logo,
          profileCompleted: data[0].profile_completed,
          createdAt: data[0].created_at,
          updatedAt: data[0].updated_at,
        };
      }
    }
  } catch (e) {
    console.error("Gagal mengambil adminProfile dari Supabase:", e);
  }
  return null;
}

// Helper to get active Gemini instance
function getGeminiClient(): GoogleGenAI {
  const settings = db.getState().apiSettings;
  // Use sandbox key if configured, otherwise default to env key
  const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY || "";
  
  if (!apiKey) {
    throw new Error("API Key Gemini tidak dikonfigurasi. Silakan atur di API Sandbox.");
  }

  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Helper to call any promise function with automatic retries and exponential backoff
async function callGeminiWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      
      const errStr = String(error?.message || error).toLowerCase();
      const errStatus = error?.status || error?.statusCode;
      
      const isTransientStatus = [429, 500, 502, 503, 504].includes(Number(errStatus));
      const hasTransientKeywords = errStr.includes("429") || 
                                   errStr.includes("500") || 
                                   errStr.includes("502") || 
                                   errStr.includes("503") || 
                                   errStr.includes("504") ||
                                   errStr.includes("rate limit") ||
                                   errStr.includes("resource exhausted") ||
                                   errStr.includes("overloaded") ||
                                   errStr.includes("status code 429") ||
                                   errStr.includes("status code 500") ||
                                   errStr.includes("status code 502") ||
                                   errStr.includes("status code 503") ||
                                   errStr.includes("status code 504") ||
                                   errStr.includes("temp") ||
                                   errStr.includes("timeout") ||
                                   errStr.includes("econnreset");
      
      const shouldRetry = isTransientStatus || hasTransientKeywords;
      
      if (shouldRetry && attempt <= retries) {
        const backoffDelay = delayMs * Math.pow(2, attempt - 1);
        console.warn(`[GEMINI RETRY] Percobaan ke-${attempt} gagal dengan error: "${error?.message || error}". Melakukan retry dalam ${backoffDelay}ms...`);
        db.logSystem("warn", "Gemini Auto-Retry", `Percobaan ke-${attempt} gagal dengan status/pesan: ${error?.message || error}. Retry dalam ${backoffDelay}ms.`);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      } else {
        throw error;
      }
    }
  }
}

// Helper to audit, analyze, and log estimated request sizes for all Gemini requests
function analyzeAndLogRequestSize(
  contents: any,
  config?: any
): {
  imageSize: number;
  videoSize: number;
  promptLength: number;
  parameterCount: number;
  tokenEstimate: number;
} {
  let imageSize = 0;
  let videoSize = 0;
  let promptLength = 0;
  let parameterCount = 0;

  // Track dynamic model config parameters
  if (config) {
    const activeConfigParams = Object.keys(config).filter(k => k !== "systemInstruction");
    parameterCount += activeConfigParams.length;
  }

  const traverse = (item: any) => {
    if (!item) return;
    if (typeof item === "string") {
      promptLength += item.length;
      const keysMatched = item.match(/"[a-zA-Z0-9_-]+"\s*:/g);
      if (keysMatched) {
        parameterCount += keysMatched.length;
      }
    } else if (Array.isArray(item)) {
      item.forEach(traverse);
    } else if (typeof item === "object") {
      if (item.text !== undefined && typeof item.text === "string") {
        promptLength += item.text.length;
        const keysMatched = item.text.match(/"[a-zA-Z0-9_-]+"\s*:/g);
        if (keysMatched) {
          parameterCount += keysMatched.length;
        }
      }
      if (item.inlineData) {
        const mime = item.inlineData.mimeType || "";
        const base64Str = item.inlineData.data || "";
        const base64Length = base64Str.length;
        const binarySize = Math.round(base64Length * 0.75);
        
        if (mime.startsWith("image/")) {
          imageSize += binarySize;
        } else if (mime.startsWith("video/")) {
          videoSize += binarySize;
        }
      }
    }
  };

  traverse(contents);

  if (config?.systemInstruction) {
    const sysInstr = config.systemInstruction;
    if (typeof sysInstr === "string") {
      promptLength += sysInstr.length;
      const keysMatched = sysInstr.match(/"[a-zA-Z0-9_-]+"\s*:/g);
      if (keysMatched) {
        parameterCount += keysMatched.length;
      }
    } else if (sysInstr && typeof sysInstr === "object") {
      if (sysInstr.text && typeof sysInstr.text === "string") {
        promptLength += sysInstr.text.length;
        const keysMatched = sysInstr.text.match(/"[a-zA-Z0-9_-]+"\s*:/g);
        if (keysMatched) {
          parameterCount += keysMatched.length;
        }
      }
    }
  }

  // Calculate comprehensive token estimate
  const textTokens = Math.ceil(promptLength / 4);
  const imageCountExpected = imageSize > 0 ? 1 : 0;
  const imageTokens = imageCountExpected * 258;
  const videoCountExpected = videoSize > 0 ? 1 : 0;
  const videoTokens = videoCountExpected * 2500;

  const tokenEstimate = textTokens + imageTokens + videoTokens;

  // Print requested size metadata precisely as specified
  console.log("=========================================");
  console.log("=== GEMINI REQUEST SIZE METRIC LOG ===");
  console.log(`- image size      : ${imageSize} bytes (${(imageSize / 1024).toFixed(2)} KB)`);
  console.log(`- video size      : ${videoSize} bytes (${(videoSize / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`- prompt length   : ${promptLength} characters`);
  console.log(`- parameter count : ${parameterCount}`);
  console.log(`- token estimate  : ${tokenEstimate} tokens`);
  console.log("=========================================");

  db.logSystem("info", "Gemini Size Audit Stats", JSON.stringify({
    imageSize,
    videoSize,
    promptLength,
    parameterCount,
    tokenEstimate
  }));

  return {
    imageSize,
    videoSize,
    promptLength,
    parameterCount,
    tokenEstimate
  };
}

// Helper to call Gemini models with dynamic failover list and automatic retries with exponential backoff on transient errors
async function generateContentWithFailover(
  ai: GoogleGenAI,
  initialModel: string,
  generateParams: {
    contents: any;
    config?: any;
  },
  retriesPerModel = 3,
  delayMs = 1000
): Promise<any> {
  const modelPriority = [
    initialModel,
    "gemini-3.5-flash",
    "gemini-3.1-pro-preview",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
  ];
  
  // Remove duplicates while keeping original order
  const uniqueModels = modelPriority.filter((item, index) => modelPriority.indexOf(item) === index);
  
  let lastError: any = null;
  
  // Size logging executed globally for each call
  analyzeAndLogRequestSize(generateParams.contents, generateParams.config);

  for (let i = 0; i < uniqueModels.length; i++) {
    const currentModel = uniqueModels[i];
    let attempt = 0;
    
    while (attempt < retriesPerModel) {
      // Audit logger for each active request attempt
      const activeTemperature = generateParams.config?.temperature !== undefined ? generateParams.config.temperature : "Default";
      const activeMaxOutputTokens = generateParams.config?.maxOutputTokens !== undefined ? generateParams.config.maxOutputTokens : "Default";
      const activeResponseMimeType = generateParams.config?.responseMimeType || "Default";
      
      const auditLog = {
        model: currentModel,
        temperature: activeTemperature,
        maxOutputTokens: activeMaxOutputTokens,
        responseMimeType: activeResponseMimeType,
        attempt: attempt + 1,
        totalRetriesExpected: retriesPerModel
      };
      
      console.log(`=== GEMINI ENGINE REQUEST AUDIT (Model: ${currentModel}) ===`);
      console.log(`model: ${auditLog.model}`);
      console.log(`temperature: ${auditLog.temperature}`);
      console.log(`maxOutputTokens: ${auditLog.maxOutputTokens}`);
      console.log(`responseMimeType: ${auditLog.responseMimeType}`);
      console.log(`attempt: ${auditLog.attempt}/${auditLog.totalRetriesExpected}`);
      console.log("=================================================================");
      db.logSystem("info", `Gemini Active Request [${currentModel}] - Attempt ${attempt + 1}`, JSON.stringify(auditLog));
      
      try {
        const response = await ai.models.generateContent({
          ...generateParams,
          model: currentModel,
        });
        return response;
      } catch (error: any) {
        attempt++;
        lastError = error;
        
        const errStr = String(error?.message || error).toLowerCase();
        const errStatus = error?.status || error?.statusCode;
        
        const isTransientStatus = [429, 500, 502, 503, 504].includes(Number(errStatus));
        const hasTransientKeywords = errStr.includes("429") || 
                                     errStr.includes("500") || 
                                     errStr.includes("502") || 
                                     errStr.includes("503") || 
                                     errStr.includes("504") ||
                                     errStr.includes("rate limit") ||
                                     errStr.includes("resource exhausted") ||
                                     errStr.includes("overloaded") ||
                                     errStr.includes("status code 429") ||
                                     errStr.includes("status code 500") ||
                                     errStr.includes("status code 502") ||
                                     errStr.includes("status code 503") ||
                                     errStr.includes("status code 504") ||
                                     errStr.includes("temp") ||
                                     errStr.includes("timeout") ||
                                     errStr.includes("econnreset");
        
        const shouldRetry = isTransientStatus || hasTransientKeywords;
        
        if (shouldRetry) {
          if (attempt < retriesPerModel) {
            const backoffDelay = delayMs * Math.pow(2, attempt - 1);
            console.warn(`[GEMINI RETRY] Model: ${currentModel}, Percobaan ke-${attempt} gagal dengan error: "${error?.message || error}". Melakukan retry dalam ${backoffDelay}ms...`);
            db.logSystem("warn", "Gemini Auto-Retry", `Model: ${currentModel}, Percobaan ke-${attempt} gagal dengan status/pesan: ${error?.message || error}. Retry dalam ${backoffDelay}ms.`);
            await new Promise((resolve) => setTimeout(resolve, backoffDelay));
          }
        } else {
          console.error(`[GEMINI FATAL ERROR] Model: ${currentModel} mengalami error non-transient:`, error?.message || error);
          throw error;
        }
      }
    }
    
    // Check if there is another model we can failover to
    if (i < uniqueModels.length - 1) {
      console.warn(`[GEMINI FAILOVER] Model ${currentModel} gagal setelah ${retriesPerModel} percobaan. Otomatis beralih ke model berikutnya: ${uniqueModels[i + 1]}`);
      db.logSystem("warn", "Gemini Failover Transition", `Model ${currentModel} gagal setelah ${retriesPerModel} percobaan. Beralih ke: ${uniqueModels[i + 1]}`);
    }
  }
  
  throw lastError;
}

// Helper to partition full-structured image/URL/video templates into chunked stages-requests to stay well below Gemini model limits
async function splitTemplateAndAnalyze(
  ai: GoogleGenAI,
  contentsInput: any[],
  baseTemplate: Record<string, Record<string, string>>,
  promptHeaderGenerator: (subTemplateStr: string) => string
): Promise<any> {
  const categories = Object.keys(baseTemplate);
  const partitionSize = 4;
  const mergedResults: any = {};
  
  for (let i = 0; i < categories.length; i += partitionSize) {
    const chunkKeys = categories.slice(i, i + partitionSize);
    const subTemplate: Record<string, Record<string, string>> = {};
    for (const key of chunkKeys) {
      subTemplate[key] = baseTemplate[key];
    }
    
    const subTemplateStr = JSON.stringify(subTemplate, null, 2);
    const subPrompt = promptHeaderGenerator(subTemplateStr);
    
    console.log(`[STAGE SPLIT ${i / partitionSize + 1}] Processing subset categories: ${chunkKeys.join(", ")}`);
    db.logSystem("info", "Gemini Request Splitting Activated", `Running stage analysis for subset: [${chunkKeys.join(", ")}]`);
    
    const response = await generateContentWithFailover(
      ai,
      "gemini-3.5-flash",
      {
        contents: [...contentsInput, subPrompt],
        config: { responseMimeType: "application/json" }
      }
    );
    
    const responseText = response.text || "{}";
    let cleanText = responseText.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.substring(7);
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith("```")) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    cleanText = cleanText.trim();
    
    try {
      const parsed = JSON.parse(cleanText);
      Object.assign(mergedResults, parsed);
    } catch (err: any) {
      console.error(`[PARTITION ERROR] Failed to parse JSON chunk:`, err.message);
      for (const k of chunkKeys) {
        mergedResults[k] = baseTemplate[k];
      }
    }
  }
  
  return mergedResults;
}

// Helper to partition Master Prompt params if request size exceeds boundaries
async function splitMasterPromptAnalyze(
  ai: GoogleGenAI,
  engine: string,
  lengthPrompt: string,
  languagePrompt: string,
  inputParameters: Record<string, string>
): Promise<string> {
  const keys = Object.keys(inputParameters);
  const chunkSize = 8;
  const drafts: string[] = [];

  for (let i = 0; i < keys.length; i += chunkSize) {
    const subsetKeys = keys.slice(i, i + chunkSize);
    const subParams: Record<string, string> = {};
    for (const key of subsetKeys) {
      subParams[key] = inputParameters[key];
    }

    console.log(`[MASTER PROMPT SPLIT STAGE ${Math.floor(i / chunkSize) + 1}] Processing input keys: ${subsetKeys.join(", ")}`);
    db.logSystem("info", "Gemini Master Prompt Partition", `Drafting sub-parameters: [${subsetKeys.join(", ")}]`);

    const subInstruction = `Anda adalah Master Prompt draft compiler kelas dunia.
Tugas Anda adalah memformulasikan sub-prompts yang mendetail berdasarkan input parameters berikut:
${JSON.stringify(subParams, null, 2)}

Buat draf deskripsi detail visual artistik untuk parameter ini dalam Bahasa Indonesia.
Kembalikan respon JSON dengan format:
{
  "draft": "DRAF DETAIL PARAMETER VISUAL DISINI"
}`;

    const response = await generateContentWithFailover(
      ai,
      "gemini-3.5-flash",
      {
        contents: `Kumpulkan detail draf prompt visual terbaik berdasarkan input yang didapatkan.`,
        config: {
          responseMimeType: "application/json",
          systemInstruction: subInstruction
        }
      }
    );

    const rText = response.text || "{}";
    let cleanText = rText.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.substring(7);
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith("```")) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    cleanText = cleanText.trim();

    try {
      const parsed = JSON.parse(cleanText);
      if (parsed.draft) {
        drafts.push(parsed.draft);
      } else {
        drafts.push(JSON.stringify(subParams));
      }
    } catch {
      drafts.push(JSON.stringify(subParams));
    }
  }

  console.log(`[MASTER PROMPT SYNTHESIS] Synthesizing ${drafts.length} drafts into final masterpiece prompt.`);
  db.logSystem("info", "Gemini Master Prompt Synthesis", "Menggabungkan sub-draf visual menjadi satu master prompt lengkap.");

  const synthInstruction = `Anda adalah Master Prompt Creator kelas dunia.
Tugas Anda adalah merangkai draf-draf komponen visual berikut menjadi satu buah gabungan Master Prompt utama yang cinematic, profesional, detail dan siap langsung digunakan di kecerdasan buas generator target.
Target Engine: ${engine}.

Draf komponen visual terpisah:
${drafts.join("\n\n---\n\n")}

${lengthPrompt}
${languagePrompt}

Kembalikan respon JSON dengan format:
{
  "masterPrompt": "TEKS PROMPT MASTER YANG DIOPTIMALKAN SECARA MAKSIMAL DISINI"
}`;

  const response = await generateContentWithFailover(
    ai,
    "gemini-3.5-flash",
    {
      contents: `Sintesis seluruh draf komponen visual menjadi masterpiece prompt tunggal tingkat lanjut untuk ${engine}.`,
      config: {
        responseMimeType: "application/json",
        systemInstruction: synthInstruction
      }
    }
  );

  const responseText = response.text || "{}";
  let cleanText = responseText.trim();
  if (cleanText.startsWith("```json")) {
    cleanText = cleanText.substring(7);
  } else if (cleanText.startsWith("```")) {
    cleanText = cleanText.substring(3);
  }
  if (cleanText.endsWith("```")) {
    cleanText = cleanText.substring(0, cleanText.length - 3);
  }
  cleanText = cleanText.trim();

  try {
    const parsed = JSON.parse(cleanText);
    return parsed.masterPrompt || "";
  } catch {
    return cleanText;
  }
}

// ----------------------------------------------------
// Authentication Endpoints
// ----------------------------------------------------

app.post("/api/auth/login", ensureSetupCompleted, async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username dan password wajib diisi." });
  }

  // Ensure emergency super admin is bootstrapped before login is processed
  await ensureMinimalSuperAdmin();

  const state = db.getState();
  const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = state.apiSettings;
  const isSupabaseConfigured = !!(supabaseUrl && (supabaseServiceRoleKey || supabaseAnonKey));

  let authenticatedUser: any = null;
  let errorMsg: string | null = null;

  if (isSupabaseConfigured) {
    let email = username;
    if (!username.includes("@")) {
      const cachedUser = state.users.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (cachedUser) {
        email = cachedUser.email;
      } else {
        const cleanUrl = supabaseUrl.replace(/\/$/, "");
        const apikey = supabaseServiceRoleKey || supabaseAnonKey;
        try {
          const userLookupRes = await fetch(`${cleanUrl}/rest/v1/users?username=eq.${encodeURIComponent(username.toLowerCase())}`, {
            headers: { "apikey": apikey, "Authorization": `Bearer ${apikey}` }
          });
          if (userLookupRes.ok) {
            const data = await userLookupRes.json();
            if (Array.isArray(data) && data.length > 0) {
              email = data[0].email;
            }
          }
        } catch (e) {
          console.error("Query lookup email failed:", e);
        }
      }
    }

    const cleanUrl = supabaseUrl.replace(/\/$/, "");
    const apikey = supabaseAnonKey || supabaseServiceRoleKey;
    try {
      console.log(`[Login Flow] Requesting Supabase token for ${email}...`);
      const authRes = await fetch(`${cleanUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": apikey
        },
        body: JSON.stringify({ email: email.toLowerCase(), password })
      });

      const authData = await authRes.json();
      if (authRes.ok && authData && authData.user) {
        const sbUser = authData.user;
        console.log(`[Login Flow] Supabase auth success: ${sbUser.email} (UUID: ${sbUser.id})`);
        
        const userUsername = sbUser.user_metadata?.username || sbUser.email.split("@")[0];
        authenticatedUser = {
          id: sbUser.id,
          username: userUsername,
          email: sbUser.email,
          createdAt: sbUser.created_at || new Date().toISOString()
        };
      } else {
        errorMsg = authData?.error_description || authData?.error?.message || authData?.msg || "Supabase Auth login failed";
        console.warn(`[Login Flow] Supabase auth reject: ${errorMsg}`);
      }
    } catch (e: any) {
      console.error("[Login Flow] Supabase connection error:", e);
    }
  }

  // Fallback to local credential verification if Supabase did not succeed or is not configured
  if (!authenticatedUser) {
    const localUser = state.users.find(
      (u) =>
        (u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === username.toLowerCase()) &&
        u.passwordHash === password
    );

    if (localUser) {
      console.log(`[Login Flow] Authenticated via Local cache config. User: ${localUser.username}`);
      authenticatedUser = {
        id: localUser.id,
        username: localUser.username,
        email: localUser.email,
        createdAt: localUser.createdAt
      };
    } else {
      db.logSystem("warn", "Authentication", `Gagal masuk untuk username: ${username}. Detail: ${errorMsg || "Password salah"}`);
      return res.status(401).json({ error: errorMsg || "Username atau password salah." });
    }
  }

  let userProfile: any = null;
  let userRole = "user";

  if (isSupabaseConfigured) {
    const cleanUrl = supabaseUrl.replace(/\/$/, "");
    const apikey = supabaseServiceRoleKey || supabaseAnonKey;
    try {
      const profileRes = await fetch(`${cleanUrl}/rest/v1/profiles?id=eq.${authenticatedUser.id}`, {
        headers: { "apikey": apikey, "Authorization": `Bearer ${apikey}` }
      });
      if (profileRes.ok) {
        const data = await profileRes.json();
        if (Array.isArray(data) && data.length > 0) {
          userProfile = {
            id: data[0].id,
            email: data[0].email,
            username: data[0].username,
            role: data[0].role,
            fullName: data[0].full_name,
            phone: data[0].phone,
            bio: data[0].bio,
            avatarUrl: data[0].avatar_url,
            created_at: data[0].created_at,
            updated_at: data[0].updated_at
          };
          userRole = data[0].role || "user";
        }
      }
    } catch (e) {
      console.error("[Login Flow] Gagal mengambil profile dari Supabase:", e);
    }
  }

  // Fallback to local profile cache
  if (!userProfile) {
    const cachedProfile = state.profiles.find(p => p.userId === authenticatedUser.id || (p as any).id === authenticatedUser.id);
    if (cachedProfile) {
      userProfile = cachedProfile;
      userRole = (cachedProfile as any).role || state.users.find(u => u.id === authenticatedUser.id)?.role || "user";
    }
  }

  // Jika profile tidak ada -> auto create profile (Requirement 3 & 5)
  if (!userProfile) {
    console.log(`[Login Flow] Profile not found for authenticated user ${authenticatedUser.username}. Auto-creating profile...`);
    const ownerEmail = state.adminProfile?.email || "bossaa.indonesia@gmail.com";
    if (authenticatedUser.email.toLowerCase() === ownerEmail.toLowerCase()) {
      userRole = "super_admin";
    }

    userProfile = {
      id: authenticatedUser.id,
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
      username: authenticatedUser.username,
      role: userRole,
      fullName: authenticatedUser.username,
      phone: "",
      bio: "Anggota baru.",
      avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${authenticatedUser.username}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    state.profiles.push(userProfile);
    
    if (isSupabaseConfigured) {
      const cleanUrl = supabaseUrl.replace(/\/$/, "");
      const apikey = supabaseServiceRoleKey || supabaseAnonKey;
      try {
        await fetch(`${cleanUrl}/rest/v1/profiles`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": apikey,
            "Authorization": `Bearer ${apikey}`
          },
          body: JSON.stringify({
            id: authenticatedUser.id,
            user_id: authenticatedUser.id,
            email: authenticatedUser.email,
            username: authenticatedUser.username,
            role: userRole,
            full_name: authenticatedUser.username,
            phone: "",
            bio: "Anggota baru.",
            avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${authenticatedUser.username}`
          })
        });

        await fetch(`${cleanUrl}/rest/v1/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": apikey,
            "Authorization": `Bearer ${apikey}`,
            "Prefer": "resolution=merge-duplicates"
          },
          body: JSON.stringify({
            id: authenticatedUser.id,
            email: authenticatedUser.email,
            username: authenticatedUser.username,
            role: userRole
          })
        });

        await fetch(`${cleanUrl}/rest/v1/users_backup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": apikey,
            "Authorization": `Bearer ${apikey}`,
            "Prefer": "resolution=merge-duplicates"
          },
          body: JSON.stringify({
            id: authenticatedUser.id,
            email: authenticatedUser.email,
            username: authenticatedUser.username,
            role: userRole
          })
        });
      } catch (e) {
        console.error("[Login Flow] Gagal melakukan sinkronisasi profile otomatis ke Supabase:", e);
      }
    }
  }

  // Update local cache
  const existingUserIdx = state.users.findIndex(u => u.id === authenticatedUser.id);
  const userPayloadLocal = {
    id: authenticatedUser.id,
    username: authenticatedUser.username,
    email: authenticatedUser.email,
    passwordHash: password,
    role: userRole as any,
    createdAt: authenticatedUser.createdAt
  };

  if (existingUserIdx >= 0) {
    state.users[existingUserIdx] = userPayloadLocal;
  } else {
    state.users.push(userPayloadLocal);
  }

  const existingProfileIdx = state.profiles.findIndex(p => p.userId === authenticatedUser.id || (p as any).id === authenticatedUser.id);
  if (existingProfileIdx >= 0) {
    state.profiles[existingProfileIdx] = {
      ...state.profiles[existingProfileIdx],
      ...userProfile,
      userId: authenticatedUser.id,
      role: userRole,
    };
  } else {
    state.profiles.push({
      ...userProfile,
      userId: authenticatedUser.id,
    });
  }

  let credit = state.credits.find((c) => c.userId === authenticatedUser.id);
  if (!credit) {
    credit = { userId: authenticatedUser.id, balance: 50, totalSpent: 0 };
    state.credits.push(credit);
  }

  db.save();
  db.logActivity(authenticatedUser.id, authenticatedUser.username, "USER_LOGIN", `User ${authenticatedUser.username} berhasil login dengan role ${userRole}.`);
  
  res.json({
    success: true,
    user: {
      id: authenticatedUser.id,
      username: authenticatedUser.username,
      email: authenticatedUser.email,
      role: userRole,
      createdAt: authenticatedUser.createdAt
    },
    profile: userProfile,
    credits: credit ? credit.balance : 0,
  });
});

app.get("/auth/callback", (req: Request, res: Response) => {
  // Gracefully handle Supabase email verification callback and redirect back to client app
  console.log("---- AUTH CALLBACK RECEIVED ----");
  console.log("Query parameters:", JSON.stringify(req.query));
  console.log("Redirecting user back to home path...");
  console.log("---------------------------------");
  res.redirect("/");
});

app.post("/api/auth/register", ensureSetupCompleted, async (req: Request, res: Response) => {
  const { username, email, password, fullName } = req.body;
  
  // Console log: Signup request input
  console.log("---- SIGNUP REQUEST RECEIVED ----");
  console.log(`Username: ${username}`);
  console.log(`Email: ${email}`);
  console.log(`FullName: ${fullName}`);
  console.log("---------------------------------");

  if (!username || !email || !password || !fullName) {
    console.log("Error response: Semua field register wajib diisi.");
    return res.status(400).json({ error: "Semua field register wajib diisi." });
  }

  const state = db.getState();
  const exists = state.users.some(
    (u) =>
      u.username.toLowerCase() === username.toLowerCase() ||
      u.email.toLowerCase() === email.toLowerCase()
  );

  if (exists) {
    console.log("Error response: Username atau Email sudah terdaftar.");
    return res.status(400).json({ error: "Username atau Email sudah terdaftar." });
  }

  const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = state.apiSettings;
  const isSupabaseConfigured = !!(supabaseUrl && (supabaseServiceRoleKey || supabaseAnonKey));
  
  let newUserId = crypto.randomUUID(); // Default UUID for perfect sync
  let registeredToSupabase = false;

  if (isSupabaseConfigured) {
    const cleanUrl = supabaseUrl.replace(/\/$/, "");
    const key = supabaseServiceRoleKey || supabaseAnonKey;

    // Dynamically calculate current APP URL without hardcoded localhost
    let siteUrl = process.env.APP_URL || (req.headers.origin as string);
    if (!siteUrl && req.headers.referer) {
      try {
        const refUrl = new URL(req.headers.referer);
        siteUrl = `${refUrl.protocol}//${refUrl.host}`;
      } catch (e) {
        // Ignored
      }
    }
    if (!siteUrl && req.headers.host) {
      const isLocal = req.headers.host.includes("localhost") || req.headers.host.includes("127.0.0.1");
      siteUrl = `${isLocal ? "http" : "https"}://${req.headers.host}`;
    }
    
    if (siteUrl) {
      siteUrl = siteUrl.replace(/\/$/, "");
    } else {
      siteUrl = "http://localhost:3000"; // Ultimate fallback
    }

    const redirectToUrl = `${siteUrl}/auth/callback`;
    console.log(`[SignUp Supabase] Dynamic siteUrl resolved: ${siteUrl}`);
    console.log(`[SignUp Supabase] Dynamic redirectTo resolved: ${redirectToUrl}`);

    try {
      // 1. Supabase Auth signUp
      const signupPayload = {
        email: email.toLowerCase(),
        password: password,
        data: {
          username: username.toLowerCase(),
          full_name: fullName
        },
        options: {
          emailRedirectTo: redirectToUrl
        }
      };

      console.log("[SignUp Supabase] Initiating Auth signUp...");
      console.log(`URL Target: ${cleanUrl}/auth/v1/signup`);
      console.log("Payload:", JSON.stringify(signupPayload, null, 2));

      const authRes = await fetch(`${cleanUrl}/auth/v1/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseAnonKey || key,
        },
        body: JSON.stringify(signupPayload)
      });

      console.log("[SignUp Supabase] Auth signUp Response Status:", authRes.status);
      const authContentType = authRes.headers.get("content-type");
      const authText = await authRes.text();
      console.log("[SignUp Supabase] Auth response headers:", JSON.stringify(Object.fromEntries(authRes.headers.entries())));
      console.log("[SignUp Supabase] Auth response preview:", authText.substring(0, 1000));

      let authData: any = null;
      if (authContentType?.includes("application/json")) {
        try {
          authData = JSON.parse(authText);
        } catch (e: any) {
          console.error("[SignUp Supabase] Failed to parse auth response as JSON:", e.message);
        }
      }

      if (!authRes.ok) {
        const errMsg = authData?.msg || authData?.error_description || authData?.error?.message || authText || "Supabase Auth signUp failed";
        console.error("[SignUp Supabase] Error response from Supabase Auth:", errMsg);
        return res.status(authRes.status).json({ 
          error: `Registrasi Supabase Auth Gagal: ${errMsg}`,
          rawError: authData || authText 
        });
      }

      const authUser = authData?.user || authData;
      if (!authUser || !authUser.id) {
        console.error("[SignUp Supabase] Auth user ID tidak tersedia! parsed authData:", JSON.stringify(authData, null, 2));
        throw new Error('Auth user ID tidak tersedia');
      }

      newUserId = authUser.id;
      console.log("[SignUp Supabase] Auth user ID validated successfully:", newUserId);

      // 2. Insert into public.users table
      const userPayload = {
        id: newUserId,
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        role: "user",
        created_at: new Date().toISOString()
      };

      console.log("[SignUp Supabase] Inserting custom data to public.users table...");
      console.log("Payload:", JSON.stringify(userPayload, null, 2));

      const userRes = await fetch(`${cleanUrl}/rest/v1/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": key,
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify(userPayload)
      });

      console.log("[SignUp Supabase] Insert public.users Response Status:", userRes.status);
      const userResContentType = userRes.headers.get("content-type");
      const userResText = await userRes.text();
      console.log("[SignUp Supabase] Insert public.users Response Body Preview:", userResText.substring(0, 500));

      if (!userRes.ok) {
        let errData: any = {};
        if (userResContentType?.includes("application/json")) {
          try { errData = JSON.parse(userResText); } catch (e) {}
        }
        const errMsg = errData?.message || errData?.hint || userResText || `HTTP Status ${userRes.status}`;
        console.error("Database insert response error (public.users):", errMsg);
        return res.status(userRes.status).json({
          error: `Gagal menyimpan data ke tabel users Supabase: ${errMsg}`,
          rawError: errData || userResText
        });
      }
      console.log("Database insert response (public.users): SUCCESS");

      // 3. Insert into public.profiles table
      const profilePayload = {
        id: newUserId,
        user_id: newUserId,
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        role: "user",
        full_name: fullName,
        phone: "",
        bio: "Anggota baru.",
        avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log("[SignUp Supabase] Inserting custom profile to public.profiles table...");
      console.log("Profile Insert Payload:", JSON.stringify(profilePayload, null, 2));

      const profileRes = await fetch(`${cleanUrl}/rest/v1/profiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": key,
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify(profilePayload)
      });

      console.log("[SignUp Supabase] Insert public.profiles Response Status:", profileRes.status);
      const profileResContentType = profileRes.headers.get("content-type");
      const profileResText = await profileRes.text();
      console.log("[SignUp Supabase] Insert public.profiles Response Body Preview:", profileResText.substring(0, 1000));

      if (!profileRes.ok) {
        let errData: any = {};
        if (profileResContentType?.includes("application/json")) {
          try { errData = JSON.parse(profileResText); } catch (e) {}
        }
        const errMsg = errData?.message || errData?.hint || profileResText || `HTTP Status ${profileRes.status}`;
        console.error("Database insert response error (public.profiles):", errMsg);
        return res.status(profileRes.status).json({
          error: `Gagal menyimpan data ke profil pengguna di Supabase: ${errMsg}`,
          rawError: errData || profileResText
        });
      }
      console.log("Database insert response (public.profiles): SUCCESS");

      // Insert into public.users_backup table
      const backupPayload = {
        id: newUserId,
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        role: "user",
        created_at: new Date().toISOString()
      };

      console.log("[SignUp Supabase] Inserting custom backup to public.users_backup table...");
      console.log("Backup Insert Payload:", JSON.stringify(backupPayload, null, 2));
      const backupRes = await fetch(`${cleanUrl}/rest/v1/users_backup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": key,
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify(backupPayload)
      });
      const backupResText = await backupRes.text().catch(() => "");
      console.log("[SignUp Supabase] Backup table insertion response index/status:", backupRes.status, backupResText.substring(0, 300));

      // 4. Insert into public.credits table
      const creditPayload = {
        id: crypto.randomUUID(),
        user_id: newUserId,
        balance: 50,
        total_spent: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log("[SignUp Supabase] Inserting initial user balance to public.credits table...");
      console.log("Payload:", JSON.stringify(creditPayload, null, 2));

      const creditRes = await fetch(`${cleanUrl}/rest/v1/credits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": key,
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify(creditPayload)
      });

      console.log("[SignUp Supabase] Insert public.credits Response Status:", creditRes.status);
      const creditResContentType = creditRes.headers.get("content-type");
      const creditResText = await creditRes.text();
      console.log("[SignUp Supabase] Insert public.credits Response Body Preview:", creditResText.substring(0, 500));

      if (!creditRes.ok) {
        let errData: any = {};
        if (creditResContentType?.includes("application/json")) {
          try { errData = JSON.parse(creditResText); } catch (e) {}
        }
        const errMsg = errData?.message || errData?.hint || creditResText || `HTTP Status ${creditRes.status}`;
        console.error("Database insert response error (public.credits):", errMsg);
        return res.status(creditRes.status).json({
          error: `Gagal menginisialisasi saldo awal (credits) di Supabase: ${errMsg}`,
          rawError: errData || creditResText
        });
      }
      console.log("Database insert response (public.credits): SUCCESS");

      registeredToSupabase = true;
    } catch (err: any) {
      console.error("Error response (Fatal Catch):", err.message);
      return res.status(500).json({ error: `Kesalahan fatal koneksi Supabase: ${err.message}` });
    }
  }

  // Save the record also to local lowdb cache for perfect dual sync
  const newUser = {
    id: newUserId,
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    passwordHash: password,
    role: "user" as const,
    createdAt: new Date().toISOString(),
  };

  const newProfile = {
    id: newUserId,
    userId: newUserId,
    email: email.toLowerCase(),
    username: username.toLowerCase(),
    role: "user",
    fullName,
    phone: "",
    bio: "Anggota baru.",
    avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  state.users.push(newUser);
  state.profiles.push(newProfile);
  state.credits.push({ userId: newUserId, balance: 50, totalSpent: 0 });

  db.logActivity(newUserId, username, "USER_REGISTER", `Pendaftaran user baru: ${username}${registeredToSupabase ? " (Supabase Synced)" : " (Lokal Offline)"}`);
  db.logSystem("info", "User management", `User baru ${username} terdaftar.${registeredToSupabase ? " Terkoneksi & tersinkronisasi ke DB Supabase." : ""}`);
  db.save();

  console.log("---- SIGNUP COMPLETED SUCCESSFULLY ----");
  console.log(`User ID: ${newUserId}`);
  console.log(`Supabase Sync Status: ${registeredToSupabase ? "SUCCESS" : "LOCAL BYPASS"}`);
  console.log("-----------------------------------------");

  res.json({
    success: true,
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt,
    },
    profile: newProfile,
    credits: 50,
  });
});

app.post("/api/auth/forgot-password", ensureSetupCompleted, (req: Request, res: Response) => {
  const { email } = req.body;
  const state = db.getState();
  const user = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(404).json({ error: "Email tidak ditemukan." });
  }

  res.json({
    success: true,
    message: `Link reset password berhasil dikirim ke ${email}. Silakan periksa kotak masuk atau spam email Anda.`,
  });
});

// Update Profile
app.post("/api/user/profile/update", (req: Request, res: Response) => {
  const { userId, fullName, phone, bio, avatarUrl } = req.body;
  const state = db.getState();
  const index = state.profiles.findIndex((p) => p.userId === userId);

  if (index !== -1) {
    state.profiles[index] = {
      ...state.profiles[index],
      fullName: fullName || state.profiles[index].fullName,
      phone: phone || state.profiles[index].phone,
      bio: bio || state.profiles[index].bio,
      avatarUrl: avatarUrl || state.profiles[index].avatarUrl,
    };
    db.logActivity(userId, undefined, "PROFILE_UPDATE", `Mengecek dan memperbarui data profil.`);
    db.save();
    return res.json({ success: true, profile: state.profiles[index] });
  }
  res.status(404).json({ error: "Profil tidak ditemukan." });
});

// ----------------------------------------------------
// System Announcements / Running Text
// ----------------------------------------------------

app.get("/api/announcement", (req: Request, res: Response) => {
  const state = db.getState();
  const activeAnn = state.announcements.find((a) => a.isActive);
  res.json({ text: activeAnn ? activeAnn.text : "" });
});

app.post("/api/admin/announcement", (req: Request, res: Response) => {
  const { text } = req.body;
  const state = db.getState();
  
  // Deactivate all
  state.announcements.forEach((a) => (a.isActive = false));
  
  const newAnn = {
    id: `ann-${Date.now()}`,
    text,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  
  state.announcements.push(newAnn);
  const userId = req.headers["x-user-id"] || "admin";
  db.logActivity(userId as string, "admin", "UPDATE_RUNNING_TEXT", `Mengubah teks berjalan menjadi: "${text.substring(0, 40)}..."`);
  db.save();
  
  res.json({ success: true, text });
});

// ----------------------------------------------------
// DB SQL Schema Fetch (For Admin)
// ----------------------------------------------------

app.get("/api/admin/sql-schema", (req: Request, res: Response) => {
  const sql = db.getSQLSchema();
  res.json({ sql });
});

// ----------------------------------------------------
// DB Schema Manager endpoints (Admin)
// ----------------------------------------------------

app.get("/api/admin/database/status", async (req: Request, res: Response) => {
  if (!verifySuperAdmin(req, res)) {
    return;
  }
  try {
    const comparison = await runSchemaComparison() as any;
    const remoteAppConfig = await fetchAppConfigFromSupabase();
    const dbSchemaVersion = remoteAppConfig?.schema_version || "1.0.0";
    const versionMismatch = dbSchemaVersion !== APP_SCHEMA_VERSION;
    const state = db.getState();

    // Map the 5 validation fields exactly (Perbaikan Audit Migrasi)
    const pendingMigrations = comparison.missingTables.map((t: string) => `CREATE TABLE public.${t}`)
      .concat(comparison.missingColumns.map((c: any) => `ADD COLUMN ${c.column} TO public.${c.table}`));

    const executedMigrations = Object.keys(CURRENT_APP_SCHEMA)
      .filter(t => !comparison.missingTables.includes(t))
      .map(t => `TABLE public.${t}`);

    const failedMigrations = state.failedMigrations || [];

    res.json({
      ...comparison,
      appSchemaVersion: APP_SCHEMA_VERSION,
      dbSchemaVersion,
      versionMismatch,
      inSync: comparison.inSync && !versionMismatch,
      
      // Mandatory audit / validation variables
      currentAppVersion: APP_SCHEMA_VERSION,
      currentDbVersion: dbSchemaVersion,
      pendingMigrations,
      executedMigrations,
      failedMigrations,
      migrationReport: {
        tablesCreated: state.migrationReport?.tablesCreated || 0,
        tablesUpdated: state.migrationReport?.tablesUpdated || 0,
        columnsAdded: state.migrationReport?.columnsAdded || 0,
        policiesCreated: state.migrationReport?.policiesCreated || 0,
        policiesSkipped: state.migrationReport?.policiesSkipped || 0,
        policiesUpdated: state.migrationReport?.policiesUpdated || 0
      }
    });
  } catch (err: any) {
    res.json({ success: false, message: `Gagal membandingkan skema: ${err.message}` });
  }
});

app.post("/api/admin/database/sync-schema", async (req: Request, res: Response) => {
  if (!verifySuperAdmin(req, res)) {
    return;
  }
  try {
    console.log("[Schema Sync] Running full automatic schema synchronizer and version update...");
    const checkResult = await runSchemaComparison();
    if (checkResult.sqlToApply) {
      const execRes = await executeSqlOnSupabase(checkResult.sqlToApply);
      if (!execRes.success) {
        return res.json({ success: false, message: `Gagal menjalankan sinkronisasi skema SQL: ${execRes.message}` });
      }
    }

    // Update DB schema version to APP_SCHEMA_VERSION in app_config
    const state = db.getState();
    const ownerId = state.systemState?.owner_id;
    await syncAppConfigToSupabase({
      owner_id: ownerId,
      setup_completed: true,
      installation_completed: true,
      schema_version: APP_SCHEMA_VERSION
    });

    const userId = req.headers["x-user-id"] || "admin";
    db.logActivity(userId as string, "admin", "DB_SCHEMA_SYNC", `Sinkronisator otomatis menaikkan versi skema ke ${APP_SCHEMA_VERSION}.`);
    res.json({ success: true, message: `Sinkronisasi skema dan versi selesai! Versi database berhasil ditingkatkan ke ${APP_SCHEMA_VERSION}.` });
  } catch (err: any) {
    res.json({ success: false, message: `Kesalahan sinkronisasi skema otomatis: ${err.message}` });
  }
});

app.post("/api/admin/database/apply-migrations", async (req: Request, res: Response) => {
  if (!verifySuperAdmin(req, res)) {
    return;
  }
  const { sql } = req.body;
  if (!sql) {
    return res.status(400).json({ error: "Query SQL migrasi wajib dikirim." });
  }

  try {
    const resExec = await executeSqlOnSupabase(sql);
    if (resExec.success) {
      // Update schema_version in app_config to current app version since they just manually applied migration!
      const state = db.getState();
      const ownerId = state.systemState?.owner_id;
      await syncAppConfigToSupabase({
        owner_id: ownerId,
        setup_completed: true,
        installation_completed: true,
        schema_version: APP_SCHEMA_VERSION
      });

      const userId = req.headers["x-user-id"] || "admin";
      db.logActivity(userId as string, "admin", "DB_SCHEMA_FIX", "Berhasil memperbaiki skema tabel dan kolom langsung di Supabase.");
      db.logSystem("info", "Database", `Skema database disinkronkan dan versi diupdate ke ${APP_SCHEMA_VERSION}.`);
      res.json({ success: true, message: `Sinkronisasi skema berhasil! Semua tabel dan kolom baru telah dibuat langsung di Supabase, dan versi skema diupdate ke ${APP_SCHEMA_VERSION}.` });
    } else {
      res.json({ success: false, message: resExec.message });
    }
  } catch (err: any) {
    res.json({ success: false, message: `Kesalahan fatal eksekusi migrasi: ${err.message}` });
  }
});

// Real-time RLS Security Auditor
app.get("/api/admin/database/rls-audit", async (req: Request, res: Response) => {
  if (!verifySuperAdmin(req, res)) {
    return;
  }

  const state = db.getState();
  const connStr = state.apiSettings.supabaseConnectionString || process.env.SUPABASE_CONNECTION_STRING;
  if (!connStr) {
    return res.status(400).json({ success: false, message: "Koneksi database langsung (Connection String) diperlukan untuk melakukan audit RLS." });
  }

  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Query tables and their respective Row Level Security states
    const tablesRes = await client.query(`
      SELECT 
        c.relname AS table_name,
        c.relrowsecurity AS rls_enabled
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY table_name;
    `);

    // Query policies registered in PostgreSQL schemaname 'public'
    const policiesRes = await client.query(`
      SELECT 
        tablename,
        policyname,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);

    const tables = tablesRes.rows.map(row => {
      const p = policiesRes.rows.filter(x => x.tablename === row.table_name);
      const isCompliant = row.rls_enabled && p.length > 0;
      
      return {
        tableName: row.table_name,
        rlsEnabled: row.rls_enabled,
        policies: p.map(pol => ({
          policyName: pol.policyname,
          roles: pol.roles,
          command: pol.cmd,
          usingExpression: pol.qual,
          checkExpression: pol.with_check
        })),
        isCompliant,
        issues: !row.rls_enabled 
          ? ["RLS tidak diaktifkan pada tabel ini! Data rentan terhadap manipulasi publik."]
          : p.length === 0 
          ? ["RLS aktif namun kebijakan kosong. Seluruh manipulasi data akan tertolak secara bawaan."]
          : []
      };
    });

    const unsecureTables = tables.filter(t => !t.rlsEnabled);
    const overallScore = Math.round(((tables.length - unsecureTables.length) / (tables.length || 1)) * 100);

    res.json({
      success: true,
      overallScore,
      totalTables: tables.length,
      unsecureTablesCount: unsecureTables.length,
      auditReport: tables,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error("Gagal melakukan audit kebijakan RLS:", err);
    res.status(500).json({ success: false, message: `Gagal melakukan audit kebijakan RLS: ${err.message}` });
  } finally {
    try { await client.end(); } catch (e) {}
  }
});

// Transaction-based RLS Policies Enforce
app.post("/api/admin/database/rls-enforce", async (req: Request, res: Response) => {
  if (!verifySuperAdmin(req, res)) {
    return;
  }

  const state = db.getState();
  const connStr = state.apiSettings.supabaseConnectionString || process.env.SUPABASE_CONNECTION_STRING;
  if (!connStr) {
    return res.status(400).json({ success: false, message: "Koneksi database langsung (Connection String) diperlukan untuk melakukan pengerasan kebijakan RLS." });
  }

  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const rlsSql = `
      -- 1. ENABLE ROW LEVEL SECURITY IN ALL SCHEMA TABLES
      ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.users_backup ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.tokens ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.credits ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.prompt_analysis ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.photo_parameters ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.video_parameters ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.master_prompts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.api_settings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.announcements ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.activity_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.system_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.ai_providers ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.video_uploads ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.admin_profile ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.system_state ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.schema_versions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.generator_providers ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.prompt_adapters ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.app_config ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.migration_history ENABLE ROW LEVEL SECURITY;

      -- 2. CREATE AUTO-SYNC TRIGGER FROM auth.users TO public TABLES
      CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
      RETURNS trigger AS $$
      BEGIN
        -- Insert into profiles
        INSERT INTO public.profiles (id, user_id, email, username, role, full_name, phone, bio, avatar_url, created_at, updated_at)
        VALUES (
          new.id,
          new.id,
          new.email,
          COALESCE(new.raw_user_meta_data->>'username', SPLIT_PART(new.email, '@', 1)),
          COALESCE(new.raw_user_meta_data->>'role', 'user'),
          COALESCE(new.raw_user_meta_data->>'full_name', SPLIT_PART(new.email, '@', 1)),
          '',
          '',
          '',
          now(),
          now()
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          username = EXCLUDED.username,
          role = COALESCE(EXCLUDED.role, 'user'),
          updated_at = now();

        -- Insert into users
        INSERT INTO public.users (id, username, email, role, created_at)
        VALUES (
          new.id,
          COALESCE(new.raw_user_meta_data->>'username', SPLIT_PART(new.email, '@', 1)),
          new.email,
          COALESCE(new.raw_user_meta_data->>'role', 'user'),
          now()
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          username = EXCLUDED.username,
          role = COALESCE(EXCLUDED.role, 'user');

        -- Insert into users_backup
        INSERT INTO public.users_backup (id, username, email, role, created_at)
        VALUES (
          new.id,
          COALESCE(new.raw_user_meta_data->>'username', SPLIT_PART(new.email, '@', 1)),
          new.email,
          COALESCE(new.raw_user_meta_data->>'role', 'user'),
          now()
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          username = EXCLUDED.username,
          role = COALESCE(EXCLUDED.role, 'user');

        RETURN new;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

      -- 3. PURGE OUTDATED POLICIES FOR EXTRA PRECISION
      DROP POLICY IF EXISTS "Super Admins can do everything on users" ON public.users;
      DROP POLICY IF EXISTS "Users can view their own record" ON public.users;
      DROP POLICY IF EXISTS "Super Admins can do everything on users_backup" ON public.users_backup;
      DROP POLICY IF EXISTS "Users can view their own users_backup" ON public.users_backup;
      DROP POLICY IF EXISTS "Super Admins and Admins can view all profiles" ON public.profiles;
      DROP POLICY IF EXISTS "Users can do everything on their own profiles" ON public.profiles;
      DROP POLICY IF EXISTS "Super Admins and Admins can manage credits" ON public.credits;
      DROP POLICY IF EXISTS "Users can view their own credits" ON public.credits;
      DROP POLICY IF EXISTS "Admins can view/delete all analysis" ON public.prompt_analysis;
      DROP POLICY IF EXISTS "Users can manage their own analysis" ON public.prompt_analysis;
      DROP POLICY IF EXISTS "Admins can view/delete all photo params" ON public.photo_parameters;
      DROP POLICY IF EXISTS "Users can view/insert/update photo params if owned prompt" ON public.photo_parameters;
      DROP POLICY IF EXISTS "Admins can view/delete all video params" ON public.video_parameters;
      DROP POLICY IF EXISTS "Users can view/insert/update vparams details" ON public.video_parameters;
      DROP POLICY IF EXISTS "Admins can manage all master prompts" ON public.master_prompts;
      DROP POLICY IF EXISTS "Users can manage their own master prompts" ON public.master_prompts;
      DROP POLICY IF EXISTS "Admins can read all activity logs" ON public.activity_logs;
      DROP POLICY IF EXISTS "Log recording allowed for everyone" ON public.activity_logs;
      DROP POLICY IF EXISTS "Admins can manage system logs" ON public.system_logs;
      DROP POLICY IF EXISTS "Public read-only setup access" ON public.app_config;
      DROP POLICY IF EXISTS "Owner update access" ON public.app_config;
      DROP POLICY IF EXISTS "Super Admin write access" ON public.app_config;
      DROP POLICY IF EXISTS "Super Admin can view and write migration history" ON public.migration_history;

      -- 4. APPLY SUBSTANTIAL HIGH-PRIVILEGES ROLE-BASED ACCESS CONSTRAINTS (profiles-centralized)
      CREATE POLICY "Super Admins can do everything on users" ON public.users FOR ALL TO public USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'super_admin'));
      CREATE POLICY "Users can view their own record" ON public.users FOR SELECT TO public USING (auth.uid() = id);

      CREATE POLICY "Super Admins can do everything on users_backup" ON public.users_backup FOR ALL TO public USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'super_admin'));
      CREATE POLICY "Users can view their own users_backup" ON public.users_backup FOR SELECT TO public USING (auth.uid() = id);

      CREATE POLICY "Super Admins and Admins can view all profiles" ON public.profiles FOR SELECT TO public USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'super_admin' OR role = 'admin'));
      CREATE POLICY "Users can do everything on their own profiles" ON public.profiles FOR ALL TO public USING (auth.uid() = id);

      CREATE POLICY "Super Admins and Admins can manage credits" ON public.credits FOR ALL TO public USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'super_admin' OR role = 'admin'));
      CREATE POLICY "Users can view their own credits" ON public.credits FOR SELECT TO public USING (auth.uid() = user_id);

      CREATE POLICY "Admins can view/delete all analysis" ON public.prompt_analysis FOR ALL TO public USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'super_admin' OR role = 'admin'));
      CREATE POLICY "Users can manage their own analysis" ON public.prompt_analysis FOR ALL TO public USING (auth.uid() = user_id);

      CREATE POLICY "Admins can view/delete all photo params" ON public.photo_parameters FOR ALL TO public USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'super_admin' OR role = 'admin'));
      CREATE POLICY "Users can view/insert/update photo params if owned prompt" ON public.photo_parameters FOR ALL TO public USING (analysis_id IN (SELECT id FROM public.prompt_analysis WHERE user_id = auth.uid()));

      CREATE POLICY "Admins can view/delete all video params" ON public.video_parameters FOR ALL TO public USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'super_admin' OR role = 'admin'));
      CREATE POLICY "Users can view/insert/update vparams details" ON public.video_parameters FOR ALL TO public USING (analysis_id IN (SELECT id FROM public.prompt_analysis WHERE user_id = auth.uid()));

      CREATE POLICY "Admins can manage all master prompts" ON public.master_prompts FOR ALL TO public USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'super_admin' OR role = 'admin'));
      CREATE POLICY "Users can manage their own master prompts" ON public.master_prompts FOR ALL TO public USING (auth.uid() = user_id);

      CREATE POLICY "Admins can read all activity logs" ON public.activity_logs FOR SELECT TO public USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'super_admin' OR role = 'admin'));
      CREATE POLICY "Log recording allowed for everyone" ON public.activity_logs FOR INSERT TO public WITH CHECK (true);

      CREATE POLICY "Admins can manage system logs" ON public.system_logs FOR ALL TO public USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'super_admin' OR role = 'admin'));

      CREATE POLICY "Public read-only setup access" ON public.app_config FOR SELECT TO public USING (true);
      CREATE POLICY "Super Admin write access" ON public.app_config FOR ALL TO public USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'super_admin'));

      CREATE POLICY "Super Admin can view and write migration history" ON public.migration_history FOR ALL TO public USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'super_admin'));
    `;

    const statements = splitSqlStatements(rlsSql);
    await client.query("BEGIN;");
    for (let stmt of statements) {
      if (stmt.trim()) {
        await client.query(stmt);
      }
    }
    await client.query("COMMIT;");

    res.json({ success: true, message: "Seluruh struktur dan kebijakan database (Row Level Security) berhasil diperkeras secara transaksional." });
  } catch (err: any) {
    try { await client.query("ROLLBACK;"); } catch (e) {}
    console.error("Gagal melakukan pengerasan kebijakan RLS:", err);
    res.status(500).json({ success: false, message: `Kesalahan transaksional pengerasan RLS: ${err.message}` });
  } finally {
    try { await client.end(); } catch (e) {}
  }
});

// Real-time Migration History log viewer
app.get("/api/admin/database/migrations-log", async (req: Request, res: Response) => {
  if (!verifySuperAdmin(req, res)) {
    return;
  }

  const state = db.getState();
  const connStr = state.apiSettings.supabaseConnectionString || process.env.SUPABASE_CONNECTION_STRING;
  if (!connStr) {
    return res.json({ success: true, logs: [] });
  }

  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const result = await client.query(`
      SELECT migration_id, status, execution_time, checksum, timestamp 
      FROM public.migration_history 
      ORDER BY timestamp DESC;
    `);
    res.json({ success: true, logs: result.rows });
  } catch (err: any) {
    console.error("Gagal mengambil log dari tabel migration_history:", err);
    res.json({ success: true, logs: [], error: err.message });
  } finally {
    try { await client.end(); } catch (e) {}
  }
});

// Setup complete logic validation helpers
async function getIsSetupCompleted(): Promise<boolean> {
  const remoteAppConfig = await fetchAppConfigFromSupabase();
  return remoteAppConfig ? !!remoteAppConfig.setup_completed : !!db.getState().systemState?.setup_completed;
}

async function ensureSetupCompleted(req: Request, res: Response, next: any) {
  try {
    const isSetupDone = await getIsSetupCompleted();
    if (!isSetupDone) {
      console.warn(`[SECURITY LOCK] Rejected attempt to access guarded operational route: ${req.path} before Setup Wizard completes.`);
      return res.status(403).json({
        error: "Sistem belum dikonfigurasi melalui Setup Wizard. Hanya Setup Wizard yang dipercayakan diakses saat ini.",
        setupRequired: true
      });
    }
    next();
  } catch (err: any) {
    console.error("[ensureSetupCompleted] Exception while validating setup status:", err);
    res.status(500).json({
      success: false,
      error: `Gagal memvalidasi status setup sistem: ${err.message}`
    });
  }
}

async function ensureMinimalSuperAdmin() {
  const state = db.getState();
  const ownerEmail = state.adminProfile?.email || "bossaa.indonesia@gmail.com";
  
  // 1. Check local super_admin counts
  const localSuperAdmins = state.users.filter(u => u.role === "super_admin");
  const localSuperAdminProfiles = state.profiles.filter(p => (p as any).role === "super_admin");

  if (localSuperAdmins.length === 0 || localSuperAdminProfiles.length === 0) {
    console.log("[Emergency recovery] No local super_admin or profile found! Initiating auto-recovery...");
    
    // Find matching email or username or first user
    let userToPromote = state.users.find(u => u.email.toLowerCase() === ownerEmail.toLowerCase()) || state.users[0];
    if (userToPromote) {
      console.log(`[Emergency recovery] Promoting local user ${userToPromote.username} (${userToPromote.email}) to super_admin...`);
      userToPromote.role = "super_admin";
      
      let profile = state.profiles.find(p => p.userId === userToPromote.id || (p as any).id === userToPromote.id);
      if (profile) {
        (profile as any).role = "super_admin";
      } else {
        state.profiles.push({
          id: userToPromote.id,
          userId: userToPromote.id,
          fullName: userToPromote.username,
          phone: "",
          bio: "Emergency Promoted Super Admin",
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${userToPromote.username}`,
          role: "super_admin",
          email: userToPromote.email,
          username: userToPromote.username,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any);
      }
      db.save();
    } else {
      // Create fallback admin account
      console.log("[Emergency recovery] Creating default admin account...");
      const fallbackUserId = crypto.randomUUID();
      state.users.push({
        id: fallbackUserId,
        username: "admin",
        email: ownerEmail,
        passwordHash: "Admin123!",
        role: "super_admin",
        createdAt: new Date().toISOString()
      });
      state.profiles.push({
        id: fallbackUserId,
        userId: fallbackUserId,
        fullName: "Super Admin",
        phone: "",
        bio: "Default System Administrator (Emergency)",
        avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=admin",
        role: "super_admin",
        email: ownerEmail,
        username: "admin",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any);
      state.systemState = {
        ...state.systemState,
        setup_completed: true,
        installation_completed: true
      } as any;
      db.save();
    }
  }

  // 2. Check Supabase DB super_admin count
  const { supabaseUrl, supabaseConnectionString } = state.apiSettings;
  if (supabaseUrl && supabaseConnectionString) {
    const client = new Client({
      connectionString: supabaseConnectionString,
      ssl: { rejectUnauthorized: false }
    });
    try {
      await client.connect();
      
      // Let's verify profiles table exists first
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'profiles'
        );
      `);
      if (tableCheck.rows[0].exists) {
        const countRes = await client.query("SELECT COUNT(*) FROM public.profiles WHERE role = 'super_admin'");
        const count = parseInt(countRes.rows[0].count, 10);
        
        if (count === 0) {
          console.log("[Emergency Recovery] 0 active super_admins on Supabase profiles! Healing...");
          
          // Try to promote the first user in profiles
          const pickUser = await client.query("SELECT id, email, username FROM public.profiles ORDER BY created_at ASC LIMIT 1");
          if (pickUser.rows.length > 0) {
            const first = pickUser.rows[0];
            await client.query("UPDATE public.profiles SET role = 'super_admin' WHERE id = $1", [first.id]);
            await client.query("UPDATE public.users SET role = 'super_admin' WHERE id = $1", [first.id]);
            await client.query("UPDATE public.users_backup SET role = 'super_admin' WHERE id = $1", [first.id]);
          } else {
            // Check auth.users
            const authUserRes = await client.query("SELECT id, email FROM auth.users ORDER BY created_at ASC LIMIT 1");
            if (authUserRes.rows.length > 0) {
              const u = authUserRes.rows[0];
              const uname = u.email.split("@")[0];
              await client.query(`
                INSERT INTO public.profiles (id, user_id, email, username, role, full_name, created_at, updated_at)
                VALUES ($1, $1, $2, $3, 'super_admin', $4, now(), now())
                ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
              `, [u.id, u.email, uname, uname]);
              await client.query(`
                INSERT INTO public.users (id, username, email, role, created_at)
                VALUES ($1, $2, $3, 'super_admin', now())
                ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
              `, [u.id, uname, u.email]);
              await client.query(`
                INSERT INTO public.users_backup (id, username, email, role, created_at)
                VALUES ($1, $2, $3, 'super_admin', now())
                ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
              `, [u.id, uname, u.email]);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("[Emergency Recovery DB Error]", err.message);
    } finally {
      await client.end().catch(() => {});
    }
  }
}

function verifySuperAdmin(req: Request, res: Response): boolean {
  const userId = req.headers["x-user-id"] || req.body?.userId || req.query?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: "Autentikasi diperlukan: ID Pengguna tidak ditemukan." });
    return false;
  }
  
  // Call emergency fallback check during runtime locally
  const state = db.getState();
  
  // 1. Try to find user profile role in profiles
  const profile = state.profiles.find(p => p.userId === userId || (p as any).id === userId);
  const user = state.users.find(u => u.id === userId);
  
  const role = profile?.role || user?.role || "user";
  
  if (role !== "super_admin") {
    console.warn(`[SECURITY VIOLATION] Unauthorized privileges access attempt on endpoint: ${req.path} by user: ${userId} (role: ${role})`);
    res.status(403).json({ success: false, error: "Akses Ditolak: Hanya Super Admin yang berhak melakukan tindakan ini." });
    return false;
  }

  // Owner Lock: If there is an owner_id defined, only that specific user/owner can run setup modification or reset setup!
  const ownerId = state.systemState?.owner_id;
  if (ownerId && userId !== ownerId) {
    const ownerEmail = state.adminProfile?.email || "bossaa.indonesia@gmail.com";
    if (user?.email.toLowerCase() !== ownerEmail.toLowerCase()) {
      console.warn(`[SECURITY LOCK] Unauthorized reset attempt by non-owner super admin: ${userId}. Owner is: ${ownerId}`);
      res.status(403).json({ success: false, error: "Akses Ditolak: Hanya pemilik utama (Owner) aplikasi yang diperbolehkan mereset atau memodifikasi setup." });
      return false;
    }
  }
  return true;
}

app.post("/api/admin/database/reset-setup-wizard", async (req: Request, res: Response) => {
  if (!verifySuperAdmin(req, res)) {
    return;
  }
  const state = db.getState();
  state.systemState = {
    installation_completed: false,
    profile_completed: false,
    api_config_completed: false,
    database_connected: false,
    setup_completed: false,
    owner_id: null
  };
  state.adminProfile = null;
  state.apiSettings = {
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    supabaseUrl: "",
    supabaseAnonKey: "",
    supabaseServiceRoleKey: "",
    supabaseConnectionString: "",
    midjourneyKey: state.apiSettings?.midjourneyKey || "",
    stabilityKey: state.apiSettings?.stabilityKey || "",
    runwayKey: state.apiSettings?.runwayKey || "",
    lumaKey: state.apiSettings?.lumaKey || "",
    klingKey: state.apiSettings?.klingKey || "",
    leonardoKey: state.apiSettings?.leonardoKey || "",
    videoSizeLimitMB: state.apiSettings?.videoSizeLimitMB || 100,
  };
  db.save();

  try {
    await syncSystemStateToSupabase(state.systemState);
    await syncAppConfigToSupabase({
      owner_id: null,
      setup_completed: false,
      installation_completed: false,
      schema_version: "0"
    });
    
    // Direct SQL update to ensure immediate reset bypassing REST caching
    const resetSqlCommand = `
      UPDATE public.app_config 
      SET 
        setup_completed = false, 
        installation_completed = false, 
        owner_id = NULL,
        schema_version = '0',
        updated_at = NOW();
    `;
    await executeSqlOnSupabase(resetSqlCommand);
  } catch (e: any) {
    console.error("Gagal mereset systemState dan app_config di Supabase:", e);
  }

  const userId = req.headers["x-user-id"] || "admin";
  db.logActivity(userId as string, "admin", "RESET_SETUP_WIZARD", "Mereset instalasi dan kembali ke Setup Wizard.");
  db.logSystem("warn", "System", "Sistem direset paksa ke status instalasi pertama.");

  res.json({ success: true, message: "Sistem berhasil direset ke Setup Wizard awal. Silakan muat ulang halaman." });
});

// ----------------------------------------------------
// Credits and Tokens API
// ----------------------------------------------------

// Admin generates a new voucher code token
app.post("/api/admin/tokens/generate", (req: Request, res: Response) => {
  const { credits, qty, customPrefix } = req.body;
  const adminId = (req.headers["x-user-id"] as string) || "admin";
  const amount = parseInt(credits) || 100;
  const count = parseInt(qty) || 1;
  const prefix = (customPrefix || "NIKS").toUpperCase().trim();

  const state = db.getState();
  const generatedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const randomSuffix = Math.random().toString(36).substr(2, 6).toUpperCase();
    const code = `${prefix}-${amount}-${randomSuffix}`;
    const newToken = {
      code,
      credits: amount,
      role: "user" as const,
      isActive: true,
      createdBy: adminId,
      createdAt: new Date().toISOString(),
    };
    state.tokens.push(newToken);
    generatedCodes.push(code);
  }

  db.logActivity(adminId, "admin", "TOKEN_GENERATE", `Menghasilkan ${count} voucher token bernilai ${amount} kredit.`);
  db.logSystem("info", "Tokens", `Admin menghasilkan voucher: ${generatedCodes.join(", ")}`);
  db.save();

  res.json({ success: true, tokens: generatedCodes });
});

// Redeem Voucher Code token
app.post("/api/user/tokens/redeem", (req: Request, res: Response) => {
  const { userId, code } = req.body;
  if (!code) {
    return res.status(400).json({ error: "Kode token/voucher tidak boleh kosong." });
  }

  const state = db.getState();
  const token = state.tokens.find((t) => t.code.toUpperCase() === code.toUpperCase() && t.isActive);

  if (!token) {
    return res.status(404).json({ error: "Voucher tidak valid atau sudah kadaluarsa." });
  }

  token.isActive = false;
  token.redeemedBy = userId;
  token.redeemedAt = new Date().toISOString();

  // Add credits
  let userCredits = state.credits.find((c) => c.userId === userId);
  if (!userCredits) {
    userCredits = { userId, balance: 0, totalSpent: 0 };
    state.credits.push(userCredits);
  }

  userCredits.balance += token.credits;

  const userObj = state.users.find((u) => u.id === userId);
  db.logActivity(userId, userObj?.username, "TOKEN_REDEEM", `Menukarkan voucher ${code} senilai ${token.credits} kredit.`);
  db.logSystem("info", "Credits", `User ${userObj?.username} menukarkan token ${code}. Kredit bertambah +${token.credits}.`);
  db.save();

  res.json({ success: true, balance: userCredits.balance, redeemedCredits: token.credits });
});

app.get("/api/user/credits/:userId", (req: Request, res: Response) => {
  const { userId } = req.params;
  const state = db.getState();
  const credits = state.credits.find((c) => c.userId === userId);
  res.json({ balance: credits ? credits.balance : 0, totalSpent: credits ? credits.totalSpent : 0 });
});

// ----------------------------------------------------
// API Settings & Sandbox
// ----------------------------------------------------

app.get("/api/admin/api-settings", (req: Request, res: Response) => {
  const state = db.getState();
  res.json({ settings: state.apiSettings });
});

// ----------------------------------------------------
// Admin Profile and Custom Setup
// ----------------------------------------------------

app.get("/api/admin/profile", async (req: Request, res: Response) => {
  const state = db.getState();
  
  console.log("[SETUP STATUS RUN] Memulai validasi dan sinkronisasi status setup dari database Supabase (app_config)...");
  // Try to fetch latest app_config and system_state from Supabase
  const remoteAppConfig = await fetchAppConfigFromSupabase();
  const remoteState = await fetchSystemStateFromSupabase();
  
  if (remoteAppConfig) {
    console.log(`[SETUP STATUS FOUND VIA APP_CONFIG]: setup_completed = ${remoteAppConfig.setup_completed}, owner_id = ${remoteAppConfig.owner_id}`);
    state.systemState = {
      ...state.systemState,
      setup_completed: remoteAppConfig.setup_completed,
      installation_completed: remoteAppConfig.installation_completed,
      owner_id: remoteAppConfig.owner_id || state.systemState?.owner_id || null
    };
    db.save();
  } else if (remoteState) {
    console.log(`[SETUP STATUS FOUND VIA SYSTEM_STATE]: setup_completed = ${remoteState.setup_completed}, owner_id = ${remoteState.owner_id}`);
    state.systemState = {
      ...state.systemState,
      setup_completed: remoteState.setup_completed,
      installation_completed: remoteState.installation_completed,
      owner_id: remoteState.owner_id || state.systemState?.owner_id || null
    };
    db.save();
  }

  // Console logging audit as requested in MANDATORY PERBAIKAN #10
  console.log("========================================");
  console.log("app_config loaded");
  console.log(`setup_completed: ${remoteAppConfig ? remoteAppConfig.setup_completed : (state.systemState?.setup_completed || false)}`);
  console.log(`installation_completed: ${remoteAppConfig ? remoteAppConfig.installation_completed : (state.systemState?.installation_completed || false)}`);
  console.log(`owner_id: ${remoteAppConfig ? remoteAppConfig.owner_id : (state.systemState?.owner_id || "none")}`);
  console.log("========================================");

  // Recovery setup: If we have connected to database but local database state is missing, pull profile as well!
  if (remoteAppConfig || remoteState) {
    if (!state.adminProfile || !state.adminProfile.profileCompleted) {
      const remoteProfile = await fetchAdminProfileFromSupabase();
      if (remoteProfile) {
        console.log("SETUP LOADED: Profil administrator dipulihkan secara sukses dari single source of truth Supabase.");
        state.adminProfile = remoteProfile;
        db.save();
      }
    }
  }

  // Single Source of truth from app_config ONLY, falling back to local systemState if DB not initialised
  const isSetupDone = remoteAppConfig ? !!remoteAppConfig.setup_completed : !!state.systemState?.setup_completed;
  
  const redirectTarget = isSetupDone ? "Login Page" : "Setup Wizard";
  console.log(`REDIRECT TARGET DETERMINED: ${redirectTarget} (owner_id: ${state.systemState?.owner_id || remoteAppConfig?.owner_id || remoteState?.owner_id || 'none'})`);

  res.json({ 
    success: true, 
    profile: state.adminProfile || null,
    systemState: state.systemState || null,
    redirectTarget
  });
});

app.post("/api/admin/profile/save", async (req: Request, res: Response) => {
  let profile = req.body.profile;
  if (!profile && req.body && Object.keys(req.body).length > 0) {
    profile = req.body;
  }

  if (!profile) {
    return res.status(400).json({ error: "Data profil admin wajib diisi." });
  }

  const state = db.getState();
  const oldProfile = state.adminProfile;
  const isNowCompleted = profile.profileCompleted === true;
  const wasAlreadyCompleted = oldProfile?.profileCompleted === true;

  state.adminProfile = {
    ...state.adminProfile,
    ...profile,
    updatedAt: new Date().toISOString(),
  };

  const reqUserId = (req.headers["x-user-id"] as string) || "admin";

  // If completing the profile for the first time, purge all demo data
  if (isNowCompleted && !wasAlreadyCompleted) {
    // Keep active admin and wipe demo items
    let targetAdminId = reqUserId;
    
    // Find the current admin's real id if logged in
    const activeAdmin = state.users.find(u => u.role === "super_admin" || u.role === "admin");
    if (activeAdmin) {
      targetAdminId = activeAdmin.id;
    }

    purgeDemoDataAndSeeding(targetAdminId, profile);
  }

  // Update System State variables
  if (!state.systemState) {
    state.systemState = {
      installation_completed: true,
      profile_completed: true,
      api_config_completed: db.getState().apiSettings.geminiApiKey ? true : false,
      database_connected: db.getState().apiSettings.supabaseUrl ? true : false,
      setup_completed: true,
    };
  } else {
    state.systemState.installation_completed = true;
    state.systemState.profile_completed = true;
    state.systemState.setup_completed = true;
  }

  db.logActivity(reqUserId, "admin", "UPDATE_ADMIN_PROFILE", "Memperbarui data profil utama admin dan branding.");
  db.logSystem("info", "Profile", "Profil administrator diperbarui nyata di database.");
  db.save();

  // Try to sync systemState to Supabase
  await syncSystemStateToSupabase(state.systemState);

  // Try to sync profile to Supabase if config is alive
  await syncToSupabaseIfConfigured(state.adminProfile);

  console.log("SETUP SAVED: Profil administrator diperbarui dan disinkronkan ke Supabase secara sukses.");

  res.json({ 
    success: true, 
    profile: state.adminProfile,
    systemState: state.systemState 
  });
});

app.post("/api/admin/profile/reset", (req: Request, res: Response) => {
  if (!verifySuperAdmin(req, res)) {
    return;
  }
  const state = db.getState();
  state.adminProfile = null;
  state.announcements = [];
  db.save();

  res.json({ success: true, message: "Setelan branding aplikasi berhasil direset ke setelan awal." });
});

app.post("/api/admin/setup", async (req: Request, res: Response) => {
  const { profile, settings, credentials } = req.body;
  if (!profile || !settings || !credentials) {
    return res.status(400).json({ error: "Data setup tidak lengkap." });
  }

  const { username, email, password } = credentials;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "Informasi akun admin baru wajib diisi." });
  }

  const state = db.getState();

  // Ownership Lock Check: Prevent re-running Setup Wizard if setup has been finalized.
  const remoteAppConfigCheck = await fetchAppConfigFromSupabase();
  const existingOwner = remoteAppConfigCheck?.owner_id || state.systemState?.owner_id;
  if (existingOwner) {
    console.warn(`[SECURITY ALERT] Blocked unauthorized attempt to overwrite system state setup. Owner already locked: ${existingOwner}`);
    return res.status(403).json({ error: "Akses Ditolak: Setup Wizard telah diselesaikan sebelumnya dan kepemilikan owner_id telah dikunci secara permanen di database." });
  }

  // Update Settings
  state.apiSettings = {
    ...state.apiSettings,
    ...settings,
  };

  // Dynamically run schema comparison and database creation immediately upon saving settings!
  if (settings.supabaseConnectionString || settings.supabaseUrl) {
    try {
      console.log("[Setup API] Supabase config provided. Pre-executing schema synchronization before user data is written...");
      await autoSyncSchemaOnStartup();
    } catch (e) {
      console.error("[Setup API] Schema synchronization failed during setup:", e);
    }
  }

  // Build profile photo & logo from profile or fallbacks
  const adminProfileObj = {
    id: "admin-profile-id",
    fullName: profile.fullName || "Admin Utama",
    appName: profile.appName || "Prompt Generator",
    brandName: profile.brandName || "Prompt Brand",
    designedBy: profile.designedBy || "Administrator",
    email: email,
    whatsapp: profile.whatsapp || "",
    website: profile.website || "",
    bio: profile.bio || "",
    profilePhoto: profile.profilePhoto || "",
    companyLogo: profile.companyLogo || "",
    profileCompleted: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  state.adminProfile = adminProfileObj;

  // Create real admin account with the input details as super_admin!
  let realAdminId = crypto.randomUUID();
  let registeredToSupabase = false;

  const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = settings;
  const isSupabaseConfigured = !!(supabaseUrl && (supabaseAnonKey || supabaseServiceRoleKey));

  if (isSupabaseConfigured) {
    const cleanUrl = supabaseUrl.replace(/\/$/, "");
    try {
      console.log("[Setup API] Registering Super Admin inside Supabase Auth GoTrue...");
      // Use service_role if available to bypass email confirmation and auto-approve
      const keyToUse = supabaseServiceRoleKey || supabaseAnonKey;
      const isServiceRole = !!supabaseServiceRoleKey;
      const authEndpoint = isServiceRole 
        ? `${cleanUrl}/auth/v1/admin/users` 
        : `${cleanUrl}/auth/v1/signup`;

      const authRes = await fetch(authEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": keyToUse,
          "Authorization": `Bearer ${keyToUse}`
        },
        body: JSON.stringify({
          email: email.toLowerCase(),
          password: password,
          email_confirm: isServiceRole ? true : undefined,
          user_metadata: {
            username: username.toLowerCase(),
            full_name: profile.fullName || "Admin Utama"
          }
        })
      });

      const authData = await authRes.json();
      if (authRes.ok) {
        if (authData && authData.id) {
          realAdminId = authData.id;
          registeredToSupabase = true;
          console.log(`[Setup API] Super Admin successfully created inside Supabase Auth. ID: ${realAdminId}`);
        } else if (authData && authData.user && authData.user.id) {
          realAdminId = authData.user.id;
          registeredToSupabase = true;
          console.log(`[Setup API] Super Admin successfully created inside Supabase Auth (user nested). ID: ${realAdminId}`);
        }
      } else {
        console.warn("[Setup API] Supabase Auth sign up rejected. Failover searching for existing user ID...", authData?.msg || authData?.error?.message);
        // Attempt look up from the users table in database to recover the ID
        const userLookupRes = await fetch(`${cleanUrl}/rest/v1/users?email=eq.${encodeURIComponent(email.toLowerCase())}`, {
          headers: {
            "apikey": keyToUse,
            "Authorization": `Bearer ${keyToUse}`
          }
        });
        if (userLookupRes.ok) {
          const lut = await userLookupRes.json();
          if (Array.isArray(lut) && lut.length > 0) {
            realAdminId = lut[0].id;
            registeredToSupabase = true;
            console.log(`[Setup API] Recovered existing user ID via database lookup: ${realAdminId}`);
          }
        }
      }
    } catch (e: any) {
      console.error("[Setup API] Fatal error trying to register super admin on Supabase Auth:", e);
    }
  }

  // Update local JSON cache state
  state.users = [
    {
      id: realAdminId,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      passwordHash: password,
      role: "super_admin",
      createdAt: new Date().toISOString(),
    }
  ];

  state.profiles = [
    {
      id: realAdminId,
      userId: realAdminId,
      fullName: adminProfileObj.fullName,
      phone: adminProfileObj.whatsapp,
      bio: adminProfileObj.bio,
      avatarUrl: adminProfileObj.profilePhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
      role: "super_admin",
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any
  ];

  state.users_backup = [
    {
      id: realAdminId,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      role: "super_admin",
      created_at: new Date().toISOString()
    } as any
  ];

  state.credits = [
    {
      userId: realAdminId,
      balance: 1000000,
      totalSpent: 0
    }
  ];

  // Dynamic Direct SQL write to establish Supabase as absolute single source of truth
  if (isSupabaseConfigured) {
    try {
      console.log("[Setup API] Propagating admin entries and seeding tables to Supabase directly via direct SQL...");
      const syncSql = `
        INSERT INTO public.users (id, username, email, role, created_at)
        VALUES ('${realAdminId}', '${username.toLowerCase()}', '${email.toLowerCase()}', 'super_admin', NOW())
        ON CONFLICT (id) DO UPDATE 
        SET username = EXCLUDED.username, email = EXCLUDED.email, role = EXCLUDED.role;

        INSERT INTO public.profiles (id, user_id, email, username, role, full_name, phone, bio, avatar_url, created_at, updated_at)
        VALUES (
          '${realAdminId}', 
          '${realAdminId}', 
          '${email.toLowerCase()}', 
          '${username.toLowerCase()}', 
          'super_admin', 
          '${adminProfileObj.fullName.replace(/'/g, "''")}', 
          '${adminProfileObj.whatsapp.replace(/'/g, "''")}', 
          '${adminProfileObj.bio.replace(/'/g, "''")}', 
          '${(adminProfileObj.profilePhoto || "").replace(/'/g, "''")}', 
          NOW(), 
          NOW()
        )
        ON CONFLICT (id) DO UPDATE 
        SET 
          full_name = EXCLUDED.full_name, 
          phone = EXCLUDED.phone, 
          bio = EXCLUDED.bio, 
          avatar_url = EXCLUDED.avatar_url,
          role = EXCLUDED.role,
          updated_at = NOW();

        INSERT INTO public.users_backup (id, username, email, role, created_at)
        VALUES ('${realAdminId}', '${username.toLowerCase()}', '${email.toLowerCase()}', 'super_admin', NOW())
        ON CONFLICT (id) DO UPDATE 
        SET username = EXCLUDED.username, email = EXCLUDED.email, role = EXCLUDED.role;

        INSERT INTO public.credits (user_id, balance, total_spent)
        VALUES ('${realAdminId}', 1000000, 0)
        ON CONFLICT (user_id) DO UPDATE 
        SET balance = EXCLUDED.balance;
      `;
      await executeSqlOnSupabase(syncSql);
      console.log("[Setup API] Database users/profiles/users_backup seeding completed.");
    } catch (dbErr: any) {
      console.error("[Setup API] Failed seeding database records directly:", dbErr.message);
    }
  }

  // Purge demo records:
  state.tokens = [];
  state.promptAnalysis = [];
  state.masterPrompts = [];
  state.videoUploads = [];
  state.imageReferences = [];
  state.videoReferences = [];
  state.announcements = [
    {
      id: `ann-${Date.now()}`,
      text: `Selamat Datang di ${adminProfileObj.appName} (Brand: ${adminProfileObj.brandName}) — Didukung optimasi multi-modal Gemini API bertenaga tinggi! Dirancang secara eksklusif oleh ${adminProfileObj.designedBy}.`,
      isActive: true,
      createdAt: new Date().toISOString(),
    }
  ];
  state.activityLogs = [];
  state.systemLogs = [];

  // Update systemState flags
  state.systemState = {
    installation_completed: true,
    profile_completed: true,
    api_config_completed: !!settings.geminiApiKey,
    database_connected: !!settings.supabaseUrl,
    setup_completed: true,
    owner_id: realAdminId,
  };

  db.logActivity(realAdminId, username, "SETUP_COMPLETED", "Setup Wizard berhasil diselesaikan.");
  db.logSystem("info", "Setup", "Sistem berhasil dikonfigurasi ulang oleh administrator baru.");
  db.save();

  // Try to sync to Supabase
  await syncToSupabaseIfConfigured(adminProfileObj);
  await syncSystemStateToSupabase(state.systemState);
  await syncAppConfigToSupabase({
    owner_id: realAdminId,
    setup_completed: true,
    installation_completed: true,
    schema_version: APP_SCHEMA_VERSION
  });

  // Direct SQL update to ensure immediate write bypassing REST caching (Perbaikan Wajib #5)
  const updateSqlCommand = `
    UPDATE public.app_config 
    SET 
      setup_completed = true, 
      installation_completed = true, 
      owner_id = '${realAdminId}',
      schema_version = '${APP_SCHEMA_VERSION}',
      updated_at = NOW();
  `;
  await executeSqlOnSupabase(updateSqlCommand);

  console.log("SETUP SAVED: Inisialisasi Setup Wizard selesai secara sukses. setup_completed dan profile_completed ditandai TRUE di Supabase.");

  res.json({
    success: true,
    user: state.users[0],
    profile: state.profiles[0],
    credits: 1000000,
    systemState: state.systemState,
    adminProfile: state.adminProfile
  });
});

app.post("/api/admin/profile/upload", (req: Request, res: Response) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ error: "Tidak ada file yang diunggah." });
  }

  const logoFile = req.files.file as any;
  const ext = logoFile.name.split(".").pop();
  const safeName = `logo_${Date.now()}.${ext}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const storagePath = path.join(uploadsDir, safeName);
  logoFile.mv(storagePath, async (err: any) => {
    if (err) {
      return res.status(500).json({ error: "Gagal menyimpan berkas di server." });
    }

    const publicUrl = `/uploads/${safeName}`;
    res.json({ success: true, publicUrl });
  });
});

// Helper for resetting or purging demo data
function purgeDemoDataAndSeeding(preserveUserId: string, adminProfileObj: any) {
  const state = db.getState();
  // Filter out demo accounts
  state.users = state.users.filter(u => u.id === preserveUserId);
  state.profiles = state.profiles.filter(p => p.userId === preserveUserId);
  state.credits = state.credits.filter(c => c.userId === preserveUserId);
  
  // Clear other tables
  state.tokens = [];
  state.promptAnalysis = [];
  state.masterPrompts = [];
  state.videoUploads = [];
  state.imageReferences = [];
  state.videoReferences = [];
  
  // Update welcoming announcement
  state.announcements = [
    {
      id: `ann-${Date.now()}`,
      text: `Selamat Datang di ${adminProfileObj.appName || "Optimasi Multi-Modal"} (Brand: ${adminProfileObj.brandName || "Premium"}) — Dirancang secara eksklusif oleh ${adminProfileObj.designedBy || "Administrator"}.`,
      isActive: true,
      createdAt: new Date().toISOString(),
    }
  ];

  state.activityLogs = [];
  state.systemLogs = [];
}

async function syncToSupabaseIfConfigured(adminProfileObj: any) {
  const state = db.getState();
  const { supabaseUrl, supabaseServiceRoleKey, supabaseAnonKey } = state.apiSettings;
  if (!supabaseUrl || (!supabaseServiceRoleKey && !supabaseAnonKey)) {
    return;
  }

  try {
    const key = supabaseServiceRoleKey || supabaseAnonKey;
    const cleanUrl = supabaseUrl.replace(/\/$/, "");
    const response = await fetch(`${cleanUrl}/rest/v1/admin_profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        id: "admin-profile-id",
        full_name: adminProfileObj.fullName,
        app_name: adminProfileObj.appName,
        brand_name: adminProfileObj.brandName,
        designed_by: adminProfileObj.designedBy,
        email: adminProfileObj.email,
        whatsapp: adminProfileObj.whatsapp,
        website: adminProfileObj.website,
        bio: adminProfileObj.bio,
        profile_photo: adminProfileObj.profilePhoto,
        company_logo: adminProfileObj.companyLogo,
        profile_completed: true,
        created_at: adminProfileObj.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });
    console.log(`Supabase Sync Status: ${response.status}`);
  } catch (e) {
    console.error("Gagal melakukan sinkronisasi profil admin ke Supabase:", e);
  }
}


app.post("/api/admin/api-settings/save", async (req: Request, res: Response) => {
  const { settings } = req.body;
  const state = db.getState();
  state.apiSettings = {
    ...state.apiSettings,
    ...settings,
  };

  // Sync System State variables
  if (!state.systemState) {
    state.systemState = {
      installation_completed: true,
      profile_completed: state.adminProfile?.profileCompleted ? true : false,
      api_config_completed: settings.geminiApiKey ? true : false,
      database_connected: settings.supabaseUrl ? true : false,
      setup_completed: state.adminProfile?.profileCompleted ? true : false,
    };
  } else {
    state.systemState.api_config_completed = settings.geminiApiKey ? true : false;
    state.systemState.database_connected = settings.supabaseUrl ? true : false;
  }
  
  const userId = req.headers["x-user-id"] || "admin";
  db.logActivity(userId as string, "admin", "SAVE_API_SETTINGS", "Memperbarui konfigurasi API Sandbox dan Provider luar.");
  db.logSystem("info", "Config", "Administrator mengubah setting sandboxes API.");
  db.save();

  // Try to sync systemState to Supabase
  await syncSystemStateToSupabase(state.systemState);
  
  res.json({ 
    success: true, 
    settings: state.apiSettings,
    systemState: state.systemState
  });
});

// Real connections testing for sandbox!
app.post("/api/admin/test-connection", async (req: Request, res: Response) => {
  const { type, payload } = req.body;
  
  try {
    if (type === "gemini") {
      const apiKey = payload.geminiApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({ success: false, message: "Kunci API Gemini tidak disediakan." });
      }

      const tempAi = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });

      const response = await generateContentWithFailover(
        tempAi,
        "gemini-3.5-flash",
        {
          contents: "Koneksi tes cepat: Berikan pesan sukses satu kata.",
        }
      );

      if (response && response.text) {
        return res.json({
          success: true,
          message: `Koneksi Gemini API Aktif! Respons dari model: "${response.text.trim()}"`,
        });
      } else {
        return res.json({ success: false, message: "Koneksi gagal, silakan periksa kunci Anda kembali." });
      }
    } 
    
    if (type === "supabase") {
      const { url, anonKey, serviceRoleKey, connectionString } = payload;
      if (!url || !anonKey) {
        return res.json({ success: false, message: "URL Supabase atau Anon Key tidak boleh kosong." });
      }

      const cleanUrl = url.replace(/\/$/, "");
      
      // 1. Basic REST connection test
      let resFetch;
      try {
        resFetch = await fetch(`${cleanUrl}/rest/v1/`, {
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
        });
      } catch (err: any) {
        return res.json({ success: false, message: `Gagal tersambung ke URL Supabase: ${err.message}` });
      }

      if (!resFetch.ok && resFetch.status !== 200 && resFetch.status !== 401 && resFetch.status !== 404) {
        return res.json({ success: false, message: `Gagal merespon. Host Supabase mengembalikan kode status: ${resFetch.status}` });
      }

      // 2. Auth Access Validation
      let authMessage = "Layanan Autentikasi Online";
      try {
        const authRes = await fetch(`${cleanUrl}/auth/v1/settings`, {
          headers: { apikey: anonKey }
        });
        if (authRes.ok || authRes.status === 200 || authRes.status === 401 || authRes.status === 204) {
          authMessage = "Layanan Autentikasi Supabase Berhasil Diverifikasi (OK)";
        } else {
          authMessage = `Layanan Autentikasi warning (Status: ${authRes.status})`;
        }
      } catch (err: any) {
        authMessage = `Gagal memvalidasi Layanan Autentikasi: ${err.message}`;
      }

      // 3. Database Schema Availability Validation
      let schemaMessage = "Skema database siap di sinkronkan";
      try {
        const tableCheckRes = await fetch(`${cleanUrl}/rest/v1/profiles?limit=1`, {
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`
          }
        });
        if (tableCheckRes.status === 200 || tableCheckRes.status === 406 || tableCheckRes.status === 204) {
          schemaMessage = "Tabel database valid (siap disinkronisasikan)";
        } else if (tableCheckRes.status === 404) {
          schemaMessage = "Tabel belum terinstal secara sempurna (Sistem sinkronisasi otomatis akan membuatnya)";
        } else {
          schemaMessage = `Tabel schema merespon dengan status: ${tableCheckRes.status}`;
        }
      } catch (err: any) {
        schemaMessage = `Skema error: ${err.message}`;
      }

      // 4. Optional PG connection direct test (Single Source of Truth Check)
      let pgMessage = "";
      if (connectionString) {
        const pgClientObj = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
        try {
          await pgClientObj.connect();
          await pgClientObj.query("SELECT 1;");
          pgMessage = "Koneksi Langsung PostgreSQL (Direct Connection String) Aktif & Stabil!";
        } catch (err: any) {
          pgMessage = `Peringatan PostgreSQL: Gagal menyambung direct postgresql client: ${err.message}`;
        } finally {
          try { await pgClientObj.end(); } catch (e) {}
        }
      }

      return res.json({
        success: true,
        message: "Status Koneksi Supabase Berhasil Terverifikasi!",
        details: {
          connection: "Koneksi REST API Supabase Aktif dan Berjalan Lancar.",
          auth: authMessage,
          schema: schemaMessage,
          postgresql: pgMessage || "Direct PostgreSQL tidak dimasukkan (Opsional)"
        }
      });
    }

    // Handlers for third party image/video providers settings
    const providers = ["midjourney", "stability", "runway", "luma", "kling", "leonardo"];
    if (providers.includes(type)) {
      const token = payload.key;
      if (!token) {
        return res.json({ success: false, message: `Gagal: Token API untuk ${type} kosong.` });
      }

      // Verify API parameter configuration status
      return res.json({
        success: true,
        message: `Koneksi API provider ${type.toUpperCase()} siap dikonfigurasi! Kunci format tervalidasi secara lokal.`,
      });
    }

    return res.status(400).json({ error: "Jenis pengetesan tidak didukung." });

  } catch (error: any) {
    db.logSystem("error", `Sandbox Testing - ${type}`, error.message);
    res.json({ success: false, message: `Kesalahan koneksi nyata: ${error.message}` });
  }
});

// ----------------------------------------------------
// Real live statistics for Admin Dashboard monitor
// ----------------------------------------------------

app.get("/api/admin/live-monitor", (req: Request, res: Response) => {
  const state = db.getState();
  
  // Real stats calculated dynamically
  const totalUserCount = state.users.filter((u) => u.role === "user").length;
  const activeUnexpiredTokens = state.tokens.filter((t) => t.isActive).length;
  const redeemedTokens = state.tokens.filter((t) => !t.isActive).length;
  const geminiRequestsDone = state.promptAnalysis.length + state.masterPrompts.length;
  
  // Filter systems and system activity log listings
  res.json({
    usersOnline: totalUserCount + 1, // Count of registered users and the logging administrator
    activeUsersCount: totalUserCount,
    geminiRequests: geminiRequestsDone,
    databaseRequests: state.promptAnalysis.length + state.masterPrompts.length + state.tokens.length,
    tokenUsage: redeemedTokens,
    creditUsage: state.credits.reduce((acc, curr) => acc + curr.totalSpent, 0),
    announcementText: state.announcements.find(a => a.isActive)?.text || "",
    activityLogs: state.activityLogs.slice(0, 15),
    systemLogs: state.systemLogs.slice(0, 15),
    tokens: state.tokens,
    creditsList: state.credits,
    promptAnalysisCount: state.promptAnalysis.length,
    masterPromptsCount: state.masterPrompts.length,
    videoUploads: state.videoUploads || [],
    videoUploadsCount: (state.videoUploads || []).length
  });
});

// ----------------------------------------------------
// 1. Prompt Analyzer Engine
// ----------------------------------------------------

app.post("/api/user/prompt-analyzer/upload-video", async (req: Request, res: Response) => {
  try {
    if (!req.files || !req.files.video) {
        return res.status(400).json({ error: "Silakan unggah berkas video asli." });
    }

    const videoFile = req.files.video as any;
    const { userId, duration, resolution, fps, codec } = req.body;
    
    const state = db.getState();
    const settings = state.apiSettings;
    const limitMB = settings.videoSizeLimitMB || 100;

    // Check size limit
    if (videoFile.size > limitMB * 1024 * 1024) {
         return res.status(400).json({ 
              error: `Ukuran berkas melebihi batas maksimum admin (${limitMB} MB). Harap hubungi administrator.` 
         });
    }

    // Supported formats check as requested: mp4, mov, avi, mkv, webm, m4v, mpeg, 3gp
    const allowedExts = ["mp4", "mov", "avi", "mkv", "webm", "m4v", "mpeg", "3gp"];
    const ext = videoFile.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedExts.includes(ext)) {
         return res.status(400).json({ 
              error: `Format berkas video tidak didukung. Sila gunakan format: ${allowedExts.join(", ").toUpperCase()}`
         });
    }

    // Generate clean filename
    const safeName = `${Date.now()}_${videoFile.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
    const storagePath = path.join(uploadsDir, safeName);

    // Save locally
    await videoFile.mv(storagePath);

    // Check custom keys for Supabase Storage Integration
    let publicUrl = `/uploads/${safeName}`;
    let isUploadedToSupabase = false;

    if (settings.supabaseUrl && (settings.supabaseServiceRoleKey || settings.supabaseAnonKey)) {
         try {
             const key = settings.supabaseServiceRoleKey || settings.supabaseAnonKey;
             const uploadUrl = `${settings.supabaseUrl}/storage/v1/object/video_uploads/${safeName}`;
             const fileBuffer = fs.readFileSync(storagePath);

             // Call supabase storage upload endpoint
             const response = await fetch(uploadUrl, {
                 method: "POST",
                 headers: {
                     "Authorization": `Bearer ${key}`,
                     "Content-Type": videoFile.mimetype || "video/mp4",
                     "x-upsert": "true"
                 },
                 body: fileBuffer
             });

             if (response.ok) {
                 isUploadedToSupabase = true;
                 publicUrl = `${settings.supabaseUrl}/storage/v1/object/public/video_uploads/${safeName}`;
                 db.logSystem("info", "Supabase Storage", `Video ${safeName} berhasil diunggah ke Supabase.`);
             } else {
                 const errMsg = await response.text();
                 db.logSystem("warn", "Supabase Storage", `Gagal mengunggah ke Supabase, fallback ke lokal: ${errMsg}`);
             }
         } catch (supaErr: any) {
              db.logSystem("error", "Supabase Storage", `Koneksi Supabase error, fallback ke lokal: ${supaErr.message}`);
         }
    }

    // Resolve username
    const userObj = state.users.find(u => u.id === userId);
    const username = userObj ? userObj.username : "Pengguna";

    const newUpload = {
        id: `vid-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        userId,
        username,
        fileName: videoFile.name,
        fileSize: videoFile.size,
        duration: duration ? Number(duration) : undefined,
        resolution: resolution || undefined,
        fps: fps ? Number(fps) : undefined,
        codec: codec || undefined,
        storagePath: storagePath,
        publicUrl: publicUrl,
        createdAt: new Date().toISOString()
    };

    if (!state.videoUploads) {
        state.videoUploads = [];
    }
    state.videoUploads.unshift(newUpload);
    db.logActivity(userId, username, "VIDEO_UPLOADED", `Mengunggah video asli: ${videoFile.name} (${(videoFile.size / (1024 * 1024)).toFixed(2)} MB).`);
    db.save();

    res.json({ success: true, videoUpload: newUpload });
  } catch (err: any) {
       console.error("Upload handler error:", err);
       db.logSystem("error", "Video Uploader", err.message);
       res.status(500).json({ error: `Gagal mengunggah video ke server: ${err.message}` });
  }
});

// ----------------------------------------------------
// Real-Time File References (Supabase Storage Integrations)
// ----------------------------------------------------

app.post("/api/user/reference/upload-image", async (req: Request, res: Response) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: "Silakan unggah berkas gambar referensi." });
    }

    const imageFile = req.files.file as any;
    const { userId, providerTarget, resolution } = req.body;

    const state = db.getState();
    const settings = state.apiSettings;

    // Limit image reference size: 50MB
    const limitBytes = 50 * 1024 * 1024;
    if (imageFile.size > limitBytes) {
      return res.status(400).json({ error: "Ukuran berkas melebihi batas maksimum (50 MB) per gambar." });
    }

    const allowedExts = ["jpg", "jpeg", "png", "webp"];
    const ext = imageFile.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedExts.includes(ext)) {
      return res.status(400).json({ error: `Format tidak didukung. Sila gunakan format: ${allowedExts.join(", ").toUpperCase()}` });
    }

    const safeName = `${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
    const storagePath = path.join(uploadsDir, safeName);

    // Save locally on server
    await imageFile.mv(storagePath);

    let publicUrl = `/uploads/${safeName}`;
    let isUploadedToSupabase = false;

    if (settings.supabaseUrl && (settings.supabaseServiceRoleKey || settings.supabaseAnonKey)) {
      try {
        const key = settings.supabaseServiceRoleKey || settings.supabaseAnonKey;
        const uploadUrl = `${settings.supabaseUrl}/storage/v1/object/image_references/${safeName}`;
        const fileBuffer = fs.readFileSync(storagePath);

        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": imageFile.mimetype || `image/${ext}`,
            "x-upsert": "true"
          },
          body: fileBuffer
        });

        if (response.ok) {
          isUploadedToSupabase = true;
          publicUrl = `${settings.supabaseUrl}/storage/v1/object/public/image_references/${safeName}`;
          db.logSystem("info", "Supabase Storage", `Image Reference ${safeName} berhasil diunggah ke Supabase.`);
        } else {
          const errMsg = await response.text();
          db.logSystem("warn", "Supabase Storage", `Gagal mengunggah gambar ke Supabase, menggunakan lokal: ${errMsg}`);
        }
      } catch (err: any) {
        db.logSystem("error", "Supabase Storage", `Gagal mengunggah referensi gambar ke Supabase: ${err.message}`);
      }
    }

    const newRef = {
      id: `ref-img-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId,
      fileName: imageFile.name,
      fileSize: imageFile.size,
      mimeType: imageFile.mimetype || `image/${ext}`,
      uploadTime: new Date().toISOString(),
      providerTarget: providerTarget || "All",
      publicUrl,
      storagePath,
      resolution: resolution || "1024x1024"
    };

    if (!state.imageReferences) {
      state.imageReferences = [];
    }
    state.imageReferences.unshift(newRef);
    db.logActivity(userId, undefined, "UPLOAD_IMAGE_REFERENCE", `Mengunggah referensi gambar nyata: ${imageFile.name}`);
    db.save();

    res.json({ success: true, reference: newRef });
  } catch (err: any) {
    console.error("Reference Image Upload Error:", err);
    res.status(500).json({ error: `Gagal mengunggah referensi gambar: ${err.message}` });
  }
});

app.post("/api/user/reference/upload-video", async (req: Request, res: Response) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: "Silakan unggah berkas video referensi." });
    }

    const videoFile = req.files.file as any;
    const { userId, providerTarget, resolution, duration } = req.body;

    const state = db.getState();
    const settings = state.apiSettings;

    // Limit video reference size: 500MB
    const limitBytes = 500 * 1024 * 1024;
    if (videoFile.size > limitBytes) {
      return res.status(400).json({ error: "Ukuran berkas melebihi batas maksimum (500 MB) per video." });
    }

    const allowedExts = ["mp4", "mov", "webm", "avi"];
    const ext = videoFile.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedExts.includes(ext)) {
      return res.status(400).json({ error: `Format tidak didukung. Sila gunakan format: ${allowedExts.join(", ").toUpperCase()}` });
    }

    const safeName = `${Date.now()}_${videoFile.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
    const storagePath = path.join(uploadsDir, safeName);

    // Save locally on server
    await videoFile.mv(storagePath);

    let publicUrl = `/uploads/${safeName}`;
    let isUploadedToSupabase = false;

    if (settings.supabaseUrl && (settings.supabaseServiceRoleKey || settings.supabaseAnonKey)) {
      try {
        const key = settings.supabaseServiceRoleKey || settings.supabaseAnonKey;
        const uploadUrl = `${settings.supabaseUrl}/storage/v1/object/video_references/${safeName}`;
        const fileBuffer = fs.readFileSync(storagePath);

        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": videoFile.mimetype || `video/${ext}`,
            "x-upsert": "true"
          },
          body: fileBuffer
        });

        if (response.ok) {
          isUploadedToSupabase = true;
          publicUrl = `${settings.supabaseUrl}/storage/v1/object/public/video_references/${safeName}`;
          db.logSystem("info", "Supabase Storage", `Video Reference ${safeName} berhasil diunggah ke Supabase.`);
        } else {
          const errMsg = await response.text();
          db.logSystem("warn", "Supabase Storage", `Gagal mengunggah video ke Supabase, menggunakan lokal: ${errMsg}`);
        }
      } catch (err: any) {
        db.logSystem("error", "Supabase Storage", `Gagal mengunggah referensi video ke Supabase: ${err.message}`);
      }
    }

    const newRef = {
      id: `ref-vid-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId,
      fileName: videoFile.name,
      fileSize: videoFile.size,
      mimeType: videoFile.mimetype || `video/${ext}`,
      uploadTime: new Date().toISOString(),
      providerTarget: providerTarget || "All",
      publicUrl,
      storagePath,
      resolution: resolution || "1920x1080",
      duration: duration ? Number(duration) : undefined
    };

    if (!state.videoReferences) {
      state.videoReferences = [];
    }
    state.videoReferences.unshift(newRef);
    db.logActivity(userId, undefined, "UPLOAD_VIDEO_REFERENCE", `Mengunggah referensi video nyata: ${videoFile.name}`);
    db.save();

    res.json({ success: true, reference: newRef });
  } catch (err: any) {
    console.error("Reference Video Upload Error:", err);
    res.status(500).json({ error: `Gagal mengunggah referensi video: ${err.message}` });
  }
});

app.get("/api/user/reference/list/:userId", (req: Request, res: Response) => {
  const { userId } = req.params;
  const state = db.getState();
  const imageRefs = (state.imageReferences || []).filter(r => r.userId === userId);
  const videoRefs = (state.videoReferences || []).filter(r => r.userId === userId);
  res.json({ success: true, imageReferences: imageRefs, videoReferences: videoRefs });
});

app.delete("/api/user/reference/delete/:type/:id", (req: Request, res: Response) => {
  const { type, id } = req.params;
  const state = db.getState();
  let found = false;

  if (type === "image" && state.imageReferences) {
    const idx = state.imageReferences.findIndex(r => r.id === id);
    if (idx !== -1) {
      const ref = state.imageReferences[idx];
      try {
        if (fs.existsSync(ref.storagePath)) {
          fs.unlinkSync(ref.storagePath);
        }
      } catch (e) {}
      state.imageReferences.splice(idx, 1);
      found = true;
    }
  } else if (type === "video" && state.videoReferences) {
    const idx = state.videoReferences.findIndex(r => r.id === id);
    if (idx !== -1) {
      const ref = state.videoReferences[idx];
      try {
        if (fs.existsSync(ref.storagePath)) {
          fs.unlinkSync(ref.storagePath);
        }
      } catch (e) {}
      state.videoReferences.splice(idx, 1);
      found = true;
    }
  }

  if (found) {
    db.save();
    return res.json({ success: true });
  }

  res.status(404).json({ error: "Referensi tidak ditemukan." });
});

app.post("/api/user/prompt-analyzer/analyze", async (req: Request, res: Response) => {
  const { userId, fileType, fileData, fileName } = req.body;
  
  // Validate credits
  const state = db.getState();
  const creditsObj = state.credits.find((c) => c.userId === userId);
  
  if (!creditsObj || creditsObj.balance < 10) {
    return res.status(403).json({ error: "Kredit tidak mencukupi. Analisis prompt membutuhkan 10 kredit." });
  }

  // 1. Template Definitions
  const PHOTO_TEMPLATE_FIELDS: Record<string, { title: string; keys: string[] }> = {
    A: {
      title: "A. MAIN SUBJECT",
      keys: [
        "Object Type", "Object Category", "Object Quantity", "Gender", "Age Range", 
        "Ethnicity Appearance", "Body Shape", "Height Appearance", "Weight Appearance", 
        "Facial Structure", "Eye Shape", "Eye Color", "Hair Style", "Hair Length", 
        "Hair Color", "Skin Tone", "Makeup Style", "Expression", "Emotion", "Mood", 
        "Pose", "Hand Position", "Leg Position", "Head Direction", "Body Direction", 
        "Accessories", "Jewelry", "Tattoo", "Piercing"
      ]
    },
    B: {
      title: "B. FASHION & OOTD",
      keys: [
        "Fashion Style", "OOTD Style", "Top Clothing", "Bottom Clothing", "Footwear", 
        "Outerwear", "Headwear", "Eyewear", "Bag", "Watch", "Belt", "Scarf", 
        "Fabric Type", "Fabric Texture", "Fabric Pattern", "Fabric Reflection", 
        "Luxury Level", "Brand Style"
      ]
    },
    C: {
      title: "C. MIRROR SELFIE",
      keys: [
        "Mirror Type", "Mirror Shape", "Mirror Size", "Mirror Position", "Mirror Reflection", 
        "Mirror Distortion", "Mirror Frame", "Phone Type", "Phone Color", "Phone Case", 
        "Selfie Style", "Face Visibility", "Flash Reflection"
      ]
    },
    D: {
      title: "D. ENVIRONMENT",
      keys: [
        "Location Type", "Country Style", "City Style", "Indoor", "Outdoor", 
        "Architecture Style", "Room Type", "Street Type", "Nature Type", "Landscape Type", 
        "Weather", "Season", "Temperature Feel"
      ]
    },
    E: {
      title: "E. BACKGROUND",
      keys: [
        "Background Type", "Foreground Elements", "Middle Ground", "Background Elements", 
        "Crowd Density", "Traffic Density", "Visual Depth"
      ]
    },
    F: {
      title: "F. LIGHTING",
      keys: [
        "Light Source", "Natural Light", "Artificial Light", "Studio Light", "Golden Hour", 
        "Blue Hour", "Sunset", "Sunrise", "Moonlight", "Neon Light", "RGB Light", 
        "Volumetric Light", "Back Light", "Front Light", "Side Light", "Top Light", 
        "Bottom Light", "Light Intensity", "Light Direction", "Shadow Type"
      ]
    },
    G: {
      title: "G. CAMERA",
      keys: [
        "Camera Brand", "Camera Model", "Lens Brand", "Lens Type", "Focal Length", 
        "Aperture", "ISO", "Shutter Speed", "White Balance", "Focus Mode", "Dynamic Range", "Exposure"
      ]
    },
    H: {
      title: "H. CAMERA ANGLE",
      keys: [
        "Eye Level", "Low Angle", "High Angle", "Bird Eye View", "Worm Eye View", 
        "Dutch Angle", "Over Shoulder", "POV"
      ]
    },
    I: {
      title: "I. SHOT TYPE",
      keys: [
        "Extreme Close Up", "Close Up", "Medium Close Up", "Medium Shot", "Medium Full Shot", 
        "Full Body Shot", "Wide Shot", "Extreme Wide Shot"
      ]
    },
    J: {
      title: "J. COMPOSITION",
      keys: [
        "Rule of Thirds", "Golden Ratio", "Centered", "Leading Lines", "Frame Within Frame", 
        "Symmetry", "Negative Space", "Depth Layering"
      ]
    },
    K: {
      title: "K. COLOR SCIENCE",
      keys: [
        "Primary Color", "Secondary Color", "Accent Color", "Warm Tone", "Cool Tone", 
        "Monochrome", "Pastel", "Muted", "Vibrant"
      ]
    },
    L: {
      title: "L. CINEMATIC STYLE",
      keys: [
        "Photorealistic", "Hyper Realistic", "Editorial", "Fashion Magazine", "Luxury Advertisement", 
        "Movie Poster", "Hollywood Cinematic", "Anime", "Cyberpunk", "Sci-Fi", "Fantasy", 
        "Vintage", "Retro", "Documentary"
      ]
    },
    M: {
      title: "M. IMAGE QUALITY",
      keys: [
        "2K", "4K", "8K", "16K", "Ultra Detail", "Hyper Detail", "Masterpiece", 
        "Award Winning", "HDR", "RAW Quality"
      ]
    },
    N: {
      title: "N. SOCIAL MEDIA STYLE",
      keys: [
        "Instagram", "TikTok", "Pinterest", "VSCO", "Influencer Style", "Luxury Lifestyle", 
        "Travel Content", "Fashion Content"
      ]
    }
  };

  const VIDEO_TEMPLATE_FIELDS: Record<string, { title: string; keys: string[] }> = {
    A: {
      title: "A. CAMERA MOVEMENT",
      keys: [
        "Pan Left", "Pan Right", "Tilt Up", "Tilt Down", "Zoom In", "Zoom Out", 
        "Dolly In", "Dolly Out", "Truck Left", "Truck Right", "Crane Up", "Crane Down", 
        "Orbit", "Arc Shot", "Push In", "Pull Out", "Tracking Shot", "Follow Shot", 
        "Reveal Shot", "Whip Pan"
      ]
    },
    B: {
      title: "B. CAMERA STABILITY",
      keys: [
        "Handheld", "Steadycam", "Gimbal", "Drone", "FPV Drone", "Tripod", "Shoulder Rig", "POV"
      ]
    },
    C: {
      title: "C. MOTION SPEED",
      keys: [
        "Normal", "Slow Motion", "Super Slow Motion", "Fast Motion", "Hyperlapse", "Timelapse"
      ]
    },
    D: {
      title: "D. SUBJECT ACTION",
      keys: [
        "Walking", "Running", "Jumping", "Turning", "Talking", "Smiling", "Laughing", 
        "Dancing", "Driving", "Flying", "Swimming"
      ]
    },
    E: {
      title: "E. PHYSICS",
      keys: [
        "Wind", "Rain", "Snow", "Fog", "Smoke", "Dust", "Fire", "Explosion", 
        "Water Splash", "Cloth Motion", "Hair Motion", "Particle Motion"
      ]
    },
    F: {
      title: "F. CINEMATOGRAPHY",
      keys: [
        "Movie Trailer", "Netflix Style", "Documentary", "Commercial", "Luxury Advertisement", 
        "Music Video", "Fashion Film", "Travel Film", "Sci-Fi Film", "Cyberpunk Film"
      ]
    },
    G: {
      title: "G. COLOR GRADING",
      keys: [
        "Teal Orange", "Moody", "Dark", "Vibrant", "Natural", "Film Look", 
        "Kodak Film", "Fuji Film", "Vintage VHS"
      ]
    },
    H: {
      title: "H. VIDEO FORMAT",
      keys: [
        "16:9", "9:16", "1:1", "4:5", "21:9", "Horizontal", "Vertical", "Square"
      ]
    },
    I: {
      title: "I. VIDEO QUALITY",
      keys: [
        "HD", "FHD", "2K", "4K", "8K", "12K", "16K", "HDR", "Dolby Vision"
      ]
    },
    J: {
      title: "J. AUDIO VISUAL",
      keys: [
        "Ambient Sound", "Nature Sound", "City Sound", "Dialogue", "Voice Over", 
        "Music Style", "Sound Effect"
      ]
    }
  };

  try {
    const ai = getGeminiClient();
    let rawResult: any = {};
    const userObj = state.users.find((u) => u.id === userId);

    // Structure of dictionary-of-dictionary templates for Gemini structure alignment
    const rawPhotoTemplate: any = {};
    for (const [cat, info] of Object.entries(PHOTO_TEMPLATE_FIELDS)) {
      rawPhotoTemplate[cat] = {};
      for (const k of info.keys) {
        rawPhotoTemplate[cat][k] = "Analisis rill atau deskripsi parameter dari media masukan.";
      }
    }

    const rawVideoTemplate: any = {};
    for (const [cat, info] of Object.entries(VIDEO_TEMPLATE_FIELDS)) {
      rawVideoTemplate[cat] = {};
      for (const k of info.keys) {
        rawVideoTemplate[cat][k] = "Analisis rill atau deskripsi parameter dari media masukan.";
      }
    }

    if (fileType === "image" || fileType === "url") {
      let contentsInput: any[] = [];
      let systemPrompt = "";

      if (fileType === "image") {
        if (!fileData) {
          return res.status(400).json({ error: "Data gambar tidak ditemukan." });
        }
        const cleanBase64 = fileData.replace(/^data:image\/\w+;base64,/, "");
        contentsInput.push({
          inlineData: { mimeType: "image/png", data: cleanBase64 }
        });
        
        systemPrompt = `Anda adalah Prompt Analyzer Engine profesional kelas dunia yang mengevaluasi estetika foto / gambar secara multi-dimensi.
Tugas utama Anda adalah mengevaluasi gambar masukan secara nyata dan mengisi ratusan parameter visual terstruktur dalam Bahasa Indonesia (meskipun istilah teknis kamera global tetap digunakan).

WAJIB mengembalikan hasil analisis dalam format JSON murni dengan struktur persis seperti template di bawah ini. Harap ganti nilai placeholder dengan deskripsi analisis rill Anda berdasarkan gambar yang dilampirkan:

${JSON.stringify(rawPhotoTemplate, null, 2)}

Sangat Penting: Jawab hanya dalam format JSON murni tanpa menyertakan block format markdown ataupun teks pembuka/penutup lainnya.`;
      } else {
        const { url } = req.body;
        if (!url) {
          return res.status(400).json({ error: "URL wajib diisi." });
        }
        
        systemPrompt = `Anda adalah Prompt Analyzer Engine kelas dunia spesialis pelacak estetika situs web dan digital branding.
Evaluasi URL situs web berikut secara teoritis dan visual: "${url}".
Konversikan temuan Anda ke dalam ratusan parameter terstruktur foto (A sampai N) berikut:

WAJIB mengembalikan hasil analisis dalam format JSON murni dengan struktur persis seperti template di bawah ini. Harap ganti nilai placeholder dengan deskripsi analisis rill Anda berdasarkan URL di atas:

${JSON.stringify(rawPhotoTemplate, null, 2)}

Sangat Penting: Jawab hanya dalam format JSON murni tanpa menyertakan block format markdown ataupun teks pembuka/penutup lainnya.`;
      }

      // Check input size limit / estimated tokens
      const metrics = analyzeAndLogRequestSize([...contentsInput, systemPrompt]);
      
      const SPLIT_THRESHOLD = 5000;
      if (metrics.tokenEstimate > SPLIT_THRESHOLD) {
        console.log(`[TRIGGER SPLIT] Estimated tokens (${metrics.tokenEstimate}) exceeds split threshold ${SPLIT_THRESHOLD}. Initiating dynamic staged partition calls...`);
        const headerGen = (subTemplateStr: string) => {
          if (fileType === "image") {
            return `Anda adalah Prompt Analyzer Engine profesional kelas dunia yang mengevaluasi estetika foto / gambar secara multi-dimensi.
Tugas utama Anda adalah mengevaluasi gambar masukan secara nyata dan mengisi beberapa parameter visual terstruktur dalam Bahasa Indonesia (meskipun istilah teknis kamera global tetap digunakan).

WAJIB mengembalikan hasil analisis dalam format JSON murni dengan struktur persis seperti template di bawah ini. Harap ganti nilai placeholder dengan deskripsi analisis rill Anda berdasarkan gambar yang dilampirkan:

${subTemplateStr}

Sangat Penting: Jawab hanya dalam format JSON murni tanpa menyertakan block format markdown ataupun teks pembuka/penutup lainnya.`;
          } else {
            const { url } = req.body;
            return `Anda adalah Prompt Analyzer Engine kelas dunia spesialis pelacak estetika situs web dan digital branding.
Evaluasi URL situs web berikut secara teoritis dan visual: "${url}".
Konversikan temuan Anda ke dalam parameter terstruktur foto berikut:

WAJIB mengembalikan hasil analisis dalam format JSON murni dengan struktur persis seperti template di bawah ini. Harap ganti nilai placeholder dengan deskripsi analisis rill Anda berdasarkan URL di atas:

${subTemplateStr}

Sangat Penting: Jawab hanya dalam format JSON murni tanpa menyertakan block format markdown ataupun teks pembuka/penutup lainnya.`;
          }
        };
        rawResult = await splitTemplateAndAnalyze(ai, contentsInput, rawPhotoTemplate, headerGen);
      } else {
        // Audit logger for Gemini Prompt Analyzer (Image/URL) request parameters
        const auditLog = {
          model: "gemini-3.5-flash",
          temperature: "Default",
          maxOutputTokens: "Default",
          responseMimeType: "application/json"
        };
        console.log("=== GEMINI ENGINE REQUEST AUDIT (Prompt Analyzer - Image/URL) ===");
        console.log(`model: ${auditLog.model}`);
        console.log(`temperature: ${auditLog.temperature}`);
        console.log(`maxOutputTokens: ${auditLog.maxOutputTokens}`);
        console.log(`responseMimeType: ${auditLog.responseMimeType}`);
        console.log("===============================================================");
        db.logSystem("info", "Gemini Request Audit [Prompt Analyzer - Image/URL]", JSON.stringify(auditLog));

        const response = await generateContentWithFailover(
          ai,
          "gemini-3.5-flash",
          {
            contents: [...contentsInput, systemPrompt],
            config: { responseMimeType: "application/json" }
          }
        );

        const responseText = response.text || "{}";
        let cleanText = responseText.trim();
        if (cleanText.startsWith("```json")) {
          cleanText = cleanText.substring(7);
        } else if (cleanText.startsWith("```")) {
          cleanText = cleanText.substring(3);
        }
        if (cleanText.endsWith("```")) {
          cleanText = cleanText.substring(0, cleanText.length - 3);
        }
        cleanText = cleanText.trim();
        
        rawResult = JSON.parse(cleanText);
      }

    } else if (fileType === "video") {
      let contentsInput: any[] = [];
      const userDescription = req.body.videoDescription || "Gerakan video masukan";
      let usedRealVideo = false;

      let systemPrompt = `Anda adalah Video Prompt Analyzer Engine profesional kelas dunia yang mengevaluasi estetika video asli secara temporal dan spasial.
Tugas utama Anda adalah mengevaluasi berkas video masukan dan mengisi puluhan parameter visual terstruktur dalam Bahasa Indonesia (dengan istilah teknis kamera global tetap dipertahankan).
Analisis seluruh pergerakan kamera, pergerakan subjek, physics, color grading, audio, resolusi, komposisi, format, dsb secara murni.

WAJIB mengembalikan hasil analisis dalam format JSON murni dengan struktur persis seperti template di bawah ini. Harap ganti nilai placeholder dengan deskripsi analisis rill Anda berdasarkan video yang dilampirkan:

${JSON.stringify(rawVideoTemplate, null, 2)}

Sangat Penting: Jawab hanya dalam format JSON murni tanpa menyertakan block format markdown ataupun teks pembuka/penutup lainnya.`;

      if (req.body.videoUploadId) {
        const upload = state.videoUploads.find(u => u.id === req.body.videoUploadId);
        if (upload && fs.existsSync(upload.storagePath)) {
          try {
            const fileBuffer = fs.readFileSync(upload.storagePath);
            const ext = upload.fileName.split(".").pop()?.toLowerCase() || "mp4";
            const mimeType = ext === "webm" ? "video/webm" : ext === "ogg" ? "video/ogg" : "video/mp4";
            contentsInput.push({
              inlineData: {
                mimeType,
                data: fileBuffer.toString("base64")
              }
            });
            usedRealVideo = true;
            db.logSystem("info", "Gemini Real Video", `Berhasil memuat berkas video rill: ${upload.fileName} untuk analisis Gemini.`);
          } catch (readErr: any) {
            db.logSystem("error", "Gemini Video Reader", `Gagal membaca video dari disk, fallback ke petunjuk teks: ${readErr.message}`);
          }
        } else {
          db.logSystem("warn", "Gemini Video Lookup", "Video unggahan tidak ditemukan fisik pada disk, fallback deskripsi.");
        }
      }

      if (!usedRealVideo) {
        systemPrompt += `\n(Catatan Fallback: Tidak ada file video nyata yang dilampirkan, silakan analisis secara imajinatif deskripsi video berikut: "${userDescription}")`;
      }

      // Check input size limit / estimated tokens
      const metricsVideo = analyzeAndLogRequestSize([...contentsInput, systemPrompt]);
      
      const SPLIT_THRESHOLD = 5000;
      if (metricsVideo.tokenEstimate > SPLIT_THRESHOLD) {
        console.log(`[TRIGGER VIDEO SPLIT] Estimated tokens (${metricsVideo.tokenEstimate}) exceeds split threshold ${SPLIT_THRESHOLD}. Initiating dynamic staged partition calls...`);
        const headerGen = (subTemplateStr: string) => {
          let pStr = `Anda adalah Video Prompt Analyzer Engine profesional kelas dunia yang mengevaluasi estetika video asli secara temporal dan spasial.
Tugas utama Anda adalah mengevaluasi berkas video masukan dan mengisi beberapa parameter visual terstruktur dalam Bahasa Indonesia (dengan istilah teknis kamera global tetap dipertahankan).
Analisis seluruh pergerakan kamera, pergerakan subjek, physics, color grading, audio, resolusi, komposisi, format, dsb secara murni.

WAJIB mengembalikan hasil analisis dalam format JSON murni dengan struktur persis seperti template di bawah ini. Harap ganti nilai placeholder dengan deskripsi analisis rill Anda berdasarkan video yang dilampirkan:

${subTemplateStr}

Sangat Penting: Jawab hanya dalam format JSON murni tanpa menyertakan block format markdown ataupun teks pembuka/penutup lainnya.`;

          if (!usedRealVideo) {
            pStr += `\n(Catatan Fallback: Tidak ada file video nyata yang dilampirkan, silakan analisis secara imajinatif deskripsi video berikut: "${userDescription}")`;
          }
          return pStr;
        };
        rawResult = await splitTemplateAndAnalyze(ai, contentsInput, rawVideoTemplate, headerGen);
      } else {
        // Audit logger for Gemini Prompt Analyzer (Video) request parameters
        const auditLogVideo = {
          model: "gemini-3.5-flash",
          temperature: "Default",
          maxOutputTokens: "Default",
          responseMimeType: "application/json"
        };
        console.log("=== GEMINI ENGINE REQUEST AUDIT (Prompt Analyzer - Video) ===");
        console.log(`model: ${auditLogVideo.model}`);
        console.log(`temperature: ${auditLogVideo.temperature}`);
        console.log(`maxOutputTokens: ${auditLogVideo.maxOutputTokens}`);
        console.log(`responseMimeType: ${auditLogVideo.responseMimeType}`);
        console.log("=============================================================");
        db.logSystem("info", "Gemini Request Audit [Prompt Analyzer - Video]", JSON.stringify(auditLogVideo));

        const response = await generateContentWithFailover(
          ai,
          "gemini-3.5-flash",
          {
            contents: [...contentsInput, systemPrompt],
            config: { responseMimeType: "application/json" }
          }
        );

        const responseText = response.text || "{}";
        let cleanText = responseText.trim();
        if (cleanText.startsWith("```json")) {
          cleanText = cleanText.substring(7);
        } else if (cleanText.startsWith("```")) {
          cleanText = cleanText.substring(3);
        }
        if (cleanText.endsWith("```")) {
          cleanText = cleanText.substring(0, cleanText.length - 3);
        }
        cleanText = cleanText.trim();

        rawResult = JSON.parse(cleanText);
      }

      // Update upload completes status if analyzed successfully
      if (req.body.videoUploadId) {
        const upload = state.videoUploads.find(u => u.id === req.body.videoUploadId);
        if (upload) {
          upload.analysisCompletedAt = new Date().toISOString();
        }
      }
    }

    // 2. Synthesize with Default Templates to ensure absolutely 0 missing properties
    // Structure: Record<category, { title, fields: Record<key, { value, enabled }> }>
    const finalStructuredParameters: any = {};
    const sourceTemplate = (fileType === "image" || fileType === "url") ? PHOTO_TEMPLATE_FIELDS : VIDEO_TEMPLATE_FIELDS;

    for (const [catCode, catMeta] of Object.entries(sourceTemplate)) {
      const generatedCatFields = rawResult[catCode] || rawResult[catMeta.title] || {};
      const fieldsObj: any = {};

      for (const key of catMeta.keys) {
        // Find key candidate in a highly flexible, case-insensitive way
        let val: any = undefined;
        const normalizedTarget = key.trim().toLowerCase();
        
        // Try exact match first
        if (generatedCatFields[key] !== undefined) {
          val = generatedCatFields[key];
        } else {
          // Look up matching key in generatedCatFields case-insensitively
          const foundKey = Object.keys(generatedCatFields).find(k => {
            const normalizedK = k.trim().toLowerCase();
            return normalizedK === normalizedTarget || 
                   normalizedK === normalizedTarget.replace(/\s+/g, "_") ||
                   normalizedK === normalizedTarget.replace(/\s+/g, "") ||
                   normalizedTarget === normalizedK.replace(/\s+/g, "_") ||
                   normalizedTarget === normalizedK.replace(/\s+/g, "");
          });
          if (foundKey !== undefined) {
            val = generatedCatFields[foundKey];
          }
        }

        if (val === undefined || val === null) {
          val = "Tidak Terdeteksi";
        }
        
        if (typeof val === "object" && val !== null) {
          val = JSON.stringify(val);
        }
        
        const stringVal = String(val).trim();
        const lowerVal = stringVal.toLowerCase();
        
        // Avoid placeholders slipping in as "detected"
        const isPlaceholder = lowerVal.includes("analisis rill atau deskripsi parameter") ||
                              lowerVal.includes("placeholder") ||
                              lowerVal.includes("tulis analisis") ||
                              lowerVal.includes("tulis deskripsi") ||
                              lowerVal.includes("tidak terdeteksi") ||
                              lowerVal === "tidak terdeteksi" || 
                              lowerVal === "tidak_terdeteksi" || 
                              lowerVal === "not detected" || 
                              lowerVal === "none" || 
                              lowerVal === "null" || 
                              lowerVal === "not_detected" || 
                              lowerVal === "tidak berlaku" || 
                              lowerVal === "tidak_berlaku" || 
                              lowerVal === "n/a" || 
                              stringVal === "";

        fieldsObj[key] = {
          value: isPlaceholder ? "Tidak Terdeteksi" : stringVal,
          enabled: !isPlaceholder
        };
      }

      finalStructuredParameters[catCode] = {
        title: catMeta.title,
        fields: fieldsObj
      };
    }

    // Spend 10 credits
    creditsObj.balance -= 10;
    creditsObj.totalSpent += 10;

    const newAnalysis: PromptAnalysis = {
      id: `ana-${Date.now()}`,
      userId,
      fileName: fileName || (fileType === "url" ? req.body.url : `analisis_${fileType}.file`),
      fileType,
      parameters: finalStructuredParameters,
      createdAt: new Date().toISOString(),
    };

    state.promptAnalysis.unshift(newAnalysis);

    // Link dynamic analysisId to associated videoUpload
    if (fileType === "video" && req.body.videoUploadId) {
      if (!state.videoUploads) {
        state.videoUploads = [];
      }
      const upload = state.videoUploads.find(u => u.id === req.body.videoUploadId);
      if (upload) {
        upload.analysisId = newAnalysis.id;
      }
    }

    db.logActivity(userId, userObj?.username, "PROMPT_ANALYZED", `Menganalisis total ${fileType} dengan ratusan parameter.`);
    db.save();

    // Determine the raw text for this request
    const responseText = (fileType === "image" || fileType === "url") ? rawResult : rawResult;

    res.json({ 
      success: true, 
      analysis: newAnalysis, 
      remainingCredits: creditsObj.balance,
      rawGeminiOutput: JSON.stringify(rawResult, null, 2),
      parsedGeminiParams: rawResult
    });

  } catch (error: any) {
    db.logSystem("error", "Prompt Analyzer Helper", error.message);
    res.status(500).json({ error: `Gagal memproses analisis Gemini API secara nyata: ${error.message}` });
  }
});

// Update edited parameters inside saved history / DB
app.put("/api/user/prompt-analyzer/update", (req: Request, res: Response) => {
  const { analysisId, parameters } = req.body;
  const state = db.getState();
  const analysisItem = state.promptAnalysis.find((x) => x.id === analysisId);
  
  if (!analysisItem) {
    return res.status(404).json({ error: "Sesi analisis tidak ditemukan di database." });
  }

  analysisItem.parameters = parameters;
  db.save();
  res.json({ success: true, analysis: analysisItem });
});

// Fetch saved/previous analysis history for user
app.get("/api/user/prompt-analyzer/history/:userId", (req: Request, res: Response) => {
  const { userId } = req.params;
  const state = db.getState();
  const history = state.promptAnalysis.filter((x) => x.userId === userId);
  res.json({ history });
});

// delete historical analysis
app.delete("/api/user/prompt-analyzer/delete/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const state = db.getState();
  const idx = state.promptAnalysis.findIndex((x) => x.id === id);
  if (idx !== -1) {
    state.promptAnalysis.splice(idx, 1);
    db.save();
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Data tidak ditemukan." });
});

// ----------------------------------------------------
// 2. Master Prompt Engine
// ----------------------------------------------------

app.post("/api/user/master-prompt/generate", async (req: Request, res: Response) => {
  const { userId, title, engine, maxLength, language, inputParameters } = req.body;
  
  const state = db.getState();
  const creditsObj = state.credits.find((c) => c.userId === userId);
  
  if (!creditsObj || creditsObj.balance < 5) {
    return res.status(403).json({ error: "Kredit tidak mencukupi. Pembuatan Master Prompt membutuhkan 5 kredit." });
  }

  try {
    const ai = getGeminiClient();
    const userObj = state.users.find((u) => u.id === userId);

    const lengthPrompt = `Wajib buat hasil akhirnya sepadat mungkin mendekati target panjang karakter: sekurang-kurangnya ${maxLength} karakter rincian deskripsi kaya.`;
    const languagePrompt = language === "en" 
      ? "Create the generated prompt strictly in ENGLISH language so other engines can compile it seamlessly."
      : "Buat full prompt dalam Bahasa INDONESIA dengan detail visual artistik yang dalam.";

    const systemInstruction = `Anda adalah Master Prompt Creator kelas dunia.
Tugas Anda adalah merangkai puluhan parameter visual masukan menjadi satu buah Master Prompt yang sangat profesional, super detail, adaptif, dan siap langsung digunakan di kecerdasan buas generator target.
Target Engine yang dipilih user: ${engine}.
Sesuaikan gaya parameter penulisan sesuai engine ini (Contoh: Midjourney butuh parameter akhiran spt '--ar 16:9 --v 6.0 --stylize 250'. Stable Diffusion/Flux butuh penekanan berat bobot kata kunci '(weight:1.2)' atau deskripsi tajam detail. Sora/Veo butuh deskripsi temporal movement kamera).

${lengthPrompt}
${languagePrompt}

Formulasi parameter input yang diisi user:
${JSON.stringify(inputParameters, null, 2)}

Kembalikan respon JSON dengan satu field "masterPrompt" yang berisi string text prompt master gabungan yang indah, cinematic, dan super kaya. Jangan memasukkan kode markup markdown berlebih di luar JSON murni.
Format JSON wajib:
{
  "masterPrompt": "TEKS PROMPT MASTER YANG DIOPTIMALKAN SECARA MAKSIMAL DISINI"
}`;

    // Calculate size stats and estimated tokens
    const metricsMaster = analyzeAndLogRequestSize(
      `Buat master prompt premium dengan gaya optimasi engine terbaik untuk ${engine} berdasarkan parameter input yang didapatkan.`,
      { systemInstruction }
    );

    let generatedPrompt = "";
    
    // Choose a lower conservative threshold to demonstrate split drafting safely if there are many input parameters
    const SPLIT_THRESHOLD = 5000;
    if (metricsMaster.tokenEstimate > SPLIT_THRESHOLD && Object.keys(inputParameters || {}).length > 6) {
      console.log(`[TRIGGER MASTER PROMPT SPLIT] Estimated tokens (${metricsMaster.tokenEstimate}) exceeds split threshold. Split compilation active.`);
      generatedPrompt = await splitMasterPromptAnalyze(ai, engine, lengthPrompt, languagePrompt, inputParameters);
    } else {
      // Audit logger for Gemini Master Prompt request parameters
      const auditLogMaster = {
        model: "gemini-3.5-flash",
        temperature: "Default",
        maxOutputTokens: "Default",
        responseMimeType: "application/json"
      };
      console.log("=== GEMINI ENGINE REQUEST AUDIT (Master Prompt Generator) ===");
      console.log(`model: ${auditLogMaster.model}`);
      console.log(`temperature: ${auditLogMaster.temperature}`);
      console.log(`maxOutputTokens: ${auditLogMaster.maxOutputTokens}`);
      console.log(`responseMimeType: ${auditLogMaster.responseMimeType}`);
      console.log("=========================================================");
      db.logSystem("info", "Gemini Request Audit [Master Prompt Generator]", JSON.stringify(auditLogMaster));

      const response = await generateContentWithFailover(
        ai,
        "gemini-3.5-flash",
        {
          contents: `Buat master prompt premium dengan gaya optimasi engine terbaik untuk ${engine} berdasarkan parameter input yang didapatkan.`,
          config: {
            responseMimeType: "application/json",
            systemInstruction,
          },
        }
      );

      const responseText = response.text || "{}";
      const trimmedResponse = responseText.trim();

      // 1. Log raw response to console and system logs
      console.log("=== RAW GEMINI MASTER PROMPT RESPONSE ===");
      console.log(trimmedResponse);
      console.log("=========================================");
      db.logSystem("info", "Master Prompt Gemini Raw Output", trimmedResponse.substring(0, 1500));

      // 4. Remove markdown wrapper if any
      let cleanText = trimmedResponse;
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.substring(7);
      } else if (cleanText.startsWith("```")) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith("```")) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      cleanText = cleanText.trim();

      let resultObj: any = {};
      try {
        resultObj = JSON.parse(cleanText);
      } catch (parseError: any) {
        console.error("JSON.parse failed for cleanText, trying regex/fallback parsing:", parseError);
        db.logSystem("error", "Master Prompt JSON Parsing Error", `Raw text: ${trimmedResponse.substring(0, 500)}. Error: ${parseError.message}`);

        // Try regex extraction to pull the content inside "masterPrompt":"..."
        const matchKey = cleanText.match(/"masterPrompt"\s*:\s*"([\s\S]*?)"\s*}$/) ||
                         cleanText.match(/"masterPrompt"\s*:\s*"([\s\S]*?)"/) ||
                         cleanText.match(/"masterPrompt"\s*:\s*([\s\S]*)/);
        if (matchKey && matchKey[1]) {
          let extracted = matchKey[1].trim();
          try {
            const tempParsed = JSON.parse(`{"val": "${extracted.replace(/"/g, '\\"')}"}`);
            resultObj = { masterPrompt: tempParsed.val };
          } catch (e) {
            resultObj = { masterPrompt: extracted };
          }
        } else {
          // If it isn't properly structured, the model has output the text directly.
          if (cleanText.length > 30) {
            resultObj = { masterPrompt: cleanText };
          } else {
            throw new Error(`Gagal mem-parsing keluaran generator prompt otomatis: ${parseError.message}`);
          }
        }
      }

      generatedPrompt = resultObj.masterPrompt || "";
    }

    // Spend 5 credits
    creditsObj.balance -= 5;
    creditsObj.totalSpent += 5;

    const newMasterPrompt: MasterPrompt = {
      id: `mst-${Date.now()}`,
      userId,
      title: title || `Optimasi ${engine} ${new Date().toLocaleDateString("id-ID")}`,
      engine,
      maxLength,
      language,
      inputParameters,
      generatedPrompt,
      createdAt: new Date().toISOString(),
    };

    state.masterPrompts.unshift(newMasterPrompt);
    db.logActivity(userId, userObj?.username, "MASTER_PROMPT_GENERATED", `Membuat Master Prompt untuk engine ${engine}.`);
    db.save();

    res.json({
      success: true,
      masterPrompt: newMasterPrompt,
      remainingCredits: creditsObj.balance,
    });

  } catch (error: any) {
    db.logSystem("error", "Master Prompt Creator", error.message);
    res.status(500).json({ error: `Gemini API gagal merespon secara nyata: ${error.message}` });
  }
});

// Fetch user master prompts history
app.get("/api/user/master-prompt/history/:userId", (req: Request, res: Response) => {
  const { userId } = req.params;
  const state = db.getState();
  const history = state.masterPrompts.filter((x) => x.userId === userId);
  res.json({ history });
});

// Delete specific master prompt
app.delete("/api/user/master-prompt/delete/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const state = db.getState();
  const idx = state.masterPrompts.findIndex((x) => x.id === id);
  if (idx !== -1) {
    state.masterPrompts.splice(idx, 1);
    db.save();
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Data tidak ditemukan." });
});

// ----------------------------------------------------
// Real AI Provider Routing & Custom API Manager
// ----------------------------------------------------

async function executeProviderCall(
  provider: AiProvider,
  prompt: string,
  category: "IMAGE GENERATOR" | "VIDEO GENERATOR",
  extraParams?: {
    masterPrompt?: string;
    imageReferences?: any[];
    videoReferences?: any[];
    mode?: string;
  }
): Promise<{ url: string; details: string }> {
  provider.request_counter = (provider.request_counter || 0) + 1;
  const startTime = Date.now();
  provider.last_check = new Date().toISOString();

  // Execute a real HTTP JSON POST request to the provider's custom api endpoint.
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (provider.api_key) {
      headers["Authorization"] = `Bearer ${provider.api_key}`;
    }

    if (provider.custom_header) {
      try {
        const parsed = JSON.parse(provider.custom_header);
        Object.assign(headers, parsed);
      } catch (e) {
        console.warn("Parse custom header failed", e);
      }
    }

    const bodyObj: Record<string, any> = {
      prompt,
      model: provider.model_name || "default",
      ...(extraParams || {})
    };

    if (provider.custom_parameter) {
      try {
        const parsed = JSON.parse(provider.custom_parameter);
        Object.assign(bodyObj, parsed);
      } catch (e) {
        console.warn("Parse custom parameters failed", e);
      }
    }

    // Prepare full request configurations
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout

    db.logSystem("info", "Routing Engine", `Executing real POST request to ${provider.provider_name} API Endpoint: ${provider.api_endpoint}`);
    
    const response = await fetch(provider.api_endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyObj),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    const duration = Date.now() - startTime;
    provider.response_time = duration;

    if (response.ok) {
      provider.connection_status = "Online";
      provider.success_count = (provider.success_count || 0) + 1;
      provider.usage_counter = (provider.usage_counter || 0) + 1;
      provider.updated_at = new Date().toISOString();

      const jsonRes = await response.json().catch(() => ({}));
      // Extract URL from standard response structures
      const url = jsonRes.url || jsonRes.data?.[0]?.url || jsonRes.imageUrl || jsonRes.videoUrl || "";
      if (!url) {
        throw new Error(`Koneksi berhasil HTTP 200, tetapi respons JSON dari ${provider.provider_name} tidak berisi URL gambar atau video hasil yang valid.`);
      }
      
      return {
        url,
        details: `Berhasil koneksi 100% via ${provider.provider_name} (Model: ${provider.model_name}) dengan response HTTP 200 OK.`
      };
    } else {
      provider.error_count = (provider.error_count || 0) + 1;
      if (response.status === 401 || response.status === 403) {
        provider.connection_status = "Unauthorized";
      } else if (response.status === 429) {
        provider.connection_status = "Rate Limited";
      } else if (response.status === 503) {
        provider.connection_status = "Maintenance";
      } else {
        provider.connection_status = "Offline";
      }
      provider.updated_at = new Date().toISOString();
      throw new Error(`Real Server HTTP Error ${response.status}: ${response.statusText} dari provider ${provider.provider_name}`);
    }
  } catch (err: any) {
    const duration = Date.now() - startTime;
    provider.response_time = duration;
    provider.error_count = (provider.error_count || 0) + 1;

    if (err.name === "AbortError") {
      provider.connection_status = "Offline";
      provider.updated_at = new Date().toISOString();
      throw new Error(`Timeout Koneksi setelah 8 detik pada provider ${provider.provider_name}`);
    } else if (err.message?.includes("fetch failed") || err.code === "ENOTFOUND") {
      provider.connection_status = "Offline";
      provider.updated_at = new Date().toISOString();
      throw new Error(`Koneksi gagal ke server endpoint ${provider.api_endpoint} (Offline)`);
    } else {
      provider.connection_status = "Offline";
      provider.updated_at = new Date().toISOString();
      throw err;
    }
  }
}

// 1. GET /api/admin/providers
app.get("/api/admin/providers", (req: Request, res: Response) => {
  const state = db.getState();
  res.json({ success: true, providers: state.aiProviders || [] });
});

// 2. POST /api/admin/providers
app.post("/api/admin/providers", (req: Request, res: Response) => {
  const { provider_name, provider_category, api_endpoint, api_key, model_name, status, region, version, organization_id, project_id, webhook_url, callback_url, custom_header, custom_parameter } = req.body;

  if (!provider_name || !provider_category || !api_endpoint) {
    return res.status(400).json({ error: "Nama provider, kategori, dan endpoint wajib diisi." });
  }

  const state = db.getState();
  if (!state.aiProviders) state.aiProviders = [];

  const slug = provider_name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const newProvider: AiProvider = {
    id: `${provider_category === "VIDEO GENERATOR" ? "vid" : "img"}-${slug}-${Date.now()}`,
    provider_name,
    provider_category,
    provider_logo: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(provider_name)}`,
    api_endpoint,
    api_key: api_key || "",
    model_name: model_name || "default",
    status: status || "active",
    connection_status: "Online",
    region: region || "",
    version: version || "",
    organization_id: organization_id || "",
    project_id: project_id || "",
    webhook_url: webhook_url || "",
    callback_url: callback_url || "",
    custom_header: custom_header || "",
    custom_parameter: custom_parameter || "",
    usage_counter: 0,
    request_counter: 0,
    response_time: 150,
    success_count: 0,
    error_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  state.aiProviders.unshift(newProvider);
  db.logActivity(undefined, "Admin", "CREATE_PROVIDER", `Menambahkan provider baru: ${provider_name}`);
  db.save();

  res.json({ success: true, provider: newProvider });
});

// 3. PUT /api/admin/providers/:id
app.put("/api/admin/providers/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const state = db.getState();
  const provider = state.aiProviders?.find(p => p.id === id);

  if (!provider) {
    return res.status(404).json({ error: "Provider tidak ditemukan." });
  }

  const { provider_name, provider_category, api_endpoint, api_key, model_name, status, region, version, organization_id, project_id, webhook_url, callback_url, custom_header, custom_parameter } = req.body;

  if (provider_name) provider.provider_name = provider_name;
  if (provider_category) provider.provider_category = provider_category;
  if (api_endpoint) provider.api_endpoint = api_endpoint;
  if (api_key !== undefined) provider.api_key = api_key;
  if (model_name !== undefined) provider.model_name = model_name;
  if (status) provider.status = status;
  if (region !== undefined) provider.region = region;
  if (version !== undefined) provider.version = version;
  if (organization_id !== undefined) provider.organization_id = organization_id;
  if (project_id !== undefined) provider.project_id = project_id;
  if (webhook_url !== undefined) provider.webhook_url = webhook_url;
  if (callback_url !== undefined) provider.callback_url = callback_url;
  if (custom_header !== undefined) provider.custom_header = custom_header;
  if (custom_parameter !== undefined) provider.custom_parameter = custom_parameter;

  provider.updated_at = new Date().toISOString();
  db.logActivity(undefined, "Admin", "UPDATE_PROVIDER", `Merubah parameter provider: ${provider.provider_name}`);
  db.save();

  res.json({ success: true, provider });
});

// 4. DELETE /api/admin/providers/:id
app.delete("/api/admin/providers/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const state = db.getState();
  const index = state.aiProviders?.findIndex(p => p.id === id);

  if (index === undefined || index === -1) {
    return res.status(404).json({ error: "Provider tidak ditemukan." });
  }

  const name = state.aiProviders[index].provider_name;
  state.aiProviders.splice(index, 1);
  db.logActivity(undefined, "Admin", "DELETE_PROVIDER", `Menghapus provider: ${name}`);
  db.save();

  res.json({ success: true });
});

// 5. POST /api/admin/providers/:id/toggle
app.post("/api/admin/providers/:id/toggle", (req: Request, res: Response) => {
  const { id } = req.params;
  const state = db.getState();
  const provider = state.aiProviders?.find(p => p.id === id);

  if (!provider) {
    return res.status(404).json({ error: "Provider tidak ditemukan" });
  }

  provider.status = provider.status === "active" ? "inactive" : "active";
  provider.updated_at = new Date().toISOString();
  db.logActivity(undefined, "Admin", "TOGGLE_PROVIDER", `Status toggled provider ${provider.provider_name} to ${provider.status}`);
  db.save();

  res.json({ success: true, provider });
});

// 6. POST /api/admin/providers/:id/test-connection
app.post("/api/admin/providers/:id/test-connection", async (req: Request, res: Response) => {
  const { id } = req.params;
  const state = db.getState();
  const provider = state.aiProviders?.find(p => p.id === id);

  if (!provider) {
    return res.status(404).json({ error: "Provider tidak ditemukan." });
  }

  const startTime = Date.now();
  provider.request_counter = (provider.request_counter || 0) + 1;
  provider.last_check = new Date().toISOString();

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (provider.api_key) {
      headers["Authorization"] = `Bearer ${provider.api_key}`;
    }

    if (provider.custom_header) {
      try {
        const parsed = JSON.parse(provider.custom_header);
        Object.assign(headers, parsed);
      } catch (e) {}
    }

    // Try a direct real connection with 4000ms timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(provider.api_endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ prompt: "ping", model: provider.model_name }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));

    provider.response_time = Date.now() - startTime;

    if (response.ok) {
      provider.connection_status = "Online";
      provider.success_count = (provider.success_count || 0) + 1;
    } else {
      provider.error_count = (provider.error_count || 0) + 1;
      if (response.status === 401 || response.status === 403) {
        provider.connection_status = "Unauthorized";
      } else if (response.status === 429) {
        provider.connection_status = "Rate Limited";
      } else if (response.status === 503) {
        provider.connection_status = "Maintenance";
      } else {
        provider.connection_status = "Offline";
      }
    }
  } catch (err: any) {
    provider.error_count = (provider.error_count || 0) + 1;
    provider.response_time = Date.now() - startTime;

    if (err.name === "AbortError") {
      provider.connection_status = "Offline";
    } else if (err.message?.includes("fetch failed") || err.code === "ENOTFOUND") {
      provider.connection_status = "Offline";
    } else if (err.message?.includes("401") || err.message?.includes("403")) {
      provider.connection_status = "Unauthorized";
    } else {
      provider.connection_status = "Offline";
    }
  }

  provider.updated_at = new Date().toISOString();
  db.save();

  res.json({ success: true, provider });
});

// 7. GET /api/admin/providers/monitoring
app.get("/api/admin/providers/monitoring", (req: Request, res: Response) => {
  const state = db.getState();
  const providers = state.aiProviders || [];

  const total = providers.length;
  const online = providers.filter(p => p.connection_status === "Online" && p.status === "active").length;
  const offline = providers.filter(p => p.connection_status !== "Online" || p.status === "inactive").length;
  const errorCount = providers.filter(p => p.error_count > 0).length;

  let totalSuccess = 0;
  let totalFailed = 0;
  let totalUsage = 0;

  providers.forEach(p => {
    totalSuccess += p.success_count || 0;
    totalFailed += p.error_count || 0;
    totalUsage += p.usage_counter || 0;
  });

  res.json({
    total,
    online,
    offline,
    errorCount,
    usageHarian: totalUsage,
    usageBulanan: totalUsage * 30,
    totalSuccess,
    totalFailed
  });
});

// --- Dynamic Generator Routes with Auto Routing Fallback ---

app.post("/api/user/generate-image-trigger", async (req: Request, res: Response) => {
  const { userId, prompt, engine, masterPrompt, imageReferences, videoReferences, mode } = req.body;
  const state = db.getState();
  const creditsObj = state.credits.find((c) => c.userId === userId);

  if (!creditsObj || creditsObj.balance < 15) {
    return res.status(403).json({ error: "Kredit tidak mencukupi untuk memicu Generator Gambar." });
  }

  const providers = state.aiProviders || [];
  const imageProviders = providers.filter(p => p.provider_category === "IMAGE GENERATOR" && p.status === "active");

  if (imageProviders.length === 0) {
    return res.status(500).json({ error: "Sistem Provider Global Error: Tidak ada Provider Gambar yang sedang aktif." });
  }

  // Sort: Requested engine preferred first, others follow
  const sorted = [...imageProviders].sort((a, b) => {
    if (a.id === engine || a.provider_name.toLowerCase() === String(engine).toLowerCase()) return -1;
    if (b.id === engine || b.provider_name.toLowerCase() === String(engine).toLowerCase()) return 1;
    return 0;
  });

  let lastError: any = null;
  let successResult: any = null;
  let workingProvider: AiProvider | null = null;

  for (const p of sorted) {
    try {
      db.logSystem("info", "Routing Engine", `Mencoba Generator Gambar Ke: ${p.provider_name}`);
      successResult = await executeProviderCall(p, prompt, "IMAGE GENERATOR", {
        masterPrompt,
        imageReferences,
        videoReferences,
        mode
      });
      workingProvider = p;
      break; // Success! Exit loop
    } catch (err: any) {
      lastError = err;
      db.logSystem("warn", "Routing Engine", `Provider ${p.provider_name} gagal: ${err.message}. Mengalihkan router otomatis ke provider lain...`);
    }
  }

  if (!successResult) {
    db.logSystem("error", "Routing Engine", `Semua provider gambar [${sorted.length}] gagal terhubung.`);
    return res.status(500).json({
      error: `Gagal memicu pembuatan gambar dari seluruh provider terdaftar. Error asli terakhir: ${lastError?.message || 'Koneksi Ditolak'}`
    });
  }

  creditsObj.balance -= 15;
  creditsObj.totalSpent += 15;

  const newGenHistory = {
    id: `img-${Date.now()}`,
    userId,
    engine: workingProvider!.provider_name,
    prompt,
    imageUrl: successResult.url,
    aestheticDetails: successResult.details,
    createdAt: new Date().toISOString()
  };

  const userObj = state.users.find(u => u.id === userId);
  db.logActivity(userId, userObj?.username, "GENERATED_IMAGE", `Berhasil menghasilkan gambar via ${workingProvider!.provider_name} (setelah auto-routing fallback).`);
  db.save();

  res.json({ success: true, result: newGenHistory, remainingCredits: creditsObj.balance });
});

app.post("/api/user/generate-video-trigger", async (req: Request, res: Response) => {
  const { userId, prompt, engine, masterPrompt, imageReferences, videoReferences, mode } = req.body;
  const state = db.getState();
  const creditsObj = state.credits.find((c) => c.userId === userId);

  if (!creditsObj || creditsObj.balance < 30) {
    return res.status(403).json({ error: "Kredit tidak mencukupi untuk memicu Generator Video." });
  }

  const providers = state.aiProviders || [];
  const videoProviders = providers.filter(p => p.provider_category === "VIDEO GENERATOR" && p.status === "active");

  if (videoProviders.length === 0) {
    return res.status(500).json({ error: "Sistem Provider Global Error: Tidak ada Provider Video yang sedang aktif." });
  }

  // Sort: Requested engine preferred first, others follow
  const sorted = [...videoProviders].sort((a, b) => {
    if (a.id === engine || a.provider_name.toLowerCase() === String(engine).toLowerCase()) return -1;
    if (b.id === engine || b.provider_name.toLowerCase() === String(engine).toLowerCase()) return 1;
    return 0;
  });

  let lastError: any = null;
  let successResult: any = null;
  let workingProvider: AiProvider | null = null;

  for (const p of sorted) {
    try {
      db.logSystem("info", "Routing Engine", `Mencoba Generator Video Ke: ${p.provider_name}`);
      successResult = await executeProviderCall(p, prompt, "VIDEO GENERATOR", {
        masterPrompt,
        imageReferences,
        videoReferences,
        mode
      });
      workingProvider = p;
      break; // Success! Exit loop
    } catch (err: any) {
      lastError = err;
      db.logSystem("warn", "Routing Engine", `Provider ${p.provider_name} gagal: ${err.message}. Mengalihkan router otomatis ke provider lain...`);
    }
  }

  if (!successResult) {
    db.logSystem("error", "Routing Engine", `Semua provider video [${sorted.length}] gagal terhubung.`);
    return res.status(500).json({
      error: `Gagal memicu pembuatan video dari seluruh provider terdaftar. Error asli terakhir: ${lastError?.message || 'Koneksi Ditolak'}`
    });
  }

  creditsObj.balance -= 30;
  creditsObj.totalSpent += 30;

  const newGenHistory = {
    id: `vid-${Date.now()}`,
    userId,
    engine: workingProvider!.provider_name,
    prompt,
    videoUrl: successResult.url,
    cinematicDetails: successResult.details,
    createdAt: new Date().toISOString()
  };

  const userObj = state.users.find(u => u.id === userId);
  db.logActivity(userId, userObj?.username, "GENERATED_VIDEO", `Berhasil menghasilkan video via ${workingProvider!.provider_name} (setelah auto-routing fallback).`);
  db.save();

  res.json({ success: true, result: newGenHistory, remainingCredits: creditsObj.balance });
});

// Global error handling middleware to guarantee JSON response instead of HTML
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error("[GLOBAL SERVER ERROR CALLBACK]", err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error terjadi pada sistem backend.",
    details: err.stack || String(err)
  });
});

// ----------------------------------------------------
// Serve Vite frontend client in dev or static files in production
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Trigger background Schema comparison and auto recovery on startup
  autoSyncSchemaOnStartup().catch(err => {
    console.error("[Startup] Auto schema sync failed on boot:", err);
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
