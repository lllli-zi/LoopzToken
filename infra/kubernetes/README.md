# Kubernetes

首期不部署 Kubernetes：使用云厂商托管容器或固定规格云主机多实例部署
（TECHNICAL_SOLUTION 22.1）。发布频率、服务数量或弹性需求使托管容器
无法稳定运维时再迁移，迁移期间 PostgreSQL 仍是账务唯一权威数据源。

TODO（迁移时）：

- 各服务 Deployment / Service / HPA 清单（Gateway × 3 起、Billing × 2 起、
  Control API × 2 起、Worker × 2 起为压测起点）。
- 密钥经 KMS / Secret Manager 注入，不进镜像。
- 灰度发布与就绪探针（/readyz）。
