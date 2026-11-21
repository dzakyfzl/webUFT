"use client";

import { useId, useState, type InvalidEvent } from "react";
import type { FormSchema } from "../lib/erp/p1-types";

export type Answers = Record<string, string | string[]>;
const inputTypes: Record<string, string> = { EMAIL: "email", DATE: "date", NUMBER: "number" };

export default function RegistrationFields({ schema, values, onChange, disabled = false }: { schema: FormSchema; values: Answers; onChange: (values: Answers) => void; disabled?: boolean }) {
  const idPrefix = useId();
  const [errors, setErrors] = useState<Record<string, string>>({});
  function set(id: string, value: string | string[]) {
    setErrors(current => current[id] ? { ...current, [id]: "" } : current);
    onChange({ ...values, [id]: value });
  }
  function invalid(id: string, event: InvalidEvent<HTMLElement>) {
    const field = event.target;
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) return;
    const message = field.validity.valueMissing ? "Pertanyaan ini wajib diisi."
      : field.validity.typeMismatch || (field.type === "email" && field.validity.patternMismatch) ? "Masukkan alamat email yang lengkap."
      : field.validationMessage;
    setErrors(current => current[id] === message ? current : { ...current, [id]: message });
  }
  const hasRequired = schema.sections.some(section => section.questions.some(question => question.required));
  return <div className="erp-registration-fields">
    {hasRequired && <small>Tanda * menunjukkan pertanyaan wajib.</small>}
    {schema.sections.map(section => <section key={section.id} className="erp-form-section">
      {section.title && <h3>{section.title}</h3>}
      {section.questions.map(question => {
        const value = values[question.id] ?? (question.type === "CHECKBOX" ? [] : "");
        const answerId = `answer-${idPrefix}-${question.id}`;
        const hintId = `${answerId}-hint`;
        const errorId = `${answerId}-error`;
        const label = `${question.label}${question.required ? " *" : ""}`;
        const error = errors[question.id];
        const describedBy = [question.hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
        const hint = question.hint && <small id={hintId}>{question.hint}</small>;
        const feedback = error && <small className="erp-field-error" id={errorId} role="alert">{error}</small>;
        const whitespaceError = question.required && typeof value === "string" && value && !value.trim()
          ? "Jawaban wajib tidak boleh hanya spasi." : "";
        if (question.type === "CHECKBOX" || question.type === "RADIO") {
          const multiple = question.type === "CHECKBOX";
          return <fieldset key={question.id} className="erp-answer-choices" disabled={disabled} aria-describedby={describedBy}
            onInvalid={event => invalid(question.id, event)}>
            <legend>{label}</legend>
            {hint}
            {question.options.map((option, index) => <label key={`${index}-${option}`} className="erp-check-label">
              <input type={multiple ? "checkbox" : "radio"} name={question.id} value={option} data-validation-managed aria-invalid={!!error || undefined}
                ref={index === 0 && multiple ? field => {
                  field?.setCustomValidity(question.required && !value.length ? "Pilih setidaknya satu jawaban." : "");
                } : undefined}
                required={!multiple && question.required} checked={Array.isArray(value) ? value.includes(option) : value === option}
                onChange={event => {
                  const choices = Array.isArray(value) ? value : [];
                  set(question.id, !multiple ? option : event.target.checked ? [...choices, option] : choices.filter(item => item !== option));
                }}/><span>{option}</span>
            </label>)}
            {feedback}
          </fieldset>;
        }
        const attributes = { id: answerId, name: question.id, required: question.required, disabled, value: String(value),
          "aria-describedby": describedBy, "aria-invalid": !!error || undefined, "data-validation-managed": true };
        return <div className="erp-field-stack" key={question.id} onInvalid={event => invalid(question.id, event)}>
          <label htmlFor={answerId}>{label}</label>
          {hint}
          {question.type === "LONG_TEXT" ? <textarea {...attributes} maxLength={10000} placeholder={question.placeholder}
            onChange={event => set(question.id, event.target.value)} ref={field => { field?.setCustomValidity(whitespaceError); }}/>
            : question.type === "DROPDOWN" ? <select {...attributes} onChange={event => set(question.id, event.target.value)}>
              <option value="">Pilih jawaban</option>{question.options.map((option, index) => <option key={`${index}-${option}`}>{option}</option>)}
            </select> : <input {...attributes} type={inputTypes[question.type] ?? "text"} step={question.type === "NUMBER" ? "any" : undefined}
              pattern={question.type === "EMAIL" ? "[^\\s@]+@[^\\s@]+\\.[^\\s@]+" : undefined}
              maxLength={2000} placeholder={question.placeholder} onChange={event => set(question.id, event.target.value)}
              ref={field => { field?.setCustomValidity(whitespaceError); }}/>}
          {feedback}
        </div>;
      })}
    </section>)}
  </div>;
}
