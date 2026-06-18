import fs from "fs";
import path from "path";

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: "super_admin" | "admin" | "user";
  createdAt: string;
}

export interface Profile {
  userId: string;
  fullName: string;
  phone: string;
  bio: string;
  avatarUrl: string;
  id?: string;
  email?: string;
  username?: string;
  role?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Token {
  code: string;
  credits: number;
  role: "super_admin" | "admin" | "user";
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  redeemedBy?: string;
  redeemedAt?: string;
}

export interface Credit {
  userId: string;
  balance: number;
  totalSpent: number;
}

export interface PromptAnalysis {
  id: string;
  userId: string;
  fileName?: string;
  fileType?: "image" | "video" | "url";
  fileData?: string; // base64 or URL
  parameters: any; // complete structured parameters
  createdAt: string;
}

export interface MasterPrompt {
  id: string;
  userId: string;
  title: string;
  engine: string;
  maxLength: number;
  language: "id" | "en";
  inputParameters: any;
  generatedPrompt: string;
  createdAt: string;
}

export interface VideoUpload {
  id: string;
  userId: string;
  username?: string;
  fileName: string;
  fileSize: number;
  duration?: number;
  resolution?: string;
  fps?: number;
  codec?: string;
  storagePath: string;
  publicUrl: string;
  createdAt: string;
  analysisCompletedAt?: string;
  analysisId?: string;
}

export interface FileReference {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadTime: string;
  providerTarget: string;
  publicUrl: string;
  storagePath: string;
  resolution?: string;
  duration?: number;
}

export interface ApiSettings {
  geminiApiKey: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  supabaseConnectionString?: string;
  midjourneyKey: string;
  stabilityKey: string;
  runwayKey: string;
  lumaKey: string;
  klingKey: string;
  leonardoKey: string;
  videoSizeLimitMB: number;
}

export interface Announcement {
  id: string;
  text: string;
  isActive: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  username?: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface SystemLog {
  id: string;
  level: "info" | "warn" | "error";
  service: string;
  message: string;
  timestamp: string;
}

export interface AiProvider {
  id: string;
  provider_name: string;
  provider_category: "IMAGE GENERATOR" | "VIDEO GENERATOR" | "PROMPT GENERATOR" | "LLM" | "EMBEDDING" | "UPSCALER" | "IMAGE EDITOR" | "VIDEO EDITOR";
  provider_logo: string;
  api_endpoint: string;
  api_key: string;
  model_name: string;
  status: "active" | "inactive";
  connection_status: "Online" | "Offline" | "Invalid API" | "Quota Exceeded" | "Rate Limited" | "Unauthorized" | "Maintenance";
  region?: string;
  version?: string;
  organization_id?: string;
  project_id?: string;
  webhook_url?: string;
  callback_url?: string; // only for video
  custom_header?: string; // JSON string
  custom_parameter?: string; // JSON string
  last_check?: string;
  usage_counter: number;
  request_counter: number;
  response_time: number; // in ms
  success_count: number;
  error_count: number;
  created_at: string;
  updated_at: string;
}

export function generateSeededProviders(): AiProvider[] {
  const images = [
    "Midjourney", "DALL-E", "Imagen", "Stable Diffusion", "Adobe Firefly", "Leonardo AI", "Ideogram", "FLUX", "Canva AI", "Recraft",
    "Microsoft Copilot Designer", "Craiyon", "NightCafe", "Artbreeder", "Photoroom", "Picsart AI", "Shutterstock AI", "Getty Images AI",
    "Runway Images", "Wombo Dream", "Playground AI", "DreamStudio", "Mage Space", "Clipdrop", "Krea AI", "Freepik AI", "DeepAI Image",
    "OpenArt", "TensorArt", "SeaArt", "Fotor AI", "Pixlr AI", "Akool", "Bytedance Dreamina", "HuggingFace Image Models",
    "Replicate Image Models", "Fal AI Image Models", "Black Forest Labs FLUX", "Stability AI", "Invoke AI", "Fooocus Backend",
    "ComfyUI Backend", "Automatic1111 Backend"
  ];

  const videos = [
    "OpenAI Sora", "Google Veo", "Runway Gen-3", "Runway Gen-4", "Kling AI", "Luma Dream Machine", "Pika Labs", "Hailuo AI",
    "Minimax Video", "Wan Alibaba", "Synthesia", "HeyGen", "InVideo AI", "Seedance", "PixVerse", "Vyond", "Colossyan",
    "Adobe Firefly Video", "DeepBrain AI", "Creatify", "Pictory", "CapCut AI", "D-ID", "Haiper AI", "Vidu", "Lumen5",
    "Veo Fast", "Veo Quality", "Tencent Hunyuan Video", "ByteDance Video Models", "Higgsfield AI", "SkyReels", "Morph Studio",
    "Elai", "Hour One", "Animaker AI", "RenderNet Video", "TopView AI", "Magic Hour", "Wonder Studio", "LeiaPix",
    "RunComfy Video", "Fal AI Video Models", "Replicate Video Models", "HuggingFace Video Models"
  ];

  const list: AiProvider[] = [];
  const now = new Date().toISOString();

  images.forEach((name) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    let endpoint = "https://api.ai-provider.com/v1/image";
    let model = "standard-v1";
    if (name === "DALL-E") {
      endpoint = "https://api.openai.com/v1/images/generations";
      model = "dall-e-3";
    } else if (name === "Stable Diffusion" || name === "Stability AI") {
      endpoint = "https://api.stability.ai/v1/generation";
      model = "stable-diffusion-xl-1024-v1-0";
    } else if (name === "FLUX" || name === "Black Forest Labs FLUX") {
      endpoint = "https://api.blackforestlabs.ai/v1/flux";
      model = "flux-schnell";
    }

    list.push({
      id: `img-${slug}`,
      provider_name: name,
      provider_category: "IMAGE GENERATOR",
      provider_logo: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
      api_endpoint: endpoint,
      api_key: "",
      model_name: model,
      status: "active",
      connection_status: "Online",
      region: "us-east1",
      version: "v1",
      usage_counter: 0,
      request_counter: 0,
      response_time: 150,
      success_count: 0,
      error_count: 0,
      created_at: now,
      updated_at: now
    });
  });

