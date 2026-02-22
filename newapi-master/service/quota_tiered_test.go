package service

import (
	"testing"

	"one-api/setting/ratio_setting"
)

func TestResolveTieredModelRatiosBoundaryAndWildcard(t *testing.T) {
	defer func() {
		_ = ratio_setting.UpdateModelTieredRatioByJSONString("{}")
	}()

	config := `{
		"gpt-4o-gizmo-*": [
			{"max_input_tokens": 128000, "input_ratio": 1.2, "output_ratio": 3.6},
			{"max_input_tokens": 0, "input_ratio": 2.0, "output_ratio": 6.0}
		]
	}`
	if err := ratio_setting.UpdateModelTieredRatioByJSONString(config); err != nil {
		t.Fatalf("failed to update tiered config: %v", err)
	}

	inputRatio, completionRatio, tier := resolveTieredModelRatios("gpt-4o-gizmo-abc", 128000, 1, 2)
	if tier == nil {
		t.Fatalf("expected tier rule for boundary input")
	}
	if inputRatio != 1.2 || completionRatio != 3.0 {
		t.Fatalf("unexpected boundary tier ratios: input=%f completion=%f", inputRatio, completionRatio)
	}

	inputRatio, completionRatio, tier = resolveTieredModelRatios("gpt-4o-gizmo-abc", 128001, 1, 2)
	if tier == nil {
		t.Fatalf("expected tier rule for second tier input")
	}
	if inputRatio != 2.0 || completionRatio != 3.0 {
		t.Fatalf("unexpected second tier ratios: input=%f completion=%f", inputRatio, completionRatio)
	}
}

func TestCalculateAudioQuotaWithTieredEquivalentRatios(t *testing.T) {
	// input_ratio=2.0, output_ratio=6.0 => model_ratio=2.0, completion_ratio=3.0
	quota := calculateAudioQuota(QuotaInfo{
		InputDetails: TokenDetails{
			TextTokens: 1000,
		},
		OutputDetails: TokenDetails{
			TextTokens: 500,
		},
		ModelName:       "qwen-plus",
		UsePrice:        false,
		ModelRatio:      2.0,
		CompletionRatio: 3.0,
		GroupRatio:      1.0,
	})
	if quota != 5000 {
		t.Fatalf("unexpected quota=%d, expected=5000", quota)
	}

	quotaWithGroup := calculateAudioQuota(QuotaInfo{
		InputDetails: TokenDetails{
			TextTokens: 1000,
		},
		OutputDetails: TokenDetails{
			TextTokens: 500,
		},
		ModelName:       "qwen-plus",
		UsePrice:        false,
		ModelRatio:      2.0,
		CompletionRatio: 3.0,
		GroupRatio:      1.5,
	})
	if quotaWithGroup != 7500 {
		t.Fatalf("unexpected quota with group=%d, expected=7500", quotaWithGroup)
	}
}
