// ── Clientes screen (list, search, add/edit, delete) ────────────────────────────────
import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import type { Cliente } from '../types';
import {
  Plus, Edit, Trash2, UserRound, Search, SlidersHorizontal, Loader2,
  ChevronLeft, ChevronRight, X, Check, AlertTriangle,
} from 'lucide-react';
import { formatDoc, formatTelefone } from '../utils/formatters';

// ── tipos auxiliares ────────────────────────────────────────────────────────
interface FormData {
  Nome: string;
  Documento: string;
  Logradouro: string;
  Numero: string;
  Bairro: string;
  Telefone: string;
  Complemento: string;
  Observacoes: string;
}

const EMPTY_FORM: FormData = {
  Nome: '',
  Documento: '',
  Logradouro: '',
  Numero: '',
  Bairro: '',
  Telefone: '',
  Complemento: '',
  Observacoes: '',
};

const ITEMS_PER_PAGE = 15;

// ── Toast handling ────────────────────────────────────────────────────────
interface ToastMsg { id: number; type: 'success' | 'error'; text: string; }
let toastId = 0;

// ── Modal de cadastro/edição de cliente ──────────────────────────────────────
interface ClienteModalProps {
  editing: Cliente | null;
  onClose: () => void;
  onSaved: () => void;
  addToast: (type: ToastMsg['type'], text: string) => void;
}

