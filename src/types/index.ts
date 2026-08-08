export interface SetupLinkJwtPayload {
  purpose: string;
  username: string;
  iat?: number;
  exp?: number;
}

export interface LinkRow {
  slug: string;
  username: string;
  target_url: string;
  expires_at: number;
  created_at: number;
  updated_at: number;
}

export interface CreateLinkResponse {
  shortUrl: string;
  slug: string;
  expiresAt: number;
}
