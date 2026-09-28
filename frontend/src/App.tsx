import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ConsultaProdutos } from './components/ConsultaProdutos';
import { Produtos } from './components/Produtos';
import { Clientes } from './components/Clientes';
import { Fornecedores } from './components/Fornecedores';
import { PDV } from './components/PDV';
import { HistoricoLogs } from './components/HistoricoLogs';
import { Configuracoes } from './components/Configuracoes';
import { Bell, ChevronRight, Menu } from 'lucide-react';

const pageTitles: Record<string, { title: string; description: string }> = {
  consulta: { title: 'Pesquisa de preços', description: 'Consulte preços, margens e fornecedores.' },
  produtos: { title: 'Produtos', description: 'Gerencie o catálogo e os preços dos produtos.' },
  clientes: { title: 'Clientes', description: 'Consulte e gerencie seus clientes.' },
  fornecedores: { title: 'Fornecedores', description: 'Área de fornecedores.' },
  vendas: { title: 'PDV / Vendas', description: 'Área de vendas.' },
  historico: { title: 'Histórico & Logs', description: 'Acompanhe alterações e registros do sistema.' },
  configuracoes: { title: 'Configurações', description: 'Configure informações da loja.' },
  dashboard: { title: 'Dashboard', description: 'Visão geral do sistema.' },
};

function App() {
  const [currentTab, setCurrentTab] = useState('consulta');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const page = pageTitles[currentTab] ?? { title: currentTab, description: '' };

  const renderContent = () => {
    switch (currentTab) {
      case 'consulta': return <ConsultaProdutos />;
      case 'produtos': return <Produtos />;
      case 'clientes': return <Clientes />;
      case 'fornecedores': return <Fornecedores />;
      case 'vendas': return <PDV />;
      case 'historico': return <HistoricoLogs />;
      case 'configuracoes': return <Configuracoes />;
      default:
        return (
          <section className="empty-state">
            <div className="empty-state-icon"><Menu size={24} /></div>
            <h2>Em construção</h2>
            <p>Esta seção estará disponível em uma próxima etapa.</p>
          </section>
        );
    }
  };

  return (
    <div className="app-shell">
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" aria-label="Abrir menu" onClick={() => setSidebarOpen(true)}>
              <Menu size={22} />
            </button>
            <div className="breadcrumb">
              <span>Início</span>
              <ChevronRight size={15} />
              <strong>{page.title}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Notificações"><Bell size={19} /></button>
            <div className="user-chip">
              <div className="avatar">SF</div>
              <div className="user-copy">
                <strong>Frente Balcão</strong>
                <span>Administrador</span>
              </div>
            </div>
          </div>
        </header>

        <main className="page-content">
          <div className="page-heading">
            <div>
            </div>
          </div>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
