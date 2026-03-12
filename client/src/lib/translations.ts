export type LangCode = "en" | "es" | "fr" | "de" | "it" | "pt" | "zh" | "ja" | "ar" | "ko";

export const LANGUAGES: { code: LangCode; label: string; flag: string; rtl?: boolean }[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ar", label: "العربية", flag: "🇸🇦", rtl: true },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
];

export interface Translations {
  chat: {
    placeholder: string;
    send: string;
    newChat: string;
    thinking: string;
    voiceStart: string;
    voiceStop: string;
    greeting: string;
    errorGeneral: string;
    errorNoAuth: string;
    copy: string;
    copied: string;
    regenerate: string;
    model: string;
    history: string;
    settings: string;
    listen: string;
  };
  nav: {
    home: string;
    chat: string;
    settings: string;
    pricing: string;
    logout: string;
    back: string;
    codeStudio: string;
    videoStudio: string;
    aiScanner: string;
    mediaEditor: string;
    support: string;
  };
  settings: {
    title: string;
    profile: string;
    appearance: string;
    aiModels: string;
    voice: string;
    privacy: string;
    billing: string;
    notifications: string;
    save: string;
    saved: string;
    language: string;
    theme: string;
    dark: string;
    light: string;
  };
  common: {
    loading: string;
    error: string;
    success: string;
    cancel: string;
    confirm: string;
    delete: string;
    edit: string;
    save: string;
    close: string;
    upgrade: string;
    free: string;
    month: string;
    year: string;
  };
}

