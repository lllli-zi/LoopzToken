# 监控

首期使用托管日志 + Prometheus + Grafana（TECHNICAL_SOLUTION 3.1），
不部署 Loki / Tempo。达到阈值后按指标触发升级。

- `prometheus.yml`：抓取 gateway / billing / control-api。
- 指标清单：TECHNICAL_SOLUTION 20.2。
- 告警基线：20.3（成功率、负余额、支付未到账、待结算超时、毛利异常等）。

TODO：各服务接入 /metrics 导出与告警规则文件。
