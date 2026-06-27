import React, { useContext, useState, useEffect } from 'react';
import { DatabaseContext } from '../context/DatabaseContext';
import { CreditCard, Eye, EyeOff } from 'lucide-react';

export default function GatewayPagamento() {
  const { 
    currentUser, 
    configuracoes, 
    updateConfiguracoes 
  } = useContext(DatabaseContext);

  const [mercadoPagoAccessToken, setMercadoPagoAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (configuracoes) {
      setMercadoPagoAccessToken(configuracoes.mercadoPagoAccessToken || '');
    }
  }, [configuracoes]);

  const handleSaveConfig = (e) => {
    e.preventDefault();
    updateConfiguracoes({ 
      ...configuracoes,
      mercadoPagoAccessToken
    });
    alert("Token do Mercado Pago salvo com sucesso!");
  };

  const isAdmin = currentUser && (currentUser.tipo === 'admin-vendedor' || currentUser.tipo === 'gerente' || currentUser.tipo === 'admin');
  if (!isAdmin) {
    return (
      <div className="card text-center" style={{ padding: '40px 20px', color: 'var(--danger)' }}>
        Acesso Negado: Apenas gerentes ou administradores do sistema podem acessar o Gateway de Pagamento.
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
      <div className="mb-24">
        <h2 style={{ fontSize: '28px', margin: 0 }}>Gateway de Pagamento</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Configure os meios de pagamento para sua loja online.</p>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
        <h3 style={{ fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CreditCard size={18} style={{ color: 'var(--primary)' }} />
          Mercado Pago (Checkout Pro)
        </h3>
        
        <div style={{ background: 'var(--bg-app)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '13px', margin: 0, color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Ative o pagamento por <strong>Pix</strong> e <strong>Cartão de Crédito/Débito</strong> na sua loja online. Quando configurado, seus clientes serão direcionados para o checkout seguro do Mercado Pago e o status das vendas será atualizado automaticamente no sistema.
          </p>
        </div>

        <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 500 }}>Access Token do Mercado Pago</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showToken ? 'text' : 'password'}
                className="form-input w-full"
                value={mercadoPagoAccessToken}
                onChange={(e) => setMercadoPagoAccessToken(e.target.value)}
                placeholder="APP_USR-..."
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0
                }}
              >
                {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: 'block', lineHeight: '1.4' }}>
              Insira o seu <strong>Access Token</strong> de Produção ou Homologação (geralmente começa com <code>APP_USR-</code>). 
              Você pode encontrá-lo no painel de desenvolvedores em <a href="https://developers.mercadopago.com" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'var(--primary)' }}>developers.mercadopago.com</a>.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '12px 18px', fontSize: '15px' }}>
              Salvar Gateway
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
