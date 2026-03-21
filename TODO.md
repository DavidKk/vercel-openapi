# News / RSS aggregation — category scope (phase 1)

Handle these **content categories** first. Each is orthogonal to **`region`**: `cn` | `hk_tw` | `international` (international deferred in implementation).  
Service names below are **RSSHub route namespaces / doc labels** (verify paths on your instance).  
**Current manifest:** `services/news/news-sources.manifest.ts` (`newsSourcesManifest`) includes **cn only** (no `hk_tw` rows).

---

## general-news — 综合新闻

- **cn**  
  央视新闻、澎湃新闻、南方周末、人民网、环球网、观察者网、参考消息、新浪、界面新闻（兼财经要闻时可双挂）
- **hk_tw**（未写入当前 manifest）  
  联合早报、端传媒、中央通讯社 等
- **international**（暂缓接入）  
  Reuters、BBC、The New York Times、The Washington Post、The Atlantic、New Yorker、AP News、NPR、CNBC、The Nikkei、Yahoo、DW Deutsche Welle、Caixin Global、Foreign Affairs、The White House、维基新闻、Canadian Broadcasting Corporation、Sputnik News、Russian News Agency TASS（是否启用由编辑政策决定）

---

## tech-internet — 科技互联网

- **cn**  
  36kr、品玩、爱范儿、少数派 sspai、InfoQ 中文、量子位、掘金、开源中国、Solidot、cnBeta、CSDN、博客园、HelloGitHub、Readhub、人人都是产品经理、鸟哥笔记、快科技、太平洋科技、威锋、宝玉、bestblogs.dev、电鸭社区、51CTO、牛客网、印记中文、Go 语言中文网、Rust 语言中文社区、PKMer、语雀、方格子、V2EX、阿里云、华为开发者联盟、腾讯（科技/开发者相关路由）、北京智源人工智能研究院、ModelScope 魔搭社区、Open Github 社区、Deepseek、白鲸出海、Amz123、通信人家园、钛媒体（兼创投时可双挂）、创业邦（兼商业科技）
- **hk_tw**（未写入当前 manifest）  
  iThome 台灣 等
- **international**（暂缓接入）  
  TechCrunch、WIRED、DEV Community、CSS-Tricks、Phoronix、web.dev、Docker Hub、GitHub、Huggingface、Ollama、LangChain Blog、DeepLearning.AI、Google、OpenAI、Anthropic、DeepMind、Meta、Apple、Node.js、React、Apache、CNCF、Notion、Obsidian、Zotero、Raycast、Elastic 中文社区、Augment Code、Windsurf、Kiro、Manus、Civitai、Fediverse、Plurk、Mastodon、Bluesky（亦见 social-platform）、LearnKu、iDaily、Digital Camera World（偏硬件可双挂）

---

## social-platform — 社交与平台热点

- **cn / cross-region**  
  抖音、哔哩哔哩 bilibili、微博、即刻、小宇宙、SoundOn、斗鱼直播、豆瓣、简书、搜狐号、微信小程序、腾讯网（号/动态类路由）、Lofter、淘宝（内容号类路由若存在）、逛逛/导购类（如 逛丢）
- **hk_tw**（未写入当前 manifest）  
  （按 RSSHub 文档补充账号/频道级路由）
- **international**（暂缓接入）  
  Instagram、Telegram、YouTube、Threads、Bluesky (bsky)、Twitch、Pinterest、LinkedIn、LINE、GETTR、Mastodon、Fediverse

---

## game-entertainment — 游戏文娱

- **cn**  
  小黑盒、游民星空、3DMGame、游戏打折情报、机核网、游侠网、电玩巴士 TGBUS、遊戲基地 Gamebase、游戏日报、米哈游、HoYoLAB、完美世界电竞、二柄 APP、A9VG 电玩部落、indienova 独立游戏、Bangumi 番组计划、虎扑、直播吧、AcFun、pixivision、PLAYNO.1 玩樂達人、GQ、起点、晋江文学城、「ONE · 一个」、dcfever（偏摄影硬件时可双挂）
- **hk_tw**（未写入当前 manifest）  
  巴哈姆特電玩資訊站 等
- **international**（暂缓接入）  
  Steam、Epic Games Store、Nintendo、Blizzard、Minecraft、ESPN、IMDb、The Movie Database、Komiic

---

## science-academic — 科学学术

- **cn**  
  科学网、果壳网、中国科技网、北京天文馆、中国气象局、中国疾病预防控制中心、梅斯医学 MedSci、中国研究生招生信息网、中国教育考试网、领研、社科期刊网、北京大学（校讯类路由）、中国计算机学会、Cool Papers（arXiv 聚合向）
- **hk_tw**（未写入当前 manifest）  
  （按 RSSHub 文档补充）
- **international**（暂缓接入）  
  NASA、Nature Journal、National Geographic、麻省理工科技评论、IEEE Xplore、IEEE Computer Society、NBER、Academia、AEON、Penguin Random House、日本語多読道場、Corona Virus Disease 2019、Codeforces、USENIX、ACM Special Interest Group on Security Audit and Control、穆迪评级、NPR（兼大众新闻时可双挂）

