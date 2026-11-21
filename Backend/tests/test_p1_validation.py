from io import BytesIO
import json
from pathlib import Path
import tarfile
from tempfile import TemporaryDirectory
import unittest
from zipfile import ZipFile

from app.errors import ApiError
from app.p1.exports import csv_stream, excel_stream
from app.p1.forms import schema_value, template, validate_answers
from scripts.backup import backup_media


class P1ValidationTest(unittest.TestCase):
    def test_media_path_is_loaded_from_runtime_configuration(self):
        from app.config import Settings
        config = Settings.from_environment({"DATABASE_URL": "postgresql+psycopg://database.invalid/unused", "ERP_MEDIA_DIR": "/persistent/private-media"})
        self.assertEqual(config.media_dir, "/persistent/private-media")

    def test_template_can_be_completely_removed_and_nim_keeps_leading_zero(self):
        value = schema_value(template())
        nim = value["sections"][0]["questions"][1]["id"]
        self.assertEqual(validate_answers(value, {nim: "00123"})[nim], "00123")
        self.assertEqual(schema_value({"title": "Anyone", "sections": []})["sections"], [])
        self.assertEqual(validate_answers({"sections": []}, {}), {})

    def test_unique_ids_limits_choices_and_required_are_enforced(self):
        value = template()
        field = value["sections"][0]["questions"][0]
        value["sections"][0]["questions"].append(field.copy())
        with self.assertRaises(ApiError):
            schema_value(value)
        value = schema_value(template())
        field = value["sections"][0]["questions"][0]
        field["required"] = True
        with self.assertRaises(ApiError):
            validate_answers(value, {field["id"]: "  "})
        dropdown = value["sections"][0]["questions"][2]
        with self.assertRaises(ApiError):
            validate_answers(value, {field["id"]: "Visitor", dropdown["id"]: "Unexpected"})

    def test_csv_formula_protection_and_excel_string_cells(self):
        rows = [["NIM", "Name"], ["00123", "=SUM(1,1)"], ["00999", "<Visitor>"]]
        csv = "".join(csv_stream(iter(rows)))
        self.assertIn("'=SUM", csv)
        with ZipFile(BytesIO(b"".join(excel_stream(iter(rows))))) as archive:
            sheet = archive.read("xl/worksheets/sheet1.xml").decode()
            self.assertIn("00123", sheet)
            self.assertIn('t="inlineStr"', sheet)
            self.assertNotIn("<f>", sheet)
            self.assertIn("&lt;Visitor&gt;", sheet)

    def test_media_backup_roundtrip_has_owner_only_artifacts_and_hash_manifest(self):
        with TemporaryDirectory(prefix="webuft-media-backup-test-") as directory:
            root = Path(directory)
            media = root / "media"
            media.mkdir()
            (media / "fixture-key").write_bytes(b"Synthetic receipt")
            dump = root / "database.dump"
            dump.write_bytes(b"Synthetic test marker, not a PostgreSQL dump")
            archive, manifest = backup_media(media, dump)
            self.assertEqual(archive.stat().st_mode & 0o777, 0o600)
            self.assertEqual(manifest.stat().st_mode & 0o777, 0o600)
            value = json.loads(manifest.read_text())
            self.assertEqual(value["media"][0]["size"], 17)
            with tarfile.open(archive) as source:
                self.assertEqual(source.extractfile("fixture-key").read(), b"Synthetic receipt")
