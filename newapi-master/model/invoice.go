package model

import (
	"one-api/common"
)

type Invoice struct {
	Id          int     `json:"id" gorm:"primaryKey"`
	UserId      int     `json:"user_id" gorm:"not null"`
	User        User    `json:"user" gorm:"foreignKey:UserId"`
	Amount      float64 `json:"amount" gorm:"not null"` // 发票金额（元）
	Title       string  `json:"title" gorm:"not null"`  // 发票抬头
	TaxNumber   string  `json:"tax_number"`             // 税号
	Email       string  `json:"email" gorm:"not null"`  // 接收邮箱
	Content     string  `json:"content"`                // 发票内容
	Status      int     `json:"status" gorm:"default:0"` // 0:待处理 1:已开票 2:已拒绝
	Remark      string  `json:"remark"`                 // 备注
	CreatedTime int64   `json:"created_time"`
	UpdatedTime int64   `json:"updated_time"`
}

const (
	InvoiceStatusPending = 0 // 待处理
	InvoiceStatusIssued  = 1 // 已开票
	InvoiceStatusRejected = 2 // 已拒绝
)

func (invoice *Invoice) Insert() error {
	invoice.CreatedTime = common.GetTimestamp()
	invoice.UpdatedTime = common.GetTimestamp()
	return DB.Create(invoice).Error
}

func (invoice *Invoice) Update() error {
	invoice.UpdatedTime = common.GetTimestamp()
	return DB.Save(invoice).Error
}

func GetInvoiceById(id int) (*Invoice, error) {
	var invoice Invoice
	err := DB.Preload("User").Where("id = ?", id).First(&invoice).Error
	return &invoice, err
}

func GetInvoicesByUserId(userId int, pageInfo common.PageInfo) ([]*Invoice, int64, error) {
	var invoices []*Invoice
	var total int64

	query := DB.Model(&Invoice{}).Where("user_id = ?", userId)
	
	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页查询
	offset := (pageInfo.Page - 1) * pageInfo.PageSize
	err := query.Preload("User").
		Order("created_time DESC").
		Offset(offset).
		Limit(pageInfo.PageSize).
		Find(&invoices).Error

	return invoices, total, err
}

func GetAllInvoices(pageInfo common.PageInfo, status int) ([]*Invoice, int64, error) {
	var invoices []*Invoice
	var total int64

	query := DB.Model(&Invoice{})
	
	// 如果指定了状态，则按状态筛选
	if status >= 0 {
		query = query.Where("status = ?", status)
	}
	
	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页查询
	offset := (pageInfo.Page - 1) * pageInfo.PageSize
	err := query.Preload("User").
		Order("created_time DESC").
		Offset(offset).
		Limit(pageInfo.PageSize).
		Find(&invoices).Error

	return invoices, total, err
}

func UpdateInvoiceStatus(id int, status int, remark string) error {
	return DB.Model(&Invoice{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":       status,
		"remark":       remark,
		"updated_time": common.GetTimestamp(),
	}).Error
}

func GetInvoiceStats() (map[string]int64, error) {
	stats := make(map[string]int64)
	
	// 待处理
	var pending int64
	if err := DB.Model(&Invoice{}).Where("status = ?", InvoiceStatusPending).Count(&pending).Error; err != nil {
		return nil, err
	}
	stats["pending"] = pending
	
	// 已开票
	var issued int64
	if err := DB.Model(&Invoice{}).Where("status = ?", InvoiceStatusIssued).Count(&issued).Error; err != nil {
		return nil, err
	}
	stats["issued"] = issued
	
	// 已拒绝
	var rejected int64
	if err := DB.Model(&Invoice{}).Where("status = ?", InvoiceStatusRejected).Count(&rejected).Error; err != nil {
		return nil, err
	}
	stats["rejected"] = rejected
	
	// 总计
	var total int64
	if err := DB.Model(&Invoice{}).Count(&total).Error; err != nil {
		return nil, err
	}
	stats["total"] = total
	
	return stats, nil
}
