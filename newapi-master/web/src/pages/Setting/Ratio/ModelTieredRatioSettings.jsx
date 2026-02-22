import React, { useEffect, useRef, useState } from 'react';
import { Button, Col, Form, Row, Space, Spin, Typography } from '@douyinfe/semi-ui';
import { API, showError, showSuccess } from '../../../helpers';
import { useTranslation } from 'react-i18next';

const EXAMPLE_CONFIG = `{
  "qwen-plus": [
    { "max_input_tokens": 32000, "input_ratio": 1.2, "output_ratio": 3.6 },
    { "max_input_tokens": 128000, "input_ratio": 1.6, "output_ratio": 4.8 },
    { "max_input_tokens": 0, "input_ratio": 2.0, "output_ratio": 6.0 }
  ]
}`;

function validateTieredConfig(value, t) {
  let parsed = {};
  try {
    parsed = JSON.parse(value || '{}');
  } catch {
    return t('请输入合法的阶梯计费 JSON');
  }

  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    return t('阶梯计费配置必须是 JSON 对象');
  }

  for (const [modelName, rules] of Object.entries(parsed)) {
    if (!modelName || !modelName.trim()) {
      return t('模型名称不能为空');
    }
    if (!Array.isArray(rules)) {
      return t('模型 {{model}} 的阶梯规则必须是数组', { model: modelName });
    }
    if (rules.length === 0) {
      return t('模型 {{model}} 的阶梯规则不能为空', { model: modelName });
    }

    const normalizedRules = [];
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      if (!rule || typeof rule !== 'object') {
        return t('模型 {{model}} 第 {{index}} 条规则格式错误', {
          model: modelName,
          index: i + 1,
        });
      }
      const maxInputTokens = Number(rule.max_input_tokens);
      const inputRatio = Number(rule.input_ratio);
      const outputRatio = Number(rule.output_ratio);

      if (!Number.isFinite(maxInputTokens)) {
        return t('模型 {{model}} 第 {{index}} 条规则中的 max_input_tokens 必须是数字', {
          model: modelName,
          index: i + 1,
        });
      }
      if (!Number.isFinite(inputRatio) || inputRatio <= 0) {
        return t('模型 {{model}} 第 {{index}} 条规则中的输入倍率必须大于 0', {
          model: modelName,
          index: i + 1,
        });
      }
      if (!Number.isFinite(outputRatio) || outputRatio < 0) {
        return t('模型 {{model}} 第 {{index}} 条规则中的输出倍率不能小于 0', {
          model: modelName,
          index: i + 1,
        });
      }

      normalizedRules.push({
        maxInputTokens,
      });
    }

    normalizedRules.sort((a, b) => {
      const upperA = a.maxInputTokens <= 0 ? Number.MAX_SAFE_INTEGER : a.maxInputTokens;
      const upperB = b.maxInputTokens <= 0 ? Number.MAX_SAFE_INTEGER : b.maxInputTokens;
      return upperA - upperB;
    });

    let lastUpper = -1;
    for (let i = 0; i < normalizedRules.length; i++) {
      const currentUpper =
        normalizedRules[i].maxInputTokens <= 0
          ? Number.MAX_SAFE_INTEGER
          : normalizedRules[i].maxInputTokens;
      if (currentUpper <= lastUpper) {
        return t('模型 {{model}} 的区间上限必须严格递增', { model: modelName });
      }
      lastUpper = currentUpper;
    }
  }

  return '';
}

export default function ModelTieredRatioSettings(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    ModelTieredRatio: '',
  });
  const refForm = useRef();

  useEffect(() => {
    const nextValue = props.options.ModelTieredRatio || '{}';
    setInputs({
      ModelTieredRatio: nextValue,
    });
    if (refForm.current) {
      refForm.current.setValues({ ModelTieredRatio: nextValue });
    }
  }, [props.options.ModelTieredRatio]);

  const onSubmit = async () => {
    const errorMessage = validateTieredConfig(inputs.ModelTieredRatio, t);
    if (errorMessage) {
      showError(errorMessage);
      return;
    }

    setLoading(true);
    try {
      const res = await API.put('/api/option/', {
        key: 'ModelTieredRatio',
        value: inputs.ModelTieredRatio,
      });
      if (!res.data.success) {
        showError(res.data.message);
        return;
      }
      showSuccess(t('阶梯计费已保存'));
      props.refresh();
    } catch (error) {
      showError(error.message || t('保存失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loading}>
      <Form
        values={inputs}
        getFormApi={(formApi) => (refForm.current = formApi)}
        style={{ marginBottom: 15 }}
      >
        <Row gutter={16}>
          <Col xs={24} sm={18}>
            <Form.TextArea
              label={t('模型阶梯计费规则')}
              field='ModelTieredRatio'
              autosize={{ minRows: 14, maxRows: 24 }}
              placeholder={t('请输入模型阶梯计费 JSON')}
              extraText={t(
                '按模型配置单次请求输入 Token 阶梯。命中区间后，该次请求输入 Token 按输入倍率计费，输出 Token 按同一区间输出倍率计费。预扣费将按该模型所有区间中的最高输入/输出倍率估算，请求完成后再按实际区间重算。',
              )}
              onChange={(value) => {
                setInputs((prev) => ({ ...prev, ModelTieredRatio: value }));
              }}
            />
            <Typography.Paragraph type='tertiary'>
              {t('max_input_tokens <= 0 表示无上限，系统会自动按区间上限升序匹配。')}
            </Typography.Paragraph>
            <Typography.Text type='tertiary'>{t('阶梯计费示例')}</Typography.Text>
            <pre className='mt-2 p-3 rounded border border-[var(--mx-brand-border)] overflow-auto'>
              {EXAMPLE_CONFIG}
            </pre>
          </Col>
        </Row>
      </Form>
      <Space>
        <Button onClick={onSubmit} type='primary'>
          {t('保存阶梯计费设置')}
        </Button>
      </Space>
    </Spin>
  );
}

