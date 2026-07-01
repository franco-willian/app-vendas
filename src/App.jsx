import React, { useState, useEffect, useContext } from "react";
import { Toaster, toast } from "react-hot-toast";
import { DatabaseProvider, DatabaseContext } from "./context/DatabaseContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import Dashboard from "./pages/Dashboard";
import Checkout from "./pages/Checkout";
import CargaDiaria from "./pages/CargaDiaria";
import PedidosOnline from "./pages/PedidosOnline";
import Produtos from "./pages/Produtos";
import Clientes from "./pages/Clientes";
import LojaOnline from "./pages/LojaOnline";
import Login from "./pages/Login";
import VendasFiado from "./pages/VendasFiado";
import Usuarios from "./pages/Usuarios";
import RelatorioCaixa from "./pages/RelatorioCaixa";
import Notificacoes from "./pages/Notificacoes";
import GatewayPagamento from "./pages/GatewayPagamento";
import HistoricoVendas from "./pages/HistoricoVendas";
import SistemaBackup from "./pages/SistemaBackup";
import SistemaStatus from "./pages/SistemaStatus";
import SistemaConfig from "./pages/SistemaConfig";
import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  Globe,
  Users,
  Package,
  WifiOff,
  Store,
  LogOut,
  UserCheck,
  DollarSign,
  MessageSquare,
  CreditCard,
  History,
  Settings,
  ChevronDown,
  ChevronRight,
  Database,
  Activity,
  Server,
} from "lucide-react";

