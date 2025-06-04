"""
Bootstrap del plugin ldap_auth:
  • registra la classe LDAPAuth come AuthHandler
  • espone LDAPAuthHandlerConfig all'admin-UI
"""
from __future__ import annotations
from typing import List, Type, Dict, Any

from pydantic import ConfigDict, Field
from cat.mad_hatter.decorators import hook
from cat.factory.auth_handler import AuthHandlerConfig
from cat.auth.permissions import AuthUserInfo          # usato nei hints
from .auth import LDAPAuth                             # noqa: F401 – side effect


class LDAPAuthHandlerConfig(AuthHandlerConfig):
    """
    Wrapper di configurazione (ui-friendly) per LDAPAuth.
    Tutti i parametri reali arrivano da variabili d'ambiente,
    quindi qui non servono campi obbligatori: la UI mostrerà
    solo nome e descrizione.
    """
    _pyclass: Type = LDAPAuth

    # (opzionale) puoi definire campi visibili nella UI per
    # sovrascrivere le env-var, ma qui li omettiamo.

    model_config = ConfigDict(
        json_schema_extra={
            "humanReadableName": "LDAP Auth Handler",
            "description": "Authenticate users directly against an LDAP / Active-Directory server.",
        }
    )


# Hook: aggiunge questo handler alla lista degli abilitati
@hook(priority=0)
def factory_allowed_auth_handlers(allowed: List[AuthHandlerConfig], cat) -> List[AuthHandlerConfig]:
    allowed.append(LDAPAuthHandlerConfig)
    return allowed