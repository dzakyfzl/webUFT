"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/erp/client";
import type { FormSchema, PublicEvent, Question, Registration } from "../../lib/erp/p1-types";
import RegistrationFields, { type Answers } from "../../components/RegistrationFields";
import DirectionalPanels from "../../components/ui/directional-panels";
import { Feedback, LoadState, useAction, useResource } from "../ui";

const types: Record<string, string> = { SHORT_TEXT: "Teks pendek", LONG_TEXT: "Paragraf", RADIO: "Pilihan tunggal", DROPDOWN: "Dropdown", CHECKBOX: "Multi-pilihan", EMAIL: "Email", DATE: "Tanggal", NUMBER: "Angka" };

export default function FormPanel({ event }: { event: PublicEvent }) {
  const path = `/events/${event.id}/form`;
  const resource = useResource<Registration>(path);
  const action = useAction();
  if (!resource.data) return <section className="erp-panel erp-stack"><Feedback {...action}/>{resource.error === "Acara belum memiliki formulir." ? <><h2>Formulir pendaftaran</h2><p>Acara ini belum memiliki formulir pendaftaran.{event.capabilities.edit && " Mulai dari template atau susun pertanyaan sendiri."}</p><div className="erp-form-grid"><section><h3>Pertanyaan</h3><p className="erp-muted">Pertanyaan pendaftaran akan muncul di sini.</p></section><section><h3>Pratinjau peserta</h3><p className="erp-muted">Pratinjau tersedia setelah formulir dibuat.</p></section></div>{event.capabilities.edit && <div className="erp-row">{[true, false].map(useTemplate => <button key={String(useTemplate)} disabled={action.busy} onClick={() => action.run(async () => { await api(path, { method: "POST", body: { use_template: useTemplate } }); resource.reload(); })}>{useTemplate ? "Gunakan template awal" : "Mulai form kosong"}</button>)}</div>}</> : <LoadState error={resource.error} reload={resource.reload}/>}</section>;
  return <Builder refreshing={resource.refreshing} event={event} registration={resource.data} reload={resource.reload}/>;
}

const choiceTypes = new Set(["RADIO", "DROPDOWN", "CHECKBOX"]);

