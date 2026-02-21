package controller

import (
	"encoding/json"
	"errors"
	"net/http"
	"one-api/common"
	"one-api/model"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetUserModelRatios 获取用户模型倍率列表
func GetUserModelRatios(c *gin.Context) {
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("page_size", "20")
	// keyword := c.DefaultQuery("keyword", "")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page <= 0 {
		page = 1
	}
	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil || pageSize <= 0 {
		pageSize = 20
	}

	pageInfo := &common.PageInfo{
		Page:     page,
		PageSize: pageSize,
	}
	umrs, total, err := model.GetAllUserModelRatios(pageInfo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "获取用户模型倍率失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    umrs,
		"total":   total,
	})
}

// SetUserModelRatio 设置用户模型倍率
func SetUserModelRatio(c *gin.Context) {
	var umr model.UserModelRatio
	if err := c.ShouldBindJSON(&umr); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	if umr.UserId == 0 || umr.ModelName == "" || umr.Ratio <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "用户ID、模型名称和倍率不能为空且倍率必须大于0",
		})
		return
	}

	// 检查是否存在
	var existingUmr model.UserModelRatio
	err := model.DB.Where("user_id = ? AND model_name = ?", umr.UserId, umr.ModelName).First(&existingUmr).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 不存在则创建
			err = umr.Insert()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"message": "创建用户模型倍率失败: " + err.Error(),
				})
				return
			}
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "用户模型倍率创建成功",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "查询用户模型倍率失败: " + err.Error(),
			})
		}
		return
	}

	// 存在则更新
	existingUmr.Ratio = umr.Ratio
	existingUmr.Remark = umr.Remark
	err = existingUmr.Update()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "更新用户模型倍率失败: " + err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "用户模型倍率更新成功",
	})
}

type BatchSetUserModelRatioRequest struct {
	UserId      int                `json:"user_id"`
	ModelRatios map[string]float64 `json:"model_ratios"`
}

// BatchSetUserModelRatio 批量设置用户模型倍率
func BatchSetUserModelRatio(c *gin.Context) {
	var req BatchSetUserModelRatioRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	if req.UserId == 0 || len(req.ModelRatios) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "用户ID和模型倍率配置不能为空",
		})
		return
	}

	for modelName, ratio := range req.ModelRatios {
		if ratio <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "模型 " + modelName + " 的倍率必须大于0",
			})
			return
		}
	}

	err := model.BatchSetUserModelRatio(req.UserId, req.ModelRatios)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "批量设置用户模型倍率失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "批量设置用户模型倍率成功",
	})
}

// DeleteUserModelRatio 删除用户模型倍率
func DeleteUserModelRatio(c *gin.Context) {
	userIdStr := c.Param("user_id")
	modelName := c.Param("model_name")

	userId, err := strconv.Atoi(userIdStr)
	if err != nil || userId == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "用户ID格式错误",
		})
		return
	}

	err = model.DeleteUserModelRatio(userId, modelName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "删除用户模型倍率失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "用户模型倍率删除成功",
	})
}

// DeleteUserAllModelRatios 删除用户所有模型倍率
func DeleteUserAllModelRatios(c *gin.Context) {
	userIdStr := c.Param("user_id")

	userId, err := strconv.Atoi(userIdStr)
	if err != nil || userId == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "用户ID格式错误",
		})
		return
	}

	err = model.DeleteUserAllModelRatios(userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "删除用户所有模型倍率失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "用户所有模型倍率删除成功",
	})
}

// DeleteUserModelRatioPost 通过 POST 删除用户模型倍率
func DeleteUserModelRatioPost(c *gin.Context) {
	type deleteRequest struct {
		UserId    int    `json:"user_id"`
		ModelName string `json:"model_name"`
 	}

    var req deleteRequest
    if err := c.ShouldBindJSON(&req); err != nil || req.UserId == 0 || req.ModelName == "" {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "message": "请求参数错误",
        })
        return
    }

    if err := model.DeleteUserModelRatio(req.UserId, req.ModelName); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "success": false,
            "message": "删除用户模型倍率失败: " + err.Error(),
        })
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": "用户模型倍率删除成功",
    })
}

// GetUserModelRatioMap 获取用户模型倍率映射
func GetUserModelRatioMap(c *gin.Context) {
	userIdStr := c.Param("user_id")

	userId, err := strconv.Atoi(userIdStr)
	if err != nil || userId == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "用户ID格式错误",
		})
		return
	}

	ratioMap := model.GetUserModelRatioMap(userId)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    ratioMap,
	})
}

// ImportUserModelRatios 批量导入用户模型倍率
func ImportUserModelRatios(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "文件上传失败: " + err.Error(),
		})
		return
	}

	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "无法打开文件: " + err.Error(),
		})
		return
	}
	defer f.Close()

	var umrs []model.UserModelRatio
	if err := json.NewDecoder(f).Decode(&umrs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "JSON解析失败，请确保文件格式正确: " + err.Error(),
		})
		return
	}

	tx := model.DB.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "数据库事务开启失败: " + tx.Error.Error(),
		})
		return
	}
	defer tx.Rollback()

	for _, umr := range umrs {
		if umr.UserId == 0 || umr.ModelName == "" || umr.Ratio <= 0 {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "导入数据中存在无效记录（用户ID、模型名称或倍率无效）",
			})
			return
		}

		var existingUmr model.UserModelRatio
		err := tx.Where("user_id = ? AND model_name = ?", umr.UserId, umr.ModelName).First(&existingUmr).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				umr.CreatedTime = common.GetTimestamp()
				umr.UpdatedTime = common.GetTimestamp()
				if err := tx.Create(&umr).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{
						"success": false,
						"message": "导入失败，创建记录时出错: " + err.Error(),
					})
					return
				}
			} else {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"message": "导入失败，查询记录时出错: " + err.Error(),
				})
				return
			}
		} else {
			existingUmr.Ratio = umr.Ratio
			existingUmr.Remark = umr.Remark
			existingUmr.UpdatedTime = common.GetTimestamp()
			if err := tx.Model(&existingUmr).Where("user_id = ? AND model_name = ?", existingUmr.UserId, existingUmr.ModelName).Updates(existingUmr).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"message": "导入失败，更新记录时出错: " + err.Error(),
				})
				return
			}
		}
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "数据库事务提交失败: " + err.Error(),
		})
		return
	}

	// 刷新缓存 - 暂时注释掉，因为函数不存在
	// model.RefreshUserModelRatioCache()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "用户模型倍率导入成功",
	})
}

// ExportUserModelRatios 导出用户模型倍率
func ExportUserModelRatios(c *gin.Context) {
	var umrs []model.UserModelRatio
	err := model.DB.Find(&umrs).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "获取用户模型倍率失败: " + err.Error(),
		})
		return
	}

	c.Header("Content-Disposition", "attachment; filename=user_model_ratios.json")
	c.Header("Content-Type", "application/json")
	c.JSON(http.StatusOK, umrs)
}

// GetAvailableModels 获取可用模型列表
func GetAvailableModels(c *gin.Context) {
	models := model.GetEnabledModels() // 获取所有启用的模型
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    models,
	})
}
