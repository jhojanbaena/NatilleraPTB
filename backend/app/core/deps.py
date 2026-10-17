"""Dependencias de Inyección para Autenticación y Autorización en FastAPI."""
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.usuario import Usuario

# Esquema de autenticación Bearer para Swagger UI y clientes HTTP
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
) -> Usuario:
    """
    Decodifica el token JWT y recupera el usuario correspondiente desde la base de datos.
    Arroja HTTP 401 si el token es inválido o el usuario no existe.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales de autenticación inválidas o expiradas",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception

    # Buscar usuario en la base de datos
    stmt = select(Usuario).where(Usuario.username == username)
    user = db.execute(stmt).scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario se encuentra inactivo",
        )

    return user


def get_current_active_admin(
    current_user: Annotated[Usuario, Depends(get_current_user)]
) -> Usuario:
    """Verifica que el usuario actual tenga privilegios de administrador."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario no posee permisos de administrador requeridos",
        )
    return current_user
