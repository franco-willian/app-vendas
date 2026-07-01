import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const INITIAL_PRODUCTS = [
  { id: '1', nome: 'Camiseta Classic', preco: 59.90, estoque: 45, descricao: 'Camiseta 100% algodão, confortável e moderna.', fotoUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&q=80' },
  { id: '2', nome: 'Boné Streetwear', preco: 39.90, estoque: 25, descricao: 'Boné aba curva ajustável de alta qualidade.', fotoUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=300&q=80' },
  { id: '3', nome: 'Garrafa Térmica Sport', preco: 89.90, estoque: 15, descricao: 'Mantém a sua bebida gelada por até 24 horas.', fotoUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&q=80' },
  { id: '4', nome: 'Óculos de Sol Sunset', preco: 129.90, estoque: 10, descricao: 'Lentes polarizadas com proteção UV400.', fotoUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=300&q=80' },
  { id: '5', nome: 'Gourmet Brownie', preco: 8.50, estoque: 120, descricao: 'Brownie artesanal com muito chocolate belga.', fotoUrl: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=300&q=80' }
];

const INITIAL_CLIENTS = [
  { id: '1', nome: 'Maria Silva', whatsapp: '11999998888', email: 'maria@email.com' },
  { id: '2', nome: 'João Santos', whatsapp: '11988887777', email: 'joao@email.com' },
  { id: '3', nome: 'Ana Costa', whatsapp: '11977776666', email: 'ana@email.com' }
];

const INITIAL_USERS = [
  { id: '1', usuario: 'admin', nome: 'Gerente', tipo: 'admin-vendedor', senha: '123' },
  { id: '2', usuario: 'vendedor', nome: 'Carlos Vendedor', tipo: 'vendedor', senha: '123' }
];

// Helper to read database
const readDB = () => {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      produtos: INITIAL_PRODUCTS,
      clientes: INITIAL_CLIENTS,
      vendas: [],
      despesas: [],
      usuarios: INITIAL_USERS,
      activeCarga: null,
      activeCargas: {},
      configuracoes: { 
        gerenteWhatsApp: '', 
        callMeBotApiKey: '',
        mercadoPagoAccessToken: '',
        notifyCargaStart: true,
        notifyCargaReturn: true,
        notifyVendas: true,
        notifyEstoqueRetornado: true
      },
      pedidosOnline: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }
  
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (!parsed.activeCargas) parsed.activeCargas = {};
    if (!parsed.configuracoes) {
      parsed.configuracoes = { 
        gerenteWhatsApp: '', 
        callMeBotApiKey: '',
        mercadoPagoAccessToken: '',
        notifyCargaStart: true,
        notifyCargaReturn: true,
        notifyVendas: true,
        notifyEstoqueRetornado: true
      };
    } else {
      if (parsed.configuracoes.mercadoPagoAccessToken === undefined) parsed.configuracoes.mercadoPagoAccessToken = '';
      if (parsed.configuracoes.notifyCargaStart === undefined) parsed.configuracoes.notifyCargaStart = true;
      if (parsed.configuracoes.notifyCargaReturn === undefined) parsed.configuracoes.notifyCargaReturn = true;
      if (parsed.configuracoes.notifyVendas === undefined) parsed.configuracoes.notifyVendas = true;
      if (parsed.configuracoes.notifyEstoqueRetornado === undefined) parsed.configuracoes.notifyEstoqueRetornado = true;
    }
    
    // Auto-update legacy Admin Vendedor to Gerente name
    if (parsed.usuarios) {
      parsed.usuarios = parsed.usuarios.map(u => {
        if (u.id === '1' && u.nome === 'Admin Vendedor') {
          return { ...u, nome: 'Gerente' };
        }
        return u;
      });
    }
    // Auto-update legacy Admin Vendedor in vendas
    if (parsed.vendas) {
      parsed.vendas = parsed.vendas.map(v => {
        if (v.vendedor === 'Admin Vendedor') {
          return { ...v, vendedor: 'Gerente' };
        }
        return v;
      });
    }

    return parsed;
  } catch (err) {
    console.error("Error reading database file, returning default:", err);
    return { produtos: [], clientes: [], vendas: [], usuarios: [], activeCarga: null, activeCargas: {}, configuracoes: { gerenteWhatsApp: '', callMeBotApiKey: '', mercadoPagoAccessToken: '', notifyCargaStart: true, notifyCargaReturn: true, notifyVendas: true, notifyEstoqueRetornado: true }, pedidosOnline: [] };
  }
};

// Helper to write database
const writeDB = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
};

let messageQueue = [];
let isProcessingQueue = false;

const executeWhatsAppAlert = async (config, phone, message) => {
  if (!phone) return;

  const body = JSON.stringify({ to: phone, message: message });

  try {
    const res = await fetch('http://localhost:3002/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: body
    });
    const data = await res.json();
    console.log(`[WhatsApp Alert - Local] Response to ${phone}:`, data);
  } catch (err) {
    console.error(`[WhatsApp Alert Error - Local] Failed to send to ${phone}:`, err.message);
  }
};

const processQueue = () => {
  if (messageQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }
  isProcessingQueue = true;
  const { config, phone, message } = messageQueue.shift();
  
  executeWhatsAppAlert(config, phone, message);

  setTimeout(processQueue, 10000); // 10 seconds delay
};

const queueWhatsAppAlert = (config, phone, message) => {
  if (!phone) return;
  messageQueue.push({ config, phone, message });
  if (!isProcessingQueue) {
    processQueue();
  }
};

const routeAndQueueEvent = (db, eventType, message, context = {}) => {
  const config = db.configuracoes || {};
  
  const destDonuts = config.grupoDonuts;
  const destBolo = config.grupoBolo;
  const destBrownie = config.grupoBrownie;
  const destCaixa = config.grupoCaixa;
  const destLoja = config.grupoLojaOnline;

  let targets = new Set();

  if (eventType === 'VENDA' && context.itens) {
    let hasDonuts = false;
    let hasBolo = false;
    let hasBrownie = false;

    context.itens.forEach(item => {
      let nome = (item.nome || '').toLowerCase();
      if (!nome && item.produtoId) {
        const prod = db.produtos.find(p => p.id === item.produtoId);
        if (prod) nome = prod.nome.toLowerCase();
      }
      if (nome.includes('donuts')) hasDonuts = true;
      if (nome.includes('bolo')) hasBolo = true;
      if (nome.includes('brownie')) hasBrownie = true;
    });

    if (hasDonuts && destDonuts) targets.add(destDonuts);
    if (hasBolo && destBolo) targets.add(destBolo);
    if (hasBrownie && destBrownie) targets.add(destBrownie);

  } else if (eventType === 'CAIXA' || eventType === 'CARGA') {
    if (destCaixa) targets.add(destCaixa);
  } else if (eventType === 'LOJA') {
    if (destLoja) targets.add(destLoja);
  }

  // Se for teste manual de rota
  if (eventType === 'TEST') {
    if (context.phone) targets.add(context.phone);
  }

  // Disparar para todos os alvos identificados
  targets.forEach(phone => {
    queueWhatsAppAlert(config, phone, message);
  });
};

// Placeholder for old sendWhatsAppAlert compatibility, mapping to 'CAIXA' mostly if not known.
const sendWhatsAppAlert = (db, message, eventType = 'CAIXA', context = {}) => {
  routeAndQueueEvent(db, eventType, message, context);
};

// --- API ENDPOINTS ---

// Get all data
app.get('/api/data', (req, res) => {
  const db = readDB();
  res.json(db);
});

// Products CRUD
app.post('/api/produtos', (req, res) => {
  const db = readDB();
  const newProduct = {
    ...req.body,
    id: Date.now().toString(),
    preco: parseFloat(req.body.preco) || 0,
    precoFiado: req.body.precoFiado ? parseFloat(req.body.precoFiado) : null,
    custo: parseFloat(req.body.custo) || 0,
    estoque: parseInt(req.body.estoque) || 0
  };
  db.produtos.unshift(newProduct);
  writeDB(db);
  res.json(newProduct);
});

app.put('/api/produtos/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;
  db.produtos = db.produtos.map(p => {
    if (p.id === id) {
      return {
        ...p,
        ...req.body,
        preco: parseFloat(req.body.preco) || 0,
        precoFiado: req.body.precoFiado !== undefined ? (req.body.precoFiado ? parseFloat(req.body.precoFiado) : null) : p.precoFiado,
        custo: req.body.custo !== undefined ? parseFloat(req.body.custo) || 0 : p.custo,
        estoque: parseInt(req.body.estoque) || 0
      };
    }
    return p;
  });
  writeDB(db);
  res.json({ success: true });
});

