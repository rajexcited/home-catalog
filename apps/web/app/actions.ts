"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getNumber(formData: FormData, key: string, fallback: number) {
  const value = getString(formData, key);
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function signInWithEmail(formData: FormData) {
  const email = getString(formData, "email");

  if (!email) {
    redirect("/sign-in?error=Enter an email address.");
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm`
    }
  });

  if (error) {
    redirect(`/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/sign-in?message=Check your email for the sign-in link.");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function createContainer(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const name = getString(formData, "name");

  if (!name) {
    redirect("/");
  }

  const location = getString(formData, "location");
  const containerType = getString(formData, "containerType");
  const { data, error } = await supabase
    .from("containers")
    .insert({
      owner_user_id: user.id,
      name,
      location: location || null,
      container_type: containerType || null,
      created_by: user.id,
      updated_by: user.id
    })
    .select("id")
    .single();

  if (error) {
    redirect("/");
  }

  await supabase.from("containers").update({ path: data.id }).eq("id", data.id);
  revalidatePath("/");
  redirect("/");
}

export async function createItem(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const name = getString(formData, "name");
  const containerId = getString(formData, "containerId");

  if (!name || !containerId) {
    redirect("/");
  }

  const quantity = getNumber(formData, "quantity", 1);
  const unitCost = getNumber(formData, "unitCost", 0);
  const { error } = await supabase.from("items").insert({
    owner_user_id: user.id,
    container_id: containerId,
    name,
    quantity,
    unit_cost: unitCost,
    created_by: user.id,
    updated_by: user.id
  });

  if (error) {
    redirect("/");
  }

  revalidatePath("/");
  redirect("/");
}
