from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

# --- Fornecedor ---
class FornecedorBase(BaseModel):
    RazaoSocial: str
    UF: Optional[str] = None
    Cidade: Optional[str] = None
    Logradouro: Optional[str] = None
    Numero: Optional[int] = None
    CNPJ: Optional[str] = None
    Telefone0: Optional[str] = None
    Telefone1: Optional[str] = None
    Contato: Optional[str] = None
    Complemento: Optional[str] = None
    IC: Optional[str] = None
    Observacoes: Optional[str] = None
    Esconder: Optional[int] = 0

class FornecedorCreate(FornecedorBase):
    pass

class FornecedorUpdate(BaseModel):
    RazaoSocial: Optional[str] = None
    UF: Optional[str] = None
    Cidade: Optional[str] = None
    Logradouro: Optional[str] = None
    Numero: Optional[int] = None
    CNPJ: Optional[str] = None
    Telefone0: Optional[str] = None
    Telefone1: Optional[str] = None
    Contato: Optional[str] = None
    Complemento: Optional[str] = None
    IC: Optional[str] = None
    Observacoes: Optional[str] = None
    Esconder: Optional[int] = None

class Fornecedor(FornecedorBase):
    CodF: int
    Data: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# --- Produto ---
class ProdutoBase(BaseModel):
    Nome: str
    Codigo: Optional[str] = None
    CodF: Optional[int] = None
    PrecoCompra: Optional[float] = 0.0
    PrecoVenda: Optional[float] = 0.0
    ICMS: Optional[float] = 0.0
    Margem: Optional[float] = 0.0
    PrecoAntigo: Optional[float] = 0.0
    Observacoes: Optional[str] = None
    Esconder: Optional[int] = 0

class ProdutoCreate(ProdutoBase):
    pass

class ProdutoUpdate(BaseModel):
    Nome: Optional[str] = None
    Codigo: Optional[str] = None
    CodF: Optional[int] = None
    PrecoCompra: Optional[float] = None
    PrecoVenda: Optional[float] = None
    ICMS: Optional[float] = None
    Margem: Optional[float] = None
    PrecoAntigo: Optional[float] = None
    Observacoes: Optional[str] = None
    Esconder: Optional[int] = None

class Produto(ProdutoBase):
    CodP: int
    Data: Optional[datetime] = None
    DataPreco: Optional[datetime] = None
    fornecedor: Optional[Fornecedor] = None
    model_config = ConfigDict(from_attributes=True)


# --- Cliente ---
class ClienteBase(BaseModel):
    Nome: str
    Documento: Optional[str] = None
    Logradouro: Optional[str] = None
    Numero: Optional[str] = None
    Bairro: Optional[str] = None
    Telefone: Optional[str] = None
    Complemento: Optional[str] = None
    Observacoes: Optional[str] = None
    Esconder: Optional[int] = 0

class ClienteCreate(ClienteBase):
    pass

class ClienteUpdate(BaseModel):
    Nome: Optional[str] = None
    Documento: Optional[str] = None
    Logradouro: Optional[str] = None
    Numero: Optional[str] = None
    Bairro: Optional[str] = None
    Telefone: Optional[str] = None
    Complemento: Optional[str] = None
    Observacoes: Optional[str] = None
    Esconder: Optional[int] = None

class Cliente(ClienteBase):
    CodC: int
    Data: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# --- Venda / Item ---
class ItemVendaCreate(BaseModel):
    CodP: int
    Quantidade: int
    ValorP: float

class VendaCreate(BaseModel):
    CodC: Optional[int] = None
    Valor: Optional[float] = 0.0
    Endereco: Optional[str] = None
    Entrega: Optional[int] = 0
    Concluido: Optional[int] = 1
    FormaPagamento: Optional[str] = None
    itens: List[ItemVendaCreate] = []

class ItemVendaOut(BaseModel):
    CodP: int
    Nome: Optional[str] = None
    Quantidade: int
    ValorP: Optional[str] = None

class VendaOut(BaseModel):
    CodV: int
    Valor: Optional[float] = 0.0
    CodC: Optional[int] = None
    cliente: Optional[Cliente] = None
    Endereco: Optional[str] = None
    Entrega: Optional[int] = 0
    Concluido: Optional[int] = 1
    FormaPagamento: Optional[str] = None
    Data: Optional[datetime] = None
    itens: List[ItemVendaOut] = []
    model_config = ConfigDict(from_attributes=True)


# --- Contora Mock / Emissão Fiscal ---
class ContoraEmitirNotaRequest(BaseModel):
    venda_id: int
    tipo_documento: str = "NFC-E"  # ou NF-E, NFS-E
    natureza_operacao: Optional[str] = "Venda de Mercadoria"
    ambiente: Optional[str] = "homologacao"  # ou producao

class ContoraEmitirNotaResponse(BaseModel):
    sucesso: bool
    protocolo: Optional[str] = None
    chave_acesso: Optional[str] = None
    mensagem: str
    status_sefaz: Optional[str] = None
    pdf_url: Optional[str] = None
    xml_url: Optional[str] = None

class Config(BaseModel):
    id: Optional[int] = None
    NomeLoja: Optional[str] = None
    CNPJ: Optional[str] = None
    Endereco: Optional[str] = None
    Email: Optional[str] = None
    Telefone: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
