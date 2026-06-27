import React, { useContext, useEffect, useState } from 'react';
import { DatabaseContext } from '../context/DatabaseContext';
import { Settings, Save, Server, Shield, HardDrive, Bell } from 'lucide-react';

export default function SistemaConfig() {
  const { configuracoes, updateConfiguracoes } = useContext(DatabaseContext);
  const [serverInfo, setServerInfo] = useState(null);
  
  // Local state for the form
  const [formData, setFormData] = useState({
    notifyCargaStart: true,
    notifyCargaReturn: true,
    notifyVendas: true,
    notifyEstoqueRetornado: true
  });

  useEffect(() => {
    if (configuracoes) {
      setFormData({
        notifyCargaStart: configuracoes.notifyCargaStart !== false,
        notifyCargaReturn: configuracoes.notifyCargaReturn !== false,
        notifyVendas: configuracoes.notifyVendas !== false,
        notifyEstoqueRetornado: configuracoes.notifyEstoqueRetornado !== false
      });
    }
  }, [configuracoes]);

  useEffect(() => {
    fetch('/api/config-server')
      .then(res => res.json())
      .then(data => setServerInfo(data))
      .catch(err => console.error(err));
  }, []);

  const handleChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateConfiguracoes({
      ...configuracoes,
      ...formData
    });
    alert("Configurações do sistema salvas com sucesso!");
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease-out" }}>
      <div className="flex-between mb-24">
        <div>
          <h2 style={{ fontSize: "28px", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Settings size={28} style={{ color: "var(--primary)" }} />
            Configurações do Servidor
          </h2>
          <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>
            Visualize os parâmetros técnicos do backend e ajuste as preferências globais do sistema.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
        
        {/* Informações Técnicas */}
        <div className="card">
          <h3 style={{ fontSize: "18px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Server size={20} /> Detalhes do Host (Somente Leitura)
          </h3>
          
          {serverInfo ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
                <div style={{ background: "var(--bg-app)", padding: "10px", borderRadius: "8px", color: "var(--primary)" }}>
                  <Server size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Porta de Execução</div>
                  <div style={{ fontWeight: 600 }}>{serverInfo.port}</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
                <div style={{ background: "var(--bg-app)", padding: "10px", borderRadius: "8px", color: "var(--warning)" }}>
                  <HardDrive size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Caminho do Banco de Dados</div>
                  <div style={{ fontWeight: 600, wordBreak: "break-all", fontSize: "13px" }}>{serverInfo.dbPath}</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
                <div style={{ background: "var(--bg-app)", padding: "10px", borderRadius: "8px", color: "var(--success)" }}>
                  <Shield size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Ambiente Node</div>
                  <div style={{ fontWeight: 600, textTransform: "capitalize" }}>{serverInfo.nodeEnv}</div>
                </div>
              </div>
              
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>
                Nota: Para alterar informações como a porta do servidor, é necessário modificar o arquivo de inicialização e reiniciar o processo Node.js.
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--text-secondary)" }}>Carregando informações do host...</div>
          )}
        </div>

        {/* Preferências do Sistema */}
        <div className="card">
          <h3 style={{ fontSize: "18px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Bell size={20} /> Alertas Globais (WhatsApp)
          </h3>
          
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", padding: "8px 0" }}>
              <input 
                type="checkbox" 
                name="notifyVendas"
                checked={formData.notifyVendas}
                onChange={handleChange}
                style={{ width: "20px", height: "20px", accentColor: "var(--primary)" }}
              />
              <span style={{ fontSize: "15px" }}>Avisar sobre Novas Vendas (Online/Checkout)</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", padding: "8px 0" }}>
              <input 
                type="checkbox" 
                name="notifyCargaStart"
                checked={formData.notifyCargaStart}
                onChange={handleChange}
                style={{ width: "20px", height: "20px", accentColor: "var(--primary)" }}
              />
              <span style={{ fontSize: "15px" }}>Avisar quando Vendedor Iniciar Carga de Rua</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", padding: "8px 0" }}>
              <input 
                type="checkbox" 
                name="notifyCargaReturn"
                checked={formData.notifyCargaReturn}
                onChange={handleChange}
                style={{ width: "20px", height: "20px", accentColor: "var(--primary)" }}
              />
              <span style={{ fontSize: "15px" }}>Avisar sobre Fechamento de Caixa de Vendedores</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", padding: "8px 0" }}>
              <input 
                type="checkbox" 
                name="notifyEstoqueRetornado"
                checked={formData.notifyEstoqueRetornado}
                onChange={handleChange}
                style={{ width: "20px", height: "20px", accentColor: "var(--primary)" }}
              />
              <span style={{ fontSize: "15px" }}>Avisar sobre Devolução de Estoque (Sobra de Rua)</span>
            </label>
            
            <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 24px" }}>
                <Save size={18} /> Salvar Modificações
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
