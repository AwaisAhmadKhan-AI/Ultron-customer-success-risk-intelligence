from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.core.config import settings
from app.api.auth import router as auth_router
from app.api.admin_users import router as admin_users_router
from app.api.accounts import router as accounts_router
from app.api.documents import router as documents_router
from app.api.ai_insights import router as ai_insights_router
from app.api.contacts import router as contacts_router
from app.api.interactions import router as interactions_router
from app.api.tasks import router as tasks_router
from app.api.risk_signals import router as risk_signals_router
from app.api.account_overview import router as account_overview_router




app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Customer Success Risk Intelligence Platform API",
)
app.include_router(
    auth_router,
    prefix=settings.api_v1_prefix,
)
app.include_router(
    admin_users_router,
    prefix=settings.api_v1_prefix,
)
app.include_router(
    accounts_router,
    prefix=settings.api_v1_prefix,
)
app.include_router(
    documents_router,
    prefix=settings.api_v1_prefix,
)
app.include_router(
    ai_insights_router,
    prefix=settings.api_v1_prefix,
)
app.include_router(
    contacts_router,
    prefix=settings.api_v1_prefix,
)

app.include_router(
    interactions_router,
    prefix=settings.api_v1_prefix,
)
app.include_router(
    tasks_router,
    prefix=settings.api_v1_prefix,
)

app.include_router(
    risk_signals_router,
    prefix=settings.api_v1_prefix,
)
app.include_router(
    account_overview_router,
    prefix=settings.api_v1_prefix,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    api_router,
    prefix=settings.api_v1_prefix,
)


@app.get("/")
def root():
    return {"message": "Ultron API is running", "docs": "/docs"}


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ultron-api"}