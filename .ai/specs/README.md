# Specs index

Global: **api-semantics.md**. Per-module: **modules/** (one file per module; inherit read-only, latest credit/data from api-semantics).

| Module        | File                                                                |
| ------------- | ------------------------------------------------------------------- |
| Holiday       | [modules/holiday.md](./modules/holiday.md)                          |
| Fuel Price    | [modules/fuel-price.md](./modules/fuel-price.md)                    |
| Exchange Rate | [modules/exchange-rate.md](./modules/exchange-rate.md)              |
| Geo (China)   | [modules/geo.md](./modules/geo.md)                                  |
| Movies        | [modules/movies.md](./modules/movies.md)                            |
| Weather       | [modules/weather.md](./modules/weather.md)                          |
| DNS Query     | [modules/dns.md](./modules/dns.md)                                  |
| Finance       | No spec yet; see `.ai/schemas/finance.yaml` and `app/api/finance/`. |
| Prices        | [modules/prices.md](./modules/prices.md)                            |
| Proxy rule    | [modules/proxy-rule.md](./modules/proxy-rule.md)                    |

New module: add `modules/<id>.md`; copy an existing file and adjust. Do not override "read-only, latest only" unless the spec states an exception and uses a distinct path (e.g. `/api/holiday/history`). Module **id** in specs and schema is the route name (e.g. `geo`, not `china-geo`).
