import "server-only";
import { metaCloudApiProvider } from "./providers/metaCloudApi";
import type { WhatsAppProvider } from "./types";

// Every caller imports this, never a concrete provider module directly —
// swapping WhatsApp providers later means changing one line here.
export const activeProvider: WhatsAppProvider = metaCloudApiProvider;
