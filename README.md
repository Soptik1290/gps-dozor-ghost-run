# 🏎️ GPS Dozor: Ghost Run

*Změň nudnou rozvážku na F1 kvalifikaci (bezpečně).*

## 1. Pro koho to je a proč? (Justifikace projektu)
**Cílová skupina:** Kurýři, řidiči rozvozových služeb (food delivery) a logistické firmy s opakujícími se trasami.

**Proč Ghost Run?**
Běžné sledování GPS dat je pro řidiče jen "velký bratr", který je často nudí a stresuje. *Ghost Run* přináší gamifikaci. Aplikace umožňuje řidiči "závodit" proti svému vlastnímu historicky nejlepšímu času na dané trase, nebo proti času zkušenějšího kolegy (tzv. "Ghost"). 

**Business hodnota a bezpečnostní pojistka:**
Aplikace nejen vizualizuje "ideální stopu", ale především **učí řidiče efektivitě**. Abychom předešli nebezpečné jízdě, systém odměňuje plynulost. Pokud řidič jede agresivně (z dodaného API čerpáme `eco-driving-events` jako prudké brzdění, cornering, zrychlení), dostává virtuální časové penalizace. Motivujeme tak k plynulosti, bezpečnosti a nižší spotřebě (snížení flotilových nákladů).

---

## 2. Jaké AI nástroje jsem použil a jaký byl workflow
Celý projekt byl stavěn agilním "Vibe Coding" přístupem. Do role AI inženýra a UI/UX experta jsem zapojil pokročilého autonomního agenta, se kterým jsem aplikaci tvořil pomocí Pair Programingu.

**Workflow ("Vibe Coding"):**
1. **Ideation & Architektura:** Pomocí AI byl navržen kompletní technologický stack (Vue 3, Tailwind v4, Mapbox GL, Pinia) a excentrický design systém ("Marathon Brutalism" - temné sci-fi, glassmorphism, CRT šum).
2. **Step-by-Step iterace:** Práce probíhala ve fázích. AI nejprve vygenerovalo detailní *Implementation Plan*, a teprve po mém schválení psalo a rovnou samo spouštělo kód v terminálu.
3. **Data Wiring:** Aplikace využívá 4 reálné API endpointy (`groups`, `trips`, `history`, `eco-driving`) konzumované přes asynchronní composables, + 1 externí API (`OpenMeteo`) pro vliv počasí.
4. **LLM Integrace:**  Přímo do appky je implementováno volání **OpenAI (gpt-4o-mini)**. Telemetrie v reálném čase krmí prompt, ze kterého LLM generuje vtipné a lakonické rady ("Race Engineer Debrief"), jenž jsou následně skrze Web Speech API předčítány robotickým hlasem.

---

## 3. Na co jsem narazil a jak jsem to vyřešil (Výzvy)
**Problém 1: Výpočet časového rozdílu (Ghost Delta) z asynchronních GPS bodů.**
GPS souřadnice Ducha a aktuální jízdy nejsou nikdy perfektně synchronizované v prostoru ani čase. 
*Řešení:* Vytvořil jsem matematický algoritmus využívající Haversine formuli k namapování obou tras podle ujeté vzdálenosti, který nachází přesný frakční index. Pro odstranění otravných "skoků" v datech je na výpočet zpoždění aplikován vyhlazovací plovoucí průměr (5-sample rolling average).

**Problém 2: Srozumitelnost pro testera & Desktop zobrazení.**
Původní "High-Fidelity" sci-fi návrh působil na širokém monitoru příliš roztahaně a texty (např. `SYS::AUTHENTICATE`) byly příliš kryptické pro B2B nástroj.
*Řešení:* Vyvinuli jsme Desktop Wrapper, který aplikaci centruje do "Phone simulátoru". Do něj jsme přidali prázdné stavy (Empty States s jasnými CTA tlačítky) a Readme Sidebar s předvyplněnými testovacími přístupy, aby byla aplikace "*použitelná okamžitě bez návodu*".

**Problém 3: Zvládání CORS limitů a závislost na placeném OpenAI API.**
*Řešení:* Integrace API klíčů byla abstrahována do `.env` souborů. Pokud si hodnotitel nevyplní vlastní OpenAI klíč, aplikace využije robustní "Fallback mode" — systém se inteligentně přepne na vestavěnou rozhodovací logiku, generující in-game taktické povely, takže celá appka spolehlivě funguje i tak.

---

## 4. Co bych udělal jinak nebo přidal, kdybych měl víc času
*   **Modul "CREW" (Multi-agent sledování v reálném čase):** V Dashboardu i na mapě je teď přepínač na "My Crew". Dalším krokem by pro opravdovou business hodnotu bylo začlenění WebSockets pole pro zobrazení pozice ostatních kolegů souběžně (multiplayer vrstva).
*   **Leaderboards & Odznaky:** Perzistentní herní smyčka pro flotilu. Chtěl bych přidat systém odznaků ("Plynulost týdne" za jízdu bez eco penalty) propojený na tabulku nejlepších. Snížilo by to Opex náklady flotil na opravy.
*   **Pokročilé terénní vrstvy:** Mapbox Terrain-DEM v2, aby 3D lajna trasy reálně kopírovala stoupání i klesání v horském terénu a Race Engineer radil například "Pozor na brzdy, klesání." 

---
*Powered by Vue 3, Mapbox a GenAI.*