  videos.forEach((name) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    let endpoint = "https://api.ai-provider.com/v1/video";
    let model = "video-v1";
    if (name === "Google Veo" || name === "Veo Quality") {
      endpoint = "https://videointelligence.googleapis.com/v1";
      model = "veo-2.0";
    } else if (name === "Luma Dream Machine") {
      endpoint = "https://api.lumalabs.ai/v1/generations";
      model = "dream-machine";
    } else if (name === "Kling AI") {
      endpoint = "https://api.klingai.com/v1";
      model = "kling-v1";
    }

    list.push({
      id: `vid-${slug}`,
      provider_name: name,
      provider_category: "VIDEO GENERATOR",
      provider_logo: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
      api_endpoint: endpoint,
      api_key: "",
      model_name: model,
      status: "active",
      connection_status: "Online",
      region: "us-west2",
      version: "v1",
      usage_counter: 0,
      request_counter: 0,
      response_time: 250,
      success_count: 0,
      error_count: 0,
      created_at: now,
      updated_at: now
    });
  });

  return list;
}

export interface SystemState {
  installation_completed: boolean;
  profile_completed: boolean;
  api_config_completed: boolean;
  database_connected: boolean;
  setup_completed: boolean;
  owner_id?: string | null;
}

export interface DatabaseState {
  users: User[];
  profiles: Profile[];
  users_backup?: any[];
  tokens: Token[];
  credits: Credit[];
  promptAnalysis: PromptAnalysis[];
  masterPrompts: MasterPrompt[];
  apiSettings: ApiSettings;
  announcements: Announcement[];
  activityLogs: ActivityLog[];
  systemLogs: SystemLog[];
  aiProviders: AiProvider[];
  videoUploads: VideoUpload[];
  imageReferences: FileReference[];
  videoReferences: FileReference[];
  adminProfile?: AdminProfile | null;
  systemState?: SystemState | null;
  failedMigrations?: string[];
  migrationReport?: {
    tablesCreated: number;
    tablesUpdated: number;
    columnsAdded: number;
    policiesCreated: number;
    policiesSkipped: number;
    policiesUpdated: number;
  };
}

