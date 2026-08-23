-- Memory Holder — demo diary for testing the app with real volume.
--
-- Creates a diary with 8 categories and 125 memories spread over four years,
-- attached to an existing account. Run it from the Supabase SQL Editor, which
-- connects as a superuser and therefore bypasses RLS.
--
-- USE A DEDICATED TEST ACCOUNT, NOT YOUR REAL ONE. Sign up a second account in
-- the app (say demo@example.com) and point this at that. Two reasons:
--   1. 125 fake memories mixed into your real diary is a mess to unpick — the
--      seeded rows aren't tagged, so there's no clean way to delete just them.
--   2. Cleanup then becomes one line: delete the couple, and the categories
--      and memories cascade away with it. See the block at the bottom.
--
-- WHY IT NEEDS AN EXISTING ACCOUNT: the app's create_couple() function reads
-- auth.uid(), which is null outside a real session, so it can't be called from
-- here. Signing up through the app gets the password hashing, the identity row
-- and the profile trigger right — all fiddly to reproduce in raw SQL.
--
-- The script refuses to run if the account already has a diary, so it can't
-- silently double your data or leave you in two diaries at once (the app picks
-- one arbitrarily in that case).
--
-- NOTE ON PHOTOS: this seeds no media rows. A media row is just a pointer to a
-- file in Storage, so seeding one without uploading the file would only give
-- you broken images. Upload a handful by hand to test the gallery.

do $$
declare
  -- ↓↓↓ THE ONE LINE YOU MUST CHANGE ↓↓↓
  v_email      text := 'example@example.com';

  v_memories   int  := 120;   -- how many memories to create

  v_user_id    uuid;
  v_couple_id  uuid;
  v_code       text;
  v_attempts   int := 0;
  v_created    int;

  v_titles text[] := array[
    'Primer día esquiando', 'Primer aniversario', 'Primer viaje juntos',
    'Cena que salió mal', 'Concierto bajo la lluvia', 'Mudanza al piso nuevo',
    'Ruta por la montaña', 'Cumpleaños sorpresa', 'Fin de semana en la playa',
    'Maratón de series', 'Comida con la familia', 'Escapada rural',
    'Día de museos', 'Partido inolvidable', 'Nochevieja en casa',
    'Excursión en bici', 'Tarde de cocina', 'Picnic en el parque'
  ];

  v_descriptions text[] := array[
    'Nos caímos más de lo que avanzamos, pero volveríamos mañana.',
    'No salió como lo habíamos planeado y por eso lo recordamos.',
    'Se nos acabó la batería del móvil y tiramos de mapa de papel.',
    'Quemamos la comida dos veces antes de acertar a la tercera.',
    'Acabamos empapados y muertos de risa.',
    '',
    'Uno de esos días normales que luego resultan ser los importantes.'
  ];
