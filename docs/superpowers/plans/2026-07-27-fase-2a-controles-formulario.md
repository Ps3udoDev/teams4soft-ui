# Fase 2a — Controles de formulario y layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar los 4 componentes de la primera mitad de la Fase 2 — `CheckboxField`, `RadioGroup` (controles de formulario) y `Fieldset`, `FormGrid` (layout) — accesibles, tematizables y con el contrato universal de personalización, listos para publicar como `0.2.0`.

**Architecture:** Cada componente vive en su carpeta (`src/forms/*` para controles, `src/layout/*` para layout) con 4 archivos: `.tsx` (implementación), `.types.ts` (contrato exportado), `.test.tsx` (Vitest + Testing Library) y `.stories.tsx` (Storybook autodocs). `CheckboxField` y `RadioGroup` se basan en primitivas de Radix (`@radix-ui/react-checkbox`, `@radix-ui/react-radio-group`) como peerDependencies; `Fieldset` usa `<fieldset>`/`<legend>` nativos y `FormGrid` es CSS Grid puro con mapas de clases estáticas. Se añade un nuevo subpath de paquete `./layout`.

**Tech Stack:** React 18/19, TypeScript estricto, Radix UI (checkbox, radio-group), Tailwind CSS v4 con tokens `--ui-*`, `class-variance-authority` (no necesario aquí), `cn` (clsx+tailwind-merge), tsup (ESM+CJS+dts), Vitest + Testing Library + user-event, Storybook 10.

## Global Constraints

- **Gestor de paquetes:** pnpm 9.0.0 (`packageManager` fijado). Usar `pnpm`, nunca `npm`/`yarn` para instalar/ejecutar.
- **Directorio de trabajo:** el repo git es la carpeta anidada `teams4soft-ui/teams4soft-ui/`. Todo subagente debe `cd` a esa carpeta antes de operar. La carpeta padre solo tiene documentación.
- **Specs vinculantes** (en la carpeta padre `components_docs/migration/`): `05_checkbox_field.md`, `06_radio_group.md`, `07_fieldset.md`, `08_form_grid.md`. El contrato TypeScript y la lista de historias/pruebas de cada spec son de cumplimiento obligatorio.
- **Contrato universal de personalización** (ver `00_plan_maestro_ui_library.md` §4): todo componente público acepta `className`, `classNames` (por slot), `unstyled`, `style`, `styles` (por slot). Las clases externas se combinan al final con `cn` para poder ganar a las utilidades base. `unstyled` conserva comportamiento y accesibilidad, elimina solo clases visuales.
- **Merge de clases:** `cn(!unstyled && baseClass, className, classNames?.slot)`. El orden importa: base → `className` (raíz) / `classNames.slot` (slot) al final para que el consumidor gane conflictos vía tailwind-merge.
- **Merge de estilos:** raíz `style={{ ...styles?.root, ...style }}`; slots `style={{ ...styles?.slot, ...propStyleDelSlotSiAplica }}`. El `style`/`styles` del consumidor gana.
- **Estados como `data-*`:** presencia condicional con `|| undefined` (p. ej. `data-invalid={invalid || undefined}`), nunca `data-invalid={false}` que renderiza el atributo. Exponer también los `data-*` de Radix (`data-state`, `data-disabled`, `data-orientation`).
- **Callbacks semánticos:** `value` + `onValueChange`, `checked` + `onCheckedChange`, `open` + `onOpenChange`. Sin eventos sintéticos inventados. Soportar controlado y no controlado donde el spec lo pida.
- **Refs:** reenviar el ref relevante con `React.forwardRef` en los componentes con un elemento raíz DOM claro.
- **Tokens semánticos, no colores:** usar `bg-ui-primary`, `text-ui-foreground`, `border-ui-border`, `text-ui-danger`, `ring-ui-focus`, `rounded-(--radius-ui-sm)`/`rounded-(--radius-ui-md)`. **Tailwind v4:** valores CSS-var arbitrarios con PARÉNTESIS `rounded-(--radius-ui-md)`, NUNCA corchetes `rounded-[--radius-ui-md]` (compila a CSS inválido).
- **Import de `cn`/utilidades:** desde `../../lib` (dos niveles: `src/forms/x/` y `src/layout/x/` → `src/lib`).
- **Dev-warnings guardados:** cualquier `console.warn` de desarrollo va detrás de `typeof process !== "undefined" && process.env.NODE_ENV !== "production"`.
- **Sin `any` en la API pública.** Sin dependencias de negocio, router ni stores. Documentación en español, nombres de API en inglés.
- **Verificación de paquete:** `pnpm publish --dry-run --no-git-checks` (pnpm 9 NO soporta `pnpm pack --dry-run`).
- **Tests:** `pnpm test` (vitest run). Cada componente debe pasar sus pruebas antes de commit. `pnpm typecheck` y `pnpm build` deben pasar al final.

