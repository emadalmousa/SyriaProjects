"use client";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { Alert, Button } from "@/components/ui";
import { InputField, SelectField, TextareaField } from "@/components/ui";

const SYRIAN_GOV_EN = [
  "Damascus", "Rural Damascus", "Aleppo", "Homs", "Hama",
  "Latakia", "Tartus", "Deir ez-Zor", "Raqqa", "Idlib",
  "Daraa", "As-Suwayda", "Al-Hasakah", "Quneitra",
];

const SYRIAN_GOV_AR = [
  "دمشق", "ريف دمشق", "حلب", "حمص", "حماة",
  "اللاذقية", "طرطوس", "دير الزور", "الرقة", "إدلب",
  "درعا", "السويداء", "الحسكة", "القنيطرة",
];
import { PageHeader, SectionCard } from "@/components/layout";
import { ALL_CATEGORIES } from "@/components/project";

type BudgetItem = { title: string; amount: string; is_required: boolean };
type Milestone  = { title: string; description: string };

const addBtnCls = "text-sm font-medium text-brand hover:underline";
const removeBtnCls = "shrink-0 text-[var(--clr-danger)] hover:opacity-80";

export function CreateProjectForm() {
  const router = useRouter();
  const t = useTranslations("project.createForm");
  const tCat = useTranslations("project.categoryFull");
  const locale = useLocale();
  const governorates = locale === "ar" ? SYRIAN_GOV_AR : SYRIAN_GOV_EN;
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
      setError(err instanceof Error ? err.message : t("error"));
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[var(--clr-bg)]">
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">

        <PageHeader title={t("pageTitle")} backHref="/dashboard" backLabel={t("backLabel")} />

        {error && <Alert type="error" className="mb-5">{error}</Alert>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* 1. Grunddaten */}
          <SectionCard title={t("basics")} step={1}>
            <div className="flex flex-col gap-4">
              <InputField label={t("title")} type="text" value={basics.title} onChange={(e) => setBasics({ ...basics, title: e.target.value })} placeholder={t("titlePlaceholder")} required />
              <InputField label={t("shortDescription")} type="text" value={basics.short_description} onChange={(e) => setBasics({ ...basics, short_description: e.target.value })} placeholder={t("shortDescriptionPlaceholder")} maxLength={300} />
              <TextareaField label={t("description")} value={basics.description} onChange={(e) => setBasics({ ...basics, description: e.target.value })} rows={4} placeholder={t("descriptionPlaceholder")} required />
              <SelectField label={t("category")} value={basics.category} onChange={(e) => setBasics({ ...basics, category: e.target.value })}>
                {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{tCat(c as Parameters<typeof tCat>[0])}</option>)}
              </SelectField>
            </div>
          </SectionCard>

          {/* 2. Standort */}
          <SectionCard title={t("location")} step={2}>
            <div className="grid grid-cols-2 gap-4">
              <InputField label={t("country")} type="text" value={location.country} readOnly className="opacity-70 cursor-not-allowed" ltr />
              <SelectField label={locale === "ar" ? "المحافظة *" : "Bundesland *"} value={location.city} onChange={(e) => setLocation({ ...location, city: e.target.value })} required>
                <option value="">{locale === "ar" ? "اختر المحافظة" : "Bitte wählen"}</option>
                {governorates.map((g) => <option key={g} value={g}>{g}</option>)}
              </SelectField>
              <InputField label={locale === "ar" ? "المدينة" : "Stadt"} type="text" value={location.district} onChange={(e) => setLocation({ ...location, district: e.target.value })} required ltr />
              <InputField label={t("address")} type="text" value={location.address_text} onChange={(e) => setLocation({ ...location, address_text: e.target.value })} />
            </div>
          </SectionCard>

          {/* 3. Budget */}
          <SectionCard title={t("budget")} step={3}>
            <div className="grid grid-cols-2 gap-4">
              <InputField label={t("totalBudget")} type="number" value={budget.total_budget} onChange={(e) => setBudget({ ...budget, total_budget: e.target.value })} placeholder="5000" min="1" required />
              <InputField label={t("ownCapital")} type="number" value={budget.own_capital} onChange={(e) => setBudget({ ...budget, own_capital: e.target.value })} placeholder="1200" min="0" />
              <InputField label={t("neededCapital")} type="text" value={neededCapital()} readOnly />
              <SelectField label={t("currency")} value={budget.currency} onChange={(e) => setBudget({ ...budget, currency: e.target.value })}>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="SYP">SYP</option>
              </SelectField>
            </div>
          </SectionCard>

          {/* 4. Projektidee */}
          <SectionCard title={t("idea")} step={4}>
            <div className="flex flex-col gap-4">
              <TextareaField label={t("projectGoal")} value={idea.project_goal} onChange={(e) => setIdea({ ...idea, project_goal: e.target.value })} rows={2} placeholder={t("projectGoalPlaceholder")} />
              <TextareaField label={t("targetCustomers")} value={idea.target_customers} onChange={(e) => setIdea({ ...idea, target_customers: e.target.value })} rows={2} placeholder={t("targetCustomersPlaceholder")} />
              <TextareaField label={t("businessModel")} value={idea.business_model} onChange={(e) => setIdea({ ...idea, business_model: e.target.value })} rows={2} placeholder={t("businessModelPlaceholder")} />
              <div className="grid grid-cols-3 gap-4">
                <InputField label={t("monthlyRevenue")} type="number" value={idea.expected_monthly_revenue} onChange={(e) => setIdea({ ...idea, expected_monthly_revenue: e.target.value })} placeholder="1500" min="0" />
                <InputField label={t("monthlyProfit")} type="number" value={idea.expected_monthly_profit} onChange={(e) => setIdea({ ...idea, expected_monthly_profit: e.target.value })} placeholder="400" />
                <InputField label={t("duration")} type="number" value={idea.expected_duration_months} onChange={(e) => setIdea({ ...idea, expected_duration_months: e.target.value })} placeholder="3" min="1" />
              </div>
            </div>
          </SectionCard>

          {/* 5. Budgetpositionen */}
          <SectionCard title={t("budgetItems")} step={5}>
            {budgetItems.map((item, i) => (
              <div key={i} className="mb-3 grid grid-cols-3 gap-3 items-end">
                <InputField label={i === 0 ? t("budgetItemTitle") : ""} type="text" value={item.title} onChange={(e) => { const n = [...budgetItems]; n[i].title = e.target.value; setBudgetItems(n); }} placeholder="" />
                <InputField label={i === 0 ? t("budgetItemAmount") : ""} type="number" value={item.amount} onChange={(e) => { const n = [...budgetItems]; n[i].amount = e.target.value; setBudgetItems(n); }} placeholder="" min="0" />
                <div className="flex items-center gap-2 pb-0.5">
                  <label className="flex items-center gap-1.5 text-sm text-[var(--clr-text-2)]">
                    <input type="checkbox" checked={item.is_required} onChange={(e) => { const n = [...budgetItems]; n[i].is_required = e.target.checked; setBudgetItems(n); }} className="accent-brand" />
                    {t("budgetItemRequired")}
                  </label>
                  <button type="button" onClick={() => setBudgetItems(budgetItems.filter((_, j) => j !== i))} className={removeBtnCls} aria-label={t("removeItem")}>{"✕"}</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setBudgetItems([...budgetItems, { title: "", amount: "", is_required: true }])} className={addBtnCls}>
              {t("addBudgetItem")}
            </button>
          </SectionCard>

          {/* 6. Meilensteine */}
          <SectionCard title={t("milestones")} step={6}>
            {milestones.map((ms, i) => (
              <div key={i} className="mb-3 grid grid-cols-2 gap-3 items-end">
                <InputField label={i === 0 ? t("milestoneTitle") : ""} type="text" value={ms.title} onChange={(e) => { const n = [...milestones]; n[i].title = e.target.value; setMilestones(n); }} placeholder={t("milestonePlaceholder")} />
                <div className="flex gap-2 items-end">
                  <InputField label={i === 0 ? t("milestoneDescription") : ""} wrapClass="flex-1" type="text" value={ms.description} onChange={(e) => { const n = [...milestones]; n[i].description = e.target.value; setMilestones(n); }} placeholder={t("milestoneDescriptionPlaceholder")} />
                  <button type="button" onClick={() => setMilestones(milestones.filter((_, j) => j !== i))} className={`${removeBtnCls} mb-0.5`} aria-label={t("removeItem")}>{"✕"}</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setMilestones([...milestones, { title: "", description: "" }])} className={addBtnCls}>
              {t("addMilestone")}
            </button>
          </SectionCard>

          <Button type="submit" loading={loading} loadingLabel={t("submitting")} className="w-full" size="lg">
            {t("submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}
