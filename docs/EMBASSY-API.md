# NWG Embassy System - Developer Integration Guide

> **Make your guild part of the NumbahWan Alliance**

## Overview

The Embassy system lets any guild/project integrate with NumbahWan for mutual benefits:
- Your users visit NWG → earn rewards on YOUR site
- NWG users visit you → earn NWG rewards
- Cross-promotion without complex integrations

---

## Quick Start (5 minutes)

### 1. Register as Partner
```bash
POST https://nwg.pages.dev/api/embassy/register
{
  "guildName": "MatchaLatte",
  "guildUrl": "https://matchalatte.pages.dev",
  "contactEmail": "admin@matchalatte.dev",
  "description": "Aquila-22 gaming guild"
}

# Response:
{
  "success": true,
  "partnerId": "ml-aquila22",
  "apiKey": "emb_live_xxxxxxxxxxxxx",
  "embedCode": "<script src='https://nwg.pages.dev/embassy/widget.js' data-partner='ml-aquila22'></script>"
}
```

### 2. Add Widget to Your Site
```html
<!-- Paste in your site's <head> or before </body> -->
<script src="https://nwg.pages.dev/embassy/widget.js" data-partner="ml-aquila22"></script>
```

That's it! Your users now see an "NWG Embassy" badge they can click for rewards.

---

## API Endpoints

### Check Visitor Status
```bash
GET /api/embassy/visitor?partnerId={partnerId}&visitorId={visitorId}

# Response:
{
  "canClaim": true,
  "lastVisit": null,
  "rewardsAvailable": {
    "nwg": 50,
    "wood": 10
  }
}
```

### Claim Visit Reward
```bash
POST /api/embassy/claim
{
  "partnerId": "ml-aquila22",
  "visitorId": "user-123",
  "visitorName": "PlayerOne"  // optional
}

# Response:
{
  "success": true,
  "rewards": { "nwg": 50, "wood": 10 },
  "message": "Welcome from MatchaLatte! +50 NWG",
  "nextClaimIn": "24h",
  "partnerReward": {
    "type": "callback",
    "url": "https://matchalatte.pages.dev/api/nwg-visitor",
    "payload": { "visitorId": "user-123", "fromGuild": "numbahwan" }
  }
}
```

### Get Partner Stats
```bash
GET /api/embassy/stats?partnerId={partnerId}&apiKey={apiKey}

# Response:
{
  "totalVisitors": 1247,
  "uniqueVisitors": 892,
  "rewardsDistributed": { "nwg": 62350, "wood": 12470 },
  "topVisitors": [
    { "name": "RegginA_Fan", "visits": 47 },
    { "name": "WoodHoarder", "visits": 31 }
  ]
}
```

---

## Reward Tiers

| Partner Level | Daily Visitor Reward | Requirements |
|---------------|---------------------|--------------|
| **Bronze** | 25 NWG + 5 Wood | New partner |
| **Silver** | 50 NWG + 10 Wood | 100+ unique visitors |
| **Gold** | 100 NWG + 25 Wood | 500+ unique visitors |
| **Alliance** | 200 NWG + 50 Wood + Special Badge | 1000+ visitors + mutual integration |

---

## Webhook (Optional)

Receive notifications when NWG users visit your site:

```bash
POST {your-webhook-url}
{
  "event": "nwg_visitor",
  "visitorId": "nw-xxxxxxxxxxxx",
  "timestamp": "2026-02-04T12:00:00Z",
  "signature": "sha256=xxxxxx"  // Verify with your apiKey
}
```

Register webhook:
```bash
POST /api/embassy/webhook
{
  "partnerId": "ml-aquila22",
  "apiKey": "emb_live_xxxxx",
  "webhookUrl": "https://matchalatte.pages.dev/api/nwg-webhook"
}
```

---

## Embeddable Widget

### Basic Widget
```html
<script src="https://nwg.pages.dev/embassy/widget.js" data-partner="ml-aquila22"></script>
```

### Customized Widget
```html
<script 
  src="https://nwg.pages.dev/embassy/widget.js" 
  data-partner="ml-aquila22"
  data-theme="dark"
  data-position="bottom-right"
  data-size="small"
></script>
```

### Manual Trigger
```javascript
// Don't show floating widget, trigger manually
NWGEmbassy.init({ partner: 'ml-aquila22', autoShow: false });

// Call when user clicks your button
document.getElementById('visit-nwg').onclick = () => {
  NWGEmbassy.open();
};
```

---

## Mutual Integration Example

### Your Site Rewards NWG Visitors
```javascript
// On your site - reward users who came from NWG
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('ref') === 'nwg') {
  // Give your rewards
  giveReward(userId, { matcha: 100 });
  
  // Notify NWG (optional)
  fetch('https://nwg.pages.dev/api/embassy/callback', {
    method: 'POST',
    body: JSON.stringify({
      partnerId: 'ml-aquila22',
      event: 'reward_given',
      visitorId: urlParams.get('uid')
    })
  });
}
```

### Link to Partner from NWG
```
https://matchalatte.pages.dev?ref=nwg&uid={nwg-user-id}
```

---

## Current Partners

| Guild | Server | Status | Benefits |
|-------|--------|--------|----------|
| **MatchaLatte** | Aquila-22 | Alliance | 200 NWG/day, exclusive cards |
| *Your Guild* | ? | [Register Now](#quick-start) | 25-200 NWG/day |

---

## FAQ

**Q: Is there a cost?**
A: No. Free for all guilds/projects.

**Q: Do I need to give rewards back?**
A: Optional but recommended. Mutual benefits = more engagement.

**Q: Can I customize the widget?**
A: Yes - themes, positions, sizes, or trigger manually.

**Q: Rate limits?**
A: 1 claim per user per partner per 24h. 1000 API calls/day free tier.

---

## Support

- Discord: [NumbahWan Guild]
- GitHub: Issues on this repo
- Email: embassy@nwg.pages.dev

---

*Built with love by the NumbahWan family* 🔥