function AppContent() {
  const [currentPage, setCurrentPage] = useState("dashboard"); // 'dashboard', 'checkout', 'carga', 'pedidos', 'produtos', 'clientes', 'usuarios'
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("vendas_logged_in") === "true";
  });

  const [hashRoute, setHashRoute] = useState(window.location.hash);
  const [isSistemaMenuOpen, setIsSistemaMenuOpen] = useState(false);

  // Monitorar rota de hash (PWA / Offline routing)
  useEffect(() => {
    const handleHashChange = () => {
      setHashRoute(window.location.hash);
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileNome, setProfileNome] = useState("");
  const [profileUsuario, setProfileUsuario] = useState("");
  const [profileSenha, setProfileSenha] = useState("");

  const {
    offlineMode,
    setOfflineMode,
    activeCarga,
    pedidosOnline,
    currentUser,
    logoutUser,
    salesNotifications,
    updateUsuario,
  } = useContext(DatabaseContext);

  const pendingOrdersCount = pedidosOnline.filter(
    (p) => p.status === "pendente",
  ).length;

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    localStorage.setItem("vendas_logged_in", "true");
  };

  const handleLogout = () => {
    logoutUser();
    setIsLoggedIn(false);
    localStorage.removeItem("vendas_logged_in");
  };

  // Se a rota for a loja pública do cliente
  if (hashRoute.startsWith("#/loja")) {
    return (
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "16px 0" }}>
        <LojaOnline />
      </div>
    );
  }

  // Se não estiver logado na área administrativa
  if (!isLoggedIn || !currentUser) {
    return <Login onLogin={handleLoginSuccess} />;
  }

  // Área Administrativa Logada
  const renderAdminPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "checkout":
        return <Checkout />;
      case "carga":
        return <CargaDiaria />;
      case "pedidos":
        return <PedidosOnline />;
      case "produtos":
        return <Produtos />;
      case "historico":
        return <HistoricoVendas />;
      case "clientes":
        return <Clientes />;
      case "fiado":
        return <VendasFiado />;
      case "usuarios":
        return <Usuarios />;
      case "relatorio-caixa":
        return <RelatorioCaixa />;
      case "notificacoes":
        return <Notificacoes />;
      case "gateway-pagamento":
        return <GatewayPagamento />;
      case "sistema-backup":
        return <SistemaBackup />;
      case "sistema-status":
        return <SistemaStatus />;
      case "sistema-config":
        return <SistemaConfig />;
      default:
        return <Dashboard />;
    }
  };

  const isAdmin =
    currentUser.tipo === "admin-vendedor" ||
    currentUser.tipo === "gerente" ||
    currentUser.tipo === "admin";

  return (
    <>
      {/* Alerta de Modo Offline Simulado */}
      {offlineMode && (
        <div className="offline-banner">
          <WifiOff size={16} /> Modo Offline Ativo (Simulado para Vendas de Rua
          sem Sinal)
        </div>
      )}

      {/* Header Admin */}
      <header className="app-header">
        <div
          className="container flex-between"
          style={{ flexWrap: "wrap", gap: "12px" }}
        >
          {/* Logo e Título */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background:
                  "linear-gradient(135deg, var(--primary) 0%, #3b82f6 100%)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "20px",
              }}
            >
              V
            </div>
            <div>
              <h1
                style={{
                  fontSize: "20px",
                  margin: 0,
                  letterSpacing: "-0.5px",
                  fontWeight: 700,
                }}
              >
                VendaRápida
              </h1>
              <span
                style={{ fontSize: "11px", color: "var(--text-secondary)" }}
              >
                Painel de Controle de Vendas
              </span>
            </div>
          </div>

          {/* Opções de Controle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            {/* Link para a Loja do Cliente */}
            <a
              className="btn btn-secondary"
              href="#/loja"
              style={{ fontSize: "13px", padding: "8px 14px" }}
            >
              <Store size={14} /> Ver Loja Online
            </a>

            {/* Usuário Logado */}
            <button
              onClick={() => {
                setProfileNome(currentUser.nome);
                setProfileUsuario(currentUser.usuario);
                setProfileSenha(currentUser.senha || "");
                setIsProfileModalOpen(true);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                color: "var(--text-secondary)",
                background: "var(--bg-app)",
                padding: "6px 12px",
                borderRadius: "20px",
                border: "1px solid var(--border)",
                cursor: "pointer",
              }}
            >
              <UserCheck size={14} style={{ color: "var(--primary)" }} />
              <span>
                Olá, <strong>{currentUser.nome}</strong>
              </span>
            </button>

            {/* Logout */}
            <button
              className="btn btn-secondary btn-icon"
              onClick={handleLogout}
              title="Sair do Painel"
              style={{ width: "36px", height: "36px", padding: 0 }}
            >
              <LogOut size={16} style={{ color: "var(--danger)" }} />
            </button>

            {/* Simulação Sem Sinal */}
            <div className="switch-container hide-on-mobile">
              <span
                style={{
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  fontSize: "13px",
                }}
              >
                Sem Sinal
              </span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={offlineMode}
                  onChange={(e) => setOfflineMode(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>
      </header>

      {/* Grid de Navegação e Conteúdo do App */}
      <main className="app-container">
        <div className="container">
          <div className="admin-layout-grid">
            {/* Sidebar Navegação (Desktop) */}
            <aside
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                textAlign: "left",
              }}
              className="desktop-nav-sidebar"
            >
              <button
                className={`btn w-full ${currentPage === "dashboard" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setCurrentPage("dashboard")}
                style={{ justifyContent: "flex-start" }}
              >
                <LayoutDashboard size={16} /> Painel Geral
              </button>

              <button
                className={`btn w-full ${currentPage === "checkout" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setCurrentPage("checkout")}
                style={{ justifyContent: "flex-start" }}
              >
                <ShoppingCart size={16} /> Registrar Venda
              </button>

              <button
                className={`btn w-full ${currentPage === "carga" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setCurrentPage("carga")}
                style={{ justifyContent: "flex-start" }}
              >
                <Truck size={16} />
                Carga de Rua
                {activeCarga && (
                  <span
                    className="badge badge-success"
                    style={{ fontSize: "9px", marginLeft: "auto" }}
                  >
                    Ativa
                  </span>
                )}
              </button>

              <button
                className={`btn w-full ${currentPage === "pedidos" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setCurrentPage("pedidos")}
                style={{ justifyContent: "flex-start" }}
              >
                <Globe size={16} />
                Pedidos Online
                {pendingOrdersCount > 0 && (
                  <span
                    className="badge badge-danger"
                    style={{ fontSize: "9px", marginLeft: "auto" }}
                  >
                    {pendingOrdersCount}
                  </span>
                )}
              </button>

              <button
                className={`btn w-full ${currentPage === "produtos" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setCurrentPage("produtos")}
                style={{ justifyContent: "flex-start" }}
              >
                <Package size={16} /> Produtos
              </button>

              {isAdmin && (
                <button
                  className={`btn w-full ${currentPage === "historico" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setCurrentPage("historico")}
                  style={{ justifyContent: "flex-start" }}
                >
                  <History size={16} /> Histórico de Vendas
                </button>
              )}

              <button
                className={`btn w-full ${currentPage === "clientes" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setCurrentPage("clientes")}
                style={{ justifyContent: "flex-start" }}
              >
                <Users size={16} /> Clientes
              </button>

              <button
                className={`btn w-full ${currentPage === "fiado" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setCurrentPage("fiado")}
                style={{ justifyContent: "flex-start" }}
              >
                <DollarSign size={16} /> Contas a Receber
              </button>

              {/* Botões restritos para admin */}
              {isAdmin && (
                <>
                  <button
                    className={`btn w-full ${currentPage === "relatorio-caixa" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setCurrentPage("relatorio-caixa")}
                    style={{
                      justifyContent: "flex-start",
                      marginTop: "12px",
                      borderLeft: "3px solid var(--primary)",
                    }}
                  >
                    <DollarSign size={16} style={{ color: "var(--primary)" }} />{" "}
                    Relatório do Caixa
                  </button>

                  <button
                    className={`btn w-full ${currentPage === "usuarios" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setCurrentPage("usuarios")}
                    style={{
                      justifyContent: "flex-start",
                      borderLeft: "3px solid var(--primary)",
                    }}
                  >
                    <Users size={16} style={{ color: "var(--primary)" }} />{" "}
                    Gerenciar Usuários
                  </button>

                  <button
                    className={`btn w-full ${currentPage === "notificacoes" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setCurrentPage("notificacoes")}
                    style={{
                      justifyContent: "flex-start",
                      borderLeft: "3px solid var(--primary)",
                      marginTop: "8px",
                    }}
                  >
                    <MessageSquare
                      size={16}
                      style={{ color: "var(--primary)" }}
                    />{" "}
                    Notificações
                  </button>

                  <button
                    className={`btn w-full ${currentPage === "gateway-pagamento" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setCurrentPage("gateway-pagamento")}
                    style={{
                      justifyContent: "flex-start",
                      borderLeft: "3px solid var(--primary)",
                      marginTop: "8px",
                    }}
                  >
                    <CreditCard size={16} style={{ color: "var(--primary)" }} />{" "}
                    Gateway de Pagamento
                  </button>

                  <div style={{ marginTop: "8px" }}>
                    <button
                      className={`btn w-full ${currentPage.startsWith("sistema-") ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setIsSistemaMenuOpen(!isSistemaMenuOpen)}
                      style={{
                        justifyContent: "space-between",
                        borderLeft: "3px solid var(--primary)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Settings size={16} style={{ color: "var(--primary)" }} />{" "}
                        Sistema
                      </div>
                      {isSistemaMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    {isSistemaMenuOpen && (
                      <div style={{ 
                        display: "flex", 
                        flexDirection: "column", 
                        gap: "4px", 
                        paddingLeft: "24px", 
                        marginTop: "8px",
                        animation: "fadeIn 0.2s ease-out" 
                      }}>
                        <button
                          className={`btn w-full ${currentPage === "sistema-backup" ? "btn-primary" : "btn-secondary"}`}
                          onClick={() => setCurrentPage("sistema-backup")}
                          style={{ justifyContent: "flex-start", padding: "6px 12px", fontSize: "13px" }}
                        >
                          <Database size={14} style={{ marginRight: "6px", color: "var(--primary)" }} /> Backup
                        </button>
                        <button
                          className={`btn w-full ${currentPage === "sistema-status" ? "btn-primary" : "btn-secondary"}`}
                          onClick={() => setCurrentPage("sistema-status")}
                          style={{ justifyContent: "flex-start", padding: "6px 12px", fontSize: "13px" }}
                        >
                          <Activity size={14} style={{ marginRight: "6px", color: "var(--primary)" }} /> Status
                        </button>
                        <button
                          className={`btn w-full ${currentPage === "sistema-config" ? "btn-primary" : "btn-secondary"}`}
                          onClick={() => setCurrentPage("sistema-config")}
                          style={{ justifyContent: "flex-start", padding: "6px 12px", fontSize: "13px" }}
                        >
                          <Server size={14} style={{ marginRight: "6px", color: "var(--primary)" }} /> Config Server
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </aside>

            {/* Área Principal */}
            <section style={{ minWidth: 0 }}>{renderAdminPage()}</section>
          </div>
        </div>
      </main>

      {/* Navegação Mobile Inferior */}
      <nav className="mobile-nav">
        <button
          className={`mobile-nav-item ${currentPage === "dashboard" ? "active" : ""}`}
          onClick={() => setCurrentPage("dashboard")}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </button>

        <button
          className={`mobile-nav-item ${currentPage === "checkout" ? "active" : ""}`}
          onClick={() => setCurrentPage("checkout")}
        >
          <ShoppingCart size={20} />
          <span>Vender</span>
        </button>

        <button
          className={`mobile-nav-item ${currentPage === "carga" ? "active" : ""}`}
          onClick={() => setCurrentPage("carga")}
        >
          <Truck size={20} />
          <span>Carga</span>
        </button>

        <button
          className={`mobile-nav-item ${currentPage === "pedidos" ? "active" : ""}`}
          onClick={() => setCurrentPage("pedidos")}
          style={{ position: "relative" }}
        >
          <Globe size={20} />
          {pendingOrdersCount > 0 && (
            <span className="cart-badge" style={{ top: "2px", right: "16px" }}>
              {pendingOrdersCount}
            </span>
          )}
          <span>Pedidos</span>
        </button>

        {/* Se for admin/gerente, exibir Produtos e Relatórios. Se não, oculta ambos. */}
        {isAdmin && (
          <>
            <button
              className={`mobile-nav-item ${currentPage === "produtos" ? "active" : ""}`}
              onClick={() => setCurrentPage("produtos")}
            >
              <Package size={20} />
              <span>Produtos</span>
            </button>
            <button
              className={`mobile-nav-item ${currentPage === "historico" ? "active" : ""}`}
              onClick={() => setCurrentPage("historico")}
            >
              <History size={20} />
              <span>Histórico</span>
            </button>
            <button
              className={`mobile-nav-item ${currentPage === "relatorio-caixa" ? "active" : ""}`}
              onClick={() => setCurrentPage("relatorio-caixa")}
            >
              <DollarSign size={20} />
              <span>Relatório</span>
            </button>
          </>
        )}
      </nav>
      {/* Toast Notifications Container */}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          maxWidth: "350px",
        }}
      >
        {salesNotifications &&
          salesNotifications.map((toast) => (
            <div
              key={toast.id}
              style={{
                background: "var(--success, #22c55e)",
                color: "white",
                padding: "12px 18px",
                borderRadius: "var(--radius-sm, 6px)",
                boxShadow: "var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1))",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                animation: "slideUp 0.3s ease-out",
                fontSize: "13px",
                fontWeight: 500,
                borderLeft: "4px solid #16a34a",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "11px",
                    textTransform: "uppercase",
                    opacity: 0.9,
                  }}
                >
                  Nova Venda!
                </span>
                <span>{toast.msg}</span>
              </div>
            </div>
          ))}
      </div>

      {/* Profile Edit Modal */}
      {isProfileModalOpen && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            className="modal-content"
            style={{
              background: "var(--bg-app)",
              width: "100%",
              maxWidth: "400px",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              className="modal-header"
              style={{
                padding: "20px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ fontSize: "18px", margin: 0 }}>Editar Meu Perfil</h3>
              <button
                className="btn btn-secondary btn-icon"
                style={{ padding: "4px" }}
                onClick={() => setIsProfileModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!profileNome || !profileUsuario || !profileSenha) {
                  toast.error("Preencha todos os campos obrigatórios.");
                  return;
                }
                updateUsuario(currentUser.id, {
                  nome: profileNome,
                  usuario: profileUsuario,
                  senha: profileSenha,
                });
                setIsProfileModalOpen(false);
                toast.success("Perfil atualizado com sucesso!");
              }}
            >
              <div
                className="modal-body"
                style={{
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nome Completo *</label>
                  <input
                    type="text"
                    className="form-input w-full"
                    value={profileNome}
                    onChange={(e) => setProfileNome(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Nome de Usuário (Login) *
                  </label>
                  <input
                    type="text"
                    className="form-input w-full"
                    value={profileUsuario}
                    onChange={(e) => setProfileUsuario(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nova Senha *</label>
                  <input
                    type="password"
                    className="form-input w-full"
                    value={profileSenha}
                    onChange={(e) => setProfileSenha(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div
                className="modal-footer"
                style={{
                  padding: "16px 20px",
                  borderTop: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsProfileModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSS responsivo */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav-sidebar {
            display: none !important;
          }
          main {
            padding-bottom: 90px !important;
          }
          header .container {
            justify-content: center !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-nav {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}

function App() {
  return (
    <ConfirmProvider>
      <DatabaseProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            },
            success: {
              iconTheme: {
                primary: 'var(--success)',
                secondary: 'white',
              },
            },
            error: {
              iconTheme: {
                primary: 'var(--danger)',
                secondary: 'white',
              },
            },
          }}
        />
        <AppContent />
      </DatabaseProvider>
    </ConfirmProvider>
  );
}

export default App;
