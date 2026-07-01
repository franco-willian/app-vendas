import React, { useContext, useState } from "react";
import { DatabaseContext } from "../context/DatabaseContext";
import { Plus, Search, Share2, Clipboard, Edit2, Trash2, X, UploadCloud } from "lucide-react";
import { toast } from 'react-hot-toast';
import { useConfirm } from '../context/ConfirmContext';

const UNSPLASH_IMAGES = [
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=80", // Tenis vermelho
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80", // Relogio
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&q=80", // Headphone
  "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&q=80", // Oculos
  "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300&q=80", // Secador/Cabelo
];

export default function Produtos() {
  const { confirm } = useConfirm();
  const { produtos, addProduto, updateProduto, deleteProduto, currentUser } =
    useContext(DatabaseContext);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  // Form State
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [precoFiado, setPrecoFiado] = useState("");
  const [custo, setCusto] = useState("");
  const [estoque, setEstoque] = useState("");
  const [descricao, setDescricao] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");

  // Verifica se o usuário logado tem permissão administrativa
  const isAdmin = currentUser && (currentUser.tipo === "admin-vendedor" || currentUser.tipo === "admin" || currentUser.tipo === "gerente");

  const handleOpenAddModal = () => {
    setNome("");
    setPreco("");
    setPrecoFiado("");
    setCusto("");
    setEstoque("");
    setDescricao("");
    const randomImg =
      UNSPLASH_IMAGES[Math.floor(Math.random() * UNSPLASH_IMAGES.length)];
    setFotoUrl(randomImg);
    setIsEditMode(false);
    setEditId(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p) => {
    setNome(p.nome);
    setPreco(p.preco);
    setPrecoFiado(p.precoFiado || "");
    setCusto(p.custo || "");
    setEstoque(p.estoque);
    setDescricao(p.descricao || "");
    setFotoUrl(p.fotoUrl);
    setIsEditMode(true);
    setEditId(p.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (await confirm({ title: "Excluir Produto", message: `Tem certeza que deseja excluir o produto "${name}"?` })) {
      deleteProduto(id);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nome || !preco || !estoque) {
      toast.error("Por favor, preencha todos os campos obrigatórios (*).");
      return;
    }

    const prodData = {
      nome,
      preco: parseFloat(preco),
      precoFiado: precoFiado ? parseFloat(precoFiado) : null,
      custo: custo ? parseFloat(custo) : 0,
      estoque: parseInt(estoque),
      descricao,
      fotoUrl:
        fotoUrl ||
        "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=300&q=80",
    };

    if (isEditMode && editId) {
      updateProduto(editId, prodData);
      toast.success("Produto atualizado com sucesso!");
    } else {
      addProduto(prodData);
      toast.success("Produto cadastrado com sucesso!");
    }

    // Reset Form
    setNome("");
    setPreco("");
    setPrecoFiado("");
    setCusto("");
    setEstoque("");
    setDescricao("");
    setFotoUrl("");
    setIsModalOpen(false);
  };

  const handleShare = async (produto) => {
    const shareText = `*${produto.nome}*\n💰 Apenas *R$ ${produto.preco.toFixed(2)}*\n\n${produto.descricao || ""}\n\nGaranta já o seu! Compre online pelo link do nosso sistema ou fale comigo.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: produto.nome,
          text: shareText,
        });
      } catch (err) {
        console.log("Erro ao compartilhar", err);
      }
    } else {
      // Fallback
      navigator.clipboard.writeText(shareText);
      toast.success("Texto de divulgação copiado para a área de transferência!");
    }
  };

  const handleShareWhatsApp = (produto) => {
    const shareText = encodeURIComponent(
      `*${produto.nome}*\n💰 Apenas *R$ ${produto.preco.toFixed(2)}*\n\n${produto.descricao || ""}\n\nGaranta já o seu! Fale comigo ou peça pelo nosso catálogo online.`,
    );
    window.open(`https://api.whatsapp.com/send?text=${shareText}`, "_blank");
  };

  const filteredProdutos = produtos.filter((p) =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div style={{ animation: "fadeIn 0.3s ease-out", textAlign: "left" }}>
      <div
        className="flex-between mb-24"
        style={{ flexWrap: "wrap", gap: "16px" }}
      >
        <div>
          <h2 style={{ fontSize: "28px", margin: 0 }}>Catálogo de Produtos</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Gerencie o estoque central de produtos e divulgue nas redes sociais.
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={18} /> Novo Produto
          </button>
        )}
      </div>

      {/* Barra de Pesquisa */}
      <div className="card mb-24" style={{ padding: "12px" }}>
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "12px",
              color: "var(--text-muted)",
            }}
          />
          <input
            type="text"
            className="form-input w-full"
            placeholder="Buscar produto por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: "40px" }}
          />
        </div>
      </div>

      {/* Grid de Produtos */}
      {filteredProdutos.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "48px 0",
            color: "var(--text-muted)",
          }}
        >
          Nenhum produto cadastrado ou encontrado.
        </div>
      ) : (
        <div className="grid-responsive">
          {filteredProdutos.map((p) => (
            <div
              className="card"
              key={p.id}
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              {/* Opções administrativas sobre a imagem */}
              <div
                style={{
                  position: "relative",
                  margin: "-20px -20px 16px -20px",
                  height: "160px",
                  overflow: "hidden",
                }}
              >
                <img
                  src={p.fotoUrl}
                  alt={p.nome}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />

                {/* Badge estoque */}
                <div
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    background:
                      p.estoque > 0 ? "var(--success)" : "var(--danger)",
                    color: "white",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: "999px",
                  }}
                >
                  {p.estoque > 0 ? `${p.estoque} un` : "Esgotado"}
                </div>

                {/* Botões administrativos (Edição/Exclusão) */}
                {isAdmin && (
                  <div
                    style={{
                      position: "absolute",
                      top: "12px",
                      left: "12px",
                      display: "flex",
                      gap: "6px",
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon"
                      onClick={() => handleOpenEditModal(p)}
                      style={{
                        background: "var(--success)",
                        color: "white",
                        width: "32px",
                        height: "32px",
                        padding: 0,
                      }}
                      title="Editar produto"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-icon"
                      onClick={() => handleDelete(p.id, p.nome)}
                      style={{ width: "32px", height: "32px", padding: 0 }}
                      title="Excluir produto"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <h3 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>
                  {p.nome}
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--text-secondary)",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    height: "42px",
                  }}
                >
                  {p.descricao || "Sem descrição cadastrada."}
                </p>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "var(--primary)",
                    marginTop: "auto",
                  }}
                >
                  R$ {p.preco.toFixed(2)}
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      marginTop: "4px",
                    }}
                  >
                    {p.precoFiado ? (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--warning)",
                          fontWeight: 600,
                          background: "rgba(245, 158, 11, 0.1)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        Fiado: R$ {p.precoFiado.toFixed(2)}
                      </span>
                    ) : null}
                    {p.custo ? (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--text-muted)",
                          fontWeight: 600,
                          background: "var(--border)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        Custo: R$ {p.custo.toFixed(2)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Botões de Divulgação */}
              <div
                className="flex-between mt-16"
                style={{
                  borderTop: "1px solid var(--border)",
                  paddingTop: "12px",
                  gap: "8px",
                }}
              >
                <button
                  className="btn btn-secondary w-full"
                  onClick={() => handleShareWhatsApp(p)}
                  style={{ fontSize: "13px", padding: "8px" }}
                >
                  <Share2 size={14} /> Whatsapp
                </button>
                <button
                  className="btn btn-secondary btn-icon"
                  onClick={() => handleShare(p)}
                  title="Compartilhar Link/Texto"
                >
                  <Clipboard size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Cadastro/Edição de Produto */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header flex-between">
              <h3 style={{ fontSize: "18px", margin: 0 }}>
                {isEditMode
                  ? `Editar Produto: ${nome}`
                  : "Adicionar Novo Produto"}
              </h3>
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                style={{ width: "32px", height: "32px", padding: 0 }}
                onClick={() => setIsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nome do Produto *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Tênis Runner Pro"
                    required
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">Preço de Venda (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={preco}
                      onChange={(e) => setPreco(e.target.value)}
                      placeholder="59.90"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label
                      className="form-label"
                      style={{ color: "var(--warning)" }}
                    >
                      Preço Fiado (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={precoFiado}
                      onChange={(e) => setPrecoFiado(e.target.value)}
                      placeholder="Opcional"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Preço de Custo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={custo}
                      onChange={(e) => setCusto(e.target.value)}
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Estoque Central *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={estoque}
                    onChange={(e) => setEstoque(e.target.value)}
                    placeholder="10"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Descrição do Produto</label>
                  <textarea
                    className="form-input"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Escreva detalhes sobre o produto..."
                    style={{ minHeight: "80px", resize: "vertical" }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Imagem do Produto (Galeria / Câmera)
                  </label>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    <label 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        background: 'var(--bg-card)',
                        border: '1px dashed var(--border)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        transition: '0.2s',
                      }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <UploadCloud size={20} />
                      <span style={{ fontWeight: 500 }}>Escolher arquivo ou tirar foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                    <div
                      style={{
                        textAlign: "center",
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      ou insira uma URL da imagem abaixo:
                    </div>
                    <input
                      type="text"
                      className="form-input"
                      value={fotoUrl}
                      onChange={(e) => setFotoUrl(e.target.value)}
                      placeholder="https://exemplo.com/foto.jpg"
                    />
                  </div>
                  {fotoUrl && (
                    <div style={{ marginTop: "12px", textAlign: "center" }}>
                      <img
                        src={fotoUrl}
                        alt="Preview"
                        style={{
                          width: "80px",
                          height: "80px",
                          objectFit: "cover",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                        }}
                      />
                    </div>
                  )}
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
                  {isEditMode ? "Salvar Alterações" : "Cadastrar Produto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