const t: Record<LangCode, Translations> = {
  en: {
    chat: {
      placeholder: "Ask me anything...",
      send: "Send",
      newChat: "New Chat",
      thinking: "Thinking...",
      voiceStart: "Start voice input",
      voiceStop: "Stop recording",
      greeting: "How can I help you today?",
      errorGeneral: "Something went wrong. Please try again.",
      errorNoAuth: "Please sign in to continue.",
      copy: "Copy",
      copied: "Copied!",
      regenerate: "Regenerate",
      model: "Model",
      history: "History",
      settings: "Settings",
      listen: "Listen",
    },
    nav: {
      home: "Home", chat: "Chat", settings: "Settings", pricing: "Pricing",
      logout: "Logout", back: "Back", codeStudio: "Code Studio",
      videoStudio: "Video Studio", aiScanner: "AI Scanner",
      mediaEditor: "Media Studio", support: "Support",
    },
    settings: {
      title: "Settings", profile: "Profile", appearance: "Appearance",
      aiModels: "AI & Models", voice: "Voice", privacy: "Privacy",
      billing: "Billing", notifications: "Notifications", save: "Save",
      saved: "Saved!", language: "Language", theme: "Theme",
      dark: "Dark", light: "Light",
    },
    common: {
      loading: "Loading...", error: "Error", success: "Success!",
      cancel: "Cancel", confirm: "Confirm", delete: "Delete",
      edit: "Edit", save: "Save", close: "Close", upgrade: "Upgrade",
      free: "Free", month: "month", year: "year",
    },
  },

  es: {
    chat: {
      placeholder: "Pregúntame cualquier cosa...",
      send: "Enviar",
      newChat: "Nueva conversación",
      thinking: "Pensando...",
      voiceStart: "Iniciar voz",
      voiceStop: "Detener grabación",
      greeting: "¿En qué puedo ayudarte hoy?",
      errorGeneral: "Algo salió mal. Por favor, inténtalo de nuevo.",
      errorNoAuth: "Inicia sesión para continuar.",
      copy: "Copiar",
      copied: "¡Copiado!",
      regenerate: "Regenerar",
      model: "Modelo",
      history: "Historial",
      settings: "Configuración",
      listen: "Escuchar",
    },
    nav: {
      home: "Inicio", chat: "Chat", settings: "Configuración", pricing: "Precios",
      logout: "Cerrar sesión", back: "Atrás", codeStudio: "Code Studio",
      videoStudio: "Video Studio", aiScanner: "Escáner IA",
      mediaEditor: "Estudio Multimedia", support: "Soporte",
    },
    settings: {
      title: "Configuración", profile: "Perfil", appearance: "Apariencia",
      aiModels: "IA y Modelos", voice: "Voz", privacy: "Privacidad",
      billing: "Facturación", notifications: "Notificaciones", save: "Guardar",
      saved: "¡Guardado!", language: "Idioma", theme: "Tema",
      dark: "Oscuro", light: "Claro",
    },
    common: {
      loading: "Cargando...", error: "Error", success: "¡Éxito!",
      cancel: "Cancelar", confirm: "Confirmar", delete: "Eliminar",
      edit: "Editar", save: "Guardar", close: "Cerrar", upgrade: "Mejorar",
      free: "Gratis", month: "mes", year: "año",
    },
  },

  fr: {
    chat: {
      placeholder: "Posez-moi n'importe quelle question...",
      send: "Envoyer",
      newChat: "Nouvelle conversation",
      thinking: "En train de réfléchir...",
      voiceStart: "Démarrer la voix",
      voiceStop: "Arrêter l'enregistrement",
      greeting: "Comment puis-je vous aider aujourd'hui ?",
      errorGeneral: "Quelque chose s'est mal passé. Veuillez réessayer.",
      errorNoAuth: "Veuillez vous connecter pour continuer.",
      copy: "Copier",
      copied: "Copié !",
      regenerate: "Régénérer",
      model: "Modèle",
      history: "Historique",
      settings: "Paramètres",
      listen: "Écouter",
    },
    nav: {
      home: "Accueil", chat: "Chat", settings: "Paramètres", pricing: "Tarifs",
      logout: "Déconnexion", back: "Retour", codeStudio: "Code Studio",
      videoStudio: "Video Studio", aiScanner: "Scanner IA",
      mediaEditor: "Studio Média", support: "Support",
    },
    settings: {
      title: "Paramètres", profile: "Profil", appearance: "Apparence",
      aiModels: "IA et Modèles", voice: "Voix", privacy: "Confidentialité",
      billing: "Facturation", notifications: "Notifications", save: "Enregistrer",
      saved: "Enregistré !", language: "Langue", theme: "Thème",
      dark: "Sombre", light: "Clair",
    },
    common: {
      loading: "Chargement...", error: "Erreur", success: "Succès !",
      cancel: "Annuler", confirm: "Confirmer", delete: "Supprimer",
      edit: "Modifier", save: "Enregistrer", close: "Fermer", upgrade: "Améliorer",
      free: "Gratuit", month: "mois", year: "an",
    },
  },

  de: {
    chat: {
      placeholder: "Stell mir eine Frage...",
      send: "Senden",
      newChat: "Neuer Chat",
      thinking: "Denke nach...",
      voiceStart: "Spracheingabe starten",
      voiceStop: "Aufnahme stoppen",
      greeting: "Wie kann ich dir heute helfen?",
      errorGeneral: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
      errorNoAuth: "Bitte melde dich an, um fortzufahren.",
      copy: "Kopieren",
      copied: "Kopiert!",
      regenerate: "Neu generieren",
      model: "Modell",
      history: "Verlauf",
      settings: "Einstellungen",
      listen: "Anhören",
    },
    nav: {
      home: "Startseite", chat: "Chat", settings: "Einstellungen", pricing: "Preise",
      logout: "Abmelden", back: "Zurück", codeStudio: "Code Studio",
      videoStudio: "Video Studio", aiScanner: "KI-Scanner",
      mediaEditor: "Medien Studio", support: "Support",
    },
    settings: {
      title: "Einstellungen", profile: "Profil", appearance: "Erscheinungsbild",
      aiModels: "KI & Modelle", voice: "Stimme", privacy: "Datenschutz",
      billing: "Abrechnung", notifications: "Benachrichtigungen", save: "Speichern",
      saved: "Gespeichert!", language: "Sprache", theme: "Design",
      dark: "Dunkel", light: "Hell",
    },
    common: {
      loading: "Laden...", error: "Fehler", success: "Erfolg!",
      cancel: "Abbrechen", confirm: "Bestätigen", delete: "Löschen",
      edit: "Bearbeiten", save: "Speichern", close: "Schließen", upgrade: "Upgraden",
      free: "Kostenlos", month: "Monat", year: "Jahr",
    },
  },

  it: {
    chat: {
      placeholder: "Chiedimi qualsiasi cosa...",
      send: "Invia",
      newChat: "Nuova conversazione",
      thinking: "Sto pensando...",
      voiceStart: "Avvia voce",
      voiceStop: "Ferma registrazione",
      greeting: "Come posso aiutarti oggi?",
      errorGeneral: "Qualcosa è andato storto. Riprova.",
      errorNoAuth: "Accedi per continuare.",
      copy: "Copia",
      copied: "Copiato!",
      regenerate: "Rigenera",
      model: "Modello",
      history: "Cronologia",
      settings: "Impostazioni",
      listen: "Ascolta",
    },
    nav: {
      home: "Home", chat: "Chat", settings: "Impostazioni", pricing: "Prezzi",
      logout: "Disconnetti", back: "Indietro", codeStudio: "Code Studio",
      videoStudio: "Video Studio", aiScanner: "Scanner IA",
      mediaEditor: "Media Studio", support: "Supporto",
    },
    settings: {
      title: "Impostazioni", profile: "Profilo", appearance: "Aspetto",
      aiModels: "IA e Modelli", voice: "Voce", privacy: "Privacy",
      billing: "Fatturazione", notifications: "Notifiche", save: "Salva",
      saved: "Salvato!", language: "Lingua", theme: "Tema",
      dark: "Scuro", light: "Chiaro",
    },
    common: {
      loading: "Caricamento...", error: "Errore", success: "Successo!",
      cancel: "Annulla", confirm: "Conferma", delete: "Elimina",
      edit: "Modifica", save: "Salva", close: "Chiudi", upgrade: "Aggiorna",
      free: "Gratuito", month: "mese", year: "anno",
    },
  },

  pt: {
    chat: {
      placeholder: "Pergunte-me qualquer coisa...",
      send: "Enviar",
      newChat: "Nova conversa",
      thinking: "Pensando...",
      voiceStart: "Iniciar voz",
      voiceStop: "Parar gravação",
      greeting: "Como posso te ajudar hoje?",
      errorGeneral: "Algo deu errado. Por favor, tente novamente.",
      errorNoAuth: "Faça login para continuar.",
      copy: "Copiar",
      copied: "Copiado!",
      regenerate: "Regenerar",
      model: "Modelo",
      history: "Histórico",
      settings: "Configurações",
      listen: "Ouvir",
    },
    nav: {
      home: "Início", chat: "Chat", settings: "Configurações", pricing: "Preços",
      logout: "Sair", back: "Voltar", codeStudio: "Code Studio",
      videoStudio: "Video Studio", aiScanner: "Scanner IA",
      mediaEditor: "Media Studio", support: "Suporte",
    },
    settings: {
      title: "Configurações", profile: "Perfil", appearance: "Aparência",
      aiModels: "IA e Modelos", voice: "Voz", privacy: "Privacidade",
      billing: "Cobrança", notifications: "Notificações", save: "Salvar",
      saved: "Salvo!", language: "Idioma", theme: "Tema",
      dark: "Escuro", light: "Claro",
    },
    common: {
      loading: "Carregando...", error: "Erro", success: "Sucesso!",
      cancel: "Cancelar", confirm: "Confirmar", delete: "Excluir",
      edit: "Editar", save: "Salvar", close: "Fechar", upgrade: "Upgrade",
      free: "Grátis", month: "mês", year: "ano",
    },
  },

  zh: {
    chat: {
      placeholder: "随便问我什么...",
      send: "发送",
      newChat: "新对话",
      thinking: "思考中...",
      voiceStart: "开始语音输入",
      voiceStop: "停止录音",
      greeting: "今天我能帮您做什么？",
      errorGeneral: "出错了，请重试。",
      errorNoAuth: "请登录后继续。",
      copy: "复制",
      copied: "已复制！",
      regenerate: "重新生成",
      model: "模型",
      history: "历史记录",
      settings: "设置",
      listen: "播放",
    },
    nav: {
      home: "主页", chat: "聊天", settings: "设置", pricing: "价格",
      logout: "退出", back: "返回", codeStudio: "代码工作室",
      videoStudio: "视频工作室", aiScanner: "AI扫描仪",
      mediaEditor: "媒体工作室", support: "支持",
    },
    settings: {
      title: "设置", profile: "个人资料", appearance: "外观",
      aiModels: "AI与模型", voice: "语音", privacy: "隐私",
      billing: "账单", notifications: "通知", save: "保存",
      saved: "已保存！", language: "语言", theme: "主题",
      dark: "深色", light: "浅色",
    },
    common: {
      loading: "加载中...", error: "错误", success: "成功！",
      cancel: "取消", confirm: "确认", delete: "删除",
      edit: "编辑", save: "保存", close: "关闭", upgrade: "升级",
      free: "免费", month: "月", year: "年",
    },
  },

  ja: {
    chat: {
      placeholder: "何でも聞いてください...",
      send: "送信",
      newChat: "新しいチャット",
      thinking: "考え中...",
      voiceStart: "音声入力を開始",
      voiceStop: "録音を停止",
      greeting: "今日はどのようにお手伝いしますか？",
      errorGeneral: "エラーが発生しました。もう一度お試しください。",
      errorNoAuth: "続けるにはサインインしてください。",
      copy: "コピー",
      copied: "コピーしました！",
      regenerate: "再生成",
      model: "モデル",
      history: "履歴",
      settings: "設定",
      listen: "聞く",
    },
    nav: {
      home: "ホーム", chat: "チャット", settings: "設定", pricing: "料金",
      logout: "ログアウト", back: "戻る", codeStudio: "コードスタジオ",
      videoStudio: "ビデオスタジオ", aiScanner: "AIスキャナー",
      mediaEditor: "メディアスタジオ", support: "サポート",
    },
    settings: {
      title: "設定", profile: "プロフィール", appearance: "外観",
      aiModels: "AIとモデル", voice: "音声", privacy: "プライバシー",
      billing: "請求", notifications: "通知", save: "保存",
      saved: "保存しました！", language: "言語", theme: "テーマ",
      dark: "ダーク", light: "ライト",
    },
    common: {
      loading: "読み込み中...", error: "エラー", success: "成功！",
      cancel: "キャンセル", confirm: "確認", delete: "削除",
      edit: "編集", save: "保存", close: "閉じる", upgrade: "アップグレード",
      free: "無料", month: "月", year: "年",
    },
  },

  ar: {
    chat: {
      placeholder: "اسألني أي شيء...",
      send: "إرسال",
      newChat: "محادثة جديدة",
      thinking: "جاري التفكير...",
      voiceStart: "بدء الإدخال الصوتي",
      voiceStop: "إيقاف التسجيل",
      greeting: "كيف يمكنني مساعدتك اليوم؟",
      errorGeneral: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
      errorNoAuth: "يرجى تسجيل الدخول للمتابعة.",
      copy: "نسخ",
      copied: "تم النسخ!",
      regenerate: "إعادة التوليد",
      model: "النموذج",
      history: "السجل",
      settings: "الإعدادات",
      listen: "استمع",
    },
    nav: {
      home: "الرئيسية", chat: "الدردشة", settings: "الإعدادات", pricing: "الأسعار",
      logout: "تسجيل الخروج", back: "رجوع", codeStudio: "استوديو الكود",
      videoStudio: "استوديو الفيديو", aiScanner: "ماسح الذكاء الاصطناعي",
      mediaEditor: "استوديو الوسائط", support: "الدعم",
    },
    settings: {
      title: "الإعدادات", profile: "الملف الشخصي", appearance: "المظهر",
      aiModels: "الذكاء الاصطناعي والنماذج", voice: "الصوت", privacy: "الخصوصية",
      billing: "الفواتير", notifications: "الإشعارات", save: "حفظ",
      saved: "تم الحفظ!", language: "اللغة", theme: "السمة",
      dark: "داكن", light: "فاتح",
    },
    common: {
      loading: "جاري التحميل...", error: "خطأ", success: "نجاح!",
      cancel: "إلغاء", confirm: "تأكيد", delete: "حذف",
      edit: "تعديل", save: "حفظ", close: "إغلاق", upgrade: "ترقية",
      free: "مجاني", month: "شهر", year: "سنة",
    },
  },

  ko: {
    chat: {
      placeholder: "무엇이든 물어보세요...",
      send: "전송",
      newChat: "새 채팅",
      thinking: "생각 중...",
      voiceStart: "음성 입력 시작",
      voiceStop: "녹음 중지",
      greeting: "오늘 어떻게 도와드릴까요?",
      errorGeneral: "문제가 발생했습니다. 다시 시도해 주세요.",
      errorNoAuth: "계속하려면 로그인하세요.",
      copy: "복사",
      copied: "복사됨!",
      regenerate: "재생성",
      model: "모델",
      history: "기록",
      settings: "설정",
      listen: "듣기",
    },
    nav: {
      home: "홈", chat: "채팅", settings: "설정", pricing: "가격",
      logout: "로그아웃", back: "뒤로", codeStudio: "코드 스튜디오",
      videoStudio: "비디오 스튜디오", aiScanner: "AI 스캐너",
      mediaEditor: "미디어 스튜디오", support: "지원",
    },
    settings: {
      title: "설정", profile: "프로필", appearance: "외관",
      aiModels: "AI 및 모델", voice: "음성", privacy: "개인정보",
      billing: "청구", notifications: "알림", save: "저장",
      saved: "저장됨!", language: "언어", theme: "테마",
      dark: "다크", light: "라이트",
    },
    common: {
      loading: "로딩 중...", error: "오류", success: "성공!",
      cancel: "취소", confirm: "확인", delete: "삭제",
      edit: "편집", save: "저장", close: "닫기", upgrade: "업그레이드",
      free: "무료", month: "월", year: "년",
    },
  },
};

export default t;