---

### Task 1: Dependencias y wiring del build (Radix peers + subpath `./layout`)

Establece las dependencias y la configuración de build que consumen las tareas siguientes. Deliverable verificable de forma independiente: `pnpm install` + `pnpm build` + `pnpm publish --dry-run` muestran el nuevo subpath sin romper nada.

**Files:**
- Modify: `package.json` (peerDependencies, devDependencies, exports)
- Modify: `tsup.config.ts` (nueva entry `layout`)
- Create: `src/layout/index.ts` (placeholder de exports de layout)

**Interfaces:**
- Consumes: nada.
- Produces:
  - peerDependencies `@radix-ui/react-checkbox >=1.1.0` y `@radix-ui/react-radio-group >=1.2.0` (usadas por Task 2/3).
  - Subpath `@teams4soft/teams4soft-ui/layout` mapeado a `dist/layout.{js,cjs,d.ts}` (usado por Task 4/5).
  - `src/layout/index.ts` como punto de re-export de `Fieldset`/`FormGrid`.

- [ ] **Step 1: Añadir Radix peers a package.json**

En `peerDependencies` (junto a los `@radix-ui/react-slot`/`react-tooltip` existentes) añadir:

```json
"@radix-ui/react-checkbox": ">=1.1.0",
"@radix-ui/react-radio-group": ">=1.2.0"
```

En `devDependencies` (para dev/test/storybook) añadir las versiones concretas:

```json
"@radix-ui/react-checkbox": "^1.1.4",
"@radix-ui/react-radio-group": "^1.2.3"
```

- [ ] **Step 2: Instalar**

Run: `pnpm install`
Expected: instala ambos paquetes, actualiza `pnpm-lock.yaml`, sin errores de peer.

- [ ] **Step 3: Añadir la entry `layout` a tsup**

En `tsup.config.ts`, dentro de `entry`, añadir la línea:

```ts
    layout: "src/layout/index.ts",
```

(El `external: [/^@radix-ui\//, ...]` ya cubre las nuevas peers de Radix; no tocar `external`.)

- [ ] **Step 4: Añadir el export `./layout` a package.json**

En `exports`, tras el bloque `"./forms"`, añadir:

```json
    "./layout": {
      "types": "./dist/layout.d.ts",
      "import": "./dist/layout.js",
      "require": "./dist/layout.cjs"
    },
```

- [ ] **Step 5: Crear el placeholder de exports de layout**

`src/layout/index.ts`:

```ts
// Los componentes de layout se exportan aquí a medida que se implementan.
// Ver components_docs/migration/07_fieldset.md y 08_form_grid.md.
export {};
```

- [ ] **Step 6: Verificar build y empaquetado**

Run: `pnpm build && pnpm publish --dry-run --no-git-checks`
Expected: build ESM+CJS+dts OK; el dry-run lista `dist/layout.js`, `dist/layout.cjs`, `dist/layout.d.ts` entre los archivos; sin fugas de `src/`.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml tsup.config.ts src/layout/index.ts
git commit -m "chore(fase2a): add radix checkbox/radio-group peers and ./layout subpath"
```

---

### Task 2: CheckboxField

Control booleano/indeterminado con label, descripción y error, basado en Radix Checkbox. Spec vinculante: `components_docs/migration/05_checkbox_field.md`.

**Files:**
- Create: `src/forms/checkbox-field/CheckboxField.types.ts`
- Create: `src/forms/checkbox-field/CheckboxField.tsx`
- Create: `src/forms/checkbox-field/CheckboxField.test.tsx`
- Create: `src/forms/checkbox-field/CheckboxField.stories.tsx`
- Modify: `src/forms/index.ts` (export)

**Interfaces:**
- Consumes: `cn` de `../../lib`; `@radix-ui/react-checkbox` (Task 1).
- Produces:
  - `CheckboxField` (componente, `React.forwardRef<HTMLButtonElement, CheckboxFieldProps>` — Radix `Checkbox.Root` renderiza un `<button role="checkbox">`).
  - Tipos `CheckboxFieldProps`, `CheckboxFieldClassNames`, `CheckedState` (`= boolean | "indeterminate"`) exportados desde `src/forms/index.ts`.

- [ ] **Step 1: Escribir el contrato de tipos**

`CheckboxField.types.ts` — copiar el contrato del spec §Contrato (`CheckedState`, `CheckboxFieldClassNames` con slots `root|control|indicator|content|label|description|error`, `CheckboxFieldProps` con `id,name,checked,defaultChecked,onCheckedChange,value,label,description,errorMessage,required,disabled,invalid,indicator,indeterminateIndicator` + los 5 de personalización). `label` es obligatorio (`React.ReactNode`). Sin `any`.

- [ ] **Step 2: Escribir la prueba que falla (toggle + estado semántico)**

`CheckboxField.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { CheckboxField } from "./CheckboxField";

