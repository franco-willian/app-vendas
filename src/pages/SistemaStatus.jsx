import React, { useEffect, useState } from 'react';
import { Activity, Clock, Cpu, Database, Server, Users, ShoppingCart, Box, RefreshCw } from 'lucide-react';

export default function SistemaStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error("Falha ao obter status do servidor");
      const data = await res.json();
      setStatus(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds) => {
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    
    let parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease-out" }}>
      <div className="flex-between mb-24">
        <div>
          <h2 style={{ fontSize: "28px", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={28} style={{ color: "var(--primary)" }} />
            Status do Servidor
          </h2>
          <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>
            Monitoramento em tempo real dos recursos e do banco de dados do VendaRápida.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchStatus} disabled={loading} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <RefreshCw size={16} className={loading ? "spin" : ""} /> Atualizar
        </button>
      </div>

      {error ? (
        <div className="card text-center" style={{ color: "var(--danger)" }}>
          {error}
        </div>
      ) : !status ? (
        <div className="text-center" style={{ padding: "40px", color: "var(--text-secondary)" }}>
          <RefreshCw size={24} className="spin" style={{ margin: "0 auto 16px" }} />
          <p>Carregando métricas do sistema...</p>
        </div>
      ) : (
        <>
          {/* Métricas do Servidor */}
          <h3 style={{ fontSize: "18px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Server size={20} /> Recursos da Máquina
          </h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "32px"
          }}>
            <div className="card" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--success-light)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Clock size={24} />
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block" }}>Tempo Online (Uptime)</span>
                <strong style={{ fontSize: "20px" }}>{formatUptime(status.uptime)}</strong>
              </div>
            </div>

            <div className="card" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--warning-light)", color: "var(--warning)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Cpu size={24} />
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block" }}>Memória Usada (RSS)</span>
                <strong style={{ fontSize: "20px" }}>{formatBytes(status.memory.rss)}</strong>
              </div>
            </div>

            <div className="card" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Database size={24} />
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block" }}>Memória Total do Heap</span>
                <strong style={{ fontSize: "20px" }}>{formatBytes(status.memory.heapTotal)}</strong>
              </div>
            </div>
          </div>

          {/* Estatísticas do Banco */}
          <h3 style={{ fontSize: "18px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Database size={20} /> Volume de Dados Salvos
          </h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px"
          }}>
            <div className="card text-center" style={{ padding: "24px 16px" }}>
              <ShoppingCart size={32} style={{ color: "var(--primary)", margin: "0 auto 12px" }} />
              <div style={{ fontSize: "28px", fontWeight: "700" }}>{status.stats.vendas}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Vendas Registradas</div>
            </div>

            <div className="card text-center" style={{ padding: "24px 16px" }}>
              <Box size={32} style={{ color: "var(--success)", margin: "0 auto 12px" }} />
              <div style={{ fontSize: "28px", fontWeight: "700" }}>{status.stats.produtos}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Produtos Cadastrados</div>
            </div>

            <div className="card text-center" style={{ padding: "24px 16px" }}>
              <Users size={32} style={{ color: "var(--warning)", margin: "0 auto 12px" }} />
              <div style={{ fontSize: "28px", fontWeight: "700" }}>{status.stats.clientes}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Clientes Salvos</div>
            </div>

            <div className="card text-center" style={{ padding: "24px 16px" }}>
              <Server size={32} style={{ color: "var(--text-secondary)", margin: "0 auto 12px" }} />
              <div style={{ fontSize: "28px", fontWeight: "700" }}>{status.stats.usuarios}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Usuários do Sistema</div>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: "24px", color: "var(--text-muted)", fontSize: "12px" }}>
            Motor NodeJS: {status.nodeVersion}
          </div>
        </>
      )}
    </div>
  );
}
