const fs = require('fs');
const axios = require('axios');
const qrcode = require('qrcode-terminal');
const { Client, Buttons, List, MessageMedia, LocalAuth } = require('whatsapp-web.js');
require('dotenv').config();

const url = process.env.url; //URL da api de chat Typebot
const typebot = process.env.typebot; //Nome do seu fluxo
const DATABASE_FILE1 = process.env.database_file1; //Arquivo JSON para guardar os registros dos usuários

// Configurações para o primeiro cliente (Windows)
const client1 = new Client({
  authStrategy: new LocalAuth({ clientId: "client-one" }),
  puppeteer: {
    executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  }
});

//Kit com os comandos otimizados para nuvem Ubuntu Linux (créditos Pedrinho da Nasa Comunidade ZDG)
/*const client1 = new Client({
  authStrategy: new LocalAuth({ clientId: "client-one" }),
  puppeteer: {
    headless: true,
    //CAMINHO DO CHROME PARA WINDOWS (REMOVER O COMENTÁRIO ABAIXO)
    //executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    //===================================================================================
    // CAMINHO DO CHROME PARA MAC (REMOVER O COMENTÁRIO ABAIXO)
    //executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    //===================================================================================
    // CAMINHO DO CHROME PARA LINUX (REMOVER O COMENTÁRIO ABAIXO)
    // executablePath: '/usr/bin/google-chrome-stable',
    //===================================================================================
    args: [
      '--no-sandbox', //Necessário para sistemas Linux
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- Este não funciona no Windows, apague caso suba numa máquina Windows
      '--disable-gpu'
    ]
  }
});*/

console.log("Bem-vindo ao sistema de comandos do Johnny Love API 1.0 - A Integração Typebot + Whatsapp!");
console.log(`URL do seu Typebot: ${url}`);
console.log(`Fluxo carregado: ${typebot}`);
console.log(`Arquivo JSON das sessões: ${DATABASE_FILE1}`);

// entao habilitamos o usuario a acessar o serviço de leitura do qr code
client1.on('qr', qr => {
  qrcode.generate(qr, {small: true});
});

// apos isso ele diz que foi tudo certin
client1.on('ready', () => {
  console.log('Tudo certo! Johnny Love API pronta e conectada.');
});

// E inicializa tudo para fazer a nossa magica =)
client1.initialize();

//Rotinas da gestão de dados

function readJSONFile(nomeArquivo) {
  if (fs.existsSync(nomeArquivo)) {
    const dados = fs.readFileSync(nomeArquivo);
    return JSON.parse(dados);
  } else {
    return [];
  }
}

function writeJSONFile(nomeArquivo, dados) {
  const dadosJSON = JSON.stringify(dados, null, 2);
  fs.writeFileSync(nomeArquivo, dadosJSON);
}

//Gestão de dados sessão one 1

function addObject1(numeroId, sessionid, numero, maxObjects) {
  const dadosAtuais = readJSONFile(DATABASE_FILE1);

  // Verificar a unicidade do numeroId
  const existeNumeroId = dadosAtuais.some(objeto => objeto.numeroId === numeroId);
  if (existeNumeroId) {
    throw new Error('O numeroId já existe no banco de dados.');
  }

  const objeto = { numeroId, sessionid, numero};

  if (dadosAtuais.length >= maxObjects) {
    // Excluir o objeto mais antigo
    dadosAtuais.shift();
  }

  dadosAtuais.push(objeto);
  writeJSONFile(DATABASE_FILE1, dadosAtuais);
}

function readMap1(numeroId) {
  const dadosAtuais = readJSONFile(DATABASE_FILE1);
  const objeto = dadosAtuais.find(obj => obj.numeroId === numeroId);
  return objeto;
}

function deleteObject1(numeroId) {
  const dadosAtuais = readJSONFile(DATABASE_FILE1);
  const novosDados = dadosAtuais.filter(obj => obj.numeroId !== numeroId);
  writeJSONFile(DATABASE_FILE1, novosDados);
}

function existsDB1(numeroId) {
  const dadosAtuais = readJSONFile(DATABASE_FILE1);
  return dadosAtuais.some(obj => obj.numeroId === numeroId);
}

function readSessionId1(numeroId) {
  const objeto = readMap1(numeroId);
  return objeto ? objeto.sessionid : undefined;
}

async function createSessionJohnny1(data){
  const reqData = {
    sessionId: data.from,
    startParams: {
      typebot: typebot,
      prefilledVariables: {
        number: data.from.split('@')[0],
        name: data.notifyName
      },
    },
  };
  const request = await axios.post(url, reqData);
  if (!existsDB1(data.from)){
    addObject1(data.from,request.data.sessionId,data.from.replace(/\D/g,''),100);   
  }
}

//Fim das rotinas de gestão de dados

async function waitWithDelay(inputString) {
  // Verifica se a string começa com '!wait'
  if (inputString.startsWith('!wait')) {
    // Extrai o número da string usando expressões regulares
    const match = inputString.match(/\d+/);
    
    if (match) {
      // Converte o número para um valor inteiro
      const delayInSeconds = parseInt(match[0]);
      
      // Aguarda o atraso usando o valor extraído
      await new Promise(resolve => setTimeout(resolve, delayInSeconds * 1000));
      
      //console.log(`Aguardou ${delayInSeconds} segundos.`);
    } else {
      const defaultDelayInSeconds = 3;
      await new Promise(resolve => setTimeout(resolve, defaultDelayInSeconds * 1000));
    }
  }
}

