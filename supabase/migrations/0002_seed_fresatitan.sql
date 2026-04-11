-- =============================================================================
-- SEED — 12 máquinas reales + 8 perfiles reales de FRESATITAN, S.L.
-- =============================================================================

-- Perfiles (sin user_id — se vincularán a auth.users al crear las cuentas)
-- Roser: admin de supervisión (puede_operar=false, solo dashboard).
-- Toni: admin que también opera máquinas (aparece en los CSVs reales).
insert into profiles (nombre, apellidos, role, activo, puede_operar) values
  ('Toni',    '', 'admin',   true, true),
  ('Roser',   '', 'admin',   true, false),
  ('Gerard',  '', 'tecnico', true, true),
  ('Pol',     '', 'tecnico', true, true),
  ('Oscar',   '', 'tecnico', true, true),
  ('Albert',  '', 'tecnico', true, true),
  ('Andrea',  '', 'tecnico', true, true),
  ('Rosalia', '', 'tecnico', true, true);

-- Máquinas — ref y requiere_lanzamiento derivados de los CSVs reales
insert into maquinas (codigo, nombre, tipo, requiere_lanzamiento, activa, ubicacion) values
  -- Fresadoras sin lanzamiento (arrancan desde el software)
  ('REF-030', 'Fresadora UP3D ZR',              'fresadora',   false, true,  'Zona CAD-CAM'),
  ('REF-057', 'Fresadora P53 ZR',               'fresadora',   false, true,  'Zona CAD-CAM'),
  ('REF-062', 'Fresadora UP3D Disilicato',      'fresadora',   false, true,  'Zona CAD-CAM'),

  -- Fresadoras CNC tradicionales con lanzamiento manual
  ('REF-039', 'Fresadora CM Fanuc 1',           'fresadora',   true,  true,  'Zona CNC'),
  ('REF-040', 'Fresadora CM Fanuc 2',           'fresadora',   true,  true,  'Zona CNC'),
  ('REF-042', 'Fresadora Biomill',              'fresadora',   true,  true,  'Zona CNC'),

  -- Fresadora retirada (visible en histórico pero no operativa)
  ('REF-041', 'Fresadora CM Lilian',            'fresadora',   true,  false, 'Zona CNC'),

  -- Sinterizadoras (ninguna requiere lanzamiento)
  ('REF-045', 'Sinterizadora Trumpf Multilaser','sinterizadora', false, true, 'Zona Sinter.'),
  ('REF-046', 'Sinterizadora Trumpf 3D Laser',  'sinterizadora', false, true, 'Zona Sinter.'),
  ('REF-047', 'Sinterizadora Trumpf',           'sinterizadora', false, true, 'Zona Sinter.'),
  ('REF-048', 'Sinterizadora Sisma 1',          'sinterizadora', false, true, 'Zona Sinter.'),
  ('REF-049', 'Sinterizadora Sisma 2',          'sinterizadora', false, true, 'Zona Sinter.');

-- Marcar la Lilian como inactiva
update maquinas set estado_actual = 'inactiva' where codigo = 'REF-041';
