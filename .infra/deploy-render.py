#!/usr/bin/env python3
"""Deploy electro-commerce to Render free tiers.

Usage:
  deploy-render.py postgres   - create Postgres, save connection strings
  deploy-render.py redis      - create Redis/KeyValue, save connection strings
  deploy-render.py services   - create medusa + storefront web services (needs DB URLs)
  deploy-render.py status     - show services + latest deploy statuses

Secrets are read from local .env files and the Render API; connection strings
are appended to .infra/render-notes.md (gitignored). Nothing secret is printed.
"""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")
from dynamic_credentials import add_surrogate_to_request, read_json_response

API = "https://api.render.com/v1"
CRED = "custom.render"
HOSTS = ["api.render.com"]
OWNER = "tea-dao1c9dg1s2s73930ts0"
REGION = "singapore"
REPO = "https://github.com/onlinetrader0342-dotcom/electro-commerce"
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INFRA = os.path.join(REPO_ROOT, ".infra")
NOTES = os.path.join(INFRA, "render-notes.md")


def api(method, path, payload=None):
    req = urllib.request.Request(
        API + path,
        data=json.dumps(payload).encode() if payload is not None else None,
        method=method,
    )
    req.add_header("Accept", "application/json")
    if payload is not None:
        req.add_header("Content-Type", "application/json")
    add_surrogate_to_request(req, CRED, allowed_hosts=HOSTS)
    try:
        resp = urllib.request.urlopen(req, timeout=90)
        return resp.status, read_json_response(resp)
    except urllib.error.HTTPError as e:
        try:
            body = e.read().decode(errors="replace")
        except Exception:
            body = ""
        return e.code, {"_http_error": body[:1500]}


def note(line):
    os.makedirs(INFRA, exist_ok=True)
    with open(NOTES, "a") as f:
        f.write(line + "\n")


def env_file(path):
    vals = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                vals[k.strip()] = v.strip().strip('"').strip("'")
    return vals


def rand_hex(n=32):
    return subprocess.run(
        ["openssl", "rand", "-hex", str(n)], capture_output=True, text=True, check=True
    ).stdout.strip()


def cmd_postgres():
    s, b = api("POST", "/postgres", {
        "name": "electro-postgres",
        "ownerId": OWNER,
        "plan": "free",
        "region": REGION,
        "version": "16",
        "databaseName": "electro",
    })
    print("create postgres:", s)
    if s not in (200, 201):
        print(json.dumps(b)[:800]); return 1
    pg = b.get("postgres", b)
    pg_id = pg.get("id")
    print("postgres id:", pg_id)
    note(f"## Postgres\n- id: {pg_id}")
    s2, b2 = api("GET", f"/postgres/{pg_id}/connection-info")
    if s2 == 200:
        ci = b2.get("info", b2)
        note(f"- internal: {ci.get('internalConnectionString')}")
        note(f"- external: {ci.get('externalConnectionString')}")
        print("connection info saved to render-notes.md")
    else:
        print("connection-info failed:", s2, json.dumps(b2)[:400])
    return 0


def cmd_redis():
    payload = {"name": "electro-redis", "ownerId": OWNER, "plan": "free", "region": REGION}
    s, b = api("POST", "/key-value", payload)
    prefix = "key-value"
    if s == 404:
        print("key-value endpoint 404, trying legacy /redis")
        s, b = api("POST", "/redis", payload)
        prefix = "redis"
    print(f"create {prefix}:", s)
    if s not in (200, 201):
        print(json.dumps(b)[:800]); return 1
    rd = b.get(prefix, b)
    r_id = rd.get("id")
    print(f"{prefix} id:", r_id)
    note(f"## Redis ({prefix})\n- id: {r_id}")
    s2, b2 = api("GET", f"/{prefix}/{r_id}/connection-info")
    if s2 == 200:
        ci = b2.get("info", b2)
        url = ci.get("internalConnectionString") or ci.get("connectionString")
        note(f"- internal: {url}")
        print("connection info saved to render-notes.md")
    else:
        print("connection-info failed:", s2, json.dumps(b2)[:400])
    return 0


def get_note_value(marker):
    """Pull a saved '- key: value' line from render-notes.md (for chaining steps)."""
    try:
        with open(NOTES) as f:
            for line in f:
                if line.startswith(marker):
                    return line.split(":", 1)[1].strip()
    except FileNotFoundError:
        pass
    return ""


