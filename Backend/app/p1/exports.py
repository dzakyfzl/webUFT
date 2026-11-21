"""Bounded CSV/XLSX exports with string cells and no formula execution."""
import csv
from io import StringIO
from tempfile import SpooledTemporaryFile
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile


def csv_cell(value):
    value = str(value if value is not None else "")
    return "'" + value if value.lstrip().startswith(("=", "+", "-", "@")) or value.startswith(("\t", "\r", "\n")) else value


def csv_stream(rows):
    yield "\ufeff"
    buffer = StringIO()
    writer = csv.writer(buffer)
    for row in rows:
        buffer.seek(0)
        buffer.truncate(0)
        writer.writerow([csv_cell(value) for value in row])
        yield buffer.getvalue()


def excel_stream(rows):
    with SpooledTemporaryFile(max_size=1024 * 1024, mode="w+b") as output:
        with ZipFile(output, "w", compression=ZIP_DEFLATED) as archive:
            archive.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>')
            archive.writestr("_rels/.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
            archive.writestr("xl/workbook.xml", '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Responses" sheetId="1" r:id="rId1"/></sheets></workbook>')
            archive.writestr("xl/_rels/workbook.xml.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>')
            with archive.open("xl/worksheets/sheet1.xml", "w") as sheet:
                sheet.write(b'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>')
                for number, row in enumerate(rows, 1):
                    cells = []
                    for value in row:
                        # XML 1.0 excludes control characters; cells are inline strings.
                        value = "".join(c for c in str(value if value is not None else "") if ord(c) >= 32 or c in "\n\r\t")
                        cells.append('<c t="inlineStr"><is><t xml:space="preserve">' + escape(value) + '</t></is></c>')
                    sheet.write((f'<row r="{number}">' + "".join(cells) + '</row>').encode())
                sheet.write(b'</sheetData></worksheet>')
        output.seek(0)
        while chunk := output.read(65536):
            yield chunk
