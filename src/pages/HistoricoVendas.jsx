import React, { useContext, useState } from "react";
import { DatabaseContext } from "../context/DatabaseContext";
import { useConfirm } from '../context/ConfirmContext';
import { toast } from 'react-hot-toast';
import {
  Search,
  DollarSign,
  Trash2,
  Edit,
  X,
  Plus,
  Minus,
  AlertTriangle,
  Clock,
  ShoppingBag,
  Filter,
} from "lucide-react";

export default function HistoricoVendas() {
  const { confirm } = useConfirm();
  const {
    vendas,
    produtos,
    clientes,
    usuarios,
    activeCargas,
    currentUser,
    cancelarVenda,
    editarVenda,
  } = useContext(DatabaseContext);

  // States de Filtro
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [filtroPagamento, setFiltroPagamento] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroProduto, setFiltroProduto] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // States de Modais/Edição
  const [vendaEditando, setVendaEditando] = useState(null);
  const [editClienteId, setEditClienteId] = useState("");
  const [editFormaPagamento, setEditFormaPagamento] = useState("Pix");
  const [editDataPagamento, setEditDataPagamento] = useState("");
  const [editDataVenda, setEditDataVenda] = useState("");
  const [editItens, setEditItens] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Seleção Múltipla
  const [vendasSelecionadas, setVendasSelecionadas] = useState([]);

  // Se não for admin ou gerente, nega acesso
  const isAdmin =
    currentUser &&
    (currentUser.tipo === "admin-vendedor" ||
      currentUser.tipo === "gerente" ||
      currentUser.tipo === "admin");

  if (!isAdmin) {
    return (
      <div
        className="card text-center"
        style={{ padding: "40px 20px", color: "var(--danger)" }}
      >
        <AlertTriangle
          size={48}
          style={{ marginBottom: "16px", color: "var(--danger)" }}
        />
        <h2>Acesso Negado</h2>
        <p>Apenas administradores e gerentes podem visualizar o histórico de vendas.</p>
      </div>
    );
  }

  // Obter nome do cliente
  const getClienteNome = (clienteId) => {
    if (!clienteId) return "Cliente Não Identificado (Venda Rápida)";
    const cli = clientes.find((c) => c.id === clienteId);
    return cli ? cli.nome : "Cliente Excluído";
  };

  // Filtragem das vendas
  const vendasFiltradas = vendas.filter((venda) => {
    // 1. Termo de pesquisa (Cliente, Vendedor ou ID da venda)
    const nomeCli = getClienteNome(venda.clienteId).toLowerCase();
    const nomeVend = (venda.vendedor || "").toLowerCase();
    const matchesSearch =
      nomeCli.includes(searchTerm.toLowerCase()) ||
      nomeVend.includes(searchTerm.toLowerCase()) ||
      venda.id.includes(searchTerm);

    // 2. Filtro de Vendedor
    const matchesVendedor =
      !filtroVendedor || venda.vendedor === filtroVendedor;

    // 3. Filtro de Pagamento
    const matchesPagamento =
      !filtroPagamento || venda.formaPagamento === filtroPagamento;

    // 4. Filtro de Tipo (Rua / Online)
    const matchesTipo = !filtroTipo || venda.tipoVenda === filtroTipo;

    // 5. Filtro de Data
    let matchesData = true;
    if (venda.data) {
      const dataVenda = new Date(venda.data);
      if (dataInicio) {
        const dIni = new Date(dataInicio + "T00:00:00");
        if (dataVenda < dIni) matchesData = false;
      }
      if (dataFim) {
        const dFim = new Date(dataFim + "T23:59:59");
        if (dataVenda > dFim) matchesData = false;
      }
    }

    // 6. Filtro de Produto
    const matchesProduto =
      !filtroProduto ||
      venda.itens.some((item) => item.produtoId === filtroProduto);

    return (
      matchesSearch &&
      matchesVendedor &&
      matchesPagamento &&
      matchesTipo &&
      matchesData &&
      matchesProduto
    );
  });

  // Limpar Filtros
  const handleClearFilters = () => {
    setSearchTerm("");
    setFiltroVendedor("");
    setFiltroPagamento("");
    setFiltroTipo("");
    setFiltroProduto("");
    setDataInicio("");
    setDataFim("");
  };

  // Funções de Cancelamento
  const handleCancelarVenda = async (id) => {
    const confirmMessage =
      "Deseja realmente CANCELAR esta venda?\n\nIsso irá remover o registro e devolver os itens ao estoque central (ou carga de rua ativa do vendedor).";
    if (await confirm({ title: "Cancelar Venda", message: confirmMessage })) {
      await cancelarVenda(id);
      setVendasSelecionadas(prev => prev.filter(vid => vid !== id));
      toast.success("Venda cancelada com sucesso!");
    }
  };

  const handleCancelarSelecionadas = async () => {
    if (vendasSelecionadas.length === 0) return;
    const confirmMessage =
      `Deseja realmente CANCELAR as ${vendasSelecionadas.length} vendas selecionadas?\n\nIsso irá remover os registros e devolver os itens ao estoque.`;
    if (await confirm({ title: "Cancelar Vendas Múltiplas", message: confirmMessage })) {
      for (const id of vendasSelecionadas) {
        await cancelarVenda(id);
      }
      setVendasSelecionadas([]);
      toast.success("Vendas canceladas com sucesso!");
    }
  };

  const toggleSelectVenda = (id) => {
    setVendasSelecionadas(prev =>
      prev.includes(id) ? prev.filter(vid => vid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (vendasSelecionadas.length === vendasFiltradas.length) {
      setVendasSelecionadas([]);
    } else {
      setVendasSelecionadas(vendasFiltradas.map(v => v.id));
    }
  };

  // Abrir Modal de Edição
  const handleEditClick = (venda) => {
    setVendaEditando(venda);
    setEditClienteId(venda.clienteId || "");
    setEditFormaPagamento(venda.formaPagamento || "Pix");
    setEditDataPagamento(venda.dataPagamento || "");
    
    // Preparar data da venda (datetime-local format: YYYY-MM-DDTHH:mm)
    if (venda.data) {
      const date = new Date(venda.data);
      // Ajuste para fuso horário local
      const tzOffset = date.getTimezoneOffset() * 60000;
      const localISOTime = new Date(date - tzOffset).toISOString().slice(0, 16);
      setEditDataVenda(localISOTime);
    } else {
      setEditDataVenda("");
    }

    // Copiar itens
    setEditItens(
      venda.itens.map((item) => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        custoUnitario: item.custoUnitario || 0,
      }))
    );
    setIsEditModalOpen(true);
  };

  // Calcular o estoque máximo disponível para um produto durante a edição
  const getEstoqueDisponivelParaEdicao = (produtoId) => {
    const prod = produtos.find((p) => p.id === produtoId);
    if (!prod) return 0;

    // Achar quantidade na venda original sendo editada
    const originalItem = vendaEditando
      ? vendaEditando.itens.find((i) => i.produtoId === produtoId)
      : null;
    const originalQty = originalItem ? originalItem.quantidade : 0;

    // Se for tipo Rua e o vendedor tiver carga ativa
    const vendedorUser = usuarios.find((u) => u.nome === vendaEditando.vendedor);
    const userKey = vendedorUser ? vendedorUser.usuario : "vendedor";
    const sellerCarga = activeCargas[userKey];

    if (vendaEditando.tipoVenda === "Rua" && sellerCarga) {
      const cargaItem = sellerCarga.itens.find((i) => i.produtoId === produtoId);
      if (cargaItem) {
        // Carga de rua disponível = estoque centralizado da carga - vendido na carga + quantidade desta venda
        return (
          cargaItem.quantidadeSaida - cargaItem.quantidadeVendida + originalQty
        );
      }
      return originalQty; // se não estava na carga, não pode aumentar além da original
    } else {
      // Venda online ou sem carga ativa
      return prod.estoque + originalQty;
    }
  };

  // Modificar quantidade no modal de edição
  const handleUpdateItemQty = (prodId, delta) => {
    const maxQty = getEstoqueDisponivelParaEdicao(prodId);
    setEditItens((prev) =>
      prev
        .map((item) => {
          if (item.produtoId === prodId) {
            const newQty = item.quantidade + delta;
            if (newQty > maxQty) {
              toast.error(`Quantidade limite de estoque atingida! Máximo disponível: ${maxQty} unidades.`);
              return item;
            }
            return { ...item, quantidade: newQty };
          }
          return item;
        })
        .filter((item) => item.quantidade > 0)
    );
  };

  // Remover item do modal de edição
  const handleRemoveItemFromEdit = (prodId) => {
    setEditItens((prev) => prev.filter((item) => item.produtoId !== prodId));
  };

  // Adicionar produto no modal de edição
  const handleAddProductToEdit = (prodId) => {
    if (!prodId) return;

    // Verificar se já está na lista
    const exists = editItens.some((item) => item.produtoId === prodId);
    if (exists) {
      handleUpdateItemQty(prodId, 1);
      return;
    }

    const prod = produtos.find((p) => p.id === prodId);
    if (!prod) return;

    const maxQty = getEstoqueDisponivelParaEdicao(prodId);
    if (maxQty <= 0) {
      toast.success("Este produto não possui estoque disponível.");
      return;
    }

    // Definir preço de venda baseado na forma de pagamento
    const precoUnitario =
      editFormaPagamento === "Fiado" && prod.precoFiado
        ? prod.precoFiado
        : prod.preco;

    setEditItens((prev) => [
      ...prev,
      {
        produtoId: prod.id,
        quantidade: 1,
        precoUnitario: precoUnitario,
        custoUnitario: prod.custo || 0,
      },
    ]);
  };

  // Salvar Edição
  const handleSaveEdit = (e) => {
    e.preventDefault();

    if (editItens.length === 0) {
      toast.success("A venda deve possuir pelo menos um produto.");
      return;
    }

    if (editFormaPagamento === "Fiado" && !editClienteId) {
      toast.error("Para vendas Fiadas, é obrigatório selecionar um cliente.");
      return;
    }

    if (editFormaPagamento === "Fiado" && !editDataPagamento) {
      toast.success("Para vendas Fiadas, informe o prazo de pagamento.");
      return;
    }

    const total = editItens.reduce(
      (acc, i) => acc + i.quantidade * i.precoUnitario,
      0
    );

    const updatedData = {
      clienteId: editClienteId || null,
      itens: editItens,
      formaPagamento: editFormaPagamento,
      dataPagamento: editFormaPagamento === "Fiado" ? editDataPagamento : null,
      data: editDataVenda ? new Date(editDataVenda).toISOString() : vendaEditando.data,
      total,
      // manter demais campos do backend
    };

    editarVenda(vendaEditando.id, updatedData);
    setIsEditModalOpen(false);
    setVendaEditando(null);
    toast.success("Venda editada e estoque atualizado com sucesso!");
  };

  // Estatísticas Rápidas
  const totalFaturado = vendasFiltradas.reduce((acc, v) => acc + v.total, 0);
  const totalFiadoPendente = vendasFiltradas
    .filter((v) => v.formaPagamento === "Fiado" && v.statusPagamento === "pendente")
    .reduce((acc, v) => acc + v.total, 0);

  // Lista única de vendedores para o filtro
  const listaVendedores = Array.from(
    new Set(vendas.map((v) => v.vendedor).filter(Boolean))
  );

  return (
    <div style={{ animation: "fadeIn 0.3s ease-out", textAlign: "left" }}>
      <div className="flex-between mb-24" style={{ flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "28px", margin: 0 }}>Histórico de Vendas</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Consulte, edite ou cancele as últimas vendas realizadas no sistema.
          </p>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "var(--primary-light)",
              color: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShoppingBag size={24} />
          </div>
          <div>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block" }}>
              Total de Vendas
            </span>
            <strong style={{ fontSize: "20px" }}>{vendasFiltradas.length}</strong>
          </div>
        </div>

        <div className="card" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "var(--success-light)",
              color: "var(--success)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DollarSign size={24} />
          </div>
          <div>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block" }}>
              Faturamento Filtrado
            </span>
            <strong style={{ fontSize: "20px", color: "var(--success)" }}>
              R$ {totalFaturado.toFixed(2)}
            </strong>
          </div>
        </div>

        <div className="card" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "var(--warning-light)",
              color: "var(--warning)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Clock size={24} />
          </div>
          <div>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block" }}>
              Fiado Pendente
            </span>
            <strong style={{ fontSize: "20px", color: "var(--warning)" }}>
              R$ {totalFiadoPendente.toFixed(2)}
            </strong>
          </div>
        </div>
      </div>

      {/* Seção de Filtros */}
      <div className="card mb-24">
        <h3
          style={{
            fontSize: "16px",
            margin: "0 0 16px 0",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Filter size={16} /> Filtros de Pesquisa
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
            alignItems: "end",
          }}
        >
          {/* Termo de Busca */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Pesquisar Cliente / Vendedor</label>
            <div style={{ position: "relative" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-secondary)",
                }}
              />
              <input
                type="text"
                placeholder="Ex: Carlos, Maria..."
                className="form-input w-full"
                style={{ paddingLeft: "32px" }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Filtro Vendedor */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Vendedor</label>
            <select
              className="form-input w-full"
              value={filtroVendedor}
              onChange={(e) => setFiltroVendedor(e.target.value)}
            >
              <option value="">Todos</option>
              {listaVendedores.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Pagamento */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Forma de Pagamento</label>
            <select
              className="form-input w-full"
              value={filtroPagamento}
              onChange={(e) => setFiltroPagamento(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="Pix">Pix</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Cartão">Cartão</option>
              <option value="Fiado">Fiado</option>
            </select>
          </div>

          {/* Filtro Tipo Venda */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Origem</label>
            <select
              className="form-input w-full"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="Rua">Carga de Rua</option>
              <option value="Online">Online / Central</option>
            </select>
          </div>

          {/* Filtro Produto */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Produto</label>
            <select
              className="form-input w-full"
              value={filtroProduto}
              onChange={(e) => setFiltroProduto(e.target.value)}
            >
              <option value="">Todos os Produtos</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Data Inicial */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">De</label>
            <input
              type="date"
              className="form-input w-full"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>

          {/* Filtro Data Final */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Até</label>
            <input
              type="date"
              className="form-input w-full"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
        </div>

        {/* Botão de limpar filtros */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
          <button className="btn btn-secondary" onClick={handleClearFilters}>
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Lista de Vendas */}
      <div className="card">
        <div className="flex-between mb-16" style={{ flexWrap: "wrap", gap: "12px" }}>
          <h3 style={{ fontSize: "18px", margin: 0 }}>Registros</h3>
          {vendasFiltradas.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", cursor: "pointer", userSelect: "none" }}>
                <input
                  type="checkbox"
                  checked={vendasSelecionadas.length === vendasFiltradas.length && vendasFiltradas.length > 0}
                  onChange={toggleSelectAll}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                Selecionar Todas
              </label>
              {vendasSelecionadas.length > 0 && (
                <button
                  className="btn btn-danger"
                  style={{ padding: "6px 12px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", borderRadius: "6px" }}
                  onClick={handleCancelarSelecionadas}
                  title="Cancelar vendas selecionadas"
                >
                  <Trash2 size={14} /> Cancelar ({vendasSelecionadas.length})
                </button>
              )}
            </div>
          )}
        </div>

        {vendasFiltradas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--text-secondary)" }}>
            Nenhuma venda localizada com os filtros informados.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {vendasFiltradas.map((venda) => {
              const cliNome = getClienteNome(venda.clienteId);
              const dataFormatada = venda.data
                ? new Date(venda.data).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Sem data";

              return (
                <div
                  key={venda.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "16px",
                    background: "var(--bg-card)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {/* Cabeçalho da Venda */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: "12px",
                      borderBottom: "1px solid var(--border)",
                      paddingBottom: "10px",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <input
                          type="checkbox"
                          checked={vendasSelecionadas.includes(venda.id)}
                          onChange={() => toggleSelectVenda(venda.id)}
                          style={{ width: "18px", height: "18px", cursor: "pointer", marginRight: "4px" }}
                          title="Selecionar para cancelar"
                        />
                        <strong style={{ fontSize: "15px" }}>{cliNome}</strong>
                        <span
                          className={`badge ${venda.tipoVenda === "Rua" ? "badge-success" : "badge-secondary"}`}
                          style={{ fontSize: "10px" }}
                        >
                          {venda.tipoVenda === "Rua" ? "Rua" : "Central"}
                        </span>
                        <span
                          className={`badge ${
                            venda.formaPagamento === "Fiado"
                              ? venda.statusPagamento === "pago"
                                ? "badge-success"
                                : "badge-danger"
                              : "badge-success"
                          }`}
                          style={{ fontSize: "10px" }}
                        >
                          {venda.formaPagamento}
                          {venda.formaPagamento === "Fiado" &&
                            ` (${venda.statusPagamento === "pago" ? "Quitado" : "Pendente"})`}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                        ID: {venda.id} • Vendedor: <strong>{venda.vendedor || "Online"}</strong> • {dataFormatada}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--primary)" }}>
                        R$ {venda.total.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Detalhes dos Itens */}
                  <div style={{ fontSize: "13px" }}>
                    <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                      Itens Vendidos:
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {venda.itens.map((it, idx) => {
                        const prod = produtos.find((p) => p.id === it.produtoId);
                        return (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              color: "var(--text-primary)",
                            }}
                          >
                            <span>
                              {it.quantidade}x {prod ? prod.nome : it.nome || "Produto Não Identificado"}
                            </span>
                            <span style={{ color: "var(--text-secondary)" }}>
                              R$ {(it.quantidade * it.precoUnitario).toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rodapé e Ações */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTop: "1px solid var(--border)",
                      paddingTop: "10px",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div>
                      {venda.formaPagamento === "Fiado" &&
                        venda.statusPagamento === "pendente" &&
                        venda.dataPagamento && (
                          <span style={{ fontSize: "12px", color: "var(--danger)", fontWeight: 500 }}>
                            Vence em: {new Date(venda.dataPagamento).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: "13px", padding: "8px 14px", display: "flex", alignItems: "center", gap: "6px", borderRadius: "8px" }}
                        onClick={() => handleEditClick(venda)}
                        title="Editar Venda"
                      >
                        <Edit size={16} /> Editar
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ fontSize: "13px", padding: "8px 14px", display: "flex", alignItems: "center", gap: "6px", borderRadius: "8px" }}
                        onClick={() => handleCancelarVenda(venda.id)}
                        title="Cancelar Venda"
                      >
                        <Trash2 size={16} /> Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      {isEditModalOpen && vendaEditando && (
        <div className="modal-overlay" style={{ overflowY: "auto" }}>
          <div className="modal-content" style={{ maxWidth: "550px", margin: "40px auto" }}>
            <div className="modal-header flex-between">
              <h3 style={{ fontSize: "18px", margin: 0 }}>Editar Venda</h3>
              <button
                className="btn btn-secondary btn-icon"
                style={{ padding: "4px" }}
                onClick={() => {
                  setIsEditModalOpen(false);
                  setVendaEditando(null);
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Info Venda */}
                <div
                  style={{
                    background: "var(--bg-app)",
                    padding: "10px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                  }}
                >
                  Editando venda de: <strong>{vendaEditando.vendedor}</strong> em{" "}
                  {new Date(vendaEditando.data).toLocaleString("pt-BR")}
                </div>

                {/* Cliente */}
                <div className="form-group">
                  <label className="form-label">Cliente</label>
                  <select
                    className="form-input w-full"
                    value={editClienteId}
                    onChange={(e) => setEditClienteId(e.target.value)}
                  >
                    <option value="">Cliente Não Identificado (Venda Rápida)</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} ({c.whatsapp})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Data e Hora da Venda */}
                <div className="form-group">
                  <label className="form-label">Data e Hora da Venda</label>
                  <input
                    type="datetime-local"
                    className="form-input w-full"
                    value={editDataVenda}
                    onChange={(e) => setEditDataVenda(e.target.value)}
                    required
                  />
                </div>

                {/* Forma de Pagamento */}
                <div className="form-group">
                  <label className="form-label">Forma de Pagamento</label>
                  <select
                    className="form-input w-full"
                    value={editFormaPagamento}
                    onChange={(e) => setEditFormaPagamento(e.target.value)}
                  >
                    <option value="Pix">Pix</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão">Cartão</option>
                    <option value="Fiado">Fiado</option>
                  </select>
                </div>

                {/* Prazo Fiado */}
                {editFormaPagamento === "Fiado" && (
                  <div className="form-group animate-fadeIn">
                    <label className="form-label">Data Limite de Pagamento (Prazo) *</label>
                    <input
                      type="date"
                      className="form-input w-full"
                      value={editDataPagamento}
                      onChange={(e) => setEditDataPagamento(e.target.value)}
                      required
                    />
                  </div>
                )}

                {/* Gerenciar Itens */}
                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "8px" }}>
                    Produtos Vendidos
                  </label>

                  {/* Dropdown para Adicionar Produto */}
                  <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                    <select
                      className="form-input"
                      style={{ flex: 1 }}
                      defaultValue=""
                      onChange={(e) => {
                        handleAddProductToEdit(e.target.value);
                        e.target.value = ""; // reset dropdown
                      }}
                    >
                      <option value="" disabled>
                        + Adicionar outro produto à venda...
                      </option>
                      {produtos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} (R$ {p.preco.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Listagem dos itens atuais para edição */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      maxHeight: "200px",
                      overflowY: "auto",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      padding: "8px",
                    }}
                  >
                    {editItens.map((item) => {
                      const prod = produtos.find((p) => p.id === item.produtoId);
                      const maxQty = getEstoqueDisponivelParaEdicao(item.produtoId);
                      return (
                        <div
                          key={item.produtoId}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "13px",
                            padding: "6px 0",
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1, paddingRight: "10px" }}>
                            <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {prod ? prod.nome : "Produto Não Identificado"}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                              R$ {item.precoUnitario.toFixed(2)} un • Max: {maxQty} un
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {/* Controle Qtd */}
                            <button
                              type="button"
                              className="btn btn-secondary btn-icon"
                              style={{ width: "24px", height: "24px", padding: 0 }}
                              onClick={() => handleUpdateItemQty(item.produtoId, -1)}
                            >
                              <Minus size={10} />
                            </button>
                            <span style={{ fontWeight: 600, minWidth: "16px", textAlign: "center" }}>
                              {item.quantidade}
                            </span>
                            <button
                              type="button"
                              className="btn btn-primary btn-icon"
                              style={{ width: "24px", height: "24px", padding: 0 }}
                              onClick={() => handleUpdateItemQty(item.produtoId, 1)}
                            >
                              <Plus size={10} />
                            </button>

                            {/* Excluir */}
                            <button
                              type="button"
                              className="btn btn-secondary btn-icon"
                              style={{ width: "24px", height: "24px", padding: 0, color: "var(--danger)" }}
                              onClick={() => handleRemoveItemFromEdit(item.produtoId)}
                              title="Remover Item"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Total recalculado */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "16px",
                    fontWeight: 700,
                    borderTop: "1px solid var(--border)",
                    paddingTop: "12px",
                  }}
                >
                  <span>Novo Total:</span>
                  <span style={{ color: "var(--primary)" }}>
                    R${" "}
                    {editItens
                      .reduce((acc, i) => acc + i.quantidade * i.precoUnitario, 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: "24px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setVendaEditando(null);
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
