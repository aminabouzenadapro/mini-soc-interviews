-- Adds editable questions, assumptions, and richer contact and interview details.
-- Run it once in the Supabase SQL Editor, after schema.sql.

alter table public.contacts
  add column if not exists person text,
  add column if not exists reach text,
  add column if not exists next_date date,
  add column if not exists notes text not null default '';

alter table public.interviews
  add column if not exists key_quote text not null default '',
  add column if not exists need_score smallint check (need_score between 1 and 5);

create table if not exists public.questions (
  id text primary key,
  section text not null check (section in ('A','B','C','D','E','F','G','Z')),
  position integer not null default 100,
  en text not null,
  fr text not null,
  many boolean not null default false,
  options jsonb not null default '[]'::jsonb,
  archived boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.hypotheses (
  id text primary key default gen_random_uuid()::text,
  statement text not null check (char_length(statement) between 1 and 500),
  status text not null default 'untested'
    check (status in ('untested','supported','mixed','rejected')),
  evidence text not null default '',
  position integer not null default 100,
  created_at timestamptz not null default now()
);

alter table public.questions enable row level security;
alter table public.hypotheses enable row level security;

revoke all on public.questions, public.hypotheses from anon;
grant select, insert, update, delete on public.questions, public.hypotheses to authenticated;

drop policy if exists "Team manages questions" on public.questions;
create policy "Team manages questions" on public.questions
  for all to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

drop policy if exists "Team manages hypotheses" on public.hypotheses;
create policy "Team manages hypotheses" on public.hypotheses
  for all to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

do $$
begin
  alter publication supabase_realtime add table public.questions, public.hypotheses;
exception when duplicate_object then null;
end $$;

insert into public.hypotheses (id, statement, position) values
  ('h-priority', 'Algerian SMEs see cybersecurity as a real priority.', 1),
  ('h-pay', 'SMEs would pay a monthly subscription for security monitoring.', 2),
  ('h-value', 'Fast onboarding and clear reports are what SMEs value most.', 3),
  ('h-logs', 'SMEs accept sending security logs to an outside provider.', 4),
  ('h-partners', 'IT providers would resell the service instead of competing with it.', 5)
on conflict (id) do nothing;

insert into public.questions (id, section, position, en, fr, many, options) values
('A1', 'A', 1, 'How many employees does your company have?', 'Combien d''employés compte votre entreprise ?', false, '[{"en":"Fewer than 20","fr":"Moins de 20"},{"en":"20–50","fr":"20–50"},{"en":"51–200","fr":"51–200"},{"en":"More than 200","fr":"Plus de 200"}]'::jsonb),
('A2', 'A', 2, 'What is your sector?', 'Quel est votre secteur ?', false, '[{"en":"Health","fr":"Santé"},{"en":"Finance or accounting","fr":"Finance ou comptabilité"},{"en":"Commerce","fr":"Commerce"},{"en":"Industry","fr":"Industrie"},{"en":"Technology","fr":"Technologie"},{"en":"Services","fr":"Services"},{"en":"Other","fr":"Autre","text":true}]'::jsonb),
('A3', 'A', 3, 'Who handles IT and security in your company?', 'Qui s''occupe de l''informatique et de la sécurité dans votre entreprise ?', false, '[{"en":"An internal IT team","fr":"Une équipe informatique interne"},{"en":"One IT person","fr":"Une seule personne"},{"en":"An external provider","fr":"Un prestataire externe"},{"en":"Nobody specifically","fr":"Personne en particulier"},{"en":"Other","fr":"Autre","text":true}]'::jsonb),
('A4', 'A', 4, 'How important is cybersecurity for your company today?', 'Quelle est l''importance de la cybersécurité pour votre entreprise aujourd''hui ?', false, '[{"en":"Very important","fr":"Très importante"},{"en":"Important","fr":"Importante"},{"en":"Not very important","fr":"Peu importante"},{"en":"Not important","fr":"Pas importante"}]'::jsonb),
('A5', 'A', 5, 'Which incidents have you experienced?', 'Quels incidents avez-vous déjà subis ?', true, '[{"en":"Ransomware","fr":"Rançongiciel"},{"en":"Virus","fr":"Virus"},{"en":"Hacked account","fr":"Compte piraté"},{"en":"Fraud or scam","fr":"Fraude ou arnaque"},{"en":"Data loss","fr":"Perte de données"},{"en":"None","fr":"Aucun"},{"en":"Prefer not to say","fr":"Je préfère ne pas répondre"},{"en":"Other","fr":"Autre","text":true}]'::jsonb),
('A6', 'A', 6, 'What do you spend on IT and security each year?', 'Quel est votre budget annuel pour l''informatique et la sécurité ?', false, '[{"en":"Less than 500,000 DA","fr":"Moins de 500 000 DA"},{"en":"500,000–2 million DA","fr":"500 000–2 millions DA"},{"en":"2–5 million DA","fr":"2–5 millions DA"},{"en":"More than 5 million DA","fr":"Plus de 5 millions DA"},{"en":"Prefer not to say","fr":"Je préfère ne pas répondre"}]'::jsonb),
('A7', 'A', 7, 'What would push you to pay for a security service?', 'Qu''est-ce qui vous pousserait à payer un service de sécurité ?', true, '[{"en":"An incident","fr":"Un incident"},{"en":"A client or partner request","fr":"La demande d\u0027un client ou partenaire"},{"en":"A legal requirement","fr":"Une obligation légale"},{"en":"Fear of losing data","fr":"La peur de perdre des données"},{"en":"Nothing","fr":"Rien"},{"en":"Other","fr":"Autre","text":true}]'::jsonb),
('A8', 'A', 8, 'Imagine a service that monitors your systems remotely and sends you a clear monthly report. How interested would you be?', 'Imaginez un service qui surveille vos systèmes à distance et vous envoie un rapport mensuel clair. Quel serait votre intérêt ?', false, '[{"en":"Very interested","fr":"Très intéressé"},{"en":"Somewhat interested","fr":"Assez intéressé"},{"en":"Not very interested","fr":"Peu intéressé"},{"en":"Not interested","fr":"Pas intéressé"}]'::jsonb),
('A9', 'A', 9, 'What would worry you about this service?', 'Qu''est-ce qui vous inquiéterait dans ce service ?', true, '[{"en":"Confidentiality","fr":"Confidentialité"},{"en":"Cost","fr":"Coût"},{"en":"Trusting a young company","fr":"Confier cela à une jeune entreprise"},{"en":"Complexity","fr":"Complexité"},{"en":"Nothing","fr":"Rien"},{"en":"Other","fr":"Autre","text":true}]'::jsonb),
('A10', 'A', 10, 'What monthly price would seem reasonable for your whole company?', 'Quel prix mensuel vous semblerait raisonnable pour toute votre entreprise ?', false, '[{"en":"Less than 20,000 DA","fr":"Moins de 20 000 DA"},{"en":"20,000–50,000 DA","fr":"20 000–50 000 DA"},{"en":"50,000–100,000 DA","fr":"50 000–100 000 DA"},{"en":"More than 100,000 DA","fr":"Plus de 100 000 DA"},{"en":"I would not pay","fr":"Je ne paierais pas"}]'::jsonb),
('A11', 'A', 11, 'Which language would you prefer for reports?', 'Quelle langue préférez-vous pour les rapports ?', false, '[{"en":"French","fr":"Français"},{"en":"Arabic","fr":"Arabe"},{"en":"English","fr":"Anglais"}]'::jsonb),
('B1', 'B', 1, 'How many computers and servers do you manage?', 'Combien de postes et de serveurs gérez-vous ?', false, '[{"en":"Fewer than 25","fr":"Moins de 25"},{"en":"25–100","fr":"25–100"},{"en":"101–500","fr":"101–500"},{"en":"More than 500","fr":"Plus de 500"}]'::jsonb),
('B2', 'B', 2, 'Where are your systems hosted?', 'Où sont hébergés vos systèmes ?', false, '[{"en":"On site","fr":"Sur site"},{"en":"Hosted in Algeria","fr":"Hébergés en Algérie"},{"en":"Hosted abroad","fr":"Hébergés à l\u0027étranger"},{"en":"A mix","fr":"Un mélange"}]'::jsonb),
('B3', 'B', 3, 'Which security tools do you use?', 'Quels outils de sécurité utilisez-vous ?', true, '[{"en":"Antivirus","fr":"Antivirus"},{"en":"Firewall","fr":"Pare-feu"},{"en":"EDR","fr":"EDR"},{"en":"SIEM","fr":"SIEM"},{"en":"Backups","fr":"Sauvegardes"},{"en":"None","fr":"Aucun"},{"en":"Other","fr":"Autre","text":true}]'::jsonb),
('B4', 'B', 4, 'How would you find out about an intrusion?', 'Comment découvririez-vous une intrusion ?', false, '[{"en":"Automatic alerts","fr":"Alertes automatiques"},{"en":"Checking logs manually","fr":"Vérification manuelle des journaux"},{"en":"When a user reports a problem","fr":"Quand un utilisateur signale un problème"},{"en":"Probably would not know","fr":"Je ne le saurais probablement pas"}]'::jsonb),
('B5', 'B', 5, 'How much time can you give to security each week?', 'Combien de temps pouvez-vous consacrer à la sécurité chaque semaine ?', false, '[{"en":"Almost none","fr":"Presque rien"},{"en":"Under 2 hours","fr":"Moins de 2 heures"},{"en":"2–10 hours","fr":"2–10 heures"},{"en":"More than 10 hours","fr":"Plus de 10 heures"}]'::jsonb),
('B6', 'B', 6, 'What are your biggest constraints?', 'Quelles sont vos principales contraintes ?', true, '[{"en":"Budget","fr":"Budget"},{"en":"Lack of time","fr":"Manque de temps"},{"en":"Lack of skills","fr":"Manque de compétences"},{"en":"Internet quality","fr":"Qualité d\u0027Internet"},{"en":"Buying foreign licenses","fr":"Achat de licences étrangères"},{"en":"Paying in foreign currency","fr":"Paiement en devises"},{"en":"Other","fr":"Autre","text":true}]'::jsonb),
('B7', 'B', 7, 'Would you install an agent that sends security logs outside your company?', 'Installeriez-vous un agent qui envoie des journaux de sécurité hors de votre entreprise ?', false, '[{"en":"Yes","fr":"Oui"},{"en":"Only if hosted in Algeria","fr":"Seulement si hébergé en Algérie"},{"en":"Only with strict conditions","fr":"Seulement à des conditions strictes"},{"en":"No","fr":"Non"}]'::jsonb),
('B8', 'B', 8, 'Which automatic actions would you accept?', 'Quelles actions automatiques accepteriez-vous ?', true, '[{"en":"Blocking an IP address","fr":"Bloquer une adresse IP"},{"en":"Isolating a machine","fr":"Isoler une machine"},{"en":"Disabling an account","fr":"Désactiver un compte"},{"en":"Only alerts","fr":"Uniquement des alertes"}]'::jsonb),
('B9', 'B', 9, 'What would help you most?', 'Qu''est-ce qui vous aiderait le plus ?', false, '[{"en":"24/7 monitoring","fr":"Surveillance 24h/24"},{"en":"Fewer, clearer alerts","fr":"Des alertes moins nombreuses et plus claires"},{"en":"Incident help","fr":"Aide en cas d\u0027incident"},{"en":"Reports for management","fr":"Rapports pour la direction"},{"en":"Compliance help","fr":"Aide à la conformité"},{"en":"Other","fr":"Autre","text":true}]'::jsonb),
('C1', 'C', 1, 'What size are most of your clients?', 'Quelle est la taille de la plupart de vos clients ?', false, '[{"en":"Fewer than 20 employees","fr":"Moins de 20 employés"},{"en":"20–200","fr":"20–200"},{"en":"More than 200","fr":"Plus de 200"},{"en":"Public bodies","fr":"Organismes publics"}]'::jsonb),
('C2', 'C', 2, 'Which security services do SMEs buy from you?', 'Quels services de sécurité les PME vous achètent-elles ?', true, '[{"en":"Antivirus","fr":"Antivirus"},{"en":"Firewall","fr":"Pare-feu"},{"en":"Backups","fr":"Sauvegardes"},{"en":"Audits","fr":"Audits"},{"en":"Monitoring","fr":"Surveillance"},{"en":"Almost none","fr":"Presque aucun"},{"en":"Other","fr":"Autre","text":true}]'::jsonb),
('C3', 'C', 3, 'What problems do you see most often?', 'Quels problèmes voyez-vous le plus souvent ?', true, '[{"en":"Ransomware","fr":"Rançongiciel"},{"en":"Phishing","fr":"Hameçonnage"},{"en":"Weak passwords","fr":"Mots de passe faibles"},{"en":"Outdated systems","fr":"Systèmes obsolètes"},{"en":"No backups","fr":"Absence de sauvegardes"},{"en":"Other","fr":"Autre","text":true}]'::jsonb),
('C4', 'C', 4, 'When do SMEs usually start paying for security?', 'Quand les PME commencent-elles généralement à payer pour la sécurité ?', false, '[{"en":"Before any problem","fr":"Avant tout problème"},{"en":"After an incident","fr":"Après un incident"},{"en":"When a client requires it","fr":"Quand un client l\u0027exige"},{"en":"Rarely","fr":"Rarement"}]'::jsonb),
('C5', 'C', 5, 'How do SMEs prefer to pay?', 'Comment les PME préfèrent-elles payer ?', false, '[{"en":"Monthly","fr":"Mensuellement"},{"en":"Annual contract","fr":"Contrat annuel"},{"en":"One-off invoice","fr":"Facture ponctuelle"},{"en":"Depends on the client","fr":"Cela dépend du client"}]'::jsonb),
('C6', 'C', 6, 'How long does a sale to an SME usually take?', 'Combien de temps prend généralement une vente à une PME ?', false, '[{"en":"Under 1 month","fr":"Moins d\u0027un mois"},{"en":"1–3 months","fr":"1–3 mois"},{"en":"3–6 months","fr":"3–6 mois"},{"en":"More than 6 months","fr":"Plus de 6 mois"}]'::jsonb),
('C7', 'C', 7, 'Would a remote monitoring service help you, or compete with you?', 'Un service de surveillance à distance vous aiderait-il ou vous ferait-il concurrence ?', false, '[{"en":"It would help","fr":"Il m\u0027aiderait"},{"en":"It would compete","fr":"Il me ferait concurrence"},{"en":"Both","fr":"Les deux"},{"en":"Neither","fr":"Aucun des deux"}]'::jsonb),
('C8', 'C', 8, 'Would you resell such a service?', 'Revendriez-vous un tel service ?', false, '[{"en":"Yes","fr":"Oui"},{"en":"No","fr":"Non"},{"en":"Maybe","fr":"Peut-être"}]'::jsonb),
('D1', 'D', 1, 'What takes the most time in your work?', 'Qu''est-ce qui prend le plus de temps dans votre travail ?', true, '[{"en":"Alert triage","fr":"Triage des alertes"},{"en":"False positives","fr":"Faux positifs"},{"en":"Investigations","fr":"Investigations"},{"en":"Tuning rules","fr":"Ajustement des règles"},{"en":"Reporting","fr":"Rapports"},{"en":"Other","fr":"Autre","text":true}]'::jsonb),
('D2', 'D', 2, 'What share of your alerts are false positives?', 'Quelle part de vos alertes sont des faux positifs ?', false, '[{"en":"Under 25%","fr":"Moins de 25 %"},{"en":"25–50%","fr":"25–50 %"},{"en":"50–75%","fr":"50–75 %"},{"en":"Over 75%","fr":"Plus de 75 %"},{"en":"Not sure","fr":"Je ne sais pas"}]'::jsonb),
('D3', 'D', 3, 'What is hardest about onboarding a new client?', 'Quelle est la plus grande difficulté pour intégrer un nouveau client ?', false, '[{"en":"Collecting logs","fr":"Collecter les journaux"},{"en":"Understanding the client\u0027s systems","fr":"Comprendre les systèmes du client"},{"en":"Tuning rules","fr":"Ajuster les règles"},{"en":"Agreeing on procedures","fr":"S\u0027accorder sur les procédures"},{"en":"Other","fr":"Autre","text":true}]'::jsonb),
('D4', 'D', 4, 'How should a small provider separate client data?', 'Comment un petit prestataire devrait-il séparer les données des clients ?', false, '[{"en":"Shared platform with tenants","fr":"Plateforme partagée avec tenants"},{"en":"One instance per client","fr":"Une instance par client"},{"en":"Depends on the client","fr":"Cela dépend du client"},{"en":"Not sure","fr":"Je ne sais pas"}]'::jsonb),
('D5', 'D', 5, 'Which triage steps can be automated safely?', 'Quelles étapes du triage peut-on automatiser sans risque ?', true, '[{"en":"Enrichment","fr":"Enrichissement"},{"en":"Deduplication","fr":"Déduplication"},{"en":"Prioritization","fr":"Priorisation"},{"en":"Closing false positives","fr":"Clôture des faux positifs"},{"en":"Response actions","fr":"Actions de réponse"},{"en":"None","fr":"Aucune"}]'::jsonb),
('D6', 'D', 6, 'What do clients actually read in reports?', 'Que lisent réellement les clients dans les rapports ?', false, '[{"en":"Executive summary","fr":"Résumé pour la direction"},{"en":"Incidents","fr":"Incidents"},{"en":"Statistics","fr":"Statistiques"},{"en":"Recommendations","fr":"Recommandations"},{"en":"Very little","fr":"Très peu de choses"}]'::jsonb),
('D7', 'D', 7, 'Without 24/7 staffing, what could a small team honestly offer?', 'Sans présence 24h/24, que pourrait honnêtement proposer une petite équipe ?', false, '[{"en":"Business-hours monitoring","fr":"Surveillance aux heures ouvrables"},{"en":"Automated alerts only","fr":"Alertes automatiques uniquement"},{"en":"Monthly review","fr":"Revue mensuelle"},{"en":"Nothing credible","fr":"Rien de crédible"},{"en":"Other","fr":"Autre","text":true}]'::jsonb),
('D8', 'D', 8, 'For a first version, which tool stack would you choose?', 'Pour une première version, quels outils choisiriez-vous ?', false, '[{"en":"Wazuh alone","fr":"Wazuh seul"},{"en":"Wazuh with Suricata","fr":"Wazuh avec Suricata"},{"en":"Wazuh with a SOAR","fr":"Wazuh avec un SOAR"},{"en":"Other","fr":"Autre","text":true}]'::jsonb),
('E1', 'E', 1, 'Which weaknesses do you find most often in Algerian companies?', 'Quelles faiblesses trouvez-vous le plus souvent dans les entreprises algériennes ?', true, '[{"en":"Weak passwords","fr":"Mots de passe faibles"},{"en":"Outdated systems","fr":"Systèmes obsolètes"},{"en":"No backups","fr":"Absence de sauvegardes"},{"en":"No staff awareness","fr":"Personnel non sensibilisé"},{"en":"No monitoring","fr":"Absence de surveillance"},{"en":"Other","fr":"Autre","text":true}]'::jsonb),
('E2', 'E', 2, 'Which threats are the most realistic for an SME here?', 'Quelles menaces sont les plus réalistes pour une PME ici ?', true, '[{"en":"Ransomware","fr":"Rançongiciel"},{"en":"Phishing","fr":"Hameçonnage"},{"en":"Payment fraud","fr":"Fraude aux paiements"},{"en":"Data theft","fr":"Vol de données"},{"en":"Insider misuse","fr":"Abus interne"},{"en":"Other","fr":"Autre","text":true}]'::jsonb),
('E3', 'E', 3, 'What usually leads a company to request an audit?', 'Qu''est-ce qui pousse généralement une entreprise à demander un audit ?', false, '[{"en":"An incident","fr":"Un incident"},{"en":"A legal requirement","fr":"Une obligation légale"},{"en":"A client request","fr":"La demande d\u0027un client"},{"en":"A management decision","fr":"Une décision de la direction"},{"en":"Other","fr":"Autre","text":true}]'::jsonb),
('E4', 'E', 4, 'Which sectors are under the most pressure to improve security?', 'Quels secteurs subissent le plus de pression pour améliorer leur sécurité ?', true, '[{"en":"Banking and insurance","fr":"Banque et assurance"},{"en":"Health","fr":"Santé"},{"en":"Energy","fr":"Énergie"},{"en":"Telecom","fr":"Télécoms"},{"en":"Public sector","fr":"Secteur public"},{"en":"Technology","fr":"Technologie"},{"en":"Other","fr":"Autre","text":true}]'::jsonb),
('E5', 'E', 5, 'What should an SME do before monitoring is useful?', 'Que doit faire une PME avant que la surveillance soit utile ?', true, '[{"en":"Update systems","fr":"Mettre à jour les systèmes"},{"en":"Set up backups","fr":"Mettre en place des sauvegardes"},{"en":"Secure accounts","fr":"Sécuriser les comptes"},{"en":"Train staff","fr":"Former le personnel"},{"en":"Nothing, start now","fr":"Rien, commencer tout de suite"},{"en":"Other","fr":"Autre","text":true}]'::jsonb),
('E6', 'E', 6, 'Is a SOC service the right answer for SMEs?', 'Un service SOC est-il la bonne réponse pour les PME ?', false, '[{"en":"Yes","fr":"Oui"},{"en":"Yes, if simple and cheap","fr":"Oui, s\u0027il est simple et peu coûteux"},{"en":"Only for some sectors","fr":"Seulement pour certains secteurs"},{"en":"No, they need basics first","fr":"Non, il faut d\u0027abord les bases"}]'::jsonb),
('F1', 'F', 1, 'Does Law 18-07, as amended by Law 25-11, apply to this activity?', 'La loi 18-07, modifiée par la loi 25-11, s''applique-t-elle à cette activité ?', false, '[{"en":"Yes","fr":"Oui"},{"en":"No","fr":"Non"},{"en":"It depends","fr":"Cela dépend"},{"en":"Not sure","fr":"Je ne sais pas"}]'::jsonb),
('F2', 'F', 2, 'Who is responsible for the data?', 'Qui est responsable des données ?', false, '[{"en":"The client","fr":"Le client"},{"en":"The provider","fr":"Le prestataire"},{"en":"Both","fr":"Les deux"},{"en":"It depends","fr":"Cela dépend"},{"en":"Not sure","fr":"Je ne sais pas"}]'::jsonb),
('F3', 'F', 3, 'What is needed from the ANPDP?', 'Que faut-il obtenir auprès de l''ANPDP ?', false, '[{"en":"Nothing","fr":"Rien"},{"en":"A declaration","fr":"Une déclaration"},{"en":"An authorization","fr":"Une autorisation"},{"en":"It depends","fr":"Cela dépend"},{"en":"Not sure","fr":"Je ne sais pas"}]'::jsonb),
('F4', 'F', 4, 'Can logs be hosted outside Algeria?', 'Les journaux peuvent-ils être hébergés hors d''Algérie ?', false, '[{"en":"Yes","fr":"Oui"},{"en":"No","fr":"Non"},{"en":"Only under conditions","fr":"Seulement sous conditions"},{"en":"Not sure","fr":"Je ne sais pas"}]'::jsonb),
('F5', 'F', 5, 'Must a data breach be reported?', 'Une violation de données doit-elle être signalée ?', false, '[{"en":"Yes","fr":"Oui"},{"en":"No","fr":"Non"},{"en":"Not sure","fr":"Je ne sais pas"},{"en":"Deadline","fr":"Délai","text":true}]'::jsonb),
('F6', 'F', 6, 'Who is liable if the service misses an attack?', 'Qui est responsable si le service ne détecte pas une attaque ?', false, '[{"en":"The provider","fr":"Le prestataire"},{"en":"The client","fr":"Le client"},{"en":"Depends on the contract","fr":"Cela dépend du contrat"},{"en":"Not sure","fr":"Je ne sais pas"}]'::jsonb),
('F7', 'F', 7, 'Is a license or approval needed to sell security services in Algeria?', 'Faut-il un agrément pour vendre des services de sécurité en Algérie ?', false, '[{"en":"Yes","fr":"Oui"},{"en":"No","fr":"Non"},{"en":"It depends","fr":"Cela dépend"},{"en":"Not sure","fr":"Je ne sais pas"}]'::jsonb),
('F8', 'F', 8, 'Does Presidential Decree 26-07 create requirements for suppliers to public bodies?', 'Le décret présidentiel 26-07 crée-t-il des exigences pour les prestataires des organismes publics ?', false, '[{"en":"Yes","fr":"Oui"},{"en":"No","fr":"Non"},{"en":"It depends","fr":"Cela dépend"},{"en":"Not sure","fr":"Je ne sais pas"}]'::jsonb),
('G1', 'G', 1, 'Is a monthly subscription realistic for Algerian SMEs?', 'Un abonnement mensuel est-il réaliste pour les PME algériennes ?', false, '[{"en":"Yes","fr":"Oui"},{"en":"Annual would be better","fr":"Un contrat annuel serait préférable"},{"en":"Only for some sectors","fr":"Seulement pour certains secteurs"},{"en":"No","fr":"Non"}]'::jsonb),
('G2', 'G', 2, 'What is the best way to find first clients?', 'Quel est le meilleur moyen de trouver les premiers clients ?', false, '[{"en":"Personal network","fr":"Réseau personnel"},{"en":"IT providers","fr":"Prestataires informatiques"},{"en":"Events","fr":"Événements"},{"en":"LinkedIn","fr":"LinkedIn"},{"en":"Incubators","fr":"Incubateurs"},{"en":"Other","fr":"Autre","text":true}]'::jsonb),
('G3', 'G', 3, 'What builds the most trust for a young startup?', 'Qu''est-ce qui inspire le plus confiance dans une jeune startup ?', false, '[{"en":"References","fr":"Références"},{"en":"Certifications","fr":"Certifications"},{"en":"A free pilot","fr":"Un pilote gratuit"},{"en":"Strong partners","fr":"Des partenaires solides"},{"en":"Contract guarantees","fr":"Des garanties contractuelles"},{"en":"Other","fr":"Autre","text":true}]'::jsonb),
('G4', 'G', 4, 'Which support should we apply for first?', 'À quel dispositif devrions-nous candidater en premier ?', true, '[{"en":"Startup label","fr":"Label startup"},{"en":"An incubator","fr":"Un incubateur"},{"en":"Public funding","fr":"Financement public"},{"en":"Competitions","fr":"Concours"},{"en":"Other","fr":"Autre","text":true}]'::jsonb),
('G5', 'G', 5, 'When should we create the legal company?', 'Quand devrions-nous créer la société ?', false, '[{"en":"Now","fr":"Maintenant"},{"en":"After the prototype","fr":"Après le prototype"},{"en":"After the first client","fr":"Après le premier client"},{"en":"After graduation","fr":"Après l\u0027obtention du diplôme"}]'::jsonb),
('G6', 'G', 6, 'Who is the best first customer for this project?', 'Quel est le meilleur premier client pour ce projet ?', false, '[{"en":"Small SMEs","fr":"Petites PME"},{"en":"Medium companies","fr":"Moyennes entreprises"},{"en":"Public bodies","fr":"Organismes publics"},{"en":"IT providers","fr":"Prestataires informatiques"},{"en":"Other","fr":"Autre","text":true}]'::jsonb),
('G7', 'G', 7, 'What is the weakest part of our idea?', 'Quel est le point le plus faible de notre idée ?', false, '[{"en":"Market need","fr":"Le besoin du marché"},{"en":"Price","fr":"Le prix"},{"en":"Trust","fr":"La confiance"},{"en":"Technical difficulty","fr":"La difficulté technique"},{"en":"Legal risk","fr":"Le risque juridique"},{"en":"Other","fr":"Autre","text":true}]'::jsonb),
('Z1', 'Z', 1, 'Is there an important question we did not ask?', 'Y a-t-il une question importante que nous n''avons pas posée ?', false, '[]'::jsonb),
('Z2', 'Z', 2, 'Could you introduce us to someone else?', 'Pourriez-vous nous mettre en contact avec une autre personne ?', false, '[{"en":"Yes","fr":"Oui"},{"en":"No","fr":"Non"}]'::jsonb),
('Z3', 'Z', 3, 'May we contact you again when we have a first version to show?', 'Pouvons-nous vous recontacter lorsque nous aurons une première version à présenter ?', false, '[{"en":"Yes","fr":"Oui"},{"en":"No","fr":"Non"}]'::jsonb)
on conflict (id) do nothing;
