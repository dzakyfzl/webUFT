from alembic import context

from app.db import make_engine
from app.metadata import Base
from app.runtime import settings


def include_name(name, type_, parent_names):
    if type_ == "schema":
        return name == "erp_ukm"
    return True


if context.is_offline_mode():
    context.configure(dialect_name="postgresql", target_metadata=Base.metadata,
                      literal_binds=True, version_table="erp_ukm_alembic_version")
    with context.begin_transaction():
        context.run_migrations()
else:
    engine = make_engine(settings())
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=Base.metadata,
                          include_schemas=True, include_name=include_name,
                          version_table="erp_ukm_alembic_version", compare_type=True)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()
