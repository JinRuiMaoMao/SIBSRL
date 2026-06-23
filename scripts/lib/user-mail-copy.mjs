/** @typedef {'register' | 'reset'} MailPurpose */
/** @typedef {'en' | 'zh-Hans' | 'zh-Hant' | 'ja' | 'ko' | 'de' | 'fr' | 'es' | 'pt-BR' | 'vi' | 'id' | 'fil' | 'da' | 'pl' | 'sv'} MailLocale */

/** @type {readonly MailLocale[]} */
export const MAIL_LOCALES = [
  'en',
  'zh-Hans',
  'zh-Hant',
  'ja',
  'ko',
  'de',
  'fr',
  'es',
  'pt-BR',
  'vi',
  'id',
  'fil',
  'da',
  'pl',
  'sv',
]

/** @type {Record<MailLocale, string>} */
export const MAIL_LOCALE_LABELS = {
  en: 'English',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
  ja: '日本語',
  ko: '한국어',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  'pt-BR': 'Português (Brasil)',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
  fil: 'Filipino',
  da: 'Dansk',
  pl: 'Polski',
  sv: 'Svenska',
}

/** @param {unknown} locale */
export function normalizeMailLocale(locale) {
  const raw = String(locale ?? '')
    .trim()
    .replace(/_/g, '-')
  if (MAIL_LOCALES.includes(/** @type {MailLocale} */ (raw))) {
    return /** @type {MailLocale} */ (raw)
  }

  const lower = raw.toLowerCase()
  if (lower === 'zh' || lower === 'zh-cn' || lower === 'zh-hans') return 'zh-Hans'
  if (lower === 'zh-tw' || lower === 'zh-hk' || lower === 'zh-hant') return 'zh-Hant'
  if (lower.startsWith('zh')) return 'zh-Hans'

  const primary = lower.split('-')[0]
  /** @type {Record<string, MailLocale>} */
  const byPrimary = {
    en: 'en',
    ja: 'ja',
    ko: 'ko',
    de: 'de',
    fr: 'fr',
    es: 'es',
    pt: 'pt-BR',
    vi: 'vi',
    id: 'id',
    fil: 'fil',
    tl: 'fil',
    da: 'da',
    pl: 'pl',
    sv: 'sv',
  }
  return byPrimary[primary] ?? 'en'
}

/** @param {MailLocale} primary */
export function orderMailLocales(primary) {
  const normalized = normalizeMailLocale(primary)
  /** @type {MailLocale[]} */
  const full = []
  for (const locale of [normalized, 'en', 'zh-Hans', 'zh-Hant']) {
    if (!full.includes(locale)) full.push(locale)
  }
  const summary = MAIL_LOCALES.filter((locale) => !full.includes(locale))
  return { full, summary, primary: normalized }
}

/** @type {Record<MailPurpose, Record<MailLocale, {
 *   subject: string,
 *   preheader: string,
 *   headline: string,
 *   intro: string,
 *   codeLabel: string,
 *   expiry: string,
 *   security: string,
 *   action: string,
 *   siteLabel: string,
 *   accountLabel: string,
 *   footer: string,
 *   summary: string,
 *   otherLanguagesTitle: string,
 * }>>} */
