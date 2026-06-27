import React, { useState, useContext } from 'react';
import { DatabaseContext } from '../context/DatabaseContext';
import { Shield, Key, User } from 'lucide-react';

export default function Login({ onLogin }) {
  const { loginUser } = useContext(DatabaseContext);
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loginUser(usuario, senha)) {
      onLogin();
    } else {
      setErro('Usuário ou senha incorretos.');
    }
  };


  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80svh',
      padding: '16px',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div className="card" style={{
        maxWidth: '400px',
        width: '100%',
        padding: '32px 24px',
        textAlign: 'center',
        boxShadow: 'var(--shadow-lg)'
      }}>
        
        {/* Ícone e Cabeçalho */}
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'var(--primary-light)',
          color: 'var(--primary)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px'
        }}>
          <Shield size={32} />
        </div>
        
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '6px' }}>Área do Vendedor</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
          Identifique-se para acessar o controle de vendas, estoque e relatórios.
        </p>

        {erro && (
          <div className="badge badge-danger" style={{ 
            display: 'block', 
            textAlign: 'center', 
            padding: '8px 12px', 
            borderRadius: 'var(--radius-sm)',
            marginBottom: '16px',
            textTransform: 'none',
            fontSize: '13px'
          }}>
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="form-group">
            <label className="form-label">Usuário</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <User size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-input w-full" 
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Digite seu usuário"
                required
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Key size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                className="form-input w-full" 
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="•••"
                required
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full" style={{ padding: '12px', fontSize: '15px', marginTop: '8px' }}>
            Entrar no Painel
          </button>
        </form>


      </div>
    </div>
  );
}
