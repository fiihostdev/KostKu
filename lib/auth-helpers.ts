"use client";

import { createClient } from "./supabase-browser";

export const supabaseBrowser = createClient();

/**
 * Ambil user yang sedang login (client-side)
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabaseBrowser.auth.getUser();
  return user;
}

/**
 * Ambil profil kost milik user yang login
 */
export async function getKostProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data } = await supabaseBrowser
    .from("kost_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return data;
}

/**
 * Logout
 */
export async function signOut() {
  await supabaseBrowser.auth.signOut();
  window.location.href = "/login";
}
