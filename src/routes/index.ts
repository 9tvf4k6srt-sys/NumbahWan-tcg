/**
 * Route Registry - Central module loader (Architecture v4.0)
 * 
 * ALL routes extracted from monolithic index.tsx into domain modules.
 * Main index.tsx is now a thin orchestrator (~80 lines).
 */

// Core infrastructure routes
import healthRoutes from './health'
import dataRoutes from './data'
import sentinelRoutes from './sentinel'
import agentRoutes from './agent'

// Page serving routes
import pagesRoutes from './pages'

// Feature API routes
import databaseRoutes from './database'
import marketTradingRoutes from './market-trading'
import cardDbRoutes from './card-db'
import adminCardsRoutes from './admin-cards'
import walletEconomyRoutes from './wallet-economy'
import auctionRoutes from './auction'
import marketPricesRoutes from './market-prices'
import gamificationRoutes from './gamification-routes'
import cardBridgeRoutes from './card-bridge-routes'
import purchaseRoutes from './purchase'
import eventsMerchRoutes from './events-merch'
import confessionalRoutes from './confessional'
import shrineRoutes from './shrine'
import cardEngineRoutes from './card-engine'
import cardEngineExtraRoutes from './card-engine-extra'
import walletExtraRoutes from './wallet-extra'
import physicalRoutes from './physical'
import avatarRoutes from './avatar'
import guideRoutes from './guide'
import translateRoutes from './translate'
import gmRoutes from './gm'
import cipherRoutes from './cipher'
import oracleRoutes from './oracle'
import npcChatRoutes from './npc-chat'

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
  npcChatRoutes
}
