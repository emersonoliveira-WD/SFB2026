import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import type { Fornecedor } from '../types';
import {
  Plus, Edit, Trash2, Truck, Search, SlidersHorizontal,
  Loader2, ChevronLeft, ChevronRight, X, Check, AlertTriangle,
  MapPin, Phone, Building2, FileText,
} from 'lucide-react';
import { formatCNPJ, formatTelefone } from '../utils/formatters';
import cidadesData from '../../../cidades.json';
import { SearchableSelect } from './SearchableSelect';

// ── tipos ────────────────────────────────────────────────────────────────────

interface EstadoEntry { sigla: string; nome: string; cidades: string[]; }
const estados: EstadoEntry[] = (cidadesData as { estados: EstadoEntry[] }).estados;

interface FormData {
  RazaoSocial: string;
  UF: string;
  Cidade: string;
  Logradouro: string;
  Numero: string;
  Complemento: string;
  Telefone0: string;
  Telefone1: string;
  Contato: string;
  CNPJ: string;
  IC: string;
  Observacoes: string;
}

const EMPTY_FORM: FormData = {
  RazaoSocial: '', UF: '', Cidade: '', Logradouro: '',
  Numero: '', Complemento: '', Telefone0: '', Telefone1: '',
  Contato: '', CNPJ: '', IC: '', Observacoes: '',
};

const ITEMS_PER_PAGE = 15;

// ── componente Toast ──────────────────────────────────────────────────────────

interface ToastMsg { id: number; type: 'success' | 'error'; text: string; }

let toastId = 0;

// ── modal de cadastro/edição ──────────────────────────────────────────────────

interface FornecedorModalProps {
  editing: Fornecedor | null;
  onClose: () => void;
  onSaved: () => void;
  addToast: (type: ToastMsg['type'], text: string) => void;
}

