import React, { useEffect, useState } from 'react';
import api from '../services/api';
import type { Cliente, Produto } from '../types';
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Minus,
  Package,
  Plus,
  ReceiptText,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
  XCircle,
} from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';
import { formatCurrency } from '../utils/formatters';
import { TicketModal } from './TicketModal';

type Feedback = { type: 'success' | 'error'; message: string } | null;

type CartItem = {
  produto: Produto;
  quantidade: number;
};

export const PDV: React.FC = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clienteCod, setClienteCod] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [emitirFiscal, setEmitirFiscal] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState('Dinheiro');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [vendaFinalizadaId, setVendaFinalizadaId] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [prodRes, cliRes] = await Promise.all([
          api.get('/api/produtos', { params: { search: searchTerm, limit: 1000 } }),
          api.get('/api/clientes'),
        ]);
        setProdutos(prodRes.data);
        setClientes(cliRes.data);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setFeedback({ type: 'error', message: 'Não foi possível carregar os produtos e clientes.' });
      } finally {
        setLoading(false);
      }
    };

    const delayDebounce = setTimeout(fetchData, searchTerm ? 300 : 0);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4500);
    return () => clearTimeout(timer);
  }, [feedback]);

  const addToCart = (produto: Produto) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.produto.CodP === produto.CodP);
      if (existing) {
        return prev.map((item) =>
          item.produto.CodP === produto.CodP
            ? { ...item, quantidade: item.quantidade + 1 }
            : item,
        );
      }
      return [...prev, { produto, quantidade: 1 }];
    });
  };

  const updateCartQty = (codP: number, newQty: number) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((item) => item.produto.CodP !== codP));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.produto.CodP === codP ? { ...item, quantidade: newQty } : item,
      ),
    );
  };

  const removeFromCart = (codP: number) => {
    setCart((prev) => prev.filter((item) => item.produto.CodP !== codP));
  };

  const total = cart.reduce(
    (acc, item) => acc + item.produto.PrecoVenda * item.quantidade,
    0,
  );
  const totalItens = cart.reduce((acc, item) => acc + item.quantidade, 0);

  const finalizarVenda = async () => {
    if (cart.length === 0) return;

    setLoading(true);
    try {
      const codC = clienteCod !== '' ? parseInt(clienteCod, 10) : null;
      const vendaData = {
        CodC: codC !== null && !Number.isNaN(codC) ? codC : null,
        Valor: total,
        FormaPagamento: formaPagamento,
        itens: cart.map((item) => ({
          CodP: item.produto.CodP,
          Quantidade: item.quantidade,
          ValorP: item.produto.PrecoVenda,
        })),
      };

      const res = await api.post('/api/vendas', vendaData);

      if (emitirFiscal) {
        await api.post('/api/fiscal/emitir_nota', {
          venda_id: res.data.CodV,
          tipo_documento: 'NFC-E',
        });
      }

      setCart([]);
      setClienteCod('');
      setEmitirFiscal(false);
      setVendaFinalizadaId(res.data.CodV);
      setFeedback({ type: 'success', message: 'Venda finalizada com sucesso.' });
    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
      setFeedback({ type: 'error', message: 'Não foi possível finalizar a venda. Verifique os dados e tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pdv-page">
      {vendaFinalizadaId && (
        <TicketModal
          vendaId={vendaFinalizadaId}
          onClose={() => setVendaFinalizadaId(null)}
        />
      )}
      {feedback && (
        <div className={`pdv-toast pdv-toast--${feedback.type}`} role="status">
          {feedback.type === 'success' ? <CheckCircle2 size={19} /> : <XCircle size={19} />}
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} aria-label="Fechar mensagem">
            ×
          </button>
        </div>
      )}

      <div className="pdv-overview">
        <div className="pdv-overview-copy">
          <div className="eyebrow">OPERAÇÃO DE CAIXA</div>
          <h2>Venda em aberto</h2>
          <p>Adicione produtos ao carrinho, selecione o cliente e finalize a venda.</p>
        </div>
        <div className="pdv-summary">
          <div className="pdv-summary-icon"><ShoppingCart size={19} /></div>
          <div>
            <span>Itens no carrinho</span>
            <strong>{totalItens}</strong>
          </div>
          <div className="pdv-summary-divider" />
          <div>
            <span>Total da venda</span>
            <strong className="pdv-summary-total">{formatCurrency(total)}</strong>
          </div>
        </div>
      </div>

      <div className="pdv-layout">
        <section className="table-card pdv-products-card">
          <div className="pdv-card-header">
            <div className="pdv-section-title">
              <div className="pdv-section-icon"><Package size={18} /></div>
              <div>
                <h3>Produtos</h3>
                <p>Pesquise e adicione itens à venda</p>
              </div>
            </div>
            <span className="pdv-count">{produtos.length} disponíveis</span>
          </div>

          <div className="pdv-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar produto por nome ou código..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            {loading && <Loader2 size={17} className="pdv-spin" />}
          </div>

          <div className="table-wrap pdv-product-table-wrap">
            <table className="data-table pdv-product-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th className="numeric">Preço</th>
                  <th className="center">Ação</th>
                </tr>
              </thead>
              <tbody>
                {!loading && produtos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="pdv-empty-cell">
                      <Package size={30} />
                      <strong>Nenhum produto encontrado</strong>
                      <span>Tente alterar o termo de pesquisa.</span>
                    </td>
                  </tr>
                ) : (
                  produtos.map((produto) => (
                    <tr key={produto.CodP}>
                      <td>
                        <div className="product-cell">
                          <div className="product-icon"><Package size={16} /></div>
                          <div>
                            <strong>{produto.Nome}</strong>
                            <small>Código {produto.CodP}</small>
                          </div>
                        </div>
                      </td>
                      <td className="numeric sale-price">{formatCurrency(produto.PrecoVenda)}</td>
                      <td className="center">
                        <button
                          type="button"
                          className="pdv-add-button"
                          onClick={() => addToCart(produto)}
                        >
                          <Plus size={14} />
                          Adicionar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="table-card pdv-cart-card">
          <div className="pdv-card-header pdv-cart-header">
            <div className="pdv-section-title">
              <div className="pdv-section-icon pdv-section-icon--green"><ShoppingCart size={18} /></div>
              <div>
                <h3>Carrinho</h3>
                <p>{totalItens === 0 ? 'Nenhum item adicionado' : `${totalItens} ${totalItens === 1 ? 'item' : 'itens'} na venda`}</p>
              </div>
            </div>
          </div>

          <div className="pdv-customer">
            <div className="pdv-field-label">
              <UserRound size={14} />
              <span>Cliente</span>
              <small>Opcional</small>
            </div>
            <SearchableSelect
              value={clienteCod}
              onChange={setClienteCod}
              options={clientes.map((cliente) => ({
                label: `${cliente.Nome} (${cliente.Documento})`,
                value: cliente.CodC.toString(),
              }))}
              placeholder="Selecionar cliente..."
            />
          </div>

          <div className="pdv-cart-list">
            {cart.length === 0 ? (
              <div className="pdv-cart-empty">
                <div className="pdv-cart-empty-icon"><ShoppingCart size={24} /></div>
                <strong>Carrinho vazio</strong>
                <span>Adicione produtos pelo painel ao lado.</span>
              </div>
            ) : (
              cart.map((item) => (
                <div className="pdv-cart-item" key={item.produto.CodP}>
                  <div className="pdv-cart-item-main">
                    <div className="pdv-cart-item-icon"><Package size={15} /></div>
                    <div className="pdv-cart-item-name">
                      <strong>{item.produto.Nome}</strong>
                      <span>{formatCurrency(item.produto.PrecoVenda)} cada</span>
                    </div>
                  </div>
                  <div className="pdv-cart-item-actions">
                    <div className="pdv-qty-control">
                      <button type="button" onClick={() => updateCartQty(item.produto.CodP, item.quantidade - 1)} aria-label="Diminuir quantidade">
                        <Minus size={13} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantidade}
                        onChange={(event) => updateCartQty(item.produto.CodP, parseInt(event.target.value, 10) || 0)}
                        aria-label={`Quantidade de ${item.produto.Nome}`}
                      />
                      <button type="button" onClick={() => updateCartQty(item.produto.CodP, item.quantidade + 1)} aria-label="Aumentar quantidade">
                        <Plus size={13} />
                      </button>
                    </div>
                    <strong className="pdv-cart-item-total">{formatCurrency(item.produto.PrecoVenda * item.quantidade)}</strong>
                    <button type="button" className="pdv-remove-button" onClick={() => removeFromCart(item.produto.CodP)} aria-label={`Remover ${item.produto.Nome}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pdv-checkout">
            <div className="pdv-checkout-total">
              <span>Total a pagar</span>
              <strong>{formatCurrency(total)}</strong>
            </div>

          <div className="pdv-customer">
            <div className="pdv-field-label">
              <CreditCard size={14} />
              <span>Forma de Pagamento</span>
            </div>
            <select
              className="pdv-select"
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value)}
            >
              <option value="Dinheiro">Dinheiro</option>
              <option value="Cartão de Crédito">Cartão de Crédito</option>
              <option value="Cartão de Débito">Cartão de Débito</option>
              <option value="Pix">Pix</option>
            </select>
          </div>

            <label className="pdv-fiscal-option">
              <input type="checkbox" checked={emitirFiscal} onChange={(event) => setEmitirFiscal(event.target.checked)} />
              <span className="pdv-checkbox" />
              <ReceiptText size={16} />
              <span>Emitir NFC-e</span>
            </label>

            <button
              type="button"
              onClick={finalizarVenda}
              disabled={loading || cart.length === 0}
              className="pdv-finalize-button"
            >
              {loading ? <Loader2 size={18} className="pdv-spin" /> : <CreditCard size={18} />}
              {loading ? 'Processando...' : 'Finalizar venda'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
