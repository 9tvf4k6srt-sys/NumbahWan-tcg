# API Routes — All Backend Endpoints

> Extracted from `src/routes/*.ts` and `src/index.tsx`.


Total: 190 routes across 32 files.


## /

| Method | Path | Source |
|--------|------|--------|
| GET | `/` | card-db.ts |
| GET | `/` | pages.ts |

## /:deviceUUID

| Method | Path | Source |
|--------|------|--------|
| GET | `/:deviceUUID` | wallet-economy.ts |

## /:id

| Method | Path | Source |
|--------|------|--------|
| GET | `/:id` | auction.ts |
| GET | `/:id` | card-db.ts |

## /achievements

| Method | Path | Source |
|--------|------|--------|
| GET | `/achievements` | gamification-routes.ts |

## /act

| Method | Path | Source |
|--------|------|--------|
| POST | `/act` | agent.ts |

## /actions

| Method | Path | Source |
|--------|------|--------|
| POST | `/actions` | agent.ts |

## /activate

| Method | Path | Source |
|--------|------|--------|
| POST | `/activate` | gm.ts |

## /active

| Method | Path | Source |
|--------|------|--------|
| GET | `/active` | cipher.ts |

## /ai-analyst

| Method | Path | Source |
|--------|------|--------|
| GET | `/ai-analyst` | gamification-routes.ts |

## /ai-chat

| Method | Path | Source |
|--------|------|--------|
| POST | `/ai-chat` | gamification-routes.ts |

## /alerts

| Method | Path | Source |
|--------|------|--------|
| GET | `/alerts` | agent.ts |
| POST | `/alerts/ack` | agent.ts |
| GET | `/alerts/check` | market-prices.ts |
| POST | `/alerts/create` | market-prices.ts |

## /api

| Method | Path | Source |
|--------|------|--------|
| GET | `/api/card-factory` | admin-cards.ts |
| GET | `/api/members` | pages.ts |
| GET | `/api/treasury` | wallet-extra.ts |

## /ask

| Method | Path | Source |
|--------|------|--------|
| POST | `/ask` | oracle.ts |

## /attempt

| Method | Path | Source |
|--------|------|--------|
| POST | `/attempt` | cipher.ts |

## /audit

| Method | Path | Source |
|--------|------|--------|
| GET | `/audit` | card-engine.ts |

## /balance-report

| Method | Path | Source |
|--------|------|--------|
| GET | `/balance-report` | card-engine.ts |

## /bid

| Method | Path | Source |
|--------|------|--------|
| POST | `/bid` | auction.ts |

## /brief

| Method | Path | Source |
|--------|------|--------|
| GET | `/brief` | agent.ts |

## /buy

| Method | Path | Source |
|--------|------|--------|
| POST | `/buy` | card-bridge-routes.ts |
| POST | `/buy` | market-trading.ts |

## /calculator

| Method | Path | Source |
|--------|------|--------|
| GET | `/calculator` | card-bridge-routes.ts |

## /cancel-listing

| Method | Path | Source |
|--------|------|--------|
| POST | `/cancel-listing` | card-bridge-routes.ts |

## /cards

| Method | Path | Source |
|--------|------|--------|
| POST | `/cards` | admin-cards.ts |
| PUT | `/cards/:id` | admin-cards.ts |
| DELETE | `/cards/:id` | admin-cards.ts |
| POST | `/cards/batch` | admin-cards.ts |
| GET | `/cards/export` | admin-cards.ts |
| GET | `/cards/next-ids` | admin-cards.ts |

## /chat

| Method | Path | Source |
|--------|------|--------|
| POST | `/chat` | guide.ts |
| GET | `/chat` | market-trading.ts |
| POST | `/chat` | market-trading.ts |
| POST | `/chat` | npc-chat.ts |

## /claim

| Method | Path | Source |
|--------|------|--------|
| POST | `/claim` | card-bridge-routes.ts |
| POST | `/claim` | physical.ts |

## /claim-rewards

| Method | Path | Source |
|--------|------|--------|
| POST | `/claim-rewards` | card-bridge-routes.ts |

## /collection

| Method | Path | Source |
|--------|------|--------|
| GET | `/collection/:wallet` | card-bridge-routes.ts |

## /components

| Method | Path | Source |
|--------|------|--------|
| GET | `/components` | avatar.ts |

## /confess

| Method | Path | Source |
|--------|------|--------|
| POST | `/confess` | confessional.ts |

## /confessions

