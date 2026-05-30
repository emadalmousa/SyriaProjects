"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

const CATEGORIES = [
  { value: "FOOD", label: "Lebensmittel / Bäckerei" },
  { value: "AGRICULTURE", label: "Landwirtschaft" },
  { value: "TRADE", label: "Handel" },
  { value: "HANDMADE", label: "Handwerk" },
  { value: "EDUCATION", label: "Bildung" },
  { value: "HEALTH", label: "Gesundheit" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "TECHNOLOGY", label: "Technologie" },
  { value: "REPAIR_SERVICE", label: "Reparaturservice" },
  { value: "SMALL_SHOP", label: "Kleiner Laden" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "CAFE", label: "Café" },
  { value: "CLOTHING", label: "Bekleidung" },
  { value: "CONSTRUCTION", label: "Bau" },
  { value: "SOLAR_ENERGY", label: "Solarenergie" },
  { value: "WOMEN_BUSINESS", label: "Frauenprojekt" },
  { value: "YOUTH_PROJECT", label: "Jugendprojekt" },
  { value: "OTHER", label: "Sonstiges" },
];

type BudgetItem = { title: string; amount: string; is_required: boolean };
type Milestone = { title: string; description: string };

export default function CreateProjectPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [basics, setBasics] = useState({ title: "", short_description: "", description: "", category: "FOOD" });
  const [location, setLocation] = useState({ country: "Syria", city: "", district: "", address_text: "" });
  const [budget, setBudget] = useState({ total_budget: "", own_capital: "0", currency: "EUR" });
  const [idea, setIdea] = useState({
    project_goal: "", target_customers: "", business_model: "",
    expected_monthly_revenue: "", expected_monthly_profit: "", expected_duration_months: "",
  });
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([{ title: "", amount: "", is_required: true }]);
  const [milestones, setMilestones] = useState<Milestone[]>([{ title: "", description: "" }]);

  const neededCapital = () => {
    const total = parseFloat(budget.total_budget) || 0;
    const own = parseFloat(budget.own_capital) || 0;
    return Math.max(total - own, 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        ...basics,
        ...location,
        total_budget: parseFloat(budget.total_budget),
        own_capital: parseFloat(budget.own_capital) || 0,
        currency: budget.currency,
        project_goal: idea.project_goal || null,
        target_customers: idea.target_customers || null,
        business_model: idea.business_model || null,
        expected_monthly_revenue: idea.expected_monthly_revenue ? parseFloat(idea.expected_monthly_revenue) : null,
        expected_monthly_profit: idea.expected_monthly_profit ? parseFloat(idea.expected_monthly_profit) : null,
        expected_duration_months: idea.expected_duration_months ? parseInt(idea.expected_duration_months) : null,
      };
      const project = await api.projects.create(payload) as { id: number };

      for (const item of budgetItems.filter(i => i.title && i.amount)) {
        await api.projects.budgetItems.create(project.id, {
          title: item.title, amount: parseFloat(item.amount), is_required: item.is_required,
        });
      }
      for (const ms of milestones.filter(m => m.title)) {
        await api.projects.milestones.create(project.id, { title: ms.title, description: ms.description || null });
      }
      router.push(`/projects/${project.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler beim Erstellen");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white";
  const labelClass = "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";
  const sectionClass = "mb-8 rounded-xl border bg-white p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700";

  return (
    <main className="p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm hover:border-gray-400 hover:text-gray-900 transition-colors dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-400 dark:hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
          <h1 className="text-2xl font-bold dark:text-white">Neues Projekt erstellen</h1>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* Schritt 1: Grunddaten */}
          <div className={sectionClass}>
            <h2 className="mb-4 text-lg font-semibold dark:text-white">1. Grunddaten</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>Titel *</label>
                <input type="text" value={basics.title} onChange={e => setBasics({...basics, title: e.target.value})} required className={inputClass} placeholder="z.B. Kleine Bäckerei in Aleppo" />
              </div>
              <div>
                <label className={labelClass}>Kurzbeschreibung</label>
                <input type="text" value={basics.short_description} onChange={e => setBasics({...basics, short_description: e.target.value})} className={inputClass} placeholder="Max. 300 Zeichen" maxLength={300} />
              </div>
              <div>
                <label className={labelClass}>Beschreibung *</label>
                <textarea value={basics.description} onChange={e => setBasics({...basics, description: e.target.value})} required rows={4} className={inputClass} placeholder="Beschreibe dein Projekt ausführlich..." />
              </div>
              <div>
                <label className={labelClass}>Kategorie *</label>
                <select value={basics.category} onChange={e => setBasics({...basics, category: e.target.value})} className={inputClass}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Schritt 2: Standort */}
          <div className={sectionClass}>
            <h2 className="mb-4 text-lg font-semibold dark:text-white">2. Standort</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Land</label>
                <input type="text" value={location.country} onChange={e => setLocation({...location, country: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Stadt *</label>
                <input type="text" value={location.city} onChange={e => setLocation({...location, city: e.target.value})} required className={inputClass} placeholder="z.B. Aleppo" />
              </div>
              <div>
                <label className={labelClass}>Bezirk</label>
                <input type="text" value={location.district} onChange={e => setLocation({...location, district: e.target.value})} className={inputClass} placeholder="z.B. Al-Shaar" />
              </div>
              <div>
                <label className={labelClass}>Adresse / Beschreibung</label>
                <input type="text" value={location.address_text} onChange={e => setLocation({...location, address_text: e.target.value})} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Schritt 3: Budget */}
          <div className={sectionClass}>
            <h2 className="mb-4 text-lg font-semibold dark:text-white">3. Budget</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Gesamtbudget * (€)</label>
                <input type="number" value={budget.total_budget} onChange={e => setBudget({...budget, total_budget: e.target.value})} required min="1" className={inputClass} placeholder="5000" />
              </div>
              <div>
                <label className={labelClass}>Eigenkapital (€)</label>
                <input type="number" value={budget.own_capital} onChange={e => setBudget({...budget, own_capital: e.target.value})} min="0" className={inputClass} placeholder="1200" />
              </div>
              <div>
                <label className={labelClass}>Benötigtes Kapital (€)</label>
                <input type="text" value={neededCapital()} readOnly className={`${inputClass} bg-gray-50 dark:bg-gray-700 text-gray-500`} />
              </div>
              <div>
                <label className={labelClass}>Währung</label>
                <select value={budget.currency} onChange={e => setBudget({...budget, currency: e.target.value})} className={inputClass}>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="SYP">SYP</option>
                </select>
              </div>
            </div>
          </div>

          {/* Schritt 4: Projektidee */}
          <div className={sectionClass}>
            <h2 className="mb-4 text-lg font-semibold dark:text-white">4. Projektidee</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>Projektziel</label>
                <textarea value={idea.project_goal} onChange={e => setIdea({...idea, project_goal: e.target.value})} rows={2} className={inputClass} placeholder="Was soll mit dem Projekt erreicht werden?" />
              </div>
              <div>
                <label className={labelClass}>Zielkunden</label>
                <textarea value={idea.target_customers} onChange={e => setIdea({...idea, target_customers: e.target.value})} rows={2} className={inputClass} placeholder="Wer sind deine Kunden?" />
              </div>
              <div>
                <label className={labelClass}>Geschäftsmodell</label>
                <textarea value={idea.business_model} onChange={e => setIdea({...idea, business_model: e.target.value})} rows={2} className={inputClass} placeholder="Wie verdient das Projekt Geld?" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Erw. Monatsumsatz (€)</label>
                  <input type="number" value={idea.expected_monthly_revenue} onChange={e => setIdea({...idea, expected_monthly_revenue: e.target.value})} min="0" className={inputClass} placeholder="1500" />
                </div>
                <div>
                  <label className={labelClass}>Erw. Monatsgewinn (€)</label>
                  <input type="number" value={idea.expected_monthly_profit} onChange={e => setIdea({...idea, expected_monthly_profit: e.target.value})} className={inputClass} placeholder="400" />
                </div>
                <div>
                  <label className={labelClass}>Laufzeit (Monate)</label>
                  <input type="number" value={idea.expected_duration_months} onChange={e => setIdea({...idea, expected_duration_months: e.target.value})} min="1" className={inputClass} placeholder="3" />
                </div>
              </div>
            </div>
          </div>

          {/* Schritt 5: Budgetpositionen */}
          <div className={sectionClass}>
            <h2 className="mb-4 text-lg font-semibold dark:text-white">5. Budgetpositionen</h2>
            {budgetItems.map((item, i) => (
              <div key={i} className="mb-3 grid grid-cols-3 gap-3">
                <input type="text" value={item.title} onChange={e => { const n = [...budgetItems]; n[i].title = e.target.value; setBudgetItems(n); }} className={inputClass} placeholder="z.B. Backofen" />
                <input type="number" value={item.amount} onChange={e => { const n = [...budgetItems]; n[i].amount = e.target.value; setBudgetItems(n); }} className={inputClass} placeholder="Betrag (€)" min="0" />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-sm dark:text-gray-300">
                    <input type="checkbox" checked={item.is_required} onChange={e => { const n = [...budgetItems]; n[i].is_required = e.target.checked; setBudgetItems(n); }} />
                    Pflicht
                  </label>
                  <button type="button" onClick={() => setBudgetItems(budgetItems.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">✕</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setBudgetItems([...budgetItems, { title: "", amount: "", is_required: true }])}
              className="mt-2 text-sm text-blue-600 hover:underline dark:text-blue-400">
              + Position hinzufügen
            </button>
          </div>

          {/* Schritt 6: Meilensteine */}
          <div className={sectionClass}>
            <h2 className="mb-4 text-lg font-semibold dark:text-white">6. Meilensteine</h2>
            {milestones.map((ms, i) => (
              <div key={i} className="mb-3 grid grid-cols-2 gap-3">
                <input type="text" value={ms.title} onChange={e => { const n = [...milestones]; n[i].title = e.target.value; setMilestones(n); }} className={inputClass} placeholder="z.B. Laden auswählen" />
                <div className="flex gap-2">
                  <input type="text" value={ms.description} onChange={e => { const n = [...milestones]; n[i].description = e.target.value; setMilestones(n); }} className={inputClass} placeholder="Beschreibung (optional)" />
                  <button type="button" onClick={() => setMilestones(milestones.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">✕</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setMilestones([...milestones, { title: "", description: "" }])}
              className="mt-2 text-sm text-blue-600 hover:underline dark:text-blue-400">
              + Meilenstein hinzufügen
            </button>
          </div>

          <button type="submit" disabled={loading}
            className="rounded-xl bg-blue-600 py-4 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? "Wird erstellt..." : "Projekt einreichen"}
          </button>
        </form>
      </div>
    </main>
  );
}
