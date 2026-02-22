package setting

import (
	"fmt"
	"one-api/common"
	"strings"
	"sync"
)

var (
	tapnowManagedModels      = make([]map[string]any, 0)
	tapnowManagedModelsMutex sync.RWMutex
)

var tapnowVideoModelHints = []string{
	"video", "sora", "veo", "kling", "wan", "runway", "pika", "hunyuan", "luma",
}

var tapnowImageModelHints = []string{
	"image", "img", "midjourney", "mj", "nano", "jimeng", "dall", "sd", "flux", "seedream", "kolors", "recraft", "ideogram",
}

func TapnowManagedModels2JSONString() string {
	tapnowManagedModelsMutex.RLock()
	defer tapnowManagedModelsMutex.RUnlock()

	jsonBytes, err := common.Marshal(tapnowManagedModels)
	if err != nil {
		common.SysError("error marshalling tapnow managed models: " + err.Error())
		return "[]"
	}
	return string(jsonBytes)
}

func GetTapnowManagedModelsCopy() []map[string]any {
	tapnowManagedModelsMutex.RLock()
	defer tapnowManagedModelsMutex.RUnlock()
	return cloneTapnowManagedModels(tapnowManagedModels)
}

func UpdateTapnowManagedModelsByJSONString(jsonStr string) error {
	normalized, err := parseAndNormalizeTapnowManagedModelsJSON(jsonStr)
	if err != nil {
		return err
	}

	tapnowManagedModelsMutex.Lock()
	defer tapnowManagedModelsMutex.Unlock()
	tapnowManagedModels = normalized
	return nil
}

func CheckTapnowManagedModels(jsonStr string) error {
	_, err := parseAndNormalizeTapnowManagedModelsJSON(jsonStr)
	return err
}

func parseAndNormalizeTapnowManagedModelsJSON(jsonStr string) ([]map[string]any, error) {
	if strings.TrimSpace(jsonStr) == "" {
		jsonStr = "[]"
	}

	raw := make([]map[string]any, 0)
	if err := common.Unmarshal([]byte(jsonStr), &raw); err != nil {
		return nil, fmt.Errorf("invalid tapnow managed models json: %w", err)
	}

	normalized := make([]map[string]any, 0, len(raw))
	modelIDSet := make(map[string]struct{})

	for index, item := range raw {
		if item == nil {
			return nil, fmt.Errorf("tapnow model #%d cannot be empty", index+1)
		}

		normalizedItem := make(map[string]any, len(item)+3)
		for key, value := range item {
			normalizedItem[key] = value
		}

		modelID := strings.TrimSpace(anyToString(normalizedItem["id"]))
		if modelID == "" {
			return nil, fmt.Errorf("tapnow model #%d id cannot be empty", index+1)
		}
		modelKey := strings.ToLower(modelID)
		if _, exists := modelIDSet[modelKey]; exists {
			return nil, fmt.Errorf("tapnow model id %s duplicated", modelID)
		}
		modelIDSet[modelKey] = struct{}{}
		normalizedItem["id"] = modelID

		modelType := normalizeTapnowModelType(anyToString(normalizedItem["type"]), modelID)
		normalizedItem["type"] = modelType

		provider := strings.TrimSpace(anyToString(normalizedItem["provider"]))
		if provider == "" {
			provider = "magicore"
		}
		normalizedItem["provider"] = provider

		if rawDurations, ok := normalizedItem["durations"]; ok {
			durations, err := normalizeTapnowModelDurations(rawDurations)
			if err != nil {
				return nil, fmt.Errorf("tapnow model %s durations invalid: %w", modelID, err)
			}
			if len(durations) > 0 {
				normalizedItem["durations"] = durations
			} else {
				delete(normalizedItem, "durations")
			}
		}
		if modelType == "Video" {
			if _, ok := normalizedItem["durations"]; !ok {
				normalizedItem["durations"] = inferTapnowManagedDurations(modelID)
			}
		} else {
			delete(normalizedItem, "durations")
		}

		normalized = append(normalized, normalizedItem)
	}

	return normalized, nil
}

func normalizeTapnowModelType(rawType, modelID string) string {
	normalized := strings.ToLower(strings.TrimSpace(rawType))
	switch normalized {
	case "chat", "text", "llm":
		return "Chat"
	case "image", "img":
		return "Image"
	case "video", "vid":
		return "Video"
	}
	return inferTapnowManagedModelType(modelID)
}

func inferTapnowManagedModelType(modelID string) string {
	normalized := strings.ToLower(strings.TrimSpace(modelID))
	if normalized == "" {
		return "Chat"
	}
	for _, hint := range tapnowVideoModelHints {
		if strings.Contains(normalized, hint) {
			return "Video"
		}
	}
	for _, hint := range tapnowImageModelHints {
		if strings.Contains(normalized, hint) {
			return "Image"
		}
	}
	return "Chat"
}

func inferTapnowManagedDurations(modelID string) []string {
	normalized := strings.ToLower(strings.TrimSpace(modelID))
	if strings.Contains(normalized, "sora-2-pro") {
		return []string{"15s", "25s"}
	}
	if strings.Contains(normalized, "sora-2") {
		return []string{"5s", "10s"}
	}
	if strings.Contains(normalized, "veo") || strings.Contains(normalized, "kling") {
		return []string{"8s"}
	}
	return []string{"5s", "10s"}
}

func normalizeTapnowModelDurations(raw any) ([]string, error) {
	var values []any
	switch typed := raw.(type) {
	case []any:
		values = typed
	case []string:
		values = make([]any, 0, len(typed))
		for _, v := range typed {
			values = append(values, v)
		}
	default:
		return nil, fmt.Errorf("durations must be an array")
	}

	result := make([]string, 0, len(values))
	seen := make(map[string]struct{})
	for _, value := range values {
		text := strings.TrimSpace(anyToString(value))
		if text == "" {
			continue
		}
		if isDigitsOnly(text) {
			text = text + "s"
		}
		key := strings.ToLower(text)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, text)
	}
	return result, nil
}

func isDigitsOnly(text string) bool {
	if text == "" {
		return false
	}
	for _, ch := range text {
		if ch < '0' || ch > '9' {
			return false
		}
	}
	return true
}

func anyToString(value any) string {
	switch typed := value.(type) {
	case nil:
		return ""
	case string:
		return typed
	default:
		return fmt.Sprintf("%v", typed)
	}
}

func cloneTapnowManagedModels(input []map[string]any) []map[string]any {
	if len(input) == 0 {
		return []map[string]any{}
	}
	jsonBytes, err := common.Marshal(input)
	if err != nil {
		common.SysError("error cloning tapnow managed models: " + err.Error())
		return []map[string]any{}
	}
	var cloned []map[string]any
	if err = common.Unmarshal(jsonBytes, &cloned); err != nil {
		common.SysError("error cloning tapnow managed models: " + err.Error())
		return []map[string]any{}
	}
	return cloned
}