| Method | Path | Source |
|--------|------|--------|
| GET | `/confessions` | confessional.ts |
| POST | `/confessions/:id/pray` | confessional.ts |
| GET | `/confessions/stats` | confessional.ts |

## /context

| Method | Path | Source |
|--------|------|--------|
| GET | `/context` | agent.ts |

## /count

| Method | Path | Source |
|--------|------|--------|
| GET | `/count` | shrine.ts |

## /create

| Method | Path | Source |
|--------|------|--------|
| POST | `/create` | auction.ts |

## /create-checkout

| Method | Path | Source |
|--------|------|--------|
| POST | `/create-checkout` | purchase.ts |

## /daily-reward

| Method | Path | Source |
|--------|------|--------|
| POST | `/daily-reward` | wallet-extra.ts |

## /dashboard

| Method | Path | Source |
|--------|------|--------|
| GET | `/dashboard` | gamification-routes.ts |

## /debug

| Method | Path | Source |
|--------|------|--------|
| GET | `/debug` | health.ts |

## /diff

| Method | Path | Source |
|--------|------|--------|
| GET | `/diff` | agent.ts |

## /errors

| Method | Path | Source |
|--------|------|--------|
| POST | `/errors` | health.ts |
| GET | `/errors/recent` | health.ts |

## /events

| Method | Path | Source |
|--------|------|--------|
| GET | `/events` | events-merch.ts |

## /fear-greed

| Method | Path | Source |
|--------|------|--------|
| GET | `/fear-greed` | gamification-routes.ts |

## /files

| Method | Path | Source |
|--------|------|--------|
| GET | `/files` | agent.ts |

## /fuse

| Method | Path | Source |
|--------|------|--------|
| POST | `/fuse` | card-bridge-routes.ts |

## /fusion

| Method | Path | Source |
|--------|------|--------|
| GET | `/fusion/recipes` | events-merch.ts |

## /generate

| Method | Path | Source |
|--------|------|--------|
| POST | `/generate` | avatar.ts |

## /health

| Method | Path | Source |
|--------|------|--------|
| GET | `/health` | agent.ts |
| GET | `/health` | guide.ts |
| GET | `/health` | health.ts |
| GET | `/health` | sentinel.ts |

## /heartbeat

| Method | Path | Source |
|--------|------|--------|
| POST | `/heartbeat` | market-trading.ts |

## /history

| Method | Path | Source |
|--------|------|--------|
| GET | `/history` | auction.ts |
| GET | `/history` | cipher.ts |

## /i18n

| Method | Path | Source |
|--------|------|--------|
| GET | `/i18n` | data.ts |

## /index.html

| Method | Path | Source |
|--------|------|--------|
| GET | `/index.html` | pages.ts |

## /info

| Method | Path | Source |
|--------|------|--------|
| GET | `/info` | card-bridge-routes.ts |

## /leaderboard

| Method | Path | Source |
|--------|------|--------|
| GET | `/leaderboard` | auction.ts |
| GET | `/leaderboard` | cipher.ts |
| GET | `/leaderboard` | gamification-routes.ts |
| GET | `/leaderboard` | shrine.ts |

## /list

| Method | Path | Source |
|--------|------|--------|
| POST | `/list` | card-bridge-routes.ts |
| POST | `/list` | market-trading.ts |

## /listings

| Method | Path | Source |
|--------|------|--------|
| GET | `/listings` | auction.ts |
| GET | `/listings` | market-trading.ts |

## /log

| Method | Path | Source |
|--------|------|--------|
| GET | `/log` | agent.ts |

## /market-prices

| Method | Path | Source |
|--------|------|--------|
| GET | `/market-prices` | market-prices.ts |
| GET | `/market-prices/history` | market-prices.ts |

## /market-status

| Method | Path | Source |
|--------|------|--------|
| GET | `/market-status` | market-prices.ts |

## /marketplace

| Method | Path | Source |
|--------|------|--------|
| GET | `/marketplace` | card-bridge-routes.ts |

## /members

| Method | Path | Source |
|--------|------|--------|
| GET | `/members` | data.ts |
| GET | `/members` | database.ts |
| POST | `/members` | database.ts |
| GET | `/members/:name` | database.ts |
| PUT | `/members/:name` | database.ts |
| DELETE | `/members/:name` | database.ts |

## /memory

| Method | Path | Source |
|--------|------|--------|
| GET | `/memory` | agent.ts |
| POST | `/memory` | agent.ts |

## /merch

