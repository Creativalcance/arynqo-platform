type RecoveryError = { code?: string; status?: number };

function recoveryFeedback(error?: RecoveryError | null) {
  if (error?.code === "same_password") return {
    message: "A nova palavra-passe tem de ser diferente da atual. Escolhe outra palavra-passe e tenta novamente.",
    needsNewLink: false,
  };
  if (error?.code === "weak_password") return {
    message: "A palavra-passe não cumpre os requisitos de segurança. Escolhe uma palavra-passe mais longa e inclui letras, números e símbolos.",
    needsNewLink: false,
  };
  if (error?.status === 429 || ["over_request_rate_limit", "over_email_send_rate_limit"].includes(error?.code || "")) return {
    message: "Demasiadas tentativas. Aguarda alguns minutos e tenta novamente.",
    needsNewLink: false,
  };
  if (["session_not_found", "session_expired", "refresh_token_not_found", "refresh_token_already_used", "bad_jwt", "otp_expired", "reauthentication_needed"].includes(error?.code || "") || error?.status === 401) return {
    message: "A sessão de recuperação expirou ou deixou de ser válida. Pede uma nova ligação de recuperação.",
    needsNewLink: true,
  };
  return {
    message: "Não foi possível guardar a palavra-passe. Tenta novamente dentro de alguns instantes.",
    needsNewLink: false,
  };
}

const translations: Record<string, Record<string,string>> = {
  "en": {
    "A nova palavra-passe tem de ser diferente da atual. Escolhe outra palavra-passe e tenta novamente.": "Your new password must be different from your current password. Choose another password and try again.",
    "A palavra-passe não cumpre os requisitos de segurança. Escolhe uma palavra-passe mais longa e inclui letras, números e símbolos.": "Your password does not meet the security requirements. Choose a longer password and include letters, numbers and symbols.",
    "Demasiadas tentativas. Aguarda alguns minutos e tenta novamente.": "Too many attempts. Wait a few minutes and try again.",
    "A sessão de recuperação expirou ou deixou de ser válida. Pede uma nova ligação de recuperação.": "Your recovery session has expired or is no longer valid. Request a new recovery link.",
    "Não foi possível guardar a palavra-passe. Tenta novamente dentro de alguns instantes.": "Your password could not be saved. Try again in a few moments."
  },
  "fr": {
    "A nova palavra-passe tem de ser diferente da atual. Escolhe outra palavra-passe e tenta novamente.": "Votre nouveau mot de passe doit être différent du mot de passe actuel. Choisissez-en un autre et réessayez.",
    "A palavra-passe não cumpre os requisitos de segurança. Escolhe uma palavra-passe mais longa e inclui letras, números e símbolos.": "Le mot de passe ne respecte pas les exigences de sécurité. Choisissez un mot de passe plus long contenant des lettres, des chiffres et des symboles.",
    "Demasiadas tentativas. Aguarda alguns minutos e tenta novamente.": "Trop de tentatives. Patientez quelques minutes et réessayez.",
    "A sessão de recuperação expirou ou deixou de ser válida. Pede uma nova ligação de recuperação.": "La session de récupération a expiré ou n’est plus valide. Demandez un nouveau lien de récupération.",
    "Não foi possível guardar a palavra-passe. Tenta novamente dentro de alguns instantes.": "Impossible d’enregistrer le mot de passe. Réessayez dans quelques instants."
  },
  "es": {
    "A nova palavra-passe tem de ser diferente da atual. Escolhe outra palavra-passe e tenta novamente.": "La nueva contraseña debe ser diferente de la actual. Elige otra contraseña e inténtalo de nuevo.",
    "A palavra-passe não cumpre os requisitos de segurança. Escolhe uma palavra-passe mais longa e inclui letras, números e símbolos.": "La contraseña no cumple los requisitos de seguridad. Elige una contraseña más larga que incluya letras, números y símbolos.",
    "Demasiadas tentativas. Aguarda alguns minutos e tenta novamente.": "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
    "A sessão de recuperação expirou ou deixou de ser válida. Pede uma nova ligação de recuperação.": "La sesión de recuperación ha caducado o ya no es válida. Solicita un nuevo enlace de recuperación.",
    "Não foi possível guardar a palavra-passe. Tenta novamente dentro de alguns instantes.": "No se ha podido guardar la contraseña. Inténtalo de nuevo dentro de unos instantes."
  },
  "de": {
    "A nova palavra-passe tem de ser diferente da atual. Escolhe outra palavra-passe e tenta novamente.": "Dein neues Passwort muss sich vom aktuellen unterscheiden. Wähle ein anderes Passwort und versuche es erneut.",
    "A palavra-passe não cumpre os requisitos de segurança. Escolhe uma palavra-passe mais longa e inclui letras, números e símbolos.": "Das Passwort erfüllt die Sicherheitsanforderungen nicht. Wähle ein längeres Passwort mit Buchstaben, Zahlen und Sonderzeichen.",
    "Demasiadas tentativas. Aguarda alguns minutos e tenta novamente.": "Zu viele Versuche. Warte einige Minuten und versuche es erneut.",
    "A sessão de recuperação expirou ou deixou de ser válida. Pede uma nova ligação de recuperação.": "Die Sitzung zur Passwortwiederherstellung ist abgelaufen oder nicht mehr gültig. Fordere einen neuen Wiederherstellungslink an.",
    "Não foi possível guardar a palavra-passe. Tenta novamente dentro de alguns instantes.": "Das Passwort konnte nicht gespeichert werden. Versuche es in Kürze erneut."
  },
  "it": {
    "A nova palavra-passe tem de ser diferente da atual. Escolhe outra palavra-passe e tenta novamente.": "La nuova password deve essere diversa da quella attuale. Scegli un’altra password e riprova.",
    "A palavra-passe não cumpre os requisitos de segurança. Escolhe uma palavra-passe mais longa e inclui letras, números e símbolos.": "La password non soddisfa i requisiti di sicurezza. Scegli una password più lunga con lettere, numeri e simboli.",
    "Demasiadas tentativas. Aguarda alguns minutos e tenta novamente.": "Troppi tentativi. Attendi qualche minuto e riprova.",
    "A sessão de recuperação expirou ou deixou de ser válida. Pede uma nova ligação de recuperação.": "La sessione di recupero è scaduta o non è più valida. Richiedi un nuovo link di recupero.",
    "Não foi possível guardar a palavra-passe. Tenta novamente dentro de alguns instantes.": "Non è stato possibile salvare la password. Riprova tra qualche istante."
  }
};

export function passwordRecoveryError(error?: RecoveryError | null, locale = "pt") {
  const feedback = recoveryFeedback(error);
  return {...feedback, message: translations[locale]?.[feedback.message] || feedback.message};
}
