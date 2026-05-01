-- 014_typst.sql
-- Remove tex_binary_path from settings (Typst binary is now bundled)

ALTER TABLE settings DROP COLUMN tex_binary_path;
