import React from 'react';
import {
  Search, Package, Truck, Users, ShoppingCart, History, LayoutDashboard,
  X, Store, Settings
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  open: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab, open, onClose }) => {
  const menuItems = [
    { id: 'consulta', label: 'Pesquisar preços', icon: Search },
    { id: 'produtos', label: 'Estoque / Produtos', icon: Package },
    { id: 'fornecedores', label: 'Fornecedores', icon: Truck },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'vendas', label: 'PDV / Vendas', icon: ShoppingCart },
    { id: 'historico', label: 'Histórico & Logs', icon: History },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  const navigate = (id: string) => {
    setCurrentTab(id);
    onClose();
  };

  return (
    <>
      {open && <button className="sidebar-overlay" aria-label="Fechar menu" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Store size={21} strokeWidth={2.4} /></div>
          <div className="brand-copy">
            <strong>Frente Balcão</strong>
            <span>Gestão de vendas</span>
          </div>
          <button className="sidebar-close" onClick={onClose} aria-label="Fechar menu"><X size={20} /></button>
        </div>

        <div className="nav-label">MENU PRINCIPAL</div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={19} strokeWidth={isActive ? 2.2 : 2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="online-status"><span /> Sistema online</div>
          <small>FastAPI + React</small>
        </div>
      </aside>
    </>
  );
};
