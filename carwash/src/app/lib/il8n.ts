// src/lib/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Impor file terjemahan Anda
import enMessages from '../../messages/en.json';
import idMessages from '../../messages/id.json';

i18n
  // Mendeteksi bahasa pengguna (dari localStorage, browser, dll.)
  .use(LanguageDetector)
  // Mengirim 'i18n' instance ke 'react-i18next'
  .use(initReactI18next)
  // Inisialisasi i18next
  .init({
    // Kita "memuat" terjemahan di sini
    // (daripada mengambilnya dari folder 'public')
    resources: {
      en: {
        translation: enMessages
      },
      id: {
        translation: idMessages
      }
    },
    // Bahasa default
    fallbackLng: 'id',
    // Namespace default
    defaultNS: 'translation',
    
    // Opsi untuk 'react-i18next'
    react: {
      useSuspense: false // Nonaktifkan React.Suspense
    },
    
    // Opsi untuk 'LanguageDetector'
    detection: {
      // Urutan pendeteksian bahasa
      order: ['localStorage', 'navigator'],
      // Key untuk menyimpan di localStorage
      caches: ['i18nextLng']
    }
  });

export default i18n;