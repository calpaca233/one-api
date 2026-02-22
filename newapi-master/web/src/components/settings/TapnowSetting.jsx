import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, Col, Form, Row, Space, Spin, Typography } from '@douyinfe/semi-ui';
import { API, showError, showSuccess } from '../../helpers';
import { useTranslation } from 'react-i18next';

const EXAMPLE_CONFIG = `[
  {
    "id": "sora-2",
    "type": "Video",
    "durations": ["5s", "10s"],
    "ratioLimits": ["16:9", "9:16"],
    "defaultRatio": "16:9",
    "videoResolutions": ["720P", "1080P"],
    "defaultVideoResolution": "1080P",
    "supportsFirstLastFrame": true,
    "supportsHD": true
  },
  {
    "id": "jimeng-4.5",
    "type": "Image",
    "ratioLimits": ["1:1", "16:9", "9:16"],
    "defaultRatio": "1:1",
    "resolutionLimits": ["1K", "2K", "4K"],
    "defaultResolution": "2K"
  },
  {
    "id": "qwen-plus",
    "type": "Chat",
    "requestTemplate": {
      "enabled": false
    }
  }
]`;

function validateTapnowManagedModels(value, t) {
  let parsed = [];
  try {
    parsed = JSON.parse(value || '[]');
  } catch {
    return t('请输入合法的 Tapnow 托管模型 JSON');
  }

  if (!Array.isArray(parsed)) {
    return t('Tapnow 托管模型配置必须是 JSON 数组');
  }

  const idSet = new Set();
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    const index = i + 1;
    if (!item || Array.isArray(item) || typeof item !== 'object') {
      return t('第 {{index}} 个模型配置必须是对象', { index });
    }

    const id = String(item.id || '').trim();
    if (!id) {
      return t('第 {{index}} 个模型缺少 id', { index });
    }
    const key = id.toLowerCase();
    if (idSet.has(key)) {
      return t('模型 {{id}} 重复，请检查', { id });
    }
    idSet.add(key);

    const modelType = String(item.type || '').trim();
    if (
      modelType &&
      !['chat', 'image', 'video'].includes(modelType.toLowerCase())
    ) {
      return t('模型 {{id}} 的 type 仅支持 Chat/Image/Video', { id });
    }

    if (item.durations !== undefined && !Array.isArray(item.durations)) {
      return t('模型 {{id}} 的 durations 必须是数组', { id });
    }
  }

  return '';
}

const TapnowSetting = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    TapnowManagedModels: '[]',
  });
  const refForm = useRef();

  const getOptions = async () => {
    const res = await API.get('/api/option/');
    const { success, message, data } = res.data;
    if (!success) {
      showError(message);
      return;
    }

    const target = data.find((item) => item.key === 'TapnowManagedModels');
    let nextValue = target?.value || '[]';
    try {
      nextValue = JSON.stringify(JSON.parse(nextValue), null, 2);
    } catch {
      // keep original text
    }
    setInputs({ TapnowManagedModels: nextValue });
    if (refForm.current) {
      refForm.current.setValues({ TapnowManagedModels: nextValue });
    }
  };

  const onRefresh = async () => {
    try {
      setLoading(true);
      await getOptions();
    } catch (error) {
      showError(error.message || t('刷新失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    onRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async () => {
    const errorMessage = validateTapnowManagedModels(inputs.TapnowManagedModels, t);
    if (errorMessage) {
      showError(errorMessage);
      return;
    }

    setLoading(true);
    try {
      const res = await API.put('/api/option/', {
        key: 'TapnowManagedModels',
        value: inputs.TapnowManagedModels,
      });
      if (!res.data.success) {
        showError(res.data.message);
        return;
      }
      showSuccess(t('Tapnow 托管模型配置已保存'));
      onRefresh();
    } catch (error) {
      showError(error.message || t('保存失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loading} size='large'>
      <Card style={{ marginTop: '10px' }}>
        <Form
          values={inputs}
          getFormApi={(formApi) => (refForm.current = formApi)}
          style={{ marginBottom: 15 }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={18}>
              <Typography.Paragraph type='secondary'>
                {t(
                  '配置 Tapnow 云端托管模式可调用模型。此配置由平台统一下发，用户侧不可编辑。',
                )}
              </Typography.Paragraph>
              <Form.TextArea
                field='TapnowManagedModels'
                label={t('托管模型配置 JSON')}
                autosize={{ minRows: 14, maxRows: 28 }}
                placeholder={t('请输入 Tapnow 托管模型 JSON')}
                extraText={t(
                  '每个模型至少需要 id 字段，可选 type/provider/durations 及其他高级属性（如 ratioLimits、defaultRatio、videoResolutions、customParams 等）。',
                )}
                onChange={(value) => {
                  setInputs((prev) => ({ ...prev, TapnowManagedModels: value }));
                }}
              />
              <Typography.Text type='tertiary'>{t('示例配置')}</Typography.Text>
              <pre className='mt-2 p-3 rounded border border-[var(--mx-brand-border)] overflow-auto'>
                {EXAMPLE_CONFIG}
              </pre>
            </Col>
          </Row>
        </Form>
        <Space>
          <Button type='primary' onClick={onSubmit}>
            {t('保存 Tapnow 托管模型配置')}
          </Button>
        </Space>
      </Card>
    </Spin>
  );
};

export default TapnowSetting;
