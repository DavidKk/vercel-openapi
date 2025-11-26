[![Build Status](https://github.com/DavidKk/vercel-openapi/actions/workflows/coverage.workflow.yml/badge.svg)](https://github.com/DavidKk/vercel-openapi/actions/workflows/coverage.workflow.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![中文](https://img.shields.io/badge/%E6%96%87%E6%A1%A3-%E4%B8%AD%E6%96%87-green?style=flat-square&logo=docs)](https://github.com/DavidKk/vercel-openapi/blob/main/README.zh-CN.md) [![English](https://img.shields.io/badge/docs-English-green?style=flat-square&logo=docs)](https://github.com/DavidKk/vercel-openapi/blob/main/README.md)

# Vercel OpenAPI

为开发者提供的轻量级公共 API 缓存代理和节假日数据服务解决方案。

## 核心功能

- **API 缓存代理**: 为公共 API 提供缓存层，减少直接调用并提高响应速度
- **节假日数据服务**: 内置节假日数据接口，支持日期查询和节假日检查
- **地理位置服务**: 通过经纬度反向地理编码获取位置信息
- **开发者友好**: 简洁的 RESTful API 设计，支持 JWT 认证和双因素认证

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