begin
  ---------------------------------------------------------------------------
  -- 1. Find the account
  ---------------------------------------------------------------------------
  select id into v_user_id from auth.users where email = v_email;

  if v_user_id is null then
    raise exception
      'No account found for %. Sign up in the app first, then set v_email above.', v_email;
  end if;

  ---------------------------------------------------------------------------
  -- 2. Refuse to touch an account that already has a diary
  --
  -- Running twice would otherwise double everything, and seeding into a real
  -- diary leaves fake memories tangled up with genuine ones.
  ---------------------------------------------------------------------------
  select couple_id into v_couple_id
  from public.couple_members
  where user_id = v_user_id
  limit 1;

  if v_couple_id is not null then
    raise exception
      '% already belongs to diary %. Use a fresh test account, or run the cleanup block at the bottom of this file first.',
      v_email, v_couple_id;
  end if;

  ---------------------------------------------------------------------------
  -- 3. Create the diary (mirrors what create_couple() does in the app)
  ---------------------------------------------------------------------------
  loop
    v_code := 'MH-' || upper(substr(md5(random()::text), 1, 4))
                    || '-' || upper(substr(md5(random()::text), 1, 4));
    v_attempts := v_attempts + 1;
    exit when not exists (select 1 from public.couples where invite_code = v_code)
           or v_attempts > 10;
  end loop;

  insert into public.couples (name, invite_code, created_by)
  values ('Diario de prueba', v_code, v_user_id)
  returning id into v_couple_id;

  insert into public.couple_members (couple_id, user_id, role)
  values (v_couple_id, v_user_id, 'owner');

  raise notice 'Created diary % with invite code %', v_couple_id, v_code;

  ---------------------------------------------------------------------------
  -- 4. Categories
  ---------------------------------------------------------------------------
  insert into public.categories (couple_id, name, color, icon, position) values
    (v_couple_id, 'Viajes',     '#3A5B8C', 'plane',    1),
    (v_couple_id, 'Deportes',   '#C8452F', 'run',      2),
    (v_couple_id, 'Trabajo',    '#6E6330', 'briefcase',3),
    (v_couple_id, 'Estudios',   '#3A5B8C', 'book',     4),
    (v_couple_id, 'Aficiones',  '#C8452F', 'sparkle',  5),
    (v_couple_id, 'Comidas',    '#6E6330', 'bowl',     6),
    (v_couple_id, 'Familia',    '#3A5B8C', 'heart',    7),
    (v_couple_id, 'Días importantes', '#C8452F', 'star', 8);

  ---------------------------------------------------------------------------
  -- 5. Memories
  --    Every 9th has no category, so the "Uncategorized" folder has content.
  --    Every 5th shows in the roulette; every 7th is kept off the timeline,
  --    so the two views don't hold identical sets.
  ---------------------------------------------------------------------------
  with cats as (
    select id, (row_number() over (order by position)) - 1 as idx
    from public.categories
    where couple_id = v_couple_id
  ),
  numbered as (
    select
      i,
      (select count(*) from cats) as cat_count
    from generate_series(1, v_memories) as i
  )
  insert into public.memories (
    couple_id, category_id, title, description, body, memory_date,
    show_in_timeline, show_in_ruleta, created_by
  )
  select
    v_couple_id,
    case when n.i % 9 = 0
         then null
         else (select c.id from cats c where c.idx = n.i % n.cat_count)
    end,
    v_titles[1 + (n.i % array_length(v_titles, 1))] || ' #' || n.i,
    v_descriptions[1 + (n.i % array_length(v_descriptions, 1))],
    -- Every third memory gets a long-form entry, so the memory page can be
    -- tested both with and without one.
    case when n.i % 3 = 0
         then repeat('Escribimos aquí lo que pasó ese día, con calma y sin prisa. ', 6)
              || E'

' || repeat('Un segundo párrafo, para comprobar que los saltos de línea se respetan. ', 4)
         else ''
    end,
    date '2021-01-05' + (n.i * 11),
    n.i % 7 <> 0,
    n.i % 5 = 0,
    v_user_id
  from numbered n;

  get diagnostics v_created = row_count;

  ---------------------------------------------------------------------------
  -- 6. A few deliberate edge cases, to see how the layout copes
  ---------------------------------------------------------------------------
  insert into public.memories (
    couple_id, category_id, title, description, body, memory_date,
    show_in_timeline, show_in_ruleta, created_by
  ) values
    -- 70 characters: the cap the admin form enforces on new titles. Existing
    -- rows can be longer, which is what the CSS clamp is there to survive.
    (v_couple_id, null,
     'Un título de exactamente setenta caracteres para probar el tope justo',
     'Título en el límite.', '', date '2024-06-01', true, true, v_user_id),
    (v_couple_id, null,
     'Un título deliberadamente larguísimo, más largo que el tope del formulario, para comprobar que el recorte aguanta',
     'Título por encima del tope.', '', date '2024-06-05', true, true, v_user_id),
    (v_couple_id, null, 'Sin descripción', '', '', date '2024-07-15', true, false, v_user_id),
    (v_couple_id, null, 'Descripción muy larga',
     repeat('Texto de relleno para ver cómo se comporta el recorte a tres líneas en la tarjeta. ', 8),
     '', date '2024-08-20', true, true, v_user_id),
    (v_couple_id, null, 'Día 中文 y acentos áéíóú', 'Comprobando caracteres no latinos.',
     repeat('正文测试。', 40), date '2024-09-10', true, false, v_user_id);

  raise notice 'Done: % categories, % memories (+5 edge cases).', 8, v_created;
end $$;

-- ---------------------------------------------------------------------------
-- CLEANUP — removes the demo diary and everything in it.
--
-- Deleting the couple cascades to its categories and memories, so this is
-- exact: it can't touch any other diary. Change the email, uncomment, run.
-- The account itself stays, so you can re-seed it afterwards.
-- ---------------------------------------------------------------------------
-- delete from public.couples
-- where id in (
--   select cm.couple_id
--   from public.couple_members cm
--   join auth.users u on u.id = cm.user_id
--   where u.email = 'demo@example.com'
-- );
