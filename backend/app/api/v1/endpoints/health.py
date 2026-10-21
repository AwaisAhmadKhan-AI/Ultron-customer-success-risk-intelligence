from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health_check_v1():
    return {
        "status": "ok",
        "service": "ultron-api",
        "api_version": "v1",
    }