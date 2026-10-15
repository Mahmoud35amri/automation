insert into tenders (title, raw_description, sector, deadline, status)
values (
  'Développement d''une application mobile de gestion de l''identité numérique du citoyen',
  'Ministère des Technologies de la Communication (Tunisie) — appel d''offres pour une application mobile permettant au citoyen de gérer son identité numérique et d''accéder aux services administratifs en ligne.',
  'Secteur public — transformation numérique',
  '2025-11-17',
  'detected'
)
returning id;