describe("CheckboxField", () => {
  it("alterna con click en el control y emite estado semántico booleano", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <CheckboxField label="Habilitado" onCheckedChange={onCheckedChange} />,
    );
    await user.click(screen.getByRole("checkbox", { name: "Habilitado" }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("hace clic en el label para alternar (label asociado por htmlFor/id)", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<CheckboxField label="Acepto" onCheckedChange={onCheckedChange} />);
    await user.click(screen.getByText("Acepto"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("expone data-state=indeterminate y aria-checked mixed", () => {
    render(<CheckboxField label="Parcial" checked="indeterminate" />);
    const control = screen.getByRole("checkbox", { name: "Parcial" });
    expect(control).toHaveAttribute("data-state", "indeterminate");
    expect(control).toHaveAttribute("aria-checked", "mixed");
  });

  it("asocia error vía aria-describedby y marca aria-invalid", () => {
    render(
      <CheckboxField label="Términos" invalid errorMessage="Requerido" />,
    );
    const control = screen.getByRole("checkbox", { name: "Términos" });
    expect(control).toHaveAttribute("aria-invalid", "true");
    const describedby = control.getAttribute("aria-describedby");
    expect(describedby).toBeTruthy();
    expect(screen.getByText("Requerido")).toHaveAttribute("id", describedby!);
  });

  it("alterna con la tecla Space", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<CheckboxField label="Space" onCheckedChange={onCheckedChange} />);
    screen.getByRole("checkbox", { name: "Space" }).focus();
    await user.keyboard(" ");
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("aplica classNames por slot y reenvía ref", () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(
      <CheckboxField
        label="Custom"
        ref={ref}
        classNames={{ control: "border-violet-500", label: "font-semibold" }}
      />,
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(screen.getByRole("checkbox", { name: "Custom" }).className).toContain(
      "border-violet-500",
    );
  });
});
```

- [ ] **Step 3: Verificar que falla**

Run: `pnpm test -- src/forms/checkbox-field`
Expected: FAIL (módulo `./CheckboxField` no existe).

- [ ] **Step 4: Implementar CheckboxField**

`CheckboxField.tsx` — puntos clave:

- Usa `import * as CheckboxPrimitive from "@radix-ui/react-checkbox"`.
- Genera `useId()` y deriva `labelId`, `descriptionId`, `errorId`. El control recibe `id` (para `<label htmlFor>`), `aria-describedby` (mezcla de description+error presentes), `aria-invalid={invalid || undefined}`, `aria-required={required || undefined}`.
- El error reemplaza a la descripción (no renderizar la descripción si hay error), igual que `FormField`.
- Layout: raíz `role`-less `<div>` con `data-*`; una fila `label`(`<label htmlFor>`) + `control`(`Checkbox.Root` con `Checkbox.Indicator`); debajo el `content` (label + description/error). Toda la etiqueta clicable: envolver control+texto en un `<label>` NO — Radix ya asocia por `id`; usar `<label htmlFor={id}>` sobre el texto para que el click en texto alterne. El propio `Checkbox.Root` es clicable.
- `onCheckedChange`: Radix ya emite `boolean | "indeterminate"`; reenviar tal cual (NO convertir a strings).
- Indicador: `Checkbox.Indicator` muestra `indicator` (por defecto un check SVG) o `indeterminateIndicator` cuando `data-state=indeterminate`.
- `data-*`: en la raíz `data-invalid`, `data-disabled`, `data-required` con `|| undefined`. Radix ya pone `data-state`/`data-disabled` en el control.
- Clases base (tokens): control `size-4 shrink-0 rounded-(--radius-ui-sm) border border-ui-border bg-ui-background data-[state=checked]:bg-ui-primary data-[state=checked]:border-ui-primary data-[state=indeterminate]:bg-ui-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus disabled:cursor-not-allowed disabled:opacity-50 data-[invalid]:border-ui-danger`; indicator `flex items-center justify-center text-ui-primary-foreground`; label `text-sm font-medium text-ui-foreground`; etc. Todas literales (Tailwind las escanea del source).
- `forwardRef` al `Checkbox.Root`. `displayName = "CheckboxField"`.
- Reenviar `name`, `value`, `required`, `disabled` al `Checkbox.Root`; soportar `checked`/`defaultChecked` (controlado/no controlado).

- [ ] **Step 5: Verificar que pasa**

Run: `pnpm test -- src/forms/checkbox-field`
Expected: PASS (6 pruebas).

- [ ] **Step 6: Exportar desde forms/index.ts**

En `src/forms/index.ts` añadir:

```ts
export { CheckboxField } from "./checkbox-field/CheckboxField";
export type {
  CheckboxFieldProps,
  CheckboxFieldClassNames,
  CheckedState,
} from "./checkbox-field/CheckboxField.types";
```

- [ ] **Step 7: Escribir las historias de Storybook**

`CheckboxField.stories.tsx` con `tags: ["autodocs"]` y las historias del spec: `Unchecked`, `Checked`, `Indeterminate`, `WithDescription`, `Invalid`, `Disabled`, `CustomIndicator`, `CustomClasses`, `Unstyled`, `Keyboard`.

- [ ] **Step 8: Typecheck + commit**

Run: `pnpm typecheck && pnpm test -- src/forms/checkbox-field`
Expected: sin errores; PASS.

```bash
git add src/forms/checkbox-field src/forms/index.ts
git commit -m "feat(forms): add CheckboxField (radix checkbox + field affordances)"
```

---

### Task 3: RadioGroup

Selección única de un conjunto, con navegación por flechas, orientación y opciones enriquecidas. Spec vinculante: `components_docs/migration/06_radio_group.md`.

**Files:**
- Create: `src/forms/radio-group/RadioGroup.types.ts`
- Create: `src/forms/radio-group/RadioGroup.tsx`
- Create: `src/forms/radio-group/RadioGroup.test.tsx`
- Create: `src/forms/radio-group/RadioGroup.stories.tsx`
- Modify: `src/forms/index.ts` (export)

**Interfaces:**
- Consumes: `cn` de `../../lib`; `@radix-ui/react-radio-group` (Task 1).
- Produces:
  - `RadioGroup` genérico: `function RadioGroup<TValue extends string>(props: RadioGroupProps<TValue>): React.ReactElement`. (Los componentes genéricos no usan `forwardRef` de forma sencilla; exponer ref al contenedor vía prop no es requerido por el spec — el foco lo gestiona Radix Roving Tabindex.)
  - Tipos `RadioOption<TValue>`, `RadioGroupProps<TValue>`, `RadioGroupClassNames` exportados desde `src/forms/index.ts`.

- [ ] **Step 1: Escribir el contrato de tipos**

`RadioGroup.types.ts` — copiar el contrato del spec: `RadioOption<TValue extends string>` (`value,label,description?,disabled?`), `RadioGroupClassNames` (11 slots: `root,label,description,options,option,control,indicator,optionContent,optionLabel,optionDescription,error`), `RadioGroupProps<TValue extends string>` con `name,label,description,value,defaultValue,onValueChange,options,orientation,required,disabled,invalid,errorMessage,renderOption` + personalización. Sin `any`.

- [ ] **Step 2: Escribir la prueba que falla**

`RadioGroup.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { RadioGroup } from "./RadioGroup";

const options = [
  { value: "a", label: "Opción A" },
  { value: "b", label: "Opción B" },
  { value: "c", label: "Opción C", disabled: true },
];

describe("RadioGroup", () => {
  it("selecciona una opción y emite el valor semántico", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <RadioGroup label="Modo" options={options} onValueChange={onValueChange} />,
    );
    await user.click(screen.getByRole("radio", { name: "Opción B" }));
    expect(onValueChange).toHaveBeenCalledWith("b");
  });

  it("navega con flechas saltando opciones deshabilitadas", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <RadioGroup
        label="Modo"
        options={options}
        defaultValue="a"
        onValueChange={onValueChange}
      />,
    );
    screen.getByRole("radio", { name: "Opción A" }).focus();
    await user.keyboard("{ArrowDown}"); // A -> B
    expect(onValueChange).toHaveBeenLastCalledWith("b");
    await user.keyboard("{ArrowDown}"); // B -> (C disabled) -> A (wrap)
    expect(onValueChange).toHaveBeenLastCalledWith("a");
  });

  it("comparte name entre las opciones", () => {
    render(<RadioGroup name="grupo" options={options} />);
    // Radix RadioGroupItem renderiza un input hidden con el name cuando hay name.
    const radios = screen.getAllByRole("radio");
    expect(radios.length).toBe(3);
  });

  it("expone data-orientation y data-invalid en la raíz", () => {
    const { container } = render(
      <RadioGroup options={options} orientation="horizontal" invalid />,
    );
    const root = container.querySelector("[role='radiogroup']");
    expect(root).toHaveAttribute("data-orientation", "horizontal");
    expect(root).toHaveAttribute("data-invalid", "true");
  });

  it("asocia el error por aria-describedby", () => {
    const { container } = render(
      <RadioGroup options={options} invalid errorMessage="Elige una" />,
    );
    const root = container.querySelector("[role='radiogroup']")!;
    const describedby = root.getAttribute("aria-describedby");
    expect(screen.getByText("Elige una")).toHaveAttribute("id", describedby!);
  });

  it("usa renderOption para tarjetas sin perder rol radio", () => {
    render(
      <RadioGroup
        options={options}
        renderOption={(o, s) => (
          <div data-checked={s.checked}>Card {o.label}</div>
        )}
      />,
    );
    expect(screen.getByText("Card Opción A")).toBeInTheDocument();
    expect(screen.getAllByRole("radio").length).toBe(3);
  });
});
```

- [ ] **Step 3: Verificar que falla**

Run: `pnpm test -- src/forms/radio-group`
Expected: FAIL (módulo no existe).

- [ ] **Step 4: Implementar RadioGroup**

`RadioGroup.tsx` — puntos clave:

- `import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"`.
- `useId()` → `labelId`, `descriptionId`, `errorId`. El `RadioGroupPrimitive.Root` recibe `aria-labelledby={label ? labelId : undefined}`, `aria-describedby` (mezcla desc+error), `aria-invalid={invalid || undefined}`, `aria-required={required || undefined}`, `orientation`, `name`, `value`/`defaultValue`, `onValueChange`, `disabled`.
- El error reemplaza a la descripción (misma regla que FormField).
- Renderiza `label` (`<span id={labelId}>`), `description`, contenedor `options` con cada opción como `RadioGroupPrimitive.Item` (`role=radio`) + `RadioGroupPrimitive.Indicator`, más `optionLabel`/`optionDescription`; opción deshabilitada `disabled`.
- Si `renderOption` está definido, usar su salida DENTRO del `Item` (o como hijo del `Item` asChild) preservando el rol. Pasar `state={{ checked: value===option.value, disabled: !!option.disabled }}` — nota: en no-controlado no conocemos `checked` desde props; para `renderOption` con estado fiable, leer del atributo Radix vía `data-[state=checked]` en CSS es lo correcto para estilos; el `state.checked` calculado sirve para render condicional best-effort (documentarlo). Para pasar la prueba `renderOption`, basta con render best-effort.
- `data-*` en raíz: `data-invalid`, `data-disabled`, `data-required`, `data-orientation` (Radix ya pone `data-orientation`).
- Clases base con tokens; `control` (el círculo) `size-4 rounded-full border border-ui-border data-[state=checked]:border-ui-primary`, indicador `size-2 rounded-full bg-ui-primary`, `focus-visible:ring-2 ring-ui-focus`, `options` layout según `orientation` (`flex flex-col gap-2` vs `flex flex-row flex-wrap gap-4`).
- Genérico `<TValue extends string>`; `onValueChange` de Radix da `string`, castear a `TValue`.
- `displayName = "RadioGroup"`.

