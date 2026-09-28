import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Save, Loader2, Settings } from 'lucide-react';
import { formatCNPJ, formatTelefone } from '../utils/formatters';

export const Configuracoes: React.FC = () => {
    const [config, setConfig] = useState({
        NomeLoja: '',
        CNPJ: '',
        Endereco: '',
        Email: '',
        Telefone: ''
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleCNPJ = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfig({...config, CNPJ: formatCNPJ(e.target.value)});
    };

    const handleTelefone = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfig({...config, Telefone: formatTelefone(e.target.value)});
    };

    useEffect(() => {
        const fetchConfig = async () => {
            setLoading(true);
            try {
                const res = await api.get('/api/config');
                if (res.data) setConfig(res.data);
            } catch (error) {
                console.error('Erro ao buscar config:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/api/config', config);
            alert('Configurações salvas!');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="content-stack">
            <section className="section-toolbar">
                <div>
                    <h2>Configurações</h2>
                    <p>Gerencie as informações da loja.</p>
                </div>
            </section>
            <section className="table-card" style={{ padding: '20px' }}>
                <div className="form-group">
                    <label>Nome da Loja</label>
                    <input className="form-input" value={config.NomeLoja} onChange={(e) => setConfig({...config, NomeLoja: e.target.value})} />
                </div>
                <div className="form-group">
                    <label>CNPJ</label>
                    <input className="form-input" value={config.CNPJ} onChange={handleCNPJ} />
                </div>
                <div className="form-group">
                    <label>Endereço</label>
                    <input className="form-input" value={config.Endereco} onChange={(e) => setConfig({...config, Endereco: e.target.value})} />
                </div>
                <div className="form-group">
                    <label>E-mail</label>
                    <input className="form-input" value={config.Email} onChange={(e) => setConfig({...config, Email: e.target.value})} />
                </div>
                <div className="form-group">
                    <label>Telefone</label>
                    <input className="form-input" value={config.Telefone} onChange={handleTelefone} />
                </div>
                <button className="primary-button" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="spin" size={18} /> : <Save size={18} />} Salvar
                </button>
            </section>
        </div>
    );
};
