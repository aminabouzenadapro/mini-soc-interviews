# Mini SOC Interviews

A web app for running market interviews for the Mini SOC as a Service project. It holds the questionnaire in French and English, tracks who to contact, and shows the results.

- **Front end:** plain HTML, CSS, and JavaScript, hosted on GitHub Pages
- **Database and sign-in:** Supabase
- **Database structure:** run [`supabase/schema.sql`](supabase/schema.sql), then [`supabase/002_research_tools.sql`](supabase/002_research_tools.sql)

Interview answers and contacts are stored in Supabase, not in this repository. Only signed-in people whose email is in the `team_members` table can read or change them.

`config.js` contains the Supabase publishable key, which is designed to be public. Never commit the secret key or the database password.
