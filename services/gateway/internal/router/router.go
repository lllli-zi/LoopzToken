// Provider 路由（TECHNICAL_SOLUTION 11）。
//
// 候选过滤顺序（11.1）：禁用 → 协议支持 → 模型映射 → 熔断 →
// 并发/RPM/TPM → 上游余额 → 用户组权限 → 价格毛利。
// 评分（11.2）：静态优先级 + 成功率 + 首 Token 延迟 + 容量 + 成本 + 地域，
// 首发采用可解释加权规则，不引入不可解释的机器学习路由。
//
// 骨架阶段实现过滤链与静态优先级选择；健康评分、熔断器
// （11.3，连续错误/滑动窗口 → 半开探测）随阶段 2 接入真实指标。
package router

import "errors"

type Candidate struct {
	ProviderID   string
	DeploymentID string
	Priority     int
	Weight       int
}

type Filter func(c Candidate) bool

var ErrNoCandidate = errors.New("no available provider candidate")

type Router struct {
	filters []Filter
}

func New(filters ...Filter) *Router {
	return &Router{filters: filters}
}

// Select 返回过滤后的最高静态优先级候选（同优先级取第一个）。
// TODO: 加权评分、熔断状态、并发水位（Redis）参与排序。
func (r *Router) Select(candidates []Candidate) (Candidate, error) {
	var best *Candidate
	for _, c := range candidates {
		allowed := true
		for _, f := range r.filters {
			if !f(c) {
				allowed = false
				break
			}
		}
		if !allowed {
			continue
		}
		if best == nil || c.Priority > best.Priority {
			c := c
			best = &c
		}
	}
	if best == nil {
		return Candidate{}, ErrNoCandidate
	}
	return *best, nil
}