export const MAIL_COPY = {
  register: {
    en: {
      subject: 'SIBS Route Lookup — Complete your registration',
      preheader: 'Your registration code is valid for 10 minutes.',
      headline: 'Confirm your registration',
      intro:
        'You are signing up for a SIBS Route Lookup account with this email address. Enter the confirmation code on the registration page.',
      codeLabel: 'Your confirmation code',
      expiry: 'This code is valid for 10 minutes. Do not share it with anyone.',
      security: 'If you did not request this, ignore this email. Your account will not be changed.',
      action: 'Complete registration',
      siteLabel: 'App home',
      accountLabel: 'Account page',
      footer: 'Automated message from SIBS Route Lookup. Please do not reply.',
      summary:
        'Registration confirmation. Code valid for 10 minutes. Ignore this email if you did not sign up.',
      otherLanguagesTitle: 'Other languages',
    },
    'zh-Hans': {
      subject: 'SIBS Route Lookup — 请完成账号注册',
      preheader: '您的注册确认码 10 分钟内有效。',
      headline: '确认您的账号注册',
      intro:
        '您正在使用邮箱注册 SIBS Route Lookup（SIBS 线路查询）账号。请在注册页面输入下方确认码以完成验证。',
      codeLabel: '您的确认码',
      expiry: '该确认码 10 分钟内有效。请勿将确认码告知他人。',
      security: '如非本人操作，请忽略此邮件，您的账号不会因此变更。',
      action: '完成注册',
      siteLabel: '应用主页',
      accountLabel: '账号页面',
      footer: '此邮件由 SIBS Route Lookup 系统自动发送，请勿直接回复。',
      summary: '账号注册确认。确认码 10 分钟内有效。如非本人操作请忽略。',
      otherLanguagesTitle: '其他语言',
    },
    'zh-Hant': {
      subject: 'SIBS Route Lookup — 請完成帳號註冊',
      preheader: '您的註冊確認碼 10 分鐘內有效。',
      headline: '確認您的帳號註冊',
      intro:
        '您正在使用電子郵件註冊 SIBS Route Lookup（SIBS 線路查詢）帳號。請在註冊頁面輸入下方確認碼以完成驗證。',
      codeLabel: '您的確認碼',
      expiry: '此確認碼 10 分鐘內有效。請勿將確認碼告知他人。',
      security: '若非本人操作，請忽略此郵件，您的帳號不會因此變更。',
      action: '完成註冊',
      siteLabel: '應用首頁',
      accountLabel: '帳號頁面',
      footer: '此郵件由 SIBS Route Lookup 系統自動發送，請勿直接回覆。',
      summary: '帳號註冊確認。確認碼 10 分鐘內有效。若非本人操作請忽略。',
      otherLanguagesTitle: '其他語言',
    },
    ja: {
      subject: 'SIBS Route Lookup — アカウント登録の確認',
      preheader: '登録確認コードの有効期限は 10 分です。',
      headline: 'アカウント登録の確認',
      intro:
        'このメールアドレスで SIBS Route Lookup アカウントの登録がリクエストされました。登録ページで下の確認コードを入力してください。',
      codeLabel: '確認コード',
      expiry: 'このコードは 10 分間有効です。第三者に共有しないでください。',
      security: '心当たりがない場合は、このメールを無視してください。アカウントは変更されません。',
      action: '登録を完了',
      siteLabel: 'アプリのホーム',
      accountLabel: 'アカウントページ',
      footer: 'SIBS Route Lookup からの自動送信メールです。返信しないでください。',
      summary: '登録確認コードです。10 分間有効。心当たりがなければ無視してください。',
      otherLanguagesTitle: '他の言語',
    },
    ko: {
      subject: 'SIBS Route Lookup — 회원가입 확인',
      preheader: '가입 확인 코드는 10분 동안 유효합니다.',
      headline: '회원가입 확인',
      intro:
        '이 이메일 주소로 SIBS Route Lookup 계정 가입이 요청되었습니다. 가입 페이지에서 아래 확인 코드를 입력하세요.',
      codeLabel: '확인 코드',
      expiry: '이 코드는 10분 동안 유효합니다. 다른 사람과 공유하지 마세요.',
      security: '본인이 요청하지 않았다면 이 메일을 무시하세요. 계정은 변경되지 않습니다.',
      action: '가입 완료',
      siteLabel: '앱 홈',
      accountLabel: '계정 페이지',
      footer: 'SIBS Route Lookup 자동 발송 메일입니다. 회신하지 마세요.',
      summary: '가입 확인 코드입니다. 10분 유효. 본인 요청이 아니면 무시하세요.',
      otherLanguagesTitle: '다른 언어',
    },
    de: {
      subject: 'SIBS Route Lookup — Registrierung abschließen',
      preheader: 'Ihr Registrierungscode ist 10 Minuten gültig.',
      headline: 'Registrierung bestätigen',
      intro:
        'Mit dieser E-Mail-Adresse wurde die Registrierung eines SIBS Route Lookup-Kontos angefordert. Geben Sie den Code auf der Registrierungsseite ein.',
      codeLabel: 'Ihr Bestätigungscode',
      expiry: 'Dieser Code ist 10 Minuten gültig. Teilen Sie ihn mit niemandem.',
      security: 'Falls Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail. Ihr Konto bleibt unverändert.',
      action: 'Registrierung abschließen',
      siteLabel: 'App-Startseite',
      accountLabel: 'Kontoseite',
      footer: 'Automatische Nachricht von SIBS Route Lookup. Bitte nicht antworten.',
      summary: 'Registrierungsbestätigung. Code 10 Min. gültig. Ignorieren, falls nicht angefordert.',
      otherLanguagesTitle: 'Weitere Sprachen',
    },
    fr: {
      subject: 'SIBS Route Lookup — Finaliser votre inscription',
      preheader: 'Votre code d’inscription est valable 10 minutes.',
      headline: 'Confirmer votre inscription',
      intro:
        'Une inscription à SIBS Route Lookup a été demandée avec cette adresse e-mail. Saisissez le code sur la page d’inscription.',
      codeLabel: 'Votre code de confirmation',
      expiry: 'Ce code est valable 10 minutes. Ne le partagez avec personne.',
      security: 'Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail. Votre compte ne sera pas modifié.',
      action: 'Terminer l’inscription',
      siteLabel: 'Accueil de l’application',
      accountLabel: 'Page du compte',
      footer: 'Message automatique de SIBS Route Lookup. Merci de ne pas répondre.',
      summary: 'Confirmation d’inscription. Code valable 10 min. Ignorez si non demandé.',
      otherLanguagesTitle: 'Autres langues',
    },
    es: {
      subject: 'SIBS Route Lookup — Completa tu registro',
      preheader: 'Tu código de registro es válido durante 10 minutos.',
      headline: 'Confirma tu registro',
      intro:
        'Se solicitó crear una cuenta de SIBS Route Lookup con este correo. Introduce el código en la página de registro.',
      codeLabel: 'Tu código de confirmación',
      expiry: 'Este código es válido durante 10 minutos. No lo compartas con nadie.',
      security: 'Si no solicitaste esto, ignora este correo. Tu cuenta no se modificará.',
      action: 'Completar registro',
      siteLabel: 'Inicio de la app',
      accountLabel: 'Página de cuenta',
      footer: 'Mensaje automático de SIBS Route Lookup. No respondas a este correo.',
      summary: 'Confirmación de registro. Código válido 10 min. Ignora si no lo pediste.',
      otherLanguagesTitle: 'Otros idiomas',
    },
    'pt-BR': {
      subject: 'SIBS Route Lookup — Conclua seu cadastro',
      preheader: 'Seu código de cadastro é válido por 10 minutos.',
      headline: 'Confirme seu cadastro',
      intro:
        'Foi solicitada a criação de uma conta SIBS Route Lookup com este e-mail. Digite o código na página de cadastro.',
      codeLabel: 'Seu código de confirmação',
      expiry: 'Este código é válido por 10 minutos. Não compartilhe com ninguém.',
      security: 'Se você não solicitou isso, ignore este e-mail. Sua conta não será alterada.',
      action: 'Concluir cadastro',
      siteLabel: 'Página inicial do app',
      accountLabel: 'Página da conta',
      footer: 'Mensagem automática do SIBS Route Lookup. Não responda.',
      summary: 'Confirmação de cadastro. Código válido por 10 min. Ignore se não foi você.',
      otherLanguagesTitle: 'Outros idiomas',
    },
    vi: {
      subject: 'SIBS Route Lookup — Hoàn tất đăng ký',
      preheader: 'Mã đăng ký có hiệu lực trong 10 phút.',
      headline: 'Xác nhận đăng ký',
      intro:
        'Email này được dùng để đăng ký tài khoản SIBS Route Lookup. Nhập mã xác nhận trên trang đăng ký.',
      codeLabel: 'Mã xác nhận của bạn',
      expiry: 'Mã có hiệu lực trong 10 phút. Không chia sẻ với người khác.',
      security: 'Nếu bạn không yêu cầu, hãy bỏ qua email này. Tài khoản sẽ không thay đổi.',
      action: 'Hoàn tất đăng ký',
      siteLabel: 'Trang chủ ứng dụng',
      accountLabel: 'Trang tài khoản',
      footer: 'Email tự động từ SIBS Route Lookup. Vui lòng không trả lời.',
      summary: 'Xác nhận đăng ký. Mã hiệu lực 10 phút. Bỏ qua nếu không phải bạn.',
      otherLanguagesTitle: 'Ngôn ngữ khác',
    },
    id: {
      subject: 'SIBS Route Lookup — Selesaikan pendaftaran',
      preheader: 'Kode pendaftaran berlaku selama 10 menit.',
      headline: 'Konfirmasi pendaftaran',
      intro:
        'Pendaftaran akun SIBS Route Lookup diminta dengan email ini. Masukkan kode di halaman pendaftaran.',
      codeLabel: 'Kode konfirmasi Anda',
      expiry: 'Kode ini berlaku selama 10 menit. Jangan bagikan kepada siapa pun.',
      security: 'Jika Anda tidak meminta ini, abaikan email ini. Akun Anda tidak akan berubah.',
      action: 'Selesaikan pendaftaran',
      siteLabel: 'Beranda aplikasi',
      accountLabel: 'Halaman akun',
      footer: 'Pesan otomatis dari SIBS Route Lookup. Jangan membalas.',
      summary: 'Konfirmasi pendaftaran. Kode berlaku 10 menit. Abaikan jika bukan Anda.',
      otherLanguagesTitle: 'Bahasa lain',
    },
    fil: {
      subject: 'SIBS Route Lookup — Kumpletuhin ang pagrehistro',
      preheader: 'Ang registration code ay may bisa sa loob ng 10 minuto.',
      headline: 'Kumpirmahin ang pagrehistro',
      intro:
        'Hiniling ang pagrehistro ng SIBS Route Lookup account gamit ang email na ito. Ilagay ang code sa registration page.',
      codeLabel: 'Iyong confirmation code',
      expiry: 'May bisa ang code sa loob ng 10 minuto. Huwag ibahagi sa iba.',
      security: 'Kung hindi ikaw ang humiling, huwag pansinin ang email na ito. Hindi magbabago ang account mo.',
      action: 'Kumpletuhin ang pagrehistro',
      siteLabel: 'Home ng app',
      accountLabel: 'Account page',
      footer: 'Awtomatikong mensahe mula sa SIBS Route Lookup. Huwag sumagot.',
      summary: 'Kumpirmasyon ng pagrehistro. May bisa ang code sa 10 minuto. Huwag pansinin kung hindi ikaw.',
      otherLanguagesTitle: 'Iba pang wika',
    },
    da: {
      subject: 'SIBS Route Lookup — Fuldfør din registrering',
      preheader: 'Din registreringskode er gyldig i 10 minutter.',
      headline: 'Bekræft din registrering',
      intro:
        'Der er anmodet om oprettelse af en SIBS Route Lookup-konto med denne e-mail. Indtast koden på registreringssiden.',
      codeLabel: 'Din bekræftelseskode',
      expiry: 'Koden er gyldig i 10 minutter. Del den ikke med andre.',
      security: 'Hvis du ikke har anmodet om dette, kan du ignorere e-mailen. Din konto ændres ikke.',
      action: 'Fuldfør registrering',
      siteLabel: 'App-forside',
      accountLabel: 'Kontoside',
      footer: 'Automatisk besked fra SIBS Route Lookup. Svar venligst ikke.',
      summary: 'Registreringsbekræftelse. Kode gyldig i 10 min. Ignorer hvis ikke anmodet.',
      otherLanguagesTitle: 'Andre sprog',
    },
    pl: {
      subject: 'SIBS Route Lookup — Dokończ rejestrację',
      preheader: 'Kod rejestracyjny jest ważny przez 10 minut.',
      headline: 'Potwierdź rejestrację',
      intro:
        'Zażądano rejestracji konta SIBS Route Lookup na ten adres e-mail. Wpisz kod na stronie rejestracji.',
      codeLabel: 'Twój kod potwierdzający',
      expiry: 'Kod jest ważny przez 10 minut. Nie udostępniaj go innym.',
      security: 'Jeśli to nie Ty, zignoruj tę wiadomość. Twoje konto nie zostanie zmienione.',
      action: 'Dokończ rejestrację',
      siteLabel: 'Strona główna aplikacji',
      accountLabel: 'Strona konta',
      footer: 'Automatyczna wiadomość od SIBS Route Lookup. Prosimy nie odpowiadać.',
      summary: 'Potwierdzenie rejestracji. Kod ważny 10 min. Zignoruj, jeśli nie prosiłeś.',
      otherLanguagesTitle: 'Inne języki',
    },
    sv: {
      subject: 'SIBS Route Lookup — Slutför din registrering',
      preheader: 'Din registreringskod är giltig i 10 minuter.',
      headline: 'Bekräfta din registrering',
      intro:
        'Registrering av ett SIBS Route Lookup-konto har begärts med den här e-postadressen. Ange koden på registreringssidan.',
      codeLabel: 'Din bekräftelsekod',
      expiry: 'Koden är giltig i 10 minuter. Dela den inte med någon.',
      security: 'Om du inte begärde detta kan du ignorera e-postmeddelandet. Ditt konto ändras inte.',
      action: 'Slutför registrering',
      siteLabel: 'Appens startsida',
      accountLabel: 'Kontosida',
      footer: 'Automatiskt meddelande från SIBS Route Lookup. Svara inte på detta meddelande.',
      summary: 'Registreringsbekräftelse. Kod giltig i 10 min. Ignorera om du inte begärde det.',
      otherLanguagesTitle: 'Andra språk',
    },
  },
  reset: {
    en: {
      subject: 'SIBS Route Lookup — Password reset request',
      preheader: 'Your password reset code is valid for 10 minutes.',
      headline: 'Confirm your password reset',
      intro:
        'We received a request to reset the password for your SIBS Route Lookup account. Enter the confirmation code on the reset page.',
      codeLabel: 'Your confirmation code',
      expiry: 'This code is valid for 10 minutes. Do not share it with anyone.',
      security: 'If you did not request this, ignore this email. Your password will not be changed.',
      action: 'Reset password',
      siteLabel: 'App home',
      accountLabel: 'Account page',
      footer: 'Automated message from SIBS Route Lookup. Please do not reply.',
      summary:
        'Password reset confirmation. Code valid for 10 minutes. Ignore this email if you did not request a reset.',
      otherLanguagesTitle: 'Other languages',
    },
    'zh-Hans': {
      subject: 'SIBS Route Lookup — 密码重置请求',
      preheader: '您的密码重置确认码 10 分钟内有效。',
      headline: '确认密码重置',
      intro:
        '我们收到了重置您 SIBS Route Lookup（SIBS 线路查询）账号密码的请求。请在重置页面输入下方确认码以继续。',
      codeLabel: '您的确认码',
      expiry: '该确认码 10 分钟内有效。请勿将确认码告知他人。',
      security: '如非本人操作，请忽略此邮件，您的密码不会因此变更。',
      action: '重置密码',
      siteLabel: '应用主页',
      accountLabel: '账号页面',
      footer: '此邮件由 SIBS Route Lookup 系统自动发送，请勿直接回复。',
      summary: '密码重置确认。确认码 10 分钟内有效。如非本人操作请忽略。',
      otherLanguagesTitle: '其他语言',
    },
    'zh-Hant': {
      subject: 'SIBS Route Lookup — 密碼重設請求',
      preheader: '您的密碼重設確認碼 10 分鐘內有效。',
      headline: '確認密碼重設',
      intro:
        '我們收到了重設您 SIBS Route Lookup（SIBS 線路查詢）帳號密碼的請求。請在重設頁面輸入下方確認碼以繼續。',
      codeLabel: '您的確認碼',
      expiry: '此確認碼 10 分鐘內有效。請勿將確認碼告知他人。',
      security: '若非本人操作，請忽略此郵件，您的密碼不會因此變更。',
      action: '重設密碼',
      siteLabel: '應用首頁',
      accountLabel: '帳號頁面',
      footer: '此郵件由 SIBS Route Lookup 系統自動發送，請勿直接回覆。',
      summary: '密碼重設確認。確認碼 10 分鐘內有效。若非本人操作請忽略。',
      otherLanguagesTitle: '其他語言',
    },
    ja: {
      subject: 'SIBS Route Lookup — パスワード再設定のリクエスト',
      preheader: 'パスワード再設定コードの有効期限は 10 分です。',
      headline: 'パスワード再設定の確認',
      intro:
        'SIBS Route Lookup アカウントのパスワード再設定がリクエストされました。再設定ページで下の確認コードを入力してください。',
      codeLabel: '確認コード',
      expiry: 'このコードは 10 分間有効です。第三者に共有しないでください。',
      security: '心当たりがない場合は、このメールを無視してください。パスワードは変更されません。',
      action: 'パスワードを再設定',
      siteLabel: 'アプリのホーム',
      accountLabel: 'アカウントページ',
      footer: 'SIBS Route Lookup からの自動送信メールです。返信しないでください。',
      summary: 'パスワード再設定の確認コードです。10 分間有効。心当たりがなければ無視してください。',
      otherLanguagesTitle: '他の言語',
    },
    ko: {
      subject: 'SIBS Route Lookup — 비밀번호 재설정 요청',
      preheader: '비밀번호 재설정 코드는 10분 동안 유효합니다.',
      headline: '비밀번호 재설정 확인',
      intro:
        'SIBS Route Lookup 계정 비밀번호 재설정이 요청되었습니다. 재설정 페이지에서 아래 확인 코드를 입력하세요.',
      codeLabel: '확인 코드',
      expiry: '이 코드는 10분 동안 유효합니다. 다른 사람과 공유하지 마세요.',
      security: '본인이 요청하지 않았다면 이 메일을 무시하세요. 비밀번호는 변경되지 않습니다.',
      action: '비밀번호 재설정',
      siteLabel: '앱 홈',
      accountLabel: '계정 페이지',
      footer: 'SIBS Route Lookup 자동 발송 메일입니다. 회신하지 마세요.',
      summary: '비밀번호 재설정 확인 코드입니다. 10분 유효. 본인 요청이 아니면 무시하세요.',
      otherLanguagesTitle: '다른 언어',
    },
    de: {
      subject: 'SIBS Route Lookup — Passwort zurücksetzen',
      preheader: 'Ihr Code zum Zurücksetzen ist 10 Minuten gültig.',
      headline: 'Passwort zurücksetzen bestätigen',
      intro:
        'Es wurde angefordert, das Passwort Ihres SIBS Route Lookup-Kontos zurückzusetzen. Geben Sie den Code auf der Reset-Seite ein.',
      codeLabel: 'Ihr Bestätigungscode',
      expiry: 'Dieser Code ist 10 Minuten gültig. Teilen Sie ihn mit niemandem.',
      security: 'Falls Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail. Ihr Passwort bleibt unverändert.',
      action: 'Passwort zurücksetzen',
      siteLabel: 'App-Startseite',
      accountLabel: 'Kontoseite',
      footer: 'Automatische Nachricht von SIBS Route Lookup. Bitte nicht antworten.',
      summary: 'Passwort-Reset-Bestätigung. Code 10 Min. gültig. Ignorieren, falls nicht angefordert.',
      otherLanguagesTitle: 'Weitere Sprachen',
    },
    fr: {
      subject: 'SIBS Route Lookup — Réinitialisation du mot de passe',
      preheader: 'Votre code de réinitialisation est valable 10 minutes.',
      headline: 'Confirmer la réinitialisation',
      intro:
        'Une réinitialisation du mot de passe de votre compte SIBS Route Lookup a été demandée. Saisissez le code sur la page prévue.',
      codeLabel: 'Votre code de confirmation',
      expiry: 'Ce code est valable 10 minutes. Ne le partagez avec personne.',
      security: 'Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail. Votre mot de passe ne sera pas modifié.',
      action: 'Réinitialiser le mot de passe',
      siteLabel: 'Accueil de l’application',
      accountLabel: 'Page du compte',
      footer: 'Message automatique de SIBS Route Lookup. Merci de ne pas répondre.',
      summary: 'Confirmation de réinitialisation. Code valable 10 min. Ignorez si non demandé.',
      otherLanguagesTitle: 'Autres langues',
    },
    es: {
      subject: 'SIBS Route Lookup — Restablecer contraseña',
      preheader: 'Tu código de restablecimiento es válido durante 10 minutos.',
      headline: 'Confirma el restablecimiento',
      intro:
        'Se solicitó restablecer la contraseña de tu cuenta SIBS Route Lookup. Introduce el código en la página de restablecimiento.',
      codeLabel: 'Tu código de confirmación',
      expiry: 'Este código es válido durante 10 minutos. No lo compartas con nadie.',
      security: 'Si no solicitaste esto, ignora este correo. Tu contraseña no se cambiará.',
      action: 'Restablecer contraseña',
      siteLabel: 'Inicio de la app',
      accountLabel: 'Página de cuenta',
      footer: 'Mensaje automático de SIBS Route Lookup. No respondas a este correo.',
      summary: 'Confirmación de restablecimiento. Código válido 10 min. Ignora si no lo pediste.',
      otherLanguagesTitle: 'Otros idiomas',
    },
    'pt-BR': {
      subject: 'SIBS Route Lookup — Redefinição de senha',
      preheader: 'Seu código de redefinição é válido por 10 minutos.',
      headline: 'Confirme a redefinição de senha',
      intro:
        'Foi solicitada a redefinição da senha da sua conta SIBS Route Lookup. Digite o código na página de redefinição.',
      codeLabel: 'Seu código de confirmação',
      expiry: 'Este código é válido por 10 minutos. Não compartilhe com ninguém.',
      security: 'Se você não solicitou isso, ignore este e-mail. Sua senha não será alterada.',
      action: 'Redefinir senha',
      siteLabel: 'Página inicial do app',
      accountLabel: 'Página da conta',
      footer: 'Mensagem automática do SIBS Route Lookup. Não responda.',
      summary: 'Confirmação de redefinição. Código válido por 10 min. Ignore se não foi você.',
      otherLanguagesTitle: 'Outros idiomas',
    },
    vi: {
      subject: 'SIBS Route Lookup — Yêu cầu đặt lại mật khẩu',
      preheader: 'Mã đặt lại mật khẩu có hiệu lực trong 10 phút.',
      headline: 'Xác nhận đặt lại mật khẩu',
      intro:
        'Đã có yêu cầu đặt lại mật khẩu tài khoản SIBS Route Lookup của bạn. Nhập mã trên trang đặt lại mật khẩu.',
      codeLabel: 'Mã xác nhận của bạn',
      expiry: 'Mã có hiệu lực trong 10 phút. Không chia sẻ với người khác.',
      security: 'Nếu bạn không yêu cầu, hãy bỏ qua email này. Mật khẩu sẽ không thay đổi.',
      action: 'Đặt lại mật khẩu',
      siteLabel: 'Trang chủ ứng dụng',
      accountLabel: 'Trang tài khoản',
      footer: 'Email tự động từ SIBS Route Lookup. Vui lòng không trả lời.',
      summary: 'Xác nhận đặt lại mật khẩu. Mã hiệu lực 10 phút. Bỏ qua nếu không phải bạn.',
      otherLanguagesTitle: 'Ngôn ngữ khác',
    },
    id: {
      subject: 'SIBS Route Lookup — Permintaan reset kata sandi',
      preheader: 'Kode reset berlaku selama 10 menit.',
      headline: 'Konfirmasi reset kata sandi',
      intro:
        'Permintaan reset kata sandi akun SIBS Route Lookup Anda telah diterima. Masukkan kode di halaman reset.',
      codeLabel: 'Kode konfirmasi Anda',
      expiry: 'Kode ini berlaku selama 10 menit. Jangan bagikan kepada siapa pun.',
      security: 'Jika Anda tidak meminta ini, abaikan email ini. Kata sandi Anda tidak akan berubah.',
      action: 'Reset kata sandi',
      siteLabel: 'Beranda aplikasi',
      accountLabel: 'Halaman akun',
      footer: 'Pesan otomatis dari SIBS Route Lookup. Jangan membalas.',
      summary: 'Konfirmasi reset kata sandi. Kode berlaku 10 menit. Abaikan jika bukan Anda.',
      otherLanguagesTitle: 'Bahasa lain',
    },
    fil: {
      subject: 'SIBS Route Lookup — Kahilingan sa pag-reset ng password',
      preheader: 'Ang reset code ay may bisa sa loob ng 10 minuto.',
      headline: 'Kumpirmahin ang pag-reset ng password',
      intro:
        'May kahilingan na i-reset ang password ng iyong SIBS Route Lookup account. Ilagay ang code sa reset page.',
      codeLabel: 'Iyong confirmation code',
      expiry: 'May bisa ang code sa loob ng 10 minuto. Huwag ibahagi sa iba.',
      security: 'Kung hindi ikaw ang humiling, huwag pansinin ang email na ito. Hindi magbabago ang password mo.',
      action: 'I-reset ang password',
      siteLabel: 'Home ng app',
      accountLabel: 'Account page',
      footer: 'Awtomatikong mensahe mula sa SIBS Route Lookup. Huwag sumagot.',
      summary: 'Kumpirmasyon ng password reset. May bisa ang code sa 10 minuto. Huwag pansinin kung hindi ikaw.',
      otherLanguagesTitle: 'Iba pang wika',
    },
    da: {
      subject: 'SIBS Route Lookup — Anmodning om nulstilling af adgangskode',
      preheader: 'Din nulstillingskode er gyldig i 10 minutter.',
      headline: 'Bekræft nulstilling af adgangskode',
      intro:
        'Der er anmodet om at nulstille adgangskoden til din SIBS Route Lookup-konto. Indtast koden på nulstillingssiden.',
      codeLabel: 'Din bekræftelseskode',
      expiry: 'Koden er gyldig i 10 minutter. Del den ikke med andre.',
      security: 'Hvis du ikke har anmodet om dette, kan du ignorere e-mailen. Din adgangskode ændres ikke.',
      action: 'Nulstil adgangskode',
      siteLabel: 'App-forside',
      accountLabel: 'Kontoside',
      footer: 'Automatisk besked fra SIBS Route Lookup. Svar venligst ikke.',
      summary: 'Bekræftelse af nulstilling. Kode gyldig i 10 min. Ignorer hvis ikke anmodet.',
      otherLanguagesTitle: 'Andre sprog',
    },
    pl: {
      subject: 'SIBS Route Lookup — Prośba o reset hasła',
      preheader: 'Kod resetowania hasła jest ważny przez 10 minut.',
      headline: 'Potwierdź reset hasła',
      intro:
        'Otrzymaliśmy prośbę o zresetowanie hasła do konta SIBS Route Lookup. Wpisz kod na stronie resetowania.',
      codeLabel: 'Twój kod potwierdzający',
      expiry: 'Kod jest ważny przez 10 minut. Nie udostępniaj go innym.',
      security: 'Jeśli to nie Ty, zignoruj tę wiadomość. Twoje hasło nie zostanie zmienione.',
      action: 'Zresetuj hasło',
      siteLabel: 'Strona główna aplikacji',
      accountLabel: 'Strona konta',
      footer: 'Automatyczna wiadomość od SIBS Route Lookup. Prosimy nie odpowiadać.',
      summary: 'Potwierdzenie resetu hasła. Kod ważny 10 min. Zignoruj, jeśli nie prosiłeś.',
      otherLanguagesTitle: 'Inne języki',
    },
    sv: {
      subject: 'SIBS Route Lookup — Begäran om lösenordsåterställning',
      preheader: 'Din återställningskod är giltig i 10 minuter.',
      headline: 'Bekräfta lösenordsåterställning',
      intro:
        'En begäran om att återställa lösenordet för ditt SIBS Route Lookup-konto har mottagits. Ange koden på återställningssidan.',
      codeLabel: 'Din bekräftelsekod',
      expiry: 'Koden är giltig i 10 minuter. Dela den inte med någon.',
      security: 'Om du inte begärde detta kan du ignorera e-postmeddelandet. Ditt lösenord ändras inte.',
      action: 'Återställ lösenord',
      siteLabel: 'Appens startsida',
      accountLabel: 'Kontosida',
      footer: 'Automatiskt meddelande från SIBS Route Lookup. Svara inte på detta meddelande.',
      summary: 'Bekräftelse av lösenordsåterställning. Kod giltig i 10 min. Ignorera om du inte begärde det.',
      otherLanguagesTitle: 'Andra språk',
    },
  },
}

/** @param {MailPurpose} purpose @param {unknown} locale */
export function getMailContentPlan(purpose, locale) {
  const { full, summary, primary } = orderMailLocales(locale)
  const primaryCopy = MAIL_COPY[purpose][primary]
  const enCopy = MAIL_COPY[purpose].en
  const zhCopy = MAIL_COPY[purpose]['zh-Hans']

  const subject = `${primaryCopy.subject} | ${enCopy.subject}`
  const preheader = `${primaryCopy.preheader} / ${enCopy.preheader}`

  return {
    primary,
    full,
    summary,
    subject,
    preheader,
    otherLanguagesTitle: {
      primary: primaryCopy.otherLanguagesTitle,
      en: enCopy.otherLanguagesTitle,
      zh: zhCopy.otherLanguagesTitle,
    },
    getCopy: (/** @type {MailLocale} */ mailLocale) => MAIL_COPY[purpose][mailLocale],
  }
}
