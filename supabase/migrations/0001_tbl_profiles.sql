CREATE TABLE IF NOT EXISTS public.tbl_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL DEFAULT 'Student',
  avatar_url text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tbl_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tbl_profiles_owner_all" ON public.tbl_profiles;
CREATE POLICY "tbl_profiles_owner_all" ON public.tbl_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS tbl_profiles_snapshot_updated_at_idx
  ON public.tbl_profiles (snapshot_updated_at DESC);

-- Data API exposure: authenticated role only; anon revoked (defense in depth over RLS).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tbl_profiles TO authenticated;
REVOKE ALL ON public.tbl_profiles FROM anon;
