# 🚀 Deploy no Easypanel — AgenteIA SaaS

Guia completo para subir o projeto na VPS `2.24.199.198` usando **Easypanel**.

---

## Pré-requisitos

- [ ] Easypanel instalado na VPS (ver seção abaixo)
- [ ] Projeto no GitHub (repositório privado ou público)
- [ ] SSH na VPS como `root`

---

## 1. Instalar o Easypanel na VPS

Se ainda não estiver instalado, acesse a VPS via SSH e rode:

```bash
ssh root@2.24.199.198
curl -sSL https://get.easypanel.io | sh
```

Após instalar, acesse no browser: **http://2.24.199.198:3000**  
Crie seu usuário administrador e faça login.

---

## 2. Criar o Projeto no Easypanel

1. No painel, clique em **"Create Project"**
2. Nome: `agenteia`
3. Clique em **"Create"**

---

## 3. Adicionar o Serviço App (Backend + Frontend)

1. Dentro do projeto `agenteia`, clique em **"+ Add Service"**
2. Escolha **"App"**
3. Nome do serviço: `app`
4. Em **"Source"**, selecione **"Github"**
   - Conecte sua conta GitHub (botão "Connect Github Account")
   - Selecione o repositório: `Jeff-teixeira/saas_agente_ia_solucoes`
   - Branch: `main`
5. Em **"Build"**, selecione **"Dockerfile"**
   - Path do Dockerfile: `./Dockerfile` (padrão)
6. Clique em **"Save"**

### Configurar a porta

1. Vá em **"Domains"** → **"Add Port"**
2. Porta do container: `8080`
3. Clique em **"Save"**

### Configurar variáveis de ambiente

1. Vá na aba **"Environment"**
2. Cole o conteúdo do arquivo `.env.easypanel.example` (preenchendo os valores reais)
3. Clique em **"Save"**

---

## 4. Adicionar o Serviço MongoDB

1. No projeto `agenteia`, clique em **"+ Add Service"**
2. Escolha **"Mongo"** (template pronto)
3. Nome: `mongo`
4. Defina uma senha segura
5. Clique em **"Create"**

### Obter a URI de conexão interna

Após criar o serviço MongoDB, vá nos detalhes dele e copie a **Internal Connection String**.  
Ela terá o formato:
```
mongodb://agenteia_mongo:SENHA@agenteia_mongo:27017
```

Use essa string como valor de `MONGODB_URI` nas variáveis de ambiente do serviço `app`.

---

## 5. Configurar Auto-Deploy (CI/CD)

No serviço `app`, aba **"General"**:
1. Em **"Deploy"**, ative **"Auto Deploy"**
2. Easypanel irá gerar um **Webhook URL**
3. Copie esse webhook e adicione no GitHub:
   - Repositório → **Settings** → **Webhooks** → **Add webhook**
   - Payload URL: cole o webhook do Easypanel
   - Content type: `application/json`
   - Evento: **"Just the push event"**

A partir daí, **a cada `git push` no branch `main`**, o Easypanel recompila e sobe a nova versão automaticamente!

---

## 6. Configurar Domínio (Opcional)

Se você tiver um domínio (ex: `app.agenteia.com.br`):

1. Aponte o DNS do domínio para o IP `2.24.199.198` (registro tipo A)
2. No serviço `app`, aba **"Domains"** → **"Add Domain"**
3. Coloque `app.agenteia.com.br`
4. Ative **"HTTPS"** (o Easypanel gera certificado SSL Let's Encrypt automaticamente)
5. Atualize as variáveis de ambiente:
   ```
   FRONTEND_URL=https://app.agenteia.com.br
   VITE_API_URL=https://app.agenteia.com.br/api
   ```

---

## 7. Primeiro Deploy Manual

Para triggerar o primeiro build manualmente no Easypanel:
1. Vá no serviço `app`
2. Clique em **"Deploy"** → **"Deploy Now"**
3. Acompanhe os logs em tempo real clicando em **"Logs"**

---

## 8. Verificação Final

Após o deploy bem-sucedido, acesse:

| Serviço | URL |
|---------|-----|
| App (frontend + API) | `http://2.24.199.198` ou seu domínio |
| API Health Check | `http://2.24.199.198/api/health` |
| Easypanel Dashboard | `http://2.24.199.198:3000` |

---

## Fluxo de Trabalho Diário

```
Editar código no VS Code
        ↓
git add . && git commit -m "feat: minha alteração"
        ↓
git push origin main
        ↓
Easypanel detecta o push → reconstrói a imagem Docker → sobe o novo container
        ↓
Alteração disponível em produção em ~2-3 minutos
```

---

## Troubleshooting

### Build falha no Easypanel
- Verifique os logs de build no painel
- Certifique que o `Dockerfile` está correto
- Confira que todas as variáveis de ambiente obrigatórias estão preenchidas

### App sobe mas não conecta no banco
- Verifique a string `MONGODB_URI` nas variáveis de ambiente
- Confirme que o serviço `mongo` está rodando (verde no painel)
- A URI interna deve usar o nome interno do serviço (não `localhost`)

### Porta não acessível externamente
- Verifique o firewall da VPS: `ufw allow 80 && ufw allow 443 && ufw allow 3000`
- No Easypanel, confirme que a porta `8080` está mapeada no serviço
