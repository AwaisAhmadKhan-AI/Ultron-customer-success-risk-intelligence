# Admin-Only User Management

Ultron is an internal workspace. It intentionally has no public self-registration endpoint.

## Access model

- `POST /api/v1/admin/users` requires a valid bearer token for an active user whose role is `admin_manager`.
- The endpoint creates `csm` users only. The request schema rejects extra fields, so clients cannot select or escalate a new user's role.
- Email addresses are trimmed and normalized to lowercase. Duplicate email conflicts return HTTP 409.
- Passwords must be 12–128 characters and are hashed using the application's configured password hasher. Plaintext passwords and password hashes are not returned.
- Unauthenticated requests are rejected with HTTP 401. Authenticated CSM requests are rejected with HTTP 403.

## Bootstrap the first administrator

Run from the `backend/` folder, with the normal virtual environment activated and the intended local database configured in `backend/.env`:

```bash
python scripts/create_admin.py
```

The script prompts for administrator details and reads the password invisibly. It creates the first `admin_manager` only when no administrator exists. It refuses duplicate emails and will not print or store the password in the repository.

## Create a CSM account

1. Sign in as the administrator and obtain a bearer access token using the existing `/api/v1/auth/login` workflow.
2. Open the local API documentation at `/docs` while the FastAPI server is running.
3. Authorize with the administrator's bearer token.
4. Call `POST /api/v1/admin/users` with this JSON shape:

```json
{
  "full_name": "Example Customer Success Manager",
  "email": "csm@example.com",
  "password": "a-long-unique-password"
}
```

The password must contain at least 12 characters. The endpoint never accepts a client-supplied role; new users are created as CSMs. Share credentials only through an appropriate private channel and do not commit them to GitHub or project documentation.

## Tests

The admin integration tests must run only against the dedicated `ultron_test` database. The project's usual `.env` may point `DATABASE_URL` at `ultron`; in that case, running plain `python -m pytest` intentionally triggers the admin tests' safety assertion. Do not remove that assertion and do not run integration tests against the development `ultron` database.

From the `backend/` directory, run the following command. It temporarily points the Alembic and test processes at `ultron_test`, applies any pending migrations to that test database, and runs the suite. The overrides are passed to child processes and do not rewrite `.env`:

```bash
python -c "import os, subprocess, sys; from app.core.config import settings; from sqlalchemy.engine import make_url; env=os.environ.copy(); env['DATABASE_URL']=make_url(settings.database_url).set(database='ultron_test').update_query_dict({'connect_timeout':'5'}).render_as_string(hide_password=False); env['ALEMBIC_DATABASE_URL']=make_url(settings.alembic_database_url).set(database='ultron_test').update_query_dict({'connect_timeout':'5'}).render_as_string(hide_password=False); print('Target database: ultron_test', flush=True); r=subprocess.run([sys.executable,'-m','alembic','upgrade','head'],env=env,timeout=30); print('Migration exit code:',r.returncode,flush=True); sys.exit(r.returncode) if r.returncode else sys.exit(subprocess.run([sys.executable,'-m','pytest'],env=env,timeout=300).returncode)"
```

The integration tests verify authentication, admin-only access, CSM role restriction, duplicate-email rejection, password policy, and password hashing.
