// 配置来自环境变量；默认值对齐 TECHNICAL_SOLUTION 22.4 超时基线。
package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	ListenAddr     string
	BillingBaseURL string
	// API Key HMAC pepper；生产来自 KMS / Secret Manager（TECHNICAL_SOLUTION 10）
	APIKeyPepper    string
	MaxBodyBytes    int64
	RequestTimeout  time.Duration
	BillingTimeout  time.Duration
	// 大请求体临时文件目录（TECHNICAL_SOLUTION 13），独立挂载并设容量上限
	TempDir string
}

func Load() Config {
	return Config{
		ListenAddr:      envOr("GATEWAY_LISTEN_ADDR", ":8080"),
		BillingBaseURL:  envOr("BILLING_BASE_URL", "http://localhost:8081"),
		APIKeyPepper:    envOr("API_KEY_PEPPER", "dev-only-pepper-change-me"),
		MaxBodyBytes:    envInt64Or("GATEWAY_MAX_BODY_BYTES", 32*1024*1024),
		RequestTimeout:  envDurationOr("GATEWAY_REQUEST_TIMEOUT", 600*time.Second),
		BillingTimeout:  envDurationOr("BILLING_INTERNAL_TIMEOUT", 3*time.Second),
		TempDir:         envOr("GATEWAY_TEMP_DIR", os.TempDir()),
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt64Or(key string, fallback int64) int64 {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			return n
		}
	}
	return fallback
}

func envDurationOr(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}

func (c Config) Validate() error {
	if c.APIKeyPepper == "" {
		return fmt.Errorf("API_KEY_PEPPER 不能为空")
	}
	return nil
}
