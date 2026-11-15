import { useState } from "react";
import { ArrowRight, Check, PlayCircle, Sparkles, TrendingDown, UtensilsCrossed } from "lucide-react";
import { LogoWordmark } from "../components/Brand";
import { Button, Field } from "../components/ui";
import { useData } from "../data/store";
import { useToast } from "../data/toast";
import { RESTAURANT_TYPES, type RestaurantType } from "../types";

export function Welcome() {
  const { createRestaurant, loadDemoData } = useData();
  const { push } = useToast();
  const [mode, setMode] = useState<"welcome" | "setup">("welcome");
  const [name, setName] = useState("");
  const [type, setType] = useState<RestaurantType | "">("");
  const [error, setError] = useState<string | null>(null);

  function startSetup() {
    setMode("setup");
    window.scrollTo({ top: 0 });
  }

  function submitSetup() {
    if (!name.trim()) {
      setError("Please enter your restaurant name.");
      return;
    }
    createRestaurant(name, type);
    push("Welcome to FoodWise PH", "good");
  }

  function exploreDemo() {
    loadDemoData();
    push("Demo data loaded — Kusina ni Maria", "good");
  }

  return (
    <div className="welcome">
      <div className="welcome__pane">
        <LogoWordmark subtitle="Restaurant forecasting" />

        {mode === "welcome" ? (
          <div className="fade-in" style={{ display: "grid", gap: 22 }}>
            <h1 className="welcome__title">
              Prepare smarter.
              <br />
              <em>Waste less.</em>
            </h1>
            <p className="welcome__lede">
              Know how many servings to prepare using your restaurant&rsquo;s daily sales. Record
              what you made and sold, and FoodWise suggests tomorrow&rsquo;s quantities.
            </p>

            <div className="welcome__actions">
              <Button variant="primary" icon={<ArrowRight className="ico" />} onClick={startSetup}>
                Get started
              </Button>
              <Button variant="ghost" icon={<PlayCircle className="ico" />} onClick={exploreDemo}>
                Explore demo
              </Button>
            </div>

            <div className="welcome__points">
              <span className="welcome__point">
                <UtensilsCrossed className="ico" />
                A simple menu with recommended servings beside every dish
              </span>
              <span className="welcome__point">
                <Check className="ico" />
                Record prepared and sold quantities in seconds
              </span>
              <span className="welcome__point">
                <TrendingDown className="ico" />
                See overproduction and potential cost reduction
              </span>
            </div>
          </div>
        ) : (
          <div className="fade-in" style={{ display: "grid", gap: 20, maxWidth: 460 }}>
            <div>
              <h1 className="welcome__title" style={{ fontSize: "clamp(28px,3.4vw,38px)" }}>
                Let&rsquo;s set up your kitchen
              </h1>
              <p className="welcome__lede" style={{ fontSize: 15, marginTop: 10 }}>
                Just a name to get started. You can change everything later.
              </p>
            </div>

            <Field label="Restaurant name" htmlFor="rest-name" error={error}>
              <input
                id="rest-name"
                className="input"
                value={name}
                placeholder="Kusina ni Maria"
                autoComplete="organization"
                autoFocus
                maxLength={60}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitSetup();
                }}
              />
            </Field>

            <Field label="Restaurant type (optional)" htmlFor="rest-type">
              <select
                id="rest-type"
                className="select"
                value={type}
                onChange={(e) => setType(e.target.value as RestaurantType | "")}
              >
                <option value="">Select a type</option>
                {RESTAURANT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Currency" hint="This prototype uses Philippine pesos (₱).">
              <input className="input" value="PHP (₱)" readOnly disabled />
            </Field>

            <div className="welcome__actions">
              <Button variant="primary" icon={<ArrowRight className="ico" />} onClick={submitSetup}>
                Continue
              </Button>
              <Button variant="ghost" onClick={() => setMode("welcome")}>
                Back
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="welcome__media">
        <img src={`${import.meta.env.BASE_URL}dishes/hero.jpg`} alt="" />
        <div className="welcome__quote">
          <b>&ldquo;An elegant digital menu that helps restaurants prepare smarter.&rdquo;</b>
          <small>
            <Sparkles
              className="ico"
              style={{ display: "inline", width: 13, height: 13, verticalAlign: "-2px" }}
            />{" "}
            Built for small and medium restaurants in the Philippines
          </small>
        </div>
      </div>
    </div>
  );
}
