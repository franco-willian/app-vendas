import React, { useContext, useState, useEffect } from 'react';
import { DatabaseContext } from '../context/DatabaseContext';
import { Settings, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Notificacoes() {
  const { 
    currentUser, 
    configuracoes, 
    updateConfiguracoes 
  } = useContext(DatabaseContext);

  // Config WhatsApp State
  const [grupoDonuts, setGrupoDonuts] = useState('');
  const [grupoBolo, setGrupoBolo] = useState('');
  const [grupoBrownie, setGrupoBrownie] = useState('');
  const [grupoCaixa, setGrupoCaixa] = useState('');
  const [grupoLojaOnline, setGrupoLojaOnline] = useState('');
  const [grupoBackup, setGrupoBackup] = useState('');
  
  // WhatsApp Microservice State
  const [wpStatus, setWpStatus] = useState(false);
  const [wpQr, setWpQr] = useState('');
  const [wpGroups, setWpGroups] = useState([]);

  useEffect(() => {
    if (configuracoes) {
      setGrupoDonuts(configuracoes.grupoDonuts || '');
      setGrupoBolo(configuracoes.grupoBolo || '');
      setGrupoBrownie(configuracoes.grupoBrownie || '');
      setGrupoCaixa(configuracoes.grupoCaixa || '');
      setGrupoLojaOnline(configuracoes.grupoLojaOnline || '');
      setGrupoBackup(configuracoes.grupoBackup || '');
    }
  }, [configuracoes]);

  useEffect(() => {
    let interval;
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/whatsapp/status');
        const data = await res.json();
        setWpStatus(data.connected);

        if (data.connected) {
          const resGroups = await fetch('/api/whatsapp/groups');
          const dataGroups = await resGroups.json();
          setWpGroups(dataGroups.groups || []);
        } else {
          const resQr = await fetch('/api/whatsapp/qr');
          const dataQr = await resQr.json();
          setWpQr(dataQr.qr || '');
        }
      } catch (err) {
        console.error("Erro ao checar whatsapp:", err);
      }
    };

    checkStatus();
    interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveConfig = (e) => {
    e.preventDefault();
    updateConfiguracoes({ 
      ...configuracoes,
      grupoDonuts,
      grupoBolo,
      grupoBrownie,
      grupoCaixa,
      grupoLojaOnline,
      grupoBackup
    });
    toast.success("Configurações salvas com sucesso!");
  };

  const handleTestNotification = () => {
    if (!grupoCaixa && !grupoDonuts && !grupoBolo && !grupoBrownie && !grupoLojaOnline && !grupoBackup) {
      toast.success("Por favor, preencha pelo menos um número/grupo para testar.");
      return;
    }
    
    fetch('/api/whatsapp/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        grupoDonuts,
        grupoBolo,
        grupoBrownie,
        grupoCaixa,
        grupoLojaOnline,
        grupoBackup
      })
    })
    .then(res => res.json())
    .then(() => {
      toast.success(`Mensagem de teste enviada! Verifique o WhatsApp.`);
    })
    .catch(err => {
      console.error(err);
      toast.error(`Falha ao enviar mensagem de teste.`);
    });
  };

  // Se não for admin, não permite visualizar
  const isAdmin = currentUser && (currentUser.tipo === 'admin-vendedor' || currentUser.tipo === 'gerente' || currentUser.tipo === 'admin');
  if (!isAdmin) {
    return (
      <div className="card text-center" style={{ padding: '40px 20px', color: 'var(--danger)' }}>
        Acesso Negado: Apenas gerentes ou administradores do sistema podem acessar as Configurações.
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
      <div className="mb-24">
        <h2 style={{ fontSize: '28px', margin: 0 }}>Configurações de Integração</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Parametrizar a integração do WhatsApp e do Mercado Pago com o sistema.</p>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
        <h3 style={{ fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={18} style={{ color: 'var(--primary)' }} />
          Parâmetros do Sistema
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
          Insira as credenciais necessárias para ativar os envios automatizados e checkout online.
        </p>

        <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Seção WhatsApp */}
          {/* Seção WhatsApp e Roteamento */}
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📱 Configurações do WhatsApp (Roteamento)
            </h4>
            
            <div style={{ padding: '16px', background: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', marginBottom: '20px', border: '1px solid var(--border)' }}>
              <h5 style={{ margin: '0 0 10px 0', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Status do WhatsApp Local
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: wpStatus ? 'var(--success)' : 'var(--danger)' }}></span>
              </h5>
              
              {!wpStatus ? (
                <div style={{ textAlign: 'center', padding: '10px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Escaneie o QR Code abaixo para conectar o bot ao seu número de WhatsApp:</p>
                  {wpQr ? (
                    <div style={{ margin: '10px auto', background: '#fff', padding: '10px', display: 'inline-block', borderRadius: '8px' }}>
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(wpQr)}`} alt="WhatsApp QR Code" />
                    </div>
                  ) : (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Aguardando geração do QR Code...</p>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--success)' }}>WhatsApp Conectado com Sucesso! Os grupos abaixo estão atualizados.</p>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontWeight: 500 }}>Celular/Grupo: Vendas Donuts</label>
              {wpStatus ? (
                <select className="form-input w-full" value={grupoDonuts} onChange={(e) => setGrupoDonuts(e.target.value)}>
                  <option value="">-- Nenhum --</option>
                  {wpGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              ) : (
                <input type="text" className="form-input w-full" value={grupoDonuts} onChange={(e) => setGrupoDonuts(e.target.value)} placeholder="Ex: 1203630... ou 5511999998888" />
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontWeight: 500 }}>Celular/Grupo: Vendas Bolo de Pote</label>
              {wpStatus ? (
                <select className="form-input w-full" value={grupoBolo} onChange={(e) => setGrupoBolo(e.target.value)}>
                  <option value="">-- Nenhum --</option>
                  {wpGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              ) : (
                <input type="text" className="form-input w-full" value={grupoBolo} onChange={(e) => setGrupoBolo(e.target.value)} placeholder="Ex: 1203630... ou 5511999998888" />
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontWeight: 500 }}>Celular/Grupo: Vendas Gourmet Brownie</label>
              {wpStatus ? (
                <select className="form-input w-full" value={grupoBrownie} onChange={(e) => setGrupoBrownie(e.target.value)}>
                  <option value="">-- Nenhum --</option>
                  {wpGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              ) : (
                <input type="text" className="form-input w-full" value={grupoBrownie} onChange={(e) => setGrupoBrownie(e.target.value)} placeholder="Ex: 1203630... ou 5511999998888" />
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontWeight: 500 }}>Celular/Grupo: Relatório do Caixa / Saídas</label>
              {wpStatus ? (
                <select className="form-input w-full" value={grupoCaixa} onChange={(e) => setGrupoCaixa(e.target.value)}>
                  <option value="">-- Nenhum --</option>
                  {wpGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              ) : (
                <input type="text" className="form-input w-full" value={grupoCaixa} onChange={(e) => setGrupoCaixa(e.target.value)} placeholder="Ex: 1203630... ou 5511999998888" />
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontWeight: 500 }}>Celular/Grupo: Pedidos da Loja Online</label>
              {wpStatus ? (
                <select className="form-input w-full" value={grupoLojaOnline} onChange={(e) => setGrupoLojaOnline(e.target.value)}>
                  <option value="">-- Nenhum --</option>
                  {wpGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              ) : (
                <input type="text" className="form-input w-full" value={grupoLojaOnline} onChange={(e) => setGrupoLojaOnline(e.target.value)} placeholder="Ex: 1203630... ou 5511999998888" />
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontWeight: 500 }}>Celular/Grupo: Backups do Sistema</label>
              {wpStatus ? (
                <select className="form-input w-full" value={grupoBackup} onChange={(e) => setGrupoBackup(e.target.value)}>
                  <option value="">-- Nenhum --</option>
                  {wpGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              ) : (
                <input type="text" className="form-input w-full" value={grupoBackup} onChange={(e) => setGrupoBackup(e.target.value)} placeholder="Ex: 1203630... ou 5511999998888" />
              )}
            </div>
          </div>



          {/* Ações */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '12px 18px', fontSize: '15px' }}>
              Salvar Configurações
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleTestNotification}
              style={{ padding: '12px 18px' }}
              title="Testar envio WhatsApp"
            >
              <Send size={18} /> Testar Whats
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
