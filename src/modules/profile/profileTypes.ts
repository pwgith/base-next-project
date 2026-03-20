// Profile domain types

export interface Profile {
  id: string;
  supabaseUserId: string;
  displayName: string;
  email: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProfileInput {
  supabaseUserId: string;
  displayName: string;
  email: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  email?: string;
}
