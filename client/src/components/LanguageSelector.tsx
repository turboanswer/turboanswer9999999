import { Globe, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Language {
  code: string;
  name: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'zh', name: '中文 (Chinese)', flag: '🇨🇳' },
  { code: 'ja', name: '日本語 (Japanese)', flag: '🇯🇵' },
  { code: 'ko', name: '한국어 (Korean)', flag: '🇰🇷' },
  { code: 'ar', name: 'العربية (Arabic)', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी (Hindi)', flag: '🇮🇳' },
  { code: 'bn', name: 'বাংলা (Bengali)', flag: '🇧🇩' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)', flag: '🇮🇳' },
  { code: 'ur', name: 'اردو (Urdu)', flag: '🇵🇰' },
  { code: 'ru', name: 'Русский (Russian)', flag: '🇷🇺' },
  { code: 'uk', name: 'Українська (Ukrainian)', flag: '🇺🇦' },
  { code: 'pl', name: 'Polski (Polish)', flag: '🇵🇱' },
  { code: 'nl', name: 'Nederlands (Dutch)', flag: '🇳🇱' },
  { code: 'sv', name: 'Svenska (Swedish)', flag: '🇸🇪' },
  { code: 'no', name: 'Norsk (Norwegian)', flag: '🇳🇴' },
  { code: 'da', name: 'Dansk (Danish)', flag: '🇩🇰' },
  { code: 'fi', name: 'Suomi (Finnish)', flag: '🇫🇮' },
  { code: 'is', name: 'Íslenska (Icelandic)', flag: '🇮🇸' },
  { code: 'el', name: 'Ελληνικά (Greek)', flag: '🇬🇷' },
  { code: 'tr', name: 'Türkçe (Turkish)', flag: '🇹🇷' },
  { code: 'cs', name: 'Čeština (Czech)', flag: '🇨🇿' },
  { code: 'sk', name: 'Slovenčina (Slovak)', flag: '🇸🇰' },
  { code: 'hu', name: 'Magyar (Hungarian)', flag: '🇭🇺' },
  { code: 'ro', name: 'Română (Romanian)', flag: '🇷🇴' },
  { code: 'bg', name: 'Български (Bulgarian)', flag: '🇧🇬' },
  { code: 'hr', name: 'Hrvatski (Croatian)', flag: '🇭🇷' },
  { code: 'sr', name: 'Српски (Serbian)', flag: '🇷🇸' },
  { code: 'sl', name: 'Slovenščina (Slovenian)', flag: '🇸🇮' },
  { code: 'bs', name: 'Bosanski (Bosnian)', flag: '🇧🇦' },
  { code: 'mk', name: 'Македонски (Macedonian)', flag: '🇲🇰' },
  { code: 'sq', name: 'Shqip (Albanian)', flag: '🇦🇱' },
  { code: 'lt', name: 'Lietuvių (Lithuanian)', flag: '🇱🇹' },
  { code: 'lv', name: 'Latviešu (Latvian)', flag: '🇱🇻' },
  { code: 'et', name: 'Eesti (Estonian)', flag: '🇪🇪' },
  { code: 'ka', name: 'ქართული (Georgian)', flag: '🇬🇪' },
  { code: 'hy', name: 'Հայերեն (Armenian)', flag: '🇦🇲' },
  { code: 'az', name: 'Azərbaycan (Azerbaijani)', flag: '🇦🇿' },
  { code: 'kk', name: 'Қазақша (Kazakh)', flag: '🇰🇿' },
  { code: 'uz', name: "O'zbek (Uzbek)", flag: '🇺🇿' },
  { code: 'tg', name: 'Тоҷикӣ (Tajik)', flag: '🇹🇯' },
  { code: 'ky', name: 'Кыргызча (Kyrgyz)', flag: '🇰🇬' },
  { code: 'tk', name: 'Türkmen (Turkmen)', flag: '🇹🇲' },
  { code: 'mn', name: 'Монгол (Mongolian)', flag: '🇲🇳' },
  { code: 'th', name: 'ไทย (Thai)', flag: '🇹🇭' },
  { code: 'vi', name: 'Tiếng Việt (Vietnamese)', flag: '🇻🇳' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms', name: 'Bahasa Melayu (Malay)', flag: '🇲🇾' },
  { code: 'tl', name: 'Filipino (Tagalog)', flag: '🇵🇭' },
  { code: 'km', name: 'ភាសាខ្មែរ (Khmer)', flag: '🇰🇭' },
  { code: 'lo', name: 'ລາວ (Lao)', flag: '🇱🇦' },
  { code: 'my', name: 'မြန်မာ (Burmese)', flag: '🇲🇲' },
  { code: 'ne', name: 'नेपाली (Nepali)', flag: '🇳🇵' },
  { code: 'si', name: 'සිංහල (Sinhala)', flag: '🇱🇰' },
  { code: 'ta', name: 'தமிழ் (Tamil)', flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు (Telugu)', flag: '🇮🇳' },
  { code: 'kn', name: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳' },
  { code: 'ml', name: 'മലയാളം (Malayalam)', flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी (Marathi)', flag: '🇮🇳' },
  { code: 'gu', name: 'ગુજરાતી (Gujarati)', flag: '🇮🇳' },
  { code: 'or', name: 'ଓଡ଼ିଆ (Odia)', flag: '🇮🇳' },
  { code: 'as', name: 'অসমীয়া (Assamese)', flag: '🇮🇳' },
  { code: 'sd', name: 'سنڌي (Sindhi)', flag: '🇵🇰' },
  { code: 'fa', name: 'فارسی (Persian)', flag: '🇮🇷' },
  { code: 'ps', name: 'پښتو (Pashto)', flag: '🇦🇫' },
  { code: 'ku', name: 'Kurdî (Kurdish)', flag: '🇮🇶' },
  { code: 'he', name: 'עברית (Hebrew)', flag: '🇮🇱' },
  { code: 'yi', name: 'ייִדיש (Yiddish)', flag: '🇮🇱' },
  { code: 'sw', name: 'Kiswahili (Swahili)', flag: '🇰🇪' },
  { code: 'am', name: 'አማርኛ (Amharic)', flag: '🇪🇹' },
  { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
  { code: 'yo', name: 'Yorùbá', flag: '🇳🇬' },
  { code: 'ig', name: 'Igbo', flag: '🇳🇬' },
  { code: 'zu', name: 'isiZulu (Zulu)', flag: '🇿🇦' },
  { code: 'xh', name: 'isiXhosa (Xhosa)', flag: '🇿🇦' },
  { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
  { code: 'so', name: 'Soomaali (Somali)', flag: '🇸🇴' },
  { code: 'rw', name: 'Kinyarwanda', flag: '🇷🇼' },
  { code: 'ny', name: 'Chichewa', flag: '🇲🇼' },
  { code: 'sn', name: 'chiShona (Shona)', flag: '🇿🇼' },
  { code: 'mg', name: 'Malagasy', flag: '🇲🇬' },
  { code: 'ln', name: 'Lingála', flag: '🇨🇩' },
  { code: 'lg', name: 'Luganda', flag: '🇺🇬' },
  { code: 'ti', name: 'ትግርኛ (Tigrinya)', flag: '🇪🇷' },
  { code: 'om', name: 'Oromoo (Oromo)', flag: '🇪🇹' },
  { code: 'wo', name: 'Wolof', flag: '🇸🇳' },
  { code: 'ga', name: 'Gaeilge (Irish)', flag: '🇮🇪' },
  { code: 'cy', name: 'Cymraeg (Welsh)', flag: '🏴' },
  { code: 'gd', name: 'Gàidhlig (Scottish Gaelic)', flag: '🏴' },
  { code: 'eu', name: 'Euskara (Basque)', flag: '🇪🇸' },
  { code: 'ca', name: 'Català (Catalan)', flag: '🇪🇸' },
  { code: 'gl', name: 'Galego (Galician)', flag: '🇪🇸' },
  { code: 'mt', name: 'Malti (Maltese)', flag: '🇲🇹' },
  { code: 'lb', name: 'Lëtzebuergesch (Luxembourgish)', flag: '🇱🇺' },
  { code: 'be', name: 'Беларуская (Belarusian)', flag: '🇧🇾' },
  { code: 'eo', name: 'Esperanto', flag: '🌍' },
  { code: 'la', name: 'Latina (Latin)', flag: '🏛️' },
  { code: 'haw', name: 'ʻŌlelo Hawaiʻi (Hawaiian)', flag: '🌺' },
  { code: 'mi', name: 'Te Reo Māori (Maori)', flag: '🇳🇿' },
  { code: 'sm', name: 'Gagana Samoa (Samoan)', flag: '🇼🇸' },
  { code: 'to', name: 'Lea Faka-Tonga (Tongan)', flag: '🇹🇴' },
  { code: 'fj', name: 'Vosa Vakaviti (Fijian)', flag: '🇫🇯' },
  { code: 'jv', name: 'Basa Jawa (Javanese)', flag: '🇮🇩' },
  { code: 'su', name: 'Basa Sunda (Sundanese)', flag: '🇮🇩' },
  { code: 'ceb', name: 'Cebuano', flag: '🇵🇭' },
  { code: 'ht', name: 'Kreyòl Ayisyen (Haitian Creole)', flag: '🇭🇹' },
  { code: 'co', name: 'Corsu (Corsican)', flag: '🇫🇷' },
  { code: 'fy', name: 'Frysk (Frisian)', flag: '🇳🇱' },
];

interface LanguageSelectorProps {
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
}

export default function LanguageSelector({ currentLanguage, onLanguageChange }: LanguageSelectorProps) {
  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];
  const [search, setSearch] = useState('');

  const filteredLanguages = useMemo(() => {
    if (!search.trim()) return languages;
    const q = search.toLowerCase();
    return languages.filter(lang =>
      lang.name.toLowerCase().includes(q) || lang.code.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <DropdownMenu onOpenChange={() => setSearch('')}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-2">
          <Globe className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">{currentLang.flag}</span>
          <span className="ml-1 hidden md:inline">{currentLang.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-0">
        <div className="p-2 border-b border-zinc-700">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              placeholder="Search languages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-7 text-sm bg-zinc-900 border-zinc-700"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filteredLanguages.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => onLanguageChange(language.code)}
              className={`flex items-center space-x-2 px-3 py-2 cursor-pointer ${
                currentLanguage === language.code ? 'bg-blue-600/20 text-blue-400' : ''
              }`}
            >
              <span className="text-lg shrink-0">{language.flag}</span>
              <span className="truncate">{language.name}</span>
              {currentLanguage === language.code && (
                <span className="ml-auto text-xs text-blue-400 shrink-0">✓</span>
              )}
            </DropdownMenuItem>
          ))}
          {filteredLanguages.length === 0 && (
            <div className="px-3 py-4 text-sm text-zinc-500 text-center">No languages found</div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}