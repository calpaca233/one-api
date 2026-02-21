package model

import (
	"errors"
	"fmt"
	"one-api/common"
	"sync"

	"gorm.io/gorm"
)

// UserModelRatio 用户模型专属倍率表
type UserModelRatio struct {
	Id          int     `json:"id" gorm:"primaryKey"`
	UserId      int     `json:"user_id" gorm:"index"`
	ModelName   string  `json:"model_name" gorm:"index"`
	Ratio       float64 `json:"ratio" gorm:"default:1.0"`
	CreatedTime int64   `json:"created_time"`
	UpdatedTime int64   `json:"updated_time"`
	Remark      string  `json:"remark"`
}

// UserModelRatioCache 用户模型倍率缓存
var (
	userModelRatioCache      = make(map[int]map[string]float64) // userId -> modelName -> ratio
	userModelRatioCacheMutex sync.RWMutex
	userModelRatioCacheTime  int64
)

// TableName 指定表名
func (UserModelRatio) TableName() string {
	return "user_model_ratios"
}

// BeforeCreate 创建前的钩子，确保唯一性
func (umr *UserModelRatio) BeforeCreate(tx *gorm.DB) error {
	// 检查是否已存在相同的用户-模型组合
	var count int64
	err := tx.Model(&UserModelRatio{}).Where("user_id = ? AND model_name = ?", umr.UserId, umr.ModelName).Count(&count).Error
	if err != nil {
		return err
	}
	if count > 0 {
		return errors.New("用户模型倍率配置已存在")
	}
	return nil
}

// Insert 插入新的用户模型倍率记录
func (umr *UserModelRatio) Insert() error {
	now := common.GetTimestamp()
	umr.CreatedTime = now
	umr.UpdatedTime = now
	
	err := DB.Create(umr).Error
	if err != nil {
		return err
	}
	
	// 清除缓存
	clearUserModelRatioCache()
	return nil
}

// Update 更新用户模型倍率记录
func (umr *UserModelRatio) Update() error {
	umr.UpdatedTime = common.GetTimestamp()
	
	err := DB.Save(umr).Error
	if err != nil {
		return err
	}
	
	// 清除缓存
	clearUserModelRatioCache()
	return nil
}

// Delete 删除用户模型倍率记录
func (umr *UserModelRatio) Delete() error {
	err := DB.Delete(umr).Error
	if err != nil {
		return err
	}
	
	// 清除缓存
	clearUserModelRatioCache()
	return nil
}

// GetUserModelRatio 获取用户对特定模型的倍率
func GetUserModelRatio(userId int, modelName string) (float64, bool) {
	if userId <= 0 || modelName == "" {
		common.SysLog(fmt.Sprintf("GetUserModelRatio: invalid params, userId=%d, modelName=%s", userId, modelName))
		return 1.0, false
	}
	
	common.SysLog(fmt.Sprintf("GetUserModelRatio: checking user_id=%d, model=%s", userId, modelName))
	
	// 如果缓存为空，先加载缓存
	userModelRatioCacheMutex.RLock()
	cacheEmpty := len(userModelRatioCache) == 0
	userModelRatioCacheMutex.RUnlock()
	
	if cacheEmpty {
		common.SysLog("GetUserModelRatio: cache is empty, loading cache")
		loadUserModelRatioCache()
	}
	
	// 先从缓存获取
	userModelRatioCacheMutex.RLock()
	cacheTime := userModelRatioCacheTime
	if userRatios, ok := userModelRatioCache[userId]; ok {
		if ratio, exists := userRatios[modelName]; exists {
			userModelRatioCacheMutex.RUnlock()
			return ratio, true
		}
	}
	userModelRatioCacheMutex.RUnlock()
	
	// 如果缓存过期或不存在，重新加载
	if common.GetTimestamp()-cacheTime > 300 { // 5分钟缓存
		loadUserModelRatioCache()
		
		userModelRatioCacheMutex.RLock()
		if userRatios, ok := userModelRatioCache[userId]; ok {
			if ratio, exists := userRatios[modelName]; exists {
				userModelRatioCacheMutex.RUnlock()
				return ratio, true
			}
		}
		userModelRatioCacheMutex.RUnlock()
	}
	
	return 1.0, false
}

// GetUserModelRatios 获取用户的所有模型倍率
func GetUserModelRatios(userId int) ([]UserModelRatio, error) {
	if userId <= 0 {
		return nil, errors.New("用户ID无效")
	}
	
	var ratios []UserModelRatio
	err := DB.Where("user_id = ?", userId).Order("model_name").Find(&ratios).Error
	return ratios, err
}

// GetAllUserModelRatios 获取所有用户模型倍率（分页）
func GetAllUserModelRatios(pageInfo *common.PageInfo) ([]UserModelRatio, int64, error) {
	var ratios []UserModelRatio
	var total int64
	
	// 获取总数
	err := DB.Model(&UserModelRatio{}).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	
	// 获取分页数据
	err = DB.Order("user_id, model_name").
		Limit(pageInfo.GetPageSize()).
		Offset(pageInfo.GetStartIdx()).
		Find(&ratios).Error
	
	return ratios, total, err
}

