"""
LDAP AuthHandler for Cheshire Cat.

Env vars required:
  LDAP_URL             e.g. ldap://lsa-dc01.lascalaw.local:389
  LDAP_BASE_DN         e.g. DC=lascalaw,DC=local
  LDAP_BIND_USER       DN of service account (CN=...,OU=...,DC=...,DC=...)
  LDAP_BIND_PWD        password of service account
  LDAP_USER_FILTER     e.g. (sAMAccountName={username})
  CCAT_DEFAULT_ROLE    default roles comma-separated (default: 'user')
"""

from __future__ import annotations
import os
from typing import List, Mapping, Any

import ldap3
from cat.factory.custom_auth_handler import BaseAuthHandler
from cat.auth.permissions import AuthUserInfo


class LDAPAuth(BaseAuthHandler):
    """Bind-search-rebind authentication flow su AD/LDAP."""

    def _service_connect(self) -> ldap3.Connection:
        server = ldap3.Server(os.environ["LDAP_URL"], get_info=ldap3.NONE)
        conn = ldap3.Connection(
            server,
            user=os.environ["LDAP_BIND_USER"],
            password=os.environ["LDAP_BIND_PWD"],
            auto_bind=True,
        )
        self.logger.info(
            "LDAPAuth(Service): bind as service‐account '%s'",
            os.environ["LDAP_BIND_USER"],
        )
        return conn

    # ———————— Ora il metodo JWT è sincrono e restituisce None ————————
    def authorize_user_from_jwt(self, *args, **kwargs) -> AuthUserInfo | None:
        return None

    async def authorize_user_from_key(
        self,
        username: str,
        password: str,
        headers: Mapping[str, Any],
        cat,
    ) -> AuthUserInfo | None:

        # 1) Bind as service account
        try:
            svc = self._service_connect()
        except ldap3.LDAPException as exc:
            self.logger.error("LDAPAuth: service bind failed – %s", exc)
            return None

        # 2) Search user
        base_dn = os.environ["LDAP_BASE_DN"]
        user_filter = os.getenv("LDAP_USER_FILTER", "(sAMAccountName={username})").format(username=username)
        self.logger.info("LDAPAuth: searching user '%s' (%s) under %s", username, user_filter, base_dn)

        svc.search(
            search_base=base_dn,
            search_filter=user_filter,
            attributes=["distinguishedName", "givenName", "sn", "department", "memberOf"],
            size_limit=1,
        )
        if not svc.entries:
            self.logger.warning("LDAPAuth: user '%s' not found", username)
            svc.unbind()
            return None

        entry = svc.entries[0]
        user_dn = entry.distinguishedName.value
        first_name = entry.givenName.value or ""
        last_name = entry.sn.value or ""
        dept = entry.department.value or ""
        member_of = entry.memberOf if "memberOf" in entry and entry.memberOf else []
        svc.unbind()

        # 3) Bind as user to verify password
        self.logger.info("LDAPAuth(User): bind attempt DN='%s'", user_dn)
        try:
            server = ldap3.Server(os.environ["LDAP_URL"], get_info=ldap3.NONE)
            ldap3.Connection(server, user=user_dn, password=password, auto_bind=True).unbind()
        except ldap3.LDAPException as exc:
            self.logger.warning("LDAPAuth(User): invalid credentials for '%s' – %s", username, exc)
            return None

        # 4) Roles
        default_roles: List[str] = [r.strip() for r in os.getenv("CCAT_DEFAULT_ROLE", "user").split(",")]
        extra_roles: List[str] = [str(g).split(",")[0].split("=")[-1] for g in member_of]
        roles = list({*default_roles, *extra_roles})

        self.logger.info("LDAPAuth: user '%s' authenticated, roles=%s dept=%s", username, roles, dept)

        # 5) Return AuthUserInfo
        return AuthUserInfo(
            user_id=username,
            roles=roles,
            data={"first_name": first_name, "last_name": last_name, "department": dept},
        )