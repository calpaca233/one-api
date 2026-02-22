package setting

import "testing"

func TestTapnowManagedModelsValidationAndNormalization(t *testing.T) {
	jsonStr := `[
		{"id":"sora-2","type":"video","durations":["5","10s"]},
		{"id":"qwen-plus","type":"chat"}
	]`

	if err := CheckTapnowManagedModels(jsonStr); err != nil {
		t.Fatalf("CheckTapnowManagedModels returned error: %v", err)
	}
	if err := UpdateTapnowManagedModelsByJSONString(jsonStr); err != nil {
		t.Fatalf("UpdateTapnowManagedModelsByJSONString returned error: %v", err)
	}

	models := GetTapnowManagedModelsCopy()
	if len(models) != 2 {
		t.Fatalf("expected 2 models, got %d", len(models))
	}

	if models[0]["id"] != "sora-2" {
		t.Fatalf("unexpected first model id: %v", models[0]["id"])
	}
	if models[0]["type"] != "Video" {
		t.Fatalf("unexpected first model type: %v", models[0]["type"])
	}
	if models[0]["provider"] != "magicore" {
		t.Fatalf("unexpected first model provider: %v", models[0]["provider"])
	}
	durations, ok := models[0]["durations"].([]any)
	if !ok || len(durations) != 2 {
		t.Fatalf("unexpected normalized durations: %#v", models[0]["durations"])
	}
	if durations[0] != "5s" || durations[1] != "10s" {
		t.Fatalf("unexpected durations value: %#v", durations)
	}
}

func TestTapnowManagedModelsInvalidCases(t *testing.T) {
	cases := []string{
		`{"id":"not-array"}`,
		`[{"id":""}]`,
		`[{"id":"dup"},{"id":"dup"}]`,
		`[{"id":"bad-type","type":"audio"}]`,
		`[{"id":"bad-duration","durations":"10s"}]`,
	}

	for _, jsonStr := range cases {
		if err := CheckTapnowManagedModels(jsonStr); err == nil {
			t.Fatalf("expected validation error for %s", jsonStr)
		}
	}
}