// SearchUserModelRatios 搜索用户模型倍率
func SearchUserModelRatios(keyword string, startIdx int, num int) ([]UserModelRatio, int64, error) {
	var ratios []UserModelRatio
	var total int64
	
	query := DB.Model(&UserModelRatio{})
	
	if keyword != "" {
		// 尝试将关键字转换为用户ID
		if userId := common.String2Int(keyword); userId != 0 {
			query = query.Where("user_id = ? OR model_name LIKE ?", userId, "%"+keyword+"%")
		} else {
			query = query.Where("model_name LIKE ?", "%"+keyword+"%")
		}
	}
	
	// 获取总数
	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	
	// 获取分页数据
	err = query.Order("user_id, model_name").
		Limit(num).
		Offset(startIdx).
		Find(&ratios).Error
	
	return ratios, total, err
}

// BatchSetUserModelRatio 批量设置用户模型倍率
func BatchSetUserModelRatio(userId int, modelRatios map[string]float64) error {
	if userId <= 0 {
		return errors.New("用户ID无效")
	}
	
	if len(modelRatios) == 0 {
		return errors.New("模型倍率数据为空")
	}
	
	tx := DB.Begin()
	if tx.Error != nil {
		return tx.Error
	}
	defer tx.Rollback()
	
	now := common.GetTimestamp()
	
	for modelName, ratio := range modelRatios {
		if ratio <= 0 {
			return errors.New("倍率必须大于0")
		}
		
		var existingRatio UserModelRatio
		err := tx.Where("user_id = ? AND model_name = ?", userId, modelName).First(&existingRatio).Error
		
		if err == gorm.ErrRecordNotFound {
			// 创建新记录
			newRatio := UserModelRatio{
				UserId:      userId,
				ModelName:   modelName,
				Ratio:       ratio,
				CreatedTime: now,
				UpdatedTime: now,
			}
			if err := tx.Create(&newRatio).Error; err != nil {
				return err
			}
		} else if err != nil {
			return err
		} else {
			// 更新现有记录
			existingRatio.Ratio = ratio
			existingRatio.UpdatedTime = now
			if err := tx.Save(&existingRatio).Error; err != nil {
				return err
			}
		}
	}
	
	err := tx.Commit().Error
	if err != nil {
		return err
	}
	
	// 清除缓存
	clearUserModelRatioCache()
	return nil
}

// DeleteUserModelRatio 删除用户模型倍率
func DeleteUserModelRatio(userId int, modelName string) error {
	if userId <= 0 || modelName == "" {
		return errors.New("参数无效")
	}
	
	err := DB.Where("user_id = ? AND model_name = ?", userId, modelName).Delete(&UserModelRatio{}).Error
	if err != nil {
		return err
	}
	
	// 清除缓存
	clearUserModelRatioCache()
	return nil
}

// DeleteUserAllModelRatios 删除用户的所有模型倍率
func DeleteUserAllModelRatios(userId int) error {
	if userId <= 0 {
		return errors.New("用户ID无效")
	}
	
	err := DB.Where("user_id = ?", userId).Delete(&UserModelRatio{}).Error
	if err != nil {
		return err
	}
	
	// 清除缓存
	clearUserModelRatioCache()
	return nil
}

// 加载用户模型倍率缓存
func loadUserModelRatioCache() {
	if DB == nil {
		common.SysLog("DB is nil, cannot load user model ratio cache")
		return
	}
	
	// 检查表是否存在
	if !DB.Migrator().HasTable(&UserModelRatio{}) {
		common.SysLog("user_model_ratios table does not exist, skipping cache load")
		return
	}
	
	common.SysLog("开始加载用户模型倍率缓存...")
	
	var ratios []UserModelRatio
	err := DB.Find(&ratios).Error
	if err != nil {
		common.SysLog("failed to load user model ratio cache: " + err.Error())
		return
	}
	
	common.SysLog(fmt.Sprintf("loading user model ratio cache, found %d ratios", len(ratios)))
	
	userModelRatioCacheMutex.Lock()
	defer userModelRatioCacheMutex.Unlock()
	
	// 重建缓存
	userModelRatioCache = make(map[int]map[string]float64)
	for _, ratio := range ratios {
		if userModelRatioCache[ratio.UserId] == nil {
			userModelRatioCache[ratio.UserId] = make(map[string]float64)
		}
		userModelRatioCache[ratio.UserId][ratio.ModelName] = ratio.Ratio
	}
	
	userModelRatioCacheTime = common.GetTimestamp()
	common.SysLog("user model ratio cache loaded successfully")
}

// 清除用户模型倍率缓存
func clearUserModelRatioCache() {
	userModelRatioCacheMutex.Lock()
	defer userModelRatioCacheMutex.Unlock()
	
	userModelRatioCache = make(map[int]map[string]float64)
	userModelRatioCacheTime = 0
}

// GetUserModelRatioMap 获取用户的模型倍率映射（用于前端展示）
func GetUserModelRatioMap(userId int) map[string]float64 {
	ratios, err := GetUserModelRatios(userId)
	if err != nil {
		return make(map[string]float64)
	}
	
	result := make(map[string]float64)
	for _, ratio := range ratios {
		result[ratio.ModelName] = ratio.Ratio
	}
	
	return result
}
