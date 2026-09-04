nimport ast
from pathlib import Path


def modules(directory):
    return sorted(Path(directory).glob("*.py"))


def imported_roots(path):
    tree = ast.parse(path.read_text(), filename=str(path))
    roots = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            roots.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            roots.add(node.module.split(".")[0])
    return roots, tree


def test_routers_do_not_access_sqlalchemy_or_models():
    forbidden_attributes = {"execute", "query", "add", "delete", "commit", "rollback", "refresh"}
    for path in modules("app/routers"):
        roots, tree = imported_roots(path)
        assert "sqlalchemy" not in roots, path
        assert not any(isinstance(node, ast.ImportFrom) and node.module and node.module.startswith("app.models") for node in ast.walk(tree)), path
        assert not any(isinstance(node, ast.Attribute) and node.attr in forbidden_attributes and isinstance(node.value, ast.Name) and node.value.id in {"db", "session"} for node in ast.walk(tree)), path


def test_repositories_do_not_depend_on_fastapi_or_authorization():
    for path in modules("app/repositories"):
        roots, _ = imported_roots(path)
        assert "fastapi" not in roots, path
        source = path.read_text()
        assert "Unauthorized" not in source, path
        assert 'user.get("role")' not in source, path


def test_services_do_not_construct_sqlalchemy_queries():
    query_names = {"select", "insert", "update", "delete", "func"}
    for path in modules("app/services"):
        roots, tree = imported_roots(path)
        assert "sqlalchemy" not in roots, path
        assert not any(isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in query_names for node in ast.walk(tree)), path


def test_models_and_schemas_remain_separate():
    for path in modules("app/models"):
        roots, _ = imported_roots(path)
        assert "pydantic" not in roots, path
    for path in modules("app/schemas"):
        source = path.read_text()
        assert "sqlalchemy" not in source, path
        assert "app.models" not in source, path
