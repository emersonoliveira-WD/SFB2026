from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func, insert, select
from typing import List, Optional
from datetime import datetime
import uuid

import models
import schemas
from database import engine, get_db, Base

# Create tables if not exists
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Database connection error or tables creation issue: {e}")

app = FastAPI(
    title="Consulta 2025 - Sistema de Gestão e Vendas",
    version="1.0.0",
    description="Backend API para controle de Estoque, Clientes, Fornecedores, Vendas e Integração Fiscal Contora."
)

# Allow CORS for local dev frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def update_last_modified(db: Session, table_name: str):
    record = db.query(models.LastModified).filter(models.LastModified.table_name == table_name).first()
    if not record:
        record = models.LastModified(table_name=table_name)
        db.add(record)
    else:
        record.modified_at = func.now()
    db.commit()


# ==========================================
# PRODUTOS ENDPOINTS
# ==========================================

@app.get("/api/produtos", response_model=List[schemas.Produto])
def list_produtos(
    search: Optional[str] = None,
    fornecedor_id: Optional[int] = None,
    show_hidden: bool = False,
    match_type: str = 'starts',
    limit: int = 15,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(models.ProdutoModel)
    if not show_hidden:
        query = query.filter(
            or_(
                models.ProdutoModel.Esconder == 0,
                models.ProdutoModel.Esconder == None
            )
        )

    if search:
        if match_type == 'contains':
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    models.ProdutoModel.Nome.ilike(search_pattern),
                    models.ProdutoModel.Codigo.ilike(search_pattern)
                )
            )
        else:
            search_pattern = f"{search}%"
            query = query.filter(models.ProdutoModel.Nome.ilike(search_pattern))

    if fornecedor_id:
        query = query.filter(models.ProdutoModel.CodF == fornecedor_id)

    return query.order_by(models.ProdutoModel.Nome.asc()).offset(offset).limit(limit).all()

@app.get("/api/produtos/{cod_p}", response_model=schemas.Produto)
def get_produto(cod_p: int, db: Session = Depends(get_db)):
    produto = db.query(models.ProdutoModel).filter(models.ProdutoModel.CodP == cod_p).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return produto

@app.post("/api/produtos", response_model=schemas.Produto)
def create_produto(produto_in: schemas.ProdutoCreate, db: Session = Depends(get_db)):
    db_produto = models.ProdutoModel(
        Nome=produto_in.Nome,
        Codigo=produto_in.Codigo,
        CodF=produto_in.CodF,
        PrecoCompra=produto_in.PrecoCompra,
        PrecoVenda=produto_in.PrecoVenda,
        ICMS=produto_in.ICMS,
        Margem=produto_in.Margem,
        PrecoAntigo=produto_in.PrecoCompra, # Preço antigo inicia como o preço de compra ou informado
        Observacoes=produto_in.Observacoes,
        Esconder=0,
        Data=datetime.now(),
        DataPreco=datetime.now()
    )
    db.add(db_produto)
    db.commit()
    db.refresh(db_produto)
    update_last_modified(db, 'Produtos')
    return db_produto

@app.put("/api/produtos/{cod_p}", response_model=schemas.Produto)
def update_produto(cod_p: int, produto_in: schemas.ProdutoUpdate, db: Session = Depends(get_db)):
    db_produto = db.query(models.ProdutoModel).filter(models.ProdutoModel.CodP == cod_p).first()
    if not db_produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    update_data = produto_in.model_dump(exclude_unset=True)

    # Se o preço de venda mudar, registrar preço antigo e data de preço
    if "PrecoVenda" in update_data and update_data["PrecoVenda"] != db_produto.PrecoVenda:
        db_produto.PrecoAntigo = db_produto.PrecoVenda
        db_produto.DataPreco = datetime.now()

    for key, val in update_data.items():
        setattr(db_produto, key, val)

    db.commit()
    db.refresh(db_produto)
    update_last_modified(db, 'Produtos')
    return db_produto

