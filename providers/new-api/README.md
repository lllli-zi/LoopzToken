# New API Adapter（可选内部 Provider）

对应实现：`services/gateway/internal/provider`（`NewAPIAdapter`）。

## 边界（TECHNICAL_SOLUTION 7）

```text
Loopz Gateway → NewAPIAdapter → 内部 New API 集群 → New API 管理的上游渠道
```

- 适合：快速接入大量 OpenAI 兼容长尾渠道，复用其渠道管理、模型映射与健康检查。
- 不负责：LoopzToken 用户身份、API Key 权威鉴权、人民币钱包、支付订单、
  用户销售价格、权威 Token 账本。
- 是否启用由真实渠道数量与适配成本决定；**不部署 New API 时系统必须可运行**。

## 重试责任（12.1）

- Loopz Gateway：负责跨 Provider 切换（最多 1 次）。
- New API：被选中时只负责其内部渠道重试，两层不得相乘。

## 验收清单

- [ ] OpenAI 兼容协议透传
- [ ] 模型映射正确（公开模型 → New API 渠道模型）
- [ ] 内部重试与 Gateway 重试预算不相乘
- [ ] 渠道健康状态同步
- [ ] 成本账单核对（Provider Billing 查询）