const ClienteModal: React.FC<ClienteModalProps> = ({ editing, onClose, onSaved, addToast }) => {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

  // preenche form quando em modo edição
  useEffect(() => {
    if (editing) {
      setForm({
        Nome: editing.Nome ?? '',
        Documento: editing.Documento ?? '',
        Logradouro: editing.Logradouro ?? '',
        Numero: editing.Numero ?? '',
        Bairro: editing.Bairro ?? '',
        Telefone: editing.Telefone ?? '',
        Complemento: editing.Complemento ?? '',
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

  const handleInput = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    set(field)(e.target.value);

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.Nome.trim()) errs.Nome = 'Nome é obrigatório.';
    if (!form.Documento.trim()) errs.Documento = 'Documento (CPF/CNPJ) é obrigatório.';
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
        Documento: form.Documento.trim(),
        Logradouro: form.Logradouro || null,
        Numero: form.Numero || null,
        Bairro: form.Bairro || null,
        Telefone: form.Telefone || null,
        Complemento: form.Complemento || null,
        Observacoes: form.Observacoes || null,
      };
      if (editing) {
        await api.put(`/api/clientes/${editing.CodC}`, payload);
        addToast('success', 'Cliente atualizado com sucesso.');
      } else {
        await api.post('/api/clientes', payload);
        addToast('success', 'Cliente cadastrado com sucesso.');
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Erro ao salvar cliente.';
      addToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  // fecha ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-header">
          <div className="modal-header-icon"><UserRound size={20} /></div>
          <div>
            <h2>{editing ? 'Editar Cliente' : 'Novo Cliente'}</h2>
            <p>{editing ? `Editando: ${editing.Nome}` : 'Preencha os dados do cliente.'}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {/* Dados principais */}
            <div className="form-section-label">Dados principais</div>
            <div className="form-row">
              <div className={`form-group form-group--full ${errors.Nome ? 'form-group--error' : ''}`}>
                <label htmlFor="c-nome">Nome <span className="required-mark">*</span></label>
                <input
                  id="c-nome"
                  ref={firstInputRef}
                  type="text"
                  value={form.Nome}
                  onChange={handleInput('Nome')}
                  placeholder="Nome completo"
                  maxLength={150}
                />
                {errors.Nome && (<span className="field-error"><AlertTriangle size={12} />{errors.Nome}</span>)}
              </div>
            </div>
            <div className="form-row">
              <div className={`form-group ${errors.Documento ? 'form-group--error' : ''}`}>
                <label htmlFor="c-doc">Documento (CPF/CNPJ) <span className="required-mark">*</span></label>
                <input
                  id="c-doc"
                  type="text"
                  value={form.Documento}
                  onChange={handleInput('Documento')}
                  placeholder="CPF ou CNPJ"
                  maxLength={20}
                />
                {errors.Documento && (<span className="field-error"><AlertTriangle size={12} />{errors.Documento}</span>)}
              </div>
            </div>
            {/* Endereço */}
            <div className="form-section-label">Endereço</div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="c-logr">Logradouro</label>
                <input id="c-logr" type="text" value={form.Logradouro} onChange={handleInput('Logradouro')} placeholder="Rua, Av., etc." maxLength={200} />
              </div>
              <div className="form-group">
                <label htmlFor="c-num">Número</label>
                <input id="c-num" type="text" inputMode="numeric" value={form.Numero} onChange={e => set('Numero')(e.target.value.replace(/\D/g, ''))} placeholder="Nº" maxLength={10} />
              </div>
              <div className="form-group">
                <label htmlFor="c-bairro">Bairro</label>
                <input id="c-bairro" type="text" value={form.Bairro} onChange={handleInput('Bairro')} placeholder="Bairro" maxLength={100} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="c-comp">Complemento</label>
                <input id="c-comp" type="text" value={form.Complemento} onChange={handleInput('Complemento')} placeholder="Apto, bloco..." maxLength={100} />
              </div>
            </div>
            {/* Contato */}
            <div className="form-section-label">Contato</div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="c-tel">Telefone</label>
                <input id="c-tel" type="text" inputMode="tel" value={form.Telefone} onChange={handleInput('Telefone')} placeholder="(00) 00000-0000" maxLength={16} />
              </div>
            </div>
            {/* Observações */}
            <div className="form-section-label">Observações</div>
            <div className="form-row">
              <div className="form-group form-group--full">
                <textarea
                  value={form.Observacoes}
                  onChange={handleInput('Observacoes')}
                  placeholder="Informações adicionais..."
                  rows={3}
                  maxLength={500}
                />
                <span className="char-count">{form.Observacoes.length}/500</span>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
              {saving ? 'Salvando...' : (editing ? 'Salvar alterações' : 'Cadastrar cliente')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Modal de confirmação de exclusão ───────────────────────────────────────
interface ConfirmDeleteProps {
  cliente: Cliente;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDelete: React.FC<ConfirmDeleteProps> = ({ cliente, onConfirm, onCancel }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); if (e.key === 'Enter') onConfirm(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onConfirm, onCancel]);

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal-box modal-box--sm">
        <div className="modal-header">
          <div className="modal-header-icon modal-header-icon--red"><Trash2 size={20} /></div>
          <div>
            <h2>Excluir cliente?</h2>
            <p>Esta ação pode ser desfeita na listagem ativando "Mostrar escondidos".</p>
          </div>
          <button className="modal-close" onClick={onCancel}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <p className="confirm-text">O cliente <strong>"{cliente.Nome}"</strong> será ocultado da listagem.</p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className="btn-danger" onClick={onConfirm}><Trash2 size={15} /> Excluir</button>
        </div>
      </div>
    </div>
  );
};

// ── Componente principal ────────────────────────────────────────────────────
export const Clientes: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [advancedSearch, setAdvancedSearch] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [deletingCliente, setDeletingCliente] = useState<Cliente | null>(null);

  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const addToast = useCallback((type: ToastMsg['type'], text: string) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, text }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/clientes', { params: { show_hidden: showHidden } });
      let list: Cliente[] = res.data;
      // filtro de busca
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        list = list.filter(c => {
          const nome = c.Nome?.toLowerCase() ?? '';
          return advancedSearch ? nome.includes(q) : nome.startsWith(q);
        });
      }
      setTotalCount(list.length);
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      setClientes(list.slice(offset, offset + ITEMS_PER_PAGE));
    } catch {
      addToast('error', 'Erro ao carregar clientes.');
    } finally { setLoading(false); }
  }, [searchTerm, showHidden, advancedSearch, currentPage, addToast]);

  // debounce fetch
  useEffect(() => {
    const t = setTimeout(fetchClientes, 300);
    return () => clearTimeout(t);
  }, [fetchClientes]);

  // reset página ao mudar filtro
  useEffect(() => { setCurrentPage(1); }, [searchTerm, advancedSearch, showHidden]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  const openNew = () => { setEditingCliente(null); setModalOpen(true); };
  const openEdit = (c: Cliente) => { setEditingCliente(c); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  const handleDelete = async () => {
    if (!deletingCliente) return;
    try {
      await api.delete(`/api/clientes/${deletingCliente.CodC}`);
      addToast('success', `Cliente "${deletingCliente.Nome}" excluído.`);
      setDeletingCliente(null);
      fetchClientes();
    } catch {
      addToast('error', 'Erro ao excluir cliente.');
      setDeletingCliente(null);
    }
  };

  // pagination numbers
  const pageNumbers: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (currentPage > 3) pageNumbers.push('…');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pageNumbers.push(i);
    if (currentPage < totalPages - 2) pageNumbers.push('…');
    pageNumbers.push(totalPages);
  }

  return (
    <>
      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast--${t.type}`}>
            {t.type === 'success' ? <Check size={15} /> : <AlertTriangle size={15} />}{t.text}
          </div>
        ))}
      </div>

      <div className="content-stack">
        {/* Toolbar */}
        <section className="section-toolbar">
          <div>
            <h2>Cadastro de clientes</h2>
            <p>Gerencie clientes, documentos e contatos.</p>
          </div>
          <button className="primary-button" onClick={openNew}>
            <Plus size={18} /> Novo cliente
          </button>
        </section>

        {/* Busca e tabela */}
        <section className="table-card">
          <div className="table-card-header">
            <div className="search-controls flex items-center gap-4 flex-grow">
              <div className="search-field flex-grow">
                <Search size={20} />
                <input
                  type="text"
                  placeholder="Pesquisar por nome ou documento..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  aria-label="Pesquisar cliente"
                />
                {searchTerm && (
                  <button className="clear-search" onClick={() => setSearchTerm('')} aria-label="Limpar busca">×</button>
                )}
              </div>
              <div className="filter-wrapper" title={advancedSearch ? 'Busca avançada: procura o termo em qualquer parte do nome ou documento.' : 'Busca normal: começa pelo início do nome.'}>
                <button className={`filter-button ${advancedSearch ? 'active' : ''}`} onClick={() => setAdvancedSearch(v => !v)}>
                  <SlidersHorizontal size={17} /> Busca avançada
                </button>
              </div>
            </div>
            {loading && <Loader2 className="spin" size={20} />}
            {!loading && (
              <div className="table-count-badge">
                <span>{totalCount} cliente{totalCount !== 1 ? 's' : ''}</span>
              </div>
            )}
            {/* Opções avançadas */}
            <div className={`search-options ${advancedSearch ? '' : 'hidden'}`} style={{ padding: '0 18px 12px' }}>
              <label className="check-option">
                <input type="checkbox" checked={showHidden} onChange={e => setShowHidden(e.target.checked)} />
                <span className="custom-check" />
                Mostrar clientes ocultos
              </label>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table small-rows">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nome</th>
                  <th>Documento</th>
                  <th>Telef.</th>
                  <th>Endereço</th>
                  <th className="center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => (
                  <tr key={c.CodC} className={c.Esconder ? 'row-hidden' : ''}>
                    <td><span className="cod-badge">#{c.CodC}</span></td>
                    <td>
                      <div className="product-cell">
                        <div className="product-icon"><UserRound size={16} /></div>
                        <div><strong>{c.Nome}</strong>{c.Esconder && <small className="hidden-tag">oculto</small>}</div>
                      </div>
                    </td>
                    <td className="muted">{formatDoc(c.Documento)}</td>
                    <td>{formatTelefone(c.Telefone || '')}</td>
                    <td className="muted">
                      {c.Logradouro ? `${c.Logradouro}, ${c.Numero || ''}${c.Bairro ? ` - ${c.Bairro}` : ''}` : <span className="cell-empty">—</span>}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="edit" title="Editar" onClick={() => openEdit(c)}><Edit size={16} /></button>
                        <button className="delete" title="Excluir" onClick={() => setDeletingCliente(c)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && clientes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty-row"><UserRound size={30} /><strong>Nenhum cliente encontrado</strong><span>{searchTerm ? 'Tente alterar o termo da pesquisa.' : 'Clique em "Novo cliente" para começar.'}</span></td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={6} className="empty-row"><Loader2 size={28} className="spin" /><strong>Carregando...</strong></td>
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
            {pageNumbers.map((p, i) => p === '…' ? (
              <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
            ) : (
              <button key={p} className={currentPage === p ? 'current' : ''} onClick={() => setCurrentPage(p as number)}>{p}</button>
            ))}
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
              Próximo <ChevronRight size={17} />
            </button>
          </div>
        )}

        {/* Modais */}
        {modalOpen && (
          <ClienteModal editing={editingCliente} onClose={closeModal} onSaved={fetchClientes} addToast={addToast} />
        )}
        {deletingCliente && (
          <ConfirmDelete cliente={deletingCliente} onConfirm={handleDelete} onCancel={() => setDeletingCliente(null)} />
        )}
      </div>
    </>
  );
};