export interface AdminProfile {
  id: string;
  fullName: string;
  appName: string;
  brandName: string;
  designedBy: string;
  email: string;
  whatsapp: string;
  website: string;
  bio: string;
  profilePhoto: string;
  companyLogo: string;
  profileCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

const DB_PATH = path.join(process.cwd(), "db.json");

// Default seeded state
const defaultState: DatabaseState = {
  adminProfile: null,
  systemState: {
    installation_completed: false,
    profile_completed: false,
    api_config_completed: false,
    database_connected: false,
    setup_completed: false,
    owner_id: null,
  },
  users: [],
  profiles: [],
  users_backup: [],
  tokens: [],
  credits: [],
  promptAnalysis: [],
  masterPrompts: [],
  apiSettings: {
    geminiApiKey: "",
    supabaseUrl: "",
    supabaseAnonKey: "",
    supabaseServiceRoleKey: "",
    supabaseConnectionString: "",
    midjourneyKey: "",
    stabilityKey: "",
    runwayKey: "",
    lumaKey: "",
    klingKey: "",
    leonardoKey: "",
    videoSizeLimitMB: 100,
  },
  announcements: [],
  activityLogs: [
    {
      id: "act-1",
      action: "SYSTEM_START",
      details: "Sistem utama Prompt By Niks berhasil dijalankan.",
      timestamp: new Date().toISOString(),
    },
  ],
  systemLogs: [
    {
      id: "sys-1",
      level: "info",
      service: "Database",
      message: "Database JSON lokal berhasil diinisialisasi.",
      timestamp: new Date().toISOString(),
    },
  ],
  aiProviders: [],
  videoUploads: [],
  imageReferences: [],
  videoReferences: [],
  failedMigrations: [],
  migrationReport: {
    tablesCreated: 0,
    tablesUpdated: 0,
    columnsAdded: 0,
    policiesCreated: 0,
    policiesSkipped: 0,
    policiesUpdated: 0
  }
};

export class DatabaseManager {
  private state: DatabaseState;

  constructor() {
    this.state = this.load();
  }

  private load(): DatabaseState {
    try {
      if (fs.existsSync(DB_PATH)) {
        const fileContent = fs.readFileSync(DB_PATH, "utf-8");
        const parsed = JSON.parse(fileContent) as DatabaseState;
        
        // Ensure videoUploads array exists in case of stale JSON structure
        if (!parsed.videoUploads) {
          parsed.videoUploads = [];
        }
        if (!parsed.imageReferences) {
          parsed.imageReferences = [];
        }
        if (!parsed.videoReferences) {
          parsed.videoReferences = [];
        }
        if (!parsed.apiSettings.videoSizeLimitMB) {
          parsed.apiSettings.videoSizeLimitMB = 100;
        }
        if (parsed.adminProfile === undefined) {
          parsed.adminProfile = null;
        }

        if (parsed.systemState === undefined || parsed.systemState === null) {
          parsed.systemState = {
            installation_completed: parsed.adminProfile ? parsed.adminProfile.profileCompleted : false,
            profile_completed: parsed.adminProfile ? parsed.adminProfile.profileCompleted : false,
            api_config_completed: !!parsed.apiSettings?.geminiApiKey,
            database_connected: !!parsed.apiSettings?.supabaseUrl,
            setup_completed: parsed.adminProfile ? parsed.adminProfile.profileCompleted : false,
            owner_id: parsed.adminProfile ? (parsed.adminProfile as any).id || null : null,
          };
        }

        if (!parsed.failedMigrations) {
          parsed.failedMigrations = [];
        }
        if (!parsed.migrationReport) {
          parsed.migrationReport = {
            tablesCreated: 0,
            tablesUpdated: 0,
            columnsAdded: 0,
            policiesCreated: 0,
            policiesSkipped: 0,
            policiesUpdated: 0
          };
        }

        if (!parsed.aiProviders || parsed.aiProviders.length === 0) {
          parsed.aiProviders = generateSeededProviders();
          this.saveState(parsed);
        }
        return parsed;
      }
    } catch (e) {
      console.error("Error loading DB file, rebuilding...", e);
    }
    const stateWithProviders = { ...defaultState, aiProviders: generateSeededProviders() };
    this.saveState(stateWithProviders);
    return stateWithProviders;
  }

