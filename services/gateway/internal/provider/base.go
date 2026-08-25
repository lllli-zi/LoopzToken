package provider

import (
	"context"
	"errors"
	"net/http"
)

var errNotImplemented = errors.New("adapter method not implemented yet")

// BaseAdapter 提供接口的保守默认实现：未实现的方法返回错误，
// 各 Adapter 只覆写自己关心的方法，保证新增协议不会破坏接口编译。
type BaseAdapter struct{}

func (BaseAdapter) Name() string { return "base" }

func (BaseAdapter) Supports(string, Protocol) bool { return false }

func (BaseAdapter) BuildUpstreamRequest(context.Context, *GatewayRequest) (*http.Request, error) {
	return nil, errNotImplemented
}

func (BaseAdapter) ParseNonStreamUsage([]byte) (Usage, error) {
	return Usage{}, errNotImplemented
}

func (BaseAdapter) NewStreamParser() StreamUsageParser { return noopStreamParser{} }

func (BaseAdapter) ClassifyError(*http.Response, []byte) ProviderError {
	return ProviderError{Status: 0, Class: "unknown", Retryable: false, Message: errNotImplemented.Error()}
}

func (BaseAdapter) ExtractRequestID(*http.Response) string { return "" }

func (BaseAdapter) QueryBilling(context.Context, string) (*ProviderBilling, error) {
	return nil, errNotImplemented
}

func (BaseAdapter) QueryBalance(context.Context) (*ProviderBalance, error) {
	return nil, errNotImplemented
}

type noopStreamParser struct{}

func (noopStreamParser) Feed([]byte) error { return nil }
func (noopStreamParser) Usage() Usage       { return Usage{} }
func (noopStreamParser) Err() error         { return nil }
