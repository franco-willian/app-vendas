import React, { createContext, useState, useEffect, useRef } from "react";

export const DatabaseContext = createContext();

const INITIAL_PRODUCTS = [
  {
    id: "1",
    nome: "Camiseta Classic",
    preco: 59.9,
    estoque: 45,
    descricao: "Camiseta 100% algodão, confortável e moderna.",
    fotoUrl:
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&q=80",
  },
  {
    id: "2",
    nome: "Boné Streetwear",
    preco: 39.9,
    estoque: 25,
    descricao: "Boné aba curva ajustável de alta qualidade.",
    fotoUrl:
      "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=300&q=80",
  },
  {
    id: "3",
    nome: "Garrafa Térmica Sport",
    preco: 89.9,
    estoque: 15,
    descricao: "Mantém a sua bebida gelada por até 24 horas.",
    fotoUrl:
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&q=80",
  },
  {
    id: "4",
    nome: "Óculos de Sol Sunset",
    preco: 129.9,
    estoque: 10,
    descricao: "Lentes polarizadas com proteção UV400.",
    fotoUrl:
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=300&q=80",
  },
  {
    id: "5",
    nome: "Gourmet Brownie",
    preco: 8.5,
    estoque: 120,
    descricao: "Brownie artesanal com muito chocolate belga.",
    fotoUrl:
      "https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=300&q=80",
  },
];

const INITIAL_CLIENTS = [
  {
    id: "1",
    nome: "Maria Silva",
    whatsapp: "11999998888",
    email: "maria@email.com",
  },
  {
    id: "2",
    nome: "João Santos",
    whatsapp: "11988887777",
    email: "joao@email.com",
  },
  {
    id: "3",
    nome: "Ana Costa",
    whatsapp: "11977776666",
    email: "ana@email.com",
  },
];

const INITIAL_USERS = [
  {
    id: "1",
    usuario: "admin",
    nome: "Gerente",
    tipo: "admin-vendedor",
    senha: "123",
  },
  {
    id: "2",
    usuario: "vendedor",
    nome: "Carlos Vendedor",
    tipo: "vendedor",
    senha: "123",
  },
];

