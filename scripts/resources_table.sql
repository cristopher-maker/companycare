-- ============================================================
-- RECURSOS: tabla + storage bucket + RLS
-- Proyecto: ddysqiaeojmlziesndgh
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- 1. Tabla principal de recursos
DROP TABLE IF EXISTS public.resources CASCADE;

CREATE TABLE public.resources (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  summary       TEXT NOT NULL DEFAULT '',
  category      TEXT NOT NULL CHECK (category IN ('Opciones de cuidado', 'Financiación', 'Checklist', 'Guías prácticas')),
  resource_type TEXT NOT NULL DEFAULT 'article' CHECK (resource_type IN ('article', 'pdf', 'video')),
  content       JSONB DEFAULT '[]'::jsonb,   -- array de {heading, body, bullets[]}
  file_url      TEXT,                        -- URL pública del PDF en Storage
  video_url     TEXT,                        -- URL YouTube / Vimeo
  read_time_min INT DEFAULT 5,
  is_priority   BOOLEAN NOT NULL DEFAULT FALSE,
  is_published  BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order    INT DEFAULT 0,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Trigger para updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS resources_updated_at ON public.resources;
CREATE TRIGGER resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Índices
CREATE INDEX IF NOT EXISTS resources_category_idx  ON public.resources (category);
CREATE INDEX IF NOT EXISTS resources_published_idx ON public.resources (is_published);
CREATE INDEX IF NOT EXISTS resources_type_idx      ON public.resources (resource_type);

-- 4. RLS
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer recursos publicados
CREATE POLICY "resources_read_published"
  ON public.resources FOR SELECT
  TO authenticated
  USING (is_published = TRUE);

-- Solo admins internos (role = 'admin' en profiles) pueden gestionar recursos
CREATE POLICY "resources_admin_all"
  ON public.resources FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Storage bucket para PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resources-files',
  'resources-files',
  TRUE,
  20971520,  -- 20 MB máximo por archivo
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Política de storage: lectura pública
CREATE POLICY "resources_files_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'resources-files');

-- Política de storage: solo admins pueden subir/borrar
CREATE POLICY "resources_files_admin_write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'resources-files'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "resources_files_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'resources-files'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

