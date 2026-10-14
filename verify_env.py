#!/usr/bin/env python3
"""Validate Kanban's .env using Python 3.10+ and the standard library.

Offline by default. --check-brevo makes read-only requests to Brevo; it never
sends an email. Values, API responses, and exception details are never printed.
"""

import argparse
import json
import re
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


class Report:
    def __init__(self):
        self.items = []

    def add(self, level, message):
        self.items.append((level, message))

    @property
    def errors(self):
        return sum(level == "ERROR" for level, _ in self.items)

    def print(self):
        for level, message in self.items:
            print(f"[{level}] {message}")
        warnings = sum(level == "WARN" for level, _ in self.items)
        print(f"\n{'FAIL' if self.errors else 'PASS'}: {self.errors} error(s), {warnings} warning(s).")


def read_env(path, report):
    """Parse single-line dotenv assignments without executing or expanding them."""
    try:
        lines = path.read_text(encoding="utf-8-sig").splitlines()
    except (OSError, UnicodeError):
        report.add("ERROR", "Cannot read the .env file as UTF-8. Check its path and permissions.")
        return {}
    values = {}
    for number, line in enumerate(lines, 1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        match = re.fullmatch(r"(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)", line)
        if not match:
            report.add("ERROR", f"Line {number}: expected KEY=value. Contents are hidden.")
            continue
        key, raw = match.groups()
        quote = raw[:1] if raw[:1] in ("'", '"') else None
        if quote:
            pattern = r"'((?:\\.|[^'\\])*)'(.*)" if quote == "'" else r'"((?:\\.|[^"\\])*)"(.*)'
            quoted = re.fullmatch(pattern, raw)
            if not quoted or (quoted[2].strip() and not quoted[2].strip().startswith("#")):
                report.add("ERROR", f"Line {number} ({key}): invalid quotes; use a single-line value.")
                continue
            value = quoted[1]
            if quote == "'":
                value = value.replace("\\'", "'")
            else:
                escapes = {"n": "\n", "r": "\r", "t": "\t", '"': '"', "\\": "\\"}
                value = re.sub(r"\\([nrt\"\\])", lambda m: escapes[m[1]], value)
        else:
            value = re.split(r"\s+#", raw, maxsplit=1)[0].strip()
        if "$" in value and quote != "'":
            report.add("ERROR", f"Line {number} ({key}): interpolation is not checked. Use single quotes for a literal dollar sign.")
        if key in values:
            report.add("ERROR", f"Line {number}: duplicate {key}; keep a single assignment.")
        if any(ord(char) < 32 or ord(char) == 127 for char in value):
            report.add("ERROR", f"Line {number} ({key}): control characters are not allowed.")
        values[key] = value
    return values


def placeholder(value):
    return value.lower() in {
        "changeme", "change-me-in-production", "dev-secret-change-in-production",
        "replace-with-a-random-secret-of-at-least-32-characters", "your-secret-here",
        "your-api-key", "your-api-key-here", "your-brevo-api-key", "replace-me",
    }


def validate(values, report, production=False):
    production = production or values.get("NODE_ENV") == "production"
    provider = values.get("EMAIL_PROVIDER") or "brevo"
    if provider not in ("brevo", "console"):
        report.add("ERROR", "EMAIL_PROVIDER must be brevo or console.")
    elif production and provider == "console":
        report.add("ERROR", "Production requires EMAIL_PROVIDER=brevo.")
    else:
        report.add("OK", "Email provider selection is valid.")

    origin = values.get("APP_URL", "")
    try:
        url = urlsplit(origin)
        url.port  # Validate the port, including malformed/out-of-range ports.
        valid = (url.scheme in ("http", "https") and url.hostname and
                 not url.username and not url.password and url.path in ("", "/") and
                 "?" not in origin and "#" not in origin and not re.search(r"\s|\\", origin))
    except ValueError:
        valid = False
    if not valid:
        report.add("ERROR", "APP_URL must be an explicit http(s) frontend origin without a path, credentials, query, or fragment.")
    elif production and url.scheme != "https":
        report.add("ERROR", "APP_URL must use HTTPS in production.")
    elif production and (url.hostname in ("localhost", "0.0.0.0", "::1") or url.hostname.startswith("127.")):
        report.add("ERROR", "Production APP_URL must be a public frontend origin, not a loopback address.")
    else:
        report.add("OK", "APP_URL has a valid origin format. Confirm it matches where you open the frontend.")

    secret = values.get("JWT_SECRET", "")
    if len(secret) < 32 or placeholder(secret) or len(set(secret)) < 4 or secret != secret.strip():
        report.add("ERROR", "JWT_SECRET must be a non-placeholder random secret of at least 32 characters, without surrounding whitespace.")
    else:
        report.add("OK", "JWT_SECRET passes length and placeholder checks; randomness cannot be verified.")

    if provider == "brevo":
        key = values.get("BREVO_API_KEY", "")
        if not key or placeholder(key) or re.search(r"\s", key):
            report.add("ERROR", "BREVO_API_KEY must be set to your API key, without whitespace.")
        else:
            report.add("OK", "BREVO_API_KEY is present. Authentication requires --check-brevo.")
        sender = values.get("EMAIL_FROM", "")
        if len(sender) > 254 or not re.fullmatch(r"[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+", sender):
            report.add("ERROR", "EMAIL_FROM must be a plain email address, without a display name or whitespace.")
        else:
            report.add("OK", "EMAIL_FROM has a valid address format. Sender activation requires --check-brevo.")
    elif provider == "console":
        report.add("OK", "Console mode prints development emails to server logs; Brevo credentials are optional.")

    if "EMAIL_FROM_NAME" in values and not values["EMAIL_FROM_NAME"].strip():
        report.add("WARN", "EMAIL_FROM_NAME is empty; omit it to use the Kanban default.")
    hops = values.get("TRUST_PROXY_HOPS", "")
    if hops and not re.fullmatch(r"[0-9]+", hops):
        report.add("ERROR", "TRUST_PROXY_HOPS must be a non-negative integer.")
    elif hops and int(hops) != (2 if production else 1):
        report.add("WARN", "TRUST_PROXY_HOPS differs from this project's Compose default. Confirm it matches your trusted proxy chain.")
    elif not hops:
        report.add("OK", "TRUST_PROXY_HOPS is unset; Compose supplies its default. Standalone Node trusts no proxy by default.")
    else:
        report.add("OK", "TRUST_PROXY_HOPS matches this project's Compose default.")


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None  # Never forward the API key to another destination.


def brevo_get(path, key):
    request = Request("https://api.brevo.com/v3/" + path,
                      headers={"api-key": key, "Accept": "application/json"}, method="GET")
    with build_opener(NoRedirect()).open(request, timeout=10) as response:
        data = json.loads(response.read(1024 * 1024))
    if not isinstance(data, dict):
        raise ValueError("Unexpected response")
    return data


def brevo_error_hint(error):
    """Classify provider errors without displaying their potentially private text."""
    try:
        details = json.loads(error.read(16384))
        text = " ".join(details.get(field, "") for field in ("code", "message")
                        if isinstance(details.get(field), str)).lower()
        text = re.sub(r"[_-]", " ", text)
    except (OSError, ValueError, TypeError, AttributeError):
        text = ""
    finally:
        error.close()
    if re.search(r"\bip\b", text) and any(word in text for word in (
            "unrecogn", "unauthor", "not author", "whitelist", "blocked", "allowlist", "allow list")):
        return "Brevo reports an IP restriction. In Settings > Security > Authorized IPs, approve the trusted public outbound IP for the machine running this check. Check Brevo's security notification email too."
    if "key" in text and any(word in text for word in ("not found", "invalid", "expired", "revoked", "disabled", "deactivated")):
        return "Brevo reports a rejected API key. Copy the complete active key from SMTP & API > API Keys & MCP; an SMTP key or masked key suffix will not work. Check expiry or generate a replacement key."
    if error.code == 401:
        return "Brevo rejected authentication. Check the complete API key (not an SMTP key), key expiry, and authorized IP addresses."
    if error.code == 403:
        return "Brevo forbids access to this endpoint. Check account/API permissions and authorized IP addresses."
    return "Check Brevo's service status or account settings. Response contents are hidden."


def check_brevo(values, report, skip_sender_check=False):
    """Read-only checks: credentials, relay activation, and configured sender."""
    endpoint = "account"
    try:
        account = brevo_get("account", values["BREVO_API_KEY"])
        report.add("OK", "Brevo accepted the API key.")
        if account.get("relay", {}).get("enabled") is not True:
            report.add("ERROR", "Brevo transactional email is not enabled. Check your account's activation status.")
        else:
            report.add("OK", "Brevo transactional email is enabled.")
        if skip_sender_check:
            report.add("WARN", "Sender activation was NOT checked. Confirm EMAIL_FROM is verified in Brevo's sender settings, then test signup email delivery.")
            return
        endpoint = "senders"
        senders = brevo_get(endpoint, values["BREVO_API_KEY"]).get("senders", [])
        matching = [sender for sender in senders if sender.get("email", "").lower() == values["EMAIL_FROM"].lower()]
        if not matching:
            report.add("ERROR", "EMAIL_FROM is not registered as a sender in this Brevo account.")
        elif not any(sender.get("active") is True for sender in matching):
            report.add("ERROR", "The configured Brevo sender is inactive. Complete sender verification.")
        else:
            report.add("OK", "The configured Brevo sender is active.")
    except HTTPError as error:
        report.add("ERROR", f"Brevo GET /v3/{endpoint} returned HTTP {error.code}. {brevo_error_hint(error)}")
        if endpoint == "senders" and error.code == 403:
            report.add("WARN", "The API key worked for /v3/account, but sender listing was denied. This does not establish whether /v3/smtp/email can send. Check the sender in Brevo's dashboard; --skip-sender-check makes this an explicit partial check.")
    except (URLError, OSError, ValueError, TypeError, AttributeError):
        report.add("ERROR", "Brevo check failed: network/TLS error, timeout, or unexpected response. Details are hidden.")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env", type=Path, default=Path(__file__).resolve().parent / ".env", help="File to check (default: project .env)")
    parser.add_argument("--production", action="store_true", help="Require production settings, including HTTPS and Brevo")
    parser.add_argument("--check-brevo", action="store_true", help="Authenticate with Brevo and check sender activation using read-only GET requests")
    parser.add_argument("--skip-sender-check", action="store_true", help="With --check-brevo, check only credentials and relay status; sender activation remains unverified")
    args = parser.parse_args(argv)
    if args.skip_sender_check and not args.check_brevo:
        parser.error("--skip-sender-check requires --check-brevo")
    report = Report()
    print("Checking the .env file only; shell overrides and running containers are not inspected. Values are hidden.\n")
    values = read_env(args.env, report)
    if not report.errors:
        validate(values, report, args.production)
    if args.check_brevo and not report.errors:
        if (values.get("EMAIL_PROVIDER") or "brevo") != "brevo":
            report.add("ERROR", "--check-brevo requires EMAIL_PROVIDER=brevo.")
        else:
            check_brevo(values, report, skip_sender_check=args.skip_sender_check)
    elif args.check_brevo:
        report.add("WARN", "Online checks skipped until the file errors are fixed.")
    report.print()
    if not report.errors:
        print("Email delivery and DNS authentication still need an end-to-end signup test.")
    return 1 if report.errors else 0


if __name__ == "__main__":
    sys.exit(main())