- [ ] **Step 5: Verificar que pasa**

Run: `pnpm test -- src/forms/radio-group`
Expected: PASS (6 pruebas).

- [ ] **Step 6: Exportar desde forms/index.ts**

```ts
export { RadioGroup } from "./radio-group/RadioGroup";
export type {
  RadioGroupProps,
  RadioGroupClassNames,
  RadioOption,
} from "./radio-group/RadioGroup.types";
```

- [ ] **Step 7: Historias de Storybook**

`RadioGroup.stories.tsx` con autodocs y las historias del spec: `Vertical`, `Horizontal`, `Descriptions`, `DisabledOption`, `Required`, `Invalid`, `CardOptions`, `CustomClasses`, `Unstyled`, `Keyboard`, `RTL`.

- [ ] **Step 8: Typecheck + commit**

Run: `pnpm typecheck && pnpm test -- src/forms/radio-group`
Expected: sin errores; PASS.

```bash
git add src/forms/radio-group src/forms/index.ts
git commit -m "feat(forms): add generic RadioGroup (radix radio-group + options API)"
```

---

### Task 4: Fieldset

Agrupación semántica nativa de controles relacionados. Spec vinculante: `components_docs/migration/07_fieldset.md`.

**Files:**
- Create: `src/layout/fieldset/Fieldset.types.ts`
- Create: `src/layout/fieldset/Fieldset.tsx`
- Create: `src/layout/fieldset/Fieldset.test.tsx`
- Create: `src/layout/fieldset/Fieldset.stories.tsx`
- Modify: `src/layout/index.ts` (export)
- Modify: `src/index.ts` (re-export de layout)

