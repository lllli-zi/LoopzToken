// API Key 格式与校验（TECHNICAL_SOLUTION 10）：
//
//	sk-loopz_<public_id>_<secret>
//
// 数据库只存 public_id、key_prefix 与 HMAC-SHA256(secret, server_pepper)。
// 完整 Key 只在创建时展示一次；pepper 不入库、不入 Git、不入日志。
package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
)

const KeyPrefix = "sk-loopz_"

var ErrInvalidKey = errors.New("invalid loopz api key")

// ParseKey 解析完整 Key，得到 public_id 与 secret。
func ParseKey(raw string) (publicID, secret string, err error) {
	if !strings.HasPrefix(raw, KeyPrefix) {
		return "", "", ErrInvalidKey
	}
	rest := raw[len(KeyPrefix):]
	parts := strings.Split(rest, "_")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", ErrInvalidKey
	}
	return parts[0], parts[1], nil
}

// SecretHMAC 计算 secret 的 HMAC-SHA256（hex）。
func SecretHMAC(secret, pepper string) string {
	mac := hmac.New(sha256.New, []byte(pepper))
	mac.Write([]byte(secret))
	return hex.EncodeToString(mac.Sum(nil))
}

// VerifyHMAC 恒定时间比较（鉴权流程第 3 步）。
func VerifyHMAC(secret, pepper, storedHMAC string) bool {
	computed, err := hex.DecodeString(SecretHMAC(secret, pepper))
	if err != nil {
		return false
	}
	stored, err := hex.DecodeString(storedHMAC)
	if err != nil {
		return false
	}
	return hmac.Equal(computed, stored)
}

// GenerateKey 生成新 Key（开发 / 内部工具用）：
// 返回 publicID、secret 与完整 Key。
func GenerateKey() (publicID, secret, fullKey string, err error) {
	idBytes := make([]byte, 8)
	secretBytes := make([]byte, 24)
	if _, err = rand.Read(idBytes); err != nil {
		return "", "", "", fmt.Errorf("generate public id: %w", err)
	}
	if _, err = rand.Read(secretBytes); err != nil {
		return "", "", "", fmt.Errorf("generate secret: %w", err)
	}
	publicID = hex.EncodeToString(idBytes)
	secret = hex.EncodeToString(secretBytes)
	return publicID, secret, KeyPrefix + publicID + "_" + secret, nil
}