function Builder({ event, registration, reload, refreshing }: { refreshing: boolean; event: PublicEvent; registration: Registration; reload: () => void }) {
  const [schema, setSchema] = useState<FormSchema>(registration.draft_schema);
  const [savedSchema, setSavedSchema] = useState(registration.draft_schema);
  const [baseVersion, setBaseVersion] = useState(registration.version);
  const [selection, setSelection] = useState(() => registration.draft_schema.sections[0]?.questions[0]?.id ?? "");
  const [preview, setPreview] = useState(false);
  const [values, setValues] = useState<Answers>({});
  const [formError, setFormError] = useState("");
  const action = useAction();
  const editorLabel = useRef<HTMLInputElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const formTitle = useRef<HTMLInputElement>(null);
  const path = `/events/${event.id}/form`;
  const latest = registration.versions.find(item => item.id === registration.published_version_id);
  const changed = JSON.stringify(schema) !== JSON.stringify(savedSchema);
  const selectedSection = schema.sections.find(section => section.id === selection || section.questions.some(item => item.id === selection));
  const selectedQuestion = selectedSection?.questions.find(item => item.id === selection);
  const questionIndex = selectedSection?.questions.findIndex(item => item.id === selection) ?? -1;
  const total = schema.sections.reduce((sum, section) => sum + section.questions.length, 0);

  useEffect(() => {
    if (!changed) return;
    function preventLoss(event: BeforeUnloadEvent) { event.preventDefault(); }
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, [changed]);

  function select(id: string, focusEditor = false) {
    setSelection(id);
    setFormError("");
    if (focusEditor) requestAnimationFrame(() => editorLabel.current?.focus());
  }

  function updateSection(sectionId: string, update: (section: FormSchema["sections"][number]) => FormSchema["sections"][number]) {
    setSchema(current => ({ ...current, sections: current.sections.map(section => section.id === sectionId ? update(section) : section) }));
  }

  function question(change: Partial<Question>) {
    if (!selectedSection || !selectedQuestion) return;
    updateSection(selectedSection.id, section => ({
      ...section, questions: section.questions.map(item => item.id === selectedQuestion.id ? { ...item, ...change } : item),
    }));
  }

  function moveSection(index: number, direction: number) {
    const sections = [...schema.sections];
    const next = index + direction;
    [sections[index], sections[next]] = [sections[next], sections[index]];
    setSchema({ ...schema, sections });
  }

  function moveQuestion(direction: number) {
    if (!selectedSection || questionIndex < 0) return;
    updateSection(selectedSection.id, section => {
      const questions = [...section.questions];
      const next = questionIndex + direction;
      [questions[questionIndex], questions[next]] = [questions[next], questions[questionIndex]];
      return { ...section, questions };
    });
  }

  function addQuestion(sectionId: string) {
    const item: Question = { id: crypto.randomUUID(), label: "Pertanyaan baru", type: "SHORT_TEXT", required: false, placeholder: "", hint: "", options: [] };
    updateSection(sectionId, section => ({ ...section, questions: [...section.questions, item] }));
    select(item.id, true);
  }

  function removeQuestion() {
    if (!selectedQuestion || !selectedSection) return;
    const remaining = selectedSection.questions.filter(item => item.id !== selectedQuestion.id);
    updateSection(selectedSection.id, section => ({ ...section, questions: remaining }));
    select(remaining[Math.min(questionIndex, remaining.length - 1)]?.id ?? selectedSection.id, true);
  }

  function saveDraft() {
    const normalized = {
      ...schema, sections: schema.sections.map(section => ({
        ...section, questions: section.questions.map(item => ({ ...item, options: item.options.map(option => option.trim()).filter(Boolean) })),
      })),
    };
    if (!schema.title.trim()) {
      setFormError("Isi judul formulir.");
      formTitle.current?.focus();
      return;
    }
    for (const item of normalized.sections.flatMap(section => section.questions)) {
      const options = item.options;
      if (!item.label.trim() || (choiceTypes.has(item.type) && (!options.length || options.length > 50 || new Set(options).size !== options.length || options.some(option => option.length > 200)))) {
        select(item.id, true);
        setFormError(!item.label.trim() ? "Isi label pertanyaan." : "Masukkan 1–50 pilihan unik, maksimal 200 karakter per pilihan.");
        return;
      }
    }
    setFormError("");
    action.run(async () => {
      try {
        const saved = await api<Registration>(path, { method: "PUT", body: { expected_version: baseVersion, schema: normalized } });
        setBaseVersion(saved.version); setSchema(saved.draft_schema); setSavedSchema(saved.draft_schema); reload();
      } catch (error) { reload(); throw error; }
    }, "Draft tersimpan. Terbitkan draft untuk menerapkan perubahan ke peserta.");
  }

  return <section className="erp-panel erp-stack">
    <header className="erp-panel-heading">
      <div><h2>Formulir pendaftaran</h2><p className="erp-muted">{latest ? `Versi terbit ${latest.number}` : "Belum diterbitkan"} · {registration.accepting && !event.frozen && event.status === "PUBLISHED" ? "Pendaftaran dibuka" : "Pendaftaran ditutup"}</p></div>
      {event.capabilities.edit && <button type="button" aria-pressed={preview} onClick={() => setPreview(!preview)}>{preview ? "Kembali ke editor" : "Preview peserta"}</button>}
    </header>
    <Feedback {...action}/>
    {baseVersion !== registration.version && !refreshing && <div className="erp-error" role="alert">
      Draft di server telah berubah. Isian Anda masih tersedia di editor.{" "}
      <button disabled={action.busy} onClick={() => {
        if (changed && !window.confirm("Ganti perubahan editor dengan draft terbaru dari server?")) return;
        setSchema(registration.draft_schema); setSavedSchema(registration.draft_schema); setBaseVersion(registration.version); setFormError("");
      }}>Muat draft server</button>
    </div>}
    <DirectionalPanels step={preview || !event.capabilities.edit ? 1 : 0} announcement={preview || !event.capabilities.edit ? "Pratinjau peserta aktif" : "Editor formulir aktif"}>
      {preview || !event.capabilities.edit ? <form className="erp-reading-form" onSubmit={submit => submit.preventDefault()}>
        <h2>{schema.title}</h2>{schema.description && <p className="erp-record-text">{schema.description}</p>}
        <RegistrationFields schema={schema} values={values} onChange={setValues}/>
      </form> : <form className="erp-builder-editor" noValidate onSubmit={submit => { submit.preventDefault(); saveDraft(); }}>
        {formError && <p id="builder-validation" className="erp-error" role="alert">{formError}</p>}
        <fieldset className="erp-builder-layout" disabled={action.busy}>
          <div ref={canvas} className="erp-builder-canvas">
            <div className="erp-form-section">
              <label>Judul formulir *<input ref={formTitle} value={schema.title} required maxLength={160} onChange={input => setSchema({ ...schema, title: input.target.value })}/></label>
              <details open={!!savedSchema.description || undefined}><summary>Instruksi peserta</summary>
                <label><span className="erp-visually-hidden">Instruksi peserta</span><textarea value={schema.description} maxLength={5000} onChange={input => setSchema({ ...schema, description: input.target.value })}/></label>
              </details>
            </div>
            {schema.sections.map((section, index) => <section className="erp-builder-section" key={section.id}>
              <div className="erp-row-between">
                <button type="button" className="erp-builder-section-title" aria-pressed={selection === section.id} onClick={() => select(section.id, true)}>{section.title || (index ? `Bagian ${index + 1}` : "Bagian utama")}</button>
                <small>{section.questions.length} pertanyaan</small>
              </div>
              <ol className="erp-builder-questions">{section.questions.map(item => <li key={item.id}>
                <button type="button" aria-pressed={selection === item.id} onClick={() => select(item.id, true)}>
                  <span>{item.label.trim() || "Pertanyaan tanpa label"}{item.required && " *"}</span><small>{types[item.type]}</small>
                </button>
              </li>)}</ol>
              <button type="button" disabled={total >= 100} onClick={() => addQuestion(section.id)}>Tambah pertanyaan</button>
            </section>)}
            <div><button type="button" disabled={schema.sections.length >= 20} onClick={() => {
              const section = { id: crypto.randomUUID(), title: "Bagian baru", questions: [] };
              setSchema({ ...schema, sections: [...schema.sections, section] });
              select(section.id, true);
            }}>Tambah bagian</button></div>
          </div>
          <aside className="erp-builder-properties" aria-label="Properti formulir">
            {selectedSection && <button type="button" className="erp-builder-back" onClick={() => canvas.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus()}>Kembali ke daftar</button>}
            {selectedQuestion && selectedSection ? <section key={selectedQuestion.id} className="erp-form-section">
              <h3>Edit pertanyaan</h3>
              <label>Label pertanyaan<input ref={editorLabel} value={selectedQuestion.label} maxLength={200} required onChange={input => question({ label: input.target.value })}/></label>
              <label>Jenis jawaban<select value={selectedQuestion.type} onChange={input => {
                const type = input.target.value;
                question({ type, options: choiceTypes.has(type) ? selectedQuestion.options.length ? selectedQuestion.options : ["Pilihan pertama"] : [] });
              }}>{Object.entries(types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              {choiceTypes.has(selectedQuestion.type) && <label>Pilihan jawaban, satu per baris<textarea rows={4} value={selectedQuestion.options.join("\n")} onChange={input => question({ options: input.target.value.split("\n") })}/></label>}
              <label className="erp-check-label"><input type="checkbox" checked={selectedQuestion.required} onChange={input => question({ required: input.target.checked })}/> Wajib diisi</label>
              <details><summary>Petunjuk dan contoh jawaban</summary><div className="erp-field-stack">
                <label>Placeholder<input value={selectedQuestion.placeholder} maxLength={200} onChange={input => question({ placeholder: input.target.value })}/></label>
                <label>Petunjuk<input value={selectedQuestion.hint} maxLength={500} onChange={input => question({ hint: input.target.value })}/></label>
              </div></details>
              <div className="erp-row">
                <button type="button" disabled={questionIndex === 0} onClick={() => moveQuestion(-1)}>Pertanyaan naik</button>
                <button type="button" disabled={questionIndex === selectedSection.questions.length - 1} onClick={() => moveQuestion(1)}>Pertanyaan turun</button>
              </div>
              <div><button type="button" className="erp-danger" onClick={removeQuestion}>Hapus pertanyaan</button></div>
            </section> : selectedSection ? <section key={selectedSection.id} className="erp-form-section">
              <h3>Edit bagian</h3>
              <label>Judul bagian<input ref={editorLabel} value={selectedSection.title} maxLength={200} onChange={input => {
                const title = input.target.value;
                updateSection(selectedSection.id, section => ({ ...section, title }));
              }}/></label>
              <div className="erp-row">
                <button type="button" disabled={schema.sections[0] === selectedSection} onClick={() => moveSection(schema.sections.indexOf(selectedSection), -1)}>Bagian naik</button>
                <button type="button" disabled={schema.sections.at(-1) === selectedSection} onClick={() => moveSection(schema.sections.indexOf(selectedSection), 1)}>Bagian turun</button>
              </div>
              <div><button type="button" className="erp-danger" onClick={() => {
                if (selectedSection.questions.length && !window.confirm("Hapus bagian ini beserta semua pertanyaannya dari draft?")) return;
                const sections = schema.sections.filter(section => section.id !== selectedSection.id);
                setSchema({ ...schema, sections });
                select(sections[0]?.id ?? "");
              }}>Hapus bagian</button></div>
            </section> : <p className="erp-muted">Pilih bagian atau pertanyaan untuk mengeditnya.</p>}
          </aside>
        </fieldset>
        <div className="erp-form-actions"><button className="erp-primary" disabled={action.busy || refreshing}>{action.busy ? "Memproses…" : "Simpan draft"}</button>{changed && <small role="status">Perubahan belum disimpan</small>}</div>
      </form>}
    </DirectionalPanels>
    {event.capabilities.edit && <section className="erp-form-section">
      <h3>Publikasi</h3>
      {event.status !== "PUBLISHED" && <p>Terbitkan acara melalui tab Acara sebelum membuka pendaftaran.</p>}
      <p className="erp-muted">Terbitkan draft tersimpan untuk membuat versi baru. Respons lama tetap terhubung ke versi sebelumnya.</p>
      <div className="erp-row">
        <button disabled={action.busy || refreshing} onClick={() => {
          if (!window.confirm(changed ? "Terbitkan draft tersimpan? Perubahan yang belum disimpan tidak ikut diterbitkan." : "Terbitkan draft tersimpan sebagai versi baru?")) return;
          action.run(async () => { const saved = await api<Registration>(path + "/publish", { method: "POST", body: { expected_version: baseVersion } }); setBaseVersion(saved.version); reload(); });
        }}>Terbitkan draf tersimpan</button>
        <button disabled={action.busy || refreshing || !latest || event.status !== "PUBLISHED"} onClick={() => action.run(async () => {
          const saved = await api<Registration>(path + "/acceptance", { method: "POST", body: { expected_version: baseVersion, accepting: !registration.accepting } }); setBaseVersion(saved.version); reload();
        })}>{registration.accepting ? "Tutup pendaftaran" : "Buka pendaftaran"}</button>
      </div>
    </section>}
  </section>;
}
