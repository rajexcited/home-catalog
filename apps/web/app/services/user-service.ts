import { createClient } from "@/lib/supabase/server";

export interface BaseUserResource {
  id: string;
  display_name: string;
  role: string;
}

export const getUserId = async (supabase = createClient()) => {
  const supabaseClient = await supabase;
  const {
    data: { user }
  } = await supabaseClient.auth.getUser();
  return user?.id ?? null;
};

export const getProfile = async (supabase = createClient()) => {
  const supabaseClient = await supabase;
  const userId = await getUserId(supabase);
  if (!userId) {
    return { profile: null, error: "User not authenticated" };
  }
  const { data: profile, error } = await supabaseClient.from("users").select("display_name, email, role").eq("id", userId).single();
  if (error) {
    return { profile: null, error: error.message };
  }
  if (!profile) {
    return { profile: null, error: "Profile not found" };
  }
  return { profile, error: null };
};
