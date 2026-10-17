"""Router de Autenticación y Gestión de Acceso (/auth).
Cumple con el criterio RF1 (Login seguro con JWT y validación estricta).
"""
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.core.database import get_db
from app.core.deps import get_current_active_admin, get_current_user
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.usuario import Usuario
from app.schemas.usuario import Token, UsuarioCreate, UsuarioLogin, UsuarioResponse

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=Token, summary="Inicio de sesión (OAuth2 Form / Swagger)")
def login_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db)
) -> Token:
    """
    Endpoint estándar OAuth2 para Swagger y clientes web que envían credenciales en formato formulario.
    Valida credenciales y devuelve el token JWT con expiración configurada.
    """
    stmt = select(Usuario).where(Usuario.username == form_data.username)
    user = db.execute(stmt).scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nombre de usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva",
        )

    access_token = create_access_token(subject=user.username)
    return Token(access_token=access_token, token_type="bearer")


@router.post("/login-json", response_model=Token, summary="Inicio de sesión mediante payload JSON")
def login_json(
    credentials: UsuarioLogin,
    db: Session = Depends(get_db)
) -> Token:
    """
    Endpoint alternativo para clientes Frontend (React, Vue, móviles) que envían JSON en el cuerpo.
    """
    stmt = select(Usuario).where(Usuario.username == credentials.username)
    user = db.execute(stmt).scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nombre de usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra inactiva",
        )

    access_token = create_access_token(subject=user.username)
    return Token(access_token=access_token, token_type="bearer")


@router.post("/register", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED, summary="Registrar nuevo usuario")
def register_user(
    user_in: UsuarioCreate,
    current_user: Annotated[Usuario, Depends(get_current_active_admin)],
    db: Session = Depends(get_db)
) -> Usuario:
    """
    Registra un nuevo usuario en la plataforma.
    Valida que el nombre de usuario sea único y almacena la contraseña cifrada con Bcrypt.
    """
    stmt = select(Usuario).where(Usuario.username == user_in.username)
    existing_user = db.execute(stmt).scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de usuario ya se encuentra registrado",
        )

    db_user = Usuario(
        username=user_in.username,
        password_hash=get_password_hash(user_in.password),
        nombre_completo=user_in.nombre_completo,
        is_admin=False,
        is_active=True,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.get("/me", response_model=UsuarioResponse, summary="Obtener información del usuario autenticado")
def get_current_user_profile(
    current_user: Annotated[Usuario, Depends(get_current_user)]
) -> Usuario:
    """Devuelve los datos del usuario correspondiente al token JWT provisto en la cabecera Bearer."""
    return current_user
