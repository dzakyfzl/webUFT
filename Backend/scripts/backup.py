"""Create an owner-only local PostgreSQL backup before the ERP baseline."""

from datetime import datetime, timezone
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import tarfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.runtime import settings
from sqlalchemy.engine import make_url


def backup_media(source: Path, dump: Path):
    source = source.resolve(strict=True)
    manifest = {"database_backup": dump.name, "media": []}
    archive_path = Path(str(dump) + ".media.tar.gz")
    descriptor = os.open(archive_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(descriptor, "wb") as output, tarfile.open(fileobj=output, mode="w:gz") as archive:
        for path in sorted(source.iterdir()):
            if path.is_symlink() or not path.is_file():
                raise ValueError("Media storage must contain regular files only")
            digest = hashlib.sha256()
            with path.open("rb") as file:
                while chunk := file.read(65536):
                    digest.update(chunk)
            manifest["media"].append({"storage_key": path.name, "size": path.stat().st_size, "sha256": digest.hexdigest()})
            archive.add(path, arcname=path.name, recursive=False)
    manifest_path = Path(str(dump) + ".manifest.json")
    descriptor = os.open(manifest_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(descriptor, "w") as output:
        json.dump(manifest, output, indent=2)
        output.write("\n")
    return archive_path, manifest_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--media-dir", type=Path)
    parser.add_argument("--quiesced", action="store_true", help="Operator confirms application writes are stopped")
    args = parser.parse_args()
    if args.media_dir and not args.quiesced:
        parser.error("Paired DB/media backup requires --quiesced after stopping application writes")
    config = settings()
    url = make_url(config.database_url)
    connection = {"PGHOST": url.host or "", "PGPORT": str(url.port or 5432),
                  "PGUSER": url.username or "", "PGPASSWORD": url.password or "",
                  "PGDATABASE": url.database or "", "PGCONNECT_TIMEOUT": "5"}
    descriptor, name = tempfile.mkstemp(prefix="webuft-before-erp-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S") + "-", suffix=".dump")
    with os.fdopen(descriptor, "wb") as output:
        result = subprocess.run(["pg_dump", "--format=custom", "--no-owner", "--no-acl"],
            env={**os.environ, **connection}, stdout=output, stderr=subprocess.PIPE)
    if result.returncode:
        raise SystemExit("Backup failed; connection details suppressed. Do not migrate.")
    print("Local backup created with mode 0600:", name)
    if args.media_dir:
        archive, manifest = backup_media(args.media_dir, Path(name))
        print("Owner-only media archive:", archive)
        print("Owner-only pair manifest:", manifest)
