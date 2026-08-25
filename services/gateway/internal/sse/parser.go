// SSE 流式处理（TECHNICAL_SOLUTION 14）。
//
// 数据路径：上游响应分两路——原始字节直接下发客户端；
// 有界副本交给协议解析器增量提取 Usage / Request ID / Error。
// 不累积完整响应；慢客户端背压、单 Event 大小上限、每响应 Flush。
//
// 骨架阶段只定义通用解析接口；四种协议状态机
// （OpenAIChat / OpenAIResponses / AnthropicMessages / Gemini）
// 在阶段 1 与协议兼容测试一起实现。
package sse

import (
	"errors"
)

// MaxEventBytes 单个 SSE Event 数据上限；超过即终止请求并记录。
const MaxEventBytes = 1 << 20 // 1 MB

var ErrEventTooLarge = errors.New("sse event exceeds size limit")

// Event 一条完整的 SSE 事件（data 行聚合后）。
type Event struct {
	Name string
	Data []byte
}

// StreamParser 增量解析 SSE 字节流。
// Feed 可在任意字节边界调用；实现内部按行状态机缓冲。
type StreamParser interface {
	Feed(chunk []byte) ([]Event, error)
}
