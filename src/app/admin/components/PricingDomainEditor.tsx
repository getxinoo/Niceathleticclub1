import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, Loader2, GripVertical, CheckCircle2 } from "lucide-react";
import { api, BASE_URL } from "../../../lib/api-service";

interface PricingDomainEditorProps {
  blockType: string;
}

export function PricingDomainEditor({ blockType }: PricingDomainEditorProps) {
  const isCards = blockType === "pricing-cards";
  const isAddons = blockType === "pricing-addons";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // wir laden einfach den kompletten dump, speichern aber je nach tab nur plans oder addons
  const [plans, setPlans] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/pricing.php?admin=1`);
      if (!res.ok) throw new Error("Fehler beim Laden");
      const json = await res.json();
      setPlans(json.data.basePlans || []);
      setAddons(json.data.addOns || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      const action = isCards ? "save_plans" : "save_addons";
      const body = isCards ? { basePlans: plans } : { addOns: addons };

      const res = await api.auth.fetch(`${BASE_URL}/pricing.php?action=${action}`, {
        method: "POST",
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (!res.ok || json.status === "error") throw new Error(json.message || "Speicherfehler");
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isCards && !isAddons) return null;

  const inputStyle = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "white",
    padding: "8px 12px",
    fontSize: "13px",
    width: "100%",
    outline: "none"
  };

  return (
    <div className="mt-8 pt-6 border-t border-white/10">
      <h3 className="text-brand font-condensed font-bold tracking-widest text-[11px] uppercase mb-4">
        {isCards ? "Tarif-Daten (Domain)" : "Add-on-Daten (Domain)"}
      </h3>
      <p className="text-white/40 text-[11px] leading-relaxed mb-6">
        Änderungen hier aktualisieren die echte Datenbank und wirken sich sofort auf alle Seiten aus, 
        die diese Daten verwenden. (Speichern separat vom Seitenentwurf!)
      </p>

      {loading ? (
        <div className="flex justify-center p-4"><Loader2 className="animate-spin text-white/50" /></div>
      ) : (
        <div className="flex flex-col gap-6">
          {isCards && plans.map((plan, i) => (
            <div key={i} className="p-4 bg-white/5 border border-white/10 flex flex-col gap-3">
              <input value={plan.name} onChange={e => { const p = [...plans]; p[i].name = e.target.value; setPlans(p); }} style={inputStyle} placeholder="Name (z.B. Starter)" />
              <input value={plan.price} type="number" onChange={e => { const p = [...plans]; p[i].price = Number(e.target.value); setPlans(p); }} style={inputStyle} placeholder="Preis" />
              <input value={plan.period} onChange={e => { const p = [...plans]; p[i].period = e.target.value; setPlans(p); }} style={inputStyle} placeholder="Periode (z.B. pro Monat)" />
              <textarea value={plan.description} onChange={e => { const p = [...plans]; p[i].description = e.target.value; setPlans(p); }} style={inputStyle} placeholder="Beschreibung" rows={2} />
              
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={plan.active} onChange={e => { const p = [...plans]; p[i].active = e.target.checked; setPlans(p); }} />
                <span className="text-white/60 text-xs">Tarif Aktiv</span>
              </div>
            </div>
          ))}

          {isAddons && addons.map((addon, i) => (
            <div key={i} className="p-4 bg-white/5 border border-white/10 flex flex-col gap-3">
              <input value={addon.name} onChange={e => { const a = [...addons]; a[i].name = e.target.value; setAddons(a); }} style={inputStyle} placeholder="Add-on Name" />
              <textarea value={addon.description} onChange={e => { const a = [...addons]; a[i].description = e.target.value; setAddons(a); }} style={inputStyle} placeholder="Beschreibung" rows={2} />
              
              <div className="mt-2 flex flex-col gap-2">
                <span className="text-white/40 text-[10px] uppercase">Optionen</span>
                {addon.options?.map((opt: any, oi: number) => (
                  <div key={oi} className="flex gap-2">
                    <input value={opt.label} onChange={e => { const a = [...addons]; a[i].options[oi].label = e.target.value; setAddons(a); }} style={inputStyle} placeholder="Label" />
                    <input type="number" value={opt.price} onChange={e => { const a = [...addons]; a[i].options[oi].price = Number(e.target.value); setAddons(a); }} style={inputStyle} placeholder="Preis" className="w-24" />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {error && <div className="text-red-400 text-xs p-3 bg-red-400/10 border border-red-400/20">{error}</div>}
          
          <button onClick={handleSave} disabled={saving} className="flex items-center justify-center gap-2 bg-brand text-white p-3 uppercase font-condensed tracking-widest text-[11px] font-bold hover:bg-brand-light transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isCards ? "Tarife Speichern (DB)" : "Add-ons Speichern (DB)"}
          </button>
          
          {success && <div className="text-green-400 text-xs flex items-center gap-1 justify-center"><CheckCircle2 size={12} /> Erfolgreich in Datenbank gespeichert.</div>}
        </div>
      )}
    </div>
  );
}
