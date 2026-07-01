import React, { useContext, useState, useEffect } from 'react';
import { DatabaseContext } from '../context/DatabaseContext';
import { ShoppingCart, ShoppingBag, Send, CheckCircle2, Search, ArrowRight, MessageCircle, Loader2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function LojaOnline() {
  const { produtos, registrarPedidoOnline, configuracoes, verifyMercadoPagoPayment } = useContext(DatabaseContext);
  
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Checkout Form State
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [successPedido, setSuccessPedido] = useState(null);

  // Mercado Pago states
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const getUrlParams = () => {
    const params = {};
    const searchParams = new URLSearchParams(window.location.search);
    for (const [key, val] of searchParams.entries()) {
      params[key] = val;
    }
    const hash = window.location.hash;
    if (hash.includes('?')) {
      const hashSearch = hash.split('?')[1];
      const hashParams = new URLSearchParams(hashSearch);
      for (const [key, val] of hashParams.entries()) {
        params[key] = val;
      }
    }
    return params;
  };

  useEffect(() => {
    const params = getUrlParams();
    const paymentId = params.payment_id || params.paymentId;
    const paymentStatus = params.payment_status;
    const orderId = params.orderId;

    if (orderId && (paymentStatus === 'rejected' || paymentStatus === 'failure')) {
      window.history.replaceState(null, '', window.location.pathname + '#/loja');
      setVerificationResult({
        success: false,
        status: 'rejected',
        message: 'O pagamento foi recusado ou cancelado no Mercado Pago. Por favor, tente novamente ou fale com o vendedor.'
      });
    } else if (paymentId && orderId) {
      setVerifyingPayment(true);
      window.history.replaceState(null, '', window.location.pathname + '#/loja');
      
      verifyMercadoPagoPayment(paymentId, orderId)
        .then(result => {
          setVerifyingPayment(false);
          setVerificationResult(result);
        })
        .catch(err => {
          console.error("Erro ao verificar pagamento:", err);
          setVerifyingPayment(false);
          setVerificationResult({
            success: false,
            status: 'error',
            message: 'Erro ao verificar o pagamento. Entre em contato com o vendedor para confirmar.'
          });
        });
    }
  }, []);

  // Somente produtos em estoque para a loja online
  const produtosDisponiveis = produtos.filter(p => p.estoque > 0);

  const handleAddToCart = (p) => {
    const existing = cart.find(item => item.id === p.id);
    if (existing) {
      if (existing.quantidade >= p.estoque) {
        toast.error("Desculpe, quantidade máxima em estoque atingida para este produto.");
        return;
      }
      setCart(prev => prev.map(item => 
        item.id === p.id 
          ? { ...item, quantidade: item.quantidade + 1 }
          : item
      ));
    } else {
      setCart(prev => [...prev, { ...p, quantidade: 1 }]);
    }
  };

  const handleRemoveOne = (pId) => {
    setCart(prev => prev.map(item => {
      if (item.id === pId) {
        return { ...item, quantidade: item.quantidade - 1 };
      }
      return item;
    }).filter(item => item.quantidade > 0));
  };

  const handleSendOrder = async (e) => {
    e.preventDefault();
    if (!nome || !whatsapp) {
      toast.success("Por favor, preencha o seu Nome e seu WhatsApp.");
      return;
    }

    const hasMP = configuracoes && configuracoes.mercadoPagoAccessToken;
    setIsRedirecting(true);

    let pedido = null;
    try {
      // 1. Registra o pedido online como pendente no servidor
      pedido = await registrarPedidoOnline({ nome, whatsapp, email }, cart);
      
      if (hasMP) {
        // 2. Chama create-preference
        const origin = window.location.origin;
        const res = await fetch('/api/payments/create-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: pedido.id,
            items: pedido.itens,
            origin,
            clienteNome: nome,
            clienteEmail: email
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Erro ao criar preferência de pagamento");
        }

        const data = await res.json();
        if (data.init_point) {
          setCart([]);
          setShowCheckout(false);
          setNome('');
          setWhatsapp('');
          setEmail('');
          setIsRedirecting(false);
          window.location.href = data.init_point;
          return;
        } else {
          throw new Error("URL de checkout não gerada.");
        }
      } else {
        // Sem Mercado Pago - fluxo manual normal
        setSuccessPedido(pedido);
        setCart([]);
        setShowCheckout(false);
        setNome('');
        setWhatsapp('');
        setEmail('');
        setIsRedirecting(false);
      }
    } catch (err) {
      console.error("Erro no checkout:", err);
      setIsRedirecting(false);
      
      if (pedido) {
        toast.error(`Não foi possível iniciar o pagamento via Mercado Pago: ${err.message}. Seu pedido foi registrado e você pode combinar o pagamento diretamente com o vendedor.`);
        setSuccessPedido(pedido);
        setCart([]);
        setShowCheckout(false);
        setNome('');
        setWhatsapp('');
        setEmail('');
      } else {
        toast.error(`Ocorreu um erro ao registrar seu pedido: ${err.message}. Por favor, tente novamente.`);
      }
    }
  };

  const handleWhatsAppNotify = () => {
    if (!successPedido) return;
    const itensMsg = successPedido.itens.map(item => `• ${item.quantidade}x ${item.nome}`).join('\n');
    const msg = `Olá! Acabei de fazer um pedido online no sistema:\n\n*Cliente:* ${successPedido.clienteNome}\n*Itens:*\n${itensMsg}\n\n*Total:* R$ ${successPedido.total.toFixed(2)}\n\nPor favor, confirme meu pedido! Obrigado.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filtered = produtosDisponiveis.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cartTotal = cart.reduce((acc, item) => acc + (item.quantidade * item.preco), 0);
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantidade, 0);

  if (verifyingPayment) {
    return (
      <div className="card text-center" style={{ 
        maxWidth: '500px', 
        margin: '40px auto', 
        padding: '50px 24px', 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        animation: 'fadeIn 0.3s ease-out',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--glass-border)'
      }}>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .animate-spin {
            animation: spin 1s linear infinite;
          }
        `}</style>
        <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 className="animate-spin" size={64} style={{ color: 'var(--primary)', margin: '0 auto' }} />
        </div>
        <h3 style={{ fontSize: '22px', fontWeight: 600 }}>Verificando Pagamento</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '360px', margin: '0 auto' }}>
          Estamos confirmando a transação junto ao Mercado Pago. Por favor, aguarde alguns instantes...
        </p>
      </div>
    );
  }

  if (verificationResult) {
    const isApproved = verificationResult.success && verificationResult.status === 'approved';
    return (
      <div className="card text-center" style={{ 
        maxWidth: '500px', 
        margin: '40px auto', 
        padding: '40px 24px', 
        textAlign: 'center',
        animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--glass-border)'
      }}>
        <style>{`
          @keyframes scaleUp {
            0% { transform: scale(0.9); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
        {isApproved ? (
          <>
            <div style={{ color: 'var(--success)', marginBottom: '20px' }}>
              <CheckCircle2 size={64} style={{ margin: '0 auto' }} />
            </div>
            <h2 style={{ fontSize: '28px', marginBottom: '12px', color: 'var(--success)' }}>Pagamento Confirmado!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '15px' }}>
              Sua compra foi paga com sucesso através do Mercado Pago! Nosso estoque foi atualizado e o vendedor já foi notificado.
            </p>
            <div className="card" style={{ background: 'var(--bg-app)', textAlign: 'left', marginBottom: '24px', padding: '16px', border: '1px solid var(--border)' }}>
              <div className="flex-between" style={{ fontSize: '14px', fontWeight: 500 }}>
                <span>Status de Pagamento:</span>
                <span className="badge badge-success" style={{ textTransform: 'uppercase' }}>Aprovado</span>
              </div>
              <div className="flex-between" style={{ fontSize: '14px', fontWeight: 500, marginTop: '8px' }}>
                <span>Forma de Pagamento:</span>
                <span>Mercado Pago (Pix/Cartão)</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ color: 'var(--danger)', marginBottom: '20px' }}>
              <XCircle size={64} style={{ margin: '0 auto' }} />
            </div>
            <h2 style={{ fontSize: '26px', marginBottom: '12px', color: 'var(--danger)' }}>Pagamento Não Aprovado</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '15px' }}>
              {verificationResult.message || 'O Mercado Pago informou que o pagamento não foi concluído ou foi recusado.'}
            </p>
            <div className="card" style={{ background: 'var(--bg-app)', textAlign: 'left', marginBottom: '24px', padding: '16px', border: '1px solid var(--border)' }}>
              <div className="flex-between" style={{ fontSize: '14px', fontWeight: 500 }}>
                <span>Status:</span>
                <span className="badge badge-danger" style={{ textTransform: 'uppercase' }}>{verificationResult.status || 'Pendente/Cancelado'}</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', margin: 0 }}>
                Caso tenha efetuado o pagamento e o saldo tenha sido debitado, entre em contato direto com o vendedor pelo botão abaixo.
              </p>
            </div>
          </>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!isApproved && (
            <a 
              className="btn btn-success" 
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Olá! Tentei realizar o pagamento do meu pedido online mas deu status ${verificationResult.status}. Gostaria de confirmar com você!`)}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
            >
              <MessageCircle size={18} /> Chamar Vendedor no WhatsApp
            </a>
          )}
          <button className="btn btn-primary" onClick={() => setVerificationResult(null)}>
            Ir para a Vitrine
          </button>
        </div>
      </div>
    );
  }

  if (successPedido) {
    return (
      <div className="card text-center" style={{ 
        maxWidth: '500px', 
        margin: '40px auto', 
        padding: '40px 20px', 
        textAlign: 'center',
        animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' 
      }}>
        <div style={{ color: 'var(--success)', marginBottom: '20px' }}>
          <CheckCircle2 size={64} style={{ margin: '0 auto' }} />
        </div>
        <h2 style={{ fontSize: '28px', marginBottom: '12px' }}>Pedido Recebido!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '15px' }}>
          O seu pedido de compra foi enviado com sucesso para o vendedor e está aguardando aprovação.
        </p>

        <div className="card" style={{ background: 'var(--bg-app)', textAlign: 'left', marginBottom: '24px', padding: '16px' }}>
          <strong style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Resumo do Pedido:</strong>
          <div style={{ margin: '8px 0', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
            {successPedido.itens.map(item => (
              <div key={item.produtoId} className="flex-between" style={{ fontSize: '13px', margin: '4px 0' }}>
                <span>{item.quantidade}x {item.nome}</span>
                <span>R$ {(item.quantidade * item.precoUnitario).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="flex-between" style={{ fontWeight: 600 }}>
            <span>Total:</span>
            <span style={{ color: 'var(--primary)', fontSize: '18px' }}>R$ {successPedido.total.toFixed(2)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button className="btn btn-success" onClick={handleWhatsAppNotify} style={{ padding: '12px' }}>
            <MessageCircle size={18} /> Chamar Vendedor no WhatsApp
          </button>
          
          <button className="btn btn-secondary" onClick={() => setSuccessPedido(null)}>
            Voltar para a Loja
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', textAlign: 'left' }}>
      
      {/* Banner da Loja */}
      <div className="card-glass mb-24" style={{ 
        padding: '32px 24px', 
        borderRadius: 'var(--radius)', 
        background: 'linear-gradient(135deg, var(--primary) 0%, #312e81 100%)', 
        color: 'white',
        border: 'none'
      }}>
        <h2 style={{ fontSize: '32px', color: 'white', fontWeight: 700, margin: 0 }}>Vitrine de Produtos Online</h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginTop: '8px', fontSize: '15px' }}>
          Escolha os produtos abaixo, monte seu carrinho e envie seu pedido de compra online direto no sistema!
        </p>
      </div>

      {/* Grid de Busca e Botão de Carrinho */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="card" style={{ flex: 1, padding: '12px', minWidth: '240px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-input w-full"
              placeholder="Buscar produtos..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>
        </div>

        {cart.length > 0 && (
          <button className="btn btn-primary" onClick={() => setShowCheckout(true)} style={{ padding: '12px 20px', position: 'relative' }}>
            <ShoppingCart size={18} />
            Ver Meu Carrinho
            <span className="cart-badge">{cartItemCount}</span>
          </button>
        )}
      </div>

      {/* Grid de Produtos */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
          Nenhum produto disponível no momento. Volte mais tarde!
        </div>
      ) : (
        <div className="grid-responsive">
          {filtered.map(p => {
            const inCart = cart.find(item => item.id === p.id);
            const qtyInCart = inCart ? inCart.quantidade : 0;
            const estoqueRestante = p.estoque - qtyInCart;

            return (
              <div className="card" key={p.id} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ position: 'relative', margin: '-20px -20px 16px -20px', height: '180px', overflow: 'hidden' }}>
                  <img src={p.fotoUrl} alt={p.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {estoqueRestante <= 3 && estoqueRestante > 0 && (
                    <span className="badge badge-danger" style={{ position: 'absolute', top: '12px', left: '12px', fontSize: '9px' }}>
                      Últimas {estoqueRestante} un!
                    </span>
                  )}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>{p.nome}</h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '42px' }}>
                    {p.descricao || 'Sem descrição adicional.'}
                  </p>
                  
                  <div className="flex-between" style={{ marginTop: 'auto', paddingTop: '12px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>
                      R$ {p.preco.toFixed(2)}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {qtyInCart > 0 && (
                        <>
                          <button 
                            className="btn btn-secondary btn-icon" 
                            style={{ padding: '6px' }}
                            onClick={() => handleRemoveOne(p.id)}
                          >
                            -
                          </button>
                          <span style={{ fontWeight: 600, minWidth: '16px', textAlign: 'center' }}>{qtyInCart}</span>
                        </>
                      )}
                      
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '13px' }}
                        onClick={() => handleAddToCart(p)}
                        disabled={estoqueRestante <= 0}
                      >
                        {estoqueRestante <= 0 ? 'Esgotado' : 'Adicionar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal/Drawer de Checkout do Cliente */}
      {showCheckout && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header flex-between">
              <h3 style={{ fontSize: '18px', margin: 0 }}>Meu Carrinho</h3>
              <button className="btn btn-secondary btn-icon" style={{ padding: '4px' }} onClick={() => setShowCheckout(false)}>×</button>
            </div>

            <form onSubmit={handleSendOrder}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Itens */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {cart.map(item => (
                    <div key={item.id} className="flex-between" style={{ fontSize: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                      <div>
                        <strong>{item.quantidade}x</strong> {item.nome}
                      </div>
                      <div style={{ fontWeight: 600 }}>
                        R$ {(item.quantidade * item.preco).toFixed(2)}
                      </div>
                    </div>
                  ))}
                  <div className="flex-between" style={{ fontSize: '18px', fontWeight: 700, marginTop: '8px' }}>
                    <span>Total da Compra:</span>
                    <span style={{ color: 'var(--primary)' }}>R$ {cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                <hr style={{ border: '0', borderTop: '1px solid var(--border)' }} />

                {/* Form Dados do Cliente */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>Preencha seus dados para finalizar:</h4>
                  
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Seu Nome Completo *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: Maria Pereira"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Seu WhatsApp (com DDD) *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="Ex: 11988887777"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">E-mail (Opcional)</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seuemail@provedor.com"
                    />
                  </div>
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCheckout(false)} disabled={isRedirecting}>
                  Continuar Comprando
                </button>
                <button type="submit" className="btn btn-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} disabled={isRedirecting}>
                  {isRedirecting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Processando...
                    </>
                  ) : (
                    <>
                      {configuracoes && configuracoes.mercadoPagoAccessToken ? 'Pagar com Pix/Cartão' : 'Enviar Pedido'} <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
