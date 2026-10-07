# 4Cantos · Painel

Painel de gestão dos apartamentos: baixa de aluguéis e despesas, DRE por apartamento
e consolidado, e fluxo de caixa. Site estático (um único `index.html`), hospedado no
Render, com banco e login no Supabase.

## 1. Banco (Supabase)

1. Crie um projeto em <https://supabase.com> (plano grátis).
2. **SQL Editor → New query** → cole o conteúdo de `supabase-setup.sql` → **Run**.
3. **Authentication → Providers → Email** → desligue *Confirm email*.
4. **Settings → API** → guarde a **Project URL** e a chave **anon public**.

## 2. Site (Render + GitHub)

1. Suba esta pasta para um repositório no GitHub.
2. No Render: **New → Static Site** → conecte o repositório.
   - *Build Command*: deixe vazio
   - *Publish Directory*: `.`
3. Deploy. Cada `git push` na branch principal republica sozinho.

## 3. Primeiro acesso

Ao abrir o link do Render, o painel pede a **Project URL** e a **chave anon** do
Supabase (ficam salvas no aparelho), depois pede e-mail e senha — use
*Criar conta com este e-mail* na primeira vez. A partir daí, celular e computador
mostram os mesmos lançamentos, com sincronização em tempo real.

No celular, use *Adicionar à tela de início* para o painel abrir como aplicativo.

## Estrutura

| Arquivo | Função |
|---|---|
| `index.html` | O painel inteiro: interface, cálculos e sincronização |
| `contrato.js` | Aba **Contrato**: lê os documentos do morador, preenche o contrato padrão de sublocação e gera Word/PDF |
| `supabase-setup.sql` | Tabela `painel`, políticas RLS e realtime |
| `render.yaml` | Configuração do site estático no Render |
| `manifest.json`, `icon-*.png` | Ícone e comportamento de app no celular |

## Aba Contrato

Gera o contrato de sublocação de quarto a partir das fotos/PDFs dos documentos do morador.
A leitura automática usa a API do Claude: na própria aba, toque em *Configurar leitura
automática* e cole uma chave da Anthropic. A chave fica só no aparelho (localStorage), não
vai para o Supabase. Sem chave, os dados são digitados à mão. O endereço de cada apto vem de
uma tabela no `contrato.js` (Nastas = nº 585, Marieta = nº 522); apto novo pede o endereço uma
vez e grava no painel. *Registrar morador no quarto* põe o nome no quarto e lança o aluguel
previsto nos meses vazios até dezembro.

## Dados

Cada usuário tem uma linha na tabela `painel`, com todo o histórico num campo `jsonb`.
As políticas de RLS garantem que só o dono lê e grava a própria linha. O painel mantém
uma cópia local, então continua funcionando sem internet e sincroniza ao reconectar.
O botão **Backup** na aba Resumo exporta tudo num arquivo `.json`.
