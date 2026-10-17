"""Esquemas de validación Pydantic para Autenticación y Usuarios."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class UsuarioBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Nombre de usuario único")
    nombre_completo: Optional[str] = Field(None, max_length=100, description="Nombre y apellido")
    is_admin: bool = Field(True, description="Indica si tiene permisos de administrador")


class UsuarioCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Nombre de usuario único")
    nombre_completo: Optional[str] = Field(None, max_length=100, description="Nombre y apellido")
    password: str = Field(..., min_length=6, description="Contraseña en texto plano para registro")

    model_config = ConfigDict(extra="forbid")


class UsuarioLogin(BaseModel):
    username: str = Field(..., description="Nombre de usuario")
    password: str = Field(..., description="Contraseña")


class UsuarioResponse(UsuarioBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None