**Interfaces:**
- Consumes: `cn` de `../../lib`.
- Produces:
  - `Fieldset` (`React.forwardRef<HTMLFieldSetElement, FieldsetProps>`).
  - Tipos `FieldsetProps`, `FieldsetClassNames` exportados desde `src/layout/index.ts`.

- [ ] **Step 1: Contrato de tipos**

`Fieldset.types.ts` — del spec: `FieldsetClassNames` (`root,legend,description,content,error`), `FieldsetProps extends Omit<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, "title">` con `legend` (obligatorio), `description,errorMessage,invalid,required,orientation` + personalización.

- [ ] **Step 2: Prueba que falla**

`Fieldset.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Fieldset } from "./Fieldset";

describe("Fieldset", () => {
  it("renderiza fieldset con legend semántico", () => {
    render(
      <Fieldset legend="Tipo de persona">
        <input aria-label="x" />
      </Fieldset>,
    );
    const group = screen.getByRole("group", { name: "Tipo de persona" });
    expect(group.tagName).toBe("FIELDSET");
  });

  it("deshabilita descendientes con disabled nativo", () => {
    render(
      <Fieldset legend="G" disabled>
        <input aria-label="campo" />
      </Fieldset>,
    );
    expect(screen.getByLabelText("campo")).toBeDisabled();
  });

  it("asocia descripción y error por aria-describedby", () => {
    render(
      <Fieldset legend="G" invalid description="ayuda" errorMessage="mal">
        <input aria-label="x" />
      </Fieldset>,
    );
    const group = screen.getByRole("group", { name: "G" });
    const ids = group.getAttribute("aria-describedby")!.split(" ");
    expect(screen.getByText("mal").id).toBe(
      ids.find((i) => i === screen.getByText("mal").id),
    );
    expect(group).toHaveAttribute("data-invalid", "true");
  });

  it("aplica classNames por slot y reenvía ref", () => {
    const ref = { current: null as HTMLFieldSetElement | null };
    render(
      <Fieldset ref={ref} legend="G" classNames={{ root: "border-sky-300" }}>
        <span>x</span>
      </Fieldset>,
    );
    expect(ref.current?.tagName).toBe("FIELDSET");
    expect(ref.current?.className).toContain("border-sky-300");
  });
});
```

