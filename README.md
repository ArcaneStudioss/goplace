# GoPlace · loja online + painel de vendas

Site da **GoPlace Phones** (iPhones novos, seminovos e usados, áudio, scooters elétricas, drones, câmeras e acessórios; lojas em Santo Antônio da Patrulha e Capão da Canoa) com painel de gestão para a própria loja cadastrar produtos com várias fotos e controlar pedidos e vendas.

Feito pela Arcane Studios. Conceito: **"o laudo"** ("Aqui você sabe exatamente o que está levando", frase do Instagram da loja). Todo seminovo mostra saúde da bateria, estado, garantia e o que foi conferido.

## O que tem
**Site** (celular primeiro, tema claro/escuro):
- Início: promessa + foto do aparelho com o laudo se marcando, categorias, pronta entrega, o laudo item a item, "além do iPhone", parcelamento/crediário, lojas, faixa da **Vibra**.
- Loja com busca, categorias, condição (novo/seminovo/usado) e ordenação.
- Produto com galeria de várias fotos (desliza no celular), preço à vista + parcelas sem juros, laudo, "tirar dúvida no WhatsApp".
- Sacola → pedido (nome, WhatsApp, retirada/entrega, Pix/cartão/crediário) → página do pedido com botão que manda tudo pro WhatsApp. **Nada é cobrado online** (pagamento online fica para a fase 2).
- Vídeo no topo: opcional, enviado pelo painel (vídeo próprio da loja; propaganda da Apple não pode).

**Painel** (`/admin`, login por e-mail e senha):
- Visão geral: faturamento, ticket médio, lucro bruto (preço - custo), valor em estoque, gráfico por dia e por categoria, mais vistos, parados há 30 dias.
- Produtos: cadastro em janela, **até 12 fotos** (arrasta para ordenar, a primeira é a capa, comprime no celular antes de enviar), laudo, custo, estoque, destaque, situação (disponível/reservado/vendido/oculto).
- Pedidos e vendas: pedidos do site + **venda no balcão** (produto do estoque ou item avulso, desconto, forma de pagamento). Confirmar reserva o aparelho; pago/entregue baixa o estoque; cancelar devolve.
- Clientes, Relatórios (período, categoria, pagamento, site x balcão, conversão dos pedidos do site, planilha CSV), Site (WhatsApp, lojas, parcelamento, crediário, vídeo, itens do laudo, aviso de prévia), Equipe (admin e vendedor).

## Rodar no computador
```bash
npm install
npm run dev            # http://localhost:3100 (banco local em .dados/, com catálogo de EXEMPLO)
npm test               # 15 testes (login, estoque, pedidos, backup/restauração)
```
Login de teste local: `admin@goplace.local` / `goplace-teste-2026` (só existe no banco local).

## Produção (Discloud, app NOVO)
1. Supabase: criar projeto (banco Postgres) e um bucket **público** `goplace` no Storage (fotos e vídeo).
2. Cloudflare R2 (ou Backblaze B2): bucket privado para o backup, chave só com escrita/leitura nesse bucket.
3. `.env.production.local` a partir de `.env.example` (nunca vai pro git).
4. `npm run empacotar` → `goplace-discloud.zip` → subir como app novo na Discloud.
5. Primeiro acesso: `ADMIN_EMAIL`/`ADMIN_SENHA` criam o primeiro admin quando o banco não tem ninguém; depois troque a senha em Equipe → Minha senha.
6. Depois do deploy: `auditar-site.sh https://... --app` (kit de segurança da Arcane).

Cache da hospedagem: `/_next/static` já vem com nome versionado. Se trocar arquivo em `public/` (logo, fotos fixas), **mude o nome do arquivo**: a Cloudflare guarda por até 4 h.

## Backup (tipo C, `playbooks/backup.md`)
- Diário automático (`src/instrumentation.ts`): banco inteiro em JSON → gzip → AES-256-GCM → R2/B2, conferido lendo de volta. Retenção pelo nome: 7 diários, 4 semanais, 12 mensais.
- Manual: `npm run backup -- --producao`. Restaurar (num banco **vazio**): `npm run restaurar -- goplace/diario-3.gpbak`.
- Painel avisa o admin se o backup estiver atrasado (> 36 h) ou não configurado.
- Fotos/vídeo ficam no Supabase Storage; os originais continuam com a loja.

Checklist:
- [x] Tipo C identificado e backup automático implementado
- [x] Restauração testada (teste `backup.test.ts`: banco de exemplo → cifra → banco novo → tudo igual) em 07/10/2026
- [ ] Cópia fora do servidor funcionando (precisa das chaves do R2)
- [ ] `BACKUP_CHAVE` guardada fora do servidor (gerenciador de senhas do Gabriel)
- [ ] Contrato diz quem faz e guarda o backup e por quanto tempo

## Segurança verificada (07/10/2026, build de produção local)
- `auditar-codigo.sh`: 0 falha (3 atenções justificadas: SQL só com constantes/`Number()`, `exec` só de migração, `target=_blank` corrigido).
- `auditar-site.sh --app`: 0 falha (HTTPS e noindex: HTTPS é da Discloud; noindex ligado enquanto o aviso de prévia estiver ativo).
- Ataques simulados: ação de outra origem recusada; cookie HttpOnly + Secure + SameSite=Lax; força bruta trava por e-mail e por IP; senha fraca e com nome/e-mail recusada; vendedor barrado nas áreas de admin; arquivo falso no upload recusado; planilha exige login; `.env`, `.git`, `package.json`, `..` na rota de mídia: 404.
- Não verificado ainda: o site no ar (Discloud), Supabase Storage e R2 reais.
