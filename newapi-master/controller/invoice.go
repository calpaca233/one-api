package controller

import (
	"net/http"
	"one-api/common"
	"one-api/dto"
	"one-api/model"
	"strconv"

	"github.com/gin-gonic/gin"
)

// 用户申请发票
func CreateInvoice(c *gin.Context) {
	var req dto.InvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	// 获取当前用户ID
	userId := c.GetInt("id")
	if userId == 0 {
		common.ApiErrorMsg(c, "用户未登录")
		return
	}

	// 检查用户是否存在
	var user model.User
	if err := model.DB.Where("id = ?", userId).First(&user).Error; err != nil {
		common.ApiErrorMsg(c, "用户不存在")
		return
	}

	// 解析金额
	amount, err := strconv.ParseFloat(req.Amount, 64)
	if err != nil {
		common.ApiErrorMsg(c, "金额格式不正确")
		return
	}
	
	if amount <= 0 {
		common.ApiErrorMsg(c, "金额必须大于0")
		return
	}

	// 创建发票申请
	invoice := &model.Invoice{
		UserId:    userId,
		Amount:    amount,
		Title:     req.Title,
		TaxNumber: req.TaxNumber,
		Email:     req.Email,
		Content:   req.Content,
		Status:    model.InvoiceStatusPending,
	}

	if err := invoice.Insert(); err != nil {
		common.ApiErrorMsg(c, "创建发票申请失败: "+err.Error())
		return
	}

	// 记录日志
	model.RecordLog(userId, model.LogTypeSystem, "申请发票，金额: "+strconv.FormatFloat(amount, 'f', 2, 64)+"元")

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "发票申请提交成功，请等待处理",
		"data":    convertToInvoiceResponse(invoice, &user),
	})
}

// 获取用户的发票申请列表
func GetUserInvoices(c *gin.Context) {
	userId := c.GetInt("id")
	if userId == 0 {
		common.ApiErrorMsg(c, "用户未登录")
		return
	}

	pageInfo := common.GetPageQuery(c)
	invoices, total, err := model.GetInvoicesByUserId(userId, *pageInfo)
	if err != nil {
		common.ApiErrorMsg(c, "获取发票列表失败: "+err.Error())
		return
	}

	var responses []*dto.InvoiceResponse
	for _, invoice := range invoices {
		responses = append(responses, convertToInvoiceResponse(invoice, &invoice.User))
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": dto.InvoiceListResponse{
			Invoices: responses,
			Total:    total,
			Page:     pageInfo.Page,
			Size:     pageInfo.PageSize,
		},
	})
}

// 管理员获取所有发票申请
func GetAllInvoices(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	statusStr := c.Query("status")
	
	status := -1
	if statusStr != "" {
		if s, err := strconv.Atoi(statusStr); err == nil {
			status = s
		}
	}

	invoices, total, err := model.GetAllInvoices(*pageInfo, status)
	if err != nil {
		common.ApiErrorMsg(c, "获取发票列表失败: "+err.Error())
		return
	}

	var responses []*dto.InvoiceResponse
	for _, invoice := range invoices {
		responses = append(responses, convertToInvoiceResponse(invoice, &invoice.User))
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": dto.InvoiceListResponse{
			Invoices: responses,
			Total:    total,
			Page:     pageInfo.Page,
			Size:     pageInfo.PageSize,
		},
	})
}

// 管理员更新发票状态
func UpdateInvoiceStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		common.ApiErrorMsg(c, "无效的发票ID")
		return
	}

	var req dto.InvoiceStatusUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	// 检查发票是否存在
	_, err = model.GetInvoiceById(id)
	if err != nil {
		common.ApiErrorMsg(c, "发票不存在")
		return
	}

	// 更新状态
	if err := model.UpdateInvoiceStatus(id, req.Status, req.Remark); err != nil {
		common.ApiErrorMsg(c, "更新发票状态失败: "+err.Error())
		return
	}

	// 记录日志
	statusText := "已开票"
	if req.Status == model.InvoiceStatusRejected {
		statusText = "已拒绝"
	}
	model.RecordLog(0, model.LogTypeSystem, "更新发票状态: ID="+strconv.Itoa(id)+", 状态="+statusText)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "发票状态更新成功",
	})
}

// 获取发票统计信息
func GetInvoiceStats(c *gin.Context) {
	stats, err := model.GetInvoiceStats()
	if err != nil {
		common.ApiErrorMsg(c, "获取发票统计失败: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": dto.InvoiceStatsResponse{
			Pending:  stats["pending"],
			Issued:   stats["issued"],
			Rejected: stats["rejected"],
			Total:    stats["total"],
		},
	})
}

// 获取发票详情
func GetInvoiceDetail(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		common.ApiErrorMsg(c, "无效的发票ID")
		return
	}

	invoice, err := model.GetInvoiceById(id)
	if err != nil {
		common.ApiErrorMsg(c, "发票不存在")
		return
	}

	// 检查权限：用户只能查看自己的发票，管理员可以查看所有
	userId := c.GetInt("id")
	userRole := c.GetInt("role")
	if userId != invoice.UserId && userRole < common.RoleAdminUser {
		common.ApiErrorMsg(c, "无权查看此发票")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    convertToInvoiceResponse(invoice, &invoice.User),
	})
}

// 转换发票模型为响应DTO
func convertToInvoiceResponse(invoice *model.Invoice, user *model.User) *dto.InvoiceResponse {
	return &dto.InvoiceResponse{
		Id:          invoice.Id,
		UserId:      invoice.UserId,
		Amount:      invoice.Amount,
		Title:       invoice.Title,
		TaxNumber:   invoice.TaxNumber,
		Email:       invoice.Email,
		Content:     invoice.Content,
		Status:      invoice.Status,
		Remark:      invoice.Remark,
		CreatedTime: invoice.CreatedTime,
		UpdatedTime: invoice.UpdatedTime,
		User: struct {
			Id          int    `json:"id"`
			Username    string `json:"username"`
			DisplayName string `json:"display_name"`
			Email       string `json:"email"`
		}{
			Id:          user.Id,
			Username:    user.Username,
			DisplayName: user.DisplayName,
			Email:       user.Email,
		},
	}
}