---

## Later

- Map each enabled source to **concrete RSSHub paths** + `category` + `region` + `tier`; **dedupe / cluster** within `category` (and optionally across `region` after translation).
- **Excluded** from all lists above: NSFW、盗版影视、极小众与高风险政治源（见对话约定）；需要时单独维护 blocklist。

---

## RSSHub doc index — 热点 / 持续信息流筛选

目标：从 `[[显示名, docs 页 URL], ...]` 中保留 **更像「要闻栏目 / 热榜 / 行业信息流」** 的 namespace，剔除 **高校通知、单产品更新、工具发行版、NSFW/盗版** 等不适合做 OpenAPI 资讯聚合的项。  
**仍为启发式**：每个 namespace 下请在文档里选 `热门` / `头条` / `trending` 等具体 path。

1. 将完整 JSON 数组保存为 **`data/rsshub-doc-index.full.json`**（格式：与此前内嵌在本文档中的二维数组相同）。
2. 在项目根目录执行：  
   `pnpm run rsshub:filter`  
   或：  
   `node scripts/filter-rsshub-hot-feeds.mjs data/rsshub-doc-index.full.json`  
   （若 `full.json` 为 `[]`，筛选与 registry 会**自动改用** `data/rsshub-doc-index.fixture.json`，避免生成空输出。）
3. 生成文件：
   - **`data/rsshub-hot-capable.json`** — 保留项（仍为 `[label, url]`）
   - **`data/rsshub-hot-dropped.json`** — 剔除项，含 `slug` 与 `reason`
4. 小样本见 **`data/rsshub-doc-index.fixture.json`**；当前仓库里的 `rsshub-hot-*.json` 可由该 fixture 生成，供联调格式。
5. **与 OpenAPI 项目 HTTP 层对齐的汇总表**（启发式 + `TODO.md` 阶段 1 分类）：
   - 维护 slug → 业务分类见 **`data/rsshub-todo-slug-map.json`**
   - 执行：`pnpm run rsshub:registry` → **`data/rsshub-openapi-registry.json`**（含拟议的 `/api/news/*` 路由说明与各 namespace 元数据）
   - 说明文档：**`.ai/specs/integrations/rsshub-openapi.md`**
6. **资讯模块最终用的「热门源」白名单**（仅阶段 1 列表 + 去掉工具链/NSFW/校讯招考等）：
   - 展示名见 **`data/rsshub-todo-slug-labels.json`**（与 slug 一一对应，供分类器与文档）
   - 策略（招考/校讯排除等）见 **`data/rsshub-phase1-hot-policy.json`**
   - 生成：`pnpm run rsshub:phase1-hot` → **`data/rsshub-phase1-hot-allowlist.json`**
     - `byCategoryAndRegion`：当前实现波次 **`cn` / `hk_tw`** 下按 `general-news` 等类型分组的服务与接口占位（`rsshubPathPattern` + `docsUrl`）
     - `internationalDeferredHotEligible`：`international`（TODO 暂缓）但已通过筛选的源，供后续接入
     - `excludedFromHot`：被剔除项及原因
     - `eligibleForHotApiNowFlat`：扁平列表，便于 `GET /api/news/hot-sources` 直接加载
7. **从 RSSHub 上游源码为每个 slug 选一条「热点/今日/滚动」路由**（无则剔除该服务）：
   - 生成：`pnpm run rsshub:pick-hot-routes`（未设置 `RSSHUB_ROUTES_DIR` 时会自动浅克隆到 **`.tmp/rsshub-src`**，已加入 `.gitignore`）→ **`data/rsshub-phase1-hot-routes-resolved.json`**
   - 确认输出无误后删除克隆：`pnpm run rsshub:clean-rsshub-clone`
   - 手工纠正：`data/rsshub-hot-route-overrides.json`（`rsshubPath` 或 `forceDrop`）；自定义克隆目录：`RSSHUB_ROUTES_DIR=...`；禁止自动克隆：`RSSHUB_AUTO_CLONE=0`

**剔除原因 `reason` 含义简述**

| reason                                   | 含义                                                    |
| ---------------------------------------- | ------------------------------------------------------- |
| `slug_blocklist_nsfw_or_piracy`          | NSFW、盗版、羊毛站等                                    |
| `slug_blocklist_tool_or_infrastructure`  | 包管理器、单框架发行说明、基础设施状态等                |
| `title_blocklist_single_entity_or_niche` | 标题像高校、律所、单一 IP/艺人官网等                    |
| `no_obvious_rolling_or_hot_feed`         | 标题/ slug 均未命中「媒体/社交/市场」启发式，默认不保留 |
| `bad_url`                                | 无法从 URL 解析出 namespace                             |

调整规则请改 **`scripts/lib/rsshub-classify.mjs`** 中的 `BLOCK_*`、`EXTRA_ALLOW_SLUG`、`MEDIA_TITLE_RE`（`filter-rsshub-hot-feeds.mjs` 仅调用该模块）。阶段 1 热门白名单的招考/校讯排除改 **`data/rsshub-phase1-hot-policy.json`**。
