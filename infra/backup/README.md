# 备份与恢复

- PostgreSQL：托管自动备份 + PITR；账务流水长期保留（期限按财税合规确认）。
- 备份加密；恢复演练是上线前决策门项目（TECHNICAL_SOLUTION 27）。
- Redis 只存缓存、限流与临时协调数据，不作为权威数据源，无需备份。

TODO：备份策略配置、恢复演练脚本与 Runbook。
