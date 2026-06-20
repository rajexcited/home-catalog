"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const ITEM_IMAGES_BUCKET = "item-images";

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

function getOptionalNumber(formData: FormData, key: string) {
  const value = getString(formData, key);
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getOptionalDate(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value || null;
}

function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.-]/g, "-");
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return { supabase, user };
}

export async function signInWithEmail(formData: FormData) {
  const email = getString(formData, "email");

  if (!email) {
    redirect("/sign-in?error=Enter an email address.");
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    redirect("/sign-in?error=Site URL is not configured.");
  }
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
  const { supabase, user } = await requireUser();

  const name = getString(formData, "name");
  if (!name) {
    redirect("/containers?error=Container name is required");
  }

  const location = getString(formData, "location");
  const containerType = getString(formData, "containerType");
  const notes = getString(formData, "notes");
  const parentId = getString(formData, "parentId");

  const { data, error } = await supabase
    .from("containers")
    .insert({
      owner_user_id: user.id,
      name,
      parent_id: parentId || null,
      location: location || null,
      container_type: containerType || null,
      notes: notes || null,
      created_by: user.id,
      updated_by: user.id
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/containers?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.from("containers").update({ path: data.id }).eq("id", data.id);
  revalidatePath("/");
  revalidatePath("/containers");
  redirect("/containers?success=Container created");
}

export async function updateContainer(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = getString(formData, "id");

  if (!id) {
    redirect("/containers?error=Missing container id");
  }

  const name = getString(formData, "name");
  const location = getString(formData, "location");
  const containerType = getString(formData, "containerType");
  const notes = getString(formData, "notes");

  const { error } = await supabase
    .from("containers")
    .update({
      name: name || undefined,
      location: location || null,
      container_type: containerType || null,
      notes: notes || null,
      updated_by: user.id
    })
    .eq("id", id)
    .eq("owner_user_id", user.id);

  if (error) {
    redirect(`/containers/${id}/details?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  revalidatePath("/containers");
  revalidatePath(`/containers/${id}`);
  revalidatePath(`/containers/${id}/details`);
  redirect(`/containers/${id}/details?success=Saved`);
}

export async function deleteContainer(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = getString(formData, "id");

  if (!id) {
    redirect("/containers?error=Missing container id");
  }

  const { error } = await supabase.from("containers").delete().eq("id", id).eq("owner_user_id", user.id);
  if (error) {
    redirect(`/containers/${id}/details?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  revalidatePath("/containers");
  redirect("/containers?success=Container removed");
}

export async function createItem(formData: FormData) {
  const { supabase, user } = await requireUser();

  const name = getString(formData, "name");
  const containerId = getString(formData, "containerId");

  if (!name || !containerId) {
    redirect("/items/new?error=Name and container are required");
  }

  const quantity = getNumber(formData, "quantity", 1);
  const unitCost = getNumber(formData, "unitCost", 0);
  const category = getString(formData, "category");
  const notes = getString(formData, "notes");
  const purchaseDate = getOptionalDate(formData, "purchaseDate");
  const warrantyExpiry = getOptionalDate(formData, "warrantyExpiry");

  const { data, error } = await supabase
    .from("items")
    .insert({
      owner_user_id: user.id,
      container_id: containerId,
      name,
      category: category || null,
      notes: notes || null,
      quantity,
      unit_cost: unitCost,
      purchase_date: purchaseDate,
      warranty_expiry: warrantyExpiry,
      created_by: user.id,
      updated_by: user.id
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/items/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  revalidatePath(`/containers/${containerId}`);
  revalidatePath("/search");
  redirect(`/items/${data.id}?success=Item created`);
}

export async function updateItem(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = getString(formData, "id");
  const containerId = getString(formData, "containerId");

  if (!id) {
    redirect("/search?error=Missing item id");
  }

  const name = getString(formData, "name");
  const category = getString(formData, "category");
  const quantity = getOptionalNumber(formData, "quantity");
  const unitCost = getOptionalNumber(formData, "unitCost");
  const purchaseDate = getOptionalDate(formData, "purchaseDate");
  const warrantyExpiry = getOptionalDate(formData, "warrantyExpiry");
  const notes = getString(formData, "notes");

  const { error } = await supabase
    .from("items")
    .update({
      name: name || undefined,
      category: category || null,
      quantity,
      unit_cost: unitCost,
      purchase_date: purchaseDate,
      warranty_expiry: warrantyExpiry,
      notes: notes || null,
      updated_by: user.id
    })
    .eq("id", id)
    .eq("owner_user_id", user.id);

  if (error) {
    redirect(`/items/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath(`/items/${id}`);
  if (containerId) {
    revalidatePath(`/containers/${containerId}`);
  }
  redirect(`/items/${id}?success=Saved`);
}

export async function deleteItem(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = getString(formData, "id");
  const containerId = getString(formData, "containerId");

  if (!id) {
    redirect("/search?error=Missing item id");
  }

  const { error } = await supabase.from("items").delete().eq("id", id).eq("owner_user_id", user.id);
  if (error) {
    redirect(`/items/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  revalidatePath("/search");
  if (containerId) {
    revalidatePath(`/containers/${containerId}`);
    redirect(`/containers/${containerId}?success=Item removed`);
  }
  redirect("/search?success=Item removed");
}

export async function uploadItemImage(formData: FormData) {
  const { supabase, user } = await requireUser();
  const itemId = getString(formData, "itemId");
  const caption = getString(formData, "caption");
  const file = formData.get("image");

  if (!itemId || !(file instanceof File) || file.size === 0) {
    redirect(`/items/${itemId || ""}?error=Select an image first`);
  }

  const safeName = sanitizeFileName(file.name || "photo.jpg");
  const path = `${user.id}/${itemId}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from(ITEM_IMAGES_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/octet-stream"
  });

  if (uploadError) {
    redirect(`/items/${itemId}?error=${encodeURIComponent(uploadError.message)}`);
  }

  const { error: imageError } = await supabase.from("item_images").insert({
    item_id: itemId,
    owner_user_id: user.id,
    storage_path: path,
    caption: caption || null,
    created_by: user.id
  });

  if (imageError) {
    await supabase.storage.from(ITEM_IMAGES_BUCKET).remove([path]);
    redirect(`/items/${itemId}?error=${encodeURIComponent(imageError.message)}`);
  }

  revalidatePath(`/items/${itemId}`);
  redirect(`/items/${itemId}?success=Image uploaded`);
}

export async function deleteItemImage(formData: FormData) {
  const { supabase, user } = await requireUser();
  const imageId = getString(formData, "imageId");
  const itemId = getString(formData, "itemId");

  if (!imageId || !itemId) {
    redirect(`/items/${itemId || ""}?error=Missing image`);
  }

  const { data: image, error: fetchError } = await supabase.from("item_images").select("storage_path").eq("id", imageId).eq("owner_user_id", user.id).single();

  if (fetchError || !image) {
    redirect(`/items/${itemId}?error=Image not found`);
  }

  const { error: removeStorageError } = await supabase.storage.from(ITEM_IMAGES_BUCKET).remove([image.storage_path]);
  if (removeStorageError) {
    redirect(`/items/${itemId}?error=${encodeURIComponent(removeStorageError.message)}`);
  }

  const { error: deleteRowError } = await supabase.from("item_images").delete().eq("id", imageId).eq("owner_user_id", user.id);
  if (deleteRowError) {
    redirect(`/items/${itemId}?error=${encodeURIComponent(deleteRowError.message)}`);
  }

  revalidatePath(`/items/${itemId}`);
  redirect(`/items/${itemId}?success=Image removed`);
}

export async function cloneItem(formData: FormData) {
  const { supabase, user } = await requireUser();
  const itemId = getString(formData, "itemId");
  if (!itemId) redirect("/search?error=Missing item id");

  const { data: original, error: fetchError } = await supabase
    .from("items")
    .select("container_id, name, category, quantity, unit_cost, purchase_date, warranty_expiry, notes")
    .eq("id", itemId)
    .eq("owner_user_id", user.id)
    .single();

  if (fetchError || !original) redirect("/search?error=Item not found");

  const { data: newItem, error: insertError } = await supabase
    .from("items")
    .insert({
      owner_user_id: user.id,
      container_id: original.container_id,
      name: `${original.name} (copy)`,
      category: original.category,
      quantity: original.quantity,
      unit_cost: original.unit_cost,
      purchase_date: original.purchase_date,
      warranty_expiry: original.warranty_expiry,
      notes: original.notes,
      created_by: user.id,
      updated_by: user.id
    })
    .select("id")
    .single();

  if (insertError) redirect(`/items/${itemId}?error=${encodeURIComponent(insertError.message)}`);

  revalidatePath(`/containers/${original.container_id}`);
  revalidatePath("/search");
  redirect(`/items/${newItem.id}?success=Item cloned`);
}

export async function renameContainerType(formData: FormData) {
  const { supabase, user } = await requireUser();
  const oldType = getString(formData, "oldType");
  const newType = getString(formData, "newType");
  if (!oldType || !newType) redirect("/types/containers?error=Both old and new type are required");

  const { error } = await supabase.from("containers").update({ container_type: newType }).eq("container_type", oldType).eq("owner_user_id", user.id);

  if (error) redirect(`/types/containers?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/");
  revalidatePath("/containers");
  revalidatePath("/types/containers");
  redirect("/types/containers?success=Type renamed");
}

export async function renameItemCategory(formData: FormData) {
  const { supabase, user } = await requireUser();
  const oldCategory = getString(formData, "oldCategory");
  const newCategory = getString(formData, "newCategory");
  if (!oldCategory || !newCategory) redirect("/types/items?error=Both old and new category are required");

  const { error } = await supabase.from("items").update({ category: newCategory }).eq("category", oldCategory).eq("owner_user_id", user.id);

  if (error) redirect(`/types/items?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/types/items");
  redirect("/types/items?success=Category renamed");
}
