import React, { useContext, useState } from 'react';
import { DatabaseContext } from '../context/DatabaseContext';
import { Play, ClipboardCheck, ArrowLeftRight, CheckSquare, Plus, Minus } from 'lucide-react';

export default function CargaDiaria() {
  const { produtos, activeCargas, usuarios, startCarga, returnCarga, handleManualWhatsAppNotify, currentUser, configuracoes } = useContext(DatabaseContext);
  const [quantidadesSaida, setQuantidadesSaida] = useState({});
  const [quantidadesRetorno, setQuantidadesRetorno] = useState({});

  const isAdmin = currentUser && (
    currentUser.tipo === 'admin-vendedor' || 
    currentUser.tipo === 'gerente' || 
    currentUser.tipo === 'admin'
  );

  const [selectedVendedor, setSelectedVendedor] = useState(currentUser ? currentUser.usuario : 'vendedor');

  const targetActiveCarga = activeCargas[selectedVendedor] || null;

  const handleQtySaidaChange = (prodId, val, maxVal) => {
    const parsedVal = Math.min(maxVal, Math.max(0, parseInt(val) || 0));
    setQuantidadesSaida(prev => ({
      ...prev,
      [prodId]: parsedVal
    }));
  };

  const handleQtyRetornoChange = (prodId, val, maxVal) => {
    const parsedVal = Math.min(maxVal, Math.max(0, parseInt(val) || 0));
    setQuantidadesRetorno(prev => ({
      ...prev,
      [prodId]: parsedVal
    }));
  };

  const handleStart = () => {
    // Filtrar apenas itens com quantidade > 0
    const filterItens = {};
    let hasItems = false;
    Object.entries(quantidadesSaida).forEach(([id, qty]) => {
      if (qty > 0) {
        filterItens[id] = qty;
        hasItems = true;
      }
    });

    if (!hasItems) {
      alert("Por favor, selecione pelo menos 1 item com quantidade maior que 0 para sair.");
      return;
    }

    startCarga(filterItens, selectedVendedor);

    // Notificação Manual WhatsApp
    if (configuracoes.notifyCargaStart !== false) {
      const targetUser = usuarios.find(u => u.usuario === selectedVendedor);
      const nomeVendedor = targetUser ? targetUser.nome : selectedVendedor;
      const itensList = Object.entries(filterItens).map(([id, qty]) => {
        const prod = produtos.find(p => p.id === id);
        return `- ${prod ? prod.nome : 'Produto'}: ${qty} un`;
      }).join('\n');
      const alertMsg = `🚚 *Nova Saída para a Rua!*\n👤 Vendedor: ${nomeVendedor}\n📦 Itens retirados:\n${itensList}`;
      handleManualWhatsAppNotify(alertMsg);
    }

    setQuantidadesSaida({});
  };

  const handleFinish = () => {
    if (!targetActiveCarga) return;

    // Montar o objeto de retorno. Se algum produto não foi preenchido, assumimos 0 de retorno.
    const retorno = {};
    targetActiveCarga.itens.forEach(item => {
      const qtyRet = quantidadesRetorno[item.produtoId] !== undefined 
        ? quantidadesRetorno[item.produtoId] 
        : (item.quantidadeSaida - item.quantidadeVendida); // sugestão default: a sobra teórica
      retorno[item.produtoId] = qtyRet;
    });

    returnCarga(retorno, selectedVendedor);

    // Notificação Manual WhatsApp
    const notifyReturn = configuracoes.notifyCargaReturn !== false;
    const notifyEstoque = configuracoes.notifyEstoqueRetornado !== false;

    if (notifyReturn || notifyEstoque) {
      const targetUser = usuarios.find(u => u.usuario === selectedVendedor);
      const nomeVendedor = targetUser ? targetUser.nome : selectedVendedor;
      let alertMsg = `💰 *Fechamento de Caixa!*\n👤 Vendedor: ${nomeVendedor}\n`;
      
      if (notifyReturn) {
        const summaryList = targetActiveCarga.itens.map(item => {
          const returned = retorno[item.produtoId] !== undefined ? retorno[item.produtoId] : (item.quantidadeSaida - item.quantidadeVendida);
          const sold = item.quantidadeVendida;
          return `- ${item.nome}:\n  Saída: ${item.quantidadeSaida} | Vendas: ${sold} | Retorno: ${returned}`;
        }).join('\n');
        alertMsg += `📊 *Resumo da Carga:*\n${summaryList}\n`;
      }
      
      if (notifyEstoque) {
        alertMsg += `\n🔄 *Estoque Devolvido & Disponível Central:*\n`;
        const estoqueList = targetActiveCarga.itens.map(item => {
          const returned = retorno[item.produtoId] !== undefined ? retorno[item.produtoId] : (item.quantidadeSaida - item.quantidadeVendida);
          const prodObj = produtos.find(p => p.id === item.produtoId);
          const totalDisp = prodObj ? (prodObj.estoque + returned) : returned;
          return `- ${item.nome}: Devolvido: ${returned} un | Total Central: ${totalDisp} un`;
        }).join('\n');
        alertMsg += estoqueList;
      }

      handleManualWhatsAppNotify(alertMsg);
    }

    setQuantidadesRetorno({});
    alert("Carga diária finalizada! As sobras foram devolvidas ao estoque central com sucesso.");
  };

  const setAllDefaultRetornos = () => {
    if (!targetActiveCarga) return;
    const def = {};
    targetActiveCarga.itens.forEach(item => {
      def[item.produtoId] = Math.max(0, item.quantidadeSaida - item.quantidadeVendida);
    });
    setQuantidadesRetorno(def);
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', textAlign: 'left' }}>
      <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>Carga Diária (Estoque de Rua)</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
        Controle o que sai para vender na rua e devolva as sobras ao estoque principal no fim do dia.
      </p>

      {/* Seletor de Vendedor para Gerente/Admin */}
      {isAdmin && (
        <div className="card mb-24" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '15px' }}>Gerenciar Carga de:</span>
          <select 
            className="form-input" 
            value={selectedVendedor} 
            onChange={(e) => {
              setSelectedVendedor(e.target.value);
              setQuantidadesSaida({});
              setQuantidadesRetorno({});
            }}
            style={{ minWidth: '200px', fontSize: '14px', padding: '8px 12px' }}
          >
            {usuarios.map(u => (
              <option key={u.id} value={u.usuario}>
                {u.nome} ({u.tipo === 'vendedor' ? 'Vendedor' : 'Gerente'})
              </option>
            ))}
          </select>
        </div>
      )}

      {!targetActiveCarga ? (
        // TELA PARA ABRIR CARGA
        <div className="card">
          <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Play size={18} style={{ color: 'var(--success)' }} />
            Iniciar Nova Saída para a Rua
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Selecione a quantidade de cada produto que você está retirando do estoque central para vender na rua hoje.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {produtos.filter(p => p.estoque > 0).map(p => {
              const qty = quantidadesSaida[p.id] || 0;
              return (
                <div key={p.id} className="product-row-flex">
                  <div className="product-info-group">
                    <img 
                      src={p.fotoUrl} 
                      alt={p.nome} 
                      style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} 
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{p.nome}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Disponível: <strong style={{ color: 'var(--text-primary)' }}>{p.estoque} un</strong>
                      </div>
                    </div>
                  </div>

                  <div className="qty-controls-group">
                    <button 
                      type="button"
                      className="btn btn-secondary btn-icon" 
                      onClick={() => handleQtySaidaChange(p.id, qty - 1, p.estoque)}
                      disabled={qty <= 0}
                      style={{ width: '32px', height: '32px', padding: 0 }}
                    >
                      <Minus size={14} />
                    </button>
                    
                    <input 
                      type="number" 
                      className="form-input" 
                      value={qty}
                      onChange={(e) => handleQtySaidaChange(p.id, e.target.value, p.estoque)}
                      style={{ width: '50px', textAlign: 'center', padding: '4px 6px', fontSize: '14px' }}
                      min="0"
                      max={p.estoque}
                    />

                    <button 
                      type="button"
                      className="btn btn-secondary btn-icon" 
                      onClick={() => handleQtySaidaChange(p.id, qty + 1, p.estoque)}
                      disabled={qty >= p.estoque}
                      style={{ width: '32px', height: '32px', padding: 0 }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button className="btn btn-primary w-full" onClick={handleStart}>
            <Play size={16} /> Confirmar Carga e Iniciar Vendas
          </button>
        </div>
      ) : (
        // TELA DE CARGA ATIVA
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Status da Carga */}
          <div className="card" style={{ borderLeft: '4px solid var(--success)', background: 'var(--success-light)', color: 'var(--success)' }}>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '18px' }}>
              ✓ Carga Diária Ativa e em Andamento
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
              Iniciada em: {new Date(targetActiveCarga.data).toLocaleString()}
            </div>
          </div>

          {/* Lista de Itens na Carga */}
          <div className="card">
            <div className="flex-between mb-16" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', margin: 0 }}>Produtos Levados na Rua</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Preencha a quantidade que sobrou para devolver ao estoque.</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={setAllDefaultRetornos}>
                Sugerir Sobras Teóricas
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {targetActiveCarga.itens.map(item => {
                const maxRetorno = item.quantidadeSaida - item.quantidadeVendida;
                const qtyRetorno = quantidadesRetorno[item.produtoId] !== undefined 
                  ? quantidadesRetorno[item.produtoId] 
                  : '';
                
                return (
                  <div key={item.produtoId} style={{ 
                    border: '1px solid var(--border)', 
                    borderRadius: 'var(--radius-sm)', 
                    padding: '16px',
                    background: 'var(--bg-app)'
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '12px' }}>{item.nome}</div>
                    
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))', 
                      gap: '12px',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Saiu para Vender</div>
                        <div style={{ fontSize: '16px', fontWeight: 600 }}>{item.quantidadeSaida} un</div>
                      </div>

                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Vendido na Rua</div>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--success)' }}>{item.quantidadeVendida} un</div>
                      </div>

                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sobrou (Teórico)</div>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--primary)' }}>{maxRetorno} un</div>
                      </div>

                      {/* Input de Devolução Real */}
                      <div>
                        <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Sobrou Real (Retorno)</label>
                        <input 
                          type="number" 
                          className="form-input w-full"
                          placeholder={`${maxRetorno}`}
                          value={qtyRetorno}
                          onChange={(e) => handleQtyRetornoChange(item.produtoId, e.target.value, item.quantidadeSaida)}
                          min="0"
                          max={item.quantidadeSaida}
                          style={{ padding: '6px 10px', fontSize: '14px', width: '100%' }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="btn btn-success w-full" onClick={handleFinish}>
              <ClipboardCheck size={16} /> Fechar Caixa do Dia e Devolver Sobras
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
