insert into tenders (title, raw_description, sector, deadline, status)
values (
  'Mise en place d''une solution de Business Intelligence (BI) et de gestion des données',
  'SOMELEC (Société Mauritanienne d''Électricité) — appel à manifestation d''intérêt pour le recrutement d''un consultant en charge de concevoir et déployer une solution BI : base de données centralisée, intégration de données multi-sources, migration de données historiques (systèmes Cobol) vers une base relationnelle, tableaux de bord de suivi des indicateurs clés, et mise en place d''un référentiel de données pour l''ERP/CRM. Mission de 4 mois, financement Banque Mondiale.',
  'Énergie / Secteur public — Business Intelligence & gestion des données',
  '2026-01-15',
  'detected'
)
returning id;