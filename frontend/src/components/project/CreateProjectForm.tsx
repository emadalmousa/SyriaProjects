"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Alert, Button } from "@/components/ui";
import { InputField, SelectField, TextareaField } from "@/components/ui";
import { PageHeader, SectionCard } from "@/components/layout";
import { CATEGORIES } from "@/components/project";

type BudgetItem = { title: string; amount: string; is_required: boolean };
type Milestone  = { title: string; description: string };

const addBtnCls = "text-sm font-medium text-brand hover:underline";
const removeBtnCls = "shrink-0 text-[var(--clr-danger)] hover:opacity-80";

export function CreateProjectForm() {
  const router = useRouter();
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const [basics, setBasics]   = useState({ title: "", short_description: "", description: "", category: "FOOD" });
  const [location, setLocation] = useState({ country: "Syria", city: "", district: "", address_text: "" });
  const [budget, setBudget]   = useState({ total_budget: "", own_capital: "0", currency: "EUR" });
  const [idea, setIdea]       = useState({
    project_goal: "", target_customers: "", business_model: "",
    expected_monthly_revenue: "", expected_monthly_profit: "", expected_duration_months: "",
  });
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([{ title: "", amount: "", is_required: true }]);
  const [milestones, setMilestones]   = useState<Milestone[]>([{ title: "", description: "" }]);

  const neededCapital = () => {
    const total = parseFloat(budget.total_budget) || 0;
    const own   = parseFloat(budget.own_capital)  || 0;
    return Math.max(total - own, 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const payload = {
        ...basics, ...location,
        total_budget: parseFloat(budget.total_budget),
        own_capital:  parseFloat(budget.own_capital) || 0,
        currency: budget.currency,
        project_goal:             idea.project_goal || null,
        target_customers:         idea.target_customers || null,
        business_model:           idea.business_model || null,
        expected_monthly_revenue: idea.expected_monthly_revenue ? parseFloat(idea.expected_monthly_revenue) : null,
        expected_monthly_profit:  idea.expected_monthly_profit  ? parseFloat(idea.expected_monthly_profit)  : null,
        expected_duration_months: idea.expected_duration_months ? parseInt(idea.expected_duration_months)   : null,
      };
      const project = await api.projects.create(payload) as { id: number };
      for (const item of budgetItems.filter((i) => i.title && i.amount))
        await api.projects.budgetItems.create(project.id, { title: item.title, amount: parseFloat(item.amount), is_required: item.is_required });
      for (const ms of milestones.filter((m) => m.title))
        await api.projects.milestones.create(project.id, { title: ms.title, description: ms.description || null });
      router.push(`/projects/${project.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler beim Erstellen");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[var(--clr-bg)]">
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">

        <PageHeader title="Neues Projekt erstellen" backHref="/dashboard" backLabel="Dashboard" />

        {error && <Alert type="error" className="mb-5">{error}</Alert>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* 1. Grunddaten */}
          <SectionCard title="Grunddaten" step={1}>
            <div className="flex flex-col gap-4">
              <InputField label="Titel" type="text" value={basics.title} onChange={(e) => setBasics({ ...basics, title: e.target.value })} placeholder="z.B. Kleine Bäckerei in Aleppo" required />
              <InputField label="Kurzbeschreibung" type="text" value={basics.short_description} onChange={(e) => setBasics({ ...basics, short_description: e.target.value })} placeholder="Max. 300 Zeichen" maxLength={300} />
              <TextareaField label="Beschreibung" value={basics.description} onChange={(e) => setBasics({ ...basics, description: e.target.value })} rows={4} placeholder="Beschreibe dein Projekt ausführlich…" required />
              <SelectField label="Kategorie" value={basics.category} onChange={(e) => setBasics({ ...basics, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </SelectField>
            </div>
          </SectionCard>

          {/* 2. Standort */}
          <SectionCard title="Standort" step={2}>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Land" type="text" value={location.country} onChange={(e) => setLocation({ ...location, country: e.target.value })} />
              <InputField label="Stadt" type="text" value={location.city} onChange={(e) => setLocation({ ...location, city: e.target.value })} placeholder="z.B. Aleppo" required />
              <InputField label="Bezirk" type="text" value={location.district} onChange={(e) => setLocation({ ...location, district: e.target.value })} placeholder="z.B. Al-Shaar" />
              <InputField label="Adresse" type="text" value={location.address_text} onChange={(e) => setLocation({ ...location, address_text: e.target.value })} />
            </div>
          </SectionCard>

          {/* 3. Budget */}
          <SectionCard title="Budget" step={3}>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Gesamtbudget (€)" type="number" value={budget.total_budget} onChange={(e) => setBudget({ ...budget, total_budget: e.target.value })} placeholder="5000" min="1" required />
              <InputField label="Eigenkapital (€)" type="number" value={budget.own_capital} onChange={(e) => setBudget({ ...budget, own_capital: e.target.value })} placeholder="1200" min="0" />
              <InputField label="Benötigtes Kapital (€)" type="text" value={neededCapital()} readOnly />
              <SelectField label="Währung" value={budget.currency} onChange={(e) => setBudget({ ...budget, currency: e.target.value })}>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="SYP">SYP</option>
              </SelectField>
            </div>
          </SectionCard>

          {/* 4. Projektidee */}
          <SectionCard title="Projektidee" step={4}>
            <div className="flex flex-col gap-4">
              <TextareaField label="Projektziel" value={idea.project_goal} onChange={(e) => setIdea({ ...idea, project_goal: e.target.value })} rows={2} placeholder="Was soll mit dem Projekt erreicht werden?" />
              <TextareaField label="Zielkunden" value={idea.target_customers} onChange={(e) => setIdea({ ...idea, target_customers: e.target.value })} rows={2} placeholder="Wer sind deine Kunden?" />
              <TextareaField label="Geschäftsmodell" value={idea.business_model} onChange={(e) => setIdea({ ...idea, business_model: e.target.value })} rows={2} placeholder="Wie verdient das Projekt Geld?" />
              <div className="grid grid-cols-3 gap-4">
                <InputField label="Erw. Monatsumsatz (€)" type="number" value={idea.expected_monthly_revenue} onChange={(e) => setIdea({ ...idea, expected_monthly_revenue: e.target.value })} placeholder="1500" min="0" />
                <InputField label="Erw. Monatsgewinn (€)" type="number" value={idea.expected_monthly_profit} onChange={(e) => setIdea({ ...idea, expected_monthly_profit: e.target.value })} placeholder="400" />
                <InputField label="Laufzeit (Monate)" type="number" value={idea.expected_duration_months} onChange={(e) => setIdea({ ...idea, expected_duration_months: e.target.value })} placeholder="3" min="1" />
              </div>
            </div>
          </SectionCard>

          {/* 5. Budgetpositionen */}
          <SectionCard title="Budgetpositionen" step={5}>
            {budgetItems.map((item, i) => (
              <div key={i} className="mb-3 grid grid-cols-3 gap-3 items-end">
                <InputField label={i === 0 ? "Position" : ""} type="text" value={item.title} onChange={(e) => { const n = [...budgetItems]; n[i].title = e.target.value; setBudgetItems(n); }} placeholder="z.B. Backofen" />
                <InputField label={i === 0 ? "Betrag (€)" : ""} type="number" value={item.amount} onChange={(e) => { const n = [...budgetItems]; n[i].amount = e.target.value; setBudgetItems(n); }} placeholder="Betrag" min="0" />
                <div className="flex items-center gap-2 pb-0.5">
                  <label className="flex items-center gap-1.5 text-sm text-[var(--clr-text-2)]">
                    <input type="checkbox" checked={item.is_required} onChange={(e) => { const n = [...budgetItems]; n[i].is_required = e.target.checked; setBudgetItems(n); }} className="accent-brand" />
                    Pflicht
                  </label>
                  <button type="button" onClick={() => setBudgetItems(budgetItems.filter((_, j) => j !== i))} className={removeBtnCls} aria-label="Entfernen">✕</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setBudgetItems([...budgetItems, { title: "", amount: "", is_required: true }])} className={addBtnCls}>
              + Position hinzufügen
            </button>
          </SectionCard>

          {/* 6. Meilensteine */}
          <SectionCard title="Meilensteine" step={6}>
            {milestones.map((ms, i) => (
              <div key={i} className="mb-3 grid grid-cols-2 gap-3 items-end">
                <InputField label={i === 0 ? "Meilenstein" : ""} type="text" value={ms.title} onChange={(e) => { const n = [...milestones]; n[i].title = e.target.value; setMilestones(n); }} placeholder="z.B. Laden auswählen" />
                <div className="flex gap-2 items-end">
                  <InputField label={i === 0 ? "Beschreibung" : ""} wrapClass="flex-1" type="text" value={ms.description} onChange={(e) => { const n = [...milestones]; n[i].description = e.target.value; setMilestones(n); }} placeholder="Optional" />
                  <button type="button" onClick={() => setMilestones(milestones.filter((_, j) => j !== i))} className={`${removeBtnCls} mb-0.5`} aria-label="Entfernen">✕</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setMilestones([...milestones, { title: "", description: "" }])} className={addBtnCls}>
              + Meilenstein hinzufügen
            </button>
          </SectionCard>

          <Button type="submit" loading={loading} loadingLabel="Wird erstellt..." className="w-full" size="lg">
            Projekt einreichen
          </Button>
        </form>
      </div>
    </div>
  );
}
