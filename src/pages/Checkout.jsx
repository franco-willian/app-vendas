import React, { useContext, useState } from 'react';
import { DatabaseContext } from '../context/DatabaseContext';
import { Plus, Minus, ShoppingCart, UserPlus, Search, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Checkout() {
  const { 
    produtos, 
    clientes, 
    activeCarga, 
    registrarVenda, 
    addCliente, 
    offlineMode,
    handleManualWhatsAppNotify,
    currentUser,
    configuracoes
  } = useContext(DatabaseContext);

  const [cart, setCart] = useState([]);
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('Pix');
  const [dataPagamentoFiado, setDataPagamentoFiado] = useState('');
  const [customDate, setCustomDate] = useState('');
  const [desconto, setDesconto] = useState(0);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  
  // Cliente Modal State
  const [newCliNome, setNewCliNome] = useState('');
  const [newCliWhatsapp, setNewCliWhatsapp] = useState('');
  const [newCliEmail, setNewCliEmail] = useState('');

  // Mensagem de sucesso
  const [showSuccess, setShowSuccess] = useState(false);

  const isSeller = currentUser && currentUser.tipo === 'vendedor';

  // Filtrar os produtos disponíveis para venda
  // Se houver carga ativa, a venda de rua puxa apenas os itens que saíram na carga.
  // Caso contrário, puxa os produtos do estoque central (apenas se for gerente/admin).
  const produtosDisponiveis = activeCarga
    ? activeCarga.itens.map(item => {
        const prodCompleto = produtos.find(p => p.id === item.produtoId);
        // O estoque de rua atual é a quantidade de saída menos a quantidade vendida na carga
        const estoqueDeRua = item.quantidadeSaida - item.quantidadeVendida;
        return {
          ...prodCompleto,
          estoqueDisponivel: estoqueDeRua
        };
      })
    : (isSeller ? [] : produtos.map(p => ({ ...p, estoqueDisponivel: p.estoque })));

  const getProductPrice = (produto) => {
    if (formaPagamento === 'Fiado' && produto.precoFiado) {
      return produto.precoFiado;
    }
    return produto.preco;
  };

  const handleAddToCart = (produto) => {
    const existing = cart.find(item => item.id === produto.id);
    const estoqueDisponivel = produto.estoqueDisponivel;

    if (existing) {
      if (existing.quantidade >= estoqueDisponivel) {
        toast.error("Quantidade máxima disponível atingida!");
        return;
      }
      setCart(prev => prev.map(item => 
        item.id === produto.id 
          ? { ...item, quantidade: item.quantidade + 1 }
          : item
      ));
    } else {
      if (estoqueDisponivel <= 0) {
        toast.error("Produto esgotado!");
        return;
      }
      setCart(prev => [...prev, { 
        id: produto.id, 
        nome: produto.nome, 
        preco: produto.preco, 
        quantidade: 1 
      }]);
    }
  };

  const handleRemoveFromCart = (prodId) => {
    setCart(prev => prev.map(item => {
      if (item.id === prodId) {
        return { ...item, quantidade: item.quantidade - 1 };
      }
      return item;
    }).filter(item => item.quantidade > 0));
  };

  const handleQuickClientSubmit = (e) => {
    e.preventDefault();
    if (!newCliNome || !newCliWhatsapp) {
      toast.error("Nome e WhatsApp são obrigatórios.");
      return;
    }

    const novoCliente = addCliente({
      nome: newCliNome,
      whatsapp: newCliWhatsapp,
      email: newCliEmail
    });

    // Selecionar o cliente recém criado automaticamente
    setSelectedClienteId(novoCliente.id);
    
    // Fechar modal
    setNewCliNome('');
    setNewCliWhatsapp('');
    setNewCliEmail('');
    setIsClientModalOpen(false);
  };

  const handleFinalize = () => {
    if (cart.length === 0) {
      toast.success("Adicione pelo menos um produto ao carrinho.");
      return;
    }

    if (formaPagamento === 'Fiado' && !dataPagamentoFiado) {
      toast.success("Por favor, informe a data de pagamento (prazo) para a venda a fiado.");
      return;
    }

    if (formaPagamento === 'Fiado' && !selectedClienteId) {
      toast.error("Para vendas a fiado, é obrigatório selecionar ou cadastrar um cliente.");
      return;
    }

    const itensVenda = cart.map(item => {
      const prodCompleto = produtos.find(p => p.id === item.id);
      const precoReal = prodCompleto ? getProductPrice(prodCompleto) : item.preco;
      return {
        produtoId: item.id,
        quantidade: item.quantidade,
        precoUnitario: precoReal,
        custoUnitario: prodCompleto ? (prodCompleto.custo || 0) : 0
      };
    });

    registrarVenda(
      itensVenda, 
      selectedClienteId || null, 
      formaPagamento, 
      activeCarga ? 'Rua' : 'Online',
      formaPagamento === 'Fiado' ? dataPagamentoFiado : null,
      parseFloat(desconto) || 0,
      customDate || null
    );

    // Notificação Manual WhatsApp
    if (configuracoes.notifyVendas !== false) {
      const clientObj = clientes.find(c => c.id === selectedClienteId);
      const clientName = clientObj ? clientObj.nome : 'Cliente Não Identificado';
      const itensList = cart.map(i => `- ${i.nome}: ${i.quantidade}x R$ ${i.preco.toFixed(2)}`).join('\n');
      const alertMsg = `🛍️ *Nova Venda Realizada!*\n👤 Vendedor: ${currentUser ? currentUser.nome : 'Cliente Online'}\n👤 Cliente: ${clientName}\n💳 Pagamento: ${formaPagamento}\n📍 Tipo: ${activeCarga ? 'Rua' : 'Online'}\n💵 Total: R$ ${finalTotal.toFixed(2)}${(parseFloat(desconto) || 0) > 0 ? `\n🏷️ Desconto: R$ ${parseFloat(desconto).toFixed(2)}` : ''}\n📦 Itens:\n${itensList}`;
      
      handleManualWhatsAppNotify(alertMsg);
    }

    // Resetar
    setCart([]);
    setSelectedClienteId('');
    setFormaPagamento('Pix');
    setDataPagamentoFiado('');
    setCustomDate('');
    setDesconto(0);
    setShowSuccess(true);

    setTimeout(() => {
      setShowSuccess(false);
    }, 4000);
  };

  const cartTotal = cart.reduce((acc, item) => {
    const prodCompleto = produtos.find(p => p.id === item.id);
    const precoReal = prodCompleto ? getProductPrice(prodCompleto) : item.preco;
    return acc + (item.quantidade * precoReal);
  }, 0);

  const finalTotal = Math.max(0, cartTotal - (parseFloat(desconto) || 0));

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', textAlign: 'left' }}>
      <div className="flex-between mb-24" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '28px', margin: 0 }}>Registrar Venda</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {activeCarga 
              ? "Modo Rua (Carga Ativa - Baixa no estoque de rua)" 
              : "Modo Central (Sem Carga Ativa - Baixa no estoque principal)"}
          </p>
        </div>
      </div>

      {showSuccess && (
        <div className="card mb-24" style={{ background: 'var(--success-light)', borderLeft: '4px solid var(--success)', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--success)' }}>
          <CheckCircle size={24} />
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Venda registrada com sucesso!</strong>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {offlineMode ? "Salva no celular. Será sincronizada quando houver conexão." : "Sincronizada online com o banco central."}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '24px', alignItems: 'start' }}>
        
        {/* Catálogo de Produtos para Venda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Selecione os Produtos</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {produtosDisponiveis.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)' }}>
                  {isSeller ? (
                    <>
                      <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '8px', fontSize: '16px' }}>Nenhuma Carga Ativa</strong>
                      Você não possui uma carga de rua ativa no momento. Inicie uma carga na aba "Carga de Rua" ou solicite ao gerente para iniciar uma para você antes de registrar vendas.
                    </>
                  ) : (
                    "Nenhum produto cadastrado no estoque central."
                  )}
                </div>
              ) : (
                produtosDisponiveis.map(p => {
                  const cartItem = cart.find(item => item.id === p.id);
                  const qtdNoCarrinho = cartItem ? cartItem.quantidade : 0;
                  const estoqueRestante = p.estoqueDisponivel - qtdNoCarrinho;

                  return (
                    <div key={p.id} className="product-row-flex">
                      <div className="product-info-group">
                        <img src={p.fotoUrl} alt={p.nome} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '14px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{p.nome}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            R$ {getProductPrice(p).toFixed(2)} • Disp: <strong style={{ color: 'var(--text-primary)' }}>{estoqueRestante} un</strong>
                          </div>
                        </div>
                      </div>

                      <div className="qty-controls-group">
                        {qtdNoCarrinho > 0 && (
                          <>
                            <button 
                              type="button"
                              className="btn btn-secondary btn-icon" 
                              style={{ width: '28px', height: '28px', padding: 0 }}
                              onClick={() => handleRemoveFromCart(p.id)}
                            >
                              <Minus size={12} />
                            </button>
                            <span style={{ fontWeight: 600, minWidth: '16px', textAlign: 'center', fontSize: '14px' }}>{qtdNoCarrinho}</span>
                          </>
                        )}
                        
                        <button 
                          type="button"
                          className="btn btn-primary btn-icon" 
                          style={{ width: '28px', height: '28px', padding: 0 }}
                          onClick={() => handleAddToCart(p)}
                          disabled={estoqueRestante <= 0}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Carrinho de Compras e Dados da Venda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={18} />
              Resumo do Carrinho
            </h3>

            {/* Itens do Carrinho */}
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
                Carrinho vazio. Adicione produtos ao lado.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                {cart.map(item => {
                  const prodCompleto = produtos.find(p => p.id === item.id);
                  const precoReal = prodCompleto ? getProductPrice(prodCompleto) : item.preco;
                  return (
                    <div key={item.id} className="flex-between" style={{ fontSize: '14px' }}>
                      <div>
                        <strong>{item.quantidade}x</strong> {item.nome}
                      </div>
                      <div style={{ fontWeight: 500 }}>
                        R$ {(item.quantidade * precoReal).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
                <div className="flex-between" style={{ fontSize: '14px', marginTop: '8px' }}>
                  <span>Subtotal:</span>
                  <span>R$ {cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex-between" style={{ fontSize: '14px', marginTop: '4px', alignItems: 'center' }}>
                  <span>Desconto (R$):</span>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={desconto}
                    onChange={(e) => setDesconto(e.target.value)}
                    style={{ width: '80px', padding: '4px', textAlign: 'right' }}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="flex-between" style={{ fontSize: '14px', marginTop: '4px', alignItems: 'center' }}>
                  <span>Data Personalizada (Opcional):</span>
                  <input 
                    type="datetime-local" 
                    className="form-input" 
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    style={{ width: '160px', padding: '4px' }}
                  />
                </div>
                <div className="flex-between" style={{ fontSize: '18px', fontWeight: 700, marginTop: '8px' }}>
                  <span>Total Final:</span>
                  <span style={{ color: 'var(--primary)' }}>R$ {finalTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Seleção do Cliente (Com opção de criar na hora) */}
            <div className="form-group">
              <div className="flex-between">
                <label className="form-label">Cliente (Opcional)</label>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsClientModalOpen(true)}
                  style={{ padding: '2px 8px', fontSize: '11px', borderRadius: '4px' }}
                >
                  <UserPlus size={12} /> + Cadastrar na Hora
                </button>
              </div>
              
              <select 
                className="form-input w-full"
                value={selectedClienteId}
                onChange={(e) => setSelectedClienteId(e.target.value)}
                style={{ fontSize: '14px' }}
              >
                <option value="">Cliente Não Identificado (Venda Rápida)</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome} ({c.whatsapp})</option>
                ))}
              </select>
            </div>

            {/* Forma de Pagamento */}
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">Forma de Pagamento</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: '8px' }}>
                {['Pix', 'Dinheiro', 'Cartão', 'Fiado'].map(metodo => (
                  <button
                    key={metodo}
                    type="button"
                    className={`btn ${formaPagamento === metodo ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFormaPagamento(metodo)}
                    style={{ fontSize: '13px', padding: '8px' }}
                  >
                    {metodo}
                  </button>
                ))}
              </div>
              
              {formaPagamento === 'Fiado' && (
                <div style={{ marginTop: '16px' }}>
                  <label className="form-label">Data de Pagamento (Prazo) *</label>
                  <input
                    type="date"
                    className="form-input w-full"
                    value={dataPagamentoFiado}
                    onChange={(e) => setDataPagamentoFiado(e.target.value)}
                    required
                  />
                  <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                    O cliente selecionado será cobrado nesta data.
                  </small>
                </div>
              )}
            </div>

            <button 
              className="btn btn-success w-full" 
              onClick={handleFinalize}
              disabled={cart.length === 0}
              style={{ fontSize: '16px', padding: '12px' }}
            >
              Registrar Venda {offlineMode ? "Offline" : ""} (R$ {finalTotal.toFixed(2)})
            </button>
          </div>
        </div>

      </div>

      {/* Modal de Cadastro Rápido de Cliente */}
      {isClientModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header flex-between">
              <h3 style={{ fontSize: '16px', margin: 0 }}>Cadastrar Cliente na Hora</h3>
              <button className="btn btn-secondary btn-icon" style={{ padding: '4px' }} onClick={() => setIsClientModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleQuickClientSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nome Completo *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={newCliNome}
                    onChange={(e) => setNewCliNome(e.target.value)}
                    placeholder="Nome do cliente"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">WhatsApp *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={newCliWhatsapp}
                    onChange={(e) => setNewCliWhatsapp(e.target.value)}
                    placeholder="11999998888"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">E-mail (Opcional)</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={newCliEmail}
                    onChange={(e) => setNewCliEmail(e.target.value)}
                    placeholder="email@cliente.com"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsClientModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Adicionar e Selecionar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