app.delete('/api/produtos/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;
  db.produtos = db.produtos.filter(p => p.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// Clients CRUD
app.post('/api/clientes', (req, res) => {
  const db = readDB();
  const newClient = {
    ...req.body,
    id: Date.now().toString()
  };
  db.clientes.unshift(newClient);
  writeDB(db);
  res.json(newClient);
});

app.put('/api/clientes/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;
  db.clientes = db.clientes.map(c => {
    if (c.id === id) {
      return {
        ...c,
        ...req.body
      };
    }
    return c;
  });
  writeDB(db);
  res.json({ success: true });
});

app.delete('/api/clientes/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;
  db.clientes = db.clientes.filter(c => c.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// Despesas CRUD
app.post('/api/despesas', (req, res) => {
  const db = readDB();
  const novaDespesa = {
    ...req.body,
    id: Date.now().toString(),
    valor: parseFloat(req.body.valor) || 0,
    data: req.body.data || new Date().toISOString()
  };
  if (!db.despesas) db.despesas = [];
  db.despesas.unshift(novaDespesa);
  writeDB(db);
  res.json(novaDespesa);
});

app.put('/api/despesas/:id', (req, res) => {
  const db = readDB();
  const id = req.params.id;
  if (!db.despesas) db.despesas = [];
  
  const index = db.despesas.findIndex(d => d.id === id);
  if (index !== -1) {
    db.despesas[index] = { ...db.despesas[index], ...req.body };
    writeDB(db);
    res.json(db.despesas[index]);
  } else {
    res.status(404).json({ error: "Despesa não encontrada" });
  }
});

app.delete('/api/despesas/:id', (req, res) => {
  const db = readDB();
  const id = req.params.id;
  if (!db.despesas) db.despesas = [];
  db.despesas = db.despesas.filter(d => d.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// Usuários CRUD
app.post('/api/usuarios', (req, res) => {
  const db = readDB();
  const newUser = {
    ...req.body,
    id: Date.now().toString()
  };
  db.usuarios.push(newUser);
  writeDB(db);
  res.json(newUser);
});

app.put('/api/usuarios/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;
  db.usuarios = db.usuarios.map(u => {
    if (u.id === id) {
      return {
        ...u,
        ...req.body
      };
    }
    return u;
  });
  writeDB(db);
  res.json({ success: true });
});

app.delete('/api/usuarios/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;
  db.usuarios = db.usuarios.filter(u => u.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// Salvar Configurações de Notificação
app.post('/api/configuracoes', (req, res) => {
  const db = readDB();
  db.configuracoes = req.body;
  writeDB(db);
  res.json({ success: true });
});

// Proxy para Microsserviço WhatsApp
app.get('/api/whatsapp/status', async (req, res) => {
  try {
    const response = await fetch('http://localhost:3002/status');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.json({ connected: false, error: 'Microsserviço offline' });
  }
});

app.get('/api/whatsapp/qr', async (req, res) => {
  try {
    const response = await fetch('http://localhost:3002/qr');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.json({ qr: '' });
  }
});

app.get('/api/whatsapp/groups', async (req, res) => {
  try {
    const response = await fetch('http://localhost:3002/groups');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.json({ groups: [] });
  }
});

// Testar Notificação do WhatsApp
app.post('/api/whatsapp/test', (req, res) => {
  const db = readDB();
  const { grupoDonuts, grupoBolo, grupoBrownie, grupoCaixa, grupoLojaOnline } = req.body;
  const tempDB = {
    ...db,
    configuracoes: { grupoDonuts, grupoBolo, grupoBrownie, grupoCaixa, grupoLojaOnline }
  };
  const testMsg = `🔔 *Teste de Conexão do VendaRápida!*\nO sistema de envio Nativo Local está funcionando!`;
  
  if (grupoCaixa) sendWhatsAppAlert(tempDB, testMsg + " (Relatório de Caixa)", 'CAIXA');
  if (grupoLojaOnline) sendWhatsAppAlert(tempDB, testMsg + " (Pedidos Loja Online)", 'LOJA');
  if (grupoDonuts) sendWhatsAppAlert(tempDB, testMsg + " (Vendas Donuts)", 'TEST', { phone: grupoDonuts });
  if (grupoBolo) sendWhatsAppAlert(tempDB, testMsg + " (Vendas Bolo)", 'TEST', { phone: grupoBolo });
  if (grupoBrownie) sendWhatsAppAlert(tempDB, testMsg + " (Vendas Brownie)", 'TEST', { phone: grupoBrownie });

  res.json({ success: true });
});

// Registrar Carga Diária (Start)
app.post('/api/carga/start', (req, res) => {
  const db = readDB();
  
  const hasVendedor = req.body.itensCarga !== undefined;
  const itensCarga = hasVendedor ? req.body.itensCarga : req.body;
  const vendedor = hasVendedor ? req.body.vendedor : 'vendedor';

  const itens = [];

  db.produtos = db.produtos.map(p => {
    const qtySaida = parseInt(itensCarga[p.id]) || 0;
    if (qtySaida > 0) {
      itens.push({
        produtoId: p.id,
        nome: p.nome,
        quantidadeSaida: qtySaida,
        quantidadeVendida: 0,
        quantidadeRetorno: 0
      });
      return { ...p, estoque: Math.max(0, p.estoque - qtySaida) };
    }
    return p;
  });

  const activeCarga = {
    id: Date.now().toString(),
    data: new Date().toISOString(),
    itens,
    status: 'aberto'
  };

  if (!db.activeCargas) db.activeCargas = {};
  db.activeCargas[vendedor] = activeCarga;
  db.activeCarga = activeCarga; // legacy fallback

  writeDB(db);

  // Notificação WhatsApp
  try {
    const config = db.configuracoes || {};
    if (config.notifyCargaStart !== false) {
      const user = db.usuarios.find(u => u.usuario === vendedor);
      const nomeVendedor = user ? user.nome : vendedor;
      const itensList = activeCarga.itens.map(i => `- ${i.nome}: ${i.quantidadeSaida} un`).join('\n');
      const alertMsg = `🚚 *Nova Saída para a Rua!*\n👤 Vendedor: ${vendedor}\n📦 Itens retirados:\n${itensList}`;
      sendWhatsAppAlert(db, alertMsg, 'CARGA');
    }
  } catch (err) {
    console.error("Erro ao enviar notificação de carga start:", err);
  }

  res.json(activeCarga);
});

// Finalizar Carga Diária (Return)
app.post('/api/carga/return', (req, res) => {
  const db = readDB();
  
  const hasVendedor = req.body.itensRetorno !== undefined;
  const itensRetorno = hasVendedor ? req.body.itensRetorno : req.body;
  const vendedor = hasVendedor ? req.body.vendedor : 'vendedor';

  if (!db.activeCargas) db.activeCargas = {};
  const sellerCarga = db.activeCargas[vendedor] || db.activeCarga;
  
  if (!sellerCarga) {
    return res.status(400).json({ error: "Nenhuma carga diária ativa para este vendedor." });
  }

  // Devolver sobras ao estoque central
  db.produtos = db.produtos.map(p => {
    const qtyRetorno = parseInt(itensRetorno[p.id]) || 0;
    if (qtyRetorno > 0) {
      return { ...p, estoque: p.estoque + qtyRetorno };
    }
    return p;
  });

  delete db.activeCargas[vendedor];
  
  if (db.activeCarga && db.activeCarga.id === sellerCarga.id) {
    db.activeCarga = null; // reset legacy fallback if it matches
  }

  // Notificação WhatsApp
  try {
    const config = db.configuracoes || {};
    const notifyReturn = config.notifyCargaReturn !== false;
    const notifyEstoque = config.notifyEstoqueRetornado !== false;

    if (notifyReturn || notifyEstoque) {
      const user = db.usuarios.find(u => u.usuario === vendedor);
      const nomeVendedor = user ? user.nome : vendedor;
      
      let alertMsg = `💰 *Fechamento de Caixa!*\n👤 Vendedor: ${nomeVendedor}\n`;
      
      if (notifyReturn) {
        console.log("=== DEBUG FECHAMENTO CARGA ===");
        console.log("vendedor username:", vendedor, "nomeVendedor:", nomeVendedor);
        console.log("sellerCarga.data:", sellerCarga.data);
        // Calcular valores exatos das vendas feitas durante a carga
        const vendasDaCarga = db.vendas.filter(v => {
          if (v.cargaId && v.cargaId === sellerCarga.id) return true;
          
          const matchVendedor = (v.vendedor === vendedor || v.vendedor === nomeVendedor);
          // Adiciona uma tolerância de 2 minutos para caso a venda e a carga sejam criadas quase juntas
          const cargaDataMinusTolerance = new Date(new Date(sellerCarga.data).getTime() - 2 * 60000);
          const matchData = new Date(v.data) >= cargaDataMinusTolerance;
          
          return matchVendedor && matchData;
        });
        
        let totalGeral = 0;
        let totalDescontosGlobais = 0;
        const totalPorForma = { Pix: 0, Dinheiro: 0, Cartão: 0, Fiado: 0 };
        const statsProduto = {};
        
        vendasDaCarga.forEach(venda => {
          const forma = venda.formaPagamento || 'Outros';
          totalGeral += venda.total;
          
          const descVenda = parseFloat(venda.desconto) || 0;
          totalDescontosGlobais += descVenda;
          const somaItens = venda.itens.reduce((acc, it) => acc + (it.quantidade * it.precoUnitario), 0);
          
          if (totalPorForma[forma] !== undefined) {
             totalPorForma[forma] += venda.total;
          } else {
             totalPorForma[forma] = venda.total;
          }
          
          venda.itens.forEach(it => {
            if (!statsProduto[it.produtoId]) {
              statsProduto[it.produtoId] = { totalValor: 0, totalDesc: 0, formas: {} };
            }
            const valorBrutoItem = (it.quantidade * it.precoUnitario);
            let descItem = 0;
            if (descVenda > 0 && somaItens > 0) {
               descItem = descVenda * (valorBrutoItem / somaItens);
            }
            const valorLiquidoItem = valorBrutoItem - descItem;

            statsProduto[it.produtoId].totalValor += valorLiquidoItem;
            statsProduto[it.produtoId].totalDesc += descItem;
            
            if (!statsProduto[it.produtoId].formas[forma]) {
               statsProduto[it.produtoId].formas[forma] = { qtd: 0, valor: 0 };
            }
            statsProduto[it.produtoId].formas[forma].qtd += it.quantidade;
            statsProduto[it.produtoId].formas[forma].valor += valorLiquidoItem;
          });
        });

        const summaryList = sellerCarga.itens.map(item => {
          const returned = parseInt(itensRetorno[item.produtoId]) || 0;
          const sold = item.quantidadeVendida;
          const stats = statsProduto[item.produtoId] || { totalValor: 0, totalDesc: 0, formas: {} };
          
          const descStr = stats.totalDesc > 0 ? ` (Teve R$ ${stats.totalDesc.toFixed(2)} de Desconto)` : '';
          let str = `- *${item.nome}*:\n  Saída: ${item.quantidadeSaida} | Retorno: ${returned}\n  Vendas: ${sold} un (R$ ${stats.totalValor.toFixed(2)})${descStr}`;
          
          // Detalhar formas de pagamento
          const formasStr = Object.entries(stats.formas).map(([f, d]) => {
             return `    ↳ ${f}: ${d.qtd} un (R$ ${d.valor.toFixed(2)})`;
          }).join('\n');
          
          if (formasStr) {
             str += `\n${formasStr}`;
          }
          return str;
        }).join('\n\n');
        
        let totaisFormasStr = Object.entries(totalPorForma)
           .filter(([_, val]) => val > 0)
           .map(([f, val]) => `  ↳ ${f}: R$ ${val.toFixed(2)}`)
           .join('\n');
           
        const rodapeDesconto = totalDescontosGlobais > 0 ? `\n🏷️ *Descontos Totais na Carga: R$ ${totalDescontosGlobais.toFixed(2)}*` : '';
        
        let detalhesVendasComDesconto = '';
        const vendasComDesconto = vendasDaCarga.filter(v => (parseFloat(v.desconto) || 0) > 0);
        if (vendasComDesconto.length > 0) {
          detalhesVendasComDesconto = `\n✂️ *Detalhamento de Vendas com Desconto:*\n`;
          vendasComDesconto.forEach(v => {
            const clientObj = db.clientes.find(c => c.id === v.clienteId);
            const clientName = clientObj ? clientObj.nome : 'Cliente Não Identificado';
            
            // Resolve item names gracefully
            const itensList = v.itens.map(i => {
               let n = i.nome;
               if (!n && i.produtoId) {
                  const p = db.produtos.find(prod => prod.id === i.produtoId);
                  if (p) n = p.nome;
               }
               return `  - ${i.quantidade}x ${n || 'Produto'} (R$ ${(i.quantidade * i.precoUnitario).toFixed(2)})`;
            }).join('\n');
            
            const desc = parseFloat(v.desconto).toFixed(2);
            detalhesVendasComDesconto += `👤 Cliente: ${clientName}\n💳 Forma: ${v.formaPagamento}\n💵 Total Pago: R$ ${v.total.toFixed(2)}\n🏷️ Desconto: R$ ${desc}\n📦 Itens:\n${itensList}\n\n`;
          });
        }
        
        alertMsg += `📊 *Resumo da Carga:*\n${summaryList}\n\n💵 *Total Faturado: R$ ${totalGeral.toFixed(2)}*\n${totaisFormasStr}${rodapeDesconto}\n${detalhesVendasComDesconto}`;
      }
      
      if (notifyEstoque) {
        alertMsg += `\n🔄 *Estoque Devolvido & Disponível Central:*\n`;
        const estoqueList = sellerCarga.itens.map(item => {
          const returned = parseInt(itensRetorno[item.produtoId]) || 0;
          const prodObj = db.produtos.find(p => p.id === item.produtoId);
          const totalDisp = prodObj ? prodObj.estoque : 0;
          return `- ${item.nome}: Devolvido: ${returned} un | Total Central: ${totalDisp} un`;
        }).join('\n');
        alertMsg += estoqueList;
      }
      
      sendWhatsAppAlert(db, alertMsg, 'CARGA');
    }
  } catch (err) {
    console.error("Erro ao enviar notificação de fechamento de caixa:", err);
  }

  writeDB(db);
  res.json({ success: true });
});

// Helper to revert stock impact of a sale
const revertVendaStock = (db, venda) => {
  const vendedorUser = db.usuarios.find(u => u.nome === (venda.vendedor || ''));
  const userKey = vendedorUser ? vendedorUser.usuario : 'vendedor';
  if (!db.activeCargas) db.activeCargas = {};
  const sellerCarga = db.activeCargas[userKey];

  if (venda.tipoVenda === 'Rua' && sellerCarga) {
    sellerCarga.itens = sellerCarga.itens.map(item => {
      const itemVendido = (venda.itens || []).find(iv => iv.produtoId === item.produtoId);
      if (itemVendido) {
        return {
          ...item,
          quantidadeVendida: Math.max(0, item.quantidadeVendida - itemVendido.quantidade)
        };
      }
      return item;
    });
    if (db.activeCarga && db.activeCarga.id === sellerCarga.id) {
      db.activeCarga = sellerCarga;
    }
  } else {
    // Return to central stock
    db.produtos = db.produtos.map(p => {
      const itemVendido = (venda.itens || []).find(iv => iv.produtoId === p.id);
      if (itemVendido) {
        return { ...p, estoque: p.estoque + itemVendido.quantidade };
      }
      return p;
    });
  }
};

// Helper to apply stock impact of a sale
const applyVendaStock = (db, venda) => {
  const vendedorUser = db.usuarios.find(u => u.nome === (venda.vendedor || ''));
  const userKey = vendedorUser ? vendedorUser.usuario : 'vendedor';
  if (!db.activeCargas) db.activeCargas = {};
  const sellerCarga = db.activeCargas[userKey];

  if (venda.tipoVenda === 'Rua' && sellerCarga) {
    sellerCarga.itens = sellerCarga.itens.map(item => {
      const itemVendido = (venda.itens || []).find(iv => iv.produtoId === item.produtoId);
      if (itemVendido) {
        return {
          ...item,
          quantidadeVendida: item.quantidadeVendida + itemVendido.quantidade
        };
      }
      return item;
    });
    if (db.activeCarga && db.activeCarga.id === sellerCarga.id) {
      db.activeCarga = sellerCarga;
    }
  } else {
    // Take from central stock
    db.produtos = db.produtos.map(p => {
      const itemVendido = (venda.itens || []).find(iv => iv.produtoId === p.id);
      if (itemVendido) {
        return { ...p, estoque: Math.max(0, p.estoque - itemVendido.quantidade) };
      }
      return p;
    });
  }
};

// Registrar Venda
app.post('/api/vendas', (req, res) => {
  const db = readDB();
  const { clienteId, itens, formaPagamento, dataPagamento, tipoVenda, vendedor, desconto, data } = req.body;

  const total = req.body.total !== undefined ? req.body.total : itens.reduce((acc, item) => acc + (item.quantidade * item.precoUnitario), 0);

  // Encontrar se o vendedor tem carga ativa no momento da venda
  const vendedorUser = db.usuarios.find(u => u.nome === (vendedor || ''));
  const userKey = vendedorUser ? vendedorUser.usuario : 'vendedor';
  const sellerCarga = db.activeCargas ? db.activeCargas[userKey] : null;

  const novaVenda = {
    id: Date.now().toString(),
    clienteId,
    itens,
    formaPagamento,
    dataPagamento,
    statusPagamento: formaPagamento === 'Fiado' ? 'pendente' : 'pago',
    tipoVenda, // 'Rua' ou 'Online'
    total: parseFloat(total),
    desconto: parseFloat(desconto) || 0,
    data: data || new Date().toISOString(),
    synced: true,
    vendedor: vendedor || 'Cliente Online',
    cargaId: (tipoVenda === 'Rua' && sellerCarga) ? sellerCarga.id : null
  };

  db.vendas.unshift(novaVenda);

  // Notificação WhatsApp
  try {
    const config = db.configuracoes || {};
    if (config.notifyVendas !== false) {
      const clientObj = db.clientes.find(c => c.id === clienteId);
      const clientName = clientObj ? clientObj.nome : 'Cliente Não Identificado';
      
      const itensList = itens.map(i => {
         let n = i.nome;
         if (!n && i.produtoId) {
            const p = db.produtos.find(prod => prod.id === i.produtoId);
            if (p) n = p.nome;
         }
         return `- ${n || 'Produto'}: ${i.quantidade}x R$ ${i.precoUnitario.toFixed(2)}`;
      }).join('\n');
      
      const descText = (parseFloat(desconto) || 0) > 0 ? `\n🏷️ Desconto: R$ ${parseFloat(desconto).toFixed(2)}` : '';
      const alertMsg = `🛍️ *Nova Venda Realizada!*\n👤 Vendedor: ${vendedor || 'Cliente Online'}\n📝 Cliente: ${clientName}\n💳 Pagamento: ${formaPagamento}\n🏷️ Tipo: ${tipoVenda}\n💲 Total: R$ ${total.toFixed(2)}${descText}\n📦 Itens:\n${itensList}`;
      sendWhatsAppAlert(db, alertMsg, 'VENDA', { itens });
    }
  } catch (err) {
    console.error("Erro ao enviar notificação de nova venda:", err);
  }

  // Se for venda de rua e tiver carga ativa, atualizar as quantidades vendidas na carga ativa do vendedor
  if (tipoVenda === 'Rua' && sellerCarga) {
    sellerCarga.itens = sellerCarga.itens.map(item => {
      const itemVendido = itens.find(iv => iv.produtoId === item.produtoId);
      if (itemVendido) {
        return {
          ...item,
          quantidadeVendida: item.quantidadeVendida + itemVendido.quantidade
        };
      }
      return item;
    });
    db.activeCarga = sellerCarga; // legacy fallback
  }

  // Se for venda online ou venda sem carga, dá baixa no estoque central
  if (tipoVenda === 'Online' || !sellerCarga) {
    db.produtos = db.produtos.map(p => {
      const itemVendido = itens.find(iv => iv.produtoId === p.id);
      if (itemVendido) {
        return { ...p, estoque: Math.max(0, p.estoque - itemVendido.quantidade) };
      }
      return p;
    });
  }

  writeDB(db);
  res.json(novaVenda);
});

// Endpoint to mark a sale as paid (for Fiado)
app.put('/api/vendas/:id/pay', (req, res) => {
  const db = readDB();
  const { id } = req.params;
  let updatedSale = null;
  db.vendas = db.vendas.map(v => {
    if (String(v.id) === String(id)) {
      updatedSale = { ...v, statusPagamento: 'pago', dataPagamentoRealizado: new Date().toISOString() };
      return updatedSale;
    }
    return v;
  });
  if (updatedSale) {
    writeDB(db);
    res.json(updatedSale);
  } else {
    res.status(404).json({ error: 'Venda não encontrada' });
  }
});

// Editar Venda (PUT)
app.put('/api/vendas/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const vendaIndex = db.vendas.findIndex(v => String(v.id) === String(id));
  if (vendaIndex === -1) {
    return res.status(404).json({ error: 'Venda não encontrada' });
  }
  const oldVenda = db.vendas[vendaIndex];
  
  // Reverter estoque da venda antiga
  revertVendaStock(db, oldVenda);

  const { clienteId, itens, formaPagamento, dataPagamento, tipoVenda, vendedor, statusPagamento, data } = req.body;
  const total = req.body.total !== undefined ? req.body.total : itens.reduce((acc, item) => acc + (item.quantidade * item.precoUnitario), 0);

  const updatedVenda = {
    ...oldVenda,
    clienteId,
    itens,
    formaPagamento,
    dataPagamento,
    statusPagamento: statusPagamento || (formaPagamento === 'Fiado' ? 'pendente' : 'pago'),
    tipoVenda,
    total,
    vendedor: vendedor || oldVenda.vendedor,
    data: data || oldVenda.data,
    synced: true
  };

  // Aplicar estoque da nova venda editada
  applyVendaStock(db, updatedVenda);

  db.vendas[vendaIndex] = updatedVenda;
  writeDB(db);
  res.json(updatedVenda);
});

// Cancelar Venda (DELETE)
app.delete('/api/vendas/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const vendaIndex = db.vendas.findIndex(v => String(v.id) === String(id));
  if (vendaIndex === -1) {
    return res.status(404).json({ error: 'Venda não encontrada' });
  }
  const venda = db.vendas[vendaIndex];

  // Reverter estoque
  revertVendaStock(db, venda);

  db.vendas.splice(vendaIndex, 1);
  writeDB(db);
  res.json({ success: true });
});

// Sincronizar Vendas Offline (Lote)
app.post('/api/sync', (req, res) => {
  const db = readDB();
  const offlineVendas = req.body; // Array de vendas
  
  if (!Array.isArray(offlineVendas)) {
    return res.status(400).json({ error: "Formato de dados inválido." });
  }

  offlineVendas.forEach(venda => {
    // Evitar duplicar venda se já tiver
    if (db.vendas.some(v => v.id === venda.id)) return;

    const total = venda.itens.reduce((acc, item) => acc + (item.quantidade * item.precoUnitario), 0);
    const novaVenda = {
      ...venda,
      total,
      synced: true
    };

    db.vendas.unshift(novaVenda);

    // Notificação WhatsApp
    try {
      const config = db.configuracoes || {};
      if (config.notifyVendas !== false) {
        const clientObj = db.clientes.find(c => c.id === venda.clienteId);
        const clientName = clientObj ? clientObj.nome : 'Cliente Não Identificado';
        const itensList = venda.itens.map(i => `- ${i.nome}: ${i.quantidade}x R$ ${i.precoUnitario.toFixed(2)}`).join('\n');
        const alertMsg = `🛍️ *Nova Venda Realizada (Sincronizada)!*\n👤 Vendedor: ${venda.vendedor || 'Sem Vendedor'}\n📝 Cliente: ${clientName}\n💳 Pagamento: ${venda.formaPagamento}\n🏷️ Tipo: ${venda.tipoVenda}\n💲 Total: R$ ${total.toFixed(2)}\n📦 Itens:\n${itensList}`;
        sendWhatsAppAlert(db, alertMsg, 'VENDA', { itens: venda.itens });
      }
    } catch (err) {
      console.error("Erro ao enviar notificação de venda sincronizada:", err);
    }

    const vendedorUser = db.usuarios.find(u => u.nome === (venda.vendedor || ''));
    const userKey = vendedorUser ? vendedorUser.usuario : 'vendedor';
    if (!db.activeCargas) db.activeCargas = {};
    const sellerCarga = db.activeCargas[userKey];

    // Dar baixa de rua se aplicável
    if (venda.tipoVenda === 'Rua' && sellerCarga) {
      sellerCarga.itens = sellerCarga.itens.map(item => {
        const itemVendido = venda.itens.find(iv => iv.produtoId === item.produtoId);
        if (itemVendido) {
          return {
            ...item,
            quantidadeVendida: item.quantidadeVendida + itemVendido.quantidade
          };
        }
        return item;
      });
      db.activeCarga = sellerCarga; // legacy fallback
    } else {
      // Baixa no estoque central
      db.produtos = db.produtos.map(p => {
        const itemVendido = venda.itens.find(iv => iv.produtoId === p.id);
        if (itemVendido) {
          return { ...p, estoque: Math.max(0, p.estoque - itemVendido.quantidade) };
        }
        return p;
      });
    }
  });

  writeDB(db);
  res.json({ success: true });
});

// Registrar Pedido Online (Vitrine)
app.post('/api/pedidos-online', (req, res) => {
  const db = readDB();
  const { clienteData, itens } = req.body;

  // Criar ou localizar cliente
  let cliente = db.clientes.find(c => c.whatsapp === clienteData.whatsapp);
  if (cliente) {
    if (clienteData.nome) cliente.nome = clienteData.nome;
    if (clienteData.email) cliente.email = clienteData.email;
  } else {
    cliente = {
      id: Date.now().toString(),
      ...clienteData
    };
    db.clientes.unshift(cliente);
  }

  const total = itens.reduce((acc, item) => acc + (item.quantidade * item.preco), 0);
  const novoPedido = {
    id: (Date.now() + 1).toString(),
    clienteId: cliente.id,
    clienteNome: cliente.nome,
    clienteWhatsapp: cliente.whatsapp,
    itens: itens.map(i => ({
      produtoId: i.id,
      nome: i.nome,
      quantidade: i.quantidade,
      precoUnitario: i.preco
    })),
    total,
    data: new Date().toISOString(),
    status: 'pendente'
  };

  db.pedidosOnline.unshift(novoPedido);

  // Notificação WhatsApp
  try {
    const config = db.configuracoes || {};
    if (config.notifyVendas !== false) {
      const itensList = novoPedido.itens.map(i => `- ${i.nome}: ${i.quantidade}x R$ ${i.precoUnitario.toFixed(2)}`).join('\n');
      const alertMsg = `🛒 *Novo Pedido Online Recebido (Pendente)!*\n👤 Cliente: ${novoPedido.clienteNome}\n📱 WhatsApp: ${novoPedido.clienteWhatsapp}\n💵 Total: R$ ${total.toFixed(2)}\n📦 Itens:\n${itensList}`;
      sendWhatsAppAlert(db, alertMsg, 'LOJA', { itens: novoPedido.itens });
    }
  } catch (err) {
    console.error("Erro ao enviar notificação de novo pedido online:", err);
  }

  writeDB(db);
  res.json(novoPedido);
});

// Aprovar Pedido Online
app.post('/api/pedidos-online/approve', (req, res) => {
  const db = readDB();
  const { pedidoId, formaPagamento } = req.body;

  const pedido = db.pedidosOnline.find(p => p.id === pedidoId);
  if (!pedido) {
    return res.status(404).json({ error: "Pedido não localizado." });
  }

  // Registrar como venda
  const total = pedido.itens.reduce((acc, item) => acc + (item.quantidade * item.precoUnitario), 0);
  const novaVenda = {
    id: Date.now().toString(),
    clienteId: pedido.clienteId,
    itens: pedido.itens,
    formaPagamento,
    tipoVenda: 'Online',
    total,
    data: new Date().toISOString(),
    synced: true,
    vendedor: 'Cliente Online'
  };

  db.vendas.unshift(novaVenda);

  // Notificação WhatsApp
  try {
    const config = db.configuracoes || {};
    if (config.notifyVendas !== false) {
      const clientObj = db.clientes.find(c => c.id === pedido.clienteId);
      const clientName = clientObj ? clientObj.nome : pedido.clienteNome;
      const itensList = pedido.itens.map(i => `- ${i.nome}: ${i.quantidade}x R$ ${i.precoUnitario.toFixed(2)}`).join('\n');
      const alertMsg = `✅ *Pedido Online Aprovado!*\n👤 Cliente: ${clientName}\n💳 Pagamento: ${formaPagamento}\n💵 Total: R$ ${total.toFixed(2)}\n📦 Itens:\n${itensList}`;
      sendWhatsAppAlert(db, alertMsg, 'LOJA', { itens: pedido.itens });
    }
  } catch (err) {
    console.error("Erro ao enviar notificação de aprovação de pedido:", err);
  }

  // Dar baixa no estoque central
  db.produtos = db.produtos.map(p => {
    const itemVendido = pedido.itens.find(iv => iv.produtoId === p.id);
    if (itemVendido) {
      return { ...p, estoque: Math.max(0, p.estoque - itemVendido.quantidade) };
    }
    return p;
  });

  // Atualizar status do pedido
  db.pedidosOnline = db.pedidosOnline.map(p => {
    if (p.id === pedidoId) {
      return { ...p, status: 'aprovado' };
    }
    return p;
  });

  writeDB(db);
  res.json({ success: true });
});

// Recusar Pedido Online
app.post('/api/pedidos-online/reject', (req, res) => {
  const db = readDB();
  const { pedidoId } = req.body;

  db.pedidosOnline = db.pedidosOnline.map(p => {
    if (p.id === pedidoId) {
      return { ...p, status: 'recusado' };
    }
    return p;
  });

  writeDB(db);
  res.json({ success: true });
});

// Editar Pedido Online (PUT)
app.put('/api/pedidos-online/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const pedidoIndex = db.pedidosOnline.findIndex(p => p.id === id);
  if (pedidoIndex === -1) {
    return res.status(404).json({ error: 'Pedido online não encontrado' });
  }

  const { itens, total } = req.body;
  const oldPedido = db.pedidosOnline[pedidoIndex];
  
  const updatedPedido = {
    ...oldPedido,
    itens: itens || oldPedido.itens,
    total: total !== undefined ? total : oldPedido.total,
  };

  db.pedidosOnline[pedidoIndex] = updatedPedido;
  writeDB(db);
  res.json(updatedPedido);
});

// Excluir Pedido Online (DELETE)
app.delete('/api/pedidos-online/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const pedidoIndex = db.pedidosOnline.findIndex(p => p.id === id);
  if (pedidoIndex === -1) {
    return res.status(404).json({ error: 'Pedido online não encontrado' });
  }

  db.pedidosOnline.splice(pedidoIndex, 1);
  writeDB(db);
  res.json({ success: true, message: 'Pedido online removido' });
});

// Criar Preferência de Pagamento no Mercado Pago
app.post('/api/payments/create-preference', (req, res) => {
  const db = readDB();
  const { orderId, items, origin, clienteNome, clienteEmail } = req.body;
  const config = db.configuracoes || {};
  const token = config.mercadoPagoAccessToken;

  if (!token) {
    return res.status(400).json({ error: "Token do Mercado Pago não configurado no painel administrativo." });
  }

  const mpItems = items.map(item => ({
    title: item.nome,
    quantity: parseInt(item.quantidade) || 1,
    unit_price: parseFloat(item.precoUnitario || item.preco) || 0,
    currency_id: 'BRL'
  }));

  const back_urls = {
    success: `${origin}/#/loja?payment_status=approved&orderId=${orderId}`,
    failure: `${origin}/#/loja?payment_status=rejected&orderId=${orderId}`,
    pending: `${origin}/#/loja?payment_status=pending&orderId=${orderId}`
  };

  const payload = JSON.stringify({
    items: mpItems,
    payer: {
      name: clienteNome || 'Cliente Loja Online',
      email: clienteEmail || 'cliente@loja.com'
    },
    back_urls,
    auto_return: 'approved',
    external_reference: orderId
  });

  const options = {
    hostname: 'api.mercadopago.com',
    path: '/checkout/preferences',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const reqMP = https.request(options, (resMP) => {
    let data = '';
    resMP.on('data', (chunk) => { data += chunk; });
    resMP.on('end', () => {
      try {
        const response = JSON.parse(data);
        if (response.init_point) {
          // Salvar o preference_id no pedido online correspondente
          db.pedidosOnline = db.pedidosOnline.map(p => {
            if (p.id === orderId) {
              return { ...p, preferenceId: response.id, checkoutUrl: response.init_point };
            }
            return p;
          });
          writeDB(db);
          res.json({ init_point: response.init_point });
        } else {
          console.error("Mercado Pago Preference Error:", response);
          res.status(500).json({ error: "Erro ao gerar preferência no Mercado Pago.", details: response });
        }
      } catch (err) {
        res.status(500).json({ error: "Erro ao processar resposta do Mercado Pago." });
      }
    });
  });

  reqMP.on('error', (err) => {
    console.error("Mercado Pago Request Error:", err);
    res.status(500).json({ error: "Falha na conexão com o Mercado Pago." });
  });

  reqMP.write(payload);
  reqMP.end();
});

// Verificar Status de Pagamento no Mercado Pago
app.post('/api/payments/verify-payment', (req, res) => {
  const db = readDB();
  const { paymentId, orderId } = req.body;
  const config = db.configuracoes || {};
  const token = config.mercadoPagoAccessToken;

  if (!token) {
    return res.status(400).json({ error: "Token do Mercado Pago não configurado." });
  }

  // Se o pedido já estiver aprovado, apenas retorna sucesso
  const pedido = db.pedidosOnline.find(p => p.id === orderId);
  if (!pedido) {
    return res.status(404).json({ error: "Pedido não encontrado no banco local." });
  }
  if (pedido.status === 'aprovado') {
    return res.json({ success: true, status: 'approved', message: "Pedido já estava aprovado." });
  }

  const options = {
    hostname: 'api.mercadopago.com',
    path: `/v1/payments/${paymentId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  const reqMP = https.request(options, (resMP) => {
    let data = '';
    resMP.on('data', (chunk) => { data += chunk; });
    resMP.on('end', () => {
      try {
        const response = JSON.parse(data);
        if (response.status === 'approved') {
          // Registrar como venda
          const total = pedido.itens.reduce((acc, item) => acc + (item.quantidade * item.precoUnitario), 0);
          const novaVenda = {
            id: Date.now().toString(),
            clienteId: pedido.clienteId,
            itens: pedido.itens,
            formaPagamento: 'Mercado Pago (Pix/Cartão)',
            tipoVenda: 'Online',
            total,
            data: new Date().toISOString(),
            synced: true,
            vendedor: 'Cliente Online'
          };

          db.vendas.unshift(novaVenda);

          // Dar baixa no estoque central
          db.produtos = db.produtos.map(p => {
            const itemVendido = pedido.itens.find(iv => iv.produtoId === p.id);
            if (itemVendido) {
              return { ...p, estoque: Math.max(0, p.estoque - itemVendido.quantidade) };
            }
            return p;
          });

          // Atualizar status do pedido
          db.pedidosOnline = db.pedidosOnline.map(p => {
            if (p.id === orderId) {
              return { ...p, status: 'aprovado', paymentId, statusPagamento: 'pago' };
            }
            return p;
          });

          writeDB(db);

          // Notificação WhatsApp
          try {
            if (config.notifyVendas !== false) {
              const clientObj = db.clientes.find(c => c.id === pedido.clienteId);
              const clientName = clientObj ? clientObj.nome : pedido.clienteNome;
              const itensList = pedido.itens.map(i => `- ${i.nome}: ${i.quantidade}x R$ ${i.precoUnitario.toFixed(2)}`).join('\n');
              const alertMsg = `✅ *Pedido Online Pago e Aprovado!*\n👤 Cliente: ${clientName}\n💳 Pagamento: Mercado Pago (Pix/Cartão)\n💵 Total: R$ ${total.toFixed(2)}\n📦 Itens:\n${itensList}`;
              sendWhatsAppAlert(db, alertMsg, 'LOJA', { itens: pedido.itens });
            }
          } catch (err) {
            console.error("Erro ao enviar notificação de aprovação automática de pedido:", err);
          }

          res.json({ success: true, status: 'approved' });
        } else {
          res.json({ success: false, status: response.status, message: "O pagamento não foi aprovado ainda." });
        }
      } catch (err) {
        res.status(500).json({ error: "Erro ao processar verificação de pagamento." });
      }
    });
  });

  reqMP.on('error', (err) => {
    console.error("Mercado Pago verification request error:", err);
    res.status(500).json({ error: "Falha ao conectar com o Mercado Pago para verificação." });
  });

  reqMP.end();
});

// --- SISTEMA ---
// Download Backup antigo (mantido para fallback)
app.get('/api/backup', (req, res) => {
  res.download(DB_FILE, `backup_vendas_${new Date().toISOString().split('T')[0]}.json`);
});

// Gerar novo backup, salvar na pasta e mandar pro WhatsApp
const BACKUPS_DIR = path.join(__dirname, 'backups');
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR);

async function generateBackup() {
  try {
    const db = readDB();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${timestamp}.json`;
    const filepath = path.join(BACKUPS_DIR, filename);
    
    // Salvar o arquivo localmente
    const fileData = JSON.stringify(db, null, 2);
    fs.writeFileSync(filepath, fileData);
    
    // Preparar para enviar via WhatsApp se configurado
    const config = db.configuracoes || {};
    if (config.grupoBackup) {
      const fileBase64 = Buffer.from(fileData).toString('base64');
      
      try {
        await fetch('http://localhost:3002/send-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: config.grupoBackup,
            message: `📦 *Backup Automático Gerado*\nData: ${new Date().toLocaleString('pt-BR')}\nArquivo: ${filename}`,
            fileBase64,
            fileName: filename,
            mimeType: 'application/json'
          })
        });
      } catch (err) {
        console.error("Erro ao enviar backup pro whatsapp microservice:", err);
      }
    }
    
    return filename;
  } catch (err) {
    console.error("Erro ao gerar backup automático:", err);
    throw err;
  }
}

// Agendar Backup Automático: Duas vezes ao dia (08:00 e 18:00)
cron.schedule('0 8,18 * * *', async () => {
  console.log("Iniciando rotina de backup automático...");
  try {
    await generateBackup();
    console.log("Backup automático concluído com sucesso.");
  } catch (err) {
    console.error("Falha no backup automático.");
  }
});

app.post('/api/backup/generate', async (req, res) => {
  try {
    const filename = await generateBackup();
    res.json({ success: true, filename });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar backup: " + err.message });
  }
});

// Listar últimos 5 backups
app.get('/api/backups', (req, res) => {
  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const stats = fs.statSync(path.join(BACKUPS_DIR, f));
        return { name: f, date: stats.mtime, size: stats.size };
      })
      .sort((a, b) => b.date - a.date)
      .slice(0, 5);
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar backups: " + err.message });
  }
});

