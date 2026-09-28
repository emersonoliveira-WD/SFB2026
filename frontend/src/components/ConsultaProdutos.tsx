import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import type { Produto } from '../types';
import { Search, SlidersHorizontal, PackageSearch, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { formatCurrency, formatOnlyDate } from '../utils/formatters';

export const ConsultaProdutos: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [advancedSearch, setAdvancedSearch] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const itemsPerPage = 15;
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProdutos = async () => {
      setLoading(true);
      try {
        const response = await api.get('/api/produtos', {
          params: {
            search: searchTerm,
            show_hidden: showHidden,
            match_type: advancedSearch ? 'contains' : 'starts',
            limit: itemsPerPage,
            offset: (currentPage - 1) * itemsPerPage
          }
        });
        setProdutos(response.data);
        setSelectedProduto(response.data[0] || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounce = setTimeout(fetchProdutos, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, showHidden, advancedSearch, currentPage]);

  useEffect(() => {
    if (tableRef.current) {
      tableRef.current.scrollTop = 0;
    }
  }, [currentPage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'ArrowLeft') setCurrentPage(p => Math.max(1, p - 1));
      if (e.key === 'ArrowRight') setCurrentPage(p => p + 1);

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const index = produtos.findIndex(p => p.CodP === selectedProduto?.CodP);
        let nextIndex = index;

        if (e.key === 'ArrowDown' && index < produtos.length - 1) nextIndex = index + 1;
        if (e.key === 'ArrowUp' && index > 0) nextIndex = index - 1;

        if (nextIndex !== index) {
          const newProduto = produtos[nextIndex];
          setSelectedProduto(newProduto);

          if (tableRef.current) {
            // Lógica de scroll: a cada 5 itens, ajusta o topo
            const rowHeight = 42; // Baseado na classe .data-table.small-rows td
            if (nextIndex % 5 === 0) {
              tableRef.current.scrollTop = nextIndex * rowHeight;
            }
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [produtos, selectedProduto]);

  return (
    <div className="content-stack">
      <div className="main-layout">
        <section className="table-card">
          <div className="table-card-header">

            <div className="search-controls flex items-center gap-4 flex-grow">
              <div className="search-field flex-grow">
                <Search size={20} />
                <input
                  type="text"
                  placeholder="Pesquisar por nome do produto..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  aria-label="Pesquisar produto"
                />
                {searchTerm && <button className="clear-search" onClick={() => setSearchTerm('')} aria-label="Limpar busca">×</button>}
              </div>
              <div className="filter-wrapper" title={advancedSearch ? 'A busca procura o termo em qualquer parte do nome.' : 'A busca começa pelo início do nome.'}>
                <button className={`filter-button ${advancedSearch ? 'active' : ''}`} onClick={() => setAdvancedSearch(v => !v)}>
                  <SlidersHorizontal size={17} />
                  Busca avançada
                </button>
              </div>
            </div>
            {loading && <Loader2 className="spin" size={20} />}
          </div>
          <div className={`search-options ${advancedSearch ? '' : 'hidden'}`}>
            <label className="check-option">
              <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
              <span className="custom-check" />
              Mostrar itens escondidos
            </label>
          </div>

          <div className="table-wrap" ref={tableRef}>

            <table className="data-table small-rows">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Fornecedor</th>
                  <th className="numeric">Custo</th>
                  <th className="numeric">Venda</th>
                  <th className="center">Margem</th>
                  <th>Atualização</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map(p => (
                  <tr
                    key={p.CodP}
                    className={selectedProduto?.CodP === p.CodP ? 'selected' : ''}
                    onClick={() => setSelectedProduto(p)}
                  >
                    <td>
                      <div className="product-cell">
                        <div className="product-icon"><PackageSearch size={17} /></div>
                        <div><strong>{p.Nome}</strong><small>#{p.CodP}</small></div>
                      </div>
                    </td>
                    <td className="muted">{p.fornecedor?.RazaoSocial || 'Não informado'}</td>
                    <td className="numeric">{formatCurrency(p.PrecoCompra)}</td>
                    <td className="numeric sale-price">{formatCurrency(p.PrecoVenda)}</td>
                    <td className="center"><span className="margin-badge">{Number(p.Margem).toFixed(1)}%</span></td>
                    <td className="date-cell">{formatOnlyDate(p.DataPreco)}</td>
                  </tr>
                ))}
                {produtos.length === 0 && !loading && (
                  <tr><td colSpan={6} className="empty-row"><PackageSearch size={30} /><strong>Nenhum produto encontrado</strong><span>Tente alterar o termo da pesquisa.</span></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="product-detail">
          <div className="detail-title">
            <div className="detail-icon"><PackageSearch size={22} /></div>
            <div><span>PRODUTO SELECIONADO</span><h2>{selectedProduto?.Nome || 'Nenhum produto selecionado'}</h2></div>
          </div>
          <div className="detail-grid">
            <div className="metric"><span>Preço de custo</span><strong>{selectedProduto ? formatCurrency(selectedProduto.PrecoCompra) : '—'}</strong></div>
            <div className="metric"><span>Preço de venda</span><strong className="green">{selectedProduto ? formatCurrency(selectedProduto.PrecoVenda) : '—'}</strong></div>
            <div className="metric"><span>Data</span><strong>{selectedProduto ? formatOnlyDate(selectedProduto.DataPreco) : '—'}</strong></div>
            <div className="metric"><span>Fornecedor</span><strong className="text-value">{selectedProduto?.fornecedor?.RazaoSocial || 'Não informado'}</strong></div>
          </div>
          {/* Footer removido conforme solicitado */}
        </section>
      </div>

      <div className="pagination">
        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}><ChevronLeft size={17} /> Anterior</button>
        {[1, 2, 3, 4, 5].map(page => (
          <button key={page} className={currentPage === page ? 'current' : ''} onClick={() => setCurrentPage(page)}>{page}</button>
        ))}
        <button onClick={() => setCurrentPage(p => p + 1)}>Próximo <ChevronRight size={17} /></button>
      </div>
    </div>
  );
};
