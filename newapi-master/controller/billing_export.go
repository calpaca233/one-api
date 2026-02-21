package controller

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"one-api/common"
	"one-api/model"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
)

// BillingExportRequest 账单导出请求
type BillingExportRequest struct {
	StartTime int64  `json:"start_time" binding:"required"`
	EndTime   int64  `json:"end_time" binding:"required"`
	Format    string `json:"format" binding:"required,oneof=excel"`
	Username  string `json:"username"` // 管理员查询指定用户
}

// BillingExportResponse 账单导出响应
type BillingExportResponse struct {
	Message string `json:"message"`
	Data    struct {
		DownloadUrl string `json:"download_url"`
		Filename    string `json:"filename"`
	} `json:"data"`
}

// ExportBilling 导出账单数据
func ExportBilling(c *gin.Context) {
	var req BillingExportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "参数错误："+err.Error())
		return
	}

	// 验证时间范围
	if req.EndTime <= req.StartTime {
		common.ApiErrorMsg(c, "结束时间必须大于开始时间")
		return
	}

	// 限制时间范围（最多 1 年）
	if req.EndTime-req.StartTime > 365*24*3600 {
		common.ApiErrorMsg(c, "时间范围不能超过 1 年")
		return
	}

	userId := c.GetInt("id")
	userRole := c.GetInt("role")
	var username string

	// 管理员可以查看所有用户数据或指定用户数据
	if userRole >= common.RoleAdminUser {
		if req.Username != "" {
			// 查询指定用户的数据
			user, err := model.GetUserByUsername(req.Username)
			if err != nil {
				common.ApiErrorMsg(c, "用户不存在")
				return
			}
			userId = user.Id
			username = user.Username
		} else {
			// 查询所有用户的数据
			userId = 0
			username = "所有用户"
		}
	} else {
		// 普通用户只能查看自己的数据
		user, err := model.GetUserById(userId, false)
		if err != nil {
			common.ApiErrorMsg(c, "获取用户信息失败："+err.Error())
			return
		}
		username = user.Username
	}

	// 获取账单数据
	billingData, err := getBillingData(userId, req.StartTime, req.EndTime)
	if err != nil {
		common.ApiErrorMsg(c, "获取账单数据失败："+err.Error())
		return
	}

	// 生成文件名（添加用户名前缀）
	startDate := time.Unix(req.StartTime, 0).Format("2006-01-02")
	endDate := time.Unix(req.EndTime, 0).Format("2006-01-02")
	filename := fmt.Sprintf("%s_数据看板导出_%s_至_%s.xlsx", username, startDate, endDate)

	// 根据格式生成文件
	var fileData []byte
	var contentType string

	// 只支持 Excel 格式
	fileData, contentType, err = generateExcel(billingData)

	if err != nil {
		common.ApiErrorMsg(c, "生成文件失败："+err.Error())
		return
	}

	// 设置响应头
	c.Header("Content-Type", contentType)
	// 使用 RFC 5987 编码支持中文文件名
	encodedFilename := url.QueryEscape(filename)
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"; filename*=UTF-8''%s", filename, encodedFilename))
	c.Header("Content-Length", strconv.Itoa(len(fileData)))

	// 返回文件
	c.Data(http.StatusOK, contentType, fileData)
}

// BillingData 账单数据结构（按服务 ID 和模型聚合）
type BillingData struct {
	ChannelId        int     `json:"channel_id"`
	ModelName        string  `json:"model_name"`
	Cost             float64 `json:"cost"`
	PromptTokens     int     `json:"prompt_tokens"`
	CompletionTokens int     `json:"completion_tokens"`
	TokenUsed        int     `json:"token_used"`
	QuotaUsed        int     `json:"quota_used"`
}

// getBillingData 获取账单数据（按服务 ID 和模型聚合）
func getBillingData(userId int, startTime, endTime int64) ([]BillingData, error) {
	// 从 logs 表按 channel_id 和 model_name 聚合查询
	type AggregatedLog struct {
		ChannelId        int
		ModelName        string
		Quota            int
		PromptTokens     int
		CompletionTokens int
	}

	var aggregatedLogs []AggregatedLog
	var err error

	// 构建查询
	query := model.LOG_DB.Table("logs").
		Select("channel_id, model_name, sum(quota) as quota, sum(prompt_tokens) as prompt_tokens, sum(completion_tokens) as completion_tokens").
		Where("type = ? AND created_at >= ? AND created_at <= ?", model.LogTypeConsume, startTime, endTime).
		Group("channel_id, model_name").
		Order("channel_id, model_name")

	if userId != 0 {
		// 用户查看自己的数据
		query = query.Where("user_id = ?", userId)
	}

	err = query.Find(&aggregatedLogs).Error
	if err != nil {
		return nil, err
	}

	// 转换为 BillingData 格式
	var billingData []BillingData
	for _, log := range aggregatedLogs {
		cost := float64(log.Quota) / common.QuotaPerUnit
		totalTokens := log.PromptTokens + log.CompletionTokens

		billingData = append(billingData, BillingData{
			ChannelId:        log.ChannelId,
			ModelName:        log.ModelName,
			PromptTokens:     log.PromptTokens,
			CompletionTokens: log.CompletionTokens,
			TokenUsed:        totalTokens,
			QuotaUsed:        log.Quota,
			Cost:             cost,
		})
	}

	return billingData, nil
}

