// Configuración pública del frontend.
// La SUPABASE_ANON_KEY es pública por diseño (protegida por RLS en el servidor),
// NUNCA pongas aquí la service_role key.

export const CONFIG = {
  SITE_NAME: "Geometry Place",
  WORKER_URL: "http://localhost:8787", // URL de tu Worker desplegado en producción
  SUPABASE_URL: "https://TU-PROYECTO.supabase.co",
  SUPABASE_ANON_KEY: "TU_ANON_KEY_PUBLICA",

  // Rutas de assets (relativas a la raíz del sitio)
  LOGO_PATH: "/assets/logo/Geometry Place.png",
  BACKGROUND_PATH: "/assets/background/initial-bg.jpg",
  FONTS_PATH: "/assets/fonts/",
  ICONS_PATH: "/assets/gd-imgs/",
  NUMBERS_PATH: "/assets/countdown/", // img_0.png ... img_200.png
  OBJECTS_PATH: "/assets/gd-imgs/objects/",
};
