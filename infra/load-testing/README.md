# 压测

使用可控 Mock Provider，禁止对真实付费上游大规模压测（TECHNICAL_SOLUTION 24.3）。

场景基线：

- 3,000 条持续 SSE
- 100 RPS 新建请求
- 32 MB 请求体
- 慢客户端背压
- 600 秒长任务
- 上游首 Token 延迟 / 随机 429 / 500 / 断流
- 单节点滚动退出
- 数据库延迟与 Redis 故障

验收关注：RSS 稳定平台、Goroutine/连接无泄漏、P95/P99 附加延迟、
SSE 串流隔离、取消传播、账务一致、无重试风暴。

TODO：Mock Provider 与压测脚本（k6 / vegeta 等，随阶段 A 建立）。
