## Module layout rules

统一约束所有业务模块（Holiday / Fuel Price / Exchange Rate / Geolocation 以及未来模块）的布局、侧栏结构和样式，供人 / AI 阅读；新模块或 generator 均需遵守本文档。

---

### 全局布局（Global shell）

- **Header**
  - 使用全局 `Nav` 组件，固定在页面最上方。
  - 不允许每个模块单独实现头部导航。
- **Body**
  - `body` 使用 Tailwind 类：
    - `antialiased h-screen flex flex-col overflow-hidden`
  - 内容区域为可伸缩的 `flex-1` 容器，承载各个模块的 layout。
- **Footer**
  - 全局通知栈 `NotificationStack` 固定渲染在底部。
  - 模块级代码不得移除或替换该组件。

---

### 模块布局（Module layout）

所有模块 layout 都必须符合下列结构：

- **DOM 层级**
  - 最外层容器：
    - `<div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-100">`
  - 内层容器（左右两列）：
    - `<div className="flex min-h-0 flex-1 overflow-hidden">`
  - 右侧主内容区域：
    - `<main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">`
- **Sidebar + Content**
  - 左侧使用统一组件 `DashboardSidebar`。
  - 右侧 `main` 渲染当前子路由的 `children`。
  - 模块 layout 不得改变上述 className 或整体结构，只能配置传入 `DashboardSidebar` 的 items。

---

### 侧栏导航（Sidebar structure）

侧栏导航为 **5 个固定入口**，顺序不可更改，只允许覆盖标题文案和 aria-label：

1. **Overview / Calendar**
   - 路由：`/<module>`
   - 用途：模块主功能视图（Overview），如日历、表格或转换器。
2. **API**
   - 路由：`/<module>/api`
   - 用途：REST API 文档 + Playground。
3. **MCP tools**
   - 路由：`/<module>/mcp`
   - 用途：与该模块相关的 MCP 工具文档 + Playground。
4. **Function Calling**
   - 路由：`/<module>/function-calling`
   - 用途：函数调用（Function Calling）相关的示例和交互。
5. **Skill**
   - 路由：`/<module>/skill`
   - 用途：Skill 定义、安装说明和示例。

> 约束：生成器和 AI 只能在 schema 中为这些入口提供 `title` / `ariaLabel` / `iconName` 文案，不得新增、删除或重新排序。

---

### 图标与风格（Icons & styling）

- 侧栏每个入口使用 `react-icons/tb` 系列的图标组件。
- 图标大小统一为：
  - `className="h-5 w-5"`
- 允许为不同模块选择不同的具体图标，但必须从规则中声明的枚举中选择（例如 `TbCalendarSearch`, `TbGasStation`, `TbCurrencyDollar`, `TbMapPin`, `TbApi`, `TbRobot`, `TbCode`, `TbFileText`）。
- 生成器不能随意引入新的 icon 类型，扩展时需要首先更新 rules。

---

### Overview 页面（主视图）

所有模块的 Overview 页面遵循以下结构：

- 路径：`app/<module>/page.tsx`
- 组件导出形式：
  - `export default function <ModuleName>Page() { ... }`
- DOM 结构：
  - 外层使用：
    - `<section className="flex h-full flex-col">`
  - 内部只放一个模块主组件（例如 `Calendar`、`GeoClient`、`ExchangeRateServer`、`FuelPriceTable`）。

> 约束：Overview 页面不得自行添加 header/sidebar 等结构，这些由上层 layout 和全局布局负责。

---

### API / MCP 文档 + Playground 布局

REST API 页面和 MCP 工具页面都采用统一的「文档 + Playground」双栏布局：

- 外层容器：
  - `<div className="flex h-full">`
- **左栏：文档（Documentation）**
  - `section` 类：
    - `className="flex min-h-0 w-1/2 min-w-[320px] flex-1 flex-col border-r border-gray-200 bg-white"`
  - 头部组件：
    - `DocPanelHeader`，传入 `title` 和 `subtitle`。
  - 内容区域：
    - `<div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">`
    - 使用 `app/Nav/constants.ts` 中的统一样式常量：
      - `DOC_SECTION_TITLE_CLASS`
      - `DOC_ENDPOINT_BOX_CLASS`
      - `DOC_ENDPOINT_DESC_CLASS`
  - REST API 页面：
    - 聚焦于一个或多个 `/api/<module>...` 端点。
  - MCP 页面：
    - 顶部固定展示 `POST /api/mcp`。
    - 列出与该模块相关的 MCP 工具名称和说明。
- **右栏：Playground**
  - `section` 类：
    - `className="flex min-h-0 w-1/2 min-w-[320px] flex-1 flex-col bg-gray-50"`
  - 内部容器：
    - `<div className="flex min-h-0 flex-1 flex-col">`
  - 渲染当前模块对应的 Playground 组件，例如：
    - `HolidayApiPlayground`
    - `HolidayMcpPlayground`
    - `FuelPriceApiPlayground`
    - `ExchangeRateMcpPlayground`

> 约束：双栏布局结构、className 和 Doc/Playground 组件的组合模式是固定的，规则不允许新增第三栏或改变左右结构。

---

### API handler 模式（后端约束，简要）

虽然不直接属于 layout，但与模块规范紧密相关：

- API 路由位于 `app/api/<module>/route.ts`。
- 必须使用统一的包装器：
  - `export const runtime = 'edge'`
  - `export const GET/POST = api(async (req) => { ... })`
- 响应通过 `jsonSuccess` 返回数据和 headers。

> 约束：新模块的 REST 接口必须遵守上述调用模式，以保持统一的缓存策略和响应格式。