@app.delete("/api/produtos/{cod_p}")
def delete_produto(cod_p: int, hard_delete: bool = False, db: Session = Depends(get_db)):
    db_produto = db.query(models.ProdutoModel).filter(models.ProdutoModel.CodP == cod_p).first()
    if not db_produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    if hard_delete:
        db.delete(db_produto)
    else:
        db_produto.Esconder = 1

    db.commit()
    update_last_modified(db, 'Produtos')
    return {"message": "Produto excluído com sucesso"}

@app.post("/api/produtos/{cod_p}/restore")
def restore_produto(cod_p: int, db: Session = Depends(get_db)):
    db_produto = db.query(models.ProdutoModel).filter(models.ProdutoModel.CodP == cod_p).first()
    if not db_produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    db_produto.Esconder = 0
    db.commit()
    update_last_modified(db, 'Produtos')
    return {"message": "Produto restaurado com sucesso"}


# ==========================================
# FORNECEDORES ENDPOINTS
# ==========================================

@app.get("/api/fornecedores", response_model=List[schemas.Fornecedor])
def list_fornecedores(
    search: Optional[str] = None,
    show_hidden: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(models.FornecedorModel)
    if not show_hidden:
        query = query.filter(
            or_(
                models.FornecedorModel.Esconder == 0,
                models.FornecedorModel.Esconder == None
            )
        )

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                models.FornecedorModel.RazaoSocial.ilike(search_pattern),
                models.FornecedorModel.CNPJ.ilike(search_pattern)
            )
        )
    return query.order_by(models.FornecedorModel.RazaoSocial.asc()).all()

@app.get("/api/fornecedores/{cod_f}", response_model=schemas.Fornecedor)
def get_fornecedor(cod_f: int, db: Session = Depends(get_db)):
    fornecedor = db.query(models.FornecedorModel).filter(models.FornecedorModel.CodF == cod_f).first()
    if not fornecedor:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    return fornecedor

