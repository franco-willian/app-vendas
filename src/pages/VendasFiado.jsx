import React, { useContext, useState } from 'react';
import { DatabaseContext } from '../context/DatabaseContext';
import { DollarSign, CheckCircle2, User, Search, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../context/ConfirmContext';

export default function VendasFiado() {
  const { confirm } = useConfirm();
  const { vendas, clientes, quitarVendaFiado, currentUser } = useContext(DatabaseContext);
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = currentUser && (
    currentUser.tipo === 'admin-vendedor' || 
    currentUser.tipo === 'gerente' || 
    currentUser.tipo === 'admin'
  );

  const pendingFiados = vendas.filter(v => {
    const isFiado = v.formaPagamento === 'Fiado' && v.statusPagamento === 'pendente';
    if (isAdmin) return isFiado;
    return isFiado && v.vendedor === currentUser?.nome;
  });

  const getClientInfo = (clienteId) => {
    return clientes.find(c => c.id === clienteId);
  };

  const filteredFiados = pendingFiados.filter(v => {
    if (!searchTerm) return true;
    const client = getClientInfo(v.clienteId);
    const clientName = client ? client.nome.toLowerCase() : 'cliente não identificado';
    return clientName.includes(searchTerm.toLowerCase());
  });

  // Group by client
  const groupedFiados = filteredFiados.reduce((acc, v) => {
    const clientId = v.clienteId || 'unidentified';
    if (!acc[clientId]) {
      acc[clientId] = {
        client: getClientInfo(v.clienteId),
        vendas: [],
        total: 0
      };
    }
    acc[clientId].vendas.push(v);
    acc[clientId].total += v.total;
    return acc;
  }, {});

  const handleQuitar = async (vendaId) => {
    if (await confirm({ title: "Quitar Venda", message: "Tem certeza que deseja marcar esta venda como PAGA? Isso baixará a dívida do cliente." })) {
      quitarVendaFiado(vendaId);
      toast.success("Venda quitada com sucesso!");
    }
  };

  const totalGeral = pendingFiados.reduce((acc, v) => acc + v.total, 0);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', textAlign: 'left' }}>
      <div className="flex-between mb-24" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '28px', margin: 0 }}>Vendas a Fiado (A Receber)</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Gerencie as contas pendentes dos clientes.</p>
        </div>
        
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', background: 'var(--primary)', color: 'white' }}>
          <DollarSign size={24} />
          <div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>Total a Receber</div>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>R$ {totalGeral.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="card mb-24" style={{ padding: '12px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-input w-full"
            placeholder="Buscar por nome do cliente..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>
      </div>

      {Object.keys(groupedFiados).length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
          Nenhuma conta a fiado pendente encontrada.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {Object.values(groupedFiados).map(group => (
            <div key={group.client?.id || 'unidentified'} className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ background: 'var(--bg-app)', padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>{group.client ? group.client.nome : 'Cliente Não Identificado'}</h3>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {group.client ? group.client.whatsapp : 'Sem contato'}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Dívida Total</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--warning)' }}>R$ {group.total.toFixed(2)}</div>
                </div>
              </div>
              
              <div style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--text-secondary)' }}>Vendas Pendentes ({group.vendas.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {group.vendas.map(v => (
                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>R$ {v.total.toFixed(2)}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Realizada em: {new Date(v.data).toLocaleDateString()} às {new Date(v.data).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {v.dataPagamento && (
                          <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px', fontWeight: 500 }}>
                            Vencimento: {new Date(v.dataPagamento).toLocaleDateString()}
                          </div>
                        )}
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} /> {v.tipoVenda} • Vendedor: {v.vendedor}
                        </div>
                      </div>
                      
                      <div>
                        <button 
                          className="btn btn-success" 
                          onClick={() => handleQuitar(v.id)}
                          style={{ fontSize: '13px', padding: '8px 12px' }}
                        >
                          <CheckCircle2 size={16} /> Marcar como Pago
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
