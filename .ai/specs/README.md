# Specs index

Global: **api-semantics.md**. Per-module: **modules/** (one file per module; inherit read-only, latest credit/data from api-semantics).

| Module        | File                                                   |
| ------------- | ------------------------------------------------------ |
| Holiday       | [modules/holiday.md](./modules/holiday.md)             |
| Fuel Price    | [modules/fuel-price.md](./modules/fuel-price.md)       |
| Exchange Rate | [modules/exchange-rate.md](./modules/exchange-rate.md) |
| China GEO     | [modules/geo.md](./modules/geo.md)                     |
| Movies        | [modules/movies.md](./modules/movies.md)               |
| Weather       | [modules/weather.md](./modules/weather.md)             |

New module: add `modules/<id>.md`; copy an existing file and adjust. Do not override "read-only, latest only" unless the spec states an exception and uses a distinct path (e.g. `/api/holiday/history`).
