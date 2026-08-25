// Package wallet：权威钱包领域模型（TECHNICAL_SOLUTION 15）。
//
// 关键约束：
//   - 金额 BIGINT 微元，禁止浮点（15.1）。
//   - 余额、冻结、流水在同一数据库事务内更新（PRD 11.3）。
//   - wallet_ledger 不可变，只插入。
//   - 不允许负余额、重复扣费（BILL-007）；幂等键数据库唯一约束（BILL-006）。
//   - settled / released 为终态，重复调用返回原结果（15.5）。
//
// 骨架阶段仅定义接口与事务步骤；实现（pgx + PostgreSQL）在阶段 1 补齐。
package wallet

import (
	"context"
	"errors"
)

var (
	ErrInsufficientBalance = errors.New("insufficient balance")
	ErrReservationNotFound = errors.New("reservation not found")
	ErrReservationSettled  = errors.New("reservation already settled")
)

type ReserveRequest struct {
	IdempotencyKey string
	UserID         string
	APIKeyID       string
	RequestID      string
	AmountMicros   int64
}

type SettleRequest struct {
	IdempotencyKey string
	AmountMicros   int64
	PriceVersionID string
	UsageSource    string
	ParserVersion  string
	Estimated      bool
}

type Wallet struct {
	UserID       string
	BalanceMicro int64
	FrozenMicro  int64
}

type Reservation struct {
	ID           string
	UserID       string
	AmountMicros int64
	Status       string // RESERVED / SETTLED / RELEASED / EXPIRED
}

// Service 由 Billing HTTP handler 调用；所有方法必须幂等。
type Service interface {
	// Reserve 预冻结：余额充足 → balance-/frozen+，插入 reservation。
	Reserve(ctx context.Context, req ReserveRequest) (*Reservation, error)

	// Settle 结算事务（TECHNICAL_SOLUTION 15.3），同一事务内完成：
	//  1. 锁定 reservation
	//  2. 检查结算幂等键
	//  3. 计算最终费用
	//  4. 从冻结余额扣除实际费用
	//  5. 释放剩余冻结金额
	//  6. 插入不可变钱包流水
	//  7. 更新 reservation 与 request 状态
	//  8. 写入 billing.settled Outbox 事件
	Settle(ctx context.Context, reservationID string, req SettleRequest) error

	// Release 释放冻结（未调用上游 / 不可恢复异常）。
	Release(ctx context.Context, reservationID string, idempotencyKey, reason string) error

	// Recharge 充值入账：payment.credited 事件的账务侧，幂等入账。
	Recharge(ctx context.Context, userID, orderID, idempotencyKey string, amountMicros int64) error

	// Refund 退款扣减：校验剩余可退金额后扣减余额并写流水。
	Refund(ctx context.Context, userID, refundID, idempotencyKey, reason string, amountMicros int64) error

	// GetWallet 读取权威余额。
	GetWallet(ctx context.Context, userID string) (*Wallet, error)
}
