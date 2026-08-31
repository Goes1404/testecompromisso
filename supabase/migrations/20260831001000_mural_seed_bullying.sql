-- Conteúdo que estreia o mural: a campanha "Bullying é Crime!" e o pedido de
-- trabalho da professora Priscila Lima para o sábado 05/09/2026.
--
-- Entra por migration, e não pela tela, porque os dois já circularam no WhatsApp
-- em 31/08 e precisam estar no ar no mesmo dia em que o mural sobe — não faz
-- sentido pedir para a professora redigitar seis questões que ela já escreveu.
-- IDs fixos: rodar de novo não duplica o cartaz na turma.
--
-- `autor_id` sai de uma busca por nome em `profiles`; se a conta não for
-- encontrada o post fica sem autor vinculado e assinado só por `autor_nome`,
-- que é o que a tela mostra de qualquer jeito.

INSERT INTO public.mural_posts
  (id, tipo, titulo, tema, descricao, questoes, instrucoes, entrega_em, imagem_url, destaque, autor_id, autor_nome, created_at)
VALUES (
  '9a1f1c4e-0b7a-4b3e-8f21-4d5c6e7a8b01',
  'anuncio',
  'Bullying é Crime! Não se cale.',
  'Bullying, comportamento humano e responsabilidade social',
  E'Humilhar, intimidar, excluir ou agredir não é brincadeira.\n\nÉ considerado bullying: apelidos ofensivos e xingamentos; zombarias e humilhações repetitivas; ameaças e intimidação; agressões físicas; exclusão proposital do grupo; espalhar boatos ou expor ao ridículo; danificar ou esconder pertences; ofensas nas redes sociais (cyberbullying).\n\nLei nº 14.811/2024: bullying e cyberbullying são crimes. A intimidação sistemática pode gerar multa e, no meio virtual, reclusão de 2 a 4 anos e multa. Em casos mais graves, outras penalidades também podem se aplicar.\n\nDENUNCIE. Se você está sofrendo ou conhece alguém que esteja sofrendo bullying, procure imediatamente nossa direção ou equipe pedagógica.\n\nRespeito sempre. Empatia transforma. Juntos por um ambiente escolar seguro.',
  '[]'::jsonb,
  NULL,
  NULL,
  '/mural/bullying-e-crime.jpg',
  true,
  (SELECT id FROM public.profiles
     WHERE COALESCE(full_name, name) ILIKE 'Priscila Lima'
       AND role::text IN ('teacher', 'admin', 'staff')
     ORDER BY id LIMIT 1),
  'Priscila Lima',
  '2026-08-31 19:53:00-03'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.mural_posts
  (id, tipo, titulo, tema, descricao, questoes, instrucoes, entrega_em, imagem_url, destaque, autor_id, autor_nome, created_at)
VALUES (
  '9a1f1c4e-0b7a-4b3e-8f21-4d5c6e7a8b02',
  'trabalho',
  'Atividade para o próximo sábado – 05/09',
  'Bullying, comportamento humano e responsabilidade social',
  E'Para o próximo sábado, TODOS os alunos deverão realizar uma pesquisa individual sobre o bullying sob a perspectiva da Psicologia.\n\nA proposta não é apenas definir o que é bullying, mas compreender por que uma pessoa sente necessidade de humilhar, ridicularizar ou diminuir outra, principalmente diante de outras pessoas, quais consequências isso provoca e qual é a responsabilidade de quem presencia esse tipo de comportamento.\n\nTODOS TRARÃO SÁBADO QUE VEM!',
  jsonb_build_array(
    E'O que é bullying e quais características diferenciam bullying de uma simples brincadeira ou conflito entre duas pessoas?',
    E'Segundo a Psicologia, quais fatores podem levar uma pessoa a praticar bullying?',
    E'Por que algumas pessoas tentam ridicularizar outra pessoa principalmente quando estão na presença de um grupo?',
    E'A necessidade de aprovação, popularidade, poder ou status dentro de um grupo pode contribuir para o bullying? Explique.',
    E'Insegurança, baixa autoestima ou problemas emocionais do agressor podem estar relacionados ao comportamento de humilhar outras pessoas? De que maneira?',
    E'O bullying acontece somente por agressões físicas? Apresente exemplos de bullying verbal, psicológico, social e virtual.',
    E'Depois da pesquisa: o que o comportamento de uma pessoa que precisa diminuir outra para se destacar pode revelar sobre ela própria?'
  ),
  E'Após responder todas as questões, escreva um texto de 15 a 25 linhas sobre o tema:\n\n"Quando a diversão de um grupo depende da necessidade de humilhar alguém, ainda podemos chamar isso de brincadeira?"\n\nO texto deverá apresentar uma reflexão baseada no que vocês pesquisaram, e não apenas uma opinião pessoal.\n\n📌 IMPORTANTE\nUtilizem fontes confiáveis: artigos de Psicologia, universidades, instituições de saúde, livros, pesquisas acadêmicas e materiais de órgãos oficiais.\nAo final, indiquem pelo menos duas fontes utilizadas na pesquisa.',
  '2026-09-05',
  NULL,
  true,
  (SELECT id FROM public.profiles
     WHERE COALESCE(full_name, name) ILIKE 'Priscila Lima'
       AND role::text IN ('teacher', 'admin', 'staff')
     ORDER BY id LIMIT 1),
  'Priscila Lima',
  '2026-08-31 19:54:00-03'
)
ON CONFLICT (id) DO NOTHING;
