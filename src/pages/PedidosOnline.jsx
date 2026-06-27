import React, { useContext, useState } from 'react';
import { DatabaseContext } from '../context/DatabaseContext';
import { ShoppingBag, Check, X, Phone, DollarSign, Calendar } from 'lucide-react';

export default function PedidosOnline() {
  const { pedidosOnline, aprovarPedidoOnline, recusarPedidoOnline } = useContext(DatabaseContext);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [formaPagamento, setFormaPagamento] = useState('Pix');

  const handleOpenApproveModal = (pedido) => {
    setSelectedPedido(pedido);
  };

  const handleConfirmApproval = () => {
    if (!selectedPedido) return;
    aprovarPedidoOnline(selectedPedido.id, formaPagamento);
    setSelectedPedido(null);
    alert("Pedido aprovado! A venda foi registrada e o estoque principal foi atualizado.");
  };

  const pendingPedidos = pedidosOnline.filter(p => p.status === 'pendente');
  const pastPedidos = pedidosOnline.filter(p => p.status !== 'pendente');

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', textAlign: 'left' }}>
      <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>Pedidos Online Recibidos</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
        Gerencie os pedidos feitos pelos clientes através da sua página web pública de vendas online.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '24px', alignItems: 'start' }}>
        
        {/* Pedidos Pendentes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-warning" style={{ fontSize: '12px' }}>{pendingPedidos.length}</span>
              Novos Pedidos Pendentes
            </h3>

            {pendingPedidos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
                Nenhum novo pedido pendente no momento.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {pendingPedidos.map(p => (
                  <div key={p.id} style={{ 
                    border: '1px solid var(--border)', 
                    borderRadius: 'var(--radius)', 
                    padding: '16px',
                    background: 'var(--bg-app)'
                  }}>
                    <div className="flex-between mb-8">
                      <div>
                        <strong style={{ fontSize: '16px' }}>{p.clienteNome}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Phone size={12} /> {p.clienteWhatsapp}
                        </div>
                      </div>
                      <span className="badge badge-warning" style={{ fontSize: '10px' }}>Pendente</span>
                    </div>

                    {/* Itens do Pedido */}
                    <div style={{ margin: '12px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '8px 0' }}>
                      {p.itens.map(item => (
                        <div key={item.produtoId} className="flex-between" style={{ fontSize: '13px', marginBottom: '4px' }}>
                          <span>{item.quantidade}x {item.nome}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>R$ {(item.quantidade * item.precoUnitario).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex-between mb-16">
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Fazer cobrança:</span>
                      <strong style={{ fontSize: '16px', color: 'var(--primary)' }}>R$ {p.total.toFixed(2)}</strong>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button 
                        className="btn btn-success" 
                        onClick={() => handleOpenApproveModal(p)}
                        style={{ padding: '8px', fontSize: '13px' }}
                      >
                        <Check size={14} /> Aprovar Pedido
                      </button>
                      <button 
                        className="btn btn-danger btn-secondary" 
                        onClick={() => recusarPedidoOnline(p.id)}
                        style={{ padding: '8px', fontSize: '13px', borderColor: 'var(--border)' }}
                      >
                        <X size={14} /> Recusar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Histórico de Pedidos Processados */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Histórico de Pedidos Online</h3>

            {pastPedidos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
                Nenhum pedido processado anteriormente.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
                {pastPedidos.map(p => (
                  <div key={p.id} style={{ 
                    border: '1px solid var(--border)', 
                    borderRadius: 'var(--radius-sm)', 
                    padding: '12px',
                    opacity: 0.85,
                    background: 'var(--bg-card)'
                  }}>
                    <div className="flex-between">
                      <div>
                        <strong>{p.clienteNome}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          R$ {p.total.toFixed(2)} • {new Date(p.data).toLocaleDateString()}
                        </div>
                      </div>
                      <span className={`badge ${p.status === 'aprovado' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal de Aprovação - Selecionar Forma de Pagamento */}
      {selectedPedido && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px' }}>
            <div className="modal-header flex-between">
              <h3 style={{ fontSize: '16px', margin: 0 }}>Aprovar Pedido de {selectedPedido.clienteNome}</h3>
              <button className="btn btn-secondary btn-icon" style={{ padding: '4px' }} onClick={() => setSelectedPedido(null)}>×</button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Qual foi o meio de pagamento utilizado pelo cliente para pagar o valor de <strong>R$ {selectedPedido.total.toFixed(2)}</strong>?
              </p>
              
              <div className="form-group">
                <label className="form-label">Forma de Pagamento</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {['Pix', 'Dinheiro', 'Cartão'].map(metodo => (
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
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedPedido(null)}>Cancelar</button>
              <button className="btn btn-success" onClick={handleConfirmApproval}>Confirmar e Registrar Venda</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