- [ ] **Step 3: Verificar que falla**

Run: `pnpm test -- src/layout/fieldset`
Expected: FAIL.

- [ ] **Step 4: Implementar Fieldset**

`Fieldset.tsx` — puntos clave:

- Raíz `<fieldset>` con `ref`, `disabled` (nativo, deshabilita descendientes), `data-invalid`, `data-required`, `data-orientation` (`|| undefined`).
- `useId()` → `descriptionId`/`errorId`; `aria-describedby` = mezcla de los presentes (el error reemplaza a la descripción visualmente, pero mantener ids solo de contenido presente — no apuntar a nodos ausentes).
- `<legend>` con el slot `legend`; indicador `required` con texto para lector (patrón de FormField: `*` + `sr-only`).
- Slot `content` envuelve `children`; `orientation` controla layout (`grid gap-4` vs `flex flex-row gap-4`).
- Reenviar el resto de props DOM (`...rest`).
- `displayName = "Fieldset"`.

- [ ] **Step 5: Verificar que pasa**

Run: `pnpm test -- src/layout/fieldset`
Expected: PASS.

- [ ] **Step 6: Exportar**

`src/layout/index.ts` (reemplazar el `export {};`):

```ts
export { Fieldset } from "./fieldset/Fieldset";
export type { FieldsetProps, FieldsetClassNames } from "./fieldset/Fieldset.types";
```

`src/index.ts` — añadir tras `export * from "./forms";`:

```ts
export * from "./layout";
```

- [ ] **Step 7: Historias**

`Fieldset.stories.tsx` con autodocs y las historias del spec: `Default`, `RadioGroup`, `CheckboxGroup`, `Description`, `Error`, `Disabled`, `Horizontal`, `CustomClasses`, `Unstyled`. (Las historias `RadioGroup`/`CheckboxGroup` importan los componentes de Task 2/3.)

- [ ] **Step 8: Typecheck + commit**

Run: `pnpm typecheck && pnpm test -- src/layout/fieldset`
Expected: sin errores; PASS.

```bash
git add src/layout/fieldset src/layout/index.ts src/index.ts
git commit -m "feat(layout): add Fieldset (native fieldset/legend grouping)"
```

---

### Task 5: FormGrid

Grid responsivo de formularios con mapas de clases estáticas (Tailwind no ve clases dinámicas). Spec vinculante: `components_docs/migration/08_form_grid.md`.

**Files:**
- Create: `src/layout/form-grid/FormGrid.types.ts`
- Create: `src/layout/form-grid/FormGrid.tsx`
- Create: `src/layout/form-grid/FormGrid.test.tsx`
- Create: `src/layout/form-grid/FormGrid.stories.tsx`
- Modify: `src/layout/index.ts` (export)

**Interfaces:**
- Consumes: `cn` de `../../lib`.
- Produces:
  - `FormGrid` (`React.forwardRef<HTMLDivElement, FormGridProps>`) con `FormGrid.Item` (`React.forwardRef<HTMLDivElement, FormGridItemProps>`) como compuesto.
  - Tipos `FormGridProps`, `FormGridItemProps`, `ResponsiveValue<T>` exportados desde `src/layout/index.ts`.

- [ ] **Step 1: Contrato de tipos**

