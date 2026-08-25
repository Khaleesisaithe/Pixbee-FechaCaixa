import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

describe("Spanish operational localization coverage", () => {
  it("defines Spanish copy for every counting method", () => {
    expect(homeSource).toContain("const SPANISH_METHOD_INFO");
    expect(homeSource).toContain('title: "Billetes y monedas"');
    expect(homeSource).toContain('title: "Tarjeta de débito"');
    expect(homeSource).toContain('title: "Tarjeta de crédito"');
    expect(homeSource).toContain('title: "Vales y vouchers"');
    expect(homeSource).toContain('title: "Retiro"');
    expect(homeSource).toContain('title: "Ingreso"');
    expect(homeSource).toContain('locale === "es" ? SPANISH_METHOD_INFO[method]');
  });

  it("keeps critical counting and closing labels in Spanish branches", () => {
    const requiredSpanishCopy = [
      "Registra los valores del turno.",
      "Los valores esperados se comparan con los importes contados.",
      "Efectivo esperado",
      "Pagos digitales",
      "Movimientos de caja",
      "Revisar cierre",
      "Resumen en tiempo real",
      "Cierre obligatorio",
      "Validación del cierre",
      "Cierre conciliado y guardado en el historial local.",
      "Entradas en efectivo",
      "Diferencia general",
    ];

    for (const copy of requiredSpanishCopy) {
      expect(homeSource, `Missing Spanish copy: ${copy}`).toContain(copy);
    }
  });

  it("keeps the privacy and rights page entirely available in Spanish", () => {
    const requiredPrivacyCopy = [
      "Privacidad y derechos",
      "Transparencia de PixBee",
      "Qué se almacena",
      "Dónde permanecen los datos",
      "Precauciones de la persona operadora",
      "Acceso, corrección y eliminación",
      "DERECHOS DE AUTOR",
      "CONTACTO Y ACTUALIZACIONES",
      "EXPERIENCIA DEL CLIENTE",
      "PUBLICIDAD",
      "Actualizado el 21 de agosto de 2026",
    ];

    for (const copy of requiredPrivacyCopy) {
      expect(homeSource, `Missing Spanish privacy copy: ${copy}`).toContain(copy);
    }
  });

  it("keeps the shift history page and its reporting controls in Spanish", () => {
    const requiredHistoryCopy = [
      "Historial de turnos",
      "Consulta de movimientos",
      "Filtrar por turno",
      "Todos los turnos",
      "Imprimir informe",
      "Descargar PDF",
      "No hay turnos cerrados en este filtro.",
      "Valida un cierre para consultar aquí los movimientos y totales.",
      "Iniciar conteo",
      "Sin retiros ni ingresos",
      "Tu historial local está listo para archivar",
      "Descargar PDF y limpiar",
    ];

    for (const copy of requiredHistoryCopy) {
      expect(homeSource, `Missing Spanish history copy: ${copy}`).toContain(copy);
    }
  });
});
