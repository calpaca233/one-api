package controller

import (
	"errors"
	"fmt"
	"net/http"
	"one-api/common"
	"one-api/model"
	"one-api/setting"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"
)

const tapnowAutoTokenName = "Tapnow Studio Auto"

func getTapnowUser(c *gin.Context) (*model.UserBase, bool) {
	userID := c.GetInt("id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "请先登录",
		})
		return nil, false
	}
	user, err := model.GetUserCache(userID)
	if err != nil {
		common.ApiError(c, err)
		return nil, false
	}
	if user.Status != common.UserStatusEnabled {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "用户已被封禁",
		})
		return nil, false
	}
	return user, true
}

func isTokenUsable(token *model.Token, now int64) bool {
	if token == nil || strings.TrimSpace(token.Key) == "" {
		return false
	}
	if token.Status != common.TokenStatusEnabled {
		return false
	}
	if token.ExpiredTime != -1 && token.ExpiredTime < now {
		return false
	}
	if !token.UnlimitedQuota && token.RemainQuota <= 0 {
		return false
	}
	return true
}

func withSkPrefix(tokenKey string) string {
	if strings.HasPrefix(tokenKey, "sk-") {
		return tokenKey
	}
	return "sk-" + tokenKey
}

func getOrCreateTapnowTokenKey(userID int) (string, error) {
	tokens, err := model.GetAllUserTokens(userID, 0, 1000)
	if err != nil {
		return "", err
	}
	now := common.GetTimestamp()
	var fallback *model.Token
	for _, token := range tokens {
		if !isTokenUsable(token, now) {
			continue
		}
		nameLower := strings.ToLower(token.Name)
		if strings.Contains(nameLower, "tapnow") {
			return withSkPrefix(token.Key), nil
		}
		if fallback == nil {
			fallback = token
		}
	}
	if fallback != nil {
		return withSkPrefix(fallback.Key), nil
	}

	var lastErr error
	for i := 0; i < 3; i++ {
		key, err := common.GenerateKey()
		if err != nil {
			lastErr = err
			continue
		}
		token := model.Token{
			UserId:         userID,
			Name:           tapnowAutoTokenName,
			Key:            key,
			CreatedTime:    now,
			AccessedTime:   now,
			ExpiredTime:    -1,
			RemainQuota:    500000,
			UnlimitedQuota: true,
			Group:          "",
		}
		if err := token.Insert(); err != nil {
			lastErr = err
			continue
		}
		return withSkPrefix(token.Key), nil
	}
	if lastErr == nil {
		lastErr = errors.New("创建 Tapnow 自动令牌失败")
	}
	return "", lastErr
}

func collectTapnowModels(group string) []string {
	usableGroups := setting.GetUserUsableGroups(group)
	modelSet := make(map[string]struct{})
	for groupName := range usableGroups {
		for _, modelName := range model.GetGroupEnabledModels(groupName) {
			modelName = strings.TrimSpace(modelName)
			if modelName == "" {
				continue
			}
			modelSet[modelName] = struct{}{}
		}
	}
	models := make([]string, 0, len(modelSet))
	for modelName := range modelSet {
		models = append(models, modelName)
	}
	sort.Strings(models)
	return models
}

func getRequestBaseURL(c *gin.Context) string {
	scheme := strings.TrimSpace(c.GetHeader("X-Forwarded-Proto"))
	if scheme == "" {
		if c.Request.TLS != nil {
			scheme = "https"
		} else {
			scheme = "http"
		}
	}
	host := strings.TrimSpace(c.GetHeader("X-Forwarded-Host"))
	if host == "" {
		host = c.Request.Host
	}
	if host == "" {
		return ""
	}
	return fmt.Sprintf("%s://%s", scheme, host)
}

func resolveTapnowAppPath() (string, error) {
	candidates := []string{
		strings.TrimSpace(os.Getenv("TAPNOW_APP_HTML")),
		"Tapnow-Studio-P2-cursor-tapnow-7c98/dist/index.html",
		"../Tapnow-Studio-P2-cursor-tapnow-7c98/dist/index.html",
		"../../Tapnow-Studio-P2-cursor-tapnow-7c98/dist/index.html",
	}
	for _, candidate := range candidates {
		if candidate == "" {
			continue
		}
		cleanPath := filepath.Clean(candidate)
		if _, err := os.Stat(cleanPath); err == nil {
			return cleanPath, nil
		}
	}
	return "", errors.New("Tapnow 页面文件不存在，请先构建 Tapnow 项目")
}

func GetTapnowBootstrap(c *gin.Context) {
	user, ok := getTapnowUser(c)
	if !ok {
		return
	}
	tokenKey, err := getOrCreateTapnowTokenKey(user.Id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"managed":         true,
		"user_id":         user.Id,
		"api_key":         tokenKey,
		"base_url":        getRequestBaseURL(c),
		"user_center_url": "/console",
		"models":          collectTapnowModels(user.Group),
	})
}

func GetTapnowApp(c *gin.Context) {
	userID := c.GetInt("id")
	if userID == 0 {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusUnauthorized, "<!doctype html><html><body><script>window.top.location.href='/login';</script></body></html>")
		return
	}
	user, err := model.GetUserCache(userID)
	if err != nil || user.Status != common.UserStatusEnabled {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusUnauthorized, "<!doctype html><html><body><script>window.top.location.href='/login';</script></body></html>")
		return
	}
	appPath, err := resolveTapnowAppPath()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	content, err := os.ReadFile(appPath)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
	c.Data(http.StatusOK, "text/html; charset=utf-8", content)
}
