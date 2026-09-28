import React, { useState } from 'react';
import api from '../services/api';
import { Printer, X, ReceiptText } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface Ticket {
  loja: { Nome: string; CNPJ: string; Endereco: string; Telefone: string };
  venda: { CodV: number; Data: string; Valor: number; FormaPagamento: string; Cliente: string };
  itens: { Nome: string; Quantidade: number; ValorP: string }[];
}

interface Props {
  vendaId: number;
  onClose: () => void;
}

export const TicketModal: React.FC<Props> = ({ vendaId, onClose }) => {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    api.get(`/api/vendas/${vendaId}/ticket`).then(res => {
      setTicket(res.data);
      setLoading(false);
    });
  }, [vendaId]);

  const imprimir = () => {
    window.print();
  };

  if (loading) return (
    <div className="modal-backdrop">
      <div className="modal-box modal-box--sm">
        <div className="modal-body" style={{ textAlign: 'center', padding: '40px' }}>
          <p>Carregando ticket...</p>
        </div>
      </div>
    </div>
  );

  if (!ticket) return (
    <div className="modal-backdrop">
      <div className="modal-box modal-box--sm">
        <div className="modal-body" style={{ textAlign: 'center', padding: '40px' }}>
          <p>Erro ao carregar ticket.</p>
          <button className="btn-secondary" onClick={onClose} style={{ marginTop: '15px' }}>Fechar</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box ticket-modal">
        <div className="modal-header">
          <div className="modal-header-icon modal-header-icon--blue">
            <ReceiptText size={20} />
          </div>
          <div>
            <h2>Ticket de Venda</h2>
            <p>Visualização para impressão térmica</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </div>

        <div className="modal-body ticket-print">
          <div className="ticket-header">
            <strong>{ticket.loja.Nome}</strong>
            <p>{ticket.loja.CNPJ}</p>
            <p>{ticket.loja.Endereco}</p>
            <p>Tel: {ticket.loja.Telefone}</p>
          </div>
          <hr />
          <p>Data: {new Date(ticket.venda.Data).toLocaleString()}</p>
          <p>Cliente: {ticket.venda.Cliente}</p>
          <hr />
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qtd</th>
                <th>Vlr</th>
              </tr>
            </thead>
            <tbody>
              {ticket.itens.map((item, i) => (
                <tr key={i}>
                  <td>{item.Nome}</td>
                  <td>{item.Quantidade}</td>
                  <td>{formatCurrency(parseFloat(item.ValorP))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr />
          <p><strong>Total: {formatCurrency(ticket.venda.Valor)}</strong></p>
          <p>Forma Pagamento: {ticket.venda.FormaPagamento}</p>
          <hr />
          <p className="ticket-disclaimer">**Este ticket não é documento fiscal**</p>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Fechar
          </button>
          <button className="btn-primary" onClick={imprimir}>
            <Printer size={15} /> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
};
