# Vagas, candidaturas e notificações

As vagas têm validade inicial de 30 dias. Na revisão, a empresa tem sete dias para confirmar. A confirmação inicia novo período de 30 dias; a resposta negativa desativa imediatamente; a ausência de resposta desativa na próxima execução horária. O histórico de candidaturas e matches é conservado.

Os campos de validade são geridos por trigger e RPC de renovação, com verificação da propriedade e do perfil protegido. Editar o conteúdo não renova o prazo. Reativar uma vaga inicia novo ciclo. As vagas antigas vencidas aguardam a primeira revisão, sem desativação imediata.

O Supabase Cron executa `process_job_lifecycle` a cada hora, aos cinco minutos. A função bloqueia cada vaga e evita avisos duplicados. O servidor impede novas candidaturas após o prazo de resposta, mesmo antes da execução que desativa a vaga.

Novas candidaturas e alterações para aceite/recusada criam notificações na mesma transação. A aceitação de um perfil em matches também cria um evento. Os destinatários são derivados no servidor; os canais respeitam as preferências. A notificação na plataforma é sempre conservada.

O navegador pede o envio imediato após candidatura/decisão; uma falha do navegador não perde o evento. A fila de email permite até cinco tentativas, com intervalo diário, lease de dez minutos e lote de vinte. O serviço de email usa chave de idempotência; não há garantia de exatamente uma entrega após uma falha ambígua do fornecedor fora da janela de idempotência. Após cinco tentativas, o estado permanece `failed` para intervenção operacional.

A Vercel tem tarefa diária às 08:00 UTC para envio/repetição de emails e revisão redundante das vagas. Requer `CRON_SECRET`, `RESEND_API_KEY` e as variáveis Supabase existentes. O conector Vercel desta sessão apenas lista outro projeto; não foi possível confirmar os nomes das variáveis no projeto ARYNQO. Sem chave de email a fila é conservada e o endpoint devolve 503. Não regista emails nem tokens nos logs.

`Ver candidaturas` seleciona a vaga e não filtra pela pontuação. `Ver matches` seleciona a vaga correta e conserva os critérios de recomendação. Contas de administrador com empresa própria podem gerir estados das suas candidaturas, sem acesso a candidaturas de outras empresas.

Validação: teste PGlite de prazo, renovação, revisão única, desativação, notificações transacionais, claims da fila e ausência de permissões públicas; testes de segurança existentes; TypeScript. Testes de envio real e percurso autenticado de empresa permanecem por validar. As candidaturas históricas não são reenviadas automaticamente.