  private saveState(state: DatabaseState) {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), "utf-8");
    } catch (e) {
      console.error("Error saving DB file:", e);
    }
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public save() {
    this.saveState(this.state);
  }

  // Activity & System Logging helpers
  public logActivity(userId: string | undefined, username: string | undefined, action: string, details: string) {
    const log: ActivityLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId,
      username,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    this.state.activityLogs.unshift(log);
    // Limit log size to 100 entries
    if (this.state.activityLogs.length > 100) this.state.activityLogs.pop();
    this.save();
  }

  public logSystem(level: "info" | "warn" | "error", service: string, message: string) {
    const log: SystemLog = {
      id: `sys-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      level,
      service,
      message,
      timestamp: new Date().toISOString(),
    };
    this.state.systemLogs.unshift(log);
    if (this.state.systemLogs.length > 100) this.state.systemLogs.pop();
    this.save();
  }

  // SQL export to satisfy database schema and row level security requests
  public getSQLSchema(): string {
    return `-- ==========================================
-- PROMPT BY NIKS (Designed By Gara)
-- SUPABASE POSTGRESQL PRODUCTION READY SCHEMA
-- ==========================================

-- Enable Row Level Security
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prompt_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.master_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.api_settings ENABLE ROW LEVEL SECURITY;

-- 1. Table: Users Auth representation schema
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table: Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    bio TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Table: Tokens
CREATE TABLE IF NOT EXISTS public.tokens (
    code TEXT PRIMARY KEY,
    credits INTEGER NOT NULL CHECK (credits > 0),
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    redeemed_by UUID REFERENCES public.users(id),
    redeemed_at TIMESTAMP WITH TIME ZONE
);

-- 4. Table: Credits
CREATE TABLE IF NOT EXISTS public.credits (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 50 CHECK (balance >= 0),
    total_spent INTEGER NOT NULL DEFAULT 0 CHECK (total_spent >= 0)
);

-- 5. Table: Prompt Analysis (Foto, Video, URL parameters)
CREATE TABLE IF NOT EXISTS public.prompt_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT,
    file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'url')),
    file_data TEXT, -- keeps file metadata/storage URL
    parameters JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5b. Table: Relational Photo Parameters (Hundreds of Structured Columns)
