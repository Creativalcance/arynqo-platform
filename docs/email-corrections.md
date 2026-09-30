# Confirmação e notificações por email — 30 de setembro de 2026

## Diagnóstico confirmado

O registo usava `/login` como destino, sem uma página dedicada de confirmação. Nos logs Auth das últimas 24 horas, consultados por códigos e contagens, não se confirmou o erro de confirmação relatado. A tabela de notificações estava vazia. Não se pode inferir entrega, validade SMTP ou configuração Resend a partir destes dados.

O serviço de notificações tinha HTML básico, sem logótipo ou versão em texto. Erros de rede durante o pedido Resend escapavam para o catch geral e podiam deixar o estado pending. Erros na consulta de preferências eram tratados como preferências inexistentes e ativavam o envio por defeito. A gravação do resultado de envio não verificava erros.

## Implementação

- Template PT-PT de confirmação, logótipo existente, azul #1683FF, texto #07111F, fundo #F7F9FC e botão de ação. Assunto: Confirma o teu email | ARYNQO.
- `/auth/confirm`: confirmação explícita para evitar consumo do token por pré-visualização GET, mensagens úteis, possibilidade de pedir novo email e ligação ao login. Usa o fragmento do URL no novo template, evitando enviar o token no pedido GET; limpa-o após sucesso, com noindex e no-referrer. Aceita também o formato query para compatibilidade.
- POST `/api/auth/confirm`: origem igual à aplicação, validação do formato, tipo email fixo, timeout, sem sessão/cookies no resultado e sem logs de tokens. Supabase continua a impor validade e limites Auth.
- Registo aponta para a página de confirmação; login disponibiliza ligação para confirmação/reenvio.
- Emails de notificação com o mesmo branding, assunto ARYNQO, versão de texto, preferências e destinos restritos à plataforma.
- Resend: idempotency key por evento, timeout, validação da aceitação pelo fornecedor e erros sem detalhes privados. Falhas de rede passam a failed; erro de preferências impede envio; falha ao guardar estado é comunicada explicitamente.

## Verificação e limitações

Quatro testes de email passaram: escaping/destinos, resposta Resend/timeout/configuração ausente, origem/input de confirmação e confirmação/expiração com Auth simulado. Não enviaram mensagens reais. TypeScript e lint dos ficheiros de email passaram. Os 12 testes de segurança e o build Webpack com configuração sintética também passaram.

O template de confirmação foi aplicado no painel Supabase e confirmado após recarregar a página. O painel mostrou Site URL `http://localhost:3000`, sem Redirect URLs, e envio Auth integrado, sem SMTP próprio. Foi submetida a mudança do Site URL para o domínio Vercel; a confirmação posterior e a gravação dos Redirect URLs ficaram interrompidas pelo tempo limite do navegador. Não se certifica o estado final dessas definições.

Em 30 de setembro, `https://arynqo.com/auth/confirm` respondeu com 308 para `https://www.arynqo.com/auth/confirm`; o destino respondeu com 200, HTTPS válido, no-referrer e cache privado no-store. O código e o template no repositório passam a usar www.arynqo.com. O template hospedado ainda usa o logótipo do domínio Vercel e o botão `.SiteURL`; falta alterar e verificar Site URL para `https://www.arynqo.com` e autorizar `/auth/confirm` e `/login`. A ligação Vercel disponível continua a mostrar apenas outro projeto, pelo que não foi possível verificar as variáveis de produção.

O domínio web operacional não confirma o domínio de envio no Resend. SMTP, `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL` e entrega real permanecem por validar. A receção e confirmação com um email novo permanecem por validar.