export const DatabaseProvider = ({ children }) => {
  const [produtos, setProdutos] = useState(() => {
    const saved = localStorage.getItem("vendas_produtos");
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [clientes, setClientes] = useState(() => {
    const saved = localStorage.getItem("vendas_clientes");
    return saved ? JSON.parse(saved) : INITIAL_CLIENTS;
  });

  const [vendas, setVendas] = useState(() => {
    const saved = localStorage.getItem("vendas_vendas");
    return saved ? JSON.parse(saved) : [];
  });

  const [despesas, setDespesas] = useState(() => {
    const saved = localStorage.getItem("vendas_despesas");
    return saved ? JSON.parse(saved) : [];
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("vendas_current_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [activeCargas, setActiveCargas] = useState(() => {
    const saved = localStorage.getItem("vendas_activeCargas");
    return saved ? JSON.parse(saved) : {};
  });

  const activeCarga = currentUser
    ? activeCargas[currentUser.usuario] || null
    : null;

  const [pedidosOnline, setPedidosOnline] = useState(() => {
    const saved = localStorage.getItem("vendas_pedidosOnline");
    return saved ? JSON.parse(saved) : [];
  });

  const [usuarios, setUsuarios] = useState(() => {
    const saved = localStorage.getItem("vendas_usuarios");
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [offlineMode, setOfflineMode] = useState(false);

  const [configuracoes, setConfiguracoes] = useState(() => {
    const saved = localStorage.getItem("vendas_configuracoes");
    const defaultVal = {
      gerenteWhatsApp: "",
      callMeBotApiKey: "",
      mercadoPagoAccessToken: "",
      notifyCargaStart: true,
      notifyCargaReturn: true,
      notifyVendas: true,
      notifyEstoqueRetornado: true,
    };
    if (!saved) return defaultVal;
    try {
      const parsed = JSON.parse(saved);
      return {
        ...defaultVal,
        ...parsed,
      };
    } catch (e) {
      return defaultVal;
    }
  });

  useEffect(() => {
    localStorage.setItem("vendas_configuracoes", JSON.stringify(configuracoes));
  }, [configuracoes]);

  const updateConfiguracoes = (newConfig) => {
    setConfiguracoes(newConfig);
    if (!offlineMode) {
      fetch("/api/configuracoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      })
        .then((res) => {
          if (!res.ok)
            throw new Error("Erro ao salvar configurações no servidor");
          return res.json();
        })
        .catch((err) =>
          console.error("Erro ao sincronizar configurações:", err),
        );
    }
  };

  const handleManualWhatsAppNotify = (message) => {
    const phone = configuracoes.gerenteWhatsApp;
    const apikey = configuracoes.callMeBotApiKey;
    if (phone && !apikey) {
      const cleanPhone = phone.replace(/\D/g, "");
      const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
      if (
        window.confirm(
          `Gostaria de enviar uma notificação ao gerente via WhatsApp?\n\nMensagem:\n${message}`,
        )
      ) {
        window.open(url, "_blank");
      }
    }
  };
  const [salesNotifications, setSalesNotifications] = useState([]);

  const salesRef = useRef(vendas);
  useEffect(() => {
    salesRef.current = vendas;
  }, [vendas]);

  const activeCargasRef = useRef(activeCargas);
  useEffect(() => {
    activeCargasRef.current = activeCargas;
  }, [activeCargas]);

  // Solicitar permissão para notificações do navegador
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
  }, []);

  const triggerSaleNotification = (venda) => {
    // Notificar apenas Admin, Admin Vendedor ou Gerente
    const isNotifyProfile =
      currentUser &&
      (currentUser.tipo === "admin-vendedor" ||
        currentUser.tipo === "admin" ||
        currentUser.tipo === "gerente");
    if (!isNotifyProfile) return;

    const msg = `Nova venda registrada por ${venda.vendedor || "Cliente Online"} - Total: R$ ${venda.total.toFixed(2)}`;

    // Adicionar à lista de Toasts
    const newToast = { id: Date.now() + Math.random(), msg, data: venda };
    setSalesNotifications((prev) => [...prev, newToast]);

    // Remover automaticamente o Toast após 5 segundos
    setTimeout(() => {
      setSalesNotifications((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 5000);

    // Disparar Notificação HTML5 do Navegador
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("Nova Venda - VendaRápida", {
          body: msg,
          icon: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=100&q=80",
        });
      }
    }
  };

  const triggerCargaCloseNotification = (nomeVendedor) => {
    const isNotifyProfile =
      currentUser &&
      (currentUser.tipo === "admin-vendedor" ||
        currentUser.tipo === "admin" ||
        currentUser.tipo === "gerente");
    if (!isNotifyProfile) return;

    const msg = `O vendedor ${nomeVendedor} fechou o caixa e devolveu as sobras para o estoque.`;

    const newToast = { id: Date.now() + Math.random(), msg };
    setSalesNotifications((prev) => [...prev, newToast]);

    setTimeout(() => {
      setSalesNotifications((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 5000);

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("Caixa Fechado - VendaRápida", {
          body: msg,
          icon: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=100&q=80",
        });
      }
    }
  };

  // --- CARREGAR DADOS INICIAIS DA API (SYNC) ---
  const loadDataFromBackend = () => {
    fetch("/api/data")
      .then((res) => {
        if (!res.ok) throw new Error("Erro de resposta da API");
        return res.json();
      })
      .then((data) => {
        setProdutos(data.produtos);
        setClientes(data.clientes || []);
        setVendas(data.vendas || []);
        setDespesas(data.despesas || []);
        setUsuarios(data.usuarios || []);

        // Detectar novas vendas para notificação
        const currentSales = salesRef.current;
        if (
          currentSales &&
          currentSales.length > 0 &&
          data.vendas &&
          data.vendas.length > currentSales.length
        ) {
          const novas = data.vendas.filter(
            (nv) => !currentSales.some((ov) => ov.id === nv.id),
          );
          novas.forEach((nova) => {
            triggerSaleNotification(nova);
          });
        }

        // Detectar fechamento de cargas
        const prevCargas = activeCargasRef.current;
        if (prevCargas && Object.keys(prevCargas).length > 0) {
          Object.keys(prevCargas).forEach((username) => {
            if (!data.activeCargas || !data.activeCargas[username]) {
              const user = data.usuarios
                ? data.usuarios.find((u) => u.usuario === username)
                : null;
              const nomeVendedor = user ? user.nome : username;
              triggerCargaCloseNotification(nomeVendedor);
            }
          });
        }

        setActiveCargas(data.activeCargas || {});
        setPedidosOnline(data.pedidosOnline);
        if (data.configuracoes) {
          setConfiguracoes(data.configuracoes);
        }
      })
      .catch((err) => {
        console.warn(
          "Buscando dados no fallback local (Sem conexão com o servidor):",
          err,
        );
      });
  };

  // Polling em segundo plano a cada 5 segundos para atualizar dados sem recarregar a página
  useEffect(() => {
    if (!offlineMode) {
      loadDataFromBackend();
      const interval = setInterval(() => {
        loadDataFromBackend();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [offlineMode]);

  // Persistir dados locais para fallback offline
  useEffect(() => {
    localStorage.setItem("vendas_produtos", JSON.stringify(produtos));
  }, [produtos]);

  useEffect(() => {
    localStorage.setItem("vendas_clientes", JSON.stringify(clientes));
  }, [clientes]);

  useEffect(() => {
    localStorage.setItem("vendas_vendas", JSON.stringify(vendas));
  }, [vendas]);

  useEffect(() => {
    localStorage.setItem("vendas_despesas", JSON.stringify(despesas));
  }, [despesas]);

  useEffect(() => {
    localStorage.setItem("vendas_activeCargas", JSON.stringify(activeCargas));
  }, [activeCargas]);

  useEffect(() => {
    localStorage.setItem("vendas_pedidosOnline", JSON.stringify(pedidosOnline));
  }, [pedidosOnline]);

  useEffect(() => {
    localStorage.setItem("vendas_usuarios", JSON.stringify(usuarios));
  }, [usuarios]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("vendas_current_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("vendas_current_user");
    }
  }, [currentUser]);

  // Login & Session logic
  const loginUser = (username, password) => {
    const user = usuarios.find(
      (u) =>
        u.usuario.toLowerCase() === username.toLowerCase() &&
        u.senha === password,
    );
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  // Despesas CRUD
  const adicionarDespesa = async (despesaData) => {
    const novaDespesa = {
      ...despesaData,
      id: Date.now().toString(),
      data: new Date().toISOString(),
    };
    setDespesas((prev) => [novaDespesa, ...prev]);

    if (!offlineMode) {
      try {
        const res = await fetch("/api/despesas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(despesaData),
        });
        const data = await res.json();
        setDespesas((prev) =>
          prev.map((d) => (d.id === novaDespesa.id ? data : d)),
        );
      } catch (err) {
        console.error("Erro ao adicionar despesa:", err);
      }
    }
  };

  const excluirDespesa = async (id) => {
    setDespesas((prev) => prev.filter((d) => d.id !== id));
    if (!offlineMode) {
      try {
        await fetch(`/api/despesas/${id}`, { method: "DELETE" });
      } catch (err) {
        console.error("Erro ao excluir despesa:", err);
      }
    }
  };

  const logoutUser = () => {
    setCurrentUser(null);
  };

  // CRUD Produtos
  const addProduto = (produto) => {
    const newProd = {
      ...produto,
      id: Date.now().toString(),
      estoque: parseInt(produto.estoque) || 0,
      preco: parseFloat(produto.preco) || 0,
    };

    setProdutos((prev) => [newProd, ...prev]);

    if (!offlineMode) {
      fetch("/api/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProd),
      }).catch((err) =>
        console.error("Erro ao sincronizar novo produto:", err),
      );
    }

    return newProd;
  };

  const updateProduto = (id, updatedData) => {
    const updateObj = {
      ...updatedData,
      preco: parseFloat(updatedData.preco) || 0,
      estoque: parseInt(updatedData.estoque) || 0,
    };

    setProdutos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updateObj } : p)),
    );

    if (!offlineMode) {
      fetch(`/api/produtos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateObj),
      }).catch((err) => console.error("Erro ao atualizar produto:", err));
    }
  };

  const deleteProduto = (id) => {
    setProdutos((prev) => prev.filter((p) => p.id !== id));

    if (!offlineMode) {
      fetch(`/api/produtos/${id}`, {
        method: "DELETE",
      }).catch((err) => console.error("Erro ao deletar produto:", err));
    }
  };

  // CRUD Clientes
  const addCliente = (cliente) => {
    const newCli = {
      ...cliente,
      id: Date.now().toString(),
    };

    setClientes((prev) => [newCli, ...prev]);

    if (!offlineMode) {
      fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCli),
      }).catch((err) => console.error("Erro ao salvar cliente:", err));
    }

    return newCli;
  };

  const updateCliente = (id, updatedData) => {
    setClientes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updatedData } : c)),
    );

    if (!offlineMode) {
      fetch(`/api/clientes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      }).catch((err) => console.error("Erro ao atualizar cliente:", err));
    }
  };

  const deleteCliente = (id) => {
    setClientes((prev) => prev.filter((c) => c.id !== id));

    if (!offlineMode) {
      fetch(`/api/clientes/${id}`, {
        method: "DELETE",
      }).catch((err) => console.error("Erro ao deletar cliente:", err));
    }
  };

  // CRUD Usuarios
  const addUsuario = (user) => {
    const newUser = {
      ...user,
      id: Date.now().toString(),
    };

    setUsuarios((prev) => [...prev, newUser]);

    if (!offlineMode) {
      fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      }).catch((err) => console.error("Erro ao salvar usuário:", err));
    }

    return newUser;
  };

  const updateUsuario = (id, updatedData) => {
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updatedData } : u)),
    );

    // Se for o usuário logado, atualiza o current user também
    if (currentUser && currentUser.id === id) {
      const newUserState = { ...currentUser, ...updatedData };
      setCurrentUser(newUserState);
      localStorage.setItem("vendas_current_user", JSON.stringify(newUserState));
    }

    if (!offlineMode) {
      fetch(`/api/usuarios/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      }).catch((err) => console.error("Erro ao atualizar usuário:", err));
    }
  };

  const deleteUsuario = (id) => {
    if (id === "1") {
      alert("Não é permitido excluir o Administrador principal.");
      return;
    }

    setUsuarios((prev) => prev.filter((u) => u.id !== id));

    if (!offlineMode) {
      fetch(`/api/usuarios/${id}`, {
        method: "DELETE",
      }).catch((err) => console.error("Erro ao deletar usuário:", err));
    }
  };

  // Carga Diária
  const startCarga = (itensCarga, vendedorUsername) => {
    const itens = [];
    produtos.forEach((p) => {
      const qtySaida = parseInt(itensCarga[p.id]) || 0;
      if (qtySaida > 0) {
        itens.push({
          produtoId: p.id,
          nome: p.nome,
          quantidadeSaida: qtySaida,
          quantidadeVendida: 0,
          quantidadeRetorno: 0,
        });
      }
    });

    // Atualizar localmente
    setProdutos((prevProds) => {
      return prevProds.map((p) => {
        const qtySaida = parseInt(itensCarga[p.id]) || 0;
        if (qtySaida > 0) {
          return { ...p, estoque: Math.max(0, p.estoque - qtySaida) };
        }
        return p;
      });
    });

    const newCarga = {
      id: Date.now().toString(),
      data: new Date().toISOString(),
      itens,
      status: "aberto",
    };

    const username =
      vendedorUsername || (currentUser ? currentUser.usuario : "vendedor");
    setActiveCargas((prev) => ({
      ...prev,
      [username]: newCarga,
    }));

    if (!offlineMode) {
      fetch("/api/carga/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itensCarga, vendedor: username }),
      }).catch((err) =>
        console.error("Erro ao iniciar carga no servidor:", err),
      );
    }
  };

  const returnCarga = (itensRetorno, vendedorUsername) => {
    const username =
      vendedorUsername || (currentUser ? currentUser.usuario : "vendedor");
    const targetCarga = activeCargas[username];
    if (!targetCarga) return;

    // Atualizar localmente
    setProdutos((prevProds) => {
      return prevProds.map((p) => {
        const qtyRetorno = parseInt(itensRetorno[p.id]) || 0;
        if (qtyRetorno > 0) {
          return { ...p, estoque: p.estoque + qtyRetorno };
        }
        return p;
      });
    });

    setActiveCargas((prev) => {
      const updated = { ...prev };
      delete updated[username];
      return updated;
    });

    if (!offlineMode) {
      fetch("/api/carga/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itensRetorno, vendedor: username }),
      })
        .then(() => loadDataFromBackend()) // recarregar dados do estoque atualizados do server
        .catch((err) =>
          console.error("Erro ao fechar carga no servidor:", err),
        );
    }
  };

  // Registrar Venda
  const registrarVenda = (
    itensVenda,
    clienteId,
    formaPagamento,
    tipoVenda = "Rua",
    dataPagamento = null,
  ) => {
    const total = itensVenda.reduce(
      (acc, item) => acc + item.quantidade * item.precoUnitario,
      0,
    );
    const novaVenda = {
      id: Date.now().toString(),
      clienteId,
      itens: itensVenda,
      formaPagamento,
      statusPagamento: formaPagamento === "Fiado" ? "pendente" : "pago",
      dataPagamento,
      tipoVenda,
      total,
      data: new Date().toISOString(),
      synced: !offlineMode,
      vendedor: currentUser ? currentUser.nome : "Cliente Online",
    };

    // Atualizar estados locais imediatamente
    setVendas((prev) => [novaVenda, ...prev]);

    if (tipoVenda === "Rua" && activeCarga) {
      setActiveCargas((prev) => {
        const username = currentUser ? currentUser.usuario : "vendedor";
        const userCarga = prev[username];
        if (!userCarga) return prev;
        const updatedItens = userCarga.itens.map((item) => {
          const itemVendido = itensVenda.find(
            (iv) => iv.produtoId === item.produtoId,
          );
          if (itemVendido) {
            return {
              ...item,
              quantidadeVendida:
                item.quantidadeVendida + itemVendido.quantidade,
            };
          }
          return item;
        });
        return {
          ...prev,
          [username]: { ...userCarga, itens: updatedItens },
        };
      });
    }

    if (tipoVenda === "Online" || !activeCarga) {
      setProdutos((prevProds) => {
        return prevProds.map((p) => {
          const itemVendido = itensVenda.find((iv) => iv.produtoId === p.id);
          if (itemVendido) {
            return {
              ...p,
              estoque: Math.max(0, p.estoque - itemVendido.quantidade),
            };
          }
          return p;
        });
      });
    }

    // Sincronizar com o servidor em tempo real
    if (!offlineMode) {
      fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novaVenda),
      })
        .then(() => loadDataFromBackend())
        .catch((err) => {
          console.warn(
            "Conexão falhou ao salvar venda. Marcada para sincronização offline:",
            err,
          );
          // Marcar localmente como offline
          setVendas((prev) =>
            prev.map((v) =>
              v.id === novaVenda.id ? { ...v, synced: false } : v,
            ),
          );
        });
    }

    return novaVenda;
  };

  const quitarVendaFiado = (vendaId) => {
    setVendas((prev) =>
      prev.map((v) =>
        v.id === vendaId
          ? {
              ...v,
              statusPagamento: "pago",
              dataPagamentoRealizado: new Date().toISOString(),
            }
          : v,
      ),
    );

    if (!offlineMode) {
      fetch(`/api/vendas/${vendaId}/pay`, {
        method: "PUT",
      }).catch((err) =>
        console.error("Erro ao quitar venda no servidor:", err),
      );
    }
  };
 
  const cancelarVenda = async (id) => {
    const venda = vendas.find((v) => v.id === id);
    if (!venda) return;

    // Atualizar vendas localmente
    setVendas((prev) => prev.filter((v) => v.id !== id));

    // Reverter estoque localmente
    const vendedorUser = usuarios.find((u) => u.nome === (venda.vendedor || ""));
    const userKey = vendedorUser ? vendedorUser.usuario : "vendedor";
    const sellerCarga = activeCargas[userKey];

    if (venda.tipoVenda === "Rua" && sellerCarga) {
      setActiveCargas((prev) => {
        const uCarga = prev[userKey];
        if (!uCarga) return prev;
        const updatedItens = uCarga.itens.map((item) => {
          const itemVendido = venda.itens.find(
            (iv) => iv.produtoId === item.produtoId,
          );
          if (itemVendido) {
            return {
              ...item,
              quantidadeVendida: Math.max(
                0,
                item.quantidadeVendida - itemVendido.quantidade,
              ),
            };
          }
          return item;
        });
        return {
          ...prev,
          [userKey]: { ...uCarga, itens: updatedItens },
        };
      });
    } else {
      // Devolver ao estoque central
      setProdutos((prevProds) => {
        return prevProds.map((p) => {
          const itemVendido = venda.itens.find((iv) => iv.produtoId === p.id);
          if (itemVendido) {
            return { ...p, estoque: p.estoque + itemVendido.quantidade };
          }
          return p;
        });
      });
    }

    if (!offlineMode) {
      try {
        await fetch(`/api/vendas/${id}`, {
          method: "DELETE",
        });
        loadDataFromBackend();
      } catch (err) {
        console.error("Erro ao cancelar venda no servidor:", err);
      }
    }
  };

  const editarVenda = async (id, updatedVendaData) => {
    const oldVenda = vendas.find((v) => v.id === id);
    if (!oldVenda) return;

    // 1. Reverter estoque localmente para a venda antiga
    const vendedorUserOld = usuarios.find(
      (u) => u.nome === (oldVenda.vendedor || ""),
    );
    const userKeyOld = vendedorUserOld ? vendedorUserOld.usuario : "vendedor";
    const sellerCargaOld = activeCargas[userKeyOld];

    if (oldVenda.tipoVenda === "Rua" && sellerCargaOld) {
      setActiveCargas((prev) => {
        const uCarga = prev[userKeyOld];
        if (!uCarga) return prev;
        const updatedItens = uCarga.itens.map((item) => {
          const itemVendido = oldVenda.itens.find(
            (iv) => iv.produtoId === item.produtoId,
          );
          if (itemVendido) {
            return {
              ...item,
              quantidadeVendida: Math.max(
                0,
                item.quantidadeVendida - itemVendido.quantidade,
              ),
            };
          }
          return item;
        });
        return {
          ...prev,
          [userKeyOld]: { ...uCarga, itens: updatedItens },
        };
      });
    } else {
      setProdutos((prevProds) => {
        return prevProds.map((p) => {
          const itemVendido = oldVenda.itens.find(
            (iv) => iv.produtoId === p.id,
          );
          if (itemVendido) {
            return { ...p, estoque: p.estoque + itemVendido.quantidade };
          }
          return p;
        });
      });
    }

    // 2. Aplicar estoque localmente para a nova venda
    const newVendedorName = updatedVendaData.vendedor || oldVenda.vendedor;
    const vendedorUserNew = usuarios.find((u) => u.nome === newVendedorName);
    const userKeyNew = vendedorUserNew ? vendedorUserNew.usuario : "vendedor";
    const sellerCargaNew = activeCargas[userKeyNew];
    const newTipoVenda = updatedVendaData.tipoVenda || oldVenda.tipoVenda;

    if (newTipoVenda === "Rua" && sellerCargaNew) {
      setActiveCargas((prev) => {
        const uCarga = prev[userKeyNew];
        if (!uCarga) return prev;
        const updatedItens = uCarga.itens.map((item) => {
          const itemVendido = updatedVendaData.itens.find(
            (iv) => iv.produtoId === item.produtoId,
          );
          if (itemVendido) {
            return {
              ...item,
              quantidadeVendida:
                item.quantidadeVendida + itemVendido.quantidade,
            };
          }
          return item;
        });
        return {
          ...prev,
          [userKeyNew]: { ...uCarga, itens: updatedItens },
        };
      });
    } else {
      setProdutos((prevProds) => {
        return prevProds.map((p) => {
          const itemVendido = updatedVendaData.itens.find(
            (iv) => iv.produtoId === p.id,
          );
          if (itemVendido) {
            return {
              ...p,
              estoque: Math.max(0, p.estoque - itemVendido.quantidade),
            };
          }
          return p;
        });
      });
    }

    // Atualizar vendas no state
    const newVenda = {
      ...oldVenda,
      ...updatedVendaData,
      id: oldVenda.id,
      data: oldVenda.data,
      synced: !offlineMode,
    };

    setVendas((prev) => prev.map((v) => (v.id === id ? newVenda : v)));

    if (!offlineMode) {
      try {
        const res = await fetch(`/api/vendas/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedVendaData),
        });
        if (res.ok) {
          loadDataFromBackend();
        }
      } catch (err) {
        console.error("Erro ao editar venda no servidor:", err);
      }
    }
  };

  // Pedido Online (simulação feita pelo cliente)
  const registrarPedidoOnline = async (clienteData, itensPedido) => {
    const total = itensPedido.reduce(
      (acc, item) => acc + item.quantidade * item.preco,
      0,
    );

    // Novo pedido estruturado
    const novoPedido = {
      id: Date.now().toString(),
      clienteNome: clienteData.nome,
      clienteWhatsapp: clienteData.whatsapp,
      itens: itensPedido.map((i) => ({
        produtoId: i.id,
        nome: i.nome,
        quantidade: i.quantidade,
        precoUnitario: i.preco,
      })),
      total,
      data: new Date().toISOString(),
      status: "pendente",
    };

    if (!offlineMode) {
      try {
        const res = await fetch("/api/pedidos-online", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clienteData, itens: itensPedido }),
        });
        if (!res.ok) throw new Error("Erro ao salvar pedido no servidor");
        const savedPedido = await res.json();
        setPedidosOnline((prev) => [savedPedido, ...prev]);
        loadDataFromBackend();
        return savedPedido;
      } catch (err) {
        console.error("Erro ao enviar pedido online para o servidor:", err);
        setPedidosOnline((prev) => [novoPedido, ...prev]);
        return novoPedido;
      }
    } else {
      setPedidosOnline((prev) => [novoPedido, ...prev]);
      return novoPedido;
    }
  };

  const aprovarPedidoOnline = (pedidoId, formaPagamento) => {
    // Atualiza localmente
    setPedidosOnline((prev) =>
      prev.map((p) => (p.id === pedidoId ? { ...p, status: "aprovado" } : p)),
    );

    if (!offlineMode) {
      fetch("/api/pedidos-online/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId, formaPagamento }),
      })
        .then(() => loadDataFromBackend())
        .catch((err) =>
          console.error("Erro ao aprovar pedido no servidor:", err),
        );
    }
  };

  const recusarPedidoOnline = (pedidoId) => {
    // Atualiza localmente
    setPedidosOnline((prev) =>
      prev.map((p) => (p.id === pedidoId ? { ...p, status: "recusado" } : p)),
    );

    if (!offlineMode) {
      fetch("/api/pedidos-online/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId }),
      })
        .then(() => loadDataFromBackend())
        .catch((err) =>
          console.error("Erro ao recusar pedido no servidor:", err),
        );
    }
  };

  // Sincronizar vendas salvas offline (Lote)
  const sincronizarVendasOffline = () => {
    const offlineVendas = vendas.filter((v) => !v.synced);
    if (offlineVendas.length === 0) return;

    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(offlineVendas),
    })
      .then((res) => {
        if (res.ok) {
          setVendas((prev) => prev.map((v) => ({ ...v, synced: true })));
          setOfflineMode(false);
          loadDataFromBackend();
          alert("Vendas offline sincronizadas com sucesso no servidor!");
        }
      })
      .catch((err) => {
        alert(
          "Falha ao comunicar com o servidor. Verifique se o backend está ligado.",
        );
      });
  };

  const resetDatabase = () => {
    if (!offlineMode) {
      return fetch("/api/reset", {
        method: "POST",
      })
        .then((res) => {
          if (!res.ok)
            throw new Error("Erro ao zerar banco de dados no servidor");
          return res.json();
        })
        .then((result) => {
          // Limpar LocalStorage e states
          localStorage.removeItem("vendas_produtos");
          localStorage.removeItem("vendas_clientes");
          localStorage.removeItem("vendas_vendas");
          localStorage.removeItem("vendas_despesas");
          localStorage.removeItem("vendas_activeCargas");
          localStorage.removeItem("vendas_pedidosOnline");
          localStorage.removeItem("vendas_usuarios");

          setProdutos(result.data.produtos);
          setClientes(result.data.clientes);
          setVendas(result.data.vendas);
          setDespesas(result.data.despesas);
          setActiveCargas(result.data.activeCargas || {});
          setPedidosOnline(result.data.pedidosOnline);
          setUsuarios(result.data.usuarios);

          alert("Banco de dados zerado com sucesso!");
        })
        .catch((err) => {
          console.error(err);
          alert(
            "Falha ao zerar banco de dados no servidor. Verifique sua conexão.",
          );
        });
    } else {
      // Se estiver offline, zerar apenas localmente
      localStorage.removeItem("vendas_produtos");
      localStorage.removeItem("vendas_clientes");
      localStorage.removeItem("vendas_vendas");
      localStorage.removeItem("vendas_despesas");
      localStorage.removeItem("vendas_activeCargas");
      localStorage.removeItem("vendas_pedidosOnline");
      localStorage.removeItem("vendas_usuarios");

      setProdutos(INITIAL_PRODUCTS);
      setClientes(INITIAL_CLIENTS);
      setVendas([]);
      setDespesas([]);
      setActiveCargas({});
      setPedidosOnline([]);
      setUsuarios(INITIAL_USERS);

      alert("Dados locais zerados com sucesso (Modo Offline)!");
    }
  };

  const verifyMercadoPagoPayment = (paymentId, orderId) => {
    return fetch("/api/payments/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, orderId }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao verificar pagamento no servidor");
        return res.json();
      })
      .then((data) => {
        if (data.success && data.status === "approved") {
          loadDataFromBackend();
          return { success: true, status: "approved" };
        }
        return { success: false, status: data.status, message: data.message };
      });
  };

  return (
    <DatabaseContext.Provider
      value={{
        produtos,
        clientes,
        vendas,
        despesas,
        activeCarga,
        activeCargas,
        pedidosOnline,
        usuarios,
        setUsuarios,
        currentUser,
        offlineMode,
        setOfflineMode,
        loginUser,
        logoutUser,
        addProduto,
        updateProduto,
        deleteProduto,
        addUsuario,
        updateUsuario,
        deleteUsuario,
        addCliente,
        updateCliente,
        deleteCliente,
        startCarga,
        returnCarga,
        registrarVenda,
        quitarVendaFiado,
        cancelarVenda,
        editarVenda,
        registrarPedidoOnline,
        aprovarPedidoOnline,
        recusarPedidoOnline,
        adicionarDespesa,
        excluirDespesa,
        sincronizarVendasOffline,
        resetDatabase,
        salesNotifications,
        configuracoes,
        updateConfiguracoes,
        handleManualWhatsAppNotify,
        verifyMercadoPagoPayment,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};
