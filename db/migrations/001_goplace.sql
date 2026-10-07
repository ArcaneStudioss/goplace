-- GoPlace: catalogo, pedidos/vendas, painel.
create table if not exists loja.produtos (
  id serial primary key,
  slug text not null unique,
  nome text not null,
  categoria text not null,               -- iphone | audio | mobilidade | cameras | acessorios | peliculas
  marca text not null default '',
  condicao text not null default 'novo' check (condicao in ('novo', 'seminovo', 'usado')),
  preco_centavos integer not null check (preco_centavos >= 0),
  preco_antigo_centavos integer,
  custo_centavos integer,
  parcelas_sem_juros integer not null default 12 check (parcelas_sem_juros between 1 and 24),
  resumo text not null default '',
  descricao text not null default '',
  laudo jsonb not null default '{}'::jsonb,
  estoque integer not null default 1 check (estoque >= 0),
  status text not null default 'disponivel' check (status in ('disponivel', 'reservado', 'vendido', 'oculto')),
  destaque boolean not null default false,
  exemplo boolean not null default false,
  visitas integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  vendido_em timestamptz
);
create index if not exists produtos_vitrine on loja.produtos (status, categoria);

create table if not exists loja.fotos (
  id serial primary key,
  produto_id integer not null references loja.produtos(id) on delete cascade,
  grande text not null,
  pequena text not null,
  largura integer not null,
  altura integer not null,
  ordem integer not null default 0
);
create index if not exists fotos_produto on loja.fotos (produto_id, ordem);

create table if not exists loja.usuarios (
  id serial primary key,
  email text not null unique,
  nome text not null,
  senha_hash text not null,
  papel text not null default 'vendedor' check (papel in ('admin', 'vendedor')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  ultimo_acesso timestamptz
);

create table if not exists loja.sessoes (
  token_hash text primary key,
  usuario_id integer not null references loja.usuarios(id) on delete cascade,
  expira_em timestamptz not null,
  criado_em timestamptz not null default now()
);

create table if not exists loja.falhas_login (
  id serial primary key,
  email text,
  ip_hash text,
  criado_em timestamptz not null default now()
);

create table if not exists loja.pedidos (
  id serial primary key,
  codigo text not null unique,
  origem text not null default 'site' check (origem in ('site', 'balcao')),
  nome text not null,
  whatsapp text not null default '',
  recebimento text not null default 'retirada_sap',
  pagamento text not null default 'pix',
  observacao text not null default '',
  total_centavos integer not null,
  desconto_centavos integer not null default 0,
  status text not null default 'novo' check (status in ('novo', 'confirmado', 'pago', 'entregue', 'cancelado')),
  estoque_baixado boolean not null default false,
  vendedor_id integer references loja.usuarios(id) on delete set null,
  ip_hash text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  pago_em timestamptz
);
create index if not exists pedidos_status on loja.pedidos (status, criado_em desc);

create table if not exists loja.pedido_itens (
  id serial primary key,
  pedido_id integer not null references loja.pedidos(id) on delete cascade,
  produto_id integer references loja.produtos(id) on delete set null,
  nome text not null,
  categoria text not null default '',
  preco_centavos integer not null,
  custo_centavos integer,
  quantidade integer not null default 1 check (quantidade > 0)
);

create table if not exists loja.historico_pedidos (
  id serial primary key,
  pedido_id integer not null references loja.pedidos(id) on delete cascade,
  de text, para text not null,
  usuario_id integer references loja.usuarios(id) on delete set null,
  criado_em timestamptz not null default now()
);

create table if not exists loja.config (
  chave text primary key,
  valor jsonb not null,
  atualizado_em timestamptz not null default now()
);