| Method | Path | Source |
|--------|------|--------|
| POST | `/merch/claim` | events-merch.ts |
| GET | `/merch/tiers` | events-merch.ts |

## /meta

| Method | Path | Source |
|--------|------|--------|
| GET | `/meta` | card-engine.ts |

## /mint

| Method | Path | Source |
|--------|------|--------|
| POST | `/mint` | card-bridge-routes.ts |

## /my-bids

| Method | Path | Source |
|--------|------|--------|
| GET | `/my-bids/:wallet` | auction.ts |

## /my-cards

| Method | Path | Source |
|--------|------|--------|
| GET | `/my-cards/:deviceUUID` | physical.ts |

## /notifications

| Method | Path | Source |
|--------|------|--------|
| GET | `/notifications/:wallet` | auction.ts |
| POST | `/notifications/read` | auction.ts |

## /notify

| Method | Path | Source |
|--------|------|--------|
| POST | `/notify` | agent.ts |

## /npcs

| Method | Path | Source |
|--------|------|--------|
| GET | `/npcs` | npc-chat.ts |

## /nwg

| Method | Path | Source |
|--------|------|--------|
| GET | `/nwg/formula` | market-prices.ts |
| GET | `/nwg/pitch` | market-prices.ts |

## /onboard

| Method | Path | Source |
|--------|------|--------|
| POST | `/onboard` | agent.ts |

## /performance

| Method | Path | Source |
|--------|------|--------|
| GET | `/performance` | data.ts |

## /photos

| Method | Path | Source |
|--------|------|--------|
| GET | `/photos` | data.ts |
| GET | `/photos` | database.ts |
| POST | `/photos` | database.ts |
| DELETE | `/photos/:id` | database.ts |

## /physical_cards

| Method | Path | Source |
|--------|------|--------|
| GET | `physical_cards` | card-bridge-routes.ts |
| PUT | `physical_cards` | card-bridge-routes.ts |

## /portfolio-card

| Method | Path | Source |
|--------|------|--------|
| POST | `/portfolio-card` | gamification-routes.ts |

## /portfolio

| Method | Path | Source |
|--------|------|--------|
| POST | `/portfolio/calculate` | market-prices.ts |
| GET | `/portfolio/simulate` | market-prices.ts |

## /poses

| Method | Path | Source |
|--------|------|--------|
| GET | `/poses` | avatar.ts |

## /pray

| Method | Path | Source |
|--------|------|--------|
| POST | `/pray` | shrine.ts |

## /prayers

| Method | Path | Source |
|--------|------|--------|
| GET | `/prayers` | shrine.ts |
| POST | `/prayers/:id/flame` | shrine.ts |

## /prediction

| Method | Path | Source |
|--------|------|--------|
| POST | `/prediction/create` | gamification-routes.ts |
| GET | `/prediction/pool` | gamification-routes.ts |
| POST | `/prediction/resolve` | gamification-routes.ts |

## /pull

| Method | Path | Source |
|--------|------|--------|
| POST | `/pull` | card-db.ts |

## /pull-announce

| Method | Path | Source |
|--------|------|--------|
| POST | `/pull-announce` | market-trading.ts |

## /pulse

| Method | Path | Source |
|--------|------|--------|
| GET | `/pulse` | agent.ts |

## /qr

| Method | Path | Source |
|--------|------|--------|
| GET | `/qr/:cardId` | card-bridge-routes.ts |

## /quests

| Method | Path | Source |
|--------|------|--------|
| GET | `/quests` | gamification-routes.ts |

## /random

| Method | Path | Source |
|--------|------|--------|
| GET | `/random` | oracle.ts |

## /rarity

| Method | Path | Source |
|--------|------|--------|
| GET | `/rarity/:rarity` | card-db.ts |

## /rebalance

| Method | Path | Source |
|--------|------|--------|
| POST | `/rebalance` | card-engine-extra.ts |

## /register

| Method | Path | Source |
|--------|------|--------|
| POST | `/register` | wallet-economy.ts |

## /report-pull

| Method | Path | Source |
|--------|------|--------|
| POST | `/report-pull` | shrine.ts |

## /roster

| Method | Path | Source |
|--------|------|--------|
| GET | `/roster` | data.ts |

## /rules

| Method | Path | Source |
|--------|------|--------|
| GET | `/rules` | agent.ts |

## /sentinel