@app.post("/api/fornecedores", response_model=schemas.Fornecedor)
def create_fornecedor(fornecedor_in: schemas.FornecedorCreate, db: Session = Depends(get_db)):
    # Check unique
    existing = db.query(models.FornecedorModel).filter(
        or_(
            models.FornecedorModel.RazaoSocial == fornecedor_in.RazaoSocial,
            models.FornecedorModel.CNPJ == fornecedor_in.CNPJ
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Razão Social ou CNPJ já cadastrado.")

    db_fornecedor = models.FornecedorModel(
        **fornecedor_in.model_dump(),
        Data=datetime.now()
    )
    db.add(db_fornecedor)
    db.commit()
    db.refresh(db_fornecedor)
    update_last_modified(db, 'Fornecedores')
    return db_fornecedor

@app.put("/api/fornecedores/{cod_f}", response_model=schemas.Fornecedor)
def update_fornecedor(cod_f: int, fornecedor_in: schemas.FornecedorUpdate, db: Session = Depends(get_db)):
    db_fornecedor = db.query(models.FornecedorModel).filter(models.FornecedorModel.CodF == cod_f).first()
    if not db_fornecedor:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")

    update_data = fornecedor_in.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(db_fornecedor, key, val)

    db.commit()
    db.refresh(db_fornecedor)
    update_last_modified(db, 'Fornecedores')
    return db_fornecedor

@app.delete("/api/fornecedores/{cod_f}")
def delete_fornecedor(cod_f: int, hard_delete: bool = False, db: Session = Depends(get_db)):
    db_fornecedor = db.query(models.FornecedorModel).filter(models.FornecedorModel.CodF == cod_f).first()
    if not db_fornecedor:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")

    if hard_delete:
        db.delete(db_fornecedor)
    else:
        db_fornecedor.Esconder = 1

    db.commit()
    update_last_modified(db, 'Fornecedores')
    return {"message": "Fornecedor excluído com sucesso"}


# ==========================================
# CLIENTES ENDPOINTS
# ==========================================

@app.get("/api/clientes", response_model=List[schemas.Cliente])
def list_clientes(
    search: Optional[str] = None,
    show_hidden: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(models.ClienteModel)
    if not show_hidden:
        query = query.filter(
            or_(
                models.ClienteModel.Esconder == 0,
                models.ClienteModel.Esconder == None
            )
        )

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                models.ClienteModel.Nome.ilike(search_pattern),
                models.ClienteModel.Documento.ilike(search_pattern)
            )
        )
    return query.order_by(models.ClienteModel.Nome.asc()).all()

@app.get("/api/clientes/{cod_c}", response_model=schemas.Cliente)
def get_cliente(cod_c: int, db: Session = Depends(get_db)):
    cliente = db.query(models.ClienteModel).filter(models.ClienteModel.CodC == cod_c).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return cliente

@app.post("/api/clientes", response_model=schemas.Cliente)
def create_cliente(cliente_in: schemas.ClienteCreate, db: Session = Depends(get_db)):
    # Check unique documento
    existing = db.query(models.ClienteModel).filter(models.ClienteModel.Documento == cliente_in.Documento).first()
    if existing:
        raise HTTPException(status_code=400, detail="Documento (CPF/CNPJ) já cadastrado.")

    db_cliente = models.ClienteModel(
        **cliente_in.model_dump(),
        Data=datetime.now()
    )
    db.add(db_cliente)
    db.commit()
    db.refresh(db_cliente)
    update_last_modified(db, 'Clientes')
    return db_cliente

@app.put("/api/clientes/{cod_c}", response_model=schemas.Cliente)
def update_cliente(cod_c: int, cliente_in: schemas.ClienteUpdate, db: Session = Depends(get_db)):
    db_cliente = db.query(models.ClienteModel).filter(models.ClienteModel.CodC == cod_c).first()
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    update_data = cliente_in.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(db_cliente, key, val)

    db.commit()
    db.refresh(db_cliente)
    update_last_modified(db, 'Clientes')
    return db_cliente

@app.delete("/api/clientes/{cod_c}")
def delete_cliente(cod_c: int, hard_delete: bool = False, db: Session = Depends(get_db)):
    db_cliente = db.query(models.ClienteModel).filter(models.ClienteModel.CodC == cod_c).first()
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    if hard_delete:
        db.delete(db_cliente)
    else:
        db_cliente.Esconder = 1

    db.commit()
    update_last_modified(db, 'Clientes')
    return {"message": "Cliente excluído com sucesso"}


# ==========================================
# VENDAS / PEDIDOS ENDPOINTS
# ==========================================

@app.post("/api/vendas", response_model=schemas.VendaOut)
def create_venda(venda_in: schemas.VendaCreate, db: Session = Depends(get_db)):
    try:
        print("Finalizando venda:", venda_in)
        nova_venda = models.VendaModel(
            CodC=venda_in.CodC,
            Valor=venda_in.Valor,
            Endereco=venda_in.Endereco,
            Entrega=venda_in.Entrega,
            Concluido=venda_in.Concluido,
            FormaPagamento=venda_in.FormaPagamento,
            Data=datetime.now()
        )
        db.add(nova_venda)
        db.commit()
        db.refresh(nova_venda)

        # Inserir itens na tabela associativa vendas_produtos
        for item in venda_in.itens:
            stmt = insert(models.vendas_produtos).values(
                CodV=nova_venda.CodV,
                CodP=item.CodP,
                Quantidade=item.Quantidade,
                ValorP=f"{item.ValorP:.2f}"
            )
            db.execute(stmt)

        db.commit()
        update_last_modified(db, 'Vendas')
        print("Venda finalizada com sucesso cod:", nova_venda.CodV)

        # Montar resposta completa
        itens_resp = []
        for item in venda_in.itens:
            prod = db.query(models.ProdutoModel).filter(models.ProdutoModel.CodP == item.CodP).first()
            itens_resp.append(
                schemas.ItemVendaOut(
                    CodP=item.CodP,
                    Nome=prod.Nome if prod else "Produto Desconhecido",
                    Quantidade=item.Quantidade,
                    ValorP=f"{item.ValorP:.2f}"
                )
            )

        return schemas.VendaOut(
            CodV=nova_venda.CodV,
            Valor=nova_venda.Valor,
            CodC=nova_venda.CodC,
            cliente=nova_venda.cliente,
            Endereco=nova_venda.Endereco,
            Entrega=nova_venda.Entrega,
            Concluido=nova_venda.Concluido,
            FormaPagamento=nova_venda.FormaPagamento,
            Data=nova_venda.Data,
            itens=itens_resp
        )
    except Exception as e:
        print("Erro detalhado:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/vendas", response_model=List[schemas.VendaOut])
def list_vendas(
    cliente_id: Optional[int] = None,
    order_by: str = "Data",  # Data, Cliente, Valor
    db: Session = Depends(get_db)
):
    query = db.query(models.VendaModel)

    if cliente_id:
        query = query.filter(models.VendaModel.CodC == cliente_id)

    if order_by == "Cliente":
        query = query.join(models.ClienteModel).order_by(models.ClienteModel.Nome.asc())
    elif order_by == "Valor":
        query = query.order_by(desc(models.VendaModel.Valor))
    else:
        query = query.order_by(desc(models.VendaModel.Data))

    vendas = query.all()

    resultado = []
    for v in vendas:
        # Buscar itens associados
        itens_query = db.execute(
            select(
                models.vendas_produtos.c.CodP,
                models.vendas_produtos.c.Quantidade,
                models.vendas_produtos.c.ValorP
            ).where(models.vendas_produtos.c.CodV == v.CodV)
        ).fetchall()

        itens_out = []
        for it in itens_query:
            prod = db.query(models.ProdutoModel).filter(models.ProdutoModel.CodP == it[0]).first()
            itens_out.append(schemas.ItemVendaOut(
                CodP=it[0],
                Nome=prod.Nome if prod else "Item Removido",
                Quantidade=it[1],
                ValorP=str(it[2])
            ))

        resultado.append(schemas.VendaOut(
            CodV=v.CodV,
            Valor=v.Valor,
            CodC=v.CodC,
            cliente=v.cliente,
            Endereco=v.Endereco,
            Entrega=v.Entrega,
            Concluido=v.Concluido,
            FormaPagamento=v.FormaPagamento,
            Data=v.Data,
            itens=itens_out
        ))

    return resultado


@app.get("/api/vendas/{cod_v}/ticket")
def get_venda_ticket(cod_v: int, db: Session = Depends(get_db)):
    venda = db.query(models.VendaModel).filter(models.VendaModel.CodV == cod_v).first()
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")

    config = db.query(models.ConfigModel).first()

    itens_out = []
    for it in venda.produtos:
        # Looking up the association to get the price/quantity
        vp = db.execute(
            select(models.vendas_produtos).where(
                (models.vendas_produtos.c.CodV == venda.CodV) &
                (models.vendas_produtos.c.CodP == it.CodP)
            )
        ).fetchone()

        itens_out.append({
            "Nome": it.Nome,
            "Quantidade": vp.Quantidade,
            "ValorP": str(vp.ValorP)
        })

    return {
        "loja": {
            "Nome": config.NomeLoja if config else "N/A",
            "CNPJ": config.CNPJ if config else "N/A",
            "Endereco": config.Endereco if config else "N/A",
            "Telefone": config.Telefone if config else "N/A"
        },
        "venda": {
            "CodV": venda.CodV,
            "Data": venda.Data,
            "Valor": venda.Valor,
            "FormaPagamento": venda.FormaPagamento,
            "Cliente": venda.cliente.Nome if venda.cliente else "Consumidor Final"
        },
        "itens": itens_out
    }


# ==========================================
# CONTORA API FISCAL INTEGRATION (MOCK & PLACEHOLDER)
# ==========================================

@app.post("/api/fiscal/emitir_nota", response_model=schemas.ContoraEmitirNotaResponse)
def emitir_nota_fiscal(req: schemas.ContoraEmitirNotaRequest, db: Session = Depends(get_db)):
    venda = db.query(models.VendaModel).filter(models.VendaModel.CodV == req.venda_id).first()
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")

    # Mock emissão Contora API
    fake_chave = f"3524{datetime.now().strftime('%m%y')}{uuid.uuid4().hex[:36].upper()}"
    fake_protocolo = f"13524{datetime.now().strftime('%y%m%d%H%M')}"

    # Atualizar modelo de venda
    venda.NFe_chave = fake_chave
    venda.NFe_protocolo = fake_protocolo
    venda.NFe_status = "100"
    venda.NFe_xml_url = f"https://api.contora.com.br/v1/xml/{fake_chave}.xml"
    venda.NFe_pdf_url = f"https://api.contora.com.br/v1/danfe/{fake_chave}.pdf"
    db.commit()
    db.refresh(venda)
    update_last_modified(db, 'Vendas')

    doc_cliente = venda.cliente.Documento if venda.cliente else "Consumidor Final"
    nome_cliente = venda.cliente.Nome if venda.cliente else "Consumidor Não Identificado"

    return schemas.ContoraEmitirNotaResponse(
        sucesso=True,
        protocolo=fake_protocolo,
        chave_acesso=fake_chave,
        mensagem=f"Nota fiscal eletrônica ({req.tipo_documento}) autorizada com sucesso pela SEFAZ via Contora API.",
        status_sefaz="100 - Autorizado o uso da NF-e",
        pdf_url=f"https://api.contora.com.br/v1/danfe/{fake_chave}.pdf",
        xml_url=f"https://api.contora.com.br/v1/xml/{fake_chave}.xml"
    )


@app.get("/api/logs")
def list_logs(
    tipo: str = Query(..., description="vendas, produtos, clientes"),
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = None
    if tipo == 'vendas':
        query = db.query(models.VendaModel)
    elif tipo == 'produtos':
        query = db.query(models.ProdutoModel)
    elif tipo == 'clientes':
        query = db.query(models.ClienteModel)
    else:
        raise HTTPException(status_code=400, detail="Tipo inválido")

    if data_inicio:
        query = query.filter(tipo_model(tipo).Data >= datetime.fromisoformat(data_inicio))
    if data_fim:
        query = query.filter(tipo_model(tipo).Data <= datetime.fromisoformat(data_fim))

    return query.order_by(desc(tipo_model(tipo).Data)).all()

def tipo_model(tipo: str):
    if tipo == 'vendas': return models.VendaModel
    if tipo == 'produtos': return models.ProdutoModel
    if tipo == 'clientes': return models.ClienteModel
    return None

# ==========================================
# DASHBOARD / LOGS
# ==========================================

@app.get("/api/dashboard/stats")
def get_stats(db: Session = Depends(get_db)):
    total_produtos = db.query(models.ProdutoModel).filter(models.ProdutoModel.Esconder == 0).count()
    total_fornecedores = db.query(models.FornecedorModel).filter(models.FornecedorModel.Esconder == 0).count()
    total_clientes = db.query(models.ClienteModel).filter(models.ClienteModel.Esconder == 0).count()
    total_vendas = db.query(models.VendaModel).count()
    soma_vendas = db.query(func.sum(models.VendaModel.Valor)).scalar() or 0.0

    return {
        "total_produtos": total_produtos,
        "total_fornecedores": total_fornecedores,
        "total_clientes": total_clientes,
        "total_vendas": total_vendas,
        "faturamento_total": soma_vendas
    }

@app.put("/api/config", response_model=schemas.Config)
def update_config(config_in: schemas.Config, db: Session = Depends(get_db)):
    db_config = db.query(models.ConfigModel).first()
    if not db_config:
        db_config = models.ConfigModel(**config_in.model_dump())
        db.add(db_config)
    else:
        for key, val in config_in.model_dump(exclude={'id'}).items():
            setattr(db_config, key, val)
    db.commit()
    db.refresh(db_config)
    return db_config

@app.get("/api/config", response_model=Optional[schemas.Config])
def get_config(db: Session = Depends(get_db)):
    return db.query(models.ConfigModel).first()
