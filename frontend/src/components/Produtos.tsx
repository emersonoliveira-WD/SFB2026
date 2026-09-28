import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import type { Produto, Fornecedor } from '../types';
import {
  Plus, Edit, Trash2, Package, Search, SlidersHorizontal,
  Loader2, ChevronLeft, ChevronRight, X, Check, AlertTriangle,
  RotateCcw, FileText
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { SearchableSelect } from './SearchableSelect';

// ── tipos e auxiliares ────────────────────────────────────────────────────────
interface FormData {
  Nome: string;
  Codigo: string;
  CodF: string;
  PrecoCompra: string;
  PrecoVenda: string;
  Margem: string;
  ICMS: string;
  Observacoes: string;
}

const EMPTY_FORM: FormData = {
  Nome: '', Codigo: '', CodF: '',
  PrecoCompra: '', PrecoVenda: '', Margem: '', ICMS: '5.2',
  Observacoes: '',
};

const ITEMS_PER_PAGE = 15;

const toFloat = (s: string | number | undefined) => {
  if (s == null || s === '') return 0;
  if (typeof s === 'number') return s;
  return parseFloat(s.toString().replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;
};

const calcMargem = (venda: number, compra: number, icms: number) => {
  if (compra === 0) return 0;
  return ((venda / compra) / (1 + icms / 100) - 1) * 100;
};

const calcVenda = (compra: number, margem: number, icms: number) => {
  return compra * (1 + margem / 100) * (1 + icms / 100);
};

// ── modal de cadastro/edição ──────────────────────────────────────────────────
interface ProdutoModalProps {
  editing: Produto | null;
  fornecedores: Fornecedor[];
  onClose: () => void;
  onSaved: () => void;
  addToast: (type: 'success' | 'error', text: string) => void;
}

const ProdutoModal: React.FC<ProdutoModalProps> = ({ editing, fornecedores, onClose, onSaved, addToast }) => {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

  const fornecedorOptions = fornecedores.map(f => ({
    label: f.RazaoSocial,
    value: f.CodF.toString()
  }));

  useEffect(() => {
    if (editing) {
      setForm({
        Nome: editing.Nome ?? '',
        Codigo: editing.Codigo ?? '',
        CodF: editing.CodF != null ? editing.CodF.toString() : '',
        PrecoCompra: editing.PrecoCompra.toString(),
        PrecoVenda: editing.PrecoVenda.toString(),
        Margem: editing.Margem.toString(),
        ICMS: editing.ICMS.toString(),
        Observacoes: editing.Observacoes ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setTimeout(() => firstInputRef.current?.focus(), 60);
  }, [editing]);

  const set = (field: keyof FormData) => (v: string) =>
    setForm(prev => ({ ...prev, [field]: v }));

  const handleInput = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(field)(e.target.value);

  // Lógicas de recálculo:
  const handleCompraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const comp = toFloat(val);
    const v = toFloat(form.PrecoVenda);
    const i = toFloat(form.ICMS);
    const m = calcMargem(v, comp, i);
    setForm(prev => ({ ...prev, PrecoCompra: val, Margem: m.toFixed(2) }));
  };

  const handleVendaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const v = toFloat(val);
    const comp = toFloat(form.PrecoCompra);
    const i = toFloat(form.ICMS);
    const m = calcMargem(v, comp, i);
    setForm(prev => ({ ...prev, PrecoVenda: val, Margem: m.toFixed(2) }));
  };

  const handleMargemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const m = toFloat(val);
    const comp = toFloat(form.PrecoCompra);
    const i = toFloat(form.ICMS);
    const v = calcVenda(comp, m, i);
    setForm(prev => ({ ...prev, Margem: val, PrecoVenda: v.toFixed(2) }));
  };

  const handleIcmsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const i = toFloat(val);
    const m = toFloat(form.Margem);
    const comp = toFloat(form.PrecoCompra);
    const v = calcVenda(comp, m, i);
    setForm(prev => ({ ...prev, ICMS: val, PrecoVenda: v.toFixed(2) }));
  };

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.Nome.trim()) errs.Nome = 'Nome é obrigatório.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        Nome: form.Nome.trim(),
        Codigo: form.Codigo.trim() || null,
        CodF: form.CodF ? Number(form.CodF) : null,
        PrecoCompra: toFloat(form.PrecoCompra),
        PrecoVenda: toFloat(form.PrecoVenda),
        Margem: toFloat(form.Margem),
        ICMS: toFloat(form.ICMS),
        Observacoes: form.Observacoes.trim() || null,
      };
      if (editing) {
        await api.put(`/api/produtos/${editing.CodP}`, payload);
        addToast('success', 'Produto atualizado com sucesso.');
      } else {
        await api.post('/api/produtos', payload);
        addToast('success', 'Produto cadastrado com sucesso.');
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? 'Erro ao salvar produto.';
      addToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-header">
          <div className="modal-header-icon">
            <Package size={20} />
          </div>
          <div>
            <h2>{editing ? 'Editar Produto' : 'Novo Produto'}</h2>
            <p>{editing ? `Editando: ${editing.Nome}` : 'Preencha os dados do produto.'}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">

            {/* ─── Dados principais ─── */}
            <div className="form-section-label">Dados principais</div>
            <div className="form-row">
              <div className={`form-group form-group--full ${errors.Nome ? 'form-group--error' : ''}`}>
                <label>Nome do Produto <span className="required-mark">*</span></label>
                <input
                  ref={firstInputRef}
                  type="text"
                  value={form.Nome}
                  onChange={handleInput('Nome')}
                  placeholder="Nome do produto"
                  maxLength={150}
                />
                {errors.Nome && <span className="field-error"><AlertTriangle size={12} />{errors.Nome}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group form-group--half">
                <label>Código (Opcional)</label>
                <input
                  type="text"
                  value={form.Codigo}
                  onChange={handleInput('Codigo')}
                  placeholder="Ex: 04b"
                  maxLength={50}
                />
              </div>
              <div className="form-group form-group--half">
                <label>Fornecedor</label>
                <SearchableSelect
                  value={form.CodF}
                  onChange={set('CodF')}
                  options={fornecedorOptions}
                  placeholder="Selecione um fornecedor"
                />
              </div>
            </div>

            {/* ─── Precificação ─── */}
            <div className="form-section-label">Precificação</div>
            <div className="form-row">
              <div className="form-group form-group--quarter">
                <label>Custo (R$)</label>
                <input
                  type="text"
                  value={form.PrecoCompra}
                  onChange={handleCompraChange}
                  placeholder="0,00"
                />
              </div>
              <div className="form-group form-group--quarter">
                <label>Venda (R$)</label>
                <input
                  type="text"
                  value={form.PrecoVenda}
                  onChange={handleVendaChange}
                  placeholder="0,00"
                />
              </div>
              <div className="form-group form-group--quarter">
                <label>Margem (%)</label>
                <input
                  type="text"
                  value={form.Margem}
                  onChange={handleMargemChange}
                  placeholder="0,00"
                />
              </div>
              <div className="form-group form-group--quarter">
                <label>ICMS (%)</label>
                <input
                  type="text"
                  value={form.ICMS}
                  onChange={handleIcmsChange}
                  placeholder="5,2"
                />
              </div>
            </div>

            {editing && (
              <div className="form-row">
                <div className="form-group form-group--half muted">
                  <label>Preço Anterior (R$)</label>
                  <input type="text" value={formatCurrency(editing.PrecoAntigo)} disabled />
                </div>
                <div className="form-group form-group--half muted">
                  <label>Data Preço Anterior</label>
                  <input type="text" value={formatDate(editing.DataPreco)} disabled />
                </div>
              </div>
            )}

            {/* ─── Observações ─── */}
            <div className="form-section-label">Observações</div>
            <div className="form-row">
              <div className="form-group form-group--full">
                <textarea
                  value={form.Observacoes}
                  onChange={handleInput('Observacoes')}
                  placeholder="Informações adicionais..."
                  rows={2}
                  maxLength={250}
                />
              </div>
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
              {saving ? 'Salvando...' : (editing ? 'Salvar alterações' : 'Cadastrar produto')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── modal de confirmação de ação ─────────────────────────────────────────
interface ConfirmActionProps {
  produto: Produto;
  action: 'delete' | 'restore';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmAction: React.FC<ConfirmActionProps> = ({ produto, action, onConfirm, onCancel }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onConfirm, onCancel]);

  const isDelete = action === 'delete';

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal-box modal-box--sm">
        <div className="modal-header">
          <div className={`modal-header-icon ${isDelete ? 'modal-header-icon--red' : 'modal-header-icon--blue'}`}>
            {isDelete ? <Trash2 size={20} /> : <RotateCcw size={20} />}
          </div>
          <div>
            <h2>{isDelete ? 'Excluir produto?' : 'Restaurar produto?'}</h2>
            <p>{isDelete ? 'Esta ação pode ser desfeita.' : 'Produto voltará à listagem ativa.'}</p>
          </div>
          <button className="modal-close" onClick={onCancel}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <p className="confirm-text">
            O produto <strong>"{produto.Nome}"</strong> será {isDelete ? 'ocultado da' : 'restaurado para a'} listagem.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className={isDelete ? "btn-danger" : "btn-primary"} onClick={onConfirm}>
            {isDelete ? <Trash2 size={15} /> : <RotateCcw size={15} />}
            {isDelete ? 'Excluir' : 'Restaurar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── componente principal ──────────────────────────────────────────────────────
interface ToastMsg { id: number; type: 'success' | 'error'; text: string; }
let toastId = 0;

export const Produtos: React.FC = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [allFornecedores, setAllFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [advancedSearch, setAdvancedSearch] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);

  const [actionItem, setActionItem] = useState<{ produto: Produto, type: 'delete' | 'restore' } | null>(null);

  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const addToast = useCallback((type: 'success' | 'error', text: string) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, text }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const loadDependencies = useCallback(async () => {
    try {
      const res = await api.get('/api/fornecedores?show_hidden=false');
      setAllFornecedores(res.data);
    } catch {
      console.error('Erro ao carregar fornecedores');
    }
  }, []);

  useEffect(() => {
    loadDependencies();
  }, [loadDependencies]);

  const fetchProdutos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/produtos', {
        params: {
          search: searchTerm || undefined,
          show_hidden: showHidden,
          limit: 10000,
        },
      });
      let list: Produto[] = res.data;

      // Filtro da busca avançada client side caso o backend seja limitado
      if (searchTerm && advancedSearch) {
        const q = searchTerm.toLowerCase();
        list = list.filter(p => p.Nome.toLowerCase().includes(q) || p.Codigo?.toLowerCase().includes(q));
      }

      setTotalCount(list.length);
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      setProdutos(list.slice(offset, offset + ITEMS_PER_PAGE));
    } catch {
      addToast('error', 'Erro ao carregar produtos.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, showHidden, advancedSearch, currentPage, addToast]);

  useEffect(() => {
    const t = setTimeout(fetchProdutos, 300);
    return () => clearTimeout(t);
  }, [fetchProdutos]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, advancedSearch, showHidden]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  const openNew = () => { setEditingProduto(null); setModalOpen(true); };
  const openEdit = (p: Produto) => { setEditingProduto(p); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  const confirmAction = (produto: Produto, type: 'delete' | 'restore') => {
    setActionItem({ produto, type });
  };

  const handleActionComplete = async () => {
    if (!actionItem) return;
    const { produto, type } = actionItem;
    try {
      if (type === 'delete') {
        await api.delete(`/api/produtos/${produto.CodP}`);
        addToast('success', `Produto "${produto.Nome}" excluído.`);
      } else {
        await api.post(`/api/produtos/${produto.CodP}/restore`);
        addToast('success', `Produto "${produto.Nome}" restaurado.`);
      }
      setActionItem(null);
      fetchProdutos();
    } catch {
      addToast('error', `Erro ao ${type === 'delete' ? 'excluir' : 'restaurar'} produto.`);
      setActionItem(null);
    }
  };

  const pageNumbers: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (currentPage > 3) pageNumbers.push('…');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++)
      pageNumbers.push(i);
    if (currentPage < totalPages - 2) pageNumbers.push('…');
    pageNumbers.push(totalPages);
  }

  return (
    <>
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast--${t.type}`}>
            {t.type === 'success' ? <Check size={15} /> : <AlertTriangle size={15} />}
            {t.text}
          </div>
        ))}
      </div>

      <div className="content-stack">
        <section className="section-toolbar">
          <div>
            <h2>Catálogo de produtos</h2>
            <p>Gerencie produtos, custos, preços de venda e margens.</p>
          </div>
          <button className="primary-button" onClick={openNew}>
            <Plus size={18} /> Novo produto
          </button>
        </section>

        <section className="table-card">
          <div className="table-card-header">
            <div className="search-controls flex items-center gap-4 flex-grow">
              <div className="search-field flex-grow">
                <Search size={20} />
                <input
                  type="text"
                  placeholder="Pesquisar por nome ou código..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button className="clear-search" onClick={() => setSearchTerm('')} aria-label="Limpar busca">×</button>
                )}
              </div>
              <div className="filter-wrapper" title="Busca avançada: procura o termo em qualquer parte do nome ou código.">
                <button
                  className={`filter-button ${advancedSearch ? 'active' : ''}`}
                  onClick={() => setAdvancedSearch(v => !v)}
                >
                  <SlidersHorizontal size={17} /> Busca avançada
                </button>
              </div>
            </div>
            {loading && <Loader2 className="spin" size={20} />}
            {!loading && (
              <div className="table-count-badge">
                <span>{totalCount} produto{totalCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          <div className={`search-options ${advancedSearch ? '' : 'hidden'}`} style={{ padding: '0 18px 12px' }}>
            <label className="check-option">
              <input type="checkbox" checked={showHidden} onChange={e => setShowHidden(e.target.checked)} />
              <span className="custom-check" />
              Mostrar produtos ocultos
            </label>
          </div>

          <div className="table-wrap">
            <table className="data-table small-rows">
              <thead>
                <tr>
                  <th style={{ width: 52 }}>Cod</th>
                  <th>Produto</th>
                  <th className="numeric">Custo</th>
                  <th className="numeric" style={{ width: 70 }}>Margem</th>
                  <th className="numeric">Venda</th>
                  <th className="numeric" title="Preço Anterior">Pr.Ant.</th>
                  <th>Fornecedor</th>
                  <th>Obs</th>
                  <th style={{ width: 85 }}>Data</th>
                  <th className="center" style={{ width: 90 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map(p => (
                  <tr key={p.CodP} className={p.Esconder ? 'row-hidden' : ''}>
                    <td>
                      <span className="cod-badge">#{p.CodP}</span>
                    </td>
                    <td>
                      <div className="product-cell">
                        <div className="product-icon">
                          <Package size={16} />
                        </div>
                        <div>
                          <strong>{p.Nome} {p.Codigo && <span className="muted font-mono" style={{ fontSize: '0.9em' }}>({p.Codigo})</span>}</strong>
                          {p.Esconder ? <small className="hidden-tag">oculto</small> : null}
                        </div>
                      </div>
                    </td>
                    <td className="numeric">{formatCurrency(p.PrecoCompra)}</td>
                    <td className="numeric muted">{p.Margem.toFixed(1)}%</td>
                    <td className="numeric sale-price">{formatCurrency(p.PrecoVenda)}</td>
                    <td className="numeric muted" style={{ opacity: 0.7 }}>{formatCurrency(p.PrecoAntigo)}</td>
                    <td className="muted">{p.fornecedor?.RazaoSocial || <span className="cell-empty">—</span>}</td>
                    <td>
                      {p.Observacoes ? (
                        <span className="obs-cell" title={p.Observacoes}>
                          <FileText size={12} />
                          {p.Observacoes.length > 15 ? p.Observacoes.slice(0, 15) + '…' : p.Observacoes}
                        </span>
                      ) : <span className="cell-empty">—</span>}
                    </td>
                    <td className="muted" style={{ fontSize: '0.85em' }}>{formatDate(p.DataPreco)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="edit" title="Editar" onClick={() => openEdit(p)}>
                          <Edit size={16} />
                        </button>
                        {p.Esconder ? (
                          <button className="restore" style={{ color: 'var(--color-primary)' }} title="Restaurar" onClick={() => confirmAction(p, 'restore')}>
                            <RotateCcw size={16} />
                          </button>
                        ) : (
                          <button className="delete" title="Excluir" onClick={() => confirmAction(p, 'delete')}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && produtos.length === 0 && (
                  <tr>
                    <td colSpan={10} className="empty-row">
                      <Package size={30} />
                      <strong>Nenhum produto encontrado</strong>
                      <span>{searchTerm ? 'Tente alterar o termo da pesquisa.' : 'Clique em "Novo produto" para começar.'}</span>
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={10} className="empty-row">
                      <Loader2 size={28} className="spin" />
                      <strong>Carregando...</strong>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {totalPages > 1 && (
          <div className="pagination">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
              <ChevronLeft size={17} /> Anterior
            </button>
            {pageNumbers.map((p, i) =>
              p === '…'
                ? <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
                : (
                  <button
                    key={p}
                    className={currentPage === p ? 'current' : ''}
                    onClick={() => setCurrentPage(p as number)}
                  >
                    {p}
                  </button>
                )
            )}
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
              Próximo <ChevronRight size={17} />
            </button>
          </div>
        )}
      </div>

      {modalOpen && (
        <ProdutoModal
          editing={editingProduto}
          fornecedores={allFornecedores}
          onClose={closeModal}
          onSaved={fetchProdutos}
          addToast={addToast}
        />
      )}
      {actionItem && (
        <ConfirmAction
          produto={actionItem.produto}
          action={actionItem.type}
          onConfirm={handleActionComplete}
          onCancel={() => setActionItem(null)}
        />
      )}
    </>
  );
};
