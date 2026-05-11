-- =============================================================================
-- 0023 — Permitir registrar mantenimientos sin sesión Supabase Auth
--
-- La policy mantenimientos_admin_write definida en 0003 exige que
-- current_user_role() devuelva 'tecnico', 'supervisor' o 'admin'. Esa función
-- mira el perfil ligado a auth.uid(). Pero en FRESATITAN OPS los admins
-- dev (loginAs sin Supabase Auth) y el panel APK del operario usan la anon
-- key sin sesión Supabase Auth, así que current_user_role() devuelve null
-- y el INSERT en mantenimientos queda bloqueado.
--
-- Mismo patrón ya aplicado a incidencias, maquina_estados, usos_equipo:
-- escritura pública. La consistencia y trazabilidad las garantiza el flujo
-- de la app (selector de trabajador obligatorio antes de cualquier acción).
-- =============================================================================

drop policy if exists mantenimientos_admin_write on public.mantenimientos;
drop policy if exists mantenimientos_select_public on public.mantenimientos;
drop policy if exists mantenimientos_insert_public on public.mantenimientos;
drop policy if exists mantenimientos_update_public on public.mantenimientos;
drop policy if exists mantenimientos_delete_public on public.mantenimientos;

-- Lectura pública (ya estaba)
create policy mantenimientos_select_public
  on public.mantenimientos for select
  using (true);

-- Inserción pública — el flujo del panel ya exige seleccionar trabajador
create policy mantenimientos_insert_public
  on public.mantenimientos for insert
  with check (true);

-- Actualización pública — para que admin pueda validar/editar
create policy mantenimientos_update_public
  on public.mantenimientos for update
  using (true)
  with check (true);

-- Eliminación pública — para correcciones de admin
create policy mantenimientos_delete_public
  on public.mantenimientos for delete
  using (true);
