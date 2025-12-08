import logging
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import get_settings
from app.models import (
    LoginRequest, LoginResponse, UserResponse, UserCreate,
    AuditLog, UserRole
)
from app.database import database
from app.auth import verify_password, create_access_token, decode_token, is_token_expired

settings = get_settings()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info(f"Starting {settings.service_name} v{settings.service_version}")
    await database.connect()
    yield
    await database.disconnect()
    logger.info("Shutting down auth service")


# Create FastAPI app
app = FastAPI(
    title="Authentication Service",
    description="Hospital admin authentication with JWT and MongoDB",
    version=settings.service_version,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[UserResponse]:
    """Get current authenticated user from JWT token."""
    if not credentials:
        return None

    token_payload = decode_token(credentials.credentials)
    if not token_payload or is_token_expired(token_payload):
        return None

    user = await database.get_user_by_username(token_payload.sub)
    if not user or not user.is_active:
        return None

    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login
    )


def require_auth(
    user: Optional[UserResponse] = Depends(get_current_user)
) -> UserResponse:
    """Require authenticated user."""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_admin(
    user: UserResponse = Depends(require_auth)
) -> UserResponse:
    """Require admin role."""
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.service_name,
        "version": settings.service_version,
        "timestamp": datetime.now().isoformat()
    }


@app.post("/api/auth/login", response_model=LoginResponse)
async def login(request: Request, login_data: LoginRequest):
    """Authenticate user and return JWT token."""

    # Get client info for audit
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    # Find user
    user = await database.get_user_by_username(login_data.username)

    if not user:
        # Log failed attempt
        await database.log_audit(AuditLog(
            user_id="unknown",
            username=login_data.username,
            action="failed_login",
            ip_address=client_ip,
            user_agent=user_agent,
            timestamp=datetime.utcnow(),
            details={"reason": "user_not_found"}
        ))
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Verify password
    if not verify_password(login_data.password, user.hashed_password):
        await database.log_audit(AuditLog(
            user_id=user.id,
            username=user.username,
            action="failed_login",
            ip_address=client_ip,
            user_agent=user_agent,
            timestamp=datetime.utcnow(),
            details={"reason": "invalid_password"}
        ))
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Check if active
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account is disabled")

    # Create token
    access_token = create_access_token(user.username, user.role.value)

    # Update last login
    await database.update_last_login(user.username)

    # Log successful login
    await database.log_audit(AuditLog(
        user_id=user.id,
        username=user.username,
        action="login",
        ip_address=client_ip,
        user_agent=user_agent,
        timestamp=datetime.utcnow(),
        details={"success": True}
    ))

    # Get updated user
    updated_user = await database.get_user_by_username(user.username)

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.jwt_expire_minutes * 60,
        user=UserResponse(
            id=updated_user.id,
            username=updated_user.username,
            email=updated_user.email,
            full_name=updated_user.full_name,
            role=updated_user.role,
            is_active=updated_user.is_active,
            created_at=updated_user.created_at,
            last_login=updated_user.last_login
        )
    )


@app.post("/api/auth/logout")
async def logout(
    request: Request,
    user: UserResponse = Depends(require_auth)
):
    """Logout user (log the event)."""
    client_ip = request.client.host if request.client else "unknown"

    await database.log_audit(AuditLog(
        user_id=user.id,
        username=user.username,
        action="logout",
        ip_address=client_ip,
        user_agent=request.headers.get("user-agent", "unknown"),
        timestamp=datetime.utcnow(),
        details={}
    ))

    return {"status": "logged_out", "username": user.username}


@app.get("/api/auth/verify")
async def verify_token(user: UserResponse = Depends(require_auth)):
    """Verify if token is valid."""
    return {"valid": True, "username": user.username, "role": user.role}


@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(user: UserResponse = Depends(require_auth)):
    """Get current user information."""
    return user


@app.post("/api/auth/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    admin: UserResponse = Depends(require_admin)
):
    """Create a new user (admin only)."""
    user = await database.create_user(user_data)
    if not user:
        raise HTTPException(status_code=400, detail="Username already exists")

    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.host, port=settings.port)
