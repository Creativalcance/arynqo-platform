# Email de confirmação ARYNQO

Template de produção: `confirmation.html`.

- Assunto: **Confirma o teu email | ARYNQO**
- Site URL: **https://arynqo-platform.vercel.app**
- Redirect URLs: preservar os endereços válidos existentes e incluir **https://arynqo-platform.vercel.app/auth/confirm**. Preservar `/login` para emails antigos, enquanto necessário.
- No painel Supabase → Authentication → Emails → Confirm sign up, aplicar o assunto e conteúdo HTML.
- Manter a confirmação de email ativa. Não resolver erros desativando a confirmação.
- O botão usa `.SiteURL` e `.TokenHash`, que são variáveis oficiais Supabase. A página GET não consome o token; a confirmação acontece após clique explícito, por POST. O servidor verifica exclusivamente type=email e não devolve sessões.
- Este ficheiro não configura o serviço hospedado por si só. A aplicação no painel e a leitura posterior dos valores são necessárias.

Se o erro ocorre ao enviar, verificar SMTP, remetente/domínio verificado, limites e logs Auth. Se ocorre ao abrir, verificar Site URL, token expirado/consumido e URL de destino. Não há prova nos logs consultados de qual destes casos corresponde ao erro relatado.

Os emails de notificação são enviados separadamente por Resend. `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL` e `NEXT_PUBLIC_APP_URL` devem estar configurados no ambiente de produção, sem expor segredos no frontend. O domínio do remetente precisa de estar verificado no Resend. Não se certifica essa configuração apenas pela presença de código.

Validar com destinatário de teste autorizado: receber um novo email, abrir o botão, confirmar, iniciar sessão; repetir o link para verificar a mensagem de utilização/expiração. Não copiar URLs com tokens para relatórios. Para notificações, usar um evento descartável válido e verificar preferências ativas/desativadas, rejeição do fornecedor e receção. `sent` significa aceitação pela API, não entrega à caixa de entrada. Não há webhook de entrega nem fila automática de retentativas neste âmbito.
