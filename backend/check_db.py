from sqlalchemy import create_engine, inspect

from database import DATABASE_URL

engine = create_engine(DATABASE_URL)
inspector = inspect(engine)
columns = inspector.get_columns('Vendas')

print("Colunas na tabela 'Vendas':")
for col in columns:
    print(f"- {col['name']} ({col['type']})")
