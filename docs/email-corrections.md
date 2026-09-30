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

O template hospedado, URL Configuration, SMTP e domínio do remetente exigem acesso ao painel Supabase/Resend/Vercel. A entrada no painel foi tentada por GitHub, que recusou as credenciais. É necessário concluir manualmente a autenticação. O conector Supabase disponível não expõe operações de configuração Auth. O ficheiro HTML no repositório não altera automaticamente o email enviado pelo Supabase. A receção e confirmação com um email novo permanecem por validar.
