import React, { useContext, useState, useEffect } from 'react';
import { DatabaseContext } from '../context/DatabaseContext';
import { Settings, Send } from 'lucide-react';

export default function Notificacoes() {
  const { 
    currentUser, 
    configuracoes, 
    updateConfiguracoes 
  } = useContext(DatabaseContext);

  // Config WhatsApp State
  const [gerenteWhatsApp, setGerenteWhatsApp] = useState('');
  const [whatsappProvider, setWhatsappProvider] = useState('callmebot');
  const [callMeBotApiKey, setCallMeBotApiKey] = useState('');
  const [textMeBotApiKey, setTextMeBotApiKey] = useState('');
  const [notifyCargaStart, setNotifyCargaStart] = useState(true);
  const [notifyCargaReturn, setNotifyCargaReturn] = useState(true);
  const [notifyVendas, setNotifyVendas] = useState(true);
  const [notifyEstoqueRetornado, setNotifyEstoqueRetornado] = useState(true);

  useEffect(() => {
    if (configuracoes) {
      setGerenteWhatsApp(configuracoes.gerenteWhatsApp || '');
      setWhatsappProvider(configuracoes.whatsappProvider || 'callmebot');
      setCallMeBotApiKey(configuracoes.callMeBotApiKey || '');
      setTextMeBotApiKey(configuracoes.textMeBotApiKey || '');
      setNotifyCargaStart(configuracoes.notifyCargaStart !== false);
      setNotifyCargaReturn(configuracoes.notifyCargaReturn !== false);
      setNotifyVendas(configuracoes.notifyVendas !== false);
      setNotifyEstoqueRetornado(configuracoes.notifyEstoqueRetornado !== false);
    }
  }, [configuracoes]);

  const handleSaveConfig = (e) => {
    e.preventDefault();
    updateConfiguracoes({ 
      ...configuracoes,
      gerenteWhatsApp, 
      whatsappProvider,
      callMeBotApiKey, 
      textMeBotApiKey, 
      notifyCargaStart, 
      notifyCargaReturn, 
      notifyVendas, 
      notifyEstoqueRetornado 
    });
    alert("Configurações salvas com sucesso!");
  };

  const handleTestNotification = () => {
    if (!gerenteWhatsApp) {
      alert("Por favor, preencha o número do WhatsApp antes de testar.");
      return;
    }
    
    if (callMeBotApiKey || textMeBotApiKey) {
      fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gerenteWhatsApp, 
          whatsappProvider,
          callMeBotApiKey,
          textMeBotApiKey,
          notifyCargaStart,
          notifyCargaReturn,
          notifyVendas,
          notifyEstoqueRetornado
        })
      })
      .then(res => {
        if (!res.ok) throw new Error("Erro ao enviar mensagem de teste");
        return res.json();
      })
      .then(() => {
        alert(`Mensagem de teste enviada via ${whatsappProvider === 'textmebot' ? 'TextMeBot' : 'CallMeBot'}! Verifique seu WhatsApp.`);
      })
      .catch(err => {
        console.error(err);
        alert(`Falha ao enviar mensagem de teste via ${whatsappProvider === 'textmebot' ? 'TextMeBot' : 'CallMeBot'}.`);
      });
    } else {
      // Teste manual
      const testMsg = `🔔 *Teste de Conexão Manual do VendaRápida!*\nParabéns! Redirecionamento manual funcionando.`;
      const cleanPhone = gerenteWhatsApp.replace(/\D/g, '');
      const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(testMsg)}`;
      window.open(url, '_blank');
    }
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
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📱 Configurações do WhatsApp
            </h4>
            
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontWeight: 500 }}>Celular WhatsApp (com DDI e DDD)</label>
              <input
                type="text"
                className="form-input w-full"
                value={gerenteWhatsApp}
                onChange={(e) => setGerenteWhatsApp(e.target.value)}
                placeholder="Ex: 5511999998888"
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Código do país + DDD + número (sem traços ou espaços). Ex: 55 para o Brasil.
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontWeight: 500 }}>Sistema de Envio</label>
              <select 
                className="form-input w-full" 
                value={whatsappProvider} 
                onChange={(e) => setWhatsappProvider(e.target.value)}
              >
                <option value="callmebot">CallMeBot</option>
                <option value="textmebot">TextMeBot</option>
              </select>
            </div>

            {whatsappProvider === 'callmebot' ? (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 500 }}>Chave API CallMeBot (Opcional)</label>
                <input
                  type="text"
                  className="form-input w-full"
                  value={callMeBotApiKey}
                  onChange={(e) => setCallMeBotApiKey(e.target.value)}
                  placeholder="Chave de API do CallMeBot"
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Deixe em branco para envio manual via WhatsApp Web, ou insira a chave obtida no site <a href="https://www.callmebot.com" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'var(--primary)' }}>callmebot.com</a>.
                </span>
              </div>
            ) : (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 500 }}>Chave API TextMeBot (Opcional)</label>
                <input
                  type="text"
                  className="form-input w-full"
                  value={textMeBotApiKey}
                  onChange={(e) => setTextMeBotApiKey(e.target.value)}
                  placeholder="Chave de API do TextMeBot"
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Insira a chave obtida no site <a href="https://textmebot.com" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'var(--primary)' }}>textmebot.com</a>.
                </span>
              </div>
            )}
          </div>



          {/* Seletores de Notificação */}
          <div>
            <label className="form-label" style={{ fontWeight: 600, marginBottom: '8px' }}>Notificações Desejadas (WhatsApp)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-app)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={notifyCargaStart}
                  onChange={(e) => setNotifyCargaStart(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>Nova Saída para a Rua! 🚚</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={notifyCargaReturn}
                  onChange={(e) => setNotifyCargaReturn(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>Fechamento de Caixa! 💰</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={notifyVendas}
                  onChange={(e) => setNotifyVendas(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>Vendas Realizadas! 🛍️</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={notifyEstoqueRetornado}
                  onChange={(e) => setNotifyEstoqueRetornado(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>Estoque Devolvido & Disponível Central! 🔄</span>
              </label>
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
