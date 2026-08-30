import { reactive, computed } from 'vue'

/** Map of field name → validator returning an error string ('' when valid). */
export type Validators = Record<string, () => string>

/**
 * Shared field-validation helper. Each validator is a closure over reactive form
 * state and returns the error message for that field (empty string = valid).
 *
 * Usage:
 *   const { errors, validateField, isFormValid, validateAll } = useFormValidation({
 *     email: () => (isValidEmail(form.email) ? '' : 'כתובת דוא״ל לא תקינה'),
 *   })
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
    // Object.entries, not keys-then-index: with noUncheckedIndexedAccess a keyed read is
    // `T | undefined`, and validateField() already used `?.() ?? ''` for the same reason.
    // Kept identical to the Code Site starter's twin.
    for (const [field, rule] of Object.entries(validators)) {
      const message = rule()
      errors[field] = message
      if (message) valid = false
    }
    return valid
  }

  return { errors, clearError, validateField, isFormValid, validateAll }
}
