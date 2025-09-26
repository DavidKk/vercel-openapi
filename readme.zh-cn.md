[![Build Status](https://github.com/DavidKk/vercel-openapi/actions/workflows/coverage.workflow.yml/badge.svg)](https://github.com/DavidKk/vercel-openapi/actions/workflows/coverage.workflow.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![中文](https://img.shields.io/badge/%E6%96%87%E6%A1%A3-%E4%B8%AD%E6%96%87-green?style=flat-square&logo=docs)](https://github.com/DavidKk/vercel-openapi/blob/main/README.zh-CN.md) [![English](https://img.shields.io/badge/docs-English-green?style=flat-square&logo=docs)](https://github.com/DavidKk/vercel-openapi/blob/main/README.md)

# Vercel OpenAPI

为开发者提供的轻量级公共 API 缓存代理和节假日数据服务解决方案。

## 核心功能

- **API 缓存代理**: 为公共 API 提供缓存层，减少直接调用并提高响应速度
- **节假日数据服务**: 内置节假日数据接口，支持日期查询和节假日检查
- **MCP (机器控制协议) 支持**: 标准化工具接口，用于与 AI 代理和自动化系统集成
- **开发者友好**: 简洁的 RESTful API 设计，支持 JWT 认证和双因素认证

## MCP (机器控制协议) 支持

本服务实现了机器控制协议 (MCP)，为 AI 代理和自动化系统与我们的服务交互提供了标准化接口。MCP 支持：

- **标准化工具接口**: 一致的 API 设计用于工具集成
- **AI 代理兼容性**: 直接与 AI 代理和大语言模型集成
- **自动化支持**: 对服务功能的编程访问

### 可用的 MCP 工具

1. **节假日服务工具** (`/mcp/holiday`):

   - `listHolidays`: 获取指定年份的中国节假日列表
   - `isHoliday`: 检查指定日期是否为节假日
   - `isTodayHoliday`: 检查今天是否为节假日
   - `isFutureHoliday`: 检查未来某天（以天数计算）是否为节假日

2. **油价服务工具** (`/mcp/fuel-price`):
   - `listFuelPrices`: 获取中国各省市的油价列表
   - `getProvinceFuelPrice`: 获取指定省份的油价
   - `calcRechargePromo`: 计算指定省份的加油充值优惠

### 使用 MCP 工具

可以通过 HTTP 请求访问 MCP 工具：

1. **获取工具清单** (GET 请求):

   ```bash
   curl -X GET https://your-domain.com/mcp/holiday
   ```

2. **执行工具** (POST 请求):
   ```bash
   curl -X POST https://your-domain.com/mcp/holiday \
     -H "Content-Type: application/json" \
     -d '{
       "tool": "isHoliday",
       "params": {
         "date": "2024-01-01"
       }
     }'
   ```

## 安全注意事项

- 所有 API 请求都需要 JWT 认证 - 请保管好您的密钥
- 双因素认证是可选的，但强烈建议在生产环境中使用
- 定期轮换 JWT_SECRET 和 2FA_SECRET 以提高安全性

## 部署到 Vercel

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDavidKk%2Fvercel-openapi)

### 环境变量配置

请参考 [`.env.example`](./.env.example) 文件设置所需的环境变量：

- `JWT_SECRET`: JWT 签名密钥
- `JWT_EXPIRES_IN`: JWT 过期时间
- `ACCESS_2FA_SECRET`: 双因素认证密钥（可选）
- `ACCESS_USERNAME`: 管理员用户名
- `ACCESS_PASSWORD`: 管理员密码

## 快速开始

1. 在 Vercel 中设置上述环境变量
2. 部署后，通过 `/api/auth/login` 获取访问令牌
3. 使用令牌访问 `/api/holiday` 节假日数据接口