| Method | Path | Source |
|--------|------|--------|
| GET | `/sentinel` | sentinel.ts |
| GET | `/sentinel/a11y` | sentinel.ts |
| GET | `/sentinel/api-surface` | sentinel.ts |
| GET | `/sentinel/auto-fix` | sentinel.ts |
| GET | `/sentinel/deps` | sentinel.ts |
| GET | `/sentinel/files` | sentinel.ts |
| GET | `/sentinel/i18n` | sentinel.ts |
| GET | `/sentinel/module/:name` | sentinel.ts |
| GET | `/sentinel/modules` | sentinel.ts |
| GET | `/sentinel/plan` | sentinel.ts |
| GET | `/sentinel/quick` | sentinel.ts |
| GET | `/sentinel/security` | sentinel.ts |
| GET | `/sentinel/seo` | sentinel.ts |
| GET | `/sentinel/trend` | sentinel.ts |

## /shrine-meta

| Method | Path | Source |
|--------|------|--------|
| GET | `/shrine-meta` | card-engine-extra.ts |

## /simulate

| Method | Path | Source |
|--------|------|--------|
| POST | `/simulate` | card-engine.ts |

## /sitemap.xml

| Method | Path | Source |
|--------|------|--------|
| GET | `/sitemap.xml` | pages.ts |

## /stake

| Method | Path | Source |
|--------|------|--------|
| POST | `/stake` | card-bridge-routes.ts |

## /staking

| Method | Path | Source |
|--------|------|--------|
| GET | `/staking/rates` | events-merch.ts |

## /static

| Method | Path | Source |
|--------|------|--------|
| GET | `/static/game/:file` | index.tsx |
| GET | `/static/world/:file` | index.tsx |

## /stats

| Method | Path | Source |
|--------|------|--------|
| GET | `/stats` | auction.ts |
| GET | `/stats` | card-db.ts |
| GET | `/stats` | database.ts |
| PUT | `/stats` | database.ts |
| GET | `/stats` | physical.ts |

## /status

| Method | Path | Source |
|--------|------|--------|
| GET | `/status` | agent.ts |
| GET | `/status` | market-trading.ts |

## /stream

| Method | Path | Source |
|--------|------|--------|
| POST | `/stream` | guide.ts |

## /summon

| Method | Path | Source |
|--------|------|--------|
| POST | `/summon` | shrine.ts |

## /sync

| Method | Path | Source |
|--------|------|--------|
| POST | `/sync` | wallet-extra.ts |

## /synergies

| Method | Path | Source |
|--------|------|--------|
| GET | `/synergies` | card-engine.ts |

## /task

| Method | Path | Source |
|--------|------|--------|
| GET | `/task` | agent.ts |
| POST | `/task` | agent.ts |

## /tasks

| Method | Path | Source |
|--------|------|--------|
| GET | `/tasks` | agent.ts |
| POST | `/tasks` | agent.ts |

## /telemetry

| Method | Path | Source |
|--------|------|--------|
| GET | `/telemetry` | agent.ts |
| POST | `/telemetry` | agent.ts |

## /test-deck

| Method | Path | Source |
|--------|------|--------|
| POST | `/test-deck` | card-engine-extra.ts |

## /trailer

| Method | Path | Source |
|--------|------|--------|
| GET | `/trailer/review` | pages.ts |
| GET | `/trailer/review.html` | pages.ts |

## /transaction

| Method | Path | Source |
|--------|------|--------|
| POST | `/transaction` | wallet-economy.ts |

## /transactions

| Method | Path | Source |
|--------|------|--------|
| GET | `/transactions/:deviceUUID` | wallet-economy.ts |

## /translate

| Method | Path | Source |
|--------|------|--------|
| POST | `/translate` | translate.ts |
| POST | `/translate/free` | translate.ts |

## /unstake

| Method | Path | Source |
|--------|------|--------|
| POST | `/unstake` | card-bridge-routes.ts |

## /validation

| Method | Path | Source |
|--------|------|--------|
| GET | `/validation` | health.ts |

## /verify

| Method | Path | Source |
|--------|------|--------|
| POST | `/verify` | physical.ts |
| GET | `/verify` | purchase.ts |
| GET | `/verify/:guestId` | gm.ts |

## /webhook

| Method | Path | Source |
|--------|------|--------|
| POST | `/webhook/github` | agent.ts |

## /webhooks

| Method | Path | Source |
|--------|------|--------|
| POST | `/webhooks/github` | agent.ts |

## /whale-tracker

| Method | Path | Source |
|--------|------|--------|
| GET | `/whale-tracker` | gamification-routes.ts |
