import React, { useContext, useState } from "react";
import { DatabaseContext } from "../context/DatabaseContext";
import {
  DollarSign,
  Truck,
  User,
  Clock,
  CheckCircle2,
  TrendingUp,
  Trash2,
  Plus,
  PieChart,
  Receipt,
} from "lucide-react";

export default function RelatorioCaixa() {
  const {
    vendas,
    activeCargas,
    usuarios,
    despesas,
    adicionarDespesa,
    excluirDespesa,
  } = useContext(DatabaseContext);
  const [activeTab, setActiveTab] = useState("caixa"); // 'caixa', 'despesas', 'lucro'
  const [descDespesa, setDescDespesa] = useState("");
  const [valorDespesa, setValorDespesa] = useState("");

  // 1. Resumo do Caixa
  const pagamentos = vendas.reduce(
    (acc, v) => {
      acc[v.formaPagamento] = (acc[v.formaPagamento] || 0) + v.total;
      return acc;
    },
    { Dinheiro: 0, Pix: 0, Cartão: 0 },
  );

  const totalCaixa = pagamentos.Dinheiro + pagamentos.Pix + pagamentos.Cartão;

  // 2. Vendas por Vendedor
  const vendasPorVendedor = usuarios
    .map((u) => {
      const totalVendido = vendas
        .filter((v) => v.vendedor === u.nome)
        .reduce((acc, v) => acc + v.total, 0);
      return {
        usuario: u.usuario,
        nome: u.nome,
        tipo: u.tipo,
        total: totalVendido,
      };
    })
    .sort((a, b) => b.total - a.total);

  // 3. Cargas de Rua Ativas
  const activeSellerCargas = Object.entries(activeCargas || {}).map(
    ([username, carga]) => {
      const user = usuarios.find((u) => u.usuario === username);
      return {
        username,
        nome: user ? user.nome : username,
        data: carga.data,
        itens: carga.itens || [],
      };
    },
  );

  // 4. Lucratividade
  const validVendasForRevenue = vendas.filter(
    (v) => !(v.formaPagamento === "Fiado" && v.statusPagamento === "pendente"),
  );
  const faturamentoTotal = validVendasForRevenue.reduce(
    (acc, v) => acc + v.total,
    0,
  );
  const custoTotal = validVendasForRevenue.reduce((acc, v) => {
    const custoVenda = v.itens.reduce(
      (sum, item) => sum + (item.custoUnitario || 0) * item.quantidade,
      0,
    );
    return acc + custoVenda;
  }, 0);
  const despesasTotal = despesas.reduce((acc, d) => acc + (d.valor || 0), 0);
  const lucroLiquido = faturamentoTotal - custoTotal - despesasTotal;

  const handleAddDespesa = (e) => {
    e.preventDefault();
    if (!descDespesa || !valorDespesa) return;
    adicionarDespesa({
      descricao: descDespesa,
      valor: parseFloat(valorDespesa),
    });
    setDescDespesa("");
    setValorDespesa("");
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease-out", textAlign: "left" }}>
      <div
        className="flex-between mb-24"
        style={{ flexWrap: "wrap", gap: "16px" }}
      >
        <div>
          <h2 style={{ fontSize: "28px", margin: 0 }}>Relatório do Caixa</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Acompanhamento financeiro, cargas ativas e desempenho da equipe.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "24px",
          overflowX: "auto",
          paddingBottom: "4px",
        }}
      >
        <button
          className={`btn ${activeTab === "caixa" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("caixa")}
          style={{ whiteSpace: "nowrap" }}
        >
          <DollarSign size={18} /> Caixa Geral
        </button>
        <button
          className={`btn ${activeTab === "despesas" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("despesas")}
          style={{ whiteSpace: "nowrap" }}
        >
          <Receipt size={18} /> Despesas
        </button>
        <button
          className={`btn ${activeTab === "lucro" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("lucro")}
          style={{ whiteSpace: "nowrap" }}
        >
          <PieChart size={18} /> Lucratividade Real
        </button>
      </div>

      {activeTab === "caixa" && (
        <>
          {/* Grid de Balanço Geral do Caixa */}
          <div className="grid-responsive mb-24">
            <div
              className="card"
              style={{ borderLeft: "4px solid var(--success)" }}
            >
              <div className="flex-between mb-12">
                <span
                  style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                >
                  Total no Caixa
                </span>
                <div
                  style={{
                    padding: "6px",
                    borderRadius: "6px",
                    background: "var(--success-light)",
                    color: "var(--success)",
                  }}
                >
                  <DollarSign size={18} />
                </div>
              </div>
              <h3 style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>
                R$ {totalCaixa.toFixed(2)}
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                Soma de todas as vendas do sistema
              </p>
            </div>

            <div className="card">
              <div className="flex-between mb-12">
                <span
                  style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                >
                  Total em Dinheiro
                </span>
                <div
                  style={{
                    padding: "6px",
                    borderRadius: "6px",
                    background: "rgba(245, 158, 11, 0.1)",
                    color: "var(--warning)",
                  }}
                >
                  <DollarSign size={18} />
                </div>
              </div>
              <h3 style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>
                R$ {pagamentos.Dinheiro.toFixed(2)}
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                Recebido em espécie
              </p>
            </div>

            <div className="card">
              <div className="flex-between mb-12">
                <span
                  style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                >
                  Total em Pix
                </span>
                <div
                  style={{
                    padding: "6px",
                    borderRadius: "6px",
                    background: "var(--success-light)",
                    color: "var(--success)",
                  }}
                >
                  <TrendingUp size={18} />
                </div>
              </div>
              <h3 style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>
                R$ {pagamentos.Pix.toFixed(2)}
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                Transferências Pix unificadas
              </p>
            </div>

            <div className="card">
              <div className="flex-between mb-12">
                <span
                  style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                >
                  Total em Cartão
                </span>
                <div
                  style={{
                    padding: "6px",
                    borderRadius: "6px",
                    background: "var(--primary-light)",
                    color: "var(--primary)",
                  }}
                >
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <h3 style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>
                R$ {pagamentos.Cartão.toFixed(2)}
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                Crédito e Débito
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
              gap: "24px",
              alignItems: "start",
            }}
            className="mb-24"
          >
            {/* Vendas por Funcionário */}
            <div className="card">
              <h3
                style={{
                  fontSize: "18px",
                  marginBottom: "16px",
                  fontWeight: 600,
                }}
              >
                Desempenho dos Vendedores
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {vendasPorVendedor.map((v) => {
                  const porcentagem =
                    totalCaixa > 0 ? (v.total / totalCaixa) * 100 : 0;
                  return (
                    <div key={v.usuario}>
                      <div className="flex-between mb-8">
                        <div>
                          <strong
                            style={{
                              fontSize: "14px",
                              color: "var(--text-primary)",
                            }}
                          >
                            {v.nome}
                          </strong>
                          <span
                            className="badge badge-secondary"
                            style={{
                              fontSize: "9px",
                              marginLeft: "8px",
                              padding: "2px 6px",
                            }}
                          >
                            {v.tipo === "admin-vendedor" ||
                            v.tipo === "gerente" ||
                            v.tipo === "admin"
                              ? "Gerente"
                              : "Vendedor"}
                          </span>
                        </div>
                        <span style={{ fontWeight: 600, fontSize: "14px" }}>
                          R$ {v.total.toFixed(2)} ({porcentagem.toFixed(0)}%)
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
                            background: "var(--primary)",
                            borderRadius: "4px",
                            transition: "width 0.5s ease-out",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cargas Ativas de Rua */}
            <div
              className="card"
              style={{ display: "flex", flexDirection: "column" }}
            >
              <h3
                style={{
                  fontSize: "18px",
                  marginBottom: "16px",
                  fontWeight: 600,
                }}
              >
                Cargas Ativas na Rua
              </h3>
              {activeSellerCargas.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "var(--text-muted)",
                    padding: "36px 12px",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Truck size={32} />
                  <span>
                    Nenhum vendedor com carga ativa na rua no momento.
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {activeSellerCargas.map((c) => {
                    const totalItensLevados = c.itens.reduce(
                      (acc, i) => acc + i.quantidadeSaida,
                      0,
                    );
                    const totalItensVendidos = c.itens.reduce(
                      (acc, i) => acc + i.quantidadeVendida,
                      0,
                    );
                    return (
                      <div
                        key={c.username}
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-sm)",
                          padding: "12px 16px",
                          background: "var(--bg-app)",
                        }}
                      >
                        <div className="flex-between mb-8">
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <User
                              size={16}
                              style={{ color: "var(--primary)" }}
                            />
                            <strong style={{ fontSize: "15px" }}>
                              {c.nome}
                            </strong>
                          </div>
                          <span
                            className="badge badge-success"
                            style={{ fontSize: "9px", padding: "2px 6px" }}
                          >
                            Na Rua
                          </span>
                        </div>

                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--text-secondary)",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            marginBottom: "8px",
                          }}
                        >
                          <Clock size={12} />
                          <span>
                            Saída:{" "}
                            {new Date(c.data).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            ({new Date(c.data).toLocaleDateString()})
                          </span>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "8px",
                            fontSize: "13px",
                          }}
                        >
                          <div
                            style={{
                              background: "var(--bg-card)",
                              padding: "6px",
                              borderRadius: "4px",
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                color: "var(--text-muted)",
                                fontSize: "10px",
                              }}
                            >
                              Itens Retirados
                            </div>
                            <strong>{totalItensLevados} un</strong>
                          </div>
                          <div
                            style={{
                              background: "var(--bg-card)",
                              padding: "6px",
                              borderRadius: "4px",
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                color: "var(--text-muted)",
                                fontSize: "10px",
                              }}
                            >
                              Vendas Registradas
                            </div>
                            <strong style={{ color: "var(--success)" }}>
                              {totalItensVendidos} un
                            </strong>
                          </div>
                        </div>

                        {/* Detalhe dos produtos na carga */}
                        <div
                          style={{
                            marginTop: "12px",
                            borderTop: "1px solid var(--border)",
                            paddingTop: "8px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              color: "var(--text-muted)",
                              marginBottom: "4px",
                            }}
                          >
                            Itens da Carga:
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                            }}
                          >
                            {c.itens.map((i) => (
                              <div
                                key={i.produtoId}
                                className="flex-between"
                                style={{ fontSize: "12px" }}
                              >
                                <span>{i.nome}</span>
                                <span
                                  style={{ color: "var(--text-secondary)" }}
                                >
                                  {i.quantidadeSaida} saiu /{" "}
                                  <strong style={{ color: "var(--success)" }}>
                                    {i.quantidadeVendida} vend.
                                  </strong>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === "despesas" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 350px), 1fr))",
            gap: "24px",
            alignItems: "start",
          }}
        >
          <div className="card">
            <h3
              style={{
                fontSize: "18px",
                marginBottom: "16px",
                fontWeight: 600,
              }}
            >
              Lançar Nova Despesa
            </h3>
            <form
              onSubmit={handleAddDespesa}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div className="form-group">
                <label className="form-label">Descrição</label>
                <input
                  type="text"
                  className="form-input"
                  value={descDespesa}
                  onChange={(e) => setDescDespesa(e.target.value)}
                  placeholder="Ex: Gasolina, Almoço..."
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={valorDespesa}
                  onChange={(e) => setValorDespesa(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
              >
                <Plus size={18} /> Adicionar Despesa
              </button>
            </form>
          </div>

          <div className="card">
            <h3
              style={{
                fontSize: "18px",
                marginBottom: "16px",
                fontWeight: 600,
              }}
            >
              Histórico de Despesas
            </h3>
            {despesas.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--text-muted)",
                  padding: "24px 0",
                }}
              >
                Nenhuma despesa lançada.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {despesas.map((d) => (
                  <div
                    key={d.id}
                    className="flex-between"
                    style={{
                      padding: "12px",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "14px" }}>
                        {d.descricao}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                          marginTop: "4px",
                        }}
                      >
                        {new Date(d.data).toLocaleDateString()}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <strong style={{ color: "var(--danger)" }}>
                        R$ {d.valor.toFixed(2)}
                      </strong>
                      <button
                        onClick={() => excluirDespesa(d.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "lucro" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="grid-responsive">
            <div
              className="card"
              style={{ borderLeft: "4px solid var(--success)" }}
            >
              <div className="flex-between mb-12">
                <span
                  style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                >
                  Faturamento (Recebido)
                </span>
              </div>
              <h3
                style={{
                  fontSize: "28px",
                  fontWeight: 700,
                  margin: 0,
                  color: "var(--success)",
                }}
              >
                + R$ {faturamentoTotal.toFixed(2)}
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                Vendas pagas
              </p>
            </div>

            <div
              className="card"
              style={{ borderLeft: "4px solid var(--warning)" }}
            >
              <div className="flex-between mb-12">
                <span
                  style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                >
                  Custo de Produtos
                </span>
              </div>
              <h3
                style={{
                  fontSize: "28px",
                  fontWeight: 700,
                  margin: 0,
                  color: "var(--warning)",
                }}
              >
                - R$ {custoTotal.toFixed(2)}
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                CMV das vendas pagas
              </p>
            </div>

            <div
              className="card"
              style={{ borderLeft: "4px solid var(--danger)" }}
            >
              <div className="flex-between mb-12">
                <span
                  style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                >
                  Despesas Operacionais
                </span>
              </div>
              <h3
                style={{
                  fontSize: "28px",
                  fontWeight: 700,
                  margin: 0,
                  color: "var(--danger)",
                }}
              >
                - R$ {despesasTotal.toFixed(2)}
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                Gastos lançados
              </p>
            </div>
          </div>

          <div
            className="card"
            style={{
              textAlign: "center",
              padding: "48px 24px",
              background:
                lucroLiquido >= 0
                  ? "var(--success-light)"
                  : "var(--danger-light)",
            }}
          >
            <h3
              style={{
                fontSize: "20px",
                color: "var(--text-secondary)",
                marginBottom: "8px",
                fontWeight: 500,
              }}
            >
              Lucro Líquido Real
            </h3>
            <h1
              style={{
                fontSize: "48px",
                fontWeight: 800,
                margin: 0,
                color: lucroLiquido >= 0 ? "var(--success)" : "var(--danger)",
              }}
            >
              R$ {lucroLiquido.toFixed(2)}
            </h1>
          </div>
        </div>
      )}
    </div>
  );
}