// generateExcel 生成 Excel 文件（按服务 ID 和模型聚合）
func generateExcel(data []BillingData) ([]byte, string, error) {
	f := excelize.NewFile()
	defer f.Close()

	// 设置表头
	headers := []string{"服务 ID", "模型", "费用 (元)", "输入 Tokens", "输出 Tokens", "tokens 用量"}
	for i, header := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		f.SetCellValue("Sheet1", cell, header)
	}

	// 写入数据
	for i, item := range data {
		row := i + 2
		f.SetCellValue("Sheet1", fmt.Sprintf("A%d", row), item.ChannelId)
		f.SetCellValue("Sheet1", fmt.Sprintf("B%d", row), item.ModelName)
		f.SetCellValue("Sheet1", fmt.Sprintf("C%d", row), item.Cost)
		f.SetCellValue("Sheet1", fmt.Sprintf("D%d", row), item.PromptTokens)
		f.SetCellValue("Sheet1", fmt.Sprintf("E%d", row), item.CompletionTokens)
		f.SetCellValue("Sheet1", fmt.Sprintf("F%d", row), item.TokenUsed)
	}

	// 写入合计行（使用 Excel 公式）
	totalRow := len(data) + 2
	f.SetCellValue("Sheet1", fmt.Sprintf("A%d", totalRow), "合计")
	f.SetCellFormula("Sheet1", fmt.Sprintf("C%d", totalRow), fmt.Sprintf("SUM(C2:C%d)", len(data)+1))
	f.SetCellFormula("Sheet1", fmt.Sprintf("D%d", totalRow), fmt.Sprintf("SUM(D2:D%d)", len(data)+1))
	f.SetCellFormula("Sheet1", fmt.Sprintf("E%d", totalRow), fmt.Sprintf("SUM(E2:E%d)", len(data)+1))
	f.SetCellFormula("Sheet1", fmt.Sprintf("F%d", totalRow), fmt.Sprintf("SUM(F2:F%d)", len(data)+1))

	// 设置列宽
	f.SetColWidth("Sheet1", "A", "A", 12) // 服务 ID
	f.SetColWidth("Sheet1", "B", "B", 30) // 模型
	f.SetColWidth("Sheet1", "C", "C", 15) // 费用 (元)
	f.SetColWidth("Sheet1", "D", "D", 15) // 输入 Tokens
	f.SetColWidth("Sheet1", "E", "E", 15) // 输出 Tokens
	f.SetColWidth("Sheet1", "F", "F", 15) // tokens 用量

	// 保存到缓冲区
	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, "", err
	}

	return buf.Bytes(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", nil
}

// GetBillingSummary 获取账单汇总信息
func GetBillingSummary(c *gin.Context) {
	var req struct {
		StartTime int64  `json:"start_time" binding:"required"`
		EndTime   int64  `json:"end_time" binding:"required"`
		Username  string `json:"username"` // 管理员查询指定用户
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "参数错误："+err.Error())
		return
	}

	userId := c.GetInt("id")
	userRole := c.GetInt("role")

	// 管理员可以查看所有用户数据或指定用户数据
	if userRole >= common.RoleAdminUser {
		if req.Username != "" {
			// 查询指定用户的数据
			user, err := model.GetUserByUsername(req.Username)
			if err != nil {
				common.ApiErrorMsg(c, "用户不存在")
				return
			}
			userId = user.Id
		} else {
			// 查询所有用户的数据
			userId = 0
		}
	}

	// 获取账单数据
	billingData, err := getBillingData(userId, req.StartTime, req.EndTime)
	if err != nil {
		common.ApiErrorMsg(c, "获取账单数据失败："+err.Error())
		return
	}

	// 计算汇总
	var totalTokens, totalQuota int
	var totalCost float64
	modelStats := make(map[string]struct {
		Tokens int
		Quota  int
		Cost   float64
	})

	for _, item := range billingData {
		totalTokens += item.TokenUsed
		totalQuota += item.QuotaUsed
		totalCost += item.Cost

		if stat, exists := modelStats[item.ModelName]; exists {
			stat.Tokens += item.TokenUsed
			stat.Quota += item.QuotaUsed
			stat.Cost += item.Cost
			modelStats[item.ModelName] = stat
		} else {
			modelStats[item.ModelName] = struct {
				Tokens int
				Quota  int
				Cost   float64
			}{
				Tokens: item.TokenUsed,
				Quota:  item.QuotaUsed,
				Cost:   item.Cost,
			}
		}
	}

	// 构建响应
	response := gin.H{
		"summary": gin.H{
			"total_tokens": totalTokens,
			"total_quota":  totalQuota,
			"total_cost":   totalCost,
			"start_date":   time.Unix(req.StartTime, 0).Format("2006-01-02"),
			"end_date":     time.Unix(req.EndTime, 0).Format("2006-01-02"),
		},
		"model_stats": modelStats,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "获取账单汇总成功",
		"data":    response,
	})
}
