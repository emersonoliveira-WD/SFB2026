import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Search, Loader2, FileText } from 'lucide-react';
import { formatDate, formatCurrency } from '../utils/formatters';
import { TicketModal } from './TicketModal';

export const HistoricoLogs: React.FC = () => {
    const [tipo, setTipo] = useState<'vendas' | 'produtos' | 'clientes'>('vendas');
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [vendaIdParaNota, setVendaIdParaNota] = useState<number | null>(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const endpoint = tipo === 'vendas' ? '/api/vendas' : `/api/${tipo}`;
            const res = await api.get(endpoint);
            setLogs(res.data);
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
        } finally {
            setLoading(false);
        }
    }, [tipo]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    return (
        <div className="content-stack">
            {vendaIdParaNota && (
                <TicketModal
                    vendaId={vendaIdParaNota}
                    onClose={() => setVendaIdParaNota(null)}
                />
            )}
            <section className="section-toolbar">
                <div>
                    <h2>Histórico e Logs</h2>
                    <p>Consulte registros de alterações no sistema e vendas realizadas.</p>
                </div>
            </section>

            <section className="table-card">
                <div className="pdv-customer" style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', padding: '12px 18px' }}>
                    <div className="form-group">
                        <label className="pdv-field-label">Tipo</label>
                        <select value={tipo} onChange={(e) => setTipo(e.target.value as any)} className="pdv-select">
                            <option value="vendas">Vendas</option>
                            <option value="produtos">Produtos</option>
                            <option value="clientes">Clientes</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="pdv-field-label">Data Início</label>
                        <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="pdv-select" />
                    </div>
                    <div className="form-group">
                        <label className="pdv-field-label">Data Fim</label>
                        <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="pdv-select" />
                    </div>
                    <button className="primary-button" onClick={fetchLogs} disabled={loading} style={{ height: '36px', marginBottom: '0' }}>
                        {loading ? <Loader2 className="spin" size={18} /> : <Search size={18} />} Filtrar
                    </button>
                </div>

                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Descrição/Detalhes</th>
                                <th className="center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.CodV || log.CodP || log.CodC}>
                                    <td>{formatDate(log.Data)}</td>
                                    <td>
                                        {tipo === 'vendas' && `Venda #${log.CodV} - Cliente: ${log.cliente?.Nome || 'Consumidor Final'} - R$ ${formatCurrency(log.Valor)}`}
                                        {tipo === 'produtos' && `Produto: ${log.Nome} - Custo: ${formatCurrency(log.PrecoCompra)} - Venda: ${formatCurrency(log.PrecoVenda)}`}
                                        {tipo === 'clientes' && `Cliente: ${log.Nome} - Doc: ${log.Documento}`}
                                    </td>
                                    <td className="center">
                                        {tipo === 'vendas' && (
                                            <button
                                                className="primary-button"
                                                title="Ver Nota não Fiscal"
                                                onClick={() => setVendaIdParaNota(log.CodV)}
                                            >
                                                <FileText size={16} /> Ver Ticket
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {!loading && logs.length === 0 && (
                                <tr><td colSpan={3} className="empty-row">Nenhum registro encontrado</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};