def cmd_services():
    pg_url = get_note_value("- internal: postgresql")
    redis_url = get_note_value("- internal: redis")
    if not pg_url or not redis_url:
        print("missing DB URLs in render-notes.md; run postgres + redis steps first")
        return 1

    sf_local = env_file(os.path.join(REPO_ROOT, "apps/storefront/.env.local"))
    pubkey = sf_local.get("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY") or sf_local.get("MEDUSA_PUBLISHABLE_KEY", "")
    admin_key = sf_local.get("MEDUSA_ADMIN_API_KEY", "")
    admin_pw = sf_local.get("ADMIN_PASSWORD", "")
    jwt = rand_hex(32); cookie = rand_hex(32); reval = rand_hex(24)
    note(f"## Generated secrets (do not share)\n- JWT_SECRET: {jwt}\n- COOKIE_SECRET: {cookie}\n- REVALIDATE_SECRET: {reval}")

    build_base = "corepack enable && pnpm install"
    common_env = [
        {"key": "NODE_VERSION", "value": "22.14.0"},
        {"key": "NODE_ENV", "value": "production"},
    ]

    medusa_env = common_env + [
        {"key": "DATABASE_URL", "value": pg_url},
        {"key": "REDIS_URL", "value": redis_url},
        {"key": "JWT_SECRET", "value": jwt},
        {"key": "COOKIE_SECRET", "value": cookie},
        {"key": "MEDUSA_WORKER_MODE", "value": "shared"},
        {"key": "DISABLE_MEDUSA_ADMIN", "value": "false"},
        {"key": "STORE_CORS", "value": "https://electro-storefront.onrender.com"},
        {"key": "ADMIN_CORS", "value": "https://electro-medusa.onrender.com"},
        {"key": "AUTH_CORS", "value": "https://electro-storefront.onrender.com"},
        {"key": "STOREFRONT_URL", "value": "https://electro-storefront.onrender.com"},
        {"key": "REVALIDATE_SECRET", "value": reval},
        {"key": "FEED_BASE_URL", "value": "https://electro-storefront.onrender.com"},
        {"key": "PAYMENT_PROVIDER", "value": "cod"},
        {"key": "SHIPPING_PROVIDER", "value": "flat_rate"},
    ]
    storefront_env = common_env + [
        {"key": "MEDUSA_BACKEND_URL", "value": "https://electro-medusa.onrender.com"},
        {"key": "NEXT_PUBLIC_MEDUSA_BACKEND_URL", "value": "https://electro-medusa.onrender.com"},
        {"key": "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", "value": pubkey},
        {"key": "NEXT_PUBLIC_SITE_URL", "value": "https://electro-storefront.onrender.com"},
        {"key": "MEDUSA_ADMIN_API_KEY", "value": admin_key},
        {"key": "ADMIN_PASSWORD", "value": admin_pw},
        {"key": "REVALIDATE_SECRET", "value": reval},
        {"key": "PRODUCT_URL_PREFIX", "value": "/product"},
        {"key": "FREE_SHIPPING_THRESHOLD", "value": "50000"},
    ]

    defs = [
        ("electro-medusa",
         f"{build_base} && pnpm --filter medusa build",
         "pnpm --filter medusa start",
         "pnpm --filter medusa db:migrate",
         "/health", medusa_env),
        ("electro-storefront",
         f"{build_base} && pnpm --filter storefront build",
         "pnpm --filter storefront start",
         None,
         "/", storefront_env),
    ]
    for name, build, start, pre, health, env in defs:
        details = {
            "runtime": "node",
            "plan": "free",
            "region": REGION,
            "healthCheckPath": health,
            "envSpecificDetails": {"buildCommand": build, "startCommand": start},
        }
        if pre:
            details["envSpecificDetails"]["preDeployCommand"] = pre
        details["envVars"] = env
        payload = {
            "type": "web_service",
            "name": name,
            "ownerId": OWNER,
            "repo": REPO,
            "branch": "main",
            "autoDeploy": "yes",
            "serviceDetails": details,
        }
        s, b = api("POST", "/services", payload)
        print(f"create {name}:", s)
        if s not in (200, 201):
            print(json.dumps(b)[:1000]); return 1
        svc = b.get("service", {})
        url = svc.get("serviceDetails", {}).get("url")
        print(f"  id={svc.get('id')} url={url}")
        note(f"## Service {name}\n- id: {svc.get('id')}\n- url: {url}")
    return 0


def cmd_status():
    s, b = api("GET", "/services?limit=20")
    if s != 200:
        print("services failed", s); return 1
    for item in b:
        svc = item.get("service", {})
        if svc.get("name", "").startswith("electro-"):
            sid = svc.get("id")
            url = svc.get("serviceDetails", {}).get("url")
            s2, b2 = api("GET", f"/services/{sid}/deploys?limit=1")
            dep = (b2[0].get("deploy", {}) if isinstance(b2, list) and b2 else {})
            print(f"{svc.get('name')} | {sid} | {url} | deploy={dep.get('status')} @ {dep.get('finishedAt')}")
    return 0


if __name__ == "__main__":
    cmds = {"postgres": cmd_postgres, "redis": cmd_redis,
            "services": cmd_services, "status": cmd_status}
    if len(sys.argv) < 2 or sys.argv[1] not in cmds:
        print("usage: deploy-render.py [postgres|redis|services|status]")
        sys.exit(2)
    sys.exit(cmds[sys.argv[1]]())
