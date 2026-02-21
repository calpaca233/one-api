package dto

type InvoiceRequest struct {
	Amount    string `json:"amount" binding:"required"`           // 发票金额（元）
	Title     string `json:"title" binding:"required,min=1,max=100"`  // 发票抬头
	TaxNumber string `json:"tax_number" binding:"max=50"`        // 税号
	Email     string `json:"email" binding:"required,email"`     // 接收邮箱
	Content   string `json:"content" binding:"max=200"`          // 发票内容
}

type InvoiceResponse struct {
	Id          int     `json:"id"`
	UserId      int     `json:"user_id"`
	Amount      float64 `json:"amount"`
	Title       string  `json:"title"`
	TaxNumber   string  `json:"tax_number"`
	Email       string  `json:"email"`
	Content     string  `json:"content"`
	Status      int     `json:"status"`
	Remark      string  `json:"remark"`
	CreatedTime int64   `json:"created_time"`
	UpdatedTime int64   `json:"updated_time"`
	User        struct {
		Id          int    `json:"id"`
		Username    string `json:"username"`
		DisplayName string `json:"display_name"`
		Email       string `json:"email"`
	} `json:"user"`
}

type InvoiceStatusUpdateRequest struct {
	Status int    `json:"status" binding:"required,oneof=1 2"` // 1:已开票 2:已拒绝
	Remark string `json:"remark"`                             // 备注
}

type InvoiceListResponse struct {
	Invoices []*InvoiceResponse `json:"invoices"`
	Total    int64              `json:"total"`
	Page     int                `json:"page"`
	Size     int                `json:"size"`
}

type InvoiceStatsResponse struct {
	Pending  int64 `json:"pending"`  // 待处理
	Issued   int64 `json:"issued"`   // 已开票
	Rejected int64 `json:"rejected"` // 已拒绝
	Total    int64 `json:"total"`    // 总计
}