const FornecedorModal: React.FC<FornecedorModalProps> = ({ editing, onClose, onSaved, addToast }) => {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Cidades disponíveis para o UF selecionado
  const cidadesDisponiveis: { label: string; value: string }[] = form.UF
    ? (estados.find(e => e.sigla === form.UF)?.cidades ?? []).map(c => ({ label: c, value: c }))
    : [];

  const estadoOptions = estados.map(e => ({ label: `${e.sigla} — ${e.nome}`, value: e.sigla }));

  // preenche form no modo edição
  useEffect(() => {
    if (editing) {
      setForm({
        RazaoSocial: editing.RazaoSocial ?? '',
        UF: editing.UF ?? '',
        Cidade: editing.Cidade ?? '',
        Logradouro: editing.Logradouro ?? '',
        Numero: editing.Numero != null ? String(editing.Numero) : '',
        Complemento: editing.Complemento ?? '',
        Telefone0: editing.Telefone0 ?? '',
        Telefone1: editing.Telefone1 ?? '',
        Contato: editing.Contato ?? '',
        CNPJ: editing.CNPJ ?? '',
        IC: editing.IC ?? '',
        Observacoes: editing.Observacoes ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setTimeout(() => firstInputRef.current?.focus(), 60);
  }, [editing]);

  // quando muda UF, limpa a cidade (só se já havia uma selecionada de outro estado)
  const handleUFChange = (uf: string) => {
    setForm(prev => {
      const cidades = estados.find(e => e.sigla === uf)?.cidades ?? [];
      return { ...prev, UF: uf, Cidade: cidades.includes(prev.Cidade) ? prev.Cidade : '' };
    });
  };

  const set = (field: keyof FormData) => (v: string) =>
    setForm(prev => ({ ...prev, [field]: v }));

  const handleInput = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(field)(e.target.value);

  const handleCNPJ = (e: React.ChangeEvent<HTMLInputElement>) =>
    set('CNPJ')(formatCNPJ(e.target.value));

  const handleTel = (field: 'Telefone0' | 'Telefone1') =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      set(field)(formatTelefone(e.target.value));

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.RazaoSocial.trim()) errs.RazaoSocial = 'Razão Social é obrigatória.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        RazaoSocial: form.RazaoSocial.trim(),
        UF: form.UF || null,
        Cidade: form.Cidade || null,
        Logradouro: form.Logradouro || null,
        Numero: form.Numero ? Number(form.Numero) : null,
        Complemento: form.Complemento || null,
        Telefone0: form.Telefone0 || null,
        Telefone1: form.Telefone1 || null,
        Contato: form.Contato || null,
        CNPJ: form.CNPJ || null,
        IC: form.IC || null,
        Observacoes: form.Observacoes || null,
      };
      if (editing) {
        await api.put(`/api/fornecedores/${editing.CodF}`, payload);
        addToast('success', 'Fornecedor atualizado com sucesso.');
      } else {
        await api.post('/api/fornecedores', payload);
        addToast('success', 'Fornecedor cadastrado com sucesso.');
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? 'Erro ao salvar fornecedor.';
      addToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  // fecha com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-icon">
            <Truck size={20} />
          </div>
          <div>
            <h2>{editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
            <p>{editing ? `Editando: ${editing.RazaoSocial}` : 'Preencha os dados do fornecedor.'}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">

            {/* ─── Dados principais ─── */}
            <div className="form-section-label">Dados principais</div>
            <div className="form-row">
              <div className={`form-group form-group--full ${errors.RazaoSocial ? 'form-group--error' : ''}`}>
                <label htmlFor="f-razao">Razão Social <span className="required-mark">*</span></label>
                <input
                  id="f-razao"
                  ref={firstInputRef}
                  type="text"
                  value={form.RazaoSocial}
                  onChange={handleInput('RazaoSocial')}
                  placeholder="Nome completo ou Razão Social"
                  maxLength={200}
                />
                {errors.RazaoSocial && (
                  <span className="field-error"><AlertTriangle size={12} />{errors.RazaoSocial}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="f-cnpj">CNPJ</label>
                <input
                  id="f-cnpj"
                  type="text"
                  value={form.CNPJ}
                  onChange={handleCNPJ}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
              </div>
              <div className="form-group">
                <label htmlFor="f-ie">Inscrição Estadual</label>
                <input
                  id="f-ie"
                  type="text"
                  value={form.IC}
                  onChange={handleInput('IC')}
                  placeholder="IE do fornecedor"
                  maxLength={30}
                />
              </div>
            </div>

            {/* ─── Endereço ─── */}
            <div className="form-section-label">Endereço</div>
            <div className="form-row">
              <div className="form-group form-group--uf">
                <label>UF</label>
                <SearchableSelect
                  value={form.UF}
                  onChange={handleUFChange}
                  options={estadoOptions}
                  placeholder="Estado"
                />
              </div>
              <div className="form-group form-group--cidade">
                <label>Cidade</label>
                <SearchableSelect
                  value={form.Cidade}
                  onChange={set('Cidade')}
                  options={cidadesDisponiveis}
                  placeholder={form.UF ? 'Selecione a cidade' : 'Selecione a UF primeiro'}
                  disabled={!form.UF}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group form-group--logradouro">
                <label htmlFor="f-logr">Logradouro</label>
                <input
                  id="f-logr"
                  type="text"
                  value={form.Logradouro}
                  onChange={handleInput('Logradouro')}
                  placeholder="Rua, Av., etc."
                  maxLength={200}
                />
              </div>
              <div className="form-group form-group--num">
                <label htmlFor="f-num">Número</label>
                <input
                  id="f-num"
                  type="text"
                  inputMode="numeric"
                  value={form.Numero}
                  onChange={e => set('Numero')(e.target.value.replace(/\D/g, ''))}
                  placeholder="Nº"
                  maxLength={10}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group form-group--full">
                <label htmlFor="f-compl">Complemento</label>
                <input
                  id="f-compl"
                  type="text"
                  value={form.Complemento}
                  onChange={handleInput('Complemento')}
                  placeholder="Sala, bloco, referência..."
                  maxLength={100}
                />
              </div>
            </div>

            {/* ─── Contato ─── */}
            <div className="form-section-label">Contato</div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="f-tel0">Telefone 1</label>
                <input
                  id="f-tel0"
                  type="text"
                  inputMode="tel"
                  value={form.Telefone0}
                  onChange={handleTel('Telefone0')}
                  placeholder="(00) 00000-0000"
                  maxLength={16}
                />
              </div>
              <div className="form-group">
                <label htmlFor="f-tel1">Telefone 2</label>
                <input
                  id="f-tel1"
                  type="text"
                  inputMode="tel"
                  value={form.Telefone1}
                  onChange={handleTel('Telefone1')}
                  placeholder="(00) 00000-0000"
                  maxLength={16}
                />
              </div>
              <div className="form-group">
                <label htmlFor="f-contato">Contato</label>
                <input
                  id="f-contato"
                  type="text"
                  value={form.Contato}
                  onChange={handleInput('Contato')}
                  placeholder="Nome do responsável"
                  maxLength={100}
                />
              </div>
            </div>

            {/* ─── Observações ─── */}
            <div className="form-section-label">Observações</div>
            <div className="form-row">
              <div className="form-group form-group--full">
                <textarea
                  value={form.Observacoes}
                  onChange={handleInput('Observacoes')}
                  placeholder="Informações adicionais sobre o fornecedor..."
                  rows={3}
                  maxLength={500}
                />
                <span className="char-count">{form.Observacoes.length}/500</span>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
              {saving ? 'Salvando...' : (editing ? 'Salvar alterações' : 'Cadastrar fornecedor')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── modal de confirmação de exclusão ─────────────────────────────────────────

interface ConfirmDeleteProps {
  fornecedor: Fornecedor;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDelete: React.FC<ConfirmDeleteProps> = ({ fornecedor, onConfirm, onCancel }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onConfirm, onCancel]);

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal-box modal-box--sm">
        <div className="modal-header">
          <div className="modal-header-icon modal-header-icon--red">
            <Trash2 size={20} />
          </div>
          <div>
            <h2>Excluir fornecedor?</h2>
            <p>Esta ação pode ser desfeita na listagem.</p>
          </div>
          <button className="modal-close" onClick={onCancel}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <p className="confirm-text">
            O fornecedor <strong>"{fornecedor.RazaoSocial}"</strong> será ocultado da listagem.
            Você pode restaurá-lo ativando <em>"Mostrar escondidos"</em>.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className="btn-danger" onClick={onConfirm}>
            <Trash2 size={15} /> Excluir
          </button>
        </div>
      </div>
    </div>
  );
};

// ── componente principal ──────────────────────────────────────────────────────

export const Fornecedores: React.FC = () => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [advancedSearch, setAdvancedSearch] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [deletingFornecedor, setDeletingFornecedor] = useState<Fornecedor | null>(null);

  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const addToast = useCallback((type: ToastMsg['type'], text: string) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, text }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const fetchFornecedores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/fornecedores', {
        params: {
          search: searchTerm || undefined,
          show_hidden: showHidden,
        },
      });
      // O backend devolve lista simples; filtragem match_type e paginação serão feitas no cliente
      // (para evitar alterar o backend, seguimos o padrão existente)
      let list: Fornecedor[] = res.data;

      // filtro client-side por match_type
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        list = list.filter(f => {
          const nome = f.RazaoSocial.toLowerCase();
          return advancedSearch ? nome.includes(q) : nome.startsWith(q);
        });
      }

      setTotalCount(list.length);
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      setFornecedores(list.slice(offset, offset + ITEMS_PER_PAGE));
    } catch {
      addToast('error', 'Erro ao carregar fornecedores.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, showHidden, advancedSearch, currentPage, addToast]);

  useEffect(() => {
    const t = setTimeout(fetchFornecedores, 300);
    return () => clearTimeout(t);
  }, [fetchFornecedores]);

  // volta pra página 1 quando muda filtro
  useEffect(() => { setCurrentPage(1); }, [searchTerm, advancedSearch, showHidden]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  const openNew = () => { setEditingFornecedor(null); setModalOpen(true); };
  const openEdit = (f: Fornecedor) => { setEditingFornecedor(f); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  const handleDelete = async () => {
    if (!deletingFornecedor) return;
    try {
      await api.delete(`/api/fornecedores/${deletingFornecedor.CodF}`);
      addToast('success', `Fornecedor "${deletingFornecedor.RazaoSocial}" excluído.`);
      setDeletingFornecedor(null);
      fetchFornecedores();
    } catch {
      addToast('error', 'Erro ao excluir fornecedor.');
      setDeletingFornecedor(null);
    }
  };

  // ── render ──

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
      {/* ── Toasts ── */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast--${t.type}`}>
            {t.type === 'success' ? <Check size={15} /> : <AlertTriangle size={15} />}
            {t.text}
          </div>
        ))}
      </div>

      <div className="content-stack">
        {/* Toolbar */}
        <section className="section-toolbar">
          <div>
            <h2>Cadastro de fornecedores</h2>
            <p>Gerencie fornecedores, contatos e endereços.</p>
          </div>
          <button className="primary-button" onClick={openNew}>
            <Plus size={18} /> Novo fornecedor
          </button>
        </section>

        {/* Tabela + busca */}
        <section className="table-card fornecedores-card">
          {/* Header com busca */}
          <div className="table-card-header">
            <div className="search-controls flex items-center gap-4 flex-grow">
              <div className="search-field flex-grow">
                <Search size={20} />
                <input
                  type="text"
                  placeholder="Pesquisar por razão social..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  aria-label="Pesquisar fornecedor"
                />
                {searchTerm && (
                  <button className="clear-search" onClick={() => setSearchTerm('')} aria-label="Limpar busca">×</button>
                )}
              </div>
              <div
                className="filter-wrapper"
                title={advancedSearch
                  ? 'Busca avançada: procura o termo em qualquer parte da Razão Social.'
                  : 'Busca normal: começa pelo início da Razão Social.'}
              >
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
                <span>{totalCount} fornecedor{totalCount !== 1 ? 'es' : ''}</span>
              </div>
            )}
          </div>

          {/* Opções avançadas */}
          <div className={`search-options ${advancedSearch ? '' : 'hidden'}`} style={{ padding: '0 18px 12px' }}>
            <label className="check-option">
              <input type="checkbox" checked={showHidden} onChange={e => setShowHidden(e.target.checked)} />
              <span className="custom-check" />
              Mostrar fornecedores ocultos
            </label>
          </div>

          {/* Tabela */}
          <div className="table-wrap">
            <table className="data-table data-table--fornecedores small-rows">
              <thead>
                <tr>
                  <th style={{ width: 52 }}>#</th>
                  <th>Razão Social</th>
                  <th>Cidade</th>
                  <th style={{ width: 52 }}>UF</th>
                  <th>Logradouro</th>
                  <th style={{ width: 60 }}>Num.</th>
                  <th>Telefone</th>
                  <th>CNPJ</th>
                  <th style={{ width: 160 }}>Obs.</th>
                  <th className="center" style={{ width: 90 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {fornecedores.map(f => (
                  <tr key={f.CodF} className={f.Esconder ? 'row-hidden' : ''}>
                    <td>
                      <span className="cod-badge">#{f.CodF}</span>
                    </td>
                    <td>
                      <div className="product-cell">
                        <div className="product-icon">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <strong>{f.RazaoSocial}</strong>
                          {f.Esconder ? <small className="hidden-tag">oculto</small> : null}
                        </div>
                      </div>
                    </td>
                    <td className="muted">{f.Cidade || <span className="cell-empty">—</span>}</td>
                    <td>
                      {f.UF
                        ? <span className="uf-badge">{f.UF}</span>
                        : <span className="cell-empty">—</span>}
                    </td>
                    <td className="muted">
                      {f.Logradouro
                        ? <span className="cell-with-icon"><MapPin size={12} />{f.Logradouro}</span>
                        : <span className="cell-empty">—</span>}
                    </td>
                    <td className="muted">{f.Numero ?? <span className="cell-empty">—</span>}</td>
                    <td>
                      {f.Telefone0
                        ? <span className="cell-with-icon"><Phone size={12} />{formatTelefone(f.Telefone0)}</span>
                        : <span className="cell-empty">—</span>}
                    </td>
                    <td className="muted font-mono">
                      {f.CNPJ ? formatCNPJ(f.CNPJ) : <span className="cell-empty">—</span>}
                    </td>
                    <td>
                      {f.Observacoes
                        ? (
                          <span className="obs-cell" title={f.Observacoes}>
                            <FileText size={12} />
                            {f.Observacoes.length > 28
                              ? f.Observacoes.slice(0, 28) + '…'
                              : f.Observacoes}
                          </span>
                        )
                        : <span className="cell-empty">—</span>}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="edit" title="Editar" onClick={() => openEdit(f)}>
                          <Edit size={16} />
                        </button>
                        <button className="delete" title="Excluir" onClick={() => setDeletingFornecedor(f)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && fornecedores.length === 0 && (
                  <tr>
                    <td colSpan={10} className="empty-row">
                      <Truck size={30} />
                      <strong>Nenhum fornecedor encontrado</strong>
                      <span>
                        {searchTerm
                          ? 'Tente alterar o termo da pesquisa.'
                          : 'Clique em "Novo fornecedor" para começar.'}
                      </span>
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

        {/* Paginação */}
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

      {/* Modais */}
      {modalOpen && (
        <FornecedorModal
          editing={editingFornecedor}
          onClose={closeModal}
          onSaved={fetchFornecedores}
          addToast={addToast}
        />
      )}
      {deletingFornecedor && (
        <ConfirmDelete
          fornecedor={deletingFornecedor}
          onConfirm={handleDelete}
          onCancel={() => setDeletingFornecedor(null)}
        />
      )}
    </>
  );
};
