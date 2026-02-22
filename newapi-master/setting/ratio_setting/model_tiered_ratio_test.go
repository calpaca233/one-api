package ratio_setting

import "testing"

func TestUpdateAndMatchTieredModelRatio(t *testing.T) {
	defer func() {
		_ = UpdateModelTieredRatioByJSONString("{}")
	}()

	config := `{
		"qwen-plus": [
			{"max_input_tokens": 128000, "input_ratio": 1.6, "output_ratio": 4.8},
			{"max_input_tokens": 32000, "input_ratio": 1.2, "output_ratio": 3.6},
			{"max_input_tokens": 0, "input_ratio": 2.0, "output_ratio": 6.0}
		]
	}`

	if err := UpdateModelTieredRatioByJSONString(config); err != nil {
		t.Fatalf("update tiered ratio failed: %v", err)
	}

	rule, ok := MatchTieredModelRatio("qwen-plus", 1000)
	if !ok {
		t.Fatalf("expected to match tier rule")
	}
	if rule.MaxInputTokens != 32000 || rule.InputRatio != 1.2 || rule.OutputRatio != 3.6 {
		t.Fatalf("unexpected matched rule for low tokens: %+v", rule)
	}

	rule, ok = MatchTieredModelRatio("qwen-plus", 64000)
	if !ok {
		t.Fatalf("expected to match tier rule")
	}
	if rule.MaxInputTokens != 128000 || rule.InputRatio != 1.6 || rule.OutputRatio != 4.8 {
		t.Fatalf("unexpected matched rule for middle tokens: %+v", rule)
	}

	rule, ok = MatchTieredModelRatio("qwen-plus", 999999)
	if !ok {
		t.Fatalf("expected to match tier rule")
	}
	if rule.MaxInputTokens != 0 || rule.InputRatio != 2.0 || rule.OutputRatio != 6.0 {
		t.Fatalf("unexpected matched rule for high tokens: %+v", rule)
	}
}

func TestCheckTieredModelRatioInvalid(t *testing.T) {
	invalidConfig := `{
		"qwen-plus": [
			{"max_input_tokens": 1000, "input_ratio": 1.2, "output_ratio": 3.6},
			{"max_input_tokens": 1000, "input_ratio": 1.6, "output_ratio": 4.8}
		]
	}`
	if err := CheckModelTieredRatio(invalidConfig); err == nil {
		t.Fatalf("expected error for duplicated upper bounds")
	}
}

func TestGetModelTieredMaxRatio(t *testing.T) {
	defer func() {
		_ = UpdateModelTieredRatioByJSONString("{}")
	}()

	config := `{
		"qwen-plus": [
			{"max_input_tokens": 32000, "input_ratio": 1.2, "output_ratio": 3.6},
			{"max_input_tokens": 128000, "input_ratio": 1.8, "output_ratio": 7.8},
			{"max_input_tokens": 0, "input_ratio": 2.0, "output_ratio": 6.5}
		]
	}`
	if err := UpdateModelTieredRatioByJSONString(config); err != nil {
		t.Fatalf("update tiered ratio failed: %v", err)
	}

	maxIn, maxOut, ok := GetModelTieredMaxRatio("qwen-plus")
	if !ok {
		t.Fatalf("expected max ratio to exist")
	}
	if maxIn != 2.0 || maxOut != 6.5 {
		t.Fatalf("unexpected max ratios, input=%f output=%f", maxIn, maxOut)
	}
}
