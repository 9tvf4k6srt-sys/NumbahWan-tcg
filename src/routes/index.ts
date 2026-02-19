/**
 * Route Registry - Central module loader (Architecture v4.0)
 *
 * ALL routes extracted from monolithic index.tsx into domain modules.
 * Main index.tsx is now a thin orchestrator (~80 lines).
 */

import adminCardsRoutes from './admin-cards'
import agentRoutes from './agent'
import auctionRoutes from './auction'
import avatarRoutes from './avatar'
import cardBridgeRoutes from './card-bridge-routes'
import cardDbRoutes from './card-db'
import cardEngineRoutes from './card-engine'
import cardEngineExtraRoutes from './card-engine-extra'
import cipherRoutes from './cipher'
import confessionalRoutes from './confessional'
import dataRoutes from './data'
// Feature API routes
import databaseRoutes from './database'
import eventsMerchRoutes from './events-merch'
import gamificationRoutes from './gamification-routes'
import gmRoutes from './gm'
import guideRoutes from './guide'
// Core infrastructure routes
import healthRoutes from './health'
import marketPricesRoutes from './market-prices'
import marketTradingRoutes from './market-trading'
import npcChatRoutes from './npc-chat'
import oracleRoutes from './oracle'
// Page serving routes
import pagesRoutes from './pages'
import physicalRoutes from './physical'
import purchaseRoutes from './purchase'
import sentinelRoutes from './sentinel'
import shrineRoutes from './shrine'
import translateRoutes from './translate'
import walletEconomyRoutes from './wallet-economy'
import walletExtraRoutes from './wallet-extra'

export {
  healthRoutes,
  dataRoutes,
  sentinelRoutes,
  agentRoutes,
  pagesRoutes,
  databaseRoutes,
  marketTradingRoutes,
  cardDbRoutes,
  adminCardsRoutes,
  walletEconomyRoutes,
  auctionRoutes,
  marketPricesRoutes,
  gamificationRoutes,
  cardBridgeRoutes,
  purchaseRoutes,
  eventsMerchRoutes,
  confessionalRoutes,
  shrineRoutes,
  cardEngineRoutes,
  cardEngineExtraRoutes,
  walletExtraRoutes,
  physicalRoutes,
  avatarRoutes,
  guideRoutes,
  translateRoutes,
  gmRoutes,
  cipherRoutes,
  oracleRoutes,
  npcChatRoutes,
}
