# Revisão dos requisitos — 30 de setembro de 2026

Revisão técnica das 12 vagas ativas, através de uma consulta SELECT de título, descrição, competências obrigatórias e preferenciais. Nenhum registo foi alterado. Esta revisão não constitui avaliação de candidatos por um recrutador nem confirmação de requisitos pela empresa.

## Problemas confirmados nos dados

| Caso | Evidência observada | Consequência e ação |
| --- | --- | --- |
| Frontend Developer Junior | Descrição «Isto é uma vaga» e listas de competências vazias | Não permite validar a adequação. A empresa precisa de completar responsabilidades e requisitos antes de recomendar automaticamente. |
| Diretor de Marketing na metalomecânica | «Strategia de marketing» consta como obrigatório | Erro lexical reconhecido pelo dicionário do motor, sem alterar o registo original. |
| Diretor de Produção | «controle de qualidade» | Variante de escrita reconhecida como «controlo de qualidade». |
| Diretor Financeiro | «metalurgia» consta como competência obrigatória; a descrição identifica o setor da empresa | Confirmar se experiência no setor é obrigatória ou preferencial. O motor não deve decidir essa intenção. |
| Professor Ensino Básico | Uma licenciatura consta na lista de competências | Separar habilitação e competência; validar a qualificação exigida e a sua evidência. Não inferir habilitação a partir de palavras semelhantes. |
| Motorista de Pesados | Carta CE, experiência e disponibilidade presencial estão na mesma lista | Separar credencial, experiência e disponibilidade. Exigir confirmação da credencial; não aceitar uma carta de categoria diferente. |
| Designer pré-impressão | «Software Adobe (Illustrator, Photoshop, InDesign)» é um único requisito | Confirmar se exige todas as ferramentas ou admite alternativas; correspondência lexical individual não resolve esta ambiguidade. |
| Ajudante de pedreiro | «resistência física» consta como obrigatório | Definir as tarefas essenciais e como se verifica capacidade para as executar; avaliar a necessidade deste critério com supervisão humana. |

Não encontrar uma expressão na descrição não demonstra que o requisito é inválido. A fonte de verdade sobre obrigatoriedade continua a ser a empresa. As restantes vagas não ficam certificadas por não aparecerem nesta tabela.

## Alterações do motor verificadas

O dicionário reconhece a grafia incorreta «Strategia de marketing», a variante «marketing estratégico» e «controle de qualidade». São equivalências lexicais exatas. Continuam distintos planeamento estratégico, desenvolvimento e gestão de campanhas, análise de mercado e de dados, gestão de orçamento e orçamentação. Estas relações exigem evidência ou uma decisão fundamentada de produto, em vez de uma equivalência automática.

Foram executados 17 testes de matching, todos aprovados, incluindo novos casos positivos e negativos e as 512 combinações de campos opcionais já existentes. Os testes são sintéticos: não medem precisão de recrutamento. O resultado anterior de 60 comparações não foi recalculado nesta revisão e não deve ser apresentado como resultado deste dicionário atualizado.

## Ordem para retomar a validação

1. Completar a vaga provisória e confirmar os requisitos ambíguos com as empresas.
2. Estruturar os requisitos como competência, habilitação, credencial, experiência ou preferência, com obrigatoriedade e origem confirmadas.
3. Recolher a evidência em falta nos perfis, permitindo correção pelo candidato.
4. Pedir a um recrutador uma avaliação independente dos nove casos possíveis do piloto anterior e de uma amostra dos restantes; ocultar inicialmente a pontuação e distinguir incompatibilidade de informação insuficiente.
5. Repetir o piloto com o dicionário atualizado e calcular precisão/recall apenas quando existirem etiquetas independentes, incluindo uma amostra que não tenha sido usada para ajustar as regras.
6. Decidir a adoção após essa validação. A revisão atual mantém-se numa branch de desenvolvimento; nenhum resultado de produção foi substituído.