async function tratarMidia(message) {  
    try {
      let fileUrl = message.content.url; // URL do arquivo
      let mimetype;
      let filename;

      // Use Axios para buscar o arquivo e determinar o MIME type.
      const attachment = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
      }).then(response => {
        mimetype = response.headers['content-type'];
        filename = fileUrl.split("/").pop();
        return response.data.toString('base64');
      });

      if (attachment) {
        const media = new MessageMedia(mimetype, attachment, filename);
        return media;
      }
    } catch (e) {
      console.error(e);
    }  
}

// Evento de recebimento de mensagens
client1.on('message', async msg => {

  if (!existsDB1(msg.from) && msg.from.endsWith('@c.us') && !msg.hasMedia && msg.body === 'ATIVAR FUNIL BASICO'){
    await createSessionJohnny1(msg);
  }

  if (existsDB1(msg.from) && msg.from.endsWith('@c.us') && !msg.hasMedia){
    const chat = await msg.getChat();
    const sessionId = readSessionId1(msg.from);
    const content = msg.body;
    const reqData = {
        message: content,
        sessionId: sessionId,
    };
    const request = await axios.post(url, reqData);
    const messages = request.data.messages;
    for (const message of messages){
      if (message.type === 'text') {
        let formattedText = '';
        for (const richText of message.content.richText){
          for (const element of richText.children){
            let text = '';
            if (element.text) {
                text = element.text;
            }
            if (element.bold) {
                text = `*${text}*`;
            }
            if (element.italic) {
                text = `_${text}_`;
            }
            if (element.underline) {
                text = `~${text}~`;
            }
            formattedText += text;
          }
          formattedText += '\n';
        }
        formattedText = formattedText.replace(/\n$/, '');
        if(formattedText.startsWith('!wait')){
        await waitWithDelay(formattedText);
        }
        if(formattedText.startsWith('!fim')){
        if(existsDB1(msg.from)){
        deleteObject1(msg.from);}
        }
        if(!(formattedText.startsWith('!wait')) && !(formattedText.startsWith('!fim'))){          
        await chat.sendStateTyping(); // Simulando Digitação
        await client1.sendMessage(msg.from, formattedText);
        }
      }
      if (message.type === 'image' || message.type === 'video') {
        try{
          const media = await tratarMidia(message);
          await client1.sendMessage(msg.from, media);
        }catch(e){}
      }
      if (message.type === 'audio') {
        try{
          const media = await tratarMidia(message);
          await chat.sendStateRecording(); //Simulando audio gravando
          await client1.sendMessage(msg.from, media, {sendAudioAsVoice: true});
        }catch(e){}
      }
    }
  }  
});

// Central de Controle Advanced

function formatarContato(numero, prefixo) {
  const regex = new RegExp(`^${prefixo}(\\d+)`);
  const match = numero.match(regex);

  if (match && match[1]) {
    const digits = match[1];
    return `55${digits}@c.us`;
  }

  return numero;
}

function getRandomDelay(minDelay, maxDelay) {
  const randomDelay = Math.random() * (maxDelay - minDelay) + minDelay;
  return Math.floor(randomDelay);
}

function extrairNomeArquivo(str, posicao) {
  const partes = str.split(' ');
  if (posicao >= 0 && posicao < partes.length) {
    return partes[posicao];
  }
  return null;
}

function extrairContatos(leadsTopo, leadsFundo, quantidade) {
  if (leadsFundo === null) {
    return leadsTopo.slice(0, quantidade).map(objeto => objeto.numeroId);
  }

  const contatos = leadsTopo
    .filter(contato => !leadsFundo.includes(contato))
    .slice(0, quantidade)
    .map(objeto => objeto.numeroId);
  return contatos;
}

async function obterUltimaMensagem(contato) {
  const chat = await client1.getChatById(contato);
  const mensagens = await chat.fetchMessages({ limit: 1 });

  if (mensagens.length > 0) {
    const ultimaMensagem = mensagens[mensagens.length - 1];
    return ultimaMensagem.body;
  }

  return "Nenhuma mensagem encontrada";
}  

async function escutarGrupos() {
  const chats = await client1.getChats();
  const contatos = [];

  for (let i = 0; i < chats.length; i++) {
    const chat = chats[i];
    if (!chat.isGroup) continue; // Ignora contatos individuais

    const contato = chat.id._serialized;
    const ultimaMensagem = await obterUltimaMensagem(contato);

    contatos.push({ contato, ultimaMensagem });
  }

  return contatos;
}

async function extrairGrupo(grupoId) {
  const chat = await client1.getChatById(grupoId);
  const contatos = [];

  chat.participants.forEach(participant => {
    if (!participant.isMe) {
      contatos.push(participant.id._serialized);
    }
  });

  return contatos;
}

function gerarStringAleatoria(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  
  return result;
}

client1.on('message_create', async (msg) => {

  //Instruções da Central de Controle
  if (msg.fromMe && msg.body.startsWith('!help') && msg.to === msg.from) {    
    await client1.sendMessage(msg.from, `*Sistema de Controle v1.0*\n\n*Atendimento Humano*\nMétodo Direto: "Ativar humano"\nMétodo Indireto: "!humano xxyyyyyyyyy"`);
  }

  //Deletar um contato da Base de Dados (Atendimento Humano)
  if (msg.fromMe && msg.body.startsWith('!humano ') && msg.to === msg.from) {
    let contato = formatarContato(msg.body,'!humano ');
    if(existsDB1(contato)){
    deleteObject1(contato);}
    await client1.sendMessage(msg.from, `Deletei da Base de Dados o numero: ${contato}`);
  }
  
  //Deletar um contato da Base de Dados Método Direto (Atendimento Humano)
  if (msg.fromMe && msg.body === 'Ativar humano' && msg.to !== msg.from) {
    if(existsDB1(msg.to)){
      deleteObject1(msg.to);}
      await client1.sendMessage(msg.from, `Deletei da Base de Dados o numero: ${msg.to}`);    
  }
  
});


