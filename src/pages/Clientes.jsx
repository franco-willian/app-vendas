import React, { useContext, useState } from 'react';
import { DatabaseContext } from '../context/DatabaseContext';
import { Plus, Search, MessageSquare, Mail, User, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../context/ConfirmContext';

export default function Clientes() {
  const { confirm } = useConfirm();
  const { clientes, addCliente, updateCliente, deleteCliente } = useContext(DatabaseContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  // Form State
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nome || !whatsapp) {
      toast.success("Por favor, preencha o Nome e o WhatsApp.");
      return;
    }

    if (editingClient) {
      updateCliente(editingClient.id, { nome, whatsapp, email });
      toast.success("Cliente atualizado com sucesso!");
    } else {
      addCliente({ nome, whatsapp, email });
      toast.success("Cliente cadastrado com sucesso!");
    }

    // Reset
    handleCloseModal();
  };

  const handleEditClick = (client) => {
    setEditingClient(client);
    setNome(client.nome);
    setWhatsapp(client.whatsapp);
    setEmail(client.email || '');
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id, clientNome) => {
    if (await confirm({ title: "Excluir Cliente", message: `Tem certeza que deseja excluir o cliente "${clientNome}"?` })) {
      deleteCliente(id);
      toast.success("Cliente excluído com sucesso!");
    }
  };

  const handleCloseModal = () => {
    setNome('');
    setWhatsapp('');
    setEmail('');
    setEditingClient(null);
    setIsModalOpen(false);
  };

  const handleOpenWhatsApp = (whatsapp) => {
    // Abre conversa direta no WhatsApp
    const number = whatsapp.replace(/\D/g, ''); // apenas numeros
    window.open(`https://wa.me/55${number}`, '_blank');
  };

  const filteredClientes = clientes.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.whatsapp.includes(searchTerm)
  );

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', textAlign: 'left' }}>
      <div className="flex-between mb-24" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '28px', margin: 0 }}>Cadastro de Clientes</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Gerencie os dados dos clientes para faturamento e cobrança de vendas.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Novo Cliente
        </button>
      </div>

      {/* Barra de Busca */}
      <div className="card mb-24" style={{ padding: '12px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-input w-full"
            placeholder="Buscar por nome ou WhatsApp..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>
      </div>

      {/* Grid/Lista de Clientes */}
      {filteredClientes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
          Nenhum cliente cadastrado ou encontrado.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredClientes.map(c => (
            <div className="card" key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '50%', 
                  background: 'var(--primary-light)', 
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <User size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>{c.nome}</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '4px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MessageSquare size={14} /> {c.whatsapp}
                    </span>
                    {c.email && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Mail size={14} /> {c.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleOpenWhatsApp(c.whatsapp)}
                  style={{ padding: '8px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <MessageSquare size={14} style={{ color: 'var(--success)' }} /> Enviar
                </button>
                <button 
                  className="btn btn-secondary btn-icon" 
                  onClick={() => handleEditClick(c)}
                  style={{ width: '36px', height: '36px', padding: 0 }}
                  title="Editar cliente"
                >
                  <Edit2 size={14} style={{ color: 'var(--primary)' }} />
                </button>
                <button 
                  className="btn btn-secondary btn-icon" 
                  onClick={() => handleDeleteClick(c.id, c.nome)}
                  style={{ width: '36px', height: '36px', padding: 0 }}
                  title="Excluir cliente"
                >
                  <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Cadastro de Cliente */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header flex-between">
              <h3 style={{ fontSize: '18px', margin: 0 }}>{editingClient ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}</h3>
              <button className="btn btn-secondary btn-icon" style={{ padding: '4px' }} onClick={handleCloseModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nome Completo *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: João da Silva" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">WhatsApp (com DDD) *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="Ex: 11999998888" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">E-mail (Opcional)</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="joao@email.com" 
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
