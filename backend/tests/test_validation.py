import unittest

from backend.app.models import SiteSpec
from backend.app.services.site_generator import validate_manifest


GOOD_HTML = """<!doctype html><html><head><title>Acme</title><meta name="description" content="Acme tools"><link rel="stylesheet" href="styles.css"></head><body><a class="skip-link" href="#main">Skip</a><main id="main"><section id="hero"><h1>Acme</h1></section><section id="features"><h2>Features</h2></section><section id="social-proof"><h2>Proof</h2></section><section id="deep-dive"><h2>Details</h2></section><section id="faq"><h2>FAQ</h2></section><section id="cta-final"><h2>Contact</h2></section></main><script src="script.js"></script></body></html>"""


class ValidationTests(unittest.TestCase):
    def spec(self):
        return SiteSpec(brand="Acme", business_description="A useful product for modern teams.")

    def test_minimal_brief_does_not_require_audience(self):
        spec = self.spec()
        self.assertIsNone(spec.target_audience)

    def manifest(self, html=GOOD_HTML, js="console.log('ready')"):
        return {"files": [{"path": "index.html", "content": html}, {"path": "styles.css", "content": "body{margin:0}"}, {"path": "script.js", "content": js}]}

    def test_accepts_complete_safe_site(self):
        ok, errors, checks = validate_manifest(self.manifest(), self.spec())
        self.assertTrue(ok, errors)
        self.assertTrue(all(checks.values()))

    def test_rejects_placeholder_link(self):
        html = GOOD_HTML.replace("</main>", '<a href="#">Broken</a></main>')
        ok, errors, _ = validate_manifest(self.manifest(html), self.spec())
        self.assertFalse(ok)
        self.assertTrue(any("href=#" in item for item in errors))

    def test_rejects_javascript_network_access(self):
        ok, errors, _ = validate_manifest(self.manifest(js="fetch('/secret')"), self.spec())
        self.assertFalse(ok)
        self.assertTrue(any("network" in item for item in errors))


if __name__ == "__main__":
    unittest.main()
