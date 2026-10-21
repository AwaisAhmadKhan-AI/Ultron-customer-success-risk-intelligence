# Ultron — Customer Success Risk Intelligence Platform

## Overview

Ultron is a web application for Customer Success Managers (CSMs). It provides a central workspace for reviewing customer accounts, managing follow-up activities, tracking risk signals, and requesting AI-assisted analysis grounded in available account evidence.

## Key Features

- Account dashboard and directory with search, filters, and pagination.
- Account creation, editing, archiving, and restoration.
- Account-scoped contacts, interactions, follow-up tasks, and risk signals.
- Document upload with duplicate-content protection.
- AI-assisted account analysis with evidence and source citations.
- Handling for insufficient evidence and AI provider failures.
- Authentication and server-side account-assignment authorization.
- PostgreSQL persistence and Alembic schema migrations.
- Automated backend tests and frontend quality checks.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Python, FastAPI, Pydantic |
| Database | PostgreSQL, SQLAlchemy |
| Migrations | Alembic |
| AI | Configured language-model and embedding providers |
| Testing | pytest, ESLint, TypeScript, Vite production build |

## Project Structure

```text
Ultron/
├── backend/
│   ├── alembic/          # Database migrations
│   ├── app/              # FastAPI application
│   ├── tests/            # Automated backend tests
│   ├── scripts/
│   └── requirements.txt
├── frontend/
│   ├── src/              # React and TypeScript UI
│   └── package.json
├── docs/                 # Requirements and engineering documentation
├── .env.example          # Example configuration; no real secrets
├── .gitignore
└── README.md
```

## Prerequisites

Install Python, Node.js, npm, and PostgreSQL. Configure the local database connection and required AI provider settings before running the application.

## Local Development

### 1. Backend

From the repository root, move into the backend directory and create the virtual environment:

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate
pip install -r requirements.txt
```

If `backend/.env` does not already exist, copy the root template:

```bash
cp ../.env.example .env
```

Set the values in `backend/.env` for your local database and AI provider. Do not overwrite an existing working configuration without preserving its values, and never commit real credentials.

After confirming the configured migration database is the intended local database, apply migrations:

```bash
alembic upgrade head
```

Start the API from the `backend/` directory:

```bash
uvicorn app.main:app --reload
```

The frontend's default API base URL is `http://127.0.0.1:8000/api/v1`. When the backend is running, interactive API documentation is normally available at `http://127.0.0.1:8000/docs`.

### 2. Frontend

Open a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite. Configure `VITE_API_BASE_URL` if the backend uses a different address.

## Verification

Run backend tests from the `backend/` directory with the virtual environment activated:

```bash
python -m pytest -v
```

Run frontend checks from the `frontend/` directory:

```bash
npm run lint
npm run build
```

These commands check automated backend behavior, frontend lint rules, TypeScript compilation, and the production build. They do not replace manual browser testing or deployment review.

## Security Practices

- Keep database passwords, API keys, access tokens, and other secrets out of source control.
- Use `.env.example` for configuration examples only; never put real credentials in it.
- Enforce account-level authorization on the backend.
- Treat uploaded documents as untrusted input.
- Ground AI-generated conclusions in available evidence and validate source citations.
- Review migrations before applying them to any environment.

## Documentation

- [Requirements](docs/REQUIREMENTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data Model](docs/DATA_MODEL.md)
- [API Contract](docs/API_CONTRACT.md)
- [Security Model](docs/SECURITY_MODEL.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)
- [AI Usage Log](docs/AI_USAGE.md)
