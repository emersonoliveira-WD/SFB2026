from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Table, func
from sqlalchemy.orm import relationship
from database import Base

vendas_produtos = Table('vendas_produtos', Base.metadata,
    Column('CodV', Integer, ForeignKey('Vendas.CodV')),
    Column('CodP', Integer, ForeignKey('Produtos.CodP')),
    Column('Quantidade', Integer),
    Column('ValorP', String(10))
)

class LastModified(Base):
    __tablename__ = 'last_modified'

    id = Column(Integer, primary_key=True, index=True)
    table_name = Column(String(255), nullable=False)
    modified_at = Column(DateTime, default=func.now(), onupdate=func.now())

class FornecedorModel(Base):
    __tablename__ = 'Fornecedores'
    CodF = Column(Integer, primary_key=True, index=True)
    RazaoSocial = Column(String(255), unique=True, nullable=False)
    UF = Column(String(2))
    Cidade = Column(String(255))
    Logradouro = Column(String(255))
    Numero = Column(Integer)
    CNPJ = Column(String(20), unique=True, nullable=False)
    Telefone0 = Column(String(20), nullable=False)
    Telefone1 = Column(String(20))
    Contato = Column(String(255))
    Complemento = Column(String(255))
    IC = Column(String(20))
    Observacoes = Column(String)
    produtos = relationship('ProdutoModel', back_populates='fornecedor')
    Esconder = Column(Integer, default=0)
    Data = Column(DateTime, default=func.now(), nullable=False)

class ProdutoModel(Base):
    __tablename__ = 'Produtos'
    CodP = Column(Integer, primary_key=True, index=True)
    Nome = Column(String(255), nullable=False)
    CodF = Column(Integer, ForeignKey('Fornecedores.CodF'))
    PrecoCompra = Column(Float, nullable=False)
    PrecoVenda = Column(Float, nullable=False)
    ICMS = Column(Float, nullable=False)
    Margem = Column(Float, nullable=False)
    PrecoAntigo = Column(Float, nullable=False)
    DataPreco = Column(DateTime, default=func.now(), nullable=False)
    Observacoes = Column(String(250))
    Codigo = Column(String(50))
    fornecedor = relationship('FornecedorModel', back_populates='produtos')
    vendas = relationship('VendaModel', secondary=vendas_produtos, back_populates='produtos')
    Esconder = Column(Integer, default=0)
    Data = Column(DateTime, default=func.now(), nullable=False)

class ClienteModel(Base):
    __tablename__ = 'Clientes'
    CodC = Column(Integer, primary_key=True, index=True)
    Nome = Column(String(255), nullable=False)
    Documento = Column(String(14), unique=True, nullable=False)  # CPF/CNPJ
    Logradouro = Column(String(100))
    Numero = Column(String(6))
    Bairro = Column(String(30))
    Telefone = Column(String(11))
    Complemento = Column(String(150))
    Observacoes = Column(String(150))
    vendas = relationship('VendaModel', back_populates='cliente')
    Esconder = Column(Integer, default=0)
    Data = Column(DateTime, default=func.now(), nullable=False)

class VendaModel(Base):
    __tablename__ = 'Vendas'
    CodV = Column(Integer, primary_key=True, index=True)
    CodP = Column(Integer, ForeignKey('Produtos.CodP'), nullable=True)
    produtos = relationship('ProdutoModel', secondary=vendas_produtos, back_populates='vendas')
    Valor = Column(Float, nullable=False)
    CodC = Column(Integer, ForeignKey('Clientes.CodC'), nullable=True)
    cliente = relationship('ClienteModel', back_populates='vendas')
    Endereco = Column(String(255))
    Entrega = Column(Integer, default=0)
    Concluido = Column(Integer, default=1)
    FormaPagamento = Column(String(50))
    Data = Column(DateTime, default=func.now(), nullable=False)

class ConfigModel(Base):
    __tablename__ = 'Configuracoes'
    id = Column(Integer, primary_key=True, index=True)
    NomeLoja = Column(String(255))
    CNPJ = Column(String(20))
    Endereco = Column(String(255))
    Email = Column(String(255))
    Telefone = Column(String(20))
