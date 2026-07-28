import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CONFIG } from "./config.js";

export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// Trae todos los bloques activos del canvas (paginado simple para canvas grandes)
export async function fetchAllBlocks() {
  const pageSize = 1000;
  let from = 0;
  let all = [];
  while (true) {
    const { data, error } = await supabase
      .from("blocks")
      .select("*")
      .eq("deleted", false)
      .range(from, from + pageSize - 1);

    if (error) throw error;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

// Se suscribe a cambios en tiempo real de la tabla blocks
export function subscribeToBlocks(onInsert, onUpdate, onDelete) {
  return supabase
    .channel("blocks-realtime")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "blocks" }, (payload) =>
      onInsert?.(payload.new)
    )
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "blocks" }, (payload) =>
      onUpdate?.(payload.new)
    )
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "blocks" }, (payload) =>
      onDelete?.(payload.old)
    )
    .subscribe();
}

// Presencia: usuarios conectados ahora mismo
export async function fetchPresence() {
  const { data, error } = await supabase.from("presence").select("*");
  if (error) throw error;
  return data;
}

export function subscribeToPresence(onChange) {
  return supabase
    .channel("presence-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "presence" }, () => onChange?.())
    .subscribe();
}
