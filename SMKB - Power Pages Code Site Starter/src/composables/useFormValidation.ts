import { reactive, computed } from 'vue'

/** Map of field name → validator returning an error string ('' when valid). */
export type Validators = Record<string, () => string>

/**
 * Shared field-validation helper for forms.
 * Each validator is a closure over reactive form state and returns the
 * error message for that field (empty string = valid).
 */
export function useFormValidation(validators: Validators) {
  const errors = reactive<Record<string, string>>({})

  function clearError(field: string) {
    errors[field] = ''
  }

  function validateField(field: string) {
    errors[field] = validators[field]?.() ?? ''
  }

  /** True when every validator passes — reactive, safe to use in :disabled. */
  const isFormValid = computed(() => Object.values(validators).every((rule) => !rule()))

  /** Run every validator, populate `errors`, and return whether the form is valid. */
  function validateAll(): boolean {
    let valid = true
    for (const field of Object.keys(validators)) {
      errors[field] = validators[field]()
      if (errors[field]) valid = false
    }
    return valid
  }

  return { errors, clearError, validateField, isFormValid, validateAll }
}
