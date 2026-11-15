-- =====================================================================
-- Rural69 · Datos iniciales (opcional pero recomendado)
-- Lista maestra de la compra para un grupo de referencia de 15 personas.
-- Todo es editable después desde la propia aplicación.
-- Ejecutar DESPUÉS de 01_schema.sql y 02_rls.sql
-- =====================================================================

insert into public.master_items (name, category, qty, unit, base_people, notes, sort_order) values
  -- Desayunos
  ('Café molido',               'Desayunos',      1,   'paquete', 15, null, 10),
  ('Leche',                     'Desayunos',      9,   'l',       15, 'Brick de litro', 20),
  ('Colacao / cacao soluble',   'Desayunos',      1,   'paquete', 15, 'Para los niños', 30),
  ('Pan de molde',              'Desayunos',      2,   'paquete', 15, null, 40),
  ('Magdalenas / bollería',     'Desayunos',      2,   'paquete', 15, null, 50),
  ('Mantequilla',               'Desayunos',      1,   'ud',      15, null, 60),
  ('Mermelada',                 'Desayunos',      2,   'ud',      15, null, 70),
  ('Cereales',                  'Desayunos',      2,   'paquete', 15, null, 80),
  ('Zumo de naranja',           'Desayunos',      4,   'l',       15, null, 90),
  ('Azúcar',                    'Desayunos',      1,   'kg',      15, null, 100),
  -- Aperitivos
  ('Patatas fritas',            'Aperitivos',     4,   'bolsa',   15, null, 110),
  ('Aceitunas',                 'Aperitivos',     3,   'ud',      15, null, 120),
  ('Frutos secos',              'Aperitivos',     1,   'kg',      15, null, 130),
  ('Jamón serrano',             'Aperitivos',     0.5, 'kg',      15, 'Cortado en sobres', 140),
  ('Queso curado',              'Aperitivos',     1,   'kg',      15, null, 150),
  ('Chorizo / salchichón',      'Aperitivos',     0.8, 'kg',      15, null, 160),
  ('Picos / regañás',           'Aperitivos',     2,   'paquete', 15, null, 170),
  ('Paté',                      'Aperitivos',     3,   'ud',      15, null, 180),
  -- Comidas
  ('Arroz',                     'Comidas',        2,   'kg',      15, 'Para paella o arroz al horno', 190),
  ('Pasta',                     'Comidas',        2,   'kg',      15, null, 200),
  ('Tomate frito',              'Comidas',        3,   'ud',      15, null, 210),
  ('Legumbres cocidas',         'Comidas',        4,   'bote',    15, null, 220),
  ('Caldo de pollo',            'Comidas',        2,   'l',       15, null, 230),
  ('Atún en lata',              'Comidas',        6,   'lata',    15, null, 240),
  ('Pan',                       'Comidas',        6,   'barra',   15, 'Comprar cada día si se puede', 250),
  -- Cenas
  ('Huevos',                    'Cenas',          3,   'docena',  15, null, 260),
  ('Patatas',                   'Cenas',          5,   'kg',      15, null, 270),
  ('Pizza congelada',           'Cenas',          4,   'ud',      15, 'Plan B para los niños', 280),
  ('Croquetas / precocinado',   'Cenas',          2,   'paquete', 15, null, 290),
  -- Bebidas
  ('Agua mineral',              'Bebidas',        18,  'l',       15, 'Garrafas de 5 l', 300),
  ('Cerveza',                   'Bebidas',        48,  'lata',    15, null, 310),
  ('Vino tinto',                'Bebidas',        6,   'botella', 15, null, 320),
  ('Vino blanco / rosado',      'Bebidas',        4,   'botella', 15, null, 330),
  ('Refrescos de cola',         'Bebidas',        18,  'lata',    15, null, 340),
  ('Refrescos de naranja/limón','Bebidas',        12,  'lata',    15, null, 350),
  ('Tónica',                    'Bebidas',        6,   'botella', 15, null, 360),
  ('Ginebra',                   'Bebidas',        1,   'botella', 15, null, 370),
  ('Hielo',                     'Bebidas',        4,   'bolsa',   15, null, 380),
  -- Postres
  ('Yogures',                   'Postres',        2,   'paquete', 15, null, 390),
  ('Natillas / flanes',         'Postres',        12,  'ud',      15, null, 400),
  ('Helado',                    'Postres',        2,   'ud',      15, null, 410),
  ('Chocolate',                 'Postres',        3,   'tableta', 15, null, 420),
  -- Fruta
  ('Plátanos',                  'Fruta',          2,   'kg',      15, null, 430),
  ('Manzanas',                  'Fruta',          2,   'kg',      15, null, 440),
  ('Naranjas',                  'Fruta',          3,   'kg',      15, null, 450),
  ('Fruta de temporada',        'Fruta',          3,   'kg',      15, null, 460),
  -- Verduras
  ('Tomates',                   'Verduras',       2,   'kg',      15, null, 470),
  ('Lechuga',                   'Verduras',       3,   'ud',      15, null, 480),
  ('Cebollas',                  'Verduras',       1.5, 'kg',      15, null, 490),
  ('Ajos',                      'Verduras',       1,   'ud',      15, 'Cabeza o malla', 500),
  ('Pimientos',                 'Verduras',       1,   'kg',      15, null, 510),
  ('Champiñones',               'Verduras',       0.5, 'kg',      15, null, 520),
  -- Carne y pescado
  ('Chuletas / costillas',      'Carne y pescado',4,   'kg',      15, 'Para la barbacoa', 530),
  ('Chorizos y morcillas',      'Carne y pescado',2,   'kg',      15, 'Para la barbacoa', 540),
  ('Panceta',                   'Carne y pescado',1.5, 'kg',      15, 'Para la barbacoa', 550),
  ('Pollo',                     'Carne y pescado',3,   'kg',      15, null, 560),
  ('Carne picada',              'Carne y pescado',1.5, 'kg',      15, null, 570),
  ('Gambas / langostinos',      'Carne y pescado',1.5, 'kg',      15, null, 580),
  ('Pescado para el horno',     'Carne y pescado',2,   'kg',      15, null, 590),
  -- Limpieza
  ('Papel higiénico',           'Limpieza',       12,  'rollo',   15, null, 600),
  ('Papel de cocina',           'Limpieza',       4,   'rollo',   15, null, 610),
  ('Bolsas de basura',          'Limpieza',       1,   'paquete', 15, null, 620),
  ('Lavavajillas a mano',       'Limpieza',       1,   'ud',      15, null, 630),
  ('Estropajos',                'Limpieza',       2,   'ud',      15, null, 640),
  ('Servilletas',               'Limpieza',       2,   'paquete', 15, null, 650),
  ('Pastillas lavavajillas',    'Limpieza',       1,   'paquete', 15, null, 660),
  -- Otros
  ('Aceite de oliva',           'Otros',          3,   'l',       15, null, 670),
  ('Sal',                       'Otros',          1,   'paquete', 15, null, 680),
  ('Vinagre',                   'Otros',          1,   'botella', 15, null, 690),
  ('Especias / pimentón',       'Otros',          1,   'ud',      15, null, 700),
  ('Pastillas de encender',     'Otros',          1,   'paquete', 15, 'Para la barbacoa', 710),
  ('Carbón / leña',             'Otros',          2,   'bolsa',   15, 'Para la barbacoa', 720),
  ('Papel de aluminio',         'Otros',          1,   'ud',      15, null, 730),
  ('Vasos y platos de usar',    'Otros',          1,   'paquete', 15, null, 740)
on conflict do nothing;
