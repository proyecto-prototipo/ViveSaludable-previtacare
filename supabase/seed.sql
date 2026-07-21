-- ViveSaludable | Datos iniciales
-- Ejecutar después de las migraciones. Para el usuario admin, primero crea un usuario en Auth y luego actualiza su perfil con el SQL indicado en README.

insert into public.rapid_tests (name, description, price, includes_igv, stock, is_active, is_main_test, is_complementary_product, sample_type, result_time, conditions) values
('Dengue PACK', 'Prueba recomendada ante síntomas compatibles con dengue o sospecha de infección.', 401, true, 30, true, true, false, 'Sangre', '15-20 minutos', 'Orientación preventiva ante fiebre y síntomas compatibles.'),
('Helicobacter Pylori', 'Prueba recomendada ante molestias digestivas recurrentes.', 41, true, 50, true, true, false, 'Sangre / heces según kit', '10-15 minutos', 'Orientación preventiva digestiva.'),
('Hierro / Ferritina', 'Prueba recomendada ante fatiga, palidez, mareos o sospecha de deficiencia de hierro.', 42, true, 45, true, true, false, 'Sangre', '10-15 minutos', 'Orientación preventiva de deficiencia de hierro.'),
('Optifer F', 'Producto complementario, no prueba rápida. Sugerencia informativa en casos asociados a riesgo de anemia.', 32, true, 80, true, false, true, 'No aplica', 'No aplica', 'No debe aparecer en ranking principal.'),
('Salud Intestinal / FOB', 'Prueba recomendada para tamizaje preventivo de sangre oculta en heces.', 40, true, 35, true, true, false, 'Heces', '5-10 minutos', 'Orientación preventiva intestinal.'),
('Salud Prostática / PSA', 'Prueba orientada a prevención y monitoreo prostático.', 63, true, 35, true, true, false, 'Sangre', '10-15 minutos', 'Orientación preventiva prostática.'),
('Salud Renal / MAU', 'Prueba recomendada ante riesgo renal, hipertensión, diabetes o antecedentes relacionados.', 47, true, 40, true, true, false, 'Orina', '5-10 minutos', 'Orientación preventiva renal.'),
('Tiroides / TSH', 'Prueba recomendada ante síntomas compatibles con alteración tiroidea.', 40, true, 35, true, true, false, 'Sangre', '10-15 minutos', 'Orientación preventiva tiroidea.'),
('UTI', 'Prueba recomendada ante síntomas urinarios compatibles con infección del tracto urinario.', 50, true, 55, true, true, false, 'Orina', '5-10 minutos', 'Orientación preventiva urinaria.'),
('Vitamina D', 'Prueba recomendada ante baja exposición solar, fatiga, dolor muscular o factores de riesgo.', 45, true, 60, true, true, false, 'Sangre', '10-15 minutos', 'Orientación preventiva de vitamina D.')
on conflict (name) do update set description = excluded.description, price = excluded.price, stock = excluded.stock, is_active = excluded.is_active, is_main_test = excluded.is_main_test, is_complementary_product = excluded.is_complementary_product;

do $$
declare
  q_general uuid;
  q_fiebre uuid;
  q_digestivo uuid; 
  q_fatiga uuid;
  q_intestinal uuid;
  q_prostata uuid;
  q_renal uuid;
  q_tiroides uuid;
  q_urinario uuid;
  q_vitd uuid;
  q_riesgos uuid;
  opt uuid;
