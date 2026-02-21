package controller

import (
	"fmt"
	"one-api/common"
	"one-api/model"
	"one-api/setting"
	"one-api/setting/ratio_setting"

	"github.com/gin-gonic/gin"
)

func GetPricing(c *gin.Context) {
	pricing := model.GetPricing()
	userId, exists := c.Get("id")
	usableGroup := map[string]string{}
	groupRatio := map[string]float64{}
	for s, f := range ratio_setting.GetGroupRatioCopy() {
		groupRatio[s] = f
	}
	var group string
	var userIdInt int
	if exists {
		userIdInt = userId.(int)
		user, err := model.GetUserCache(userIdInt)
		if err == nil {
			group = user.Group
			for g := range groupRatio {
				ratio, ok := ratio_setting.GetGroupGroupRatio(group, g)
				if ok {
					groupRatio[g] = ratio
				}
			}
		}
	}

	usableGroup = setting.GetUserUsableGroups(group)
	
	// 应用用户模型专属倍率
	if exists && userIdInt > 0 {
		// 为每个模型检查是否有用户专属倍率
		for i, p := range pricing {
			if userModelRatio, hasUserModelRatio := model.GetUserModelRatio(userIdInt, p.ModelName); hasUserModelRatio {
				common.SysLog(fmt.Sprintf("Found user model ratio for user %d, model %s: %f", userIdInt, p.ModelName, userModelRatio))
				// 找到对应的分组并应用用户专属倍率
				if modelGroup, ok := usableGroup[p.ModelName]; ok {
					// 直接覆盖该模型所在分组的倍率
					groupRatio[modelGroup] = userModelRatio
					common.SysLog(fmt.Sprintf("Applied user model ratio to group %s: %f", modelGroup, userModelRatio))
				} else {
					// 如果模型没有分组，创建一个临时分组
					tempGroup := "user_model_" + p.ModelName
					groupRatio[tempGroup] = userModelRatio
					// 更新pricing中的分组信息
					pricing[i].EnableGroup = []string{tempGroup}
					common.SysLog(fmt.Sprintf("Created temp group %s with ratio %f", tempGroup, userModelRatio))
				}
			}
		}
	}
	// check groupRatio contains usableGroup
	for group := range ratio_setting.GetGroupRatioCopy() {
		if _, ok := usableGroup[group]; !ok {
			delete(groupRatio, group)
		}
	}

	c.JSON(200, gin.H{
		"success":            true,
		"data":               pricing,
		"vendors":            model.GetVendors(),
		"group_ratio":        groupRatio,
		"usable_group":       usableGroup,
		"supported_endpoint": model.GetSupportedEndpointMap(),
		"auto_groups":        setting.AutoGroups,
	})
}

func ResetModelRatio(c *gin.Context) {
	defaultStr := ratio_setting.DefaultModelRatio2JSONString()
	err := model.UpdateOption("ModelRatio", defaultStr)
	if err != nil {
		c.JSON(200, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	err = ratio_setting.UpdateModelRatioByJSONString(defaultStr)
	if err != nil {
		c.JSON(200, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
		"message": "重置模型倍率成功",
	})
}
