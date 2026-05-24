import { ref, readonly } from 'vue'
import { type Lang } from '../consts/i18n-otp'

const lang = ref<Lang>('he')

export function useI18n() {
  function t<T extends { he: string; en: string }>(entry: T): string {
    return entry[lang.value]
  }

  function setLang(l: Lang) {
    lang.value = l
  }

  return { lang: readonly(lang), t, setLang }
}
