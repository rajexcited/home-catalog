"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContainerTypeReadResource, getContainerIds, getContainerTypes } from "./services/container-service";
import { getUserId } from "./services/user-service";
import { validate as isValidUUID } from "uuid";
import { getDistinctAttributeValuesFromItems } from "./services/item-service";

const ITEM_IMAGES_BUCKET = "item-images";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getStringArray(formData: FormData, key: string) {
  const values = formData
    .getAll(key)
    .flatMap((value) => String(value ?? ""))
    .map((value) => value.trim())
    .filter((v) => v.length > 0);

  const valueSet = new Set(values);
  return Array.from(valueSet);
}

function getNumber(formData: FormData, key: string, fallback?: number) {
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

function withWarrantyExpiry(attributes: Record<string, any> | null | undefined, warrantyExpiry: string | null) {
  const next: Record<string, any> = { ...(attributes ?? {}) };
  if (warrantyExpiry) {
    next.warranty_expiry = warrantyExpiry;
  } else {
    delete next.warranty_expiry;
  }
  return next;
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

async function getContainerTypeId(typeName: string) {
  const supabase = createClient();
  const userId = await getUserId(supabase);
  if (!userId) {
    return { id: "", error: "User not authenticated" };
  }
  const { containerTypes, error: fetchError } = await getContainerTypes(supabase);
  if (fetchError) {
    return { id: "", error: "Failed to fetch container types: " + fetchError };
  }
  let existing: ContainerTypeReadResource | undefined = undefined;
  if (isValidUUID(typeName)) {
    existing = containerTypes.byId[typeName];
  } else {
    existing = containerTypes.byName[typeName];
  }
  if (existing) {
    return { id: existing.id, error: null };
  }
  const supabaseClient = await supabase;
  const { data, error: createError } = await supabaseClient
    .from("container_types")
    .insert({ name: typeName, owner_user_id: userId, description: "type created" })
    .select("id")
    .single();

  if (createError) {
    return { id: "", error: "Failed to create container type: " + createError.message };
  }

  return { id: data.id, error: null };
}

export async function createContainer(formData: FormData) {
  const { supabase, user } = await requireUser();

  const name = getString(formData, "name");
  if (!name) {
    redirect("/containers?error=Container name is required");
  }

  const location = getString(formData, "location");
  //TODO validate with existing value and add api call if needed
  const containerType = getString(formData, "containerType");
  const notes = getString(formData, "notes");
  const tags = getStringArray(formData, "tags");
  const parentId = getString(formData, "parentId");
  const unitCost = getNumber(formData, "unitCost");

  console.log("Creating container with data:", { name, location, containerType, notes, tags, parentId, unitCost });
  console.log("tags in formData:", formData.getAll("tags"));
  const { id: containerTypeId, error: typeError } = await getContainerTypeId(containerType);
  if (typeError) {
    redirect(`/containers?error=${encodeURIComponent(typeError)}`);
  }
  const { data, error } = await supabase
    .from("containers")
    .insert({
      owner_user_id: user.id,
      name,
      parent_id: parentId || null,
      location: location || null,
      container_type: containerTypeId,
      notes: notes,
      unit_cost: unitCost || null,
      tags: tags.length > 0 ? tags : null
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/containers?error=${encodeURIComponent(toContainerErrorMessage(error))}`);
  }

  //   await supabase.from("containers").update({ path: data.id }).eq("id", data.id);
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
  const parentId = getString(formData, "parentId");
  const tags = getStringArray(formData, "tags");

  const { id: containerTypeId, error: typeError } = await getContainerTypeId(containerType);
  if (typeError) {
    redirect(`/containers?error=${encodeURIComponent(typeError)}`);
  }
  const { error } = await supabase
    .from("containers")
    .update({
      name: name || undefined,
      location: location || null,
      container_type: containerTypeId,
      parent_id: parentId || null,
      notes: notes || null,
      tags: tags.length > 0 ? tags : null,
      updated_by: user.id
    })
    .eq("id", id)
    .eq("owner_user_id", user.id);

  if (error) {
    redirect(`/containers/${id}?error=${encodeURIComponent(toContainerErrorMessage(error))}`);
  }

  revalidatePath("/");
  revalidatePath("/containers");
  revalidatePath(`/containers/${id}`);
  redirect(`/containers/${id}?success=Saved`);
}

function toContainerErrorMessage(error: { code?: string; message: string }) {
  if (error.code !== "23505") {
    return error.message;
  }
  if (error.message.includes("unique_container_name_under_parent")) {
    return "A container with this name already exists under the selected parent container";
  }
  return "A top-level container with this name already exists";
}

export async function deleteContainer(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = getString(formData, "id");

  if (!id) {
    redirect("/containers?error=Missing container id");
  }

  const { error } = await supabase.from("containers").delete().eq("id", id).eq("owner_user_id", user.id);
  if (error) {
    redirect(`/containers/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  revalidatePath("/containers");
  redirect("/containers?success=Container removed");
}

async function getItemCategoryId(categoryName: string, userId: string, supabase = createClient()) {
  const { containerIds, error: containerIdsError } = await getContainerIds(supabase);
  if (containerIdsError) {
    return { id: "", error: "Failed to fetch container ids: " + containerIdsError };
  }
  const { distinctValues, error: distinctValuesError } = await getDistinctAttributeValuesFromItems(containerIds, supabase);
  if (distinctValuesError) {
    return { id: "", error: "Failed to fetch distinct item categories: " + distinctValuesError };
  }
  const matchingCategory = distinctValues.item_category_options.find((category) => category.name.toLowerCase() === categoryName.trim().toLowerCase());
  if (matchingCategory) {
    return { id: matchingCategory.id, error: null };
  }

  const supabaseClient = await supabase;
  const { data, error: createError } = await supabaseClient
    .from("item_categories")
    .insert({
      name: categoryName,
      owner_user_id: userId,
      description: "category created",
      updated_by: userId
    })
    .select("id")
    .single();

  if (createError) {
    return { id: "", error: "Failed to create item category: " + createError.message };
  }

  return { id: data.id, error: null };
}

export async function createItem(formData: FormData) {
  // const { supabase, user } = await requireUser();
  const supabase = createClient();
  const userId = await getUserId(supabase);
  if (!userId) {
    redirect("/sign-in");
  }

  const errors = [];
  const name = getString(formData, "name");
  if (!name) {
    errors.push("Name is required");
  }

  const containerId = getString(formData, "container");
  if (!containerId || !isValidUUID(containerId)) {
    errors.push("Container is required");
  }
  const category = getString(formData, "category");
  if (!category) {
    errors.push("Category is required");
  }
  if (errors.length > 0) {
    redirect(`/items/add?error=${encodeURIComponent(errors.join("$,$"))}`);
  }

  let categoryId: string = category;
  if (!isValidUUID(categoryId)) {
    const { id, error: categoryError } = await getItemCategoryId(category, userId, supabase);
    if (categoryError) {
      redirect(`/items/add?error=${encodeURIComponent(categoryError)}`);
    }
    categoryId = id;
  }

  const quantity = getNumber(formData, "quantity", 1);
  const unitCost = getNumber(formData, "unitCost");
  const notes = getString(formData, "notes");
  const purchaseDate = getOptionalDate(formData, "purchaseDate");
  const warrantyExpiry = getOptionalDate(formData, "warrantyExpiry");

  const supabaseClient = await supabase;
  const { data, error: insertError } = await supabaseClient
    .from("items")
    .insert({
      owner_user_id: userId,
      container_id: containerId,
      name,
      category: categoryId,
      notes: notes,
      quantity,
      unit_cost: unitCost,
      purchase_date: purchaseDate,
      item_attributes: withWarrantyExpiry({}, warrantyExpiry)
      // created_by: user.id,
      // updated_by: user.id
    })
    .select("id")
    .single();

  if (insertError) {
    redirect(`/items/add?error=${encodeURIComponent(insertError.message)}`);
  }

  revalidatePath("/");
  revalidatePath(`/containers/${containerId}`);
  revalidatePath("/search");
  redirect(`/items/${data.id}?success=Item created`);
}

export async function updateItem(formData: FormData) {
  const supabase = createClient();
  const userId = await getUserId(supabase);
  if (!userId) {
    redirect("/sign-in");
  }
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
  const tags = getStringArray(formData, "tags");

  const supabaseClient = await supabase;
  const { data: current, error: currentError } = await supabaseClient.from("items").select("item_attributes").eq("id", id).eq("owner_user_id", userId).single();

  if (currentError) {
    redirect(`/items/${id}?error=${encodeURIComponent(currentError.message)}`);
  }

  const { error } = await supabaseClient
    .from("items")
    .update({
      name: name || undefined,
      category: category || null,
      quantity,
      unit_cost: unitCost,
      purchase_date: purchaseDate,
      tags: tags.length > 0 ? tags : null,
      item_attributes: withWarrantyExpiry(current.item_attributes as Record<string, any> | null, warrantyExpiry),
      notes: notes || null,
      updated_by: userId
    })
    .eq("id", id)
    .eq("owner_user_id", userId);

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
    .select("container_id, name, category, quantity, unit_cost, purchase_date, notes, item_attributes")
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
      notes: original.notes,
      item_attributes: original.item_attributes,
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
  const oldTypeName = getString(formData, "oldTypeName");
  const newTypeName = getString(formData, "newTypeName");
  const typeIds = getStringArray(formData, "typeId");
  const typeDescription = getString(formData, "typeDescription");
  if (!oldTypeName || !newTypeName) redirect("/containers/types?error=Both old and new type names are required");

  const { error } = await supabase.from("container_types").update({ name: newTypeName, description: typeDescription }).in("id", typeIds);

  if (error) redirect(`/containers/types?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/");
  revalidatePath("/containers");
  revalidatePath("/containers/types");
  redirect("/containers/types?success=Type saved");
}

export async function createContainerType(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = getString(formData, "name");
  const description = getString(formData, "description");
  if (!name) redirect("/containers/types?error=Type name is required");

  const { error } = await supabase.from("container_types").insert({
    name,
    description,
    owner_user_id: user.id,
    created_by: user.id,
    updated_by: user.id
  });

  if (error) {
    const message = error.code === "23505" ? "A container type with this name already exists" : error.message;
    redirect(`/containers/types?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/");
  revalidatePath("/containers");
  revalidatePath("/containers/types");
  redirect("/containers/types?success=Type created");
}

export async function renameItemCategory(formData: FormData) {
  const { supabase, user } = await requireUser();
  const oldCategory = getString(formData, "oldCategory");
  const newCategory = getString(formData, "newCategory");
  const categoryDescription = getString(formData, "categoryDescription");
  const categoryIds = getStringArray(formData, "categoryId");
  if (!oldCategory || !newCategory) redirect("/items/categories?error=Both old and new category names are required");

  const { error } = await supabase
    .from("item_categories")
    .update({ name: newCategory, description: categoryDescription, updated_by: user.id })
    .in("id", categoryIds)
    .eq("owner_user_id", user.id);

  if (error) {
    const message = error.code === "23505" ? "An item category with this name already exists" : error.message;
    redirect(`/items/categories?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/items/categories");
  redirect("/items/categories?success=Category saved");
}

export async function createItemCategory(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = getString(formData, "name");
  const description = getString(formData, "description");
  if (!name) redirect("/items/categories?error=Category name is required");

  const { error } = await supabase.from("item_categories").insert({
    name,
    description,
    owner_user_id: user.id,
    created_by: user.id,
    updated_by: user.id
  });

  if (error) {
    const message = error.code === "23505" ? "An item category with this name already exists" : error.message;
    redirect(`/items/categories?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/items/categories");
  redirect("/items/categories?success=Category created");
}