begin
  insert into public.questions (section, question_text, question_type, is_required, is_active, order_index)
  values ('sintomas', '¿Presentas alguna señal general de alerta?', 'multiple', false, true, 10)
  returning id into q_general;
  insert into public.question_options (question_id, label, value, order_index) values
    (q_general, 'Dolor intenso', 'dolor_intenso', 1),
    (q_general, 'Síntomas persistentes o que empeoran', 'persistente_empeora', 2),
    (q_general, 'Preocupación significativa por mi estado', 'preocupacion', 3);

  insert into public.questions (section, question_text, question_type, is_required, is_active, order_index)
  values ('sintomas', 'Síntomas compatibles con dengue', 'multiple', false, true, 20)
  returning id into q_fiebre;
  insert into public.question_options (question_id, label, value, order_index) values
    (q_fiebre, 'Fiebre reciente', 'fiebre_reciente', 1),
    (q_fiebre, 'Dolor muscular o articular', 'dolor_muscular_articular', 2),
    (q_fiebre, 'Dolor detrás de los ojos', 'dolor_ojos', 3),
    (q_fiebre, 'Náuseas o vómitos', 'nauseas_vomitos', 4),
    (q_fiebre, 'Sarpullido o malestar general fuerte', 'sarpullido_malestar', 5),
    (q_fiebre, 'Sangrado, dolor abdominal fuerte o vómitos persistentes', 'alarma_dengue', 6);

  insert into public.questions (section, question_text, question_type, is_required, is_active, order_index)
  values ('sintomas', 'Molestias digestivas', 'multiple', false, true, 30)
  returning id into q_digestivo;
  insert into public.question_options (question_id, label, value, order_index) values
    (q_digestivo, 'Ardor estomacal o acidez frecuente', 'ardor_acidez', 1),
    (q_digestivo, 'Náuseas, gases o eructos frecuentes', 'gases_eructos', 2),
    (q_digestivo, 'Dolor abdominal alto', 'dolor_abdominal_alto', 3),
    (q_digestivo, 'Antecedente de gastritis o úlcera', 'gastritis_ulcera', 4);

  insert into public.questions (section, question_text, question_type, is_required, is_active, order_index)
  values ('sintomas', 'Síntomas asociados a hierro o ferritina', 'multiple', false, true, 40)
  returning id into q_fatiga;
  insert into public.question_options (question_id, label, value, order_index) values
    (q_fatiga, 'Cansancio frecuente', 'cansancio', 1),
    (q_fatiga, 'Palidez o debilidad', 'palidez_debilidad', 2),
    (q_fatiga, 'Mareos o falta de aire al esfuerzo', 'mareos_aire', 3),
    (q_fatiga, 'Caída de cabello o uñas frágiles', 'cabello_unas', 4);

  insert into public.questions (section, question_text, question_type, is_required, is_active, order_index)
  values ('sintomas', 'Síntomas intestinales', 'multiple', false, true, 50)
  returning id into q_intestinal;
  insert into public.question_options (question_id, label, value, order_index) values
    (q_intestinal, 'Sangre visible o sospechada en heces', 'sangre_heces', 1),
    (q_intestinal, 'Cambios persistentes en hábito intestinal', 'cambios_intestinales', 2),
    (q_intestinal, 'Dolor abdominal persistente', 'dolor_abdominal_persistente', 3),
    (q_intestinal, 'Pérdida de peso sin causa clara', 'perdida_peso', 4);

  insert into public.questions (section, question_text, question_type, is_required, is_active, order_index)
  values ('sintomas', 'Síntomas prostáticos', 'multiple', false, true, 60)
  returning id into q_prostata;
  insert into public.question_options (question_id, label, value, order_index) values
    (q_prostata, 'Dificultad para orinar o chorro débil', 'chorro_debil', 1),
    (q_prostata, 'Orinar con mucha frecuencia o de noche', 'frecuencia_noche', 2),
    (q_prostata, 'Vaciado incompleto o molestia pélvica', 'vaciado_molestia', 3);

  insert into public.questions (section, question_text, question_type, is_required, is_active, order_index)
  values ('sintomas', 'Riesgo renal', 'multiple', false, true, 70)
  returning id into q_renal;
  insert into public.question_options (question_id, label, value, order_index) values
    (q_renal, 'Hipertensión o presión alta', 'hipertension', 1),
    (q_renal, 'Diabetes', 'diabetes', 2),
    (q_renal, 'Orina espumosa o cambios urinarios', 'orina_espumosa', 3),
    (q_renal, 'Hinchazón de pies o tobillos', 'hinchazon', 4);

  insert into public.questions (section, question_text, question_type, is_required, is_active, order_index)
  values ('sintomas', 'Síntomas compatibles con tiroides', 'multiple', false, true, 80)
  returning id into q_tiroides;
  insert into public.question_options (question_id, label, value, order_index) values
    (q_tiroides, 'Aumento de peso inexplicado', 'aumento_peso', 1),
    (q_tiroides, 'Frío frecuente, piel seca o somnolencia', 'frio_piel_somnolencia', 2),
    (q_tiroides, 'Caída de cabello, estreñimiento o cambios de ánimo', 'cabello_estrenimiento_animo', 3),
    (q_tiroides, 'Irregularidad menstrual', 'irregularidad_menstrual', 4);

  insert into public.questions (section, question_text, question_type, is_required, is_active, order_index)
  values ('sintomas', 'Síntomas urinarios', 'multiple', false, true, 90)
  returning id into q_urinario;
  insert into public.question_options (question_id, label, value, order_index) values
    (q_urinario, 'Dolor o ardor al orinar', 'ardor_orinar', 1),
    (q_urinario, 'Urgencia o aumento de frecuencia urinaria', 'urgencia_frecuencia', 2),
    (q_urinario, 'Orina turbia o con mal olor', 'orina_turbia_mal_olor', 3),
    (q_urinario, 'Dolor bajo vientre', 'dolor_bajo_vientre', 4),
    (q_urinario, 'Fiebre, dolor en espalda, náuseas o vómitos', 'alarma_uti', 5);

  insert into public.questions (section, question_text, question_type, is_required, is_active, order_index)
  values ('habitos', 'Factores asociados a Vitamina D', 'multiple', false, true, 100)
  returning id into q_vitd;
  insert into public.question_options (question_id, label, value, order_index) values
    (q_vitd, 'Baja exposición solar', 'baja_exposicion_solar', 1),
    (q_vitd, 'Trabajo principalmente en interiores', 'trabajo_interiores', 2),
    (q_vitd, 'Dolor muscular, dolor óseo o calambres', 'dolor_calambres', 3),
    (q_vitd, 'Bajo ánimo o infecciones frecuentes', 'bajo_animo_infecciones', 4);

  insert into public.questions (section, question_text, question_type, is_required, is_active, order_index)
  values ('factores_riesgo', 'Antecedentes y factores de riesgo', 'multiple', false, true, 110)
  returning id into q_riesgos;
  insert into public.question_options (question_id, label, value, order_index) values
    (q_riesgos, 'Zona con casos o picadura reciente de mosquito', 'zona_dengue_mosquito', 1),
    (q_riesgos, 'Dieta baja en hierro, menstruación abundante, embarazo o antecedente de anemia', 'riesgo_anemia', 2),
    (q_riesgos, 'Antecedente familiar de problemas intestinales, pólipos o edad adulta', 'riesgo_intestinal', 3),
    (q_riesgos, 'Antecedentes familiares de enfermedad prostática', 'riesgo_prostata', 4),
    (q_riesgos, 'Obesidad, enfermedad cardiovascular o antecedente renal familiar', 'riesgo_renal', 5),
    (q_riesgos, 'Antecedentes familiares tiroideos o autoinmunes', 'riesgo_tiroides', 6),
    (q_riesgos, 'Antecedente de infección urinaria, baja ingesta de agua, embarazo o diabetes', 'riesgo_uti', 7);

  -- Reglas generales de alerta
  insert into public.recommendation_rules (question_id, option_id, test_id, score, reason_text, triggers_warning, warning_type, warning_message)
  select q_general, o.id, t.id, 1, 'Reportaste una señal que requiere atención preventiva adicional.', true, 'general', 'La plataforma brinda orientación preventiva. Si los síntomas son intensos, persistentes o empeoran, consulta con un profesional de salud.'
  from public.question_options o cross join public.rapid_tests t
  where o.question_id = q_general and t.name = 'Dengue PACK' and o.value in ('dolor_intenso','persistente_empeora','preocupacion');

  -- Dengue
  insert into public.recommendation_rules (question_id, option_id, test_id, score, reason_text, triggers_warning, warning_type, warning_message)
  select q_fiebre, o.id, t.id,
    case when o.value='alarma_dengue' then 4 else 3 end,
    'Tus respuestas incluyen síntomas o factores compatibles con orientación preventiva para dengue.',
    o.value='alarma_dengue', 'dengue', 'Se recomienda acudir a un establecimiento de salud o consultar con un profesional, especialmente si los síntomas son intensos o empeoran.'
  from public.question_options o cross join public.rapid_tests t
  where o.question_id = q_fiebre and t.name = 'Dengue PACK';
  insert into public.recommendation_rules (question_id, option_id, test_id, score, reason_text)
  select q_riesgos, o.id, t.id, 3, 'Reportaste exposición o contexto de riesgo relacionado con dengue.'
  from public.question_options o cross join public.rapid_tests t
  where o.question_id = q_riesgos and o.value='zona_dengue_mosquito' and t.name='Dengue PACK';

  -- Helicobacter
  insert into public.recommendation_rules (question_id, option_id, test_id, score, reason_text)
  select q_digestivo, o.id, t.id, 2, 'Reportaste molestias digestivas recurrentes asociadas a orientación preventiva gástrica.'
  from public.question_options o cross join public.rapid_tests t
  where o.question_id = q_digestivo and t.name='Helicobacter Pylori';

  -- Hierro/Ferritina
  insert into public.recommendation_rules (question_id, option_id, test_id, score, reason_text)
  select q_fatiga, o.id, t.id, 2, 'Reportaste síntomas asociados a posible deficiencia de hierro o ferritina.'
  from public.question_options o cross join public.rapid_tests t
  where o.question_id = q_fatiga and t.name='Hierro / Ferritina';
  insert into public.recommendation_rules (question_id, option_id, test_id, score, reason_text)
  select q_riesgos, o.id, t.id, 3, 'Reportaste factores de riesgo relacionados con anemia o baja ingesta de hierro.'
  from public.question_options o cross join public.rapid_tests t
  where o.question_id = q_riesgos and o.value='riesgo_anemia' and t.name='Hierro / Ferritina';

  -- FOB
  insert into public.recommendation_rules (question_id, option_id, test_id, score, reason_text, triggers_warning, warning_type, warning_message)
  select q_intestinal, o.id, t.id,
    case when o.value in ('sangre_heces','perdida_peso','dolor_abdominal_persistente') then 4 else 2 end,
    'Reportaste síntomas o antecedentes relacionados con salud intestinal preventiva.',
    o.value in ('sangre_heces','perdida_peso','dolor_abdominal_persistente'), 'intestinal', 'Se recomienda consultar con un profesional de salud para evaluación complementaria.'
  from public.question_options o cross join public.rapid_tests t
  where o.question_id = q_intestinal and t.name='Salud Intestinal / FOB';
  insert into public.recommendation_rules (question_id, option_id, test_id, score, reason_text)
  select q_riesgos, o.id, t.id, 3, 'Reportaste factores de riesgo intestinal que justifican orientación preventiva.'
  from public.question_options o cross join public.rapid_tests t
  where o.question_id = q_riesgos and o.value='riesgo_intestinal' and t.name='Salud Intestinal / FOB';

  -- PSA
  insert into public.recommendation_rules (question_id, option_id, test_id, score, reason_text)
  select q_prostata, o.id, t.id, 3, 'Reportaste síntomas urinarios persistentes relacionados con orientación prostática preventiva.'
  from public.question_options o cross join public.rapid_tests t
  where o.question_id = q_prostata and t.name='Salud Prostática / PSA';
  insert into public.recommendation_rules (question_id, option_id, test_id, score, reason_text)
  select q_riesgos, o.id, t.id, 2, 'Reportaste antecedente familiar relacionado con salud prostática.'
  from public.question_options o cross join public.rapid_tests t
  where o.question_id = q_riesgos and o.value='riesgo_prostata' and t.name='Salud Prostática / PSA';

  -- Renal
  insert into public.recommendation_rules (question_id, option_id, test_id, score, reason_text)
  select q_renal, o.id, t.id, 3, 'Reportaste síntomas o antecedentes asociados a riesgo renal preventivo.'
  from public.question_options o cross join public.rapid_tests t
  where o.question_id = q_renal and t.name='Salud Renal / MAU';
  insert into public.recommendation_rules (question_id, option_id, test_id, score, reason_text)
  select q_riesgos, o.id, t.id, 2, 'Reportaste factores que pueden aumentar riesgo renal preventivo.'
  from public.question_options o cross join public.rapid_tests t
  where o.question_id = q_riesgos and o.value='riesgo_renal' and t.name='Salud Renal / MAU';

  -- Tiroides
  insert into public.recommendation_rules (question_id, option_id, test_id, score, reason_text)
  select q_tiroides, o.id, t.id, 2, 'Reportaste síntomas compatibles con orientación preventiva tiroidea.'
  from public.question_options o cross join public.rapid_tests t
  where o.question_id = q_tiroides and t.name='Tiroides / TSH';
  insert into public.recommendation_rules (question_id, option_id, test_id, score, reason_text)
  select q_riesgos, o.id, t.id, 2, 'Reportaste antecedentes familiares o autoinmunes relacionados con tiroides.'
  from public.question_options o cross join public.rapid_tests t
  where o.question_id = q_riesgos and o.value='riesgo_tiroides' and t.name='Tiroides / TSH';

  -- UTI
  insert into public.recommendation_rules (question_id, option_id, test_id, score, reason_text, triggers_warning, warning_type, warning_message)
  select q_urinario, o.id, t.id,
    case when o.value='alarma_uti' then 4 else 3 end,
    'Reportaste síntomas urinarios compatibles con orientación preventiva para UTI.',
    o.value='alarma_uti', 'uti', 'Se recomienda atención médica además de la orientación sobre prueba rápida.'
  from public.question_options o cross join public.rapid_tests t
  where o.question_id = q_urinario and t.name='UTI';
  insert into public.recommendation_rules (question_id, option_id, test_id, score, reason_text)
  select q_riesgos, o.id, t.id, 2, 'Reportaste factores de riesgo relacionados con infecciones urinarias.'
  from public.question_options o cross join public.rapid_tests t
  where o.question_id = q_riesgos and o.value='riesgo_uti' and t.name='UTI';

  -- Vitamina D
  insert into public.recommendation_rules (question_id, option_id, test_id, score, reason_text)
  select q_vitd, o.id, t.id, 3, 'Reportaste hábitos o síntomas asociados a baja vitamina D.'
  from public.question_options o cross join public.rapid_tests t
  where o.question_id = q_vitd and t.name='Vitamina D';
end $$;