`FormGrid.types.ts` — del spec: `ResponsiveValue<T> = T | Partial<Record<"base"|"sm"|"md"|"lg"|"xl"|"2xl", T>>`; `FormGridProps extends React.HTMLAttributes<HTMLDivElement>` con `columns?: ResponsiveValue<1|2|3|4|6|12>`, `gap?: "none"|"sm"|"md"|"lg"`, `align?: "start"|"center"|"end"|"stretch"`, `dense?`, `className?`, `unstyled?`; `FormGridItemProps extends React.HTMLAttributes<HTMLDivElement>` con `span?: ResponsiveValue<1|2|3|4|6|12|"full">`, `start?: ResponsiveValue<number|"auto">`, `className?`, `unstyled?`.

- [ ] **Step 2: Prueba que falla (mapeo estático de clases)**

`FormGrid.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FormGrid } from "./FormGrid";

describe("FormGrid", () => {
  it("mapea columns responsivas a clases estáticas conocidas", () => {
    render(
      <FormGrid data-testid="grid" columns={{ base: 1, md: 2, xl: 4 }}>
        <div>x</div>
      </FormGrid>,
    );
    const cls = screen.getByTestId("grid").className;
    expect(cls).toContain("grid");
    expect(cls).toContain("grid-cols-1");
    expect(cls).toContain("md:grid-cols-2");
    expect(cls).toContain("xl:grid-cols-4");
  });

  it("mapea columns escalar", () => {
    render(
      <FormGrid data-testid="grid" columns={3}>
        <div>x</div>
      </FormGrid>,
    );
    expect(screen.getByTestId("grid").className).toContain("grid-cols-3");
  });

  it("mapea span y span full en FormGrid.Item", () => {
    render(
      <FormGrid columns={4}>
        <FormGrid.Item data-testid="i1" span={{ md: 2 }}>
          <div>a</div>
        </FormGrid.Item>
        <FormGrid.Item data-testid="i2" span="full">
          <div>b</div>
        </FormGrid.Item>
      </FormGrid>,
    );
    expect(screen.getByTestId("i1").className).toContain("md:col-span-2");
    expect(screen.getByTestId("i2").className).toContain("col-span-full");
  });

  it("aplica gap por token y reenvía props DOM (id)", () => {
    render(
      <FormGrid data-testid="grid" id="g" gap="lg">
        <div>x</div>
      </FormGrid>,
    );
    const el = screen.getByTestId("grid");
    expect(el).toHaveAttribute("id", "g");
    expect(el.className).toContain("gap-6");
  });

  it("unstyled devuelve un div sin clases de layout base", () => {
    render(
      <FormGrid data-testid="grid" columns={2} unstyled>
        <div>x</div>
      </FormGrid>,
    );
    const cls = screen.getByTestId("grid").className;
    expect(cls).not.toContain("grid-cols-2");
  });
});
```

- [ ] **Step 3: Verificar que falla**

Run: `pnpm test -- src/layout/form-grid`
Expected: FAIL.

- [ ] **Step 4: Implementar FormGrid**

`FormGrid.tsx` — puntos clave:

- **Mapas estáticos literales** (Tailwind los escanea del source; NUNCA concatenar `grid-cols-${n}`). Definir objetos const:

```ts
const columnsBase: Record<1|2|3|4|6|12, string> = {
  1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3",
  4: "grid-cols-4", 6: "grid-cols-6", 12: "grid-cols-12",
};
const columnsByBreakpoint = {
  sm: { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4", 6: "sm:grid-cols-6", 12: "sm:grid-cols-12" },
  md: { 1: "md:grid-cols-1", /* ...2,3,4,6,12 */ },
  lg: { /* lg:grid-cols-* */ },
  xl: { /* xl:grid-cols-* */ },
  "2xl": { /* 2xl:grid-cols-* */ },
} as const;
```

  Análogo para `span` (`col-span-1..12`, `col-span-full`, y variantes por breakpoint `md:col-span-2`, etc.) y `start` (`col-start-1..12`, `col-start-auto`, con breakpoints). `gap`: `{ none: "gap-0", sm: "gap-2", md: "gap-4", lg: "gap-6" }`. `align`: `{ start: "items-start", center: "items-center", end: "items-end", stretch: "items-stretch" }`.
- Helper `resolveResponsive(value, base ScalarMap, bpMap)`: si `value` es escalar → clase base; si es objeto `{base, sm, ...}` → recorre claves y concatena `bpMap[bp][v]` (y `base` usa el mapa base). Devuelve string de clases.
- Raíz: `<div>` con `cn(!unstyled && "grid", !unstyled && columnasResueltas, !unstyled && gapClass, !unstyled && alignClass, dense && !unstyled && "grid-flow-dense", className)`, `...rest`.
- `FormGrid.Item`: `<div>` con `cn(!unstyled && spanResuelto, !unstyled && startResuelto, className)`, `...rest`.
- Ambos `forwardRef<HTMLDivElement>`. `displayName` respectivos; `FormGrid.Item = FormGridItem`.
- Presentacional: sin roles ARIA añadidos.

