import React, { useContext } from "react";
import { DatabaseContext } from "../context/DatabaseContext";
import { toast } from 'react-hot-toast';
import { useConfirm } from '../context/ConfirmContext';
import {
  DollarSign,
  ShoppingBag,
  Truck,
  Globe,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  User,
  Tag,
} from "lucide-react";

export default function Dashboard() {
  const { confirm } = useConfirm();
  const {
    vendas,
    despesas,
    offlineMode,
    sincronizarVendasOffline,
    currentUser,
    resetDatabase,
  } = useContext(DatabaseContext);

  // Helper para verificar se a data é hoje
  const isToday = (dateStr) =>
    new Date(dateStr).toDateString() === new Date().toDateString();

  // Calcular métricas
  const nomeVendedor = currentUser ? currentUser.nome : "Vendedor";

  const validVendasForRevenue = vendas.filter(
    (v) => !(v.formaPagamento === "Fiado" && v.statusPagamento === "pendente"),
  );

  const faturamentoGeral = validVendasForRevenue.reduce(
    (acc, v) => acc + v.total,
    0,
  );

  const faturamentoGeralHoje = validVendasForRevenue
    .filter((v) => isToday(v.data))
    .reduce((acc, v) => acc + v.total, 0);

  const custoProdutosVendidos = validVendasForRevenue.reduce(
    (acc, v) =>
      acc +
      v.itens.reduce(
        (sum, item) =>
          sum + (item.custoUnitario || item.custo || 0) * item.quantidade,
        0,
      ),
    0,
  );
  const totalDespesas = despesas
    ? despesas.reduce((acc, d) => acc + (d.valor || 0), 0)
    : 0;
  const lucroLiquidoGeral =
    faturamentoGeral - custoProdutosVendidos - totalDespesas;

  const totalDescontosGerados = vendas.reduce((acc, v) => acc + (v.desconto || 0), 0);

  const faturamentoVendedor = validVendasForRevenue
    .filter((v) => v.vendedor === nomeVendedor)
    .reduce((acc, v) => acc + v.total, 0);

  const faturamentoVendedorHoje = validVendasForRevenue
    .filter((v) => v.vendedor === nomeVendedor && isToday(v.data))
    .reduce((acc, v) => acc + v.total, 0);

  const totalVendas = vendas.length;

  const faturamentoRua = validVendasForRevenue
    .filter((v) => v.tipoVenda === "Rua")
    .reduce((acc, v) => acc + v.total, 0);

  const faturamentoOnline = validVendasForRevenue
    .filter((v) => v.tipoVenda === "Online")
    .reduce((acc, v) => acc + v.total, 0);

  const isManagerOrAdmin =
    currentUser &&
    (currentUser.tipo === "admin-vendedor" ||
      currentUser.tipo === "admin" ||
      currentUser.tipo === "gerente");

  const todayStr = new Date().toDateString();
  const vendasDoDia = validVendasForRevenue.filter(
    (v) => new Date(v.data).toDateString() === todayStr,
  );

  const faturamentoRuaHoje = vendasDoDia
    .filter((v) => v.tipoVenda === "Rua" && v.vendedor === nomeVendedor)
    .reduce((acc, v) => acc + v.total, 0);

  const faturamentoOnlineHoje = vendasDoDia
    .filter((v) => v.tipoVenda === "Online")
    .reduce((acc, v) => acc + v.total, 0);

  const totalVendasVendedor = vendas.filter(
    (v) => v.vendedor === nomeVendedor,
  ).length;

  const vendasOfflinePendentes = vendas.filter((v) => !v.synced).length;

  const totalFiadoReceber = vendas
    .filter(
      (v) => v.formaPagamento === "Fiado" && v.statusPagamento === "pendente",
    )
    .reduce((acc, v) => acc + v.total, 0);

  const faturamentoVendedorFiadoReceber = vendas
    .filter(
      (v) =>
        v.vendedor === nomeVendedor &&
        v.formaPagamento === "Fiado" &&
        v.statusPagamento === "pendente",
    )
    .reduce((acc, v) => acc + v.total, 0);

  // Breakdown de Formas de Pagamento
  const pagamentos = vendas.reduce(
    (acc, v) => {
      acc[v.formaPagamento] = (acc[v.formaPagamento] || 0) + v.total;
      return acc;
    },
    { Dinheiro: 0, Pix: 0, Cartão: 0, Fiado: 0 },
  );

  const maxPagamento = Math.max(
    pagamentos.Dinheiro,
    pagamentos.Pix,
    pagamentos.Cartão,
    pagamentos.Fiado,
    1,
  );

  // Copiar link com fallback para HTTP
  const handleCopyLink = () => {
    const link = window.location.origin + window.location.pathname + "#/loja";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(link)
        .then(() =>
          toast.success("Link da loja online copiado para a área de transferência!"),
        )
        .catch(() => fallbackCopyText(link));
    } else {
      fallbackCopyText(link);
    }
  };

  const fallbackCopyText = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand("copy");
      if (successful) {
        toast.success("Link da loja online copiado para a área de transferência!");
      } else {
        alert(
          "Não foi possível copiar automaticamente. Selecione e copie o texto manualmente.",
        );
      }
    } catch (err) {
      alert(
        "Não foi possível copiar automaticamente. Selecione e copie o texto manualmente.",
      );
    }
    document.body.removeChild(textArea);
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease-out" }}>
      <div
        className="flex-between mb-24"
        style={{ flexWrap: "wrap", gap: "16px" }}
      >
        <div>
          <h2 style={{ fontSize: "28px", margin: 0 }}>Painel de Vendas</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Visão geral do seu negócio (Rua e Online)
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {vendasOfflinePendentes > 0 && (
            <button
              className="btn btn-warning"
              onClick={sincronizarVendasOffline}
              style={{ color: "#000" }}
            >
              <RefreshCw size={18} className="spin" />
              Sincronizar {vendasOfflinePendentes} Venda(s) Offline
            </button>
          )}

          {currentUser && (currentUser.tipo === "admin" || currentUser.usuario === "admin") && (
            <button
              className="btn btn-danger"
              onClick={async () => {
                if (
                  await confirm({ title: "Zerar Banco de Dados", message: "Tem certeza que deseja zerar todas as vendas e redefinir o estoque do banco de dados para os valores originais?" })
                ) {
                  resetDatabase();
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <RefreshCw size={16} /> Zerar Banco de Dados
            </button>
          )}
        </div>
      </div>

      {/* Card de Divulgação da Loja Online */}
      <div className="card mb-24 store-invite-card">
        <div className="store-invite-info">
          <div style={{ color: "var(--primary)", flexShrink: 0 }}>
            <Globe size={24} />
          </div>
          <div>
            <strong style={{ color: "var(--text-primary)", fontSize: "15px" }}>
              Sua Loja Online está ativa!
            </strong>
            <div
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                marginTop: "2px",
              }}
            >
              Compartilhe o endereço com seus clientes para receber pedidos de
              venda.
            </div>
          </div>
        </div>
        <div className="store-invite-actions">
          <input
            type="text"
            className="form-input"
            readOnly
            value={window.location.origin + window.location.pathname + "#/loja"}
            style={{
              fontSize: "12px",
              padding: "6px 10px",
              width: "100%",
              maxWidth: "220px",
              background: "var(--bg-card)",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
            onClick={(e) => e.target.select()}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCopyLink}
            style={{ fontSize: "12px", padding: "8px 12px" }}
          >
            Copiar Link
          </button>
        </div>
      </div>

      {/* Grid de Métricas */}
      <div className="grid-responsive mb-24">
        {isManagerOrAdmin ? (
          <>
            <div className="card">
              <div className="flex-between mb-16">
                <span
                  style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                >
                  Faturamento Total
                </span>
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    background: "var(--primary-light)",
                    color: "var(--primary)",
                  }}
                >
                  <DollarSign size={20} />
                </div>
              </div>
              <h3 style={{ fontSize: "32px", fontWeight: 700 }}>
                R$ {faturamentoGeral.toFixed(2)}
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                Acumulado de vendas registradas
              </p>
            </div>

            <div className="card">
              <div className="flex-between mb-16">
                <span
                  style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                >
                  Descontos Gerados
                </span>
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    background: "rgba(239, 68, 68, 0.1)",
                    color: "var(--danger)",
                  }}
                >
                  <Tag size={20} />
                </div>
              </div>
              <h3 style={{ fontSize: "32px", fontWeight: 700 }}>
                R$ {totalDescontosGerados.toFixed(2)}
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                Total de descontos concedidos
              </p>
            </div>

            <div className="card">
              <div className="flex-between mb-16">
                <span
                  style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                >
                  Lucro Líquido Real
                </span>
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    background:
                      lucroLiquidoGeral >= 0
                        ? "var(--success-light)"
                        : "var(--danger-light)",
                    color:
                      lucroLiquidoGeral >= 0
                        ? "var(--success)"
                        : "var(--danger)",
                  }}
                >
                  <DollarSign size={20} />
                </div>
              </div>
              <h3
                style={{
                  fontSize: "32px",
                  fontWeight: 700,
                  color:
                    lucroLiquidoGeral >= 0 ? "var(--success)" : "var(--danger)",
                }}
              >
                R$ {lucroLiquidoGeral.toFixed(2)}
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                Faturamento descontando custos e despesas
              </p>
            </div>

            <div className="card">
              <div className="flex-between mb-16">
                <span
                  style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                >
                  Total de Vendas
                </span>
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    background: "var(--success-light)",
                    color: "var(--success)",
                  }}
                >
                  <ShoppingBag size={20} />
                </div>
              </div>
              <h3 style={{ fontSize: "32px", fontWeight: 700 }}>
                {totalVendas}
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                Pedidos finalizados
              </p>
            </div>

            <div className="card">
              <div className="flex-between mb-16">
                <span
                  style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                >
                  Vendas na Rua
                </span>
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    background: "rgba(245, 158, 11, 0.1)",
                    color: "var(--warning)",
                  }}
                >
                  <Truck size={20} />
                </div>
              </div>
              <h3 style={{ fontSize: "32px", fontWeight: 700 }}>
                R$ {faturamentoRua.toFixed(2)}
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                Vendas externas de rua
              </p>
            </div>

            <div className="card">
              <div className="flex-between mb-16">
                <span
                  style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                >
                  Vendas Online
                </span>
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    background: "rgba(99, 102, 241, 0.15)",
                    color: "#6366f1",
                  }}
                >
                  <Globe size={20} />
                </div>
              </div>
              <h3 style={{ fontSize: "32px", fontWeight: 700 }}>
                R$ {faturamentoOnline.toFixed(2)}
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                Pedidos pela loja web
              </p>
            </div>

            <div
              className="card"
              style={{ borderLeft: "3px solid var(--warning)" }}
            >
              <div className="flex-between mb-16">
                <span
                  style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                >
                  Fiado a Receber
                </span>
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    background: "rgba(245, 158, 11, 0.1)",
                    color: "var(--warning)",
                  }}
                >
                  <DollarSign size={20} />
                </div>
              </div>
              <h3 style={{ fontSize: "32px", fontWeight: 700 }}>
                R$ {totalFiadoReceber.toFixed(2)}
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                Total pendente de pagamento
              </p>
            </div>

            <div
              className="card"
              style={{ borderLeft: "3px solid var(--success)" }}
            >
              <div className="flex-between mb-16">
                <span
                  style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                >
                  Vendas: {nomeVendedor}
                </span>
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    background: "var(--success-light)",
                    color: "var(--success)",
                  }}
                >
                  <User size={20} />
                </div>
              </div>
              <h3 style={{ fontSize: "32px", fontWeight: 700 }}>
                R$ {faturamentoVendedor.toFixed(2)}
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                Minhas vendas logadas
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Total de Vendas daquele vendedor */}
            <div className="card">
              <div className="flex-between mb-16">
                <span
                  style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                >
                  Total de Vendas
                </span>
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    background: "var(--success-light)",
                    color: "var(--success)",
                  }}
                >
                  <ShoppingBag size={20} />
                </div>
              </div>
              <h3 style={{ fontSize: "32px", fontWeight: 700 }}>
                {totalVendasVendedor}
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                Minhas vendas finalizadas
              </p>
            </div>

            {/* Vendas na Rua do dia daquele vendedor */}
            <div className="card">
              <div className="flex-between mb-16">
                <span
                  style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                >
                  Vendas na Rua (Hoje)
                </span>
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    background: "rgba(245, 158, 11, 0.1)",
                    color: "var(--warning)",
                  }}
                >
                  <Truck size={20} />
                </div>
              </div>
              <h3 style={{ fontSize: "32px", fontWeight: 700 }}>
                R$ {faturamentoRuaHoje.toFixed(2)}
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                Minhas vendas externas hoje
              </p>
            </div>

            {/* Vendas Online do dia */}
            <div className="card">
              <div className="flex-between mb-16">
                <span
                  style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                >
                  Vendas Online (Hoje)
                </span>
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    background: "rgba(99, 102, 241, 0.15)",
                    color: "#6366f1",
                  }}
                >
                  <Globe size={20} />
                </div>
              </div>
              <h3 style={{ fontSize: "32px", fontWeight: 700 }}>
                R$ {faturamentoOnlineHoje.toFixed(2)}
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                Pedidos do dia pela loja
              </p>
            </div>

            {/* Fiado a receber do vendedor */}
            <div
              className="card"
              style={{ borderLeft: "3px solid var(--warning)" }}
            >
              <div className="flex-between mb-16">
                <span
                  style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                >
                  Meu Fiado a Receber
                </span>
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    background: "rgba(245, 158, 11, 0.1)",
                    color: "var(--warning)",
                  }}
                >
                  <DollarSign size={20} />
                </div>
              </div>
              <h3 style={{ fontSize: "32px", fontWeight: 700 }}>
                R$ {faturamentoVendedorFiadoReceber.toFixed(2)}
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                Minhas vendas pendentes
              </p>
            </div>

            {/* Vendas: o nome do Vendedor */}
            <div
              className="card"
              style={{ borderLeft: "3px solid var(--success)" }}
            >
              <div className="flex-between mb-16">
                <span
                  style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                >
                  Vendas: {nomeVendedor}
                </span>
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    background: "var(--primary-light)",
                    color: "var(--primary)",
                  }}
                >
                  <User size={20} />
                </div>
              </div>
              <h3 style={{ fontSize: "32px", fontWeight: 700 }}>
                R$ {faturamentoVendedor.toFixed(2)}
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                Meu faturamento acumulado
              </p>
            </div>
          </>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: "24px",
          textAlign: "left",
        }}
      >
        {/* Métricas de Pagamentos */}
        <div className="card">
          <h3 style={{ fontSize: "18px", marginBottom: "20px" }}>
            Formas de Pagamento
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {(() => {
              const totalPagamentos = Object.values(pagamentos).reduce((acc, curr) => acc + curr, 0);
              return Object.entries(pagamentos).map(([forma, valor]) => {
                const porcentagem =
                  totalPagamentos > 0 ? (valor / totalPagamentos) * 100 : 0;
                return (
                  <div key={forma}>
                    <div
                      className="flex-between mb-8"
                      style={{ flexWrap: "wrap", gap: "8px" }}
                    >
                      <span style={{ fontWeight: 500, fontSize: "15px" }}>
                        {forma}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: "15px" }}>
                        R$ {valor.toFixed(2)} ({porcentagem.toFixed(0)}%)
                      </span>
                    </div>
                  <div
                    style={{
                      height: "8px",
                      width: "100%",
                      background: "var(--border)",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${porcentagem}%`,
                        background:
                          forma === "Pix"
                            ? "var(--success)"
                            : forma === "Cartão"
                              ? "var(--primary)"
                              : "var(--warning)",
                        borderRadius: "4px",
                        transition: "width 0.5s ease-out",
                      }}
                    />
                  </div>
                </div>
              );
            })})()}
          </div>
        </div>

        {/* Últimas Vendas */}
        <div
          className="card"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <h3 style={{ fontSize: "18px", marginBottom: "20px" }}>
            Vendas Recentes
          </h3>
          {vendas.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                padding: "24px 0",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <ShoppingBag size={32} />
              <span>Nenhuma venda registrada ainda.</span>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                overflowY: "auto",
                maxHeight: "280px",
              }}
            >
              {vendas.slice(0, 5).map((v) => (
                <div
                  key={v.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    background: "var(--bg-app)",
                  }}
                >
                  <div style={{ minWidth: "0", flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>
                      {v.clienteId
                        ? "Cliente Cadastrado"
                        : "Cliente Não Identificado"}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginTop: "2px",
                      }}
                    >
                      <span
                        className={`badge ${v.tipoVenda === "Online" ? "badge-primary" : "badge-warning"}`}
                        style={{ fontSize: "10px", padding: "2px 6px" }}
                      >
                        {v.tipoVenda}
                      </span>
                      <span>•</span>
                      <span>{v.formaPagamento}</span>
                      <span>•</span>
                      <span>
                        {new Date(v.data).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{ fontWeight: 600, color: "var(--text-primary)" }}
                    >
                      R$ {v.total.toFixed(2)}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        justifyContent: "flex-end",
                        marginTop: "2px",
                      }}
                    >
                      {v.formaPagamento === "Fiado" && (
                        <span
                          style={{
                            color:
                              v.statusPagamento === "pago"
                                ? "var(--success)"
                                : "var(--warning)",
                            fontWeight: 500,
                            marginRight: "4px",
                          }}
                        >
                          {v.statusPagamento === "pago" ? "Pago" : "Pendente"}
                        </span>
                      )}
                      {v.synced ? (
                        <span
                          style={{
                            color: "var(--success)",
                            display: "flex",
                            alignItems: "center",
                            gap: "2px",
                          }}
                        >
                          <CheckCircle2 size={12} /> Sincronizada
                        </span>
                      ) : (
                        <span
                          style={{
                            color: "var(--warning)",
                            display: "flex",
                            alignItems: "center",
                            gap: "2px",
                          }}
                        >
                          <WifiOff size={12} /> Offline
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
