-- =====================================================
-- MIGRATION: Marketing features for NicBeautty
-- Execute this SQL in your Supabase SQL Editor
-- =====================================================

-- 1. Blog posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id BIGSERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  resumo TEXT,
  conteudo TEXT NOT NULL,
  imagem TEXT,
  tags TEXT[] DEFAULT '{}',
  publicado BOOLEAN DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 2. Promocoes
CREATE TABLE IF NOT EXISTS promocoes (
  id BIGSERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  imagem TEXT,
  cupom TEXT,
  desconto TEXT,
  validade TEXT,
  ativa BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 3. Referrals (indicacoes)
CREATE TABLE IF NOT EXISTS referrals (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  referrer_name TEXT,
  referrer_whatsapp TEXT,
  referred_name TEXT,
  referred_whatsapp TEXT,
  status TEXT DEFAULT 'pendente',
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 4. Newsletter
CREATE TABLE IF NOT EXISTS newsletter (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT,
  contato TEXT NOT NULL,
  tipo TEXT DEFAULT 'whatsapp',
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE promocoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter ENABLE ROW LEVEL SECURITY;

-- blog_posts: public read published, admin all
CREATE POLICY "blog_public_read" ON blog_posts FOR SELECT USING (publicado = true);
CREATE POLICY "blog_admin_all" ON blog_posts FOR ALL USING (true) WITH CHECK (true);

-- promocoes: public read active, admin all
CREATE POLICY "promo_public_read" ON promocoes FOR SELECT USING (ativa = true);
CREATE POLICY "promo_admin_all" ON promocoes FOR ALL USING (true) WITH CHECK (true);

-- referrals: anyone can insert, admin read all
CREATE POLICY "referral_public_insert" ON referrals FOR INSERT WITH CHECK (true);
CREATE POLICY "referral_admin_read" ON referrals FOR SELECT USING (true);
CREATE POLICY "referral_admin_all" ON referrals FOR ALL USING (true) WITH CHECK (true);

-- newsletter: anyone can insert, admin read all
CREATE POLICY "newsletter_public_insert" ON newsletter FOR INSERT WITH CHECK (true);
CREATE POLICY "newsletter_admin_read" ON newsletter FOR SELECT USING (true);
CREATE POLICY "newsletter_admin_all" ON newsletter FOR ALL USING (true) WITH CHECK (true);

-- Seed blog posts for SEO
INSERT INTO blog_posts (titulo, slug, resumo, conteudo, tags, publicado) VALUES
(
  'Como Cuidar dos Cílios após Extensão: Guia Completo',
  'como-cuidar-dos-cilios-apos-extensao',
  'Descubra as melhores práticas para manter seus cilios de extensão lindos e duradouros por muito mais tempo.',
  '## Por que o cuidado pós-aplicação é essencial?

Após investir em extensão de cílios, manter os resultados dependedirectamente dos cuidados diários. Com as técnicas certas, seus cilios podem durar de 3 a 4 semanas sem perder volume ou fio.

## 1. Evite contato com água nas primeiras 24 horas

O adesivo precisa de tempo para curar completamente. Evite:
- Lavar o rosto diretamente nos olhos
- Tomar banho com água quente muito próxima ao olhar
- Usar saunas ou piscinas

## 2. Não esfregue os olhos

O hábito de esfregar os olhos pode arrancar fios e deformar o mapeamento. Se tiver coceira, toque suavemente com a ponta dos dedos ou use um cotonete seco.

## 3. Use escovinha de máscara diariamente

Penteie os cilios com uma escovinha limpa (sem máscara) para manter o alinhamento e evitar embaraçamento.

## 4. Evite produtos oleosos na região dos olhos

Óleos, cremes gordos e removedores à base de óleo descolam o adesivo. Use:
- Micelar water (sem óleo)
- Sérum de cílios próprio para extensão
- Protetor solar mineral (sem óleo)

## 5. Durma de barriga para cima

Ao dormir de bruços ou de lado, os cilios se deformam e podem quebrar. Tente dormir sempre de costas.

## 6. Agende sua manutenção no tempo certo

A manutenção ideal é entre 15 e 21 dias após a aplicação. Esperar mais pode prejudicar o alinhamento natural dos seus fios.

## Conclusão

Com cuidados simples e consistentes, seus cílios de extensão ficam sempre perfeitos. Siga essas dicas e aproveite ao máximo o investimento na sua beleza.',
  ARRAY['cuidados', 'cilios', 'extensao', 'manutencao', 'dicas'],
  true
),
(
  'Volume Fox Eyes: O Efeito que Está Conquistando as Mulheres',
  'volume-fox-eyes-o-efeito-que-esta-conquistando',
  'Conheça a técnica de volume fox eyes, que alonga e valoriza o formato dos olhos com elegância.',
  '## O que é Volume Fox Eyes?

O volume fox eyes é uma técnica de extensão de cílios que cria um efeito Alongado e lifting, semelhante ao olhar felino. Os fios são aplicados com inclinação especial para "esticar" visualmente o olho.

## Como funciona a aplicação?

Diferente do volume tradicional (que distribui fios uniformemente), o fox eyes concentra fios mais longos e inclinados nos cantos externos dos olhos. Isso cria:

- **Efeito lifting natural** — o olho parece mais aberto e alerta
- **Alongamento visual** — especialmente bonito em olhos redondos
- **Sofisticação** — aparência elegante sem exagero

## Para quem é indicado?

- Mulheres com olhos pequenos ou redondos
- Quem busca um olhar mais marcante sem ser exagerado
- Para festas e ocasiões especiais (dura de 2 a 3 semanas)
- quem já tem experiência com extensão e quer variar

## Quanto dura?

Com cuidados adequados, o fox eyes dura entre 2 e 3 semanas. A manutenção deve ser feita entre 12 e 18 dias para manter o efeito perfeito.

## Cuidados especiais

Por ser uma aplicação mais direcionada, o fox eyes exige:
- Escovar os cilios na direção correta todos os dias
- Evitar esfregar os olhos com força
- Dormir de costas
- Agendar manutenção no prazo indicado

## Venha experimentar na Nicbeautty

Agende seu horário e descubra o efeito fox eyes. Nossa especialista faz um mapeamento personalizado para valorizar o formato dos seus olhos.',
  ARRAY['fox eyes', 'volume', 'extensao', 'tecnica', 'olhar'],
  true
),
(
  '5 Erros Comuns ao Fazer Extensão de Cílios (e Como Evitar)',
  '5-erros-comuns-extensao-de-cilios',
  'Evite os erros mais frequentes que comprometem a durabilidade e a saúde dos seus cílios de extensão.',
  '## Erro 1: Escolher profissional apenas pelo preço

O preço muito baixo pode indicar materiais de qualidade duvidosa ou técnica inadequada. Invista em uma profissional certificada que use adesivos hipoalergênicos e fios de qualidade.

## Erro 2: Molhar os cílios nas primeiras 24h

O adesivo precisa de tempo para curar completamente. Água, vapor e umidade excessiva podem comprometer a fixação e reduzir a durabilidade para poucos dias.

## Erro 3: Usar removedor de maquiagem com óleo

Produtos oleosos dissolvem o adesivo de extensão. Use sempre:
- Micelar water sem óleo
- Desmaquilhante específico para cílios extensão
- Água micelarCaseira (água destilada + baby shampoo suave)

## Erro 4: Deixar a manutenção passar do prazo

Quando os cilios começam a cair naturalmente, o mapeamento fica desequilibrado. Isso pode:
- Sobrecarregar os fios restantes
- Causar tração nos cilios naturais
- Dificultar a próxima aplicação

## Erro 5: Esfregar os olhos com força

O esfregamento forte pode arrancar cilios naturais junto com as extensões, causando falhas difíceis de corrigir.

## Conclusão

Evitar esses 5 erros simples já garante resultados muito melhores. Cuide dos seus cílios e eles recompensam combeleza duradoura.',
  ARRAY['erros', 'cilios', 'extensao', 'cuidados', 'dicas'],
  true
);