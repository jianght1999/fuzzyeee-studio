// ===== 页面相关 =====

export interface PageMeta {
  slug: string;
  title: string;
  parentSlug: string | null;
  hasChildren: boolean;
  sortOrder: number;
}

export interface PageDetail {
  slug: string;
  title: string;
  content: string;
  parentSlug: string | null;
  updatedAt: number;
}

// ===== 认证相关 =====

export interface LoginRequest {
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  error?: string;
}

export interface AuthBody {
  token: string;
}

// ===== 页面操作请求 =====

export interface SaveRequest extends AuthBody {
  path: string;
  content: string;
}

export interface CreatePageRequest extends AuthBody {
  path: string;
  content?: string;
}

export interface DeletePageRequest extends AuthBody {
  path: string;
}

export interface RenamePageRequest extends AuthBody {
  oldPath: string;
  newPath: string;
}

export interface MovePageRequest extends AuthBody {
  oldPath: string;
  newPath: string;
}

// ===== 通用响应 =====

export interface ApiResponse {
  success: boolean;
  error?: string;
}

export interface PagesResponse {
  pages: PageMeta[];
}

export interface PageResponse extends PageDetail {}

export interface RecentFile {
  path: string;
  title: string;
  category: string;
  time: number;
}

// ===== 上传响应 =====

export interface UploadResponse {
  success: boolean;
  url?: string;
  error?: string;
}

// ===== API 路径常量 =====

export const API = {
  LOGIN:    '/api/login',
  LOGOUT:   '/api/logout',
  HEALTH:   '/api/health',
  PAGES:    '/api/pages',
  SAVE:     '/api/save',
  CREATE:   '/api/create-page',
  DELETE:   '/api/delete-page',
  RENAME:   '/api/rename-page',
  MOVE:     '/api/move-page',
  RECENT:   '/api/recent',
  RECENT_DELETE: '/api/recent-delete',
  MUSIC:    '/api/music-list',
  UPLOAD:   '/api/upload-image',
  IMG:      '/api/img',
} as const;