CREATE TABLE IF NOT EXISTS public.photo_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID REFERENCES public.prompt_analysis(id) ON DELETE CASCADE NOT NULL,
    
    -- A. MAIN SUBJECT
    object_type TEXT, object_category TEXT, object_quantity TEXT, gender TEXT, 
    age_range TEXT, ethnicity_appearance TEXT, body_shape TEXT, height_appearance TEXT, 
    weight_appearance TEXT, facial_structure TEXT, eye_shape TEXT, eye_color TEXT, 
    hair_style TEXT, hair_length TEXT, hair_color TEXT, skin_tone TEXT, 
    makeup_style TEXT, expression TEXT, emotion TEXT, mood TEXT, 
    pose TEXT, hand_position TEXT, leg_position TEXT, head_direction TEXT, 
    body_direction TEXT, accessories TEXT, jewelry TEXT, tattoo TEXT, piercing TEXT,

    -- B. FASHION & OOTD
    fashion_style TEXT, ootd_style TEXT, top_clothing TEXT, bottom_clothing TEXT, 
    footwear TEXT, outerwear TEXT, headwear TEXT, eyewear TEXT, bag TEXT, 
    watch TEXT, belt TEXT, scarf TEXT, fabric_type TEXT, fabric_texture TEXT, 
    fabric_pattern TEXT, fabric_reflection TEXT, luxury_level TEXT, brand_style TEXT,

    -- C. MIRROR SELFIE
    mirror_type TEXT, mirror_shape TEXT, mirror_size TEXT, mirror_position TEXT, 
    mirror_reflection TEXT, mirror_distortion TEXT, mirror_frame TEXT, phone_type TEXT, 
    phone_color TEXT, phone_case TEXT, selfie_style TEXT, face_visibility TEXT, flash_reflection TEXT,

    -- D. ENVIRONMENT
    location_type TEXT, country_style TEXT, city_style TEXT, indoor TEXT, 
    outdoor TEXT, architecture_style TEXT, room_type TEXT, street_type TEXT, 
    nature_type TEXT, landscape_type TEXT, weather TEXT, season TEXT, temperature_feel TEXT,

    -- E. BACKGROUND
    background_type TEXT, foreground_elements TEXT, middle_ground TEXT, background_elements TEXT, 
    crowd_density TEXT, traffic_density TEXT, visual_depth TEXT,

    -- F. LIGHTING
    light_source TEXT, natural_light TEXT, artificial_light TEXT, studio_light TEXT, 
    golden_hour TEXT, blue_hour TEXT, sunset TEXT, sunrise TEXT, moonlight TEXT, 
    neon_light TEXT, rgb_light TEXT, volumetric_light TEXT, back_light TEXT, 
    front_light TEXT, side_light TEXT, top_light TEXT, bottom_light TEXT, 
    light_intensity TEXT, light_direction TEXT, shadow_type TEXT,

    -- G. CAMERA
    camera_brand TEXT, camera_model TEXT, lens_brand TEXT, lens_type TEXT, 
    focal_length TEXT, aperture TEXT, iso TEXT, shutter_speed TEXT, 
    white_balance TEXT, focus_mode TEXT, dynamic_range TEXT, exposure TEXT,

    -- H. CAMERA ANGLE
    eye_level TEXT, low_angle TEXT, high_angle TEXT, bird_eye_view TEXT, 
    worm_eye_view TEXT, dutch_angle TEXT, over_shoulder TEXT, pov_angle TEXT,

    -- I. SHOT TYPE
    extreme_close_up TEXT, close_up TEXT, medium_close_up TEXT, medium_shot TEXT, 
    medium_full_shot TEXT, full_body_shot TEXT, wide_shot TEXT, extreme_wide_shot TEXT,

    -- J. COMPOSITION
    rule_of_thirds TEXT, golden_ratio TEXT, centered TEXT, leading_lines TEXT, 
    frame_within_frame TEXT, symmetry TEXT, negative_space TEXT, depth_layering TEXT,

    -- K. COLOR SCIENCE
    primary_color TEXT, secondary_color TEXT, accent_color TEXT, warm_tone TEXT, 
    cool_tone TEXT, monochrome TEXT, pastel TEXT, muted TEXT, vibrant TEXT,

    -- L. CINEMATIC STYLE
    photorealistic TEXT, hyper_realistic TEXT, editorial TEXT, fashion_magazine TEXT, 
    luxury_advertisement TEXT, movie_poster TEXT, hollywood_cinematic TEXT, anime TEXT, 
    cyberpunk TEXT, sci_fi TEXT, fantasy TEXT, vintage TEXT, retro TEXT, documentary TEXT,

    -- M. IMAGE QUALITY
    quality_2k TEXT, quality_4k TEXT, quality_8k TEXT, quality_16k TEXT, 
    ultra_detail TEXT, hyper_detail TEXT, masterpiece TEXT, award_winning TEXT, hdr TEXT, raw_quality TEXT,

    -- N. SOCIAL MEDIA STYLE
    instagram TEXT, tiktok TEXT, pinterest TEXT, vsco TEXT, 
    influencer_style TEXT, luxury_lifestyle TEXT, travel_content TEXT, fashion_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5c. Table: Relational Video Parameters (Tens of Structured Columns)
