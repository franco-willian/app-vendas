import React, { useState } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle, Database } from 'lucide-react';

export default function SistemaBackup() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  const handleDownload = () => {
    window.location.href = '/api/backup';
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleRestore = async () => {
    if (!file) {
      setError(true);
      setMessage("Selecione um arquivo de backup (.json) primeiro.");
      return;
    }

    if (!window.confirm("ATENÇÃO: Restaurar um backup irá substituir TODOS os dados atuais do sistema. Deseja continuar?")) {
      return;
    }

    setLoading(true);
    setMessage("");
    setError(false);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const jsonContent = JSON.parse(e.target.result);
          
          const response = await fetch('/api/backup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(jsonContent)
          });
          
          const result = await response.json();
          if (response.ok) {
            setError(false);
            setMessage("Backup restaurado com sucesso! A página será recarregada.");
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else {
            setError(true);
            setMessage(result.error || "Erro ao restaurar backup.");
          }
        } catch (parseErr) {
          setError(true);
          setMessage("Arquivo inválido. Certifique-se de que é um JSON de backup válido.");
        }
        setLoading(false);
      };
      reader.readAsText(file);
    } catch (err) {
      setError(true);
      setMessage("Erro ao processar o arquivo.");
      setLoading(false);
    }
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease-out" }}>
      <div className="flex-between mb-24">
        <div>
          <h2 style={{ fontSize: "28px", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Database size={28} style={{ color: "var(--primary)" }} />
            Backup do Sistema
          </h2>
          <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>
            Exporte os dados atuais para segurança ou restaure um arquivo de backup antigo.
          </p>
        </div>
      </div>

      <div className="card mb-24">
        <h3 style={{ fontSize: "18px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Download size={20} />
          Exportar Backup
        </h3>
        <p style={{ color: "var(--text-secondary)", marginBottom: "16px", fontSize: "14px" }}>
          Faça o download de todos os seus dados atuais (produtos, vendas, clientes, etc) no formato JSON. Guarde este arquivo em um local seguro.
        </p>
        <button className="btn btn-primary" onClick={handleDownload} style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Download size={18} />
          Baixar Backup (.json)
        </button>
      </div>

      <div className="card" style={{ borderLeft: "4px solid var(--warning)" }}>
        <h3 style={{ fontSize: "18px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Upload size={20} />
          Restaurar Backup
        </h3>
        
        <div style={{ background: "rgba(245, 158, 11, 0.1)", padding: "12px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px", color: "var(--warning)", display: "flex", gap: "8px", alignItems: "flex-start" }}>
          <AlertTriangle size={24} style={{ flexShrink: 0 }} />
          <div>
            <strong>Cuidado:</strong> Restaurar um backup irá <u>sobreescrever completamente</u> os dados atuais do seu sistema com os dados do arquivo selecionado. Esta ação não pode ser desfeita.
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Arquivo de Backup (.json)</label>
          <input 
            type="file" 
            accept=".json" 
            className="form-input w-full" 
            onChange={handleFileChange}
            style={{ padding: "10px" }}
          />
        </div>

        {message && (
          <div style={{ 
            padding: "12px", 
            borderRadius: "8px", 
            marginBottom: "16px", 
            fontSize: "14px",
            background: error ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
            color: error ? "var(--danger)" : "var(--success)",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            {error ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
            {message}
          </div>
        )}

        <button 
          className="btn btn-danger" 
          onClick={handleRestore}
          disabled={loading || !file}
          style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: "8px", opacity: (!file || loading) ? 0.6 : 1 }}
        >
          <Upload size={18} />
          {loading ? "Restaurando..." : "Restaurar Dados"}
        </button>
      </div>
    </div>
  );
}
