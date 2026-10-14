import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError

import verify_env


class VerifyEnvTests(unittest.TestCase):
    def valid_values(self):
        return {
            "EMAIL_PROVIDER": "brevo",
            "BREVO_API_KEY": "private-api-key-never-print",
            "EMAIL_FROM": "sender@example.test",
            "APP_URL": "https://kanban.example.test",
            "JWT_SECRET": "private-jwt-secret-never-print-123456",
            "TRUST_PROXY_HOPS": "1",
        }

    def parse(self, text):
        report = verify_env.Report()
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / ".env"
            path.write_text(text, encoding="utf-8")
            values = verify_env.read_env(path, report)
        return values, report

    def test_parser_handles_quotes_comments_export_and_literal_dollars(self):
        values, report = self.parse(
            "\ufeff# comment\n"
            "export EMAIL_FROM_NAME=\"Kanban team\" # comment\n"
            "JWT_SECRET='literal$secret#with=punctuation' \n"
            "EMAIL_PROVIDER=console # comment\n"
        )
        self.assertEqual(report.errors, 0)
        self.assertEqual(values["EMAIL_FROM_NAME"], "Kanban team")
        self.assertEqual(values["JWT_SECRET"], "literal$secret#with=punctuation")
        self.assertEqual(values["EMAIL_PROVIDER"], "console")

    def test_parser_rejects_duplicates_interpolation_and_malformed_quotes(self):
        for text in ("A=one\nA=two", "A=$" + "{SECRET}", "A=\"unterminated", "A=\"valid\" trailing", "not-an-assignment"):
            with self.subTest(text=text):
                _, report = self.parse(text)
                self.assertGreater(report.errors, 0)

    def test_production_rejects_console_http_and_default_secret(self):
        values = self.valid_values()
        values.update(EMAIL_PROVIDER="console", APP_URL="http://localhost",
                      JWT_SECRET="replace-with-a-random-secret-of-at-least-32-characters")
        report = verify_env.Report()
        verify_env.validate(values, report, production=True)
        self.assertEqual(report.errors, 3)

    def test_origin_does_not_accept_hidden_paths_credentials_or_invalid_ports(self):
        for origin in ("https://user:pass@example.test", "https://example.test/path",
                       "https://example.test/?", "https://example.test/#",
                       "https://example.test:70000", "https://bad host"):
            values = self.valid_values()
            values["APP_URL"] = origin
            report = verify_env.Report()
            verify_env.validate(values, report)
            self.assertGreater(report.errors, 0)

    def test_offline_validation_never_prints_values_and_makes_no_network_requests(self):
        values = self.valid_values()
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / ".env"
            path.write_text("\n".join(f"{key}={value}" for key, value in values.items()))
            output = io.StringIO()
            with patch("verify_env.brevo_get") as network, contextlib.redirect_stdout(output):
                self.assertEqual(verify_env.main(["--env", str(path)]), 0)
            network.assert_not_called()
        for value in values.values():
            if len(value) > 10:
                self.assertNotIn(value, output.getvalue())

    def test_missing_file_fails_without_traceback(self):
        with tempfile.TemporaryDirectory() as directory:
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(verify_env.main(["--env", str(Path(directory) / "missing")]), 1)

    def test_live_check_validates_transactional_service_and_matching_active_sender(self):
        values = self.valid_values()
        report = verify_env.Report()
        with patch("verify_env.brevo_get", side_effect=[
            {"relay": {"enabled": True}},
            {"senders": [{"email": "SENDER@example.test", "active": True}]},
        ]) as network:
            verify_env.check_brevo(values, report)
        self.assertEqual(report.errors, 0)
        self.assertEqual([call.args[0] for call in network.call_args_list], ["account", "senders"])

    def test_live_check_rejects_inactive_service_and_missing_sender(self):
        report = verify_env.Report()
        with patch("verify_env.brevo_get", side_effect=[{"relay": {"enabled": False}}, {"senders": []}]):
            verify_env.check_brevo(self.valid_values(), report)
        self.assertEqual(report.errors, 2)

    def test_explicit_partial_check_skips_sender_endpoint_and_warns(self):
        report = verify_env.Report()
        with patch("verify_env.brevo_get", return_value={"relay": {"enabled": True}}) as network:
            verify_env.check_brevo(self.valid_values(), report, skip_sender_check=True)
        network.assert_called_once_with("account", self.valid_values()["BREVO_API_KEY"])
        self.assertEqual(report.errors, 0)
        self.assertTrue(any(level == "WARN" and "NOT checked" in message for level, message in report.items))

    def test_http_failures_do_not_expose_response_contents_or_keys(self):
        report = verify_env.Report()
        failure = HTTPError("https://api.brevo.com", 401, "secret-details", {}, None)
        with patch("verify_env.brevo_get", side_effect=failure):
            verify_env.check_brevo(self.valid_values(), report)
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            report.print()
        self.assertEqual(report.errors, 1)
        self.assertNotIn("secret-details", output.getvalue())
        self.assertNotIn("private-api-key", output.getvalue())

    def test_ip_restriction_is_identified_without_printing_ip_or_credentials(self):
        message = "We detected an unrecognised IP address 192.0.2.123; private-api-key-never-print"
        failure = HTTPError("https://api.brevo.com/v3/account", 401, "Unauthorized", {},
                            io.BytesIO(json.dumps({"code": "unauthorized", "message": message}).encode()))
        report = verify_env.Report()
        with patch("verify_env.brevo_get", side_effect=failure):
            verify_env.check_brevo(self.valid_values(), report)
        output = " ".join(message for _, message in report.items)
        self.assertIn("GET /v3/account returned HTTP 401", output)
        self.assertIn("IP restriction", output)
        self.assertNotIn("192.0.2.123", output)
        self.assertNotIn("private-api-key", output)

    def test_invalid_key_gets_specific_guidance(self):
        failure = HTTPError("https://api.brevo.com", 401, "Unauthorized", {},
                            io.BytesIO(b'{"code":"unauthorized","message":"Key not found"}'))
        self.assertIn("rejected API key", verify_env.brevo_error_hint(failure))

    def test_permissions_error_identifies_sender_endpoint(self):
        failure = HTTPError("https://api.brevo.com", 403, "Forbidden", {}, io.BytesIO(b"not-json"))
        report = verify_env.Report()
        with patch("verify_env.brevo_get", side_effect=[{"relay": {"enabled": True}}, failure]):
            verify_env.check_brevo(self.valid_values(), report)
        output = " ".join(message for _, message in report.items)
        self.assertIn("GET /v3/senders returned HTTP 403", output)
        self.assertIn("permissions", output)


if __name__ == "__main__":
    unittest.main()