CREATE TABLE IF NOT EXISTS public.video_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID REFERENCES public.prompt_analysis(id) ON DELETE CASCADE NOT NULL,

    -- A. CAMERA MOVEMENT
    pan_left TEXT, pan_right TEXT, tilt_up TEXT, tilt_down TEXT, zoom_in TEXT, 
    zoom_out TEXT, dolly_in TEXT, dolly_out TEXT, truck_left TEXT, truck_right TEXT, 
    crane_up TEXT, crane_down TEXT, orbit TEXT, arc_shot TEXT, push_in TEXT, 
    pull_out TEXT, tracking_shot TEXT, follow_shot TEXT, reveal_shot TEXT, whip_pan TEXT,

    -- B. CAMERA STABILITY
    handheld TEXT, steadycam TEXT, gimbal TEXT, drone TEXT, FPV_drone TEXT, 
    tripod TEXT, shoulder_rig TEXT, pov TEXT,

    -- C. MOTION SPEED
    normal TEXT, slow_motion TEXT, super_slow_motion TEXT, fast_motion TEXT, 
    hyperlapse TEXT, timelapse TEXT,

    -- D. SUBJECT ACTION
    walking TEXT, running TEXT, jumping TEXT, turning TEXT, talking TEXT, 
    smiling TEXT, laughing TEXT, dancing TEXT, driving TEXT, flying TEXT, swimming TEXT,

    -- E. PHYSICS
    wind TEXT, rain TEXT, snow TEXT, fog TEXT, smoke TEXT, dust TEXT, 
    fire TEXT, explosion TEXT, water_splash TEXT, cloth_motion TEXT, hair_motion TEXT, particle_motion TEXT,

    -- F. CINEMATOGRAPHY
    movie_trailer TEXT, netflix_style TEXT, documentary TEXT, commercial TEXT, 
    luxury_advertisement TEXT, music_video TEXT, fashion_film TEXT, travel_film TEXT, 
    sci_fi_film TEXT, cyberpunk_film TEXT,

    -- G. COLOR GRADING
    teal_orange TEXT, moody TEXT, dark TEXT, vibrant TEXT, natural_look TEXT, 
    film_look TEXT, kodak_film TEXT, fuji_film TEXT, vintage_vhs TEXT,

    -- H. VIDEO FORMAT
    format_16_9 TEXT, format_9_16 TEXT, format_1_1 TEXT, format_4_5 TEXT, format_21_9 TEXT, 
    horizontal TEXT, vertical TEXT, square TEXT,

    -- I. VIDEO QUALITY
    quality_hd TEXT, quality_fhd TEXT, quality_2k TEXT, quality_4k TEXT, 
    quality_8k TEXT, quality_12k TEXT, quality_16k TEXT, hdr TEXT, dolby_vision TEXT,

    -- J. AUDIO VISUAL
    ambient_sound TEXT, nature_sound TEXT, city_sound TEXT, dialogue TEXT, 
    voice_over TEXT, music_style TEXT, sound_effect TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Table: Master Prompts (professional custom parameters)
CREATE TABLE IF NOT EXISTS public.master_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    engine TEXT NOT NULL,
    max_length INTEGER NOT NULL,
    language TEXT NOT NULL CHECK (language IN ('id', 'en')),
    input_parameters JSONB NOT NULL,
    generated_prompt TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Table: API Settings
CREATE TABLE IF NOT EXISTS public.api_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    gemini_api_key TEXT,
    supabase_url TEXT,
    supabase_anon_key TEXT,
    supabase_service_role_key TEXT,
    midjourney_key TEXT,
    stability_key TEXT,
    runway_key TEXT,
    luma_key TEXT,
    kling_key TEXT,
    leonardo_key TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Table: Announcements
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Table: Activity Logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    username TEXT,
    action TEXT NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Table: System Logs
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
    service TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Table: AI Providers Global Manager
CREATE TABLE IF NOT EXISTS public.ai_providers (
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
);

-- 12. Table: Video Uploads Manager
CREATE TABLE IF NOT EXISTS public.video_uploads (
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
);

-- 13. Table: Admin App Setup Profile
CREATE TABLE IF NOT EXISTS public.admin_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
);

-- 14. Table: System State Manager
CREATE TABLE IF NOT EXISTS public.system_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    installation_completed BOOLEAN NOT NULL DEFAULT false,
    profile_completed BOOLEAN NOT NULL DEFAULT false,
    api_config_completed BOOLEAN NOT NULL DEFAULT false,
    database_connected BOOLEAN NOT NULL DEFAULT false,
    setup_completed BOOLEAN NOT NULL DEFAULT false,
    owner_id TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. Table: Schema Versions
