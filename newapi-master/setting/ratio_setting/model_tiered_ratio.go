package ratio_setting

import (
	"errors"
	"fmt"
	"math"
	"one-api/common"
	"sort"
	"strings"
	"sync"
)

type TieredModelRatioRule struct {
	MaxInputTokens int     `json:"max_input_tokens"`
	InputRatio     float64 `json:"input_ratio"`
	OutputRatio    float64 `json:"output_ratio"`
}

var (
	modelTieredRatioMap      = map[string][]TieredModelRatioRule{}
	modelTieredRatioMapMutex sync.RWMutex
)

func ModelTieredRatio2JSONString() string {
	modelTieredRatioMapMutex.RLock()
	defer modelTieredRatioMapMutex.RUnlock()

	jsonBytes, err := common.Marshal(modelTieredRatioMap)
	if err != nil {
		common.SysError("error marshalling model tiered ratio: " + err.Error())
	}
	return string(jsonBytes)
}

func UpdateModelTieredRatioByJSONString(jsonStr string) error {
	normalized, err := parseAndNormalizeTieredModelRatioJSON(jsonStr)
	if err != nil {
		return err
	}

	modelTieredRatioMapMutex.Lock()
	defer modelTieredRatioMapMutex.Unlock()

	modelTieredRatioMap = normalized
	InvalidateExposedDataCache()
	return nil
}

func CheckModelTieredRatio(jsonStr string) error {
	_, err := parseAndNormalizeTieredModelRatioJSON(jsonStr)
	return err
}

func GetModelTieredRatioCopy() map[string][]TieredModelRatioRule {
	modelTieredRatioMapMutex.RLock()
	defer modelTieredRatioMapMutex.RUnlock()

	return cloneTieredRatioMap(modelTieredRatioMap)
}

func MatchTieredModelRatio(name string, inputTokens int) (TieredModelRatioRule, bool) {
	rules, ok := getTieredRulesByModelName(name)
	if !ok || len(rules) == 0 {
		return TieredModelRatioRule{}, false
	}

	if inputTokens < 0 {
		inputTokens = 0
	}
	for _, rule := range rules {
		if rule.MaxInputTokens <= 0 || inputTokens <= rule.MaxInputTokens {
			return rule, true
		}
	}
	return rules[len(rules)-1], true
}

func GetModelTieredMaxRatio(name string) (float64, float64, bool) {
	rules, ok := getTieredRulesByModelName(name)
	if !ok || len(rules) == 0 {
		return 0, 0, false
	}
	highestTier := rules[len(rules)-1]
	return highestTier.InputRatio, highestTier.OutputRatio, true
}

func getTieredRulesByModelName(name string) ([]TieredModelRatioRule, bool) {
	modelTieredRatioMapMutex.RLock()
	defer modelTieredRatioMapMutex.RUnlock()

	if rules, ok := modelTieredRatioMap[name]; ok {
		return cloneTieredRatioRules(rules), true
	}
	formattedName := FormatMatchingModelName(name)
	if rules, ok := modelTieredRatioMap[formattedName]; ok {
		return cloneTieredRatioRules(rules), true
	}
	return nil, false
}

func parseAndNormalizeTieredModelRatioJSON(jsonStr string) (map[string][]TieredModelRatioRule, error) {
	if strings.TrimSpace(jsonStr) == "" {
		jsonStr = "{}"
	}

	raw := make(map[string][]TieredModelRatioRule)
	if err := common.Unmarshal([]byte(jsonStr), &raw); err != nil {
		return nil, fmt.Errorf("invalid tiered model ratio json: %w", err)
	}

	normalized := make(map[string][]TieredModelRatioRule, len(raw))
	for modelName, rules := range raw {
		modelName = strings.TrimSpace(modelName)
		if modelName == "" {
			return nil, errors.New("model name cannot be empty in tiered model ratio")
		}
		if len(rules) == 0 {
			return nil, fmt.Errorf("tiered model ratio for model %s cannot be empty", modelName)
		}
		normalizedRules, err := normalizeTieredRules(modelName, rules)
		if err != nil {
			return nil, err
		}
		normalized[modelName] = normalizedRules
	}
	return normalized, nil
}

func normalizeTieredRules(modelName string, rules []TieredModelRatioRule) ([]TieredModelRatioRule, error) {
	normalized := cloneTieredRatioRules(rules)

	for i := range normalized {
		if normalized[i].InputRatio <= 0 {
			return nil, fmt.Errorf("model %s tier #%d input_ratio must be greater than 0", modelName, i+1)
		}
		if normalized[i].OutputRatio < 0 {
			return nil, fmt.Errorf("model %s tier #%d output_ratio must be greater than or equal to 0", modelName, i+1)
		}
	}

	sort.SliceStable(normalized, func(i, j int) bool {
		return getTierUpperBound(normalized[i]) < getTierUpperBound(normalized[j])
	})

	lastBound := -1
	for i, rule := range normalized {
		current := getTierUpperBound(rule)
		if current <= lastBound {
			return nil, fmt.Errorf("model %s tier upper bounds must be strictly increasing", modelName)
		}
		lastBound = current

		if current == math.MaxInt && i != len(normalized)-1 {
			return nil, fmt.Errorf("model %s unlimited tier must be the last tier", modelName)
		}
	}

	return normalized, nil
}

func getTierUpperBound(rule TieredModelRatioRule) int {
	if rule.MaxInputTokens <= 0 {
		return math.MaxInt
	}
	return rule.MaxInputTokens
}

func cloneTieredRatioRules(rules []TieredModelRatioRule) []TieredModelRatioRule {
	cp := make([]TieredModelRatioRule, len(rules))
	copy(cp, rules)
	return cp
}

func cloneTieredRatioMap(input map[string][]TieredModelRatioRule) map[string][]TieredModelRatioRule {
	cp := make(map[string][]TieredModelRatioRule, len(input))
	for modelName, rules := range input {
		cp[modelName] = cloneTieredRatioRules(rules)
	}
	return cp
}

func TieredRuleUpperBoundText(maxInputTokens int) string {
	if maxInputTokens <= 0 {
		return "∞"
	}
	return fmt.Sprintf("%d", maxInputTokens)
}