- [ ] **Step 5: Verificar que pasa**

Run: `pnpm test -- src/layout/form-grid`
Expected: PASS.

- [ ] **Step 6: Exportar**

`src/layout/index.ts` añadir:

```ts
export { FormGrid } from "./form-grid/FormGrid";
export type {
  FormGridProps,
  FormGridItemProps,
  ResponsiveValue,
} from "./form-grid/FormGrid.types";
```

- [ ] **Step 7: Historias**

`FormGrid.stories.tsx` con autodocs y las historias del spec: `OneColumn`, `ResponsiveColumns`, `Spans`, `TwelveColumns`, `Alignment`, `CustomClasses`, `Unstyled`, `LongErrors`, `Mobile`.

- [ ] **Step 8: Typecheck + commit**

Run: `pnpm typecheck && pnpm test -- src/layout/form-grid`
Expected: sin errores; PASS.

```bash
git add src/layout/form-grid src/layout/index.ts
git commit -m "feat(layout): add FormGrid + FormGrid.Item (static responsive class maps)"
```

---

### Task 6: Verificación integral de la fase, safelist y build

Cierra la fase: asegura que el paquete entero compila, empaqueta y exporta los 4 componentes nuevos; añade al safelist de Tailwind cualquier clase de FormGrid necesaria para el CSS distribuido.

**Files:**
- Modify: `src/styles/theme.css` (`@source inline(...)` si hace falta para clases de grid del CSS distribuido)
- Modify: `README.md` (sección de componentes de Fase 2a — opcional pero recomendado)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: build limpio y `dist/styles.css` que incluye las utilidades de grid usadas por FormGrid.

- [ ] **Step 1: Verificar que las clases de FormGrid llegan al CSS distribuido**

`pnpm build:css` genera `dist/styles.css` escaneando el source. Las clases de `FormGrid` son literales en `FormGrid.tsx`, así que deberían aparecer. Verificar:

Run: `pnpm build && grep -c "grid-cols-4" dist/styles.css`
Expected: > 0. Si es 0, añadir a `theme.css` un `@source inline("{sm:,md:,lg:,xl:,2xl:,}grid-cols-{1,2,3,4,6,12}")` y las de `col-span`/`col-start`, luego re-verificar.

- [ ] **Step 2: Typecheck + test + build completos**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: 0 errores de tipos; TODAS las pruebas PASS (Fase 1 + Fase 2a); build ESM+CJS+dts+CSS OK.

- [ ] **Step 3: Dry-run de publicación**

Run: `pnpm publish --dry-run --no-git-checks`
Expected: incluye `dist/layout.js|cjs|d.ts`, `dist/forms.*` con los nuevos componentes; sin fugas de `src/`.

- [ ] **Step 4: Verificar exports de subpaths**

Comprobar que `@teams4soft/teams4soft-ui` (root) reexporta `CheckboxField`, `RadioGroup`, `Fieldset`, `FormGrid`; que `/forms` expone `CheckboxField`/`RadioGroup`; que `/layout` expone `Fieldset`/`FormGrid`. Revisar `dist/index.d.ts`, `dist/forms.d.ts`, `dist/layout.d.ts`.

- [ ] **Step 5: (Opcional) README**

Añadir a `README.md` una fila/sección para los 4 componentes nuevos con un ejemplo mínimo de cada uno.

- [ ] **Step 6: Commit final de fase**

```bash
git add -A
git commit -m "chore(fase2a): verify build, exports and grid safelist for 0.2.0"
```

---

## Notas de release (fuera del alcance de las tareas, las ejecuta el orquestador)

Tras mergear la rama de Fase 2a a `main`:
1. `npm version 0.2.0 --no-git-tag-version` → commit → push a `main`.
2. Crear GitHub Release `v0.2.0` (target `main`) → dispara `release.yml` → publica `@teams4soft/teams4soft-ui@0.2.0` con provenance.
   - Ya resuelto en `0.1.0`: token **Automation** en el secret `NPM_TOKEN` y campo `repository` en `package.json`. No hay pasos manuales extra.

## Deferred / pendientes conocidos (log para Fase 2b / pulido)

- `resolveSlotProps` helper para unificar merge de `className`/`style` por slot (repetido en cada componente) — candidato a extraer en `src/lib`.
- `renderOption` de RadioGroup: `state.checked` es best-effort en modo no-controlado (el estado real vive en Radix vía `data-[state=checked]`). Documentar en JSDoc.
- Fase 2b: `DateField` (calendario + parseo + `Intl` + Radix Popover) y `SearchableSelectField` (combobox/listbox ARIA genérico + Radix Popover). Añadirán la peer `@radix-ui/react-popover`. Release objetivo `0.3.0`.
