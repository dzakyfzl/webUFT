"use client";

import { useState } from "react";
import { api } from "../../../lib/erp/client";
import type { Budget, Program } from "../../../lib/erp/types";
import { FormActions, FormSurface } from "../../form-surface";
import { Feedback, formText, rupiah, useAction } from "../../ui";

type Line = Budget["items"][number];
const wholeNumber = new Intl.NumberFormat("id-ID");
function unitPriceLabel(value: string) {
  const [whole, fraction = ""] = value.split(".");
  const decimals = fraction.replace(/0+$/, "");
  return wholeNumber.format(BigInt(whole)) + (decimals ? `,${decimals}` : "");
}

function decimal(value: string) { return value.trim().replace(",", "."); }

function scaledDecimal(value: string) {
  const match = /^\+?(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(decimal(value));
  if (!match) return null;
  const [, whole, fraction = "", exponent = "0"] = match;
  if (!whole && !fraction) return null;
  const shift = 4 + Number(exponent) - fraction.length;
  if (!Number.isSafeInteger(shift) || shift < 0 || shift > 19) return null;
  const valueScaled = BigInt(whole + fraction) * BigInt(10) ** BigInt(shift);
  return valueScaled <= BigInt("9999999999999999999") ? valueScaled : null;
}

export default function BudgetPanel({ program, data, reload }: { program: Program; data: Budget; reload: () => void }) {
  const action = useAction();
  const [editor, setEditor] = useState<Line | "new" | null>(null);
  const path = `/programs/${program.id}/budget`;
  return <section className="erp-panel erp-stack">
    <header className="erp-panel-heading">
      <div><h2>Rencana Anggaran Biaya</h2><p className="erp-muted">Total {rupiah(data.total_rupiah)}</p></div>
      {program.capabilities.edit && <button aria-haspopup="dialog" className="erp-primary" onClick={() => setEditor("new")}>Tambah Item RAB</button>}
    </header>
    <Feedback {...action}/>
    {!data.items.length && <p className="erp-empty">Belum ada item RAB.</p>}
    <div className="erp-table-wrap" role="region" aria-label="Item RAB" tabIndex={0}>
      <table className="erp-budget-table">
        <thead><tr><th scope="col">Item</th><th scope="col">Jumlah</th><th scope="col">Harga satuan</th><th scope="col">Total</th>{program.capabilities.edit && <th scope="col">Aksi</th>}</tr></thead>
        <tbody>{data.items.map(line => <tr key={line.id}>
          <td>{line.name}{(line.category || line.notes) && <small>{[line.category, line.notes].filter(Boolean).join(" · ")}</small>}</td>
          <td>{line.quantity} {line.unit}</td>
          <td className="erp-budget-money">{unitPriceLabel(line.unit_price)}</td>
          <td className="erp-budget-money">{rupiah(line.total_rupiah)}</td>
          {program.capabilities.edit && <td><div className="erp-row">
            <button onClick={() => setEditor(line)} aria-haspopup="dialog">Edit</button>
            <button className="erp-danger" disabled={action.busy} onClick={() => {
              if (window.confirm(`Hapus item ${line.name}?`)) action.run(async () => {
                await api(path + `/${line.id}`, { method: "DELETE", body: { expected_version: line.version } });
                reload();
              });
            }}>Hapus</button>
          </div></td>}
        </tr>)}</tbody>
      </table>
    </div>
    {editor && program.capabilities.edit && <BudgetEditor line={editor === "new" ? null : editor} path={path} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); reload(); }}/>}
  </section>;
}

function BudgetEditor({ line, path, onClose, onSaved }: { line: Line | null; path: string; onClose: () => void; onSaved: () => void }) {
  const action = useAction();
  const [quantity, setQuantity] = useState(line?.quantity ?? "1");
  const [price, setPrice] = useState(line?.unit_price ?? "");
  const scaledQuantity = scaledDecimal(quantity);
  const scaledPrice = scaledDecimal(price);
  // Both values carry four decimal places. Round the product once to whole rupiah.
  const total = scaledQuantity && scaledPrice !== null ? (scaledQuantity * scaledPrice + BigInt(50_000_000)) / BigInt(100_000_000) : null;

  return <FormSurface title={line ? "Edit item RAB" : "Tambah item RAB"} busy={action.busy} onClose={onClose}>
    {close => <form onSubmit={event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      action.run(async () => {
        await api(path + (line ? `/${line.id}` : ""), { method: line ? "PUT" : "POST", body: {
          name: formText(form, "name"), category: formText(form, "category"), quantity: decimal(quantity), unit: formText(form, "unit"),
          unit_price: decimal(price), notes: formText(form, "notes"), expected_version: line?.version ?? 1,
        } });
        onSaved();
      });
    }}>
      <Feedback {...action}/>
      <label>Nama item *<input name="name" defaultValue={line?.name} required maxLength={160}/></label>
      <div className="erp-budget-inputs">
        <label>Jumlah *<input name="quantity" inputMode="decimal" value={quantity} onChange={event => setQuantity(event.target.value)} required maxLength={40}/></label>
        <label>Satuan *<input name="unit" defaultValue={line?.unit} placeholder="pak, orang, hari" required maxLength={80}/></label>
        <label>Harga satuan (Rp) *<input name="unit_price" inputMode="decimal" value={price} onChange={event => setPrice(event.target.value)} required maxLength={40}/></label>
      </div>
      <div className="erp-row-between erp-budget-total"><span>Subtotal item</span><output>{total === null ? "—" : rupiah(total.toString())}</output></div>
      <details open={!!(line?.notes || line?.category) || undefined}>
        <summary>Kategori dan keterangan</summary>
        <div className="erp-field-stack">
          <label>Kategori<input name="category" defaultValue={line?.category} maxLength={100}/></label>
          <label>Keterangan<input name="notes" defaultValue={line?.notes} maxLength={4000}/></label>
        </div>
      </details>
      <FormActions><button className="erp-primary" disabled={action.busy}>{action.busy ? "Menyimpan…" : "Simpan item"}</button><button type="button" disabled={action.busy} onClick={close}>Batal</button></FormActions>
    </form>}
  </FormSurface>;
}
