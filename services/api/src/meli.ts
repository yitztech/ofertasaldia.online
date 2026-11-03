import { Injectable, Logger } from "@nestjs/common";

export interface MeliItem {
  id: string;
  title: string;
  status: string;
  category_id: string;
  permalink: string;
  thumbnail: string;
  currency_id: string;
  pictures?: { secure_url: string }[];
  attributes?: { id: string; value_name: string }[];
}

export interface MeliSalePrice {
  amount?: number;
  regular_amount?: number;
  currency_id?: string;
}

export interface SyncPriceResult {
  currentPriceCents: number;
  originalPriceCents: number | null;
  discountPercentage: number | null;
  status: "active" | "paused" | "closed";
  currency: string;
  title?: string;
  permalink?: string;
}

@Injectable()
export class MeliSyncService {
  private readonly logger = new Logger(MeliSyncService.name);
  private readonly baseUrl = (
    process.env.MELI_API_URL ?? "https://api.mercadolibre.com"
  ).replace(/\/$/, "");

  /**
   * Consulta el estado del artículo en la API pública de Mercado Libre sin scraping.
   */
  async fetchItem(externalId: string): Promise<MeliItem | null> {
    try {
      const res = await fetch(`${this.baseUrl}/items/${encodeURIComponent(externalId)}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        this.logger.warn(`Mercado Libre items/${externalId} respondió ${res.status}`);
        return null;
      }
      return (await res.json()) as MeliItem;
    } catch (err) {
      this.logger.warn(`Error al consultar Mercado Libre items/${externalId}: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Consulta el precio vigente en el canal marketplace.
   */
  async fetchSalePrice(externalId: string): Promise<MeliSalePrice | null> {
    try {
      const res = await fetch(
        `${this.baseUrl}/items/${encodeURIComponent(externalId)}/sale_price?context=channel_marketplace`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(5000),
        },
      );
      if (!res.ok) {
        return null;
      }
      return (await res.json()) as MeliSalePrice;
    } catch {
      return null;
    }
  }

  /**
   * Comprueba precio, descuento y disponibilidad para un artículo de Mercado Libre.
   */
  async checkPrice(externalId: string, fallbackPriceCents?: number): Promise<SyncPriceResult | null> {
    const item = await this.fetchItem(externalId);
    if (!item) {
      if (fallbackPriceCents !== undefined) {
        // Modo simulado o sin conexión a la API externa
        return {
          currentPriceCents: fallbackPriceCents,
          originalPriceCents: Math.round(fallbackPriceCents * 1.25),
          discountPercentage: 20,
          status: "active",
          currency: "MXN",
        };
      }
      return null;
    }

    let status: "active" | "paused" | "closed" = "active";
    if (item.status === "closed" || item.status === "inactive") {
      status = "closed";
    } else if (item.status !== "active") {
      status = "paused";
    }

    const sale = await this.fetchSalePrice(externalId);
    let currentPriceCents = fallbackPriceCents ?? 0;
    let originalPriceCents: number | null = null;
    let discountPercentage: number | null = null;

    if (sale && sale.amount !== undefined) {
      currentPriceCents = Math.round(sale.amount * 100);
      if (sale.regular_amount !== undefined && sale.regular_amount > sale.amount) {
        originalPriceCents = Math.round(sale.regular_amount * 100);
        discountPercentage = Math.round(
          ((sale.regular_amount - sale.amount) / sale.regular_amount) * 100,
        );
      }
    }

    return {
      currentPriceCents,
      originalPriceCents,
      discountPercentage,
      status,
      currency: item.currency_id || "MXN",
      title: item.title,
      permalink: item.permalink,
    };
  }
}
