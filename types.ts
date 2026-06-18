// Shared types for Prompt By Niks Client-Side application

export interface User {
  id: string;
  username: string;
  email: string;
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
  fileType: "image" | "video" | "url";
  parameters: any;
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

export interface ApiSettings {
  geminiApiKey: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  midjourneyKey: string;
  stabilityKey: string;
  runwayKey: string;
  lumaKey: string;
  klingKey: string;
  leonardoKey: string;
  videoSizeLimitMB: number;
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

export interface LiveMonitorData {
  usersOnline: number;
  activeUsersCount: number;
  geminiRequests: number;
  databaseRequests: number;
  tokenUsage: number;
  creditUsage: number;
  announcementText: string;
  activityLogs: ActivityLog[];
  systemLogs: SystemLog[];
  tokens: Token[];
  creditsList: Credit[];
  promptAnalysisCount: number;
  masterPromptsCount: number;
  videoUploads?: VideoUpload[];
  videoUploadsCount?: number;
}

export type ThemeMode = "feminine-4d";

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