CREATE TABLE IF NOT EXISTS public.schema_versions (
    id SERIAL PRIMARY KEY,
    version INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 16. Table: Generator Providers list
CREATE TABLE IF NOT EXISTS public.generator_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name TEXT NOT NULL,
    api_type TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 17. Table: Prompt Adapters
CREATE TABLE IF NOT EXISTS public.prompt_adapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adapter_name TEXT NOT NULL,
    target_engine TEXT NOT NULL,
    config TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY POLICIES SETUPS
-- ==========================================

-- Enable security on tables
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.video_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_profile ENABLE ROW LEVEL SECURITY;

-- Policy: Users Table
CREATE POLICY "Allow public registration to users table"
    ON public.users
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can only read their own user data"
    ON public.users
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can only update their own user data"
    ON public.users
    FOR UPDATE
    USING (auth.uid() = id);

-- Policy: Admin Profile Branding Accessibility
CREATE POLICY "Public read access to completed admin profile."
    ON public.admin_profile
    FOR SELECT
    USING (true);

CREATE POLICY "Only admins can modify administrative app profiles."
    ON public.admin_profile
    FOR ALL
    USING (
         EXISTS (
             SELECT 1 FROM public.users
             WHERE users.id = auth.uid() AND users.role = 'admin'
         )
     );

-- Policy: Profiles
CREATE POLICY "Allow profile creation upon user registration"
    ON public.profiles
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can only read and update their own profile."
    ON public.profiles
    FOR ALL
    USING (auth.uid() = user_id);

-- Policy: Credits & User Credits
CREATE POLICY "Allow credit initialization upon registration"
    ON public.credits
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can read their own credit balances."
    ON public.credits
    FOR SELECT
    USING (auth.uid() = user_id);

-- Handling user_credits alias table if exists
CREATE POLICY "Allow user_credits initialization upon registration"
    ON public.user_credits
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can read their own user_credits balances."
    ON public.user_credits
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Tokens & User Tokens
CREATE POLICY "Allow token select for redemption"
    ON public.tokens
    FOR SELECT
    USING (is_active = true OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

CREATE POLICY "Allow token update for redemption"
    ON public.tokens
    FOR UPDATE
    USING (true);

CREATE POLICY "Allow user_token select for redemption"
    ON public.user_tokens
    FOR SELECT
    USING (true);

CREATE POLICY "Allow user_token update for redemption"
    ON public.user_tokens
    FOR UPDATE
    USING (true);

-- Policy: Prompt Analysis
CREATE POLICY "Users can manage their own prompt analysis history."
    ON public.prompt_analysis
    FOR ALL
    USING (auth.uid() = user_id);

-- Policy: Master Prompts
CREATE POLICY "Users can manage their own master prompts."
    ON public.master_prompts
    FOR ALL
    USING (auth.uid() = user_id);

-- Policy: Video Uploads
CREATE POLICY "Users can manage their own video uploads."
    ON public.video_uploads
    FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all video uploads."
    ON public.video_uploads
    FOR SELECT
    USING (
         EXISTS (
             SELECT 1 FROM public.users
             WHERE users.id = auth.uid() AND users.role = 'admin'
         )
    );

-- Policy: AI Providers
CREATE POLICY "Registered users can read active AI Providers."
    ON public.ai_providers
    FOR SELECT
    USING (true);

CREATE POLICY "Only admins can modify AI Providers schema."
    ON public.ai_providers
    FOR ALL
    USING (
         EXISTS (
             SELECT 1 FROM public.users
             WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'super_admin')
         )
    );

-- 22. Table: Application Installation Configuration (app_config)
CREATE TABLE IF NOT EXISTS public.app_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID,
    setup_completed BOOLEAN DEFAULT FALSE,
    installation_completed BOOLEAN DEFAULT FALSE,
    schema_version VARCHAR(50) DEFAULT '1.0.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for app_config
ALTER TABLE IF EXISTS public.app_config ENABLE ROW LEVEL SECURITY;

-- Reset existing policies
DROP POLICY IF EXISTS "Public read-only setup access" ON public.app_config;
DROP POLICY IF EXISTS "Owner update access" ON public.app_config;
DROP POLICY IF EXISTS "Super Admin write access" ON public.app_config;

-- 1. All users can read setup status
CREATE POLICY "Public read-only setup access" ON public.app_config
    FOR SELECT TO public USING (true);

-- 2. Only owner_id can update app_config
CREATE POLICY "Owner update access" ON public.app_config
    FOR UPDATE TO public USING (auth.uid() = owner_id);

-- 3. Only Super Admin can modify or reset
CREATE POLICY "Super Admin write access" ON public.app_config
    FOR ALL TO public USING (
        auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin')
    );
`;
  }
}
