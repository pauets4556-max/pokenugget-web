import { supabase } from "./supabaseClient";

export async function uploadImage(file, folder) {
  const ext = file.name.split(".").pop();
  const randomName = Math.random().toString(36).slice(2) + Date.now();
  const path = `${folder}/${randomName}.${ext}`;

  const { error } = await supabase.storage.from("images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return data.publicUrl;
}
