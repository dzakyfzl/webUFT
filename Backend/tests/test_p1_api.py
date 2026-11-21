"""P1 end-to-end policies on the approved PostgreSQL target, outer rollback only."""
from datetime import date
from io import BytesIO
import os
import secrets
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
from zipfile import ZipFile

from sqlalchemy import select, text

from app.audit import AuditRow
from app.p1.models import EventRow, FormRow, FormVersionRow, LoanRow, PhysicalAssetRow, SubmissionRow
import test_postgres_api as p0


@unittest.skipUnless(os.getenv("ERP_INTEGRATION_TEST") == "1", "approved PostgreSQL test is opt-in")
class P1ApiTest(unittest.TestCase):
    setUpClass = classmethod(p0.PostgresApiTest.setUpClass.__func__)
    tearDownClass = classmethod(p0.PostgresApiTest.tearDownClass.__func__)
    make_user = p0.PostgresApiTest.make_user
    sign_in = p0.PostgresApiTest.sign_in
    create_program = p0.PostgresApiTest.create_program
    create_task = p0.PostgresApiTest.create_task

    def setUp(self):
        p0.PostgresApiTest.setUp(self)
        self.storage = TemporaryDirectory(prefix="webuft-p1-test-")
        self.app.state.media_dir = self.storage.name

    def tearDown(self):
        p0.PostgresApiTest.tearDown(self)
        self.storage.cleanup()

    def ok(self, response, status=200):
        self.assertEqual(response.status_code, status, response.text[:1200])
        return response.json()

    def event(self, **changes):
        body = {"period_id": self.period_id, "title": "P1 Event", "starts_at": "2026-12-01T09:00:00+07:00",
            "ends_at": "2026-12-01T12:00:00+07:00", "status": "PUBLISHED"}
        return self.ok(self.client.post("/api/admin/events", json={**body, **changes}), 201)

    def published_form(self, event):
        path = f'/api/admin/events/{event["id"]}/form'
        form = self.ok(self.client.post(path, json={"use_template": True}), 201)
        form = self.ok(self.client.post(path + "/publish", json={"expected_version": form["version"]}))
        form = self.ok(self.client.post(path + "/acceptance", json={"expected_version": form["version"], "accepting": True}))
        return path, form

    def submission(self, event, form, answers=None, **changes):
        body = {"form_version_id": form["published_version_id"], "request_id": secrets.token_urlsafe(24), "answers": answers or {}}
        return self.client.post(f'/api/public/events/{event["id"]}/submissions', json={**body, **changes})

    def asset_access(self):
        self.ok(self.client.put("/api/admin/memberships", json={"user_id": self.root["id"],
            "period_id": self.period_id, "positions": ["CHAIR"], "unit_ids": [self.units["Departemen Asset dan Property"]]}))

    def asset(self, **changes):
        return self.ok(self.client.post("/api/admin/inventory/physical", params={"period_id": self.period_id},
            json={"asset_code": "P1-" + secrets.token_hex(5), "name": "Book", "category": "Buku", **changes}), 201)

    def test_physical_book_manual_borrower_double_loan_return_and_private_history(self):
        self.asset_access()
        asset = self.asset()
        path = "/api/admin/inventory/physical/" + asset["id"]
        params = {"period_id": self.period_id}
        body = {"transaction_type": "RENT", "borrower_name": "External borrower", "contact": "Private contact",
                "loan_on": "2026-01-01", "due_on": "2026-01-02", "rental_fee": "5000", "expected_version": 1}
        loan = self.ok(self.client.post(path + "/loans", params=params, json=body), 201)
        self.assertTrue(loan["overdue"])
        self.assertEqual(self.client.post(path + "/loans", params=params, json={**body, "expected_version": 2}).status_code, 409)
        self.assertEqual(self.client.post(path + "/archive", params=params, json={"expected_version": 2}).status_code, 409)
        self.ok(self.client.post(path + f'/loans/{loan["id"]}/return', params=params,
            json={"expected_version": 1, "returned_on": "2026-01-03", "condition_after": "RUSAK_RINGAN", "notes": "Lens damaged"}))
        item = next(row for row in self.ok(self.client.get("/api/admin/inventory/physical", params=params))["items"] if row["id"] == asset["id"])
        self.assertEqual(item["condition"], "RUSAK_RINGAN")
        self.assertEqual(item["availability_status"], "PERBAIKAN")
        self.assertEqual(len(self.ok(self.client.get(path + "/loans", params=params))["items"]), 1)
        self.ok(self.client.post(path + "/archive", params=params, json={"expected_version": item["version"]}))
        self.assertEqual(len(self.ok(self.client.get(path + "/loans", params=params))["items"]), 1)
        self.sign_in(self.external)
        self.assertEqual(self.client.get(path + "/loans", params=params).status_code, 403)
        response = self.client.get("/api/admin/inventory/physical", params={**params, "archived": True})
        self.assertNotIn("External borrower", response.text)
        self.assertNotIn("Private contact", response.text)

    def test_only_asset_members_manage_digital_and_reference_is_private(self):
        params = {"period_id": self.period_id}
        body = {"name": "Repository", "kind": "REPOSITORY", "url": "https://github.com/example/repo", "credential_reference": "Team vault / Repository"}
        self.assertEqual(self.client.post("/api/admin/inventory/digital", params=params, json=body).status_code, 403)
        self.asset_access()
        self.assertEqual(self.client.post("/api/admin/inventory/digital", params=params, json={**body, "credential_reference": "password=secret"}).status_code, 422)
        asset = self.ok(self.client.post("/api/admin/inventory/digital", params=params, json=body), 201)
        self.assertEqual(asset["credential_reference"], body["credential_reference"])
        self.sign_in(self.external)
        data = self.ok(self.client.get("/api/admin/inventory/digital", params=params))
        self.assertNotIn("credential_reference", data["items"][0])
        self.assertFalse(data["can_manage"])

    def test_documents_size_type_download_expenses_report_and_freeze(self):
        program = self.create_program()
        path = f'/api/admin/programs/{program["id"]}'
        payload = b"%PDF-1.7\nSynthetic receipt"
        document = self.ok(self.client.post(path + "/documents/upload?name=receipt.pdf", content=payload,
            headers={"Content-Type": "application/pdf"}), 201)
        self.assertEqual(self.client.get(path + f'/documents/{document["id"]}/download').content, payload)
        self.assertEqual(self.client.post(path + "/documents/upload?name=fake.pdf", content=b"<script>bad</script>", headers={"Content-Type": "application/pdf"}).status_code, 422)
        self.assertEqual(self.client.post(path + "/documents/upload?name=large.pdf", content=payload,
            headers={"Content-Type": "application/pdf", "Content-Length": str(20 * 1024 * 1024 + 1)}).status_code, 413)
        expense = self.ok(self.client.post(path + "/expenses", json={"name": "Paper", "amount": "12500", "paid_on": "2026-11-18", "attachment_id": document["id"]}), 201)
        totals = self.ok(self.client.get(path + "/expenses"))
        self.assertEqual(totals["actual_rupiah"], "12500")
        self.assertEqual(totals["difference_rupiah"], "-12500")
        self.ok(self.client.put(path + "/report", json={"narrative": "Test narrative", "achievements": "Done", "obstacles": "None"}))
        self.sign_in(self.external)
        self.assertEqual(self.client.get(path + f'/documents/{document["id"]}/download').status_code, 200)
        self.assertEqual(self.client.post(path + "/documents/links", json={"name": "Forbidden", "external_url": "https://drive.google.com/"}).status_code, 403)
        self.sign_in(self.root)
        other = self.create_program()
        self.assertEqual(self.client.post(f'/api/admin/programs/{other["id"]}/expenses', json={"name": "Wrong evidence", "amount": "1", "paid_on": "2026-11-18", "attachment_id": document["id"]}).status_code, 422)
        self.ok(self.client.post(path + "/close", json={"expected_version": 1, "confirmed_unfinished": True}))
        for route, method, body in (("/expenses", "POST", {"name": "Denied", "amount": "1", "paid_on": "2026-11-18"}),
            ("/report", "PUT", {"narrative": "Denied"}), ("/documents/links", "POST", {"name": "Denied", "external_url": "https://example.com/"})):
            self.assertEqual(self.client.request(method, path + route, json=body).status_code, 409)
        self.assertEqual(self.client.get(path + "/report").json()["narrative"], "Test narrative")
        self.client.cookies.clear()
        self.assertEqual(self.client.get(path + f'/documents/{document["id"]}/download').status_code, 401)

    def test_template_fully_editable_version_conflict_idempotency_and_private_exports(self):
        self.sign_in(self.hunting)
        event = self.event()
        path, form = self.published_form(event)
        questions = form["draft_schema"]["sections"][0]["questions"]
        self.assertEqual(questions[2]["options"], ["FIF", "FKS", "FIK", "FIT", "FRI", "FEB", "FTE"])
        self.assertEqual(questions[3]["placeholder"], "S1 Informatika")
        old_id = form["published_version_id"]
        answers = {questions[0]["id"]: "=SUM(1,1)", questions[1]["id"]: "00123"}
        request_id = secrets.token_urlsafe(24)
        first = self.ok(self.submission(event, form, answers, request_id=request_id), 201)
        second = self.ok(self.submission(event, form, {**answers, questions[3]["id"]: ""}, request_id=request_id), 201)
        self.assertEqual(first["receipt_id"], second["receipt_id"])
        schema = {"title": "Public workshop", "description": "", "sections": [{"id": "new-section", "title": "Contact", "questions": [{"id": "contact", "label": "Contact", "type": "SHORT_TEXT", "required": True}]}]}
        form = self.ok(self.client.put(path, json={"expected_version": form["version"], "schema": schema}))
        public = self.ok(self.client.get(f'/api/public/events/{event["id"]}'))
        self.assertEqual(public["registration"]["form_version_id"], old_id)
        form = self.ok(self.client.post(path + "/publish", json={"expected_version": form["version"]}))
        self.assertEqual(self.submission(event, form, {}, form_version_id=old_id).status_code, 409)
        self.assertEqual(self.submission(event, form, {}).status_code, 422)
        self.ok(self.submission(event, form, {"contact": "Visitor without account"}), 201)
        export_path = f'/api/admin/events/{event["id"]}/responses-export'
        csv = self.client.get(export_path, params={"form_version_id": old_id, "format": "csv"})
        self.assertEqual(csv.status_code, 200, csv.text[:500])
        self.assertIn("00123", csv.text)
        self.assertIn("'=SUM(1,1)", csv.text)
        excel = self.client.get(export_path, params={"form_version_id": old_id, "format": "xlsx"})
        self.assertEqual(excel.status_code, 200)
        with ZipFile(BytesIO(excel.content)) as workbook:
            sheet = workbook.read("xl/worksheets/sheet1.xml").decode()
            self.assertIn("00123", sheet)
            self.assertNotIn("<f>", sheet)
            self.assertIn('t="inlineStr"', sheet)
        xlsx = self.client.get(export_path, params={"form_version_id": old_id, "format": "xlsx"})
        self.assertEqual(xlsx.status_code, 200)
        with ZipFile(BytesIO(xlsx.content)) as archive:
            self.assertIn(b"00123", archive.read("xl/worksheets/sheet1.xml"))
            self.assertNotIn(b"<f>", archive.read("xl/worksheets/sheet1.xml"))
        self.sign_in(self.root)
        self.assertEqual(self.client.get(f'/api/admin/events/{event["id"]}/responses').status_code, 403)
        self.assertEqual(self.client.get(export_path, params={"form_version_id": old_id}).status_code, 403)
        self.sign_in(self.hunting)
        self.ok(self.client.put(f'/api/admin/events/{event["id"]}/staff', json={"user_ids": [self.external["id"]]}))
        self.sign_in(self.external)
        self.assertEqual(self.ok(self.client.get(f'/api/admin/events/{event["id"]}/responses'))["total"], 2)
        with self.test_database.transaction() as session:
            audit = session.scalars(select(AuditRow).where(AuditRow.action.like("submission.%"))).all()
            self.assertGreaterEqual(len(audit), 2)
            self.assertTrue(all("00123" not in str(row.after) and "SUM" not in str(row.after) for row in audit))

    def test_form_validation_honeypot_close_and_program_freeze(self):
        program = self.create_program()
        event = self.event(program_id=program["id"])
        path, form = self.published_form(event)
        self.assertEqual(self.submission(event, form, website="spam").status_code, 422)
        self.ok(self.client.post(path + "/acceptance", json={"expected_version": form["version"], "accepting": False}))
        self.assertEqual(self.submission(event, form).status_code, 409)
        self.ok(self.client.post(f'/api/admin/programs/{program["id"]}/close', json={"expected_version": 1, "confirmed_unfinished": True}))
        for suffix, method, body in (("", "PUT", {"expected_version": form["version"], "schema": form["draft_schema"]}),
            ("/publish", "POST", {"expected_version": form["version"]}),
            ("/acceptance", "POST", {"expected_version": form["version"], "accepting": True})):
            self.assertEqual(self.client.request(method, path + suffix, json=body).status_code, 409)
        self.assertFalse(self.ok(self.client.get(f'/api/public/events/{event["id"]}'))["registration"]["accepting"])

    def test_public_only_published_ownership_and_submission_rate_limit(self):
        draft = self.event(status="DRAFT")
        self.assertEqual(self.client.get(f'/api/public/events/{draft["id"]}').status_code, 404)
        event = self.event()
        _, form = self.published_form(event)
        self.sign_in(self.external)
        self.assertEqual(self.client.request("DELETE", f'/api/admin/events/{event["id"]}', json={"expected_version": 1}).status_code, 403)
        for index in range(20):
            self.ok(self.submission(event, form), 201)
        self.assertEqual(self.submission(event, form).status_code, 429)

    def test_shortlink_owner_inti_safe_destination_inactive_and_audit(self):
        self.sign_in(self.hunting)
        dns = [(2, 1, 6, "", ("93.184.216.34", 443))]
        body = {"period_id": self.period_id, "slug": "p1-" + secrets.token_hex(5), "destination_url": "https://example.com/workshop"}
        with patch("app.p1.validation.socket.getaddrinfo", return_value=dns):
            link = self.ok(self.client.post("/api/admin/links", json=body), 201)
            self.assertEqual(self.client.get("/api/public/links/" + link["slug"], follow_redirects=False).status_code, 307)
            self.sign_in(self.external)
            self.assertEqual(self.client.patch("/api/admin/links/" + link["id"], json=body).status_code, 403)
            self.sign_in(self.root)
            self.ok(self.client.patch("/api/admin/links/" + link["id"], json={**body, "active": False, "expected_version": 1}))
            self.assertEqual(self.client.get("/api/shortlink/r/" + link["slug"]).status_code, 404)
            for url in ("javascript:alert(1)", "http://127.0.0.1/", "http://169.254.169.254/", "http://2130706433/", "https://user:password@example.com/"):
                self.assertEqual(self.client.post("/api/admin/links", json={**body, "slug": "unsafe-" + secrets.token_hex(4), "destination_url": url}).status_code, 422)
        with patch("app.p1.validation.socket.getaddrinfo", return_value=[(2, 1, 6, "", ("10.0.0.1", 443))]):
            self.assertEqual(self.client.post("/api/admin/links", json={**body, "slug": "private-" + secrets.token_hex(4)}).status_code, 422)

    def test_published_form_schema_is_database_immutable(self):
        from sqlalchemy.exc import DBAPIError
        event = self.event()
        _, form = self.published_form(event)
        with self.assertRaises(DBAPIError):
            with self.test_database.transaction() as session:
                session.execute(text("UPDATE erp_ukm.registration_form_versions SET schema = '{}'::jsonb WHERE id=:id"),
                                {"id": form["published_version_id"]})
        self.assertEqual(self.ok(self.client.get(f'/api/public/events/{event["id"]}'))["registration"]["schema"]["title"], event["title"])

    def test_period_archive_freezes_all_p1_period_mutations(self):
        program = self.create_program()
        event = self.event(program_id=program["id"])
        form_path, form = self.published_form(event)
        successor = self.ok(self.client.post("/api/admin/periods", json={"name": "P1 successor " + secrets.token_hex(5)}), 201)
        self.ok(self.client.put("/api/admin/memberships", json={"user_id": self.root["id"], "period_id": successor["id"], "positions": ["CHAIR"]}))
        self.ok(self.client.post(f'/api/admin/periods/{self.period_id}/archive', json={"successor_period_id": successor["id"], "confirmed": True}))
        cases = [
            ("POST", f'/api/admin/programs/{program["id"]}/documents/links', {"name": "Denied", "external_url": "https://example.com/"}),
            ("POST", f'/api/admin/programs/{program["id"]}/expenses', {"name": "Denied", "amount": "1", "paid_on": "2026-11-18"}),
            ("PUT", f'/api/admin/programs/{program["id"]}/report', {"narrative": "Denied"}),
            ("POST", form_path + "/publish", {"expected_version": form["version"]}),
            ("POST", form_path + "/acceptance", {"expected_version": form["version"], "accepting": True}),
            ("DELETE", f'/api/admin/events/{event["id"]}', {"expected_version": 1}),
            ("POST", "/api/admin/links", {"period_id": self.period_id, "slug": "archive-denied", "destination_url": "https://example.com/"}),
        ]
        for method, path, body in cases:
            with self.subTest(path=path):
                self.assertEqual(self.client.request(method, path, json=body).status_code, 409)
        self.assertEqual(self.submission(event, form).status_code, 409)
        self.assertFalse(self.ok(self.client.get(f'/api/public/events/{event["id"]}'))["registration"]["accepting"])
