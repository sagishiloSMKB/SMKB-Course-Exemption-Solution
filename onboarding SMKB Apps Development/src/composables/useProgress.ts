import { reactive, computed } from 'vue'
import { modules } from '../router'

const STORAGE_KEY = 'smkb-onboarding-progress'

function loadFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) return new Set(parsed as string[])
  } catch {
    // ignore parse errors
  }
  return new Set()
}

const completedModules = reactive<Set<string>>(loadFromStorage())

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...completedModules]))
}

function markComplete(id: string) {
  completedModules.add(id)
  persist()
}

function isComplete(id: string): boolean {
  return completedModules.has(id)
}

const completionPercent = computed(() => {
  return Math.round((completedModules.size / modules.length) * 100)
})

export function useProgress() {
  return { completedModules, markComplete, isComplete, completionPercent }
}
