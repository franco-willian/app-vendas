import React, { useContext, useState } from "react";
import { DatabaseContext } from "../context/DatabaseContext";
import { Plus, Trash2, Shield, User, Edit } from "lucide-react";

export default function Usuarios() {
  const { usuarios, addUsuario, updateUsuario, deleteUsuario, currentUser } =
    useContext(DatabaseContext);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [nome, setNome] = useState("");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [tipo, setTipo] = useState("vendedor"); // 'vendedor' ou 'admin-vendedor'

  const [editingUserId, setEditingUserId] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nome || !usuario || (!senha && !editingUserId)) {
      alert("Por favor, preencha todos os campos obrigatórios (*).");
      return;
    }

    if (editingUserId) {
      // Verificar se usuário já existe e não é o mesmo que está sendo editado
      const usernameTaken = usuarios.some(
        (u) =>
          u.usuario.toLowerCase() === usuario.toLowerCase() &&
          u.id !== editingUserId,
      );
      if (usernameTaken) {
        alert("Este nome de usuário já está sendo utilizado.");
        return;
      }

      const updatedData = { nome, usuario, tipo };
      if (senha) updatedData.senha = senha;

      updateUsuario(editingUserId, updatedData);
      alert("Usuário atualizado com sucesso!");
    } else {
      // Verificar se usuário já existe
      const usernameTaken = usuarios.some(
        (u) => u.usuario.toLowerCase() === usuario.toLowerCase(),
      );
      if (usernameTaken) {
        alert("Este nome de usuário já está sendo utilizado.");
        return;
      }

      addUsuario({ nome, usuario, senha, tipo });
      alert("Usuário adicionado com sucesso!");
    }

    // Reset Form
    setNome("");
    setUsuario("");
    setSenha("");
    setTipo("vendedor");
    setEditingUserId(null);
    setIsModalOpen(false);
  };

  const handleEditClick = (u) => {
    setEditingUserId(u.id);
    setNome(u.nome);
    setUsuario(u.usuario);
    setSenha(""); // Deixe a senha em branco para não sobreescrever acidentalmente, a menos que seja preenchida
    setTipo(u.tipo);
    setIsModalOpen(true);
  };

  const handleDelete = (id, name) => {
    if (id === currentUser.id) {
      alert(
        "Você não pode excluir sua própria conta enquanto estiver conectado.",
      );
      return;
    }
    if (window.confirm(`Deseja excluir o usuário "${name}"?`)) {
      deleteUsuario(id);
    }
  };

  // Se não for admin, não permite visualizar
  const isAdmin =
    currentUser &&
    (currentUser.tipo === "admin-vendedor" ||
      currentUser.tipo === "gerente" ||
      currentUser.tipo === "admin");
  if (!isAdmin) {
    return (
      <div
        className="card text-center"
        style={{ padding: "40px 20px", color: "var(--danger)" }}
      >
        Acesso Negado: Apenas administradores do sistema podem gerenciar
        usuários.
      </div>
    );
  }

  return (
    <div
      style={{
        animation: "fadeIn 0.3s ease-out",
        textAlign: "left",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      <div
        className="flex-between mb-24"
        style={{ flexWrap: "wrap", gap: "16px" }}
      >
        <div>
          <h2 style={{ fontSize: "28px", margin: 0 }}>Gerenciar Usuários</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Cadastre novos vendedores e administradores para acessar o painel.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingUserId(null);
            setNome("");
            setUsuario("");
            setSenha("");
            setTipo("vendedor");
            setIsModalOpen(true);
          }}
        >
          <Plus size={18} /> Novo Usuário
        </button>
      </div>

      {/* Lista de Usuários */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {usuarios.map((u) => (
          <div
            className="card"
            key={u.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              padding: "16px 20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background:
                    u.tipo === "admin-vendedor" ||
                    u.tipo === "gerente" ||
                    u.tipo === "admin"
                      ? "var(--primary-light)"
                      : "var(--success-light)",
                  color:
                    u.tipo === "admin-vendedor" ||
                    u.tipo === "gerente" ||
                    u.tipo === "admin"
                      ? "var(--primary)"
                      : "var(--success)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {u.tipo === "admin-vendedor" ||
                u.tipo === "gerente" ||
                u.tipo === "admin" ? (
                  <Shield size={20} />
                ) : (
                  <User size={20} />
                )}
              </div>

              <div>
                <strong style={{ fontSize: "16px" }}>{u.nome}</strong>
                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "2px",
                  }}
                >
                  <span>Usuário: {u.usuario}</span>
                  <span>•</span>
                  <span
                    className={`badge ${u.tipo === "admin-vendedor" || u.tipo === "gerente" || u.tipo === "admin" ? "badge-primary" : "badge-success"}`}
                    style={{ fontSize: "9px", padding: "2px 6px" }}
                  >
                    {u.tipo === "admin-vendedor" ||
                    u.tipo === "gerente" ||
                    u.tipo === "admin"
                      ? "Gerente"
                      : "Vendedor"}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn btn-secondary btn-icon"
                onClick={() => handleEditClick(u)}
                style={{ width: "36px", height: "36px", padding: 0 }}
                title="Editar usuário"
              >
                <Edit size={16} style={{ color: "var(--primary)" }} />
              </button>

              {u.id !== "1" && (
                <button
                  className="btn btn-secondary btn-icon"
                  onClick={() => handleDelete(u.id, u.nome)}
                  style={{ width: "36px", height: "36px", padding: 0 }}
                  title="Excluir usuário"
                >
                  <Trash2 size={16} style={{ color: "var(--danger)" }} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Adicionar Usuário */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "400px" }}>
            <div className="modal-header flex-between">
              <h3 style={{ fontSize: "18px", margin: 0 }}>
                {editingUserId ? "Editar Usuário" : "Criar Novo Usuário"}
              </h3>
              <button
                className="btn btn-secondary btn-icon"
                style={{ padding: "4px" }}
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div
                className="modal-body"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nome Completo *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Carlos Vendedor"
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Nome de Usuário (Login) *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    placeholder="carlos"
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Senha{" "}
                    {editingUserId
                      ? "(Deixe em branco para manter a atual)"
                      : "*"}
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Senha de acesso"
                    required={!editingUserId}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tipo de Permissão</label>
                  <select
                    className="form-input w-full"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                  >
                    <option value="vendedor">
                      Vendedor (Apenas vendas e carga de rua)
                    </option>
                    <option value="admin-vendedor">
                      Gerente (Controle total de produtos e usuários)
                    </option>
                    <option value="admin">
                      Admin (Acesso Total + Zerar Sistema)
                    </option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingUserId ? "Salvar Alterações" : "Adicionar Usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