// Download de backup específico
app.get('/api/backup/download/:filename', (req, res) => {
  const filepath = path.join(BACKUPS_DIR, req.params.filename);
  if (fs.existsSync(filepath)) {
    res.download(filepath, req.params.filename);
  } else {
    res.status(404).send("Arquivo não encontrado.");
  }
});

// Upload Backup
app.post('/api/backup', (req, res) => {
  try {
    const backupData = req.body;
    if (!backupData || !backupData.produtos || !backupData.vendas) {
      return res.status(400).json({ error: 'Arquivo de backup inválido.' });
    }
    writeDB(backupData);
    res.json({ success: true, message: 'Backup restaurado com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao restaurar backup.' });
  }
});

// Server Status
app.get('/api/status', (req, res) => {
  const db = readDB();
  const mem = process.memoryUsage();
  res.json({
    uptime: process.uptime(),
    memory: {
      rss: mem.rss,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed
    },
    nodeVersion: process.version,
    stats: {
      vendas: db.vendas.length,
      produtos: db.produtos.length,
      clientes: db.clientes.length,
      usuarios: db.usuarios.length
    }
  });
});

// Server Config
app.get('/api/config-server', (req, res) => {
  res.json({
    port: 3001,
    dbPath: DB_FILE,
    cwd: process.cwd(),
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

// Controles de Serviço (Útil em VPS com PM2/Nodemon)
app.post('/api/restart', (req, res) => {
  res.json({ success: true, message: "Reiniciando servidor backend..." });
  setTimeout(() => {
    console.log("Comando de reinício backend recebido via API. Desligando o servidor...");
    process.exit(0);
  }, 1500);
});

app.post('/api/stop', (req, res) => {
  res.json({ success: true, message: "Parando servidor backend..." });
  setTimeout(() => {
    console.log("Comando de parada backend recebido via API. Desligando o servidor...");
    process.exit(0);
  }, 1500);
});

// Proxy para controle do WhatsApp Service
app.post('/api/whatsapp/:action', async (req, res) => {
  const { action } = req.params;
  if (!['restart', 'stop'].includes(action)) {
    return res.status(400).json({ error: "Ação inválida" });
  }
  
  try {
    const response = await fetch(`http://localhost:3002/${action}`, { method: 'POST' });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erro ao comunicar com microserviço do WhatsApp." });
  }
});

// Zerar Banco de Dados
app.post('/api/reset', (req, res) => {
  const initialData = {
    produtos: INITIAL_PRODUCTS,
    clientes: INITIAL_CLIENTS,
    vendas: [],
    usuarios: INITIAL_USERS,
    activeCarga: null,
    pedidosOnline: []
  };
  writeDB(initialData);
  res.json({ success: true, data: initialData });
});

// Start Server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend VendaRápida rodando na porta http://localhost:${PORT}`);
});
