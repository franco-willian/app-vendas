import React, { useState, useEffect } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle, Database, Plus, FileJson, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../context/ConfirmContext';

export default function SistemaBackup() {
  const { confirm } = useConfirm();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [backupsList, setBackupsList] = useState([]);

  const fetchBackups = async () => {
    try {
      const res = await fetch('/api/backups');
      const data = await res.json();
      setBackupsList(data || []);
    } catch (err) {
      console.error("Erro ao listar backups", err);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleGenerateBackup = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/backup/generate', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success("Backup gerado com sucesso e enviado pro WhatsApp!");
        fetchBackups();
        window.location.href = `/api/backup/download/${data.filename}`;
      } else {
        toast.error("Erro: " + data.error);
      }
    } catch (err) {
      toast.error("Erro ao gerar backup.");
    } finally {
      setGenerating(false);
    }
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

    if (!await confirm({ title: "Restaurar Backup", message: "ATENÇÃO: Restaurar um backup irá substituir TODOS os dados atuais do sistema. Deseja continuar?" })) {
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
          <Database size={20} />
          Últimos Backups do Sistema
        </h3>
        <p style={{ color: "var(--text-secondary)", marginBottom: "16px", fontSize: "14px" }}>
          Aqui estão os últimos 5 backups gerados. Quando você gera um novo, ele é salvo e enviado pelo WhatsApp (se configurado).
        </p>
        
        <button 
          className="btn btn-primary mb-16" 
          onClick={handleGenerateBackup} 
          disabled={generating}
          style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: "8px" }}
        >
          {generating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          {generating ? "Gerando e Enviando..." : "Gerar Novo Backup Agora"}
        </button>

        {backupsList.length > 0 ? (
          <div style={{ background: "var(--bg-app)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            {backupsList.map((bkp, i) => (
              <div key={i} className="flex-between" style={{ padding: "12px 16px", borderBottom: i < backupsList.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <FileJson size={20} style={{ color: "var(--primary)" }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "14px" }}>{bkp.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      {new Date(bkp.date).toLocaleString('pt-BR')} • {(bkp.size / 1024).toFixed(2)} KB
                    </div>
                  </div>
                </div>
                <a href={`/api/backup/download/${bkp.name}`} className="btn btn-secondary btn-icon" title="Baixar Arquivo">
                  <Download size={18} />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", background: "var(--bg-app)", borderRadius: "8px" }}>
            Nenhum backup gerado ainda.
          </div>
        )}
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